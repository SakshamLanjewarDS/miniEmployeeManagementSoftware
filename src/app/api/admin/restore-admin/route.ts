import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import { TenantLifecycleState, TenantRole, UserAccountState } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const adminEmail = "designsaksham1@gmail.com";
    const adminPassword = "Saksham@2003";
    const adminName = "Saksham Lanjewar";
    const targetWorkspaceSlug = "100percentdesign";

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
            primaryColor: "#4B5320",
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

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // 2. Find or create user designsaksham1@gmail.com
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
      // Also check if admin@100percentdesign.in exists and can be updated or keep both
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          fullName: adminName,
          passwordHash,
          accountState: UserAccountState.ACTIVE,
        },
      });
    }

    // 3. Find or create TenantMembership for 100percentdesign
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
      // Check if EMP-001 is already taken by an old membership
      const existingEmp001 = await prisma.employee.findUnique({
        where: {
          tenantId_employeeId: {
            tenantId: tenant.id,
            employeeId: "EMP-001",
          },
        },
      });

      if (existingEmp001) {
        // Re-assign EMP-001 to this active admin membership
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
    } else {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          employeeId: "EMP-001",
          designation: "Studio Administrator & Owner",
          department: "Administration",
          phone: "+91 98201 11001",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin Saksham Lanjewar created/restored successfully!",
      admin: {
        fullName: user.fullName,
        email: user.email,
        employeeId: employee.employeeId,
        password: adminPassword,
        role: membership.role,
        workspace: tenant.slug,
        loginUrl: `http://localhost:3000/w/${tenant.slug}/login`,
      },
    });
  } catch (error: any) {
    console.error("Error creating/restoring admin:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create/restore admin" },
      { status: 500 }
    );
  }
}
