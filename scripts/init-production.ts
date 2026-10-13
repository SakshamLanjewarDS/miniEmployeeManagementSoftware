import { PrismaClient, TenantLifecycleState, TenantRole, UserAccountState } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * ============================================================================
 * LEGITIMATE PRODUCTION INITIALIZATION SCRIPT (F3 Requirement)
 * ============================================================================
 * Safe, idempotent setup of essential platform configuration:
 * 1. Provisions SaaS subscription plans (Studio Professional, etc.) without data loss.
 * 2. Does NOT delete existing studio projects, employees, or audit trails.
 * 3. Does NOT inject hardcoded demo passwords.
 * 4. Can provision initial superadmin only when explicit non-demo credentials
 *    are supplied via ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 */

async function main() {
  console.log("🚀 Initializing Production Platform Prerequisite Data...");

  // 1. Idempotently provision SaaS Plans
  console.log("1. Checking SaaS Subscription Plans...");
  const proPlan = await prisma.plan.upsert({
    where: { slug: "studio-pro" },
    update: {
      name: "Studio Professional",
      maxSeats: 30,
      maxProjects: 100,
      maxStorageMB: 20480,
    },
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
  console.log(`   ✔ Plan '${proPlan.name}' (${proPlan.slug}) ready.`);

  // 2. Check if an initial workspace / tenant exists
  const tenantCount = await prisma.tenant.count();
  console.log(`2. Existing Tenants: ${tenantCount} registered.`);

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (tenantCount === 0) {
    if (!adminEmail || !adminPassword) {
      console.log("\nℹ Initial Production Workspace Setup:");
      console.log("  No studio workspaces exist yet in this database.");
      console.log("  To initialize the primary workspace, re-run with environment variables:");
      console.log("    ADMIN_EMAIL=\"owner@yourstudio.com\"");
      console.log("    ADMIN_PASSWORD=\"<secure-random-initial-password>\"");
      console.log("    PRIMARY_WORKSPACE_NAME=\"Studio Architecture\"");
      console.log("    PRIMARY_WORKSPACE_SLUG=\"studio\"");
      return;
    }

    if (adminPassword.length < 10) {
      console.error("❌ ADMIN_PASSWORD must be at least 10 characters long.");
      process.exit(1);
    }

    const tenantSlug = (process.env.PRIMARY_WORKSPACE_SLUG || "primary-studio").toLowerCase();
    const tenantName = process.env.PRIMARY_WORKSPACE_NAME || "Primary Architecture Studio";

    console.log(`   Creating primary tenant '${tenantName}' (${tenantSlug})...`);
    const tenant = await prisma.tenant.create({
      data: {
        slug: tenantSlug,
        name: tenantName,
        timezone: process.env.APP_DEFAULT_TIMEZONE || "Asia/Kolkata",
        currency: process.env.APP_DEFAULT_CURRENCY || "INR",
        lifecycleState: TenantLifecycleState.ACTIVE,
      },
    });

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: proPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: process.env.ADMIN_NAME || "Studio Administrator",
        accountState: UserAccountState.ACTIVE,
      },
    });

    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
        isActive: true,
      },
    });

    await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: membership.id,
        employeeId: "EMP-001",
        designation: "Studio Principal",
        department: "Administration",
        joinDate: new Date(),
      },
    });

    console.log("   ✔ Primary production tenant and administrator created successfully.");
  } else {
    console.log("   ✔ Existing tenants and accounts preserved without modification.");
  }

  console.log("\n✅ Production initialization complete without data loss or credential leaks.");
}

main()
  .catch((e) => {
    console.error("❌ Initialization error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
