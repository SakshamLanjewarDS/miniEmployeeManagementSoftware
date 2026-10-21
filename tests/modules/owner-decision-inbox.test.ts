import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  getOwnerDecisionInbox,
  executeInboxDecision,
  clearInboxCache,
} from "../../src/server/modules/inbox/service";
import { createTask } from "../../src/server/modules/tasks/repository";
import {
  submitTasksForReview,
  requestDeadlineExtension,
} from "../../src/server/modules/tasks/workflow";
import { requestProjectScopeChange } from "../../src/server/modules/projects/lifecycle";
import { submitOfficialRecordChangeRequest } from "../../src/server/modules/profile/service";
import { TenantContext } from "../../src/server/tenancy/context";
import {
  TenantRole,
  ProjectStatus,
  TaskPriority,
  TaskWorkflowStatus,
} from "@prisma/client";

describe("Module 1: Owner Decision Inbox — Executive Authorization Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let ownerCtx: TenantContext;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;

  let ownerMember: any;
  let adminMember: any;
  let employeeMember: any;

  let project: any;
  let testDeliverable: any;
  let testSubmissionId: string;
  let testExtensionReqId: string;
  let testScopeChangeId: string;
  let testProfileChangeId: string;
  let blockedTaskId: string;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    // Fetch members
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    ownerMember = members.find((m) => m.role === TenantRole.OWNER);
    adminMember = members.find((m) => m.role === TenantRole.ADMIN);
    employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);

    assert.ok(ownerMember, "Owner member must exist");
    assert.ok(adminMember, "Admin member must exist");
    assert.ok(employeeMember, "Employee member must exist");

    ownerCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: ownerMember.userId,
      userEmail: ownerMember.user.email,
      userFullName: ownerMember.user.fullName,
      membershipId: ownerMember.id,
      employeeId: ownerMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

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

    // Create an active test project
    const pCode = `PRJ-INB-${Date.now().toString().slice(-5)}`;
    project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        code: pCode,
        name: `Inbox Test Project ${pCode}`,
        projectType: "RESIDENTIAL_VILLA",
        status: ProjectStatus.ACTIVE,
        description: "Test specifications for Owner Decision Inbox",
        startDate: new Date(),
        targetDate: new Date("2027-01-01"),
      },
    });

    // Assign employee and owner to project
    await prisma.projectMember.createMany({
      data: [
        {
          tenantId: tenant.id,
          projectId: project.id,
          membershipId: employeeMember.id,
          projectRole: "Project Architect",
        },
        {
          tenantId: tenant.id,
          projectId: project.id,
          membershipId: ownerMember.id,
          projectRole: "Principal Partner",
        },
        {
          tenantId: tenant.id,
          projectId: project.id,
          membershipId: adminMember.id,
          projectRole: "Operations Partner",
        },
      ],
      skipDuplicates: true,
    });
  });

  after(async () => {
    if (project?.id) {
      await prisma.taskSubmission.deleteMany({ where: { tenantId: tenant.id, task: { projectId: project.id } } }).catch(() => {});
      await prisma.taskExtensionRequest.deleteMany({ where: { tenantId: tenant.id, task: { projectId: project.id } } }).catch(() => {});
      await prisma.taskChecklistItem.deleteMany({ where: { task: { projectId: project.id } } }).catch(() => {});
      await prisma.taskComment.deleteMany({ where: { task: { projectId: project.id } } }).catch(() => {});
      await prisma.task.deleteMany({ where: { projectId: project.id } }).catch(() => {});
      await prisma.projectChangeRequest.deleteMany({ where: { projectId: project.id } }).catch(() => {});
      await prisma.projectMember.deleteMany({ where: { projectId: project.id } }).catch(() => {});
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    }
    if (testProfileChangeId) {
      await prisma.profileChangeRequest.delete({ where: { id: testProfileChangeId } }).catch(() => {});
    }
  });

  test("1. Access Gate: Regular employees are strictly forbidden from viewing Owner Decision Inbox", async () => {
    await assert.rejects(
      async () => {
        await getOwnerDecisionInbox(employeeCtx);
      },
      /Only Studio Owners or Administrators can access the Decision Inbox/
    );
  });

  test("2. Aggregation: Aggregates submissions, extensions, scope changes, profile changes, and blockers", async () => {
    // 1. Create a task assigned to employee and submit it for review
    const deliverable = await createTask(ownerCtx, {
      projectId: project.id,
      title: "Detailed Architectural Sections",
      description: "Produce 1:20 sectional details for construction review.",
      priority: TaskPriority.HIGH,
      assigneeId: employeeMember.id,
      checklistItems: [
        {
          title: "Parapet waterproof junction detail",
          assignedMemberId: employeeMember.id,
          dueDate: "2026-11-01",
        },
      ],
    });
    testDeliverable = deliverable;

    // Submit deliverable for review
    const subRes = await submitTasksForReview(employeeCtx, {
      taskId: deliverable.id,
      summary: "Completed junction drawings per technical spec.",
      checklistItemIds: [deliverable.checklistItems[0].id],
    });
    assert.ok(subRes.id);
    testSubmissionId = subRes.id;

    // 2. Request a deadline extension on the checklist item
    const checkItem = deliverable.checklistItems[0];
    const extReq = await requestDeadlineExtension(
      employeeCtx,
      deliverable.id,
      checkItem.id,
      {
        proposedDueDate: "2026-11-15T00:00:00.000Z",
        reason: "Delayed supplier technical specification data sheet.",
      }
    );
    testExtensionReqId = extReq.id;

    // 3. Request a Project Scope Change
    const scopeReq = await requestProjectScopeChange(employeeCtx, project.id, {
      title: "Basement Waterproofing System Upgrade",
      reason: "High water table discovered during soil core geotechnical investigation.",
      affectedScope: "Structural engineering and waterproofing membranes",
      scheduleImpactDays: 10,
      feeImpactAmount: 75000,
    });
    testScopeChangeId = scopeReq.id;

    // 4. Request an official Profile Change
    if (employeeMember.employee) {
      const profReq = await submitOfficialRecordChangeRequest(employeeCtx, {
        fieldKey: "designation",
        newValue: "Senior Architectural Technologist",
        reason: "Promotion following annual studio performance review.",
      });
      testProfileChangeId = profReq.id;
    }

    // 5. Create a Blocked Task
    const blockedTask = await createTask(ownerCtx, {
      projectId: project.id,
      title: "MEP Trench Coordination",
      description: "Coordinate HVAC conduits with structural beams.",
      priority: TaskPriority.URGENT,
      assigneeId: employeeMember.id,
      checklistItems: [
        {
          title: "Verify trench clearances against structural footings",
          assignedMemberId: employeeMember.id,
        },
      ],
    });
    blockedTaskId = blockedTask.id;

    // Mark task as BLOCKED
    await prisma.task.update({
      where: { id: blockedTask.id },
      data: {
        status: TaskWorkflowStatus.BLOCKED,
        blockerReason: "Awaiting revised structural load calculations from MEP consultant.",
      },
    });

    // Fetch Owner Decision Inbox
    const inbox = await getOwnerDecisionInbox(ownerCtx, { tab: "all-authorized" });
    assert.ok(inbox.items.length >= 4, "Inbox must contain at least 4 items");

    // Verify presence of all aggregated types
    const types = inbox.items.map((i) => i.type);
    assert.ok(types.includes("DELIVERABLE_SUBMISSION"), "Must include DELIVERABLE_SUBMISSION");
    assert.ok(types.includes("DEADLINE_EXTENSION"), "Must include DEADLINE_EXTENSION");
    assert.ok(types.includes("SCOPE_CHANGE"), "Must include SCOPE_CHANGE");

    // Verify Blockers tab
    const blockersInbox = await getOwnerDecisionInbox(ownerCtx, { tab: "blockers" });
    assert.ok(blockersInbox.items.some((i) => i.rawId === blockedTaskId), "Blocker tab must include blocked task");
    assert.equal(blockersInbox.items.find((i) => i.rawId === blockedTaskId)?.urgency, "CRITICAL");
  });

  test("3. Four-Eyes Principle: Owner cannot self-approve their own submitted items", async () => {
    // Have the Owner request a Scope Change directly
    const ownerScopeReq = await requestProjectScopeChange(ownerCtx, project.id, {
      title: "Owner Partner Direct Variation",
      reason: "Client requested executive atrium reconfiguration.",
      scheduleImpactDays: 5,
      feeImpactAmount: 50000,
    });

    clearInboxCache(ownerCtx.tenantId);
    const inbox = await getOwnerDecisionInbox(ownerCtx, { tab: "all-authorized" });
    const ownerItem = inbox.items.find((i) => i.rawId === ownerScopeReq.id);
    assert.ok(ownerItem, "Owner-submitted scope change must appear in all-authorized inbox");
    assert.equal(ownerItem.canApprove, false, "Owner who requested change CANNOT self-approve");
    assert.ok(
      ownerItem.cannotApproveReason?.includes("Four-eyes") || ownerItem.cannotApproveReason?.includes("Requester cannot approve"),
      "Must state four-eyes reason"
    );

    // Attempting self-approval must fail
    await assert.rejects(
      async () => {
        await executeInboxDecision(ownerCtx, {
          type: "SCOPE_CHANGE",
          id: ownerScopeReq.id,
          action: "APPROVE",
          feedback: "Self-approving my own request",
        });
      },
      /Requester cannot approve their own scope change request/i
    );

    // A different partner (Admin) CAN approve it!
    const adminDecision = await executeInboxDecision(adminCtx, {
      type: "SCOPE_CHANGE",
      id: ownerScopeReq.id,
      action: "APPROVE",
      feedback: "Approved by Operations Partner after review.",
    });
    assert.ok(adminDecision, "Admin must be able to approve the Owner's request");

    // Clean up
    await prisma.projectChangeRequest.delete({ where: { id: ownerScopeReq.id } }).catch(() => {});
  });

  test("4. Decision Execution: Approving deliverable submission updates status and checklist", async () => {
    const result = await executeInboxDecision(ownerCtx, {
      type: "DELIVERABLE_SUBMISSION",
      id: testSubmissionId,
      action: "APPROVE",
      feedback: "Excellent waterproofing details. Approved for site issuance.",
    });

    assert.ok(result);

    // Verify submission is now APPROVED in database
    const sub = await prisma.taskSubmission.findUnique({
      where: { id: testSubmissionId },
    });
    assert.equal(sub?.status, "APPROVED");

    // Verify checklist item is marked completed
    const updatedDeliverable = await prisma.task.findUnique({
      where: { id: testDeliverable.id },
      include: { checklistItems: true },
    });
    assert.equal(updatedDeliverable?.checklistItems[0].isCompleted, true);
  });

  test("5. Blocker Resolution: Unblocking a task clears blockerReason and restores IN_PROGRESS status", async () => {
    const unblockResult = await executeInboxDecision(ownerCtx, {
      type: "TASK_BLOCKER",
      id: blockedTaskId,
      action: "RESOLVE_BLOCKER",
      feedback: "Revised calculations received from MEP consultant; cleared for drafting.",
    });

    assert.ok(unblockResult);

    // Verify task is now IN_PROGRESS and blockerReason is null
    const task = await prisma.task.findUnique({
      where: { id: blockedTaskId },
    });
    assert.equal(task?.status, TaskWorkflowStatus.IN_PROGRESS);
    assert.equal(task?.blockerReason, null);
  });
});
