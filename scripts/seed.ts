import {
  PrismaClient,
  TenantLifecycleState,
  TenantRole,
  UserAccountState,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const STANDARD_PASSWORD = "Saksham@2003";

async function main() {
  // CRITICAL SEED SAFETY SAFEGUARDS (F3 Requirement)
  // 1. Strict production prohibition - no overrides permitted for demo credential injection
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL SAFETY BLOCK: Database demo seeding is strictly FORBIDDEN when NODE_ENV=production!");
    console.error("Known-password demo-account seeding must never run against production environments.");
    console.error("For legitimate production workspace initialization, use: tsx scripts/init-production.ts");
    process.exit(1);
  }

  // 2. Validate database connection host and target database name
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("❌ CRITICAL ERROR: DATABASE_URL is not set.");
    process.exit(1);
  }

  const match = dbUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
  const host = match ? match[1] : "unknown";
  const dbName = match ? match[3] : "unknown";

  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "mysql" ||
    host === "host.docker.internal";

  if (!isLocalHost) {
    console.error(`❌ CRITICAL SAFETY BLOCK: Refusing to seed non-local database host '${host}'.`);
    console.error("Demo seeding is restricted to verified local development targets.");
    process.exit(1);
  }

  const lowerDb = dbName.toLowerCase();
  if (lowerDb.includes("prod") || lowerDb.includes("live") || lowerDb.includes("operational")) {
    console.error(`❌ CRITICAL SAFETY BLOCK: Database '${dbName}' matches operational naming patterns.`);
    process.exit(1);
  }

  // 3. Require explicit development seeding confirmation flag
  if (process.env.ALLOW_DEVELOPMENT_SEED !== "true" && process.env.CONFIRM_DEV_DATABASE_RESET !== "true") {
    console.error("❌ SAFETY CONFIRMATION REQUIRED: Seeding will reset studio tables and recreate demo accounts.");
    console.error("To execute development demo seeding, you must explicitly set:");
    console.error("  ALLOW_DEVELOPMENT_SEED=true (or CONFIRM_DEV_DATABASE_RESET=true)");
    process.exit(1);
  }

  console.log(`🌱 Seeding development demo data to local database '${dbName}' on '${host}'...`);

  // 1. Clean existing records completely
  console.log("Cleaning up prior records...");
  await prisma.auditEvent.deleteMany();
  await prisma.notificationOutbox.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeMilestone.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.privateFile.deleteMany();
  await prisma.siteVisitEvent.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.site.deleteMany();
  await prisma.taskActivityHistory.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskChecklistItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.projectContractor.deleteMany();
  await prisma.projectConsultant.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.projectPhase.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.consultant.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.tenantInvitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tenant.deleteMany();

  // Clean storage uploads
  try {
    const storageDir = path.join(process.cwd(), "storage", "uploads");
    if (fs.existsSync(storageDir)) {
      const items = fs.readdirSync(storageDir);
      for (const item of items) {
        fs.rmSync(path.join(storageDir, item), { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn("Storage cleanup note:", err);
  }

  const passwordHash = await bcrypt.hash(STANDARD_PASSWORD, 10);

  // 2. SaaS Plans
  console.log("Seeding Plans...");
  const studioProPlan = await prisma.plan.create({
    data: {
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

  // 3. Workspace: 100% DESIGN Studio
  console.log("Seeding Workspace: 100% DESIGN Studio...");
  const tenant1 = await prisma.tenant.create({
    data: {
      slug: "100percentdesign",
      name: "100% DESIGN Studio",
      timezone: "Asia/Kolkata",
      currency: "INR",
      lifecycleState: TenantLifecycleState.ACTIVE,
      branding: {
        primaryColor: "#4B5320", // Olive green
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
      planId: studioProPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Apex Architecture Studio (empty secondary tenant for isolation)
  const tenant2 = await prisma.tenant.create({
    data: {
      slug: "apex-studio",
      name: "Apex Architecture Studio",
      timezone: "Asia/Kolkata",
      currency: "INR",
      lifecycleState: TenantLifecycleState.ACTIVE,
      branding: {
        primaryColor: "#1A365D",
        accentColor: "#3182CE",
      },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant2.id,
      planId: studioProPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 4. Sole Admin User: Saksham Lanjewar
  console.log("Seeding Sole Admin: Saksham Lanjewar...");
  const adminUser = await prisma.user.create({
    data: {
      email: "designsaksham1@gmail.com",
      passwordHash,
      fullName: "Saksham Lanjewar",
      accountState: UserAccountState.ACTIVE,
    },
  });

  const adminMembership = await prisma.tenantMembership.create({
    data: {
      tenantId: tenant1.id,
      userId: adminUser.id,
      role: TenantRole.OWNER, // Full Owner/Partner + Administrator privileges so Saksham can create Boss and Employees
      hasFinanceAccess: true,
      isActive: true,
    },
  });

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

  console.log("✅ Seed completed successfully!");
  console.log("==========================================");
  console.log("WORKSPACE: 100% DESIGN Studio (slug: 100percentdesign)");
  console.log("Admin User: Saksham Lanjewar");
  console.log("Login ID:   designsaksham1@gmail.com (or EMP-001 or saksham)");
  console.log("Password:   Saksham@2003");
  console.log("Role:       OWNER (Full Administrator & Governance Authority)");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
