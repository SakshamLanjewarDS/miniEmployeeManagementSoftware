import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  acknowledgeAssignment,
  startChecklistWork,
  raiseTaskBlocker,
  resolveTaskBlocker,
  askTaskClarification,
  replyToTaskClarification,
  requestDeadlineExtension,
  decideDeadlineExtension,
  submitTasksForReview,
  reviewTaskSubmission,
  reopenChecklistTask,
  validateNoCircularDependencies,
} from "../src/server/modules/tasks/workflow";
import { createTask, toggleChecklistItem } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskWorkflowStatus, TaskPriority } from "@prisma/client";

describe("End-to-End Employee Task Workflow & Governance Test Suite", () => {
  let tenant: any;
  let adminCtx: TenantContext;
  let employee1Ctx: TenantContext;
  let employee2Ctx: TenantContext;
  let reviewerCtx: TenantContext;
  let testProject: any;
  let createdTaskId: string;
  let item1Id: string;
  let item2Id: string;
  let item3Id: string;

  before(async () => {
    // 1. Identify or bootstrap tenant
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    // 2. Fetch members: 1 Admin/Owner, 2 Employees
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    const adminMember = members.find((m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN);
    assert.ok(adminMember, "Admin/Owner must exist");

    const employeeMembers = members.filter((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(employeeMembers.length >= 2, "At least 2 employees must exist in test workspace");

    const emp1 = employeeMembers[0];
    const emp2 = employeeMembers[1];

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

    employee1Ctx = {
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

    employee2Ctx = {
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

    reviewerCtx = {
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

    // 3. Find active project
    testProject = await prisma.project.findFirst({
      where: { tenantId: tenant.id, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
    });
    assert.ok(testProject, "Active project must exist");
  });

  test("1. Four-Eyes Policy Enforcement on Deliverable Creation", async () => {
    // Attempting to create deliverable where reviewer is ALSO an assignee must fail
    await assert.rejects(
      async () => {
        await createTask(adminCtx, {
          projectId: testProject.id,
          title: "Invalid Deliverable with Self Reviewer",
          description: "Detailed architectural brief for self-review test case.",
          priority: TaskPriority.HIGH,
          assigneeIds: [employee1Ctx.membershipId],
          reviewerId: employee1Ctx.membershipId, // Violation!
          checklistItems: [{ title: "Item 1", assignedMemberId: employee1Ctx.membershipId }],
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("Four-eyes policy"), "Must mention four-eyes policy");
        return true;
      }
    );
  });

  test("2. Assignment Creation with Multi-Employee Checklists and Acceptance Criteria", async () => {
    const task = await createTask(adminCtx, {
      projectId: testProject.id,
      title: "Alibaug Pergola Joinery & Electrical Coordination",
      description: "Produce 1:20 pergola joinery drawings and coordinate electrical conduits.",
      priority: TaskPriority.HIGH,
      acceptanceCriteria: "1. Dimensions match structural frame. 2. Layer standards compliant. 3. Signed off by Lead.",
      reviewerId: reviewerCtx.membershipId,
      assigneeIds: [employee1Ctx.membershipId, employee2Ctx.membershipId],
      checklistItems: [
        {
          title: "Draft 1:20 Pergola Joinery Junctions",
          assignedMemberId: employee1Ctx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 2),
        },
        {
          title: "MEP Conduit Routing Verification",
          assignedMemberId: employee1Ctx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 3),
        },
        {
          title: "Timber Material Specification Sheet",
          assignedMemberId: employee2Ctx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 4),
        },
      ],
    });

    assert.ok(task.id);
    createdTaskId = task.id;

    // Verify task assignments created
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId: task.id },
    });
    assert.equal(assignments.length, 2, "Must create 2 independent TaskAssignment records");
    assert.ok(assignments.every((a) => a.acknowledgedAt === null), "Assignments start unacknowledged");

    // Fetch checklist items and store IDs
    const items = await prisma.taskChecklistItem.findMany({
      where: { taskId: task.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(items.length, 3);
    item1Id = items[0].id;
    item2Id = items[1].id;
    item3Id = items[2].id;

    // Set item2 prerequisite to item1
    await prisma.taskChecklistItem.update({
      where: { id: item2Id },
      data: { prerequisiteItemId: item1Id },
    });
  });

  test("3. Assignment Acknowledgement & Idempotency", async () => {
    // Employee 1 acknowledges
    const ack1 = await acknowledgeAssignment(employee1Ctx, createdTaskId);
    assert.equal(ack1.success, true);
    assert.equal(ack1.alreadyAcknowledged, false);
    assert.ok(ack1.acknowledgedAt);

    // Re-acknowledging the same version must be idempotent
    const ackRepeat = await acknowledgeAssignment(employee1Ctx, createdTaskId);
    assert.equal(ackRepeat.success, true);
    assert.equal(ackRepeat.alreadyAcknowledged, true);

    // Verify in database
    const dbAssignment = await prisma.taskAssignment.findUnique({
      where: {
        taskId_membershipId: {
          taskId: createdTaskId,
          membershipId: employee1Ctx.membershipId,
        },
      },
    });
    assert.ok(dbAssignment?.acknowledgedAt);
    assert.equal(dbAssignment?.acknowledgedVersion, 1);
  });

  test("4. Starting Work & Prerequisite Dependency Enforcement", async () => {
    // Attempting to start Item 2 before Item 1 must be blocked because Item 1 is prerequisite
    await assert.rejects(
      async () => {
        await startChecklistWork(employee1Ctx, createdTaskId, item2Id);
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Prerequisite dependency") && err.message.includes("must be completed"),
          "Must reject due to unfinished prerequisite"
        );
        return true;
      }
    );

    // Start Item 1 (has no prerequisite) -> succeeds
    const startRes = await startChecklistWork(employee1Ctx, createdTaskId, item1Id);
    assert.ok(startRes?.startedAt);
    assert.equal(startRes?.status, TaskWorkflowStatus.IN_PROGRESS);

    // Verify Item 1 and Deliverable are IN_PROGRESS
    const dbItem1 = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem1?.status, TaskWorkflowStatus.IN_PROGRESS);

    const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
    assert.equal(dbTask?.status, TaskWorkflowStatus.IN_PROGRESS);
  });

  test("5. Circular Dependency Prevention", async () => {
    // Validate circular dependency check rejects self-dependency
    await assert.rejects(
      async () => {
        await validateNoCircularDependencies(tenant.id, item1Id, item1Id);
      },
      (err: any) => {
        assert.ok(err.message.includes("cannot depend on itself"));
        return true;
      }
    );
  });

  test("6. Raising and Resolving Blockers", async () => {
    // Raise blocker on Item 1
    const blockerRes = await raiseTaskBlocker(employee1Ctx, createdTaskId, item1Id, {
      reason: "Structural engineer revised grid columns by 150mm; awaiting CAD layout.",
      neededToContinue: "Updated CAD grid from structural engineer",
    });
    assert.ok(blockerRes);
    assert.equal(blockerRes.isBlocked, true);

    const dbItemBlocked = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItemBlocked?.isBlocked, true);
    assert.ok(dbItemBlocked?.blockerReason?.includes("revised grid columns"));

    // Resolve blocker on Item 1
    const resolveRes = await resolveTaskBlocker(employee1Ctx, createdTaskId, item1Id, {
      resolutionNotes: "Received updated structural grid overlay from consultant.",
    });
    assert.ok(resolveRes);
    assert.equal(resolveRes.isBlocked, false);

    const dbItemUnblocked = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItemUnblocked?.isBlocked, false);
  });

  test("7. Clarifications Q&A Thread", async () => {
    // Ask clarification
    const qRes = await askTaskClarification(employee1Ctx, createdTaskId, {
      checklistItemId: item1Id,
      question: "Should the pergola timber rafters specify Teakwood or Accoya?",
    });
    assert.ok(qRes?.id);

    // Lead replies
    const replyRes = await replyToTaskClarification(reviewerCtx, qRes.id, {
      reply: "Use Accoya timber with matte polyurethane finish as per client moodboard.",
    });
    assert.ok(replyRes?.id);

    // Verify clarification thread
    const thread = await prisma.taskClarification.findUnique({
      where: { id: qRes.id },
      include: { answers: true },
    });
    assert.equal(thread?.answers.length, 1);
    assert.ok(thread?.answers[0].message.includes("Use Accoya timber"));
  });

  test("8. Deadline Extension Request & Approval", async () => {
    const newDueDate = new Date(Date.now() + 86400000 * 5);

    // Employee 1 requests extension
    const extReq = await requestDeadlineExtension(employee1Ctx, createdTaskId, item1Id, {
      proposedDueDate: newDueDate,
      reason: "Awaiting timber manufacturer fire-rating test certificates.",
    });
    assert.ok(extReq?.id);

    // Admin approves extension
    const decRes = await decideDeadlineExtension(adminCtx, extReq.id, {
      decision: "APPROVE",
      decisionReason: "Fire certificates are critical milestone requirement.",
    });
    assert.ok(decRes);
    assert.equal(decRes.status, "APPROVED");

    // Verify checklist item date updated
    const dbItem = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem?.dueDate?.toISOString(), newDueDate.toISOString());
  });

  test("9. Versioned Submission Snapshot (v1)", async () => {
    // Submit Item 1 for review
    const subRes = await submitTasksForReview(employee1Ctx, {
      taskId: createdTaskId,
      checklistItemIds: [item1Id],
      summary: "Drafted 1:20 joinery sections A-301 through A-303. Integrated consultant grid revisions.",
      evidenceLinks: [{ url: "https://drive.google.com/file/d/pergola-joinery-v1.pdf", title: "Joinery PDF" }],
    });

    assert.ok(subRes?.id);
    assert.equal(subRes.version, 1);
    assert.equal(subRes.status, "PENDING");

    // Check item status is IN_REVIEW
    const dbItem = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem?.status, TaskWorkflowStatus.IN_REVIEW);

    // Check submission snapshot in DB
    const dbSub = await prisma.taskSubmission.findUnique({ where: { id: subRes.id } });
    assert.equal(dbSub?.version, 1);
    assert.equal(dbSub?.status, "PENDING");
  });

  test("10. Four-Eyes Policy: Submitter Cannot Self-Approve", async () => {
    const pendingSub = await prisma.taskSubmission.findFirst({
      where: { taskId: createdTaskId, version: 1 },
    });
    assert.ok(pendingSub);

    // Employee 1 (the submitter) attempts to approve their own work -> must be rejected
    await assert.rejects(
      async () => {
        await reviewTaskSubmission(employee1Ctx, pendingSub.id, {
          decision: "APPROVE",
        });
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Four-eyes policy") ||
          err.message.includes("cannot approve their own") ||
          err.message.includes("Leadership"),
          "Must reject self-approval"
        );
        return true;
      }
    );
  });

  test("11. Reviewer Requests Changes with Mandatory Feedback", async () => {
    const pendingSub = await prisma.taskSubmission.findFirst({
      where: { taskId: createdTaskId, version: 1 },
    });
    assert.ok(pendingSub);

    // Must fail if feedback is empty when requesting changes
    await assert.rejects(
      async () => {
        await reviewTaskSubmission(reviewerCtx, pendingSub.id, {
          decision: "REQUEST_CHANGES",
          feedback: "", // Empty
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("corrections needed is required"));
        return true;
      }
    );

    // Reviewer requests changes with explanation
    const reviewRes = await reviewTaskSubmission(reviewerCtx, pendingSub.id, {
      decision: "REQUEST_CHANGES",
      feedback: "Please add anchor bolt diameter callouts on Detail 3, and add sealant note.",
    });

    assert.ok(reviewRes);
    assert.equal(reviewRes.status, "CHANGES_REQUESTED");

    // Item 1 returns to IN_PROGRESS so employee can make corrections
    const dbItem = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem?.status, TaskWorkflowStatus.IN_PROGRESS);
  });

  test("12. Corrections & Resubmission (Snapshot v2)", async () => {
    // Employee makes corrections and resubmits
    const subRes2 = await submitTasksForReview(employee1Ctx, {
      taskId: createdTaskId,
      checklistItemIds: [item1Id],
      summary: "Added 16mm anchor bolt callouts and silicone weatherseal notes to Detail 3.",
      evidenceLinks: [{ url: "https://drive.google.com/file/d/pergola-joinery-v2.pdf", title: "Joinery PDF v2" }],
    });

    assert.ok(subRes2?.id);
    assert.equal(subRes2.version, 2, "Second submission must be version 2");
    assert.equal(subRes2.status, "PENDING");
  });

  test("13. Reviewer Approves v2 & Verifies Partial Completion", async () => {
    const sub2 = await prisma.taskSubmission.findFirst({
      where: { taskId: createdTaskId, version: 2 },
    });
    assert.ok(sub2);

    const approveRes = await reviewTaskSubmission(reviewerCtx, sub2.id, {
      decision: "APPROVE",
      feedback: "All details verified against architectural specs. Approved.",
    });

    assert.ok(approveRes);
    assert.equal(approveRes.status, "APPROVED");

    // Item 1 is now COMPLETED
    const dbItem1 = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem1?.status, TaskWorkflowStatus.COMPLETED);
    assert.equal(dbItem1?.isCompleted, true);
    assert.ok(dbItem1?.completedAt);

    // However, Items 2 and 3 are NOT completed yet, so Deliverable remains IN_PROGRESS
    const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
    assert.equal(dbTask?.status, TaskWorkflowStatus.IN_PROGRESS);
  });

  test("14. Completing Remaining Work & Automatic Deliverable Completion", async () => {
    // Now that Item 1 is completed, Item 2 can be started
    await startChecklistWork(employee1Ctx, createdTaskId, item2Id);

    // Submit Item 2 & Employee 2's Item 3
    const sub3 = await submitTasksForReview(employee1Ctx, {
      taskId: createdTaskId,
      checklistItemIds: [item2Id],
      summary: "MEP Conduit routes verified.",
    });
    await reviewTaskSubmission(reviewerCtx, sub3.id, { decision: "APPROVE" });

    // Employee 2 acknowledges, starts, and submits Item 3
    await acknowledgeAssignment(employee2Ctx, createdTaskId);
    await startChecklistWork(employee2Ctx, createdTaskId, item3Id);
    const sub4 = await submitTasksForReview(employee2Ctx, {
      taskId: createdTaskId,
      checklistItemIds: [item3Id],
      summary: "Timber material specifications complete.",
    });
    await reviewTaskSubmission(reviewerCtx, sub4.id, { decision: "APPROVE" });

    // Now all checklist items and both employee assignments are completed
    const finalTask = await prisma.task.findUnique({
      where: { id: createdTaskId },
      include: { assignments: true, checklistItems: true },
    });

    assert.ok(finalTask?.checklistItems.every((i) => i.isCompleted), "All items must be completed");
    assert.ok(finalTask?.assignments.every((a) => a.isCompleted), "All assignments must be completed");
    assert.equal(finalTask?.status, TaskWorkflowStatus.COMPLETED, "Parent Deliverable must be automatically COMPLETED");
    assert.ok(finalTask?.completionDate, "Must record completionDate");
  });

  test("15. Reopening Completed Work with Audit Justification", async () => {
    // Non-admin employee attempts to reopen -> must be blocked
    await assert.rejects(
      async () => {
        await reopenChecklistTask(employee1Ctx, createdTaskId, item1Id, {
          reason: "Want to change something",
        });
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Only Studio Leadership") || err.message.includes("leadership"),
          "Must require leadership role"
        );
        return true;
      }
    );

    // Reopen requires non-empty reason
    await assert.rejects(
      async () => {
        await reopenChecklistTask(adminCtx, createdTaskId, item1Id, {
          reason: "",
        });
      },
      (err: any) => {
        assert.ok(err.message.includes("Reason for reopening completed work is required"));
        return true;
      }
    );

    // Admin reopens Item 1 with valid reason
    const reopenRes = await reopenChecklistTask(adminCtx, createdTaskId, item1Id, {
      reason: "Client requested additional pergolas canopy overhang extension by 300mm.",
    });

    assert.ok(reopenRes);
    assert.equal(reopenRes.status, TaskWorkflowStatus.IN_PROGRESS);

    // Verify Item 1 and Deliverable are reset to IN_PROGRESS
    const dbItem1 = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem1?.status, TaskWorkflowStatus.IN_PROGRESS);
    assert.equal(dbItem1?.isCompleted, false);

    const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
    assert.equal(dbTask?.status, TaskWorkflowStatus.IN_PROGRESS);

    // Verify audit log has the reopen reason recorded
    const auditLogs = await prisma.taskActivityHistory.findMany({
      where: { taskId: createdTaskId, action: "TASK_REOPENED" },
    });
    assert.ok(auditLogs.length > 0);
    assert.ok(auditLogs[0].reason?.includes("overhang extension by 300mm"));
  });

  test("16. Employee Checklist Ticking: Assigned employee can check and uncheck checklist items", async () => {
    // Employee 1 is assigned to item 1 on createdTaskId
    // 1. Employee 1 checks off item 1
    const checkedItem = await toggleChecklistItem(employee1Ctx, createdTaskId, item1Id, true);
    assert.equal(checkedItem.isCompleted, true);
    assert.equal(checkedItem.status, TaskWorkflowStatus.COMPLETED);
    assert.equal(checkedItem.completedById, employee1Ctx.membershipId);
    assert.ok(checkedItem.completedAt);

    // Verify DB persistence
    const dbItem = await prisma.taskChecklistItem.findUnique({ where: { id: item1Id } });
    assert.equal(dbItem?.isCompleted, true);
    assert.equal(dbItem?.status, TaskWorkflowStatus.COMPLETED);

    // 2. Employee 1 unchecks item 1 (reverting back to in progress)
    const uncheckedItem = await toggleChecklistItem(employee1Ctx, createdTaskId, item1Id, false);
    assert.equal(uncheckedItem.isCompleted, false);
    assert.equal(uncheckedItem.status, TaskWorkflowStatus.IN_PROGRESS);
    assert.equal(uncheckedItem.completedById, null);
    assert.equal(uncheckedItem.completedAt, null);

    // 3. Unauthorized non-member/non-assignee is rejected
    const fakeCtx: TenantContext = {
      ...employee1Ctx,
      membershipId: "non-existent-membership-id",
    };
    await assert.rejects(
      async () => {
        await toggleChecklistItem(fakeCtx, createdTaskId, item1Id, true);
      },
      /Only assigned employees, the task creator, or Studio Admin\/Boss can update checklist items/i
    );
  });
});
