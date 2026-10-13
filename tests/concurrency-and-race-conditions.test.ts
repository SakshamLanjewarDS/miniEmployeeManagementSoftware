import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import {
  executeSiteCheckIn,
  executeSiteCheckOut,
} from "../src/server/modules/visits/service";
import {
  submitTasksForReview,
  reviewTaskSubmission,
  requestDeadlineExtension,
  decideDeadlineExtension,
} from "../src/server/modules/tasks/workflow";
import {
  createProjectWithLifecycle,
  holdProject,
  resumeProject,
} from "../src/server/modules/projects/lifecycle";
import { createTask } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import {
  TenantRole,
  ProjectStatus,
  SiteVisitOperationalState,
  TaskPriority,
} from "@prisma/client";

describe("Database-Backed Concurrency & Simultaneous-Request Safety Suite (F2)", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let reviewer2Ctx: TenantContext;
  let employeeCtx: TenantContext;
  let project: any;
  let siteA: any;
  let siteB: any;
  let visitA: any;
  let visitB: any;

  before(async () => {
    // 1. Identify or retrieve tenant
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    // 2. Fetch or create users
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    const adminMember = members.find(
      (m) => (m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN) && m.employee
    ) || members.find((m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN);
    assert.ok(adminMember, "Admin/Owner must exist");

    if (!adminMember.employee) {
      const createdEmp = await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          membershipId: adminMember.id,
          employeeId: `EMP-CC-${Date.now().toString().slice(-4)}`,
          designation: "Studio Principal",
          department: "Administration",
        },
      });
      adminMember.employee = createdEmp;
    }

    const employeeMembers = members.filter((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(employeeMembers.length >= 1, "At least 1 employee must exist");
    const emp1 = employeeMembers[0];

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      role: adminMember.role,
      employeeId: adminMember.employee?.employeeId || "EMP-ADM-001",
      hasFinanceAccess: true,
      timezone: tenant.timezone || "Asia/Kolkata",
      currency: tenant.currency || "INR",
    };

    employeeCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: emp1.userId,
      userEmail: emp1.user.email,
      userFullName: emp1.user.fullName,
      membershipId: emp1.id,
      role: emp1.role,
      employeeId: emp1.employee?.employeeId || "EMP-002",
      hasFinanceAccess: false,
      timezone: tenant.timezone || "Asia/Kolkata",
      currency: tenant.currency || "INR",
    };

    // Create a second admin/reviewer to test competing concurrent reviews
    const secondUser = await prisma.user.upsert({
      where: { email: "reviewer2.concurrency@100percentdesign.test" },
      update: {},
      create: {
        email: "reviewer2.concurrency@100percentdesign.test",
        passwordHash: "$2b$10$e84605170d5138c20d754eecda808aa866a4cc1b9dbdbe0ddccbf8e624c4ad73",
        fullName: "Co-Reviewer Lead",
      },
    });

    const secondMember = await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: secondUser.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: secondUser.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
      },
    });

    reviewer2Ctx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: secondUser.id,
      userEmail: secondUser.email,
      userFullName: secondUser.fullName,
      membershipId: secondMember.id,
      role: secondMember.role,
      employeeId: null,
      hasFinanceAccess: true,
      timezone: tenant.timezone || "Asia/Kolkata",
      currency: tenant.currency || "INR",
    };

    // 3. Create active test project
    const pCode = `PRJ-CC-${Date.now().toString().slice(-5)}`;
    project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        code: pCode,
        name: `Concurrency Test Project ${pCode}`,
        projectType: "RESIDENTIAL_VILLA",
        description: "Architectural brief and specifications for concurrency testing",
        status: ProjectStatus.ACTIVE,
        startDate: new Date(),
        targetDate: new Date("2027-01-01"),
      },
    });

    // 4. Create two sites
    siteA = await prisma.site.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        name: "North Tower Concurrency Site",
        address: "Sector 14, Plot A",
        latitude: 19.076,
        longitude: 72.8777,
      },
    });

    siteB = await prisma.site.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        name: "South Pavilion Concurrency Site",
        address: "Sector 14, Plot B",
        latitude: 19.08,
        longitude: 72.88,
      },
    });
  });

  after(async () => {
    // Cleanup created test project
    if (project?.id) {
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    }
  });

  test("1. An employee cannot acquire two active site visits simultaneously", async () => {
    // Create two scheduled visits for the same employee
    visitA = await prisma.siteVisit.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        siteId: siteA.id,
        employeeId: employeeCtx.membershipId,
        purpose: "Site A Routine Inspection",
        scheduledTime: new Date(),
        operationalState: SiteVisitOperationalState.SCHEDULED,
      },
    });

    visitB = await prisma.siteVisit.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        siteId: siteB.id,
        employeeId: employeeCtx.membershipId,
        purpose: "Site B Structural Inspection",
        scheduledTime: new Date(),
        operationalState: SiteVisitOperationalState.SCHEDULED,
      },
    });

    // Fire simultaneous check-ins for both visits
    const results = await Promise.allSettled([
      executeSiteCheckIn(employeeCtx, {
        visitId: visitA.id,
        latitude: 19.076,
        longitude: 72.8777,
        idempotencyKey: `idemp-a-${Date.now()}`,
      }),
      executeSiteCheckIn(employeeCtx, {
        visitId: visitB.id,
        latitude: 19.08,
        longitude: 72.88,
        idempotencyKey: `idemp-b-${Date.now()}`,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one must succeed, and one must be rejected with concurrency conflict
    assert.equal(fulfilled.length, 1, "Exactly one site check-in must succeed");
    assert.equal(rejected.length, 1, "The competing site check-in must be rejected");

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason?.message || "";
    assert.ok(
      rejectionReason.includes("Concurrency Conflict") || rejectionReason.includes("active site visit"),
      `Expected concurrency error message, got: ${rejectionReason}`
    );

    // Verify database state: employee has exactly ONE active visit
    const activeCount = await prisma.siteVisit.count({
      where: {
        tenantId: tenant.id,
        employeeId: employeeCtx.membershipId,
        operationalState: SiteVisitOperationalState.ACTIVE,
      },
    });
    assert.equal(activeCount, 1, "Employee must have exactly one active site visit in database");

    // Clean up active visit by setting state to CHECKED_OUT
    await prisma.siteVisit.updateMany({
      where: {
        tenantId: tenant.id,
        employeeId: employeeCtx.membershipId,
        operationalState: SiteVisitOperationalState.ACTIVE,
      },
      data: {
        operationalState: SiteVisitOperationalState.CHECKED_OUT,
        submittedReportTime: new Date(),
      },
    });
  });

  test("2. A submission cannot receive competing final decisions", async () => {
    // Setup task with checklist item
    const task = await createTask(adminCtx, {
      projectId: project.id,
      title: "Deliverable For Review Race Test",
      description: "Testing concurrent review decisions and four-eyes policy",
      priority: TaskPriority.HIGH,
      assigneeId: employeeCtx.membershipId,
      checklistItems: [
        {
          title: "Detailed Drawing Verification",
          assignedMemberId: employeeCtx.membershipId,
        },
      ],
    });

    const item = await prisma.taskChecklistItem.findFirst({
      where: { taskId: task.id },
    });
    assert.ok(item, "Checklist item must exist");

    // Employee submits work
    const submission = await submitTasksForReview(employeeCtx, {
      taskId: task.id,
      checklistItemIds: [item.id],
      summary: "First draft ready for review",
    });

    assert.equal(submission.status, "PENDING");

    // Two leadership reviewers review simultaneously: Reviewer 1 Approves, Reviewer 2 Requests Changes
    const reviewResults = await Promise.allSettled([
      reviewTaskSubmission(adminCtx, submission.id, {
        decision: "APPROVE",
        feedback: "First reviewer approvals",
      }),
      reviewTaskSubmission(reviewer2Ctx, submission.id, {
        decision: "REQUEST_CHANGES",
        feedback: "Second reviewer changes requested",
      }),
    ]);

    const reviewFulfilled = reviewResults.filter((r) => r.status === "fulfilled");
    const reviewRejected = reviewResults.filter((r) => r.status === "rejected");

    assert.equal(reviewFulfilled.length, 1, "Exactly one review decision must win");
    assert.equal(reviewRejected.length, 1, "Competing review decision must fail");

    const rejectionMsg = (reviewRejected[0] as PromiseRejectedResult).reason?.message || "";
    assert.ok(
      rejectionMsg.includes("Conflict") || rejectionMsg.includes("already"),
      `Expected conflict error message, got: ${rejectionMsg}`
    );

    // Verify submission record in DB has exactly one decision
    const finalSubmission = await prisma.taskSubmission.findUnique({
      where: { id: submission.id },
    });
    assert.ok(
      finalSubmission?.status === "APPROVED" || finalSubmission?.status === "CHANGES_REQUESTED",
      "Final submission status must be decisive"
    );
  });

  test("3. A stale extension cannot overwrite a changed deadline", async () => {
    const originalDue = new Date("2026-11-01T00:00:00.000Z");
    const task = await createTask(adminCtx, {
      projectId: project.id,
      title: "Deadline Extension Concurrency Task",
      description: "Testing stale deadline extension reconciliation",
      priority: TaskPriority.MEDIUM,
      assigneeId: employeeCtx.membershipId,
      checklistItems: [
        {
          title: "Structural Calculation Schedule",
          assignedMemberId: employeeCtx.membershipId,
          dueDate: originalDue,
        },
      ],
    });

    const item = await prisma.taskChecklistItem.findFirst({
      where: { taskId: task.id },
    });
    assert.ok(item, "Checklist item must exist");

    // Employee requests deadline extension to 2026-11-10
    const extRequest = await requestDeadlineExtension(
      employeeCtx,
      task.id,
      item.id,
      {
        proposedDueDate: new Date("2026-11-10T00:00:00.000Z"),
        reason: "Waiting for geotechnical soil report",
      }
    );

    // Simulate an independent deadline modification (e.g. project manager altered deadline to 2026-11-20)
    await prisma.taskChecklistItem.update({
      where: { id: item.id },
      data: { dueDate: new Date("2026-11-20T00:00:00.000Z") },
    });

    // Admin attempts to decide the pending extension request (which had baseline 2026-11-01)
    await assert.rejects(
      async () => {
        await decideDeadlineExtension(adminCtx, extRequest.id, {
          decision: "APPROVE",
          decisionReason: "Approved extension",
        });
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Reconciliation required") || err.message.includes("stale extension"),
          `Expected stale extension error, got: ${err.message}`
        );
        return true;
      }
    );

    // Verify the checklist item retained its latest modified due date (2026-11-20), NOT the stale proposed date
    const verifiedItem = await prisma.taskChecklistItem.findUnique({
      where: { id: item.id },
    });
    assert.equal(
      verifiedItem?.dueDate?.toISOString(),
      new Date("2026-11-20T00:00:00.000Z").toISOString(),
      "Checklist item deadline must not be overwritten by stale extension"
    );
  });

  test("4. Retrying resume cannot shift dates more than once", async () => {
    // 1. Put project ON_HOLD
    await holdProject(adminCtx, project.id, {
      reason: "Client financing delay hold",
    });

    const heldProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert.equal(heldProject?.status, ProjectStatus.ON_HOLD);
    const targetBeforeResume = heldProject?.targetDate
      ? new Date(heldProject.targetDate).getTime()
      : 0;

    // 2. Fire simultaneous resume requests with scheduleAdjustmentDays = 14
    const resumeResults = await Promise.allSettled([
      resumeProject(adminCtx, project.id, {
        resumeReason: "Client financing approved - resume work (attempt 1)",
        scheduleAdjustmentDays: 14,
      }),
      resumeProject(adminCtx, project.id, {
        resumeReason: "Client financing approved - resume work (attempt 2 retry)",
        scheduleAdjustmentDays: 14,
      }),
    ]);

    const resumeFulfilled = resumeResults.filter((r) => r.status === "fulfilled");
    const resumeRejected = resumeResults.filter((r) => r.status === "rejected");

    assert.equal(resumeFulfilled.length, 1, "Exactly one resume request must succeed");
    assert.equal(resumeRejected.length, 1, "Retried / competing resume must fail");

    const rejectionErr = (resumeRejected[0] as PromiseRejectedResult).reason?.message || "";
    assert.ok(
      rejectionErr.includes("not currently on hold") || rejectionErr.includes("already been resumed"),
      `Expected error about project not on hold, got: ${rejectionErr}`
    );

    // 3. Verify target date shifted by EXACTLY 14 days, NOT 28 days!
    const resumedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert.equal(resumedProject?.status, ProjectStatus.ACTIVE);
    const targetAfterResume = resumedProject?.targetDate
      ? new Date(resumedProject.targetDate).getTime()
      : 0;

    const diffDays = Math.round((targetAfterResume - targetBeforeResume) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 14, `Target date must shift by exactly 14 days (shifted: ${diffDays})`);
  });
});
