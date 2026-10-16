import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  acknowledgeAssignment,
  startChecklistWork,
  submitTasksForReview,
  reviewTaskSubmission,
} from "../src/server/modules/tasks/workflow";
import { createTask, updateTask, toggleChecklistItem, findTasks } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskWorkflowStatus, TaskPriority } from "@prisma/client";

describe("Simplified Assign Deliverable & Multi-Employee Card Redesign Test Suite", () => {
  let tenant: any;
  let adminCtx: TenantContext;
  let emp1Ctx: TenantContext;
  let emp2Ctx: TenantContext;
  let emp3Ctx: TenantContext;
  let testProject: any;

  before(async () => {
    // 1. Identify or bootstrap tenant
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    // 2. Fetch members: 1 Admin/Owner, at least 3 Employees
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    const adminMember = members.find((m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN);
    assert.ok(adminMember, "Admin/Owner must exist");

    const employeeMembers = members.filter((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(employeeMembers.length >= 3, "At least 3 employees must exist in test workspace");

    const emp1 = employeeMembers[0];
    const emp2 = employeeMembers[1];
    const emp3 = employeeMembers[2];

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      employeeId: adminMember.employee?.employeeId ?? null,
      role: adminMember.role,
      hasFinanceAccess: true,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    emp1Ctx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: emp1.userId,
      userEmail: emp1.user.email,
      userFullName: emp1.user.fullName,
      membershipId: emp1.id,
      employeeId: emp1.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    emp2Ctx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: emp2.userId,
      userEmail: emp2.user.email,
      userFullName: emp2.user.fullName,
      membershipId: emp2.id,
      employeeId: emp2.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    emp3Ctx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: emp3.userId,
      userEmail: emp3.user.email,
      userFullName: emp3.user.fullName,
      membershipId: emp3.id,
      employeeId: emp3.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    // 3. Find active project with architectural typology
    testProject = await prisma.project.findFirst({
      where: {
        tenantId: tenant.id,
        status: { notIn: ["COMPLETED", "ARCHIVED", "DRAFT", "CANCELLED", "ON_HOLD"] },
        projectType: { not: null },
      },
    });

    if (!testProject) {
      testProject = await prisma.project.create({
        data: {
          tenantId: tenant.id,
          code: `QA-${Date.now().toString().slice(-4)}`,
          name: "Test Architecture Studio Project",
          status: "ACTIVE",
          projectType: "RESIDENTIAL",
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Create deliverable without acceptanceCriteria & priority
  // -------------------------------------------------------------------------
  test("1. Create Deliverable without removed fields (acceptanceCriteria & overall priority)", async () => {
    const created = await createTask(adminCtx, {
      projectId: testProject.id,
      description: "Draft structural layout and column grid for Ground Floor (simplified form)",
      assigneeIds: [emp1Ctx.membershipId],
      checklistItems: [
        {
          title: "Setup Revit central model and structural grids",
          assignedMemberId: emp1Ctx.membershipId,
          priority: TaskPriority.HIGH,
          dueDate: new Date(Date.now() + 86400000 * 3),
        },
      ],
    });

    assert.ok(created.id, "Deliverable must be created successfully");
    // Priority must default to MEDIUM without error
    assert.equal(created.priority, TaskPriority.MEDIUM, "Deliverable priority must default to MEDIUM");
    // Acceptance criteria must be null / omitted without error
    assert.equal(created.acceptanceCriteria, null, "Acceptance criteria must be null when omitted");

    // Clean up
    await prisma.task.delete({ where: { id: created.id } });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Edit a historical deliverable without data loss
  // -------------------------------------------------------------------------
  test("2. Edit a historical deliverable without data loss (preserves legacy acceptanceCriteria & priority)", async () => {
    // Manually create a historical task with legacy acceptanceCriteria and URGENT priority
    const historicalTask = await prisma.task.create({
      data: {
        tenantId: adminCtx.tenantId,
        projectId: testProject.id,
        title: "Historical Deliverable with Legacy Fields",
        description: "Legacy architectural brief",
        acceptanceCriteria: "STRICT: Layer standard compliance BS-1192 and stamped sheets.",
        priority: TaskPriority.URGENT,
        status: TaskWorkflowStatus.IN_PROGRESS,
        creatorId: adminCtx.membershipId,
        assigneeId: emp1Ctx.membershipId,
        assignedMemberIds: [emp1Ctx.membershipId],
      },
    });

    // Update only title and description
    const updated = await updateTask(adminCtx, historicalTask.id, {
      title: "Updated Historical Deliverable Title",
      description: "Updated brief with more details",
    });

    // Verify historical fields were NOT erased
    assert.equal(updated.title, "Updated Historical Deliverable Title");
    assert.equal(updated.description, "Updated brief with more details");
    assert.equal(updated.acceptanceCriteria, "STRICT: Layer standard compliance BS-1192 and stamped sheets.");
    assert.equal(updated.priority, TaskPriority.URGENT, "Historical priority must remain URGENT");

    // Clean up
    await prisma.task.delete({ where: { id: historicalTask.id } });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Assign 3 employees with distinct checklists, priorities, and deadlines
  // -------------------------------------------------------------------------
  let multiTaskId: string;
  let emp1ItemIds: string[] = [];
  let emp2ItemIds: string[] = [];
  let emp3ItemIds: string[] = [];

  test("3. Assign 3 employees with separate checklists, priorities, and deadlines", async () => {
    const d1 = new Date(Date.now() + 86400000 * 2); // 2 days
    const d2 = new Date(Date.now() + 86400000 * 5); // 5 days
    const d3 = new Date(Date.now() + 86400000 * 7); // 7 days (latest)

    const deliverable = await createTask(adminCtx, {
      projectId: testProject.id,
      title: "Mixed-Use Tower — Architectural Coordination Package",
      description: "Comprehensive coordination of structural, MEP, and interior joinery sheets.",
      assigneeIds: [emp1Ctx.membershipId, emp2Ctx.membershipId, emp3Ctx.membershipId],
      checklistItems: [
        // Employee 1: Structural drafting (HIGH, 2 days)
        {
          title: "Reconcile structural column grids with basement parking",
          assignedMemberId: emp1Ctx.membershipId,
          priority: TaskPriority.HIGH,
          dueDate: d1,
        },
        {
          title: "Generate foundation schedule and wall sections",
          assignedMemberId: emp1Ctx.membershipId,
          priority: TaskPriority.HIGH,
          dueDate: d1,
        },
        // Employee 2: MEP coordination (URGENT, 5 days)
        {
          title: "Check HVAC riser penetrations through transfer slab",
          assignedMemberId: emp2Ctx.membershipId,
          priority: TaskPriority.URGENT,
          dueDate: d2,
        },
        // Employee 3: Interior elevations (LOW, 7 days)
        {
          title: "Draft master bathroom stone cladding and vanity details",
          assignedMemberId: emp3Ctx.membershipId,
          priority: TaskPriority.LOW,
          dueDate: d3,
        },
      ],
    });

    multiTaskId = deliverable.id;
    assert.ok(deliverable.id, "Multi-employee deliverable created");

    // Verify parent deadline derived from latest (d3)
    assert.ok(deliverable.dueDate, "Derived parent due date must exist");
    assert.equal(
      new Date(deliverable.dueDate!).toISOString(),
      d3.toISOString(),
      "Parent deadline must match latest checklist item (7 days)"
    );

    // Verify 3 distinct TaskAssignment records exist
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId: multiTaskId },
    });
    assert.equal(assignments.length, 3, "Exactly 3 employee assignments must be created");

    const assignedIds = assignments.map((a) => a.membershipId);
    assert.ok(assignedIds.includes(emp1Ctx.membershipId), "Emp1 assigned");
    assert.ok(assignedIds.includes(emp2Ctx.membershipId), "Emp2 assigned");
    assert.ok(assignedIds.includes(emp3Ctx.membershipId), "Emp3 assigned");

    // Verify each checklist item is bound to correct member
    const items = await prisma.taskChecklistItem.findMany({
      where: { taskId: multiTaskId },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(items.length, 4, "4 checklist items total");

    emp1ItemIds = items.filter((i) => i.assignedMemberId === emp1Ctx.membershipId).map((i) => i.id);
    emp2ItemIds = items.filter((i) => i.assignedMemberId === emp2Ctx.membershipId).map((i) => i.id);
    emp3ItemIds = items.filter((i) => i.assignedMemberId === emp3Ctx.membershipId).map((i) => i.id);

    assert.equal(emp1ItemIds.length, 2, "Emp1 has 2 items");
    assert.equal(emp2ItemIds.length, 1, "Emp2 has 1 item");
    assert.equal(emp3ItemIds.length, 1, "Emp3 has 1 item");

    // Verify item-level priorities
    const emp1Items = items.filter((i) => i.assignedMemberId === emp1Ctx.membershipId);
    assert.equal(emp1Items[0].priority, TaskPriority.HIGH);
    const emp2Items = items.filter((i) => i.assignedMemberId === emp2Ctx.membershipId);
    assert.equal(emp2Items[0].priority, TaskPriority.URGENT);
    const emp3Items = items.filter((i) => i.assignedMemberId === emp3Ctx.membershipId);
    assert.equal(emp3Items[0].priority, TaskPriority.LOW);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Update one employee's checklist and verify others are unchanged
  // -------------------------------------------------------------------------
  test("4. Updating one employee's checklist leaves others completely unchanged", async () => {
    // Emp1 acknowledges and completes their first item
    await acknowledgeAssignment(emp1Ctx, multiTaskId);
    await startChecklistWork(emp1Ctx, multiTaskId, emp1ItemIds[0]);
    await toggleChecklistItem(emp1Ctx, multiTaskId, emp1ItemIds[0], true);

    const emp1Item1 = await prisma.taskChecklistItem.findUniqueOrThrow({
      where: { id: emp1ItemIds[0] },
    });
    assert.equal(emp1Item1.isCompleted, true, "Emp1 item 1 must be completed");

    // Check Emp2 and Emp3 items remain uncompleted & not started
    const emp2Item = await prisma.taskChecklistItem.findUniqueOrThrow({
      where: { id: emp2ItemIds[0] },
    });
    assert.equal(emp2Item.isCompleted, false, "Emp2 item must remain incomplete");
    assert.equal(emp2Item.status, TaskWorkflowStatus.NOT_STARTED);

    const emp3Item = await prisma.taskChecklistItem.findUniqueOrThrow({
      where: { id: emp3ItemIds[0] },
    });
    assert.equal(emp3Item.isCompleted, false, "Emp3 item must remain incomplete");
    assert.equal(emp3Item.status, TaskWorkflowStatus.NOT_STARTED);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Submit one employee's work while other employees remain in progress
  // -------------------------------------------------------------------------
  let emp1SubmissionId: string;

  test("5. Submit one employee's work while other employees remain in progress", async () => {
    // Emp1 finishes second item
    await startChecklistWork(emp1Ctx, multiTaskId, emp1ItemIds[1]);
    await toggleChecklistItem(emp1Ctx, multiTaskId, emp1ItemIds[1], true);

    // Emp1 submits version snapshot covering both their items
    const subResult = await submitTasksForReview(emp1Ctx, {
      taskId: multiTaskId,
      checklistItemIds: emp1ItemIds,
      summary: "Completed structural column grid reconciliation and foundation schedule.",
    });

    assert.ok(subResult.id);
    emp1SubmissionId = subResult.id;
    assert.equal(subResult.status, "PENDING");
    assert.equal(subResult.submitterId, emp1Ctx.membershipId);

    // Parent deliverable MUST appear under AWAITING_REVIEW in findTasks
    const waitingReviewTasks = await findTasks(adminCtx, { filter: "WAITING_REVIEW" });
    const foundInReview = waitingReviewTasks.find((t) => t.id === multiTaskId);
    assert.ok(
      foundInReview,
      "Parent deliverable must appear in WAITING_REVIEW when ANY employee assignment has a pending submission!"
    );

    // Verify Emp2 and Emp3 assignments are NOT submitted
    const emp2Assignments = await prisma.taskAssignment.findUniqueOrThrow({
      where: { taskId_membershipId: { taskId: multiTaskId, membershipId: emp2Ctx.membershipId } },
    });
    assert.equal(emp2Assignments.isCompleted, false);

    // Parent deliverable status is not completed
    const taskRecord = await prisma.task.findUniqueOrThrow({ where: { id: multiTaskId } });
    assert.notEqual(taskRecord.status, TaskWorkflowStatus.COMPLETED);
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Request changes for one employee; preserve other assignments
  // -------------------------------------------------------------------------
  test("6. Request changes for one employee with mandatory explanation", async () => {
    // Reviewer requests corrections on Emp1's submission
    const reviewResult = await reviewTaskSubmission(adminCtx, emp1SubmissionId, {
      decision: "REQUEST_CHANGES",
      feedback: "Grid C-4 has a 150mm clash with the shear wall. Re-align columns per SE report.",
    });

    assert.equal(reviewResult.status, "CHANGES_REQUESTED");
    assert.equal(reviewResult.reviewFeedback, "Grid C-4 has a 150mm clash with the shear wall. Re-align columns per SE report.");

    // Other assignments must remain intact
    const emp2Assignment = await prisma.taskAssignment.findUniqueOrThrow({
      where: { taskId_membershipId: { taskId: multiTaskId, membershipId: emp2Ctx.membershipId } },
    });
    assert.equal(emp2Assignment.isCompleted, false);

    const emp3Assignment = await prisma.taskAssignment.findUniqueOrThrow({
      where: { taskId_membershipId: { taskId: multiTaskId, membershipId: emp3Ctx.membershipId } },
    });
    assert.equal(emp3Assignment.isCompleted, false);
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Resubmit and approve one employee; parent remains incomplete
  // -------------------------------------------------------------------------
  test("7. Approve one employee's submission while others are pending; parent remains incomplete", async () => {
    // Emp1 resubmits corrections (v2)
    const v2Sub = await submitTasksForReview(emp1Ctx, {
      taskId: multiTaskId,
      checklistItemIds: emp1ItemIds,
      summary: "Re-aligned Column C-4 per structural report notes.",
    });

    // Reviewer approves Emp1's work
    const approvedSub = await reviewTaskSubmission(adminCtx, v2Sub.id, {
      decision: "APPROVE",
      feedback: "Column alignment verified with SE model. Approved.",
    });

    assert.equal(approvedSub.status, "APPROVED");

    // Emp1 assignment is now completed
    const emp1Assignment = await prisma.taskAssignment.findUniqueOrThrow({
      where: { taskId_membershipId: { taskId: multiTaskId, membershipId: emp1Ctx.membershipId } },
    });
    assert.equal(emp1Assignment.isCompleted, true, "Emp1 assignment must be completed");

    // Parent deliverable MUST NOT be completed because Emp2 and Emp3 are still pending!
    const parentTask = await prisma.task.findUniqueOrThrow({ where: { id: multiTaskId } });
    assert.notEqual(
      parentTask.status,
      TaskWorkflowStatus.COMPLETED,
      "Parent deliverable must NOT be completed when other employees are still in progress!"
    );
    assert.equal(parentTask.status, TaskWorkflowStatus.IN_PROGRESS);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Complete all remaining employees -> Deliverable completes
  // -------------------------------------------------------------------------
  test("8. Complete all remaining employee assignments -> Parent automatically completes", async () => {
    // Emp2 finishes and gets approved
    await acknowledgeAssignment(emp2Ctx, multiTaskId);
    await startChecklistWork(emp2Ctx, multiTaskId, emp2ItemIds[0]);
    await toggleChecklistItem(emp2Ctx, multiTaskId, emp2ItemIds[0], true);
    const emp2Sub = await submitTasksForReview(emp2Ctx, {
      taskId: multiTaskId,
      checklistItemIds: emp2ItemIds,
      summary: "HVAC transfer slab penetrations coordinated.",
    });
    await reviewTaskSubmission(adminCtx, emp2Sub.id, { decision: "APPROVE" });

    // Emp3 finishes and gets approved
    await acknowledgeAssignment(emp3Ctx, multiTaskId);
    await startChecklistWork(emp3Ctx, multiTaskId, emp3ItemIds[0]);
    await toggleChecklistItem(emp3Ctx, multiTaskId, emp3ItemIds[0], true);
    const emp3Sub = await submitTasksForReview(emp3Ctx, {
      taskId: multiTaskId,
      checklistItemIds: emp3ItemIds,
      summary: "Master bathroom vanity and cladding details complete.",
    });
    await reviewTaskSubmission(adminCtx, emp3Sub.id, { decision: "APPROVE" });

    // All assignments are now completed
    const allAssignments = await prisma.taskAssignment.findMany({ where: { taskId: multiTaskId } });
    assert.ok(allAssignments.every((a) => a.isCompleted), "All 3 employee assignments must be completed");

    // Parent deliverable MUST now be marked COMPLETED!
    const finalParent = await prisma.task.findUniqueOrThrow({ where: { id: multiTaskId } });
    assert.equal(
      finalParent.status,
      TaskWorkflowStatus.COMPLETED,
      "Parent deliverable must automatically complete when ALL employee assignments are approved!"
    );
    assert.ok(finalParent.completionDate, "Parent deliverable completion date must be recorded");

    // Cleanup
    await prisma.task.delete({ where: { id: multiTaskId } });
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Unauthorized user cannot mutate another employee's items
  // -------------------------------------------------------------------------
  test("9. Unauthorized user cannot start work or mutate another employee's checklist", async () => {
    const singleTask = await createTask(adminCtx, {
      projectId: testProject.id,
      description: "Confidential site structural survey report",
      assigneeIds: [emp1Ctx.membershipId],
      checklistItems: [
        {
          title: "Confidential core sample survey",
          assignedMemberId: emp1Ctx.membershipId,
          dueDate: new Date(Date.now() + 86400000),
        },
      ],
    });

    const item = await prisma.taskChecklistItem.findFirstOrThrow({
      where: { taskId: singleTask.id },
    });

    // Emp2 attempts to start work on Emp1's item
    await assert.rejects(
      async () => {
        await startChecklistWork(emp2Ctx, singleTask.id, item.id);
      },
      /Forbidden/i,
      "Emp2 must be forbidden from starting work on Emp1's item"
    );

    // Cleanup
    await prisma.task.delete({ where: { id: singleTask.id } });
  });
});
