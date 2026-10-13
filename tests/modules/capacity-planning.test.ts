import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  getStudioWorkloadCapacity,
  previewWorkloadAdjustment,
  applyWorkloadAdjustment,
} from "../../src/server/modules/capacity/service";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole, TaskWorkflowStatus, TaskPriority, Prisma } from "@prisma/client";

describe("Phase 5: Workload and Capacity Planning Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;
  let adminMember: any;
  let employeeMember: any;
  let project: any;
  let testTaskWithEstimate: any;
  let testTaskMultiAssignee: any;
  let testTaskMissingEstimate: any;
  let testApprovedLeave: any;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant);

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    adminMember = members.find((m) => m.role === TenantRole.ADMIN);
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

    employeeCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: employeeMember.userId,
      userEmail: employeeMember.user.email,
      userFullName: employeeMember.user.fullName,
      membershipId: employeeMember.id,
      employeeId: employeeMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    project = await prisma.project.findFirst({
      where: { tenantId: tenant.id },
    });
    assert.ok(project);

    // 1. Create an approved leave for employeeMember for a 1-day leave (2026-11-04)
    testApprovedLeave = await prisma.studioLeaveRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: employeeMember.employee.id,
        startDate: new Date("2026-11-04"),
        endDate: new Date("2026-11-04"),
        days: new Prisma.Decimal(1.0),
        status: "APPROVED",
        leaveType: "CASUAL",
        reason: "Capacity planning test leave",
      },
    });

    // 2. Create task with explicit estimate for single assignee (2026-11-02 to 2026-11-06 = 5 working days)
    // 20 hours estimated => 4 hours/day
    testTaskWithEstimate = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        title: "Single Assignee Estimated Task",
        assigneeId: employeeMember.id,
        creatorId: adminMember.id,
        status: TaskWorkflowStatus.IN_PROGRESS,
        startDate: new Date("2026-11-02"),
        dueDate: new Date("2026-11-06"),
        estimatedHours: new Prisma.Decimal(20.0),
      },
    });

    // 3. Create multi-assignee task with explicit estimate (2026-11-09 to 2026-11-13 = 5 working days)
    // 30 hours total / 2 assignees => 15 hours each => 3 hours/day each
    testTaskMultiAssignee = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        title: "Multi Assignee Joint Task",
        assigneeId: employeeMember.id,
        assignedMemberIds: [employeeMember.id, adminMember.id],
        creatorId: adminMember.id,
        status: TaskWorkflowStatus.STARTED,
        startDate: new Date("2026-11-09"),
        dueDate: new Date("2026-11-13"),
        estimatedHours: new Prisma.Decimal(30.0),
      },
    });

    // 4. Create task with missing estimate
    testTaskMissingEstimate = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        title: "Task Missing Estimate",
        assigneeId: employeeMember.id,
        creatorId: adminMember.id,
        status: TaskWorkflowStatus.STARTED,
        startDate: new Date("2026-11-16"),
        dueDate: new Date("2026-11-20"),
        estimatedHours: null,
      },
    });
  });

  after(async () => {
    if (testTaskWithEstimate) {
      await prisma.task.delete({ where: { id: testTaskWithEstimate.id } }).catch(() => {});
    }
    if (testTaskMultiAssignee) {
      await prisma.task.delete({ where: { id: testTaskMultiAssignee.id } }).catch(() => {});
    }
    if (testTaskMissingEstimate) {
      await prisma.task.delete({ where: { id: testTaskMissingEstimate.id } }).catch(() => {});
    }
    if (testApprovedLeave) {
      await prisma.studioLeaveRequest.delete({ where: { id: testApprovedLeave.id } }).catch(() => {});
    }
  });

  test("1. Non-leadership roles cannot access studio capacity calculations (RBAC)", async () => {
    await assert.rejects(
      async () => {
        await getStudioWorkloadCapacity(employeeCtx, {
          startDate: "2026-11-02",
          endDate: "2026-11-06",
        });
      },
      /Forbidden: Only Studio Owners, Administrators, and Project Managers/
    );
  });

  test("2. Available capacity deducts approved leave and weekends without duplicate subtraction", async () => {
    // Week of 2026-11-02 (Mon) to 2026-11-06 (Fri) = 5 working days = 40h standard.
    // Employee has approved 1.0 day leave on 2026-11-04 (Wed) = -8h.
    // Available capacity should be exactly 32h.
    const capacityData = await getStudioWorkloadCapacity(adminCtx, {
      startDate: "2026-11-02",
      endDate: "2026-11-06",
    });

    const empSummary = capacityData.employees.find((e) => e.membershipId === employeeMember.id);
    assert.ok(empSummary, "Employee summary must exist");

    assert.equal(empSummary.totalWorkingDays, 5);
    assert.equal(empSummary.availableCapacityHours, 32.0, "Capacity must be exactly 32.0h after 8h leave deduction");

    // Wed 2026-11-04 slot must show leaveHours = 8.0, availableCapacityHours = 0
    const wedSlot = empSummary.dailySlots.find((s) => s.date === "2026-11-04");
    assert.ok(wedSlot);
    assert.equal(wedSlot.leaveHours, 8.0);
    assert.equal(wedSlot.availableCapacityHours, 0.0);
  });

  test("3. Multi-assignee joint task divides effort evenly without duplicate counting", async () => {
    // Week of 2026-11-09 (Mon) to 2026-11-13 (Fri) = 5 working days
    // Multi-assignee task has 30h estimated across 2 members -> 15h for each assignee
    const capacityData = await getStudioWorkloadCapacity(adminCtx, {
      startDate: "2026-11-09",
      endDate: "2026-11-13",
    });

    const empSummary = capacityData.employees.find((e) => e.membershipId === employeeMember.id);
    const adminSummary = capacityData.employees.find((e) => e.membershipId === adminMember.id);

    assert.ok(empSummary && adminSummary);
    // Employee's planned demand should include 15h from this task
    assert.equal(empSummary.plannedDemandHours, 15.0);
    // Admin's planned demand should also include 15h, NOT the full 30h
    assert.equal(adminSummary.plannedDemandHours, 15.0);
  });

  test("4. Missing estimates flag status as ESTIMATES_INCOMPLETE without inventing hours", async () => {
    // Week of 2026-11-16 (Mon) to 2026-11-20 (Fri)
    // testTaskMissingEstimate has null estimatedHours
    const capacityData = await getStudioWorkloadCapacity(adminCtx, {
      startDate: "2026-11-16",
      endDate: "2026-11-20",
    });

    const empSummary = capacityData.employees.find((e) => e.membershipId === employeeMember.id);
    assert.ok(empSummary);

    assert.ok(empSummary.missingEstimateCount >= 1);
    assert.equal(empSummary.allocationStatus, "ESTIMATES_INCOMPLETE");
    assert.equal(empSummary.plannedDemandHours, 0.0, "Must not invent hours for unestimated tasks");
  });

  test("5. Preview adjustment detects conflicts and validate dates", async () => {
    // Inverted dates: start after due
    const previewInverted = await previewWorkloadAdjustment(adminCtx, {
      taskId: testTaskWithEstimate.id,
      newStartDate: "2026-11-10",
      newDueDate: "2026-11-05",
    });
    assert.equal(previewInverted.isValid, false);
    assert.ok(previewInverted.blockers.some((b) => b.includes("Proposed start date cannot be later")));

    // Reassigning to target with leave conflict warns appropriately
    const previewLeaveConflict = await previewWorkloadAdjustment(adminCtx, {
      taskId: testTaskWithEstimate.id,
      targetAssigneeId: employeeMember.id,
      newStartDate: "2026-11-03",
      newDueDate: "2026-11-05",
    });
    assert.equal(previewLeaveConflict.isValid, true);
    assert.ok(previewLeaveConflict.warnings.some((w) => w.includes("approved leave window")));
  });

  test("6. Applying workload adjustment transactionally updates task and logs audit event", async () => {
    const updated = await applyWorkloadAdjustment(adminCtx, {
      taskId: testTaskWithEstimate.id,
      targetAssigneeId: adminMember.id,
      newStartDate: "2026-11-03",
      newDueDate: "2026-11-07",
      reason: "Reallocating work due to leave coverage",
    });

    assert.equal(updated.assigneeId, adminMember.id);

    // Verify Audit Event was recorded
    const audit = await prisma.auditEvent.findFirst({
      where: {
        tenantId: tenant.id,
        action: "WORKLOAD_CAPACITY_ADJUSTMENT",
        entityId: testTaskWithEstimate.id,
      },
      orderBy: { timestamp: "desc" },
    });

    assert.ok(audit, "Audit event must be logged");
    assert.ok(audit.safeChangeSummary.includes("Reallocating work due to leave coverage"));
  });
});
