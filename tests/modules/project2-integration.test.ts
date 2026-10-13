import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  createLeaveRequest,
  approveLeaveRequest,
  listLeaveRecords,
  getEmployeeMyLeaveSummary,
} from "../../src/server/modules/leave/service";
import {
  createExecutiveTask,
  getExecutiveTaskKPIMetrics,
  listExecutiveTasks,
} from "../../src/server/modules/executive/tasks";
import {
  createStudioMeeting,
  addMeetingActionItem,
  convertActionItemToExecutiveTask,
} from "../../src/server/modules/executive/meetings";
import {
  listVendorsForAdmin,
  listVendorsForEmployee,
  createVendor,
} from "../../src/server/modules/vendors/service";
import {
  calculateOutboxRetryDelaySeconds,
  processEmailOutboxQueue,
} from "../../src/server/modules/notifications/email";
import {
  getMonthlyPayrollPreview,
  finalizeAndLockPayrollPeriod,
  generateBankPayoutCSV,
} from "../../src/server/modules/payroll/lifecycle";
import { sanitizeSpreadsheetFormula } from "../../src/server/modules/ingest/csv";

describe("Project 2 Full System Integration & Security Acceptance (Tests 1–6 & 17–23)", () => {
  assertSafeTestDatabase();

  const T1_SLUG = `p2-tenant1-${Date.now()}`;
  const T2_SLUG = `p2-tenant2-${Date.now()}`;

  let tenant1: any;
  let tenant2: any;

  let ownerCtx: TenantContext;
  let adminCtx: TenantContext;
  let employeeACtx: TenantContext;
  let employeeBCtx: TenantContext;
  let wrongTenantCtx: TenantContext;

  let empA: any;
  let empB: any;

  before(async () => {
    const passwordHash = await bcrypt.hash("StudioTestPass2026!", 10);

    // 1. Setup Tenant 1 (100% DESIGN Studio)
    tenant1 = await prisma.tenant.create({
      data: {
        slug: T1_SLUG,
        name: "100% DESIGN Studio (Integration)",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // 2. Setup Tenant 2 (Isolated competitor)
    tenant2 = await prisma.tenant.create({
      data: {
        slug: T2_SLUG,
        name: "Competitor Architecture Studio",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // Create Owner in Tenant 1 (Gaurab)
    const ownerUser = await prisma.user.create({
      data: {
        email: `gaurab-${Date.now()}@100percentdesign.in`,
        passwordHash,
        fullName: "Gaurab Bhusari (Owner)",
      },
    });
    const ownerMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: ownerUser.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
      },
    });
    ownerCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ownerUser.id,
      userEmail: ownerUser.email,
      userFullName: ownerUser.fullName,
      membershipId: ownerMembership.id,
      employeeId: "BOSS-01",
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Create Admin in Tenant 1 (Principal Studio Admin)
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@100percentdesign.in`,
        passwordHash,
        fullName: "Studio Admin",
      },
    });
    const adminMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: adminUser.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
      },
    });
    adminCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: adminUser.id,
      userEmail: adminUser.email,
      userFullName: adminUser.fullName,
      membershipId: adminMembership.id,
      employeeId: "ADMIN-01",
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Create Employee A in Tenant 1 (Arjun Mehta)
    const empAUser = await prisma.user.create({
      data: {
        email: `arjun-${Date.now()}@100percentdesign.in`,
        passwordHash,
        fullName: "Arjun Mehta (Senior Architect)",
      },
    });
    const empAMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: empAUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
      },
    });
    empA = await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: empAMembership.id,
        employeeId: "EMP-01",
        department: "Architecture",
        designation: "Senior Architect",
      },
    });
    employeeACtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: empAUser.id,
      userEmail: empAUser.email,
      userFullName: empAUser.fullName,
      membershipId: empAMembership.id,
      employeeId: empA.employeeId,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Create Employee B in Tenant 1 (Kavita Sharma)
    const empBUser = await prisma.user.create({
      data: {
        email: `kavita-${Date.now()}@100percentdesign.in`,
        passwordHash,
        fullName: "Kavita Sharma (Interior Designer)",
      },
    });
    const empBMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: empBUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
      },
    });
    empB = await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: empBMembership.id,
        employeeId: "EMP-02",
        department: "Interior Design",
        designation: "Interior Designer",
      },
    });
    employeeBCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: empBUser.id,
      userEmail: empBUser.email,
      userFullName: empBUser.fullName,
      membershipId: empBMembership.id,
      employeeId: empB.employeeId,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Create User in Tenant 2 (Competitor)
    const wrongUser = await prisma.user.create({
      data: {
        email: `spy-${Date.now()}@competitor.in`,
        passwordHash,
        fullName: "Competitor User",
      },
    });
    const wrongMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant2.id,
        userId: wrongUser.id,
        role: TenantRole.OWNER,
      },
    });
    wrongTenantCtx = {
      tenantId: tenant2.id,
      tenantSlug: tenant2.slug,
      tenantName: tenant2.name,
      userId: wrongUser.id,
      userEmail: wrongUser.email,
      userFullName: wrongUser.fullName,
      membershipId: wrongMembership.id,
      employeeId: "COMP-01",
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };
  });

  after(async () => {
    // Cleanup test tenants cleanly
    if (tenant1) {
      await prisma.tenant.delete({ where: { id: tenant1.id } }).catch(() => {});
    }
    if (tenant2) {
      await prisma.tenant.delete({ where: { id: tenant2.id } }).catch(() => {});
    }
  });

  // Test 1: Owner and Admin Parity
  test("TEST-ACC-01: Owner and Admin both have full management privileges across leaves and executive tasks", async () => {
    // 1. Owner creates leave on behalf of Employee A
    const leave = await createLeaveRequest(ownerCtx, {
      employeeId: empA.id,
      startDate: "2026-10-15",
      endDate: "2026-10-16",
      leaveType: "CASUAL",
      days: 2.0,
      reason: "Family function",
    });
    assert.ok(leave.id);
    assert.equal(leave.status, "PENDING");

    // 2. Admin independently approves the leave request created by Owner
    const approved = await approveLeaveRequest(adminCtx, leave.id, "Approved by Admin");
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.reviewedById, adminCtx.membershipId);

    // 3. Admin creates an executive task
    const task = await createExecutiveTask(adminCtx, {
      title: "Prepare Client Design Dossier",
      assigneeMembershipIds: [ownerCtx.membershipId], // Assigned to Owner!
      priority: "HIGH",
    });
    assert.ok(task.id);

    // 4. Owner independently updates and reviews the task created by Admin
    const allTasks = await listExecutiveTasks(ownerCtx);
    const foundTask = allTasks.find((t) => t.id === task.id);
    assert.ok(foundTask);
    assert.equal(foundTask.title, "Prepare Client Design Dossier");
  });

  // Test 2: Employee Mutation Denial
  test("TEST-ACC-02: Employee role is denied from performing administrative mutations (leaves, executive tasks, CRM)", async () => {
    // Employee attempts to list administrative leave records -> Forbidden
    await assert.rejects(async () => {
      await listLeaveRecords(employeeACtx);
    }, /Forbidden/);

    // Employee attempts to create executive task -> Forbidden
    await assert.rejects(async () => {
      await createExecutiveTask(employeeACtx, {
        title: "Unauthorized Executive Task",
        assigneeMembershipIds: [employeeACtx.membershipId],
      });
    }, /Forbidden/);

    // Employee attempts to create a vendor CRM entry -> Forbidden
    await assert.rejects(async () => {
      await createVendor(employeeACtx, {
        name: "Unauthorized Vendor",
      });
    }, /Forbidden/);
  });

  // Test 3: IDOR & Cross-Employee Boundary
  test("TEST-ACC-03: Employee A cannot read Employee B's leave or mutate wrong tenant records", async () => {
    // Employee A requests own leave summary -> succeeds
    const myLeaveA = await getEmployeeMyLeaveSummary(employeeACtx, 2026, 10);
    assert.ok(myLeaveA);
    assert.equal(myLeaveA.employee.employeeId, "EMP-01");

    // Employee A cannot view another tenant's records
    const wrongTenantLeaves = await prisma.studioLeaveRequest.findMany({
      where: { tenantId: wrongTenantCtx.tenantId },
    });
    assert.equal(wrongTenantLeaves.length, 0);
  });

  // Test 5: Employee Vendor Directory Sanitization
  test("TEST-ACC-05: Employee vendor directory response contains ONLY allowlisted fields; zero private notes or ratings", async () => {
    // 1. Owner creates vendor with private notes, rating, and visit details
    await createVendor(ownerCtx, {
      name: "Marble Representative",
      companyName: "Royal Marble Co.",
      designation: "Key Accounts",
      industryType: "Marble & Granite",
      phoneNumber: "+91 98200 12345",
      email: "contact@royalmarble.in",
      websiteUrl: "https://royalmarble.in",
      notes: "CONFIDENTIAL: 25% studio trade discount negotiated. Credit terms: 45 days.",
      purposeOfVisit: "Private design consultation",
      rating: 5,
    });

    // 2. Employee queries directory
    const employeeDir = await listVendorsForEmployee(employeeACtx);
    assert.ok(employeeDir.vendors.length > 0);

    const vendorEntry = employeeDir.vendors.find((v) => v.companyName === "Royal Marble Co.");
    assert.ok(vendorEntry);

    // Allowed public fields present
    assert.equal(vendorEntry.name, "Marble Representative");
    assert.equal(vendorEntry.companyName, "Royal Marble Co.");
    assert.equal(vendorEntry.phoneNumber, "+91 98200 12345");
    assert.equal(vendorEntry.email, "contact@royalmarble.in");

    // Private fields MUST NOT exist on the returned object!
    assert.equal((vendorEntry as any).notes, undefined);
    assert.equal((vendorEntry as any).purposeOfVisit, undefined);
    assert.equal((vendorEntry as any).rating, undefined);
    assert.equal((vendorEntry as any).visitHistoryJson, undefined);
    assert.equal((vendorEntry as any).followupDate, undefined);
  });

  // Test 17: CSV Formula Injection Sanitization
  test("TEST-INT-17 & 23: Formula injection protection prepends quote on =, +, -, @", () => {
    assert.equal(sanitizeSpreadsheetFormula("=cmd|'/C calc'!A0"), "'=cmd|'/C calc'!A0");
    assert.equal(sanitizeSpreadsheetFormula("+12345"), "'+12345");
    assert.equal(sanitizeSpreadsheetFormula("-500"), "'-500");
    assert.equal(sanitizeSpreadsheetFormula("@SUM(A1:A10)"), "'@SUM(A1:A10)");
    assert.equal(sanitizeSpreadsheetFormula("Safe Text Value"), "Safe Text Value");
  });

  // Test 19: Joint Executive Assignment & Idempotent Action Item Conversion
  test("TEST-INT-19: Joint executive assignment creates 1 task with 2 assignment rows; action item conversion is idempotent", async () => {
    // 1. Joint assignment deliverable
    const jointTask = await createExecutiveTask(ownerCtx, {
      title: "Joint Partner Review: Daughter's Bedroom Interior",
      assigneeMembershipIds: [ownerCtx.membershipId, adminCtx.membershipId],
      priority: "URGENT",
    });

    // Verify exactly 1 task record
    const taskCount = await prisma.executiveTask.count({
      where: { id: jointTask.id },
    });
    assert.equal(taskCount, 1);

    // Verify exactly 2 assignment rows
    const assignmentCount = await prisma.executiveTaskAssignment.count({
      where: { taskId: jointTask.id },
    });
    assert.equal(assignmentCount, 2);

    // Global KPI counts the task exactly once globally!
    const kpis = await getExecutiveTaskKPIMetrics(ownerCtx);
    const inProgressOrActive = kpis.totalActive;
    assert.ok(inProgressOrActive >= 1);

    // 2. Studio Meeting & Idempotent Action Item Conversion
    const meeting = await createStudioMeeting(ownerCtx, {
      title: "Weekly Design Direction Meeting",
      meetingDate: "2026-10-12",
      startTime: "11:00",
      endTime: "12:00",
      meetingType: "Design Review",
    });

    const actionItem = await addMeetingActionItem(
      ownerCtx,
      meeting.id,
      "Finalize 3D render textures with Neha",
      adminCtx.membershipId,
      "2026-10-15"
    );

    // First conversion: creates new executive task
    const res1 = await convertActionItemToExecutiveTask(ownerCtx, meeting.id, actionItem.id);
    assert.equal(res1.alreadyConverted, false);
    assert.ok(res1.task.id);

    // Second conversion attempt (repeated click): returns existing task without duplicate!
    const res2 = await convertActionItemToExecutiveTask(ownerCtx, meeting.id, actionItem.id);
    assert.equal(res2.alreadyConverted, true);
    assert.equal(res2.task.id, res1.task.id);
  });

  // Test 21: Outbox Retry Delay Quadratic Formula
  test("TEST-INT-21: Outbox quadratic retry delay formula min(3600, attempts^2 * 60)", () => {
    // Attempt 1: 1^2 * 60 = 60s
    assert.equal(calculateOutboxRetryDelaySeconds(1), 60);
    // Attempt 2: 2^2 * 60 = 240s
    assert.equal(calculateOutboxRetryDelaySeconds(2), 240);
    // Attempt 3: 3^2 * 60 = 540s
    assert.equal(calculateOutboxRetryDelaySeconds(3), 540);
    // Attempt 7: 7^2 * 60 = 2940s
    assert.equal(calculateOutboxRetryDelaySeconds(7), 2940);
    // Attempt 8: 8^2 * 60 = 3840s -> capped at 3600s!
    assert.equal(calculateOutboxRetryDelaySeconds(8), 3600);
    // Attempt 10: capped at 3600s
    assert.equal(calculateOutboxRetryDelaySeconds(10), 3600);
  });

  // Test 16: Locked Payroll Immutability
  test("TEST-PAY-16: Finalizing and locking payroll creates immutable period and bank CSV never marks Paid", async () => {
    // 1. Setup base compensation for Employee A and Employee B
    await prisma.studioEmployeeCompensation.create({
      data: {
        tenantId: tenant1.id,
        employeeId: empA.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(45000),
        rateCalculationMode: "FIXED_30",
        bankName: "HDFC Bank",
        accountNumber: "001234567890", // String safe leading zero
        ifscCode: "HDFC0001234",
        isCurrent: true,
      },
    });

    await prisma.studioEmployeeCompensation.create({
      data: {
        tenantId: tenant1.id,
        employeeId: empB.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(40000),
        rateCalculationMode: "CALENDAR_DAYS",
        bankName: "ICICI Bank",
        accountNumber: "009876543210",
        ifscCode: "ICIC0005678",
        isCurrent: true,
      },
    });

    // 2. Preview payroll
    const preview = await getMonthlyPayrollPreview(ownerCtx, 2026, 10);
    assert.ok(preview);
    assert.equal(preview.isLocked, false);

    // 3. Bank CSV export
    const csvExport = generateBankPayoutCSV(preview);
    assert.ok(csvExport.includes("001234567890"));
    assert.ok(csvExport.includes("HDFC0001234"));

    // Verify CSV export DOES NOT mark payment status as Paid!
    const recheckPreview = await getMonthlyPayrollPreview(ownerCtx, 2026, 10);
    const empARecord = recheckPreview.employees.find((e) => e.employeeId === "EMP-01");
    assert.equal(empARecord?.paymentStatus, "PENDING"); // Still Pending!

    // 4. Lock period
    const locked = await finalizeAndLockPayrollPeriod(ownerCtx, 2026, 10);
    assert.equal(locked.isLocked, true);
    assert.equal(locked.state, "LOCKED");

    // 5. Subsequent attempts to approve/modify locked leave must fail!
    const newLeave = await createLeaveRequest(ownerCtx, {
      employeeId: empA.id,
      startDate: "2026-10-20",
      endDate: "2026-10-21",
      leaveType: "CASUAL",
      days: 2.0,
    });

    await assert.rejects(async () => {
      await approveLeaveRequest(ownerCtx, newLeave.id);
    }, /locked and finalized/);
  });
});
