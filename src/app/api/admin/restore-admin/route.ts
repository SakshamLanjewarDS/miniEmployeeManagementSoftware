import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import { TenantLifecycleState, TenantRole, UserAccountState } from "@prisma/client";

/**
 * RESTORATION ENDPOINT SECURITY POLICY:
 * In production, emergency web-exposed account recovery is strictly disabled (fails closed / 404).
 * Operators must execute the audited CLI recovery procedure via `npx tsx scripts/restore-admin.ts`.
 * In non-production, unauthenticated GET mutations are rejected. POST requires an explicit
 * secret authorization key (OPERATOR_RECOVERY_KEY) and never returns plaintext credentials.
 */

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint disabled in production. Use audited CLI recovery script: scripts/restore-admin.ts" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      error: "Method Not Allowed. State mutations via GET are disabled for security. Use POST with operator recovery credentials or run `npx tsx scripts/restore-admin.ts`.",
      cliRecoveryCommand: "npx tsx scripts/restore-admin.ts",
    },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint disabled in production. Use audited CLI recovery script: scripts/restore-admin.ts" },
      { status: 404 }
    );
  }

  try {
    const recoveryKey = req.headers.get("x-operator-recovery-key");
    const expectedKey = process.env.OPERATOR_RECOVERY_KEY || process.env.RESTORATION_SECRET_KEY;

    if (!expectedKey || recoveryKey !== expectedKey) {
      return NextResponse.json(
        { error: "Forbidden: Invalid or missing operator recovery key header (x-operator-recovery-key)." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const adminEmail = body.email || "designsaksham1@gmail.com";
    const adminPassword = body.password;
    const adminName = body.fullName || "Saksham Lanjewar";
    const targetWorkspaceSlug = body.workspaceSlug || "100percentdesign";

    if (!adminPassword || typeof adminPassword !== "string" || adminPassword.length < 8) {
      return NextResponse.json(
        { error: "Invalid password: password is required and must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 1. Ensure Workspace exists
    let tenant = await prisma.tenant.findUnique({
      where: { slug: targetWorkspaceSlug },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          slug: targetWorkspaceSlug,
          name: "100% DESIGN Studio",
          timezone: "Asia/Kolkata",
          currency: "INR",
          lifecycleState: TenantLifecycleState.ACTIVE,
          branding: {
            primaryColor: "#5A81FA",
            accentColor: "#D4AF37",
            logoUrl: "/brand/100percentdesign-logo.svg",
          },
          settings: {
            defaultGeofenceRadiusMeters: 150,
            defaultAccuracyThresholdMeters: 100,
          },
        },
      });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: adminName,
          passwordHash,
          accountState: UserAccountState.ACTIVE,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          fullName: adminName,
          passwordHash,
          accountState: UserAccountState.ACTIVE,
        },
      });
    }

    // 3. Find or create TenantMembership
    let membership = await prisma.tenantMembership.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
      },
    });

    if (membership) {
      membership = await prisma.tenantMembership.update({
        where: { id: membership.id },
        data: {
          role: TenantRole.OWNER,
          hasFinanceAccess: true,
          isActive: true,
        },
      });
    } else {
      membership = await prisma.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: TenantRole.OWNER,
          hasFinanceAccess: true,
          isActive: true,
        },
      });
    }

    // 4. Find or create Employee record
    let employee = await prisma.employee.findFirst({
      where: {
        tenantId: tenant.id,
        membershipId: membership.id,
      },
    });

    if (!employee) {
      const existingEmp001 = await prisma.employee.findUnique({
        where: {
          tenantId_employeeId: {
            tenantId: tenant.id,
            employeeId: "EMP-001",
          },
        },
      });

      if (existingEmp001) {
        employee = await prisma.employee.update({
          where: { id: existingEmp001.id },
          data: {
            membershipId: membership.id,
            designation: "Studio Administrator & Owner",
            department: "Administration",
            phone: "+91 98201 11001",
          },
        });
      } else {
        employee = await prisma.employee.create({
          data: {
            tenantId: tenant.id,
            membershipId: membership.id,
            employeeId: "EMP-001",
            designation: "Studio Administrator & Owner",
            department: "Administration",
            phone: "+91 98201 11001",
            joinDate: new Date(),
          },
        });
      }
    }

    // Log audited security recovery event
    try {
      await prisma.auditEvent.create({
        data: {
          tenantId: tenant.id,
          actorId: user.id,
          action: "OPERATOR_ADMIN_RESTORED",
          entityType: "User",
          entityId: user.id,
          safeChangeSummary: `Admin account ${user.email} recovered via authorized non-production operator endpoint.`,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Admin ${user.fullName} restored successfully.`,
      admin: {
        fullName: user.fullName,
        email: user.email,
        employeeId: employee.employeeId,
        role: membership.role,
        workspace: tenant.slug,
        // NOTICE: Plaintext password is NEVER returned in response
      },
    });
  } catch (error: any) {
    console.error("Error creating/restoring admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create/restore admin" },
      { status: 500 }
    );
  }
}
