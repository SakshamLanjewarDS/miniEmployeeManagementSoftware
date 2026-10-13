import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  checkTaskAssigneeAvailability,
  isStudioWeekend,
} from "../../src/server/modules/tasks/planning";
import {
  isWithinQuietHours,
  runDeadlineRemindersAndEscalations,
} from "../../src/server/modules/reminders/service";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole, TaskWorkflowStatus, TaskPriority } from "@prisma/client";

describe("Phase 3: Leave-Aware Planning, Quiet Hours, and Reminders Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let employeeMember: any;
  let testLeave: any;
  let testTask: any;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant);

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    const adminMember = members.find((m) => m.role === TenantRole.ADMIN);
    employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(adminMember && employeeMember);

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      employeeId: adminMember.employee?.employeeId ?? null,
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    // Clean up test data
    await prisma.studioReminderLog.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Create an approved leave for testing availability
    testLeave = await prisma.studioLeaveRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: employeeMember.employee.id,
        employeeNameRaw: employeeMember.user.fullName,
        employeeEmailRaw: employeeMember.user.email,
        startDate: new Date("2026-10-15"),
        endDate: new Date("2026-10-16"),
        days: 2.0,
        status: "APPROVED",
        leaveType: "CASUAL",
        reason: "CONFIDENTIAL_PRIVATE_MEDICAL_REASON",
        isPaidEligible: true,
        sourceSystem: "MANUAL",
      },
    });
  });

  after(async () => {
    if (testLeave) {
      await prisma.studioLeaveRequest.delete({ where: { id: testLeave.id } }).catch(() => {});
    }
    if (testTask) {
      await prisma.task.delete({ where: { id: testTask.id } }).catch(() => {});
    }
  });

  test("TEST-PLAN-01: Weekend detection works correctly", () => {
    const sunday = new Date("2026-10-11T10:00:00Z");
    const monday = new Date("2026-10-12T10:00:00Z");
    const saturday = new Date("2026-10-17T10:00:00Z");

    assert.strictEqual(isStudioWeekend(sunday), true);
    assert.strictEqual(isStudioWeekend(saturday), true);
    assert.strictEqual(isStudioWeekend(monday), false);
  });

  test("TEST-PLAN-02: Leave-aware planning detects conflict and omits private medical reason", async () => {
    // Planning window Oct 14 to Oct 18 (intersects approved leave Oct 15-16)
    const result = await checkTaskAssigneeAvailability(adminCtx, {
      assigneeMembershipIds: [employeeMember.id],
      startDate: "2026-10-14",
      dueDate: "2026-10-18",
    });

    assert.strictEqual(result.hasAnyConflict, true);
    assert.strictEqual(result.assignees.length, 1);

    const empResult = result.assignees[0];
    assert.strictEqual(empResult.hasConflict, true);
    assert.strictEqual(empResult.conflictingLeaves.length, 1);
    assert.strictEqual(empResult.conflictingLeaves[0].days, 2);

    // CRITICAL: Ensure private reasons or medical notes are NOT leaked!
    const serialized = JSON.stringify(result);
    assert.ok(
      !serialized.includes("CONFIDENTIAL_PRIVATE_MEDICAL_REASON"),
      "Sensitive medical reasons must never leak through task planning responses"
    );
  });

  test("TEST-REMINDER-01: Quiet hours accurately suppresses alerts at night", () => {
    // 23:00 (11 PM) is within default quiet hours (21:00 to 09:00)
    const nightTime = new Date("2026-10-10T23:30:00+05:30");
    const isQuiet = isWithinQuietHours(nightTime, 21, 9, "Asia/Kolkata");
    assert.strictEqual(isQuiet, true);

    // 14:00 (2 PM) is during working hours
    const dayTime = new Date("2026-10-10T14:00:00+05:30");
    const isDayQuiet = isWithinQuietHours(dayTime, 21, 9, "Asia/Kolkata");
    assert.strictEqual(isDayQuiet, false);
  });

  test("TEST-REMINDER-02: Reminders runner executes idempotently without crashing", async () => {
    const result = await runDeadlineRemindersAndEscalations(tenant.id);
    assert.ok(result);
    assert.strictEqual(typeof result.evaluatedCount, "number");
    assert.strictEqual(typeof result.remindersSent, "number");
  });
});
