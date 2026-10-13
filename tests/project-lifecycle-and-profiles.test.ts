import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  createProjectWithLifecycle,
  activateProject,
  holdProject,
  resumeProject,
  completeProject,
  reopenProject,
  cancelProject,
  archiveProject,
  unarchiveProject,
  getProjectHandoverPackage,
  recordProjectHandoverIssue,
  recordProjectHandoverAcknowledgement,
  decideProjectScopeChange,
  withdrawProjectScopeChange,
  applyProjectScopeChange,
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
import { executeSiteCheckIn, executeSiteCheckOut } from "../src/server/modules/visits/service";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, ProjectStatus, TaskPriority, ProjectMilestoneStatus, ChangeRequestStatus, SiteVisitOperationalState } from "@prisma/client";

import { assertSafeTestDatabase } from "./helpers/test-db";

test("Project Lifecycle & Profile Governance Test Suite (Steps 1 - 6)", async (t) => {
  assertSafeTestDatabase();
  let tenant: any;
  let adminCtx: TenantContext;
  let employee1Ctx: TenantContext;
  let employee2Ctx: TenantContext;
  let draftProjectId = "";
  let activeProjectId = "";
  let createdTaskId = "";
  let testSiteId = "";
  let testVisitId = "";
  let createdScopeChangeId = "";

  // 1. Setup workspace context
  tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
  assert.ok(tenant, "Tenant 100percentdesign must exist");

  let members = await prisma.tenantMembership.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: { user: true, employee: true },
  });

  let adminMember =
    members.find((m) => (m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN) && m.employee) ||
    members.find((m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN);
  assert.ok(adminMember, "Admin/Owner must exist");

  if (!adminMember.employee) {
    const createdEmp = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: adminMember.id,
        employeeId: `EMP-ADM-${Date.now().toString().slice(-4)}`,
        designation: "Studio Partner / Administrator",
        department: "Administration",
        phone: "+91 98201 11001",
      },
    });
    adminMember.employee = createdEmp;
  }

  let employeeMembers = members.filter((m) => m.role === TenantRole.EMPLOYEE);
  if (employeeMembers.length < 2) {
    for (let i = employeeMembers.length + 1; i <= 2; i++) {
      const testUser = await prisma.user.upsert({
        where: { email: `test.architect${i}@100percentdesign.test` },
        update: {},
        create: {
          email: `test.architect${i}@100percentdesign.test`,
          passwordHash: "$2b$10$e84605170d5138c20d754eecda808aa866a4cc1b9dbdbe0ddccbf8e624c4ad73",
          fullName: `Test Studio Architect ${i}`,
        },
      });
      const testMembership = await prisma.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: testUser.id } },
        update: {},
        create: {
          tenantId: tenant.id,
          userId: testUser.id,
          role: TenantRole.EMPLOYEE,
          hasFinanceAccess: false,
        },
      });
      await prisma.employee.upsert({
        where: { membershipId: testMembership.id },
        update: {},
        create: {
          tenantId: tenant.id,
          membershipId: testMembership.id,
          employeeId: `EMP-T00${i}`,
          designation: `Project Architect ${i}`,
          department: "Architecture",
          phone: `+91 99999 0000${i}`,
        },
      });
    }
    members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });
    employeeMembers = members.filter((m) => m.role === TenantRole.EMPLOYEE);
  }

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

  try {
    // ============================================================================
    // STEP 1 & 0: PREREQUISITES & COMMISSIONING
    // ============================================================================

    await t.test("1. Step 1: Incomplete project can be saved as DRAFT without full activation fields", async () => {
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

    await t.test("2. Step 1: Strict activation rejects incomplete fields on commission", async () => {
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

    await t.test("3. Step 1 & Step 0: Operational task assignment is BLOCKED on DRAFT project", async () => {
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

    await t.test("4. Step 1: Fully qualified project commissions and activates atomically", async () => {
      let client = await prisma.client.findFirst({ where: { tenantId: adminCtx.tenantId } });
      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId: adminCtx.tenantId,
            name: "Test Corporation Client",
            company: "Test Corp",
          },
        });
      }

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
        budget: 500000,
        status: ProjectStatus.ACTIVE,
      });

      assert.ok(project);
      assert.equal(project.status, ProjectStatus.ACTIVE);
      activeProjectId = project.id;

      const members = await prisma.projectMember.findMany({ where: { projectId: activeProjectId } });
      assert.ok(members.some((m) => m.membershipId === employee1Ctx.membershipId));
    });

    // ============================================================================
    // STEP 2: MEMBERSHIP SAFEGUARD & RESPONSIBILITIES
    // ============================================================================

    await t.test("5. Step 2: Member removal safeguard prevents removing member with active assignments", async () => {
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

    await t.test("6. Step 2: Member removal succeeds with explicit reassignment to another team member", async () => {
      await prisma.projectMember.create({
        data: {
          tenantId: adminCtx.tenantId,
          projectId: activeProjectId,
          membershipId: employee2Ctx.membershipId,
          projectRole: "ASSOCIATE",
        },
      });

      const result = await removeProjectMemberSafeguard(
        adminCtx,
        activeProjectId,
        employee1Ctx.membershipId,
        employee2Ctx.membershipId
      );

      assert.equal(result.openTasksReassigned, 1);

      const updatedTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
      assert.equal(updatedTask?.assigneeId, employee2Ctx.membershipId);
    });

    await t.test("7. Step 3: Delivery milestones created separately from financial fee milestones", async () => {
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

    // ============================================================================
    // STEP 4: PROJECT CHANGES AND HOLDS
    // ============================================================================

    await t.test("8. Step 4: Four-Eyes Principle — Requester cannot approve their own Scope Change Request", async () => {
      // 1. Employee cannot approve/decide scope changes
      const empChange = await prisma.projectChangeRequest.create({
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
      createdScopeChangeId = empChange.id;

      await assert.rejects(
        async () => {
          await decideProjectScopeChange(employee2Ctx, empChange.id, {
            decision: "APPROVE",
            decisionNotes: "Self-approving my own request",
          });
        },
        (err: any) => {
          assert.ok(err.message.includes("Owners or Administrators can approve"));
          return true;
        }
      );

      // 2. Admin requester cannot approve their own change request (Four-Eyes rule)
      const adminChange = await prisma.projectChangeRequest.create({
        data: {
          tenantId: adminCtx.tenantId,
          projectId: activeProjectId,
          requesterId: adminCtx.membershipId,
          title: "Admin Requested Program Revision",
          reason: "Client scope adjustment directly with director",
          status: ChangeRequestStatus.PENDING,
        },
      });

      await assert.rejects(
        async () => {
          await decideProjectScopeChange(adminCtx, adminChange.id, {
            decision: "APPROVE",
            decisionNotes: "Self approval attempt by admin",
          });
        },
        (err: any) => {
          assert.ok(err.message.includes("Four-eyes") || err.message.includes("Requester cannot approve"));
          return true;
        }
      );
    });

    await t.test("9. Step 4: Scope Change Request Withdrawal workflow", async () => {
      const changeToWithdraw = await prisma.projectChangeRequest.create({
        data: {
          tenantId: adminCtx.tenantId,
          projectId: activeProjectId,
          requesterId: employee2Ctx.membershipId,
          title: "Experimental Glazing Specification",
          reason: "Evaluating structural glass options",
          status: ChangeRequestStatus.PENDING,
        },
      });

      const withdrawn = await withdrawProjectScopeChange(
        employee2Ctx,
        changeToWithdraw.id,
        { reason: "Client selected standard aluminum mullions instead" }
      );

      assert.equal(withdrawn.status, ChangeRequestStatus.REJECTED);
      assert.ok(withdrawn.decisionNotes?.includes("[WITHDRAWN]"));
    });

    await t.test("10. Step 4: Controlled Scope Change Approval & Idempotent Atomic Application", async () => {
      const approved = await decideProjectScopeChange(adminCtx, createdScopeChangeId, {
        decision: "APPROVE",
        decisionNotes: "Approved per client addendum #2",
      });
      assert.equal(approved.status, ChangeRequestStatus.APPROVED);
      assert.equal(approved.appliedAt, null);

      const projectBefore = await prisma.project.findUnique({ where: { id: activeProjectId } });
      const initialBudget = Number(projectBefore?.budget || 0);

      const applied = await applyProjectScopeChange(adminCtx, createdScopeChangeId);
      assert.equal(applied.success, true);
      assert.ok(applied.changeRequest.appliedAt);

      const projectAfter = await prisma.project.findUnique({ where: { id: activeProjectId } });
      assert.equal(Number(projectAfter?.budget || 0), initialBudget + 45000);

      // Retry application (Idempotency test)
      const retryApplied = await applyProjectScopeChange(adminCtx, createdScopeChangeId);
      assert.equal(retryApplied.success, true);
      assert.equal(retryApplied.alreadyApplied, true);

      const projectAfterRetry = await prisma.project.findUnique({ where: { id: activeProjectId } });
      assert.equal(Number(projectAfterRetry?.budget || 0), initialBudget + 45000);
    });

    await t.test("11. Step 4: Central Hold Policy — Blocks Site Visit Check-in & Timer while allowing checkout", async () => {
      const site = await prisma.site.create({
        data: {
          tenantId: adminCtx.tenantId,
          projectId: activeProjectId,
          name: "Civic Center Construction Plot",
          address: "Plot 42, Bandra-Kurla Complex, Mumbai",
          latitude: 19.0760,
          longitude: 72.8777,
          radiusMeters: 200,
          accuracyThresholdMeters: 100,
        },
      });
      testSiteId = site.id;

      const visit = await prisma.siteVisit.create({
        data: {
          tenantId: adminCtx.tenantId,
          projectId: activeProjectId,
          siteId: site.id,
          employeeId: employee2Ctx.membershipId,
          purpose: "Superstructure structural inspection",
          scheduledTime: new Date(),
          operationalState: SiteVisitOperationalState.SCHEDULED,
        },
      });
      testVisitId = visit.id;

      // Hold project
      const holdResult = await holdProject(adminCtx, activeProjectId, {
        reason: "Awaiting local municipal authority height clearance",
        responsibleContactId: adminCtx.membershipId,
        reviewTargetDate: new Date(Date.now() + 86400000 * 10),
      });
      assert.equal(holdResult.project.status, ProjectStatus.ON_HOLD);

      // Check-in blocked during hold
      await assert.rejects(
        async () => {
          await executeSiteCheckIn(employee2Ctx, {
            visitId: testVisitId,
            latitude: 19.0760,
            longitude: 72.8777,
            accuracyMeters: 10,
            idempotencyKey: `hold-checkin-test-${Date.now()}`,
          });
        },
        (err: any) => {
          assert.ok(err.message.includes("ON HOLD") || err.message.includes("suspended"));
          return true;
        }
      );

      // Resume project
      const resumeResult = await resumeProject(adminCtx, activeProjectId, {
        resumeReason: "Municipal height clearance received with formal NOC",
        scheduleAdjustmentDays: 7,
      });
      assert.equal(resumeResult.project.status, ProjectStatus.ACTIVE);

      // Check-in succeeds after resume
      const checkInResult = await executeSiteCheckIn(employee2Ctx, {
        visitId: testVisitId,
        latitude: 19.0760,
        longitude: 72.8777,
        accuracyMeters: 10,
        idempotencyKey: `resume-checkin-test-${Date.now()}`,
      });
      assert.equal(checkInResult.success, true);
      assert.equal((checkInResult as any).visit.operationalState, "ACTIVE");
    });

    // ============================================================================
    // STEP 5: COMPLETION, HANDOVER, REOPENING, CANCELLATION, AND ARCHIVE
    // ============================================================================

    await t.test("12. Step 5: Completion Gates — Active site visits block completion as a mandatory gate", async () => {
      const checklist = await evaluateProjectCompletionChecklist(adminCtx, activeProjectId);
      assert.equal(checklist.canCompleteWithoutExceptions, false);
      assert.ok(checklist.activeSiteVisitsCount > 0, "Active site visits must be flagged as blocker");

      await assert.rejects(
        async () => {
          await completeProject(adminCtx, activeProjectId, {
            permittedExceptions: ["Trying to close while staff is on site"],
          });
        },
        (err: any) => {
          assert.ok(
            err.message.includes("active site") ||
            err.message.includes("site inspection") ||
            err.message.includes("active site visit")
          );
          return true;
        }
      );

      // Checkout concludes active visit
      const checkoutResult = await executeSiteCheckOut(employee2Ctx, {
        visitId: testVisitId,
        findings: "Superstructure conforms to structural drawings",
        idempotencyKey: `checkout-conclude-${Date.now()}`,
      });
      assert.equal(checkoutResult.success, true);
      assert.equal(checkoutResult.visit.operationalState, "CHECKED_OUT");
    });

    await t.test("13. Step 5: Handover Package Generation & Client Acknowledgement Recording", async () => {
      const handoverPkg = await getProjectHandoverPackage(adminCtx, activeProjectId);
      assert.ok(handoverPkg);
      assert.equal(handoverPkg.projectId, activeProjectId);
      assert.ok(Array.isArray(handoverPkg.approvedDeliverables));
      assert.ok(Array.isArray(handoverPkg.issuedDrawings));
      assert.ok(Array.isArray(handoverPkg.achievedMilestones));

      const issueResult = await recordProjectHandoverIssue(adminCtx, activeProjectId, {
        recipientName: "Mr. Rajesh Sharma",
        recipientContact: "rajesh@clientgroup.com",
        notes: "Handover dossier transmitted via digital transmittal #TR-2026-001",
      });
      assert.ok(issueResult.success);
      assert.ok(issueResult.project);

      const ackResult = await recordProjectHandoverAcknowledgement(adminCtx, activeProjectId, {
        acknowledgedByName: "Mr. Rajesh Sharma",
        acknowledgementDate: new Date(),
        acknowledgementEvidence: "Signed completion and acceptance certificate dated 2026-10-09",
        notes: "Client accepted all architectural deliverables without reservations",
      });
      assert.ok(ackResult.success);
      assert.ok(ackResult.project);
    });

    await t.test("14. Step 5: Safe Completion with Documented Exceptions", async () => {
      const completed = await completeProject(adminCtx, activeProjectId, {
        permittedExceptions: ["Client accepted early occupancy; landscape snag list moved to post-handover"],
      });

      assert.equal(completed.project.status, ProjectStatus.COMPLETED);
      assert.ok(completed.completionEvent);
    });

    await t.test("15. Step 5: Selective Reopening — Reopens project and selected deliverables without reset", async () => {
      let taskToReopen = createdTaskId ? await prisma.task.findUnique({ where: { id: createdTaskId } }) : null;
      if (!taskToReopen) {
        taskToReopen = await prisma.task.findFirst({ where: { projectId: activeProjectId } });
      }
      assert.ok(taskToReopen, "A deliverable task on the project must exist to test selective reopening");

      const reopened = await reopenProject(adminCtx, activeProjectId, {
        reason: "Client commissioned terrace cafeteria extension",
        reopenTaskIds: [taskToReopen.id],
      });

      assert.equal(reopened.project.status, ProjectStatus.ACTIVE);

      const reopenedTask = await prisma.task.findUnique({ where: { id: taskToReopen.id } });
      assert.equal(reopenedTask?.status, "IN_PROGRESS");
    });

    await t.test("16. Step 5: Cancellation with Work Disposition & Operational Guard", async () => {
      let client = await prisma.client.findFirst({ where: { tenantId: adminCtx.tenantId } });
      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId: adminCtx.tenantId,
            name: "Test Corporation Client",
            company: "Test Corp",
          },
        });
      }
      const cancelCode = `CNC-${Date.now().toString().slice(-4)}`;
      const cancelProjectRecord = await createProjectWithLifecycle(adminCtx, {
        code: cancelCode,
        name: "Residential Villa Project",
        status: ProjectStatus.ACTIVE,
        projectType: "RESIDENTIAL",
        primaryClientId: client.id,
        projectArchitectId: employee1Ctx.membershipId,
        brief: "Single family luxury residence",
        startDate: new Date(),
        targetDate: new Date(Date.now() + 86400000 * 30),
      });

      const openTask = await createTask(adminCtx, {
        title: "Preliminary Foundation Layout",
        description: "Foundation marking drawing",
        projectId: cancelProjectRecord.id,
        priority: TaskPriority.MEDIUM,
        assigneeIds: [employee2Ctx.membershipId],
        checklistItems: [
          {
            title: "Verify boundary setbacks",
            assignedMemberId: employee2Ctx.membershipId,
          },
        ],
        dueDate: new Date(Date.now() + 86400000 * 5),
      });

      const cancelled = await cancelProject(adminCtx, cancelProjectRecord.id, {
        reason: "Client failed to secure site acquisition permissions",
        dispositionOfWork: "CANCEL_OPEN_TASKS",
      });
      assert.equal(cancelled.project.status, ProjectStatus.CANCELLED);

      const updatedOpenTask = await prisma.task.findUnique({ where: { id: openTask.id } });
      assert.equal(updatedOpenTask?.status, "CANCELLED");

      await assert.rejects(
        async () => {
          await createTask(adminCtx, {
            title: "Blocked Task On Cancelled Project",
            description: "New work attempt",
            projectId: cancelProjectRecord.id,
            priority: TaskPriority.LOW,
            assigneeIds: [employee2Ctx.membershipId],
            dueDate: new Date(Date.now() + 86400000 * 5),
          });
        },
        (err: any) => {
          assert.match(err.message, /Cancelled|Completed|Archived/i);
          return true;
        }
      );

      const archived = await archiveProject(adminCtx, cancelProjectRecord.id);
      assert.equal(archived.isArchived, true);
      assert.equal(archived.status, ProjectStatus.CANCELLED);

      const unarchived = await unarchiveProject(adminCtx, cancelProjectRecord.id);
      assert.equal(unarchived.isArchived, false);
      assert.equal(unarchived.status, ProjectStatus.CANCELLED);

      // Cleanup cancelled project
      await prisma.taskChecklistItem.deleteMany({ where: { task: { projectId: cancelProjectRecord.id } } });
      await prisma.taskAssignment.deleteMany({ where: { task: { projectId: cancelProjectRecord.id } } });
      await prisma.task.deleteMany({ where: { projectId: cancelProjectRecord.id } });
      await prisma.projectMember.deleteMany({ where: { projectId: cancelProjectRecord.id } });
      await prisma.project.deleteMany({ where: { id: cancelProjectRecord.id } });
    });

    // ============================================================================
    // STEP 6: OWNER, ADMIN, AND EMPLOYEE PROFILE EXPERIENCES
    // ============================================================================

    await t.test("17. Step 6: 3-Tier Privacy Isolation — Directory profile sanitizes confidential credentials", async () => {
      const adminView = await getProfileOverview(adminCtx, employee2Ctx.membershipId);
      assert.ok(adminView.directoryProfile);
      assert.ok(adminView.managementRecord, "Admin must receive Management Record tier");
      assert.equal(adminView.canManage, true);

      const employeeView = await getProfileOverview(employee1Ctx, employee2Ctx.membershipId);
      assert.equal(employeeView.myProfile, null, "Employee must NOT receive colleague's myProfile");
      assert.equal(employeeView.managementRecord, null, "Employee must NOT receive Management Record tier");
      assert.equal(employeeView.canManage, false);
      assert.ok(employeeView.directoryProfile);
      assert.equal((employeeView.directoryProfile as any).mfaSecret, undefined);
      assert.equal((employeeView.directoryProfile as any).passwordHash, undefined);
    });

    await t.test("18. Step 6: Employee self-service updates allowlisted fields only", async () => {
      const updated = await updateSelfProfile(employee1Ctx, {
        fullName: "Architect One Updated",
        phone: "+91 98765 43210",
      });

      assert.equal(updated.success, true);

      const user = await prisma.user.findUnique({ where: { id: employee1Ctx.userId } });
      assert.equal(user?.fullName, "Architect One Updated");

      // Restore name
      await updateSelfProfile(employee1Ctx, {
        fullName: employee1Ctx.userFullName,
      });
    });

    await t.test("19. Step 6: Official record change request requires Admin/Owner approval with Four-Eyes protection", async () => {
      const request = await submitOfficialRecordChangeRequest(employee1Ctx, {
        fieldKey: "designation",
        newValue: "Principal Design Lead",
        reason: "Promoted to lead institutional studios",
      });

      assert.ok(request);
      assert.equal(request.status, "PENDING");
      assert.equal(request.fieldKey, "designation");
      assert.equal(request.newValue, "Principal Design Lead");

      // Non-admin employee attempting to decide profile changes MUST fail
      await assert.rejects(
        async () => {
          await decideProfileRecordChangeRequest(employee1Ctx, request.id, {
            decision: "APPROVE",
            decisionNote: "Self approval attempt",
          });
        },
        (err: any) => {
          assert.ok(err.message.includes("Owners or Administrators can approve profile changes"));
          return true;
        }
      );

      // Admin submits official record change request for themselves
      const adminRequest = await submitOfficialRecordChangeRequest(adminCtx, {
        fieldKey: "phone",
        newValue: "+91 91111 22222",
        reason: "Updated studio direct hotline",
      });

      // Admin attempting to self-approve their own request MUST fail via Four-Eyes principle
      await assert.rejects(
        async () => {
          await decideProfileRecordChangeRequest(adminCtx, adminRequest.id, {
            decision: "APPROVE",
            decisionNote: "Self approval attempt",
          });
        },
        (err: any) => {
          assert.ok(
            err.message.includes("Four-eyes") ||
            err.message.includes("Requester cannot approve")
          );
          return true;
        }
      );

      // Admin approves the employee's request
      const approved = await decideProfileRecordChangeRequest(adminCtx, request.id, {
        decision: "APPROVE",
        decisionNote: "Promotion approved by studio management",
      });

      assert.equal(approved.status, "APPROVED");

      const emp = await prisma.employee.findUnique({
        where: { membershipId: employee1Ctx.membershipId },
      });
      assert.equal(emp?.designation, "Principal Design Lead");
    });
  } finally {
    // Cleanup created test records
    if (testVisitId) {
      await prisma.siteVisitEvent.deleteMany({ where: { visitId: testVisitId } });
      await prisma.siteVisit.deleteMany({ where: { id: testVisitId } });
    }
    if (testSiteId) {
      await prisma.site.deleteMany({ where: { id: testSiteId } });
    }
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
      await prisma.taskChecklistItem.deleteMany({ where: { task: { projectId: activeProjectId } } });
      await prisma.taskAssignment.deleteMany({ where: { task: { projectId: activeProjectId } } });
      await prisma.task.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.projectMember.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.projectMilestone.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.projectChangeRequest.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.document.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.siteVisit.deleteMany({ where: { projectId: activeProjectId } });
      await prisma.project.deleteMany({ where: { id: activeProjectId } });
    }
  }
});
