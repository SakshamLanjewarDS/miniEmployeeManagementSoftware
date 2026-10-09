import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  createProjectWithLifecycle,
  activateProject,
  holdProject,
  resumeProject,
  completeProject,
  archiveProject,
  removeProjectMemberSafeguard,
  evaluateProjectCompletionChecklist,
} from "../src/server/modules/projects/lifecycle";
import {
  getProfileOverview,
  updateSelfProfile,
  submitOfficialRecordChangeRequest,
  decideProfileRecordChangeRequest,
} from "../src/server/modules/profile/service";
import { createTask } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, ProjectStatus, TaskPriority, ProjectMilestoneStatus, ChangeRequestStatus } from "@prisma/client";

describe("Project Lifecycle & Profile Governance Test Suite (Steps 1 - 6)", () => {
  let tenant: any;
  let adminCtx: TenantContext;
  let employee1Ctx: TenantContext;
  let employee2Ctx: TenantContext;
  let draftProjectId: string;
  let activeProjectId: string;
  let createdTaskId: string;

  before(async () => {
    // 1. Fetch test tenant
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    // 2. Fetch admin and employees
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
  });

  after(async () => {
    // Cleanup created test projects and tasks
    if (createdTaskId) {
      await prisma.taskChecklistItem.deleteMany({ where: { taskId: createdTaskId } });
      await prisma.taskAssignment.deleteMany({ where: { taskId: createdTaskId } });
      await prisma.task.deleteMany({ where: { id: createdTaskId } });
    }
    if (draftProjectId) {
      await prisma.projectMember.deleteMany({ where: { projectId: draftProjectId } });
      await prisma.projectMilestone.deleteMany({ where: { projectId: draftProjectId } });
      await prisma.projectChangeRequest.deleteMany({ where: { projectId: draftProjectId } });
      await prisma.project.deleteMany({ where: { id: draftProjectId } });
    }
    if (activeProjectId) {
      await prisma.projectMember.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.projectMilestone.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.projectChangeRequest.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.project.deleteMany({ where: { id: activeProjectId } });
    }
  });

  test("1. Step 1: Incomplete project can be saved as DRAFT without full activation fields", async () => {
    const draftCode = `DFT-${Date.now().toString().slice(-4)}`;
    const project = await createProjectWithLifecycle(adminCtx, {
      code: draftCode,
      name: "Draft Architectural Scheme",
      status: ProjectStatus.DRAFT,
      projectType: "RESIDENTIAL",
    });

    assert.ok(project);
    assert.equal(project.status, ProjectStatus.DRAFT);
    assert.equal(project.code, draftCode);
    draftProjectId = project.id;
  });

  test("2. Step 1: Strict activation rejects incomplete fields on commission", async () => {
    // Attempting to activate draft without mandatory client or planned dates must fail
    await assert.rejects(
      async () => {
        await activateProject(adminCtx, draftProjectId);
      },
      (err: any) => {
        assert.ok(
          err.message.includes("Primary Client assignment is required") ||
          err.message.includes("Architectural Brief") ||
          err.message.includes("activation")
        );
        return true;
      }
    );
  });

  test("3. Step 1 & Step 0: Operational task assignment is BLOCKED on DRAFT project", async () => {
    await assert.rejects(
      async () => {
        await createTask(adminCtx, {
          title: "Draft Phase Deliverable",
          description: "Deliverable instruction brief",
          projectId: draftProjectId,
          priority: TaskPriority.HIGH,
          assigneeIds: [employee1Ctx.membershipId],
          reviewerId: adminCtx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 3),
        });
      },
      (err: any) => {
        assert.match(err.message, /Draft project/i);
        return true;
      }
    );
  });

  test("4. Step 1: Fully qualified project commissions and activates atomically", async () => {
    const client = await prisma.client.findFirst({ where: { tenantId: adminCtx.tenantId } });
    assert.ok(client, "A client must exist");

    const activeCode = `ACT-${Date.now().toString().slice(-4)}`;
    const project = await createProjectWithLifecycle(adminCtx, {
      code: activeCode,
      name: "Commissioned Civic Center",
      description: "Full architectural scheme with complete brief and schedule",
      brief: "Comprehensive architectural scheme and urban planning for modern public facility",
      projectType: "COMMERCIAL",
      primaryClientId: client.id,
      projectArchitectId: employee1Ctx.membershipId,
      projectManagerId: adminCtx.membershipId,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 86400000 * 60),
      status: ProjectStatus.ACTIVE,
    });

    assert.ok(project);
    assert.equal(project.status, ProjectStatus.ACTIVE);
    activeProjectId = project.id;

    // Verify membership created with leadership roles
    const members = await prisma.projectMember.findMany({ where: { projectId: activeProjectId } });
    assert.ok(members.some((m) => m.membershipId === employee1Ctx.membershipId));
  });

  test("5. Step 2: Member removal safeguard prevents removing member with active assignments", async () => {
    // Assign a task to employee1 on the active project
    const task = await createTask(adminCtx, {
      title: "Schematic Elevations Package",
      description: "Full schematic elevation drawings for municipal and design review",
      projectId: activeProjectId,
      priority: TaskPriority.HIGH,
      assigneeIds: [employee1Ctx.membershipId],
      reviewerId: adminCtx.membershipId,
      dueDate: new Date(Date.now() + 86400000 * 5),
      checklistItems: [
        {
          title: "East facade elevations",
          assignedMemberId: employee1Ctx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 4),
        },
      ],
    });
    createdTaskId = task.id;

    // Attempt to remove employee1 without reassignment
    await assert.rejects(
      async () => {
        await removeProjectMemberSafeguard(adminCtx, activeProjectId, employee1Ctx.membershipId);
      },
      (err: any) => {
        assert.ok(err.message.includes("Cannot remove member"));
        return true;
      }
    );
  });

  test("6. Step 2: Member removal succeeds with explicit reassignment to another team member", async () => {
    // Add employee2 to the project first
    await prisma.projectMember.create({
      data: {
        tenantId: adminCtx.tenantId,
        projectId: activeProjectId,
        membershipId: employee2Ctx.membershipId,
        projectRole: "ASSOCIATE",
      },
    });

    // Remove employee1 with reassignment of open items to employee2
    const result = await removeProjectMemberSafeguard(
      adminCtx,
      activeProjectId,
      employee1Ctx.membershipId,
      employee2Ctx.membershipId
    );

    assert.equal(result.openTasksReassigned, 1);

    // Verify task is now assigned to employee2
    const updatedTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
    assert.equal(updatedTask?.assigneeId, employee2Ctx.membershipId);
  });

  test("7. Step 3: Delivery milestones created separately from financial fee milestones", async () => {
    const milestone = await prisma.projectMilestone.create({
      data: {
        tenantId: adminCtx.tenantId,
        projectId: activeProjectId,
        title: "Schematic Design Client Sign-off",
        targetDate: new Date(Date.now() + 86400000 * 15),
        status: ProjectMilestoneStatus.PENDING,
      },
    });

    assert.ok(milestone);
    assert.equal(milestone.status, ProjectMilestoneStatus.PENDING);
  });

  test("8. Step 4: Scope Change Request workflow with impact assessment", async () => {
    const change = await prisma.projectChangeRequest.create({
      data: {
        tenantId: adminCtx.tenantId,
        projectId: activeProjectId,
        requesterId: employee2Ctx.membershipId,
        title: "Add Rooftop Solar Pergola",
        reason: "Client sustainability target revision",
        affectedScope: "Schematic Design, MEP",
        scheduleImpactDays: 14,
        feeImpactAmount: 45000,
        status: ChangeRequestStatus.PENDING,
      },
    });

    assert.ok(change);
    assert.equal(change.status, ChangeRequestStatus.PENDING);
    assert.equal(change.scheduleImpactDays, 14);

    // Approve the change request
    const approved = await prisma.projectChangeRequest.update({
      where: { id: change.id },
      data: {
        status: ChangeRequestStatus.APPROVED,
        decidedById: adminCtx.membershipId,
        decisionNotes: "Approved per client addendum #2",
        decidedAt: new Date(),
      },
    });

    assert.equal(approved.status, ChangeRequestStatus.APPROVED);
    assert.equal(approved.decidedById, adminCtx.membershipId);
  });

  test("9. Step 4: Project HOLD & RESUME lifecycle with reason enforcement", async () => {
    // Hold project
    const holdResult = await holdProject(adminCtx, activeProjectId, {
      reason: "Awaiting local municipal authority height clearance",
    });
    assert.equal(holdResult.project.status, ProjectStatus.ON_HOLD);

    // Operational task creation on ON_HOLD project must be rejected
    await assert.rejects(
      async () => {
        await createTask(adminCtx, {
          title: "Blocked Task During Hold",
          description: "Work brief during hold period",
          projectId: activeProjectId,
          priority: TaskPriority.MEDIUM,
          assigneeIds: [employee2Ctx.membershipId],
          reviewerId: adminCtx.membershipId,
          dueDate: new Date(Date.now() + 86400000 * 5),
        });
      },
      (err: any) => {
        assert.match(err.message, /On Hold/i);
        return true;
      }
    );

    // Resume project
    const resumeResult = await resumeProject(adminCtx, activeProjectId, {
      resumeReason: "Municipal height clearance received",
      scheduleAdjustmentDays: 7,
    });
    assert.equal(resumeResult.project.status, ProjectStatus.ACTIVE);
  });

  test("10. Step 5: Closure evaluation checklist detects open deliverables and milestones", async () => {
    const checklist = await evaluateProjectCompletionChecklist(adminCtx, activeProjectId);

    assert.equal(checklist.canCompleteWithoutExceptions, false);
    assert.ok(checklist.openTasksCount > 0, "Should detect open deliverable");
    assert.ok(checklist.pendingMilestonesCount > 0, "Should detect pending delivery milestone");

    // Attempting completion without documented exception must fail
    await assert.rejects(
      async () => {
        await completeProject(adminCtx, activeProjectId);
      },
      (err: any) => {
        assert.ok(err.message.includes("Cannot close project"));
        return true;
      }
    );
  });

  test("11. Step 5: Project can complete with explicit management exception", async () => {
    const completed = await completeProject(adminCtx, activeProjectId, {
      permittedExceptions: ["Client accepted early handover; remaining landscape detail moved to phase 2"],
    });

    assert.equal(completed.project.status, ProjectStatus.COMPLETED);

    // Archive project
    const archived = await archiveProject(adminCtx, activeProjectId);
    assert.equal(archived.isArchived, true);
  });

  test("12. Step 6: Profile separation — 3 distinct tiers with permission isolation", async () => {
    // Admin viewing profile
    const adminView = await getProfileOverview(adminCtx, employee2Ctx.membershipId);
    assert.ok(adminView.myProfile);
    assert.ok(adminView.directoryProfile);
    assert.ok(adminView.managementRecord, "Admin must receive Management Record tier");

    // Employee viewing colleague's profile
    const employeeView = await getProfileOverview(employee1Ctx, employee2Ctx.membershipId);
    assert.ok(employeeView.directoryProfile);
    assert.equal(employeeView.managementRecord, null, "Employee must NOT receive Management Record tier");
    assert.equal(employeeView.canManage, false);
  });

  test("13. Step 6: Employee self-update updates allowlisted fields only", async () => {
    const updated = await updateSelfProfile(employee1Ctx, {
      fullName: "Architect One Updated",
      phone: "+91 98765 43210",
    });

    assert.equal(updated.success, true);

    // Verify User table was updated
    const user = await prisma.user.findUnique({ where: { id: employee1Ctx.userId } });
    assert.equal(user?.fullName, "Architect One Updated");

    // Restore name
    await updateSelfProfile(employee1Ctx, {
      fullName: employee1Ctx.userFullName,
    });
  });

  test("14. Step 6: Official record change request requires Admin/Owner approval", async () => {
    // Employee requests designation change
    const request = await submitOfficialRecordChangeRequest(employee1Ctx, {
      fieldKey: "designation",
      newValue: "Senior Project Architect",
      reason: "Completed 3 consecutive high-rise schemes",
    });

    assert.ok(request);
    assert.equal(request.status, "PENDING");
    assert.equal(request.fieldKey, "designation");
    assert.equal(request.newValue, "Senior Project Architect");

    // Admin approves the request
    const approved = await decideProfileRecordChangeRequest(
      adminCtx,
      request.id,
      {
        decision: "APPROVE",
        decisionNote: "Promotion approved by studio partners",
      }
    );

    assert.equal(approved.status, "APPROVED");

    // Verify employee designation was updated
    const emp = await prisma.employee.findUnique({
      where: { membershipId: employee1Ctx.membershipId },
    });
    assert.equal(emp?.designation, "Senior Project Architect");
  });
});
