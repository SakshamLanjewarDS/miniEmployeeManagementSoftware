import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { TenantLifecycleState, TenantRole, UserAccountState } from "@prisma/client";

let bootstrapPromise: Promise<void> | null = null;

/**
 * Ensures the default workspace (100% DESIGN Studio) and default administrative
 * users exist in the database. Safe to run concurrently and repeatedly (idempotent).
 */
export async function ensureDefaultBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}

async function runBootstrap(): Promise<void> {
  try {
    // 1. Ensure SaaS Pro Plan exists
    const plan = await prisma.plan.upsert({
      where: { slug: "studio-pro" },
      update: {},
      create: {
        slug: "studio-pro",
        name: "Studio Professional",
        maxSeats: 30,
        maxProjects: 100,
        maxStorageMB: 20480,
        features: {
          unlimitedTasks: true,
          siteGeoCheckIn: true,
          drawingsApproval: true,
          projectFinance: true,
        },
      },
    });

    // 2. Ensure Primary Tenant (100percentdesign) exists
    let tenant1 = await prisma.tenant.findUnique({
      where: { slug: "100percentdesign" },
    });

    if (!tenant1) {
      tenant1 = await prisma.tenant.create({
        data: {
          slug: "100percentdesign",
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

      await prisma.subscription.create({
        data: {
          tenantId: tenant1.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Default Passwords Hash

    // 4. Default Passwords Hash
    const defaultPasswordHash = await bcrypt.hash("Saksham@2003", 10);

    // 5. Ensure Principal Owner / Admin: Saksham Lanjewar
    let adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: "designsaksham1@gmail.com" },
          { email: "admin@100percentdesign.in" },
        ],
      },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: "designsaksham1@gmail.com",
          passwordHash: defaultPasswordHash,
          fullName: "Saksham Lanjewar",
          accountState: UserAccountState.ACTIVE,
        },
      });
    }

    // Ensure Membership in 100% DESIGN Studio
    let adminMembership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant1.id,
          userId: adminUser.id,
        },
      },
    });

    if (!adminMembership) {
      adminMembership = await prisma.tenantMembership.create({
        data: {
          tenantId: tenant1.id,
          userId: adminUser.id,
          role: TenantRole.OWNER,
          hasFinanceAccess: true,
          isActive: true,
        },
      });
    }

    // Ensure Employee record for EMP-001
    const emp1 = await prisma.employee.findFirst({
      where: {
        tenantId: tenant1.id,
        OR: [{ membershipId: adminMembership.id }, { employeeId: "EMP-001" }],
      },
    });

    if (!emp1) {
      await prisma.employee.create({
        data: {
          tenantId: tenant1.id,
          membershipId: adminMembership.id,
          employeeId: "EMP-001",
          designation: "Studio Administrator & Owner",
          department: "Administration",
          phone: "+91 98201 11001",
          joinDate: new Date(),
        },
      });
    }
  } catch (err) {
    console.error("[Bootstrap] Warning during initial tenant bootstrap:", err);
  }
}
