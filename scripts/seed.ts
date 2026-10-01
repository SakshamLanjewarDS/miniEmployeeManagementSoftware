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
  console.log("🌱 Cleaning up all dummy data and seeding Admin (Saksham Lanjewar)...");

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
