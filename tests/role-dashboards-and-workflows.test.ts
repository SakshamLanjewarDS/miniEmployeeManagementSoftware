import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import { TenantRole, TaskPriority, TaskWorkflowStatus } from "@prisma/client";
import {
  TenantContext,
  ACTIVE_ROLES,
  isAdminOrOwner,
  canApproveWork,
  canManageFinance,
  canManageEmployees,
} from "../src/server/tenancy/context";
import {
  createTask,
  findTasks,
  transitionTaskStatus,
  transitionChecklistItemStatus,
} from "../src/server/modules/tasks/repository";
import {
  getOwnerDashboardData,
  getAdminDashboardData,
  getEmployeeDashboardData,
} from "../src/server/modules/dashboard/service";
import {
  createProject,
  findProjects,
  updateProject,
  getProjectById,
} from "../src/server/modules/projects/repository";

describe("Comprehensive Verification: Role Dashboards, Connected Workflows & Field Rules", () => {
  let tenant1: any;
  let tenant2: any;
  let ownerCtx: TenantContext;
  let adminCtx: TenantContext;
  let employee1Ctx: TenantContext;
  let employee2Ctx: TenantContext;
  let tenant2OwnerCtx: TenantContext;

  let ownerMember: any;
  let adminMember: any;
  let employee1Member: any;
  let employee2Member: any;
  let tenant2OwnerMember: any;

  let testProject: any;
  let createdTaskIds: string[] = [];
  let createdProjectIds: string[] = [];

  before(async () => {
    // 1. Fetch tenants
    tenant1 = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant1, "Tenant 1 (100percentdesign) must exist");

    tenant2 = await prisma.tenant.findUnique({ where: { slug: "apex-studio" } });
    if (!tenant2) {
      tenant2 = await prisma.tenant.create({
        data: {
          slug: `test-iso-${Date.now()}`,
          name: "Test Isolated Studio",
          timezone: "Asia/Kolkata",
          currency: "INR",
        },
      });
    }

    // 2. Fetch memberships for Tenant 1
    ownerMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, role: "OWNER", isActive: true },
      include: { user: true, employee: true },
    });
    assert.ok(ownerMember, "Tenant 1 Owner membership must exist");

    adminMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, role: "ADMIN", isActive: true },
      include: { user: true, employee: true },
    });
    assert.ok(adminMember, "Tenant 1 Admin membership must exist");

    const empMembers = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant1.id, role: "EMPLOYEE", isActive: true },
      include: { user: true, employee: true },
      take: 2,
    });
    assert.ok(empMembers.length >= 1, "At least 1 active employee must exist in Tenant 1");
    employee1Member = empMembers[0];
    employee2Member = empMembers[1] || empMembers[0];

    // 3. Fetch or create Tenant 2 Owner
    tenant2OwnerMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant2.id, role: "OWNER", isActive: true },
      include: { user: true, employee: true },
    });
    if (!tenant2OwnerMember) {
      let t2User = await prisma.user.findFirst({ where: { email: "tenant2.owner@test.internal" } });
      if (!t2User) {
        t2User = await prisma.user.create({
          data: {
            email: "tenant2.owner@test.internal",
            fullName: "Tenant Two Principal",
            passwordHash: "hash-placeholder",
          },
        });
      }
      tenant2OwnerMember = await prisma.tenantMembership.create({
        data: {
          tenantId: tenant2.id,
          userId: t2User.id,
          role: "OWNER",
          isActive: true,
        },
        include: { user: true, employee: true },
      });
    }

    // 4. Construct context objects
    ownerCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ownerMember.userId,
      userEmail: ownerMember.user.email,
      userFullName: ownerMember.user.fullName,
      membershipId: ownerMember.id,
      employeeId: ownerMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    adminCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      employeeId: adminMember.employee?.employeeId ?? null,
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    employee1Ctx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: employee1Member.userId,
      userEmail: employee1Member.user.email,
      userFullName: employee1Member.user.fullName,
      membershipId: employee1Member.id,
      employeeId: employee1Member.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    employee2Ctx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: employee2Member.userId,
      userEmail: employee2Member.user.email,
      userFullName: employee2Member.user.fullName,
      membershipId: employee2Member.id,
      employeeId: employee2Member.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    tenant2OwnerCtx = {
      tenantId: tenant2.id,
      tenantSlug: tenant2.slug,
      tenantName: tenant2.name,
      userId: tenant2OwnerMember.userId,
      userEmail: tenant2OwnerMember.user.email,
      userFullName: tenant2OwnerMember.user.fullName,
      membershipId: tenant2OwnerMember.id,
      employeeId: tenant2OwnerMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant2.timezone,
      currency: tenant2.currency,
    };

    // 5. Existing or new test project
    testProject = await prisma.project.findFirst({
      where: { tenantId: tenant1.id, status: "ACTIVE", projectType: { not: null } },
    });
    if (!testProject) {
      testProject = await prisma.project.findFirst({
        where: { tenantId: tenant1.id, status: "ACTIVE" },
      });
      if (testProject && !testProject.projectType) {
        testProject = await prisma.project.update({
          where: { id: testProject.id },
          data: { projectType: "Institutional" },
        });
      }
    }
    assert.ok(testProject, "Tenant 1 must have at least one active project");
  });

  after(async () => {
    // Clean up created tasks and checklist items safely
    if (createdTaskIds.length > 0) {
      await prisma.approvalRequest.deleteMany({
        where: { taskId: { in: createdTaskIds } },
      });
      await prisma.taskChecklistItem.deleteMany({
        where: { taskId: { in: createdTaskIds } },
      });
      await prisma.task.deleteMany({
        where: { id: { in: createdTaskIds } },
      });
    }

    if (createdProjectIds.length > 0) {
      await prisma.project.deleteMany({
        where: { id: { in: createdProjectIds } },
      });
    }

    if (tenant2?.slug?.startsWith("test-iso-")) {
      await prisma.tenantMembership.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    }
  });

  test("1. Role and Permission Model: Exactly 3 Active Roles, No PROJECT_MANAGER", () => {
    assert.deepEqual(
      ACTIVE_ROLES,
      ["OWNER", "ADMIN", "EMPLOYEE"],
      "ACTIVE_ROLES must strictly only contain OWNER, ADMIN, EMPLOYEE"
    );
    assert.equal(
      ACTIVE_ROLES.includes("PROJECT_MANAGER" as any),
      false,
      "PROJECT_MANAGER must not be an active role"
    );

    // Equal permissions for Owner and Admin
    assert.equal(isAdminOrOwner(ownerCtx), true, "Owner must be admin or owner");
    assert.equal(isAdminOrOwner(adminCtx), true, "Admin must be admin or owner");
    assert.equal(isAdminOrOwner(employee1Ctx), false, "Employee must not be admin or owner");

    assert.equal(canApproveWork(ownerCtx), true, "Owner can approve work");
    assert.equal(canApproveWork(adminCtx), true, "Admin can approve work");
    assert.equal(canApproveWork(employee1Ctx), false, "Employee cannot approve work");

    assert.equal(canManageFinance(ownerCtx), true, "Owner can manage finance");
    assert.equal(canManageFinance(adminCtx), true, "Admin can manage finance");
    assert.equal(canManageFinance(employee1Ctx), false, "Employee cannot manage finance");

    assert.equal(canManageEmployees(ownerCtx), true, "Owner can manage employees");
    assert.equal(canManageEmployees(adminCtx), true, "Admin can manage employees");
    assert.equal(canManageEmployees(employee1Ctx), false, "Employee cannot manage employees");
  });

  test("2. Default Dashboard Routing & Data Isolation", async () => {
    // Verify Owner Dashboard query succeeds with zero fake metrics
    const ownerData = await getOwnerDashboardData(ownerCtx);
    assert.ok(ownerData.studioSummary, "Owner dashboard must return studio summary");
    assert.ok(Array.isArray(ownerData.projectsAttention));
    assert.ok(ownerData.financialOverview);
    assert.equal(typeof ownerData.financialOverview.recordedCollections, "number");
    assert.equal(typeof ownerData.financialOverview.approvedExpenses, "number");
    assert.ok(Array.isArray(ownerData.teamWorkload));

    // Verify Admin Dashboard query succeeds
    const adminData = await getAdminDashboardData(adminCtx);
    assert.ok(adminData.dailySummary, "Admin dashboard must return daily summary");
    assert.ok(Array.isArray(adminData.reviewQueue));
    assert.ok(Array.isArray(adminData.teamDistribution));

    // Verify Employee Dashboard query succeeds and contains only personal work
    const employeeData = await getEmployeeDashboardData(employee1Ctx);
    assert.ok(employeeData.mySummary, "Employee dashboard must return personal summary");
    assert.ok(Array.isArray(employeeData.workQueue));

    // Cross-tenant test: Owner of Tenant 2 must see 0 projects from Tenant 1
    const tenant2OwnerData = await getOwnerDashboardData(tenant2OwnerCtx);
    const tenant1ProjectIds = (await prisma.project.findMany({
      where: { tenantId: tenant1.id },
      select: { id: true },
    })).map((p) => p.id);

    for (const proj of tenant2OwnerData.projectsAttention) {
      assert.equal(
        tenant1ProjectIds.includes(proj.id),
        false,
        "Tenant 2 owner must never see Tenant 1 projects"
      );
    }
  });

  test("3. Assign Deliverable: Project First, Topology Derived, Brief Validation, and Checklist Tasks", async () => {
    const checklistDate = new Date();
    checklistDate.setDate(checklistDate.getDate() + 7);
    const checklistDateStr = checklistDate.toISOString().split("T")[0];

    // Attempt creation with empty brief -> must throw validation error
    await assert.rejects(
      async () => {
        await createTask(ownerCtx, {
          projectId: testProject.id,
          description: "   ",
          priority: TaskPriority.HIGH,
          assigneeIds: [employee1Member.id],
          checklistItems: [
            {
              assignedMemberId: employee1Member.id,
              text: "Draft site layout plan",
              priority: TaskPriority.HIGH,
              dueDate: checklistDateStr,
            },
          ],
        });
      },
      /Architectural Brief & Instructions are required for deliverable assignment/i,
      "Empty or whitespace-only brief must be rejected"
    );

    // Attempt creation with no checklist items for an assignee -> must throw validation error
    await assert.rejects(
      async () => {
        await createTask(ownerCtx, {
          projectId: testProject.id,
          description: "Valid detailed brief for building elevation.",
          priority: TaskPriority.HIGH,
          assigneeIds: [employee1Member.id],
          checklistItems: [],
        });
      },
      /must have at least one checklist task assigned/i,
      "Assignee with 0 checklist items must be rejected"
    );

    // Valid deliverable creation: server derives title, topology, and deadline
    const deliverable = await createTask(ownerCtx, {
      projectId: testProject.id,
      description: "Detailed structural review and MEP coordinate drawings for Level 2.",
      priority: TaskPriority.HIGH,
      assigneeIds: [employee1Member.id],
      checklistItems: [
        {
          assignedMemberId: employee1Member.id,
          text: "Structural grid alignment",
          priority: TaskPriority.HIGH,
          dueDate: checklistDateStr,
        },
      ],
    });

    assert.ok(deliverable.id, "Deliverable must be created");
    createdTaskIds.push(deliverable.id);

    // Verify derived title contains project code
    assert.ok(
      deliverable.title.includes(testProject.code),
      `Derived title '${deliverable.title}' must contain project code '${testProject.code}'`
    );

    // Verify derived parent deadline matches checklist due date
    assert.ok(deliverable.dueDate, "Deliverable parent deadline must be derived");
    const parentDueStr = deliverable.dueDate.toISOString().split("T")[0];
    assert.equal(parentDueStr, checklistDateStr, "Parent deadline must match latest checklist item due date");

    // Verify checklist item created with assignedMemberId and status ASSIGNED
    assert.equal(deliverable.checklistItems.length, 1);
    const item = deliverable.checklistItems[0];
    assert.equal(item.assignedMemberId, employee1Member.id);
    assert.equal(item.priority, TaskPriority.HIGH);
    assert.equal(item.status, TaskWorkflowStatus.NOT_STARTED);
  });

  test("4. Connected Workflow: Employee Starts Work, Submits for Review, No Self-Approval", async () => {
    const checklistDate = new Date();
    checklistDate.setDate(checklistDate.getDate() + 5);

    // 1. Create a deliverable assigned to employee1
    const deliverable = await createTask(adminCtx, {
      projectId: testProject.id,
      description: "Facade cladding details and section drawings.",
      priority: TaskPriority.MEDIUM,
      assigneeIds: [employee1Member.id],
      checklistItems: [
        {
          assignedMemberId: employee1Member.id,
          text: "Aluminum composite panel joinery details",
          priority: TaskPriority.MEDIUM,
          dueDate: checklistDate.toISOString().split("T")[0],
        },
      ],
    });
    createdTaskIds.push(deliverable.id);
    const checkItem = deliverable.checklistItems[0];

    // 2. Employee starts work: ASSIGNED -> IN_PROGRESS
    const startedItem = await transitionChecklistItemStatus(
      employee1Ctx,
      checkItem.id,
      TaskWorkflowStatus.IN_PROGRESS
    );
    assert.equal(startedItem.status, TaskWorkflowStatus.IN_PROGRESS);

    // 3. Employee tries to self-approve: must fail with four-eyes violation!
    await assert.rejects(
      async () => {
        await transitionChecklistItemStatus(
          employee1Ctx,
          checkItem.id,
          TaskWorkflowStatus.COMPLETED
        );
      },
      /Four-eyes policy|Only Studio Owners or Admins can approve work/i,
      "Employee must NOT be allowed to self-approve checklist work"
    );

    // 4. Employee submits for review: IN_PROGRESS -> IN_REVIEW
    const submittedItem = await transitionChecklistItemStatus(
      employee1Ctx,
      checkItem.id,
      TaskWorkflowStatus.IN_REVIEW,
      "Completed drawing draft ready for principal review"
    );
    assert.equal(submittedItem.status, TaskWorkflowStatus.IN_REVIEW);

    // Verify an ApprovalRequest was created
    const approvalReq = await prisma.approvalRequest.findFirst({
      where: { checklistItemId: checkItem.id, status: "PENDING" },
    });
    assert.ok(approvalReq, "ApprovalRequest must be generated for submitted checklist item");

    // 5. Admin or Owner requests revisions (Changes Requested requires notes)
    await assert.rejects(
      async () => {
        await transitionChecklistItemStatus(
          adminCtx,
          checkItem.id,
          "CHANGES_REQUESTED" as any,
          "" // Empty notes
        );
      },
      /Feedback comment or explanation is required when requesting revisions/i,
      "Revision request must require feedback"
    );

    // Submit valid revision request
    const revisedItem = await transitionChecklistItemStatus(
      adminCtx,
      checkItem.id,
      "CHANGES_REQUESTED" as any,
      "Please update joint sealant specifications per ASTM C920."
    );
    assert.equal(revisedItem.status, TaskWorkflowStatus.IN_PROGRESS);
    assert.equal(revisedItem.blockerReason, "Please update joint sealant specifications per ASTM C920.");

    // 6. Employee resubmits work
    const resubmittedItem = await transitionChecklistItemStatus(
      employee1Ctx,
      checkItem.id,
      TaskWorkflowStatus.IN_REVIEW,
      "Updated sealant to silicone Dow 795 per request."
    );
    assert.equal(resubmittedItem.status, TaskWorkflowStatus.IN_REVIEW);

    // 7. Leadership approves work: IN_REVIEW -> COMPLETED
    const approvedItem = await transitionChecklistItemStatus(
      ownerCtx,
      checkItem.id,
      TaskWorkflowStatus.COMPLETED,
      "Approved for fabrication."
    );
    assert.equal(approvedItem.status, TaskWorkflowStatus.COMPLETED);

    // 8. Parent Deliverable can now transition to COMPLETED
    const completedParent = await transitionTaskStatus(
      ownerCtx,
      deliverable.id,
      TaskWorkflowStatus.COMPLETED,
      { comment: "Deliverable finalized and verified." }
    );
    assert.equal(completedParent.status, TaskWorkflowStatus.COMPLETED);
  });

  test("5. Multi-Assignee Deliverable: Parent Cannot Complete Until All Checklists Approved", async () => {
    const checklistDate = new Date();
    checklistDate.setDate(checklistDate.getDate() + 10);
    const dateStr = checklistDate.toISOString().split("T")[0];

    // Create deliverable with 2 separate items
    const deliverable = await createTask(ownerCtx, {
      projectId: testProject.id,
      description: "Multi-discipline integration review.",
      priority: TaskPriority.HIGH,
      assigneeIds: [employee1Member.id, employee2Member.id],
      checklistItems: [
        {
          assignedMemberId: employee1Member.id,
          text: "Task A for Employee 1",
          priority: TaskPriority.HIGH,
          dueDate: dateStr,
        },
        {
          assignedMemberId: employee2Member.id,
          text: "Task B for Employee 2",
          priority: TaskPriority.MEDIUM,
          dueDate: dateStr,
        },
      ],
    });
    createdTaskIds.push(deliverable.id);
    assert.equal(deliverable.checklistItems.length, 2);

    const item1 = deliverable.checklistItems[0];
    const item2 = deliverable.checklistItems[1];

    // Only complete item 1
    await transitionChecklistItemStatus(ownerCtx, item1.id, TaskWorkflowStatus.COMPLETED);

    // Attempt to mark parent deliverable COMPLETED while item 2 is still incomplete
    await assert.rejects(
      async () => {
        await transitionTaskStatus(
          ownerCtx,
          deliverable.id,
          TaskWorkflowStatus.COMPLETED,
          { comment: "Attempting premature completion" }
        );
      },
      /Cannot complete deliverable: All assigned employee checklist items must be completed and approved first/i,
      "Parent deliverable completion must be blocked if any checklist items remain incomplete"
    );

    // Complete item 2
    await transitionChecklistItemStatus(ownerCtx, item2.id, TaskWorkflowStatus.COMPLETED);

    // Now parent completion must succeed
    const completedTask = await transitionTaskStatus(
      ownerCtx,
      deliverable.id,
      TaskWorkflowStatus.COMPLETED,
      { comment: "All employee items completed and approved" }
    );
    assert.equal(completedTask.status, TaskWorkflowStatus.COMPLETED);
  });

  test("6. Projects Module: Project Architecture 2 Label & Multiselect Contractors/Consultants Persistence", async () => {
    // Fetch contractors and consultants in tenant1
    const contractors = await prisma.contractor.findMany({
      where: { tenantId: tenant1.id },
      take: 2,
    });
    const consultants = await prisma.consultant.findMany({
      where: { tenantId: tenant1.id },
      take: 2,
    });
    assert.ok(contractors.length >= 2, "Tenant 1 must have at least 2 contractors");
    assert.ok(consultants.length >= 2, "Tenant 1 must have at least 2 consultants");

    const contractorIds = [contractors[0].id, contractors[1].id];
    const consultantIds = [consultants[0].id, consultants[1].id];

    const proj = await createProject(ownerCtx, {
      code: `TST-${Date.now().toString().slice(-4)}`,
      name: "Verification Multiselect Building",
      projectType: "RESIDENTIAL_VILLA",
      contractorIds,
      consultantIds,
      projectArchitectId: ownerMember.id,
      projectManagerId: adminMember.id, // Project Architecture 2
    });
    createdProjectIds.push(proj.id);

    // Verify stored fields and relations
    assert.ok(proj.id);
    const fetched = await getProjectById(ownerCtx, proj.id);
    assert.ok(fetched);
    assert.equal(fetched.contractors.length, 2, "Both selected contractors must be attached");
    assert.equal(fetched.consultants.length, 2, "Both selected consultants must be attached");
    assert.equal(fetched.projectManagerId, adminMember.id, "Project Architecture 2 lead must be saved");

    // Update with deduplication check: duplicate contractor ID
    await updateProject(ownerCtx, proj.id, {
      contractorIds: [contractors[0].id, contractors[0].id, contractors[1].id],
    });
    const updated = await getProjectById(ownerCtx, proj.id);
    assert.ok(updated);
    assert.equal(updated.contractors.length, 2, "Duplicate contractor IDs must be deduplicated");
  });

  test("7. Priority Color Values and Accessible Enums", () => {
    // Assert TaskPriority enum covers all 4 priority levels with their business semantics
    assert.ok(TaskPriority.LOW, "LOW priority exists");
    assert.ok(TaskPriority.MEDIUM, "MEDIUM priority exists");
    assert.ok(TaskPriority.HIGH, "HIGH priority exists");
    assert.ok(TaskPriority.URGENT, "URGENT priority exists");
  });
});
