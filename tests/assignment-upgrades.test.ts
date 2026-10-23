import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import {
  TenantContext,
  assertAdminOrOwner,
  assertCannotSelfReview,
  canManageHR,
  ForbiddenException,
} from "../src/server/tenancy/context";
import { TenantRole, TenantLifecycleState, UserAccountState, TaskWorkflowStatus, TaskPriority } from "@prisma/client";
import { validateFileMagicBytes } from "../src/server/storage/storage-adapter";
import {
  allocateSequentialReference,
  generateLetterDraft,
  updateLetterDraft,
  approveLetterDraft,
  issueLetter,
} from "../src/server/modules/letters/service";
import { resolveGoogleMapsLink } from "../src/server/modules/visits/location-resolver";
import {
  createSiteVisit,
  transitionParticipantJourney,
  saveInspectionReport,
} from "../src/server/modules/visits/service";
import {
  createStudioMeeting,
  updateStudioMeeting,
  listStudioMeetings,
} from "../src/server/modules/executive/meetings";
import {
  getCompletedTasksDossier,
  exportCompletedTasksToCsv,
  reopenCompletedTask,
} from "../src/server/modules/tasks/completed-tasks";

describe("Assignment Upgrades Integration & Acceptance Test Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let ownerUser: any;
  let adminUser: any;
  let adminUserNoHr: any;
  let employeeUserA: any;
  let employeeUserB: any;

  let ownerMember: any;
  let adminMember: any;
  let adminMemberNoHr: any;
  let employeeMemberA: any;
  let employeeMemberB: any;

  let ctxOwner: TenantContext;
  let ctxAdmin: TenantContext;
  let ctxAdminNoHr: TenantContext;
  let ctxEmpA: TenantContext;
  let ctxEmpB: TenantContext;

  let testProject: any;

  before(async () => {
    const timestamp = Date.now();

    // 1. Create Tenant
    tenant = await prisma.tenant.create({
      data: {
        name: `Upgrades Test Studio ${timestamp}`,
        slug: `upgrades-${timestamp}`,
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: TenantLifecycleState.ACTIVE,
      },
    });

    // 2. Create Users & Memberships
    ownerUser = await prisma.user.create({
      data: {
        email: `owner-${timestamp}@studio.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Studio Owner",
        accountState: UserAccountState.ACTIVE,
      },
    });
    ownerMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: ownerUser.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
        hasHrAccess: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin-hr-${timestamp}@studio.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "HR Admin",
        accountState: UserAccountState.ACTIVE,
      },
    });
    adminMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: adminUser.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
        hasHrAccess: true,
      },
    });

    adminUserNoHr = await prisma.user.create({
      data: {
        email: `admin-nohr-${timestamp}@studio.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Operations Admin",
        accountState: UserAccountState.ACTIVE,
      },
    });
    adminMemberNoHr = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: adminUserNoHr.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: false,
        hasHrAccess: false,
      },
    });

    employeeUserA = await prisma.user.create({
      data: {
        email: `emp-a-${timestamp}@studio.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Architect Alice",
        accountState: UserAccountState.ACTIVE,
      },
    });
    employeeMemberA = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: employeeUserA.id,
        role: TenantRole.EMPLOYEE,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: employeeMemberA.id,
        employeeId: `EMP-A-${timestamp.toString().slice(-4)}`,
        designation: "Junior Architect",
        department: "Design",
        joinDate: new Date(),
      },
    });

    employeeUserB = await prisma.user.create({
      data: {
        email: `emp-b-${timestamp}@studio.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Architect Bob",
        accountState: UserAccountState.ACTIVE,
      },
    });
    employeeMemberB = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: employeeUserB.id,
        role: TenantRole.EMPLOYEE,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: employeeMemberB.id,
        employeeId: `EMP-B-${timestamp.toString().slice(-4)}`,
        designation: "Site Architect",
        department: "Projects",
        joinDate: new Date(),
      },
    });

    testProject = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        code: `PRJ-${timestamp.toString().slice(-4)}`,
        name: "Eco Villa Horizon",
      },
    });

    // 3. Setup TenantContexts
    ctxOwner = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      membershipId: ownerMember.id,
      userId: ownerUser.id,
      userEmail: ownerUser.email,
      role: TenantRole.OWNER,
      userFullName: ownerUser.fullName,
      employeeId: null,
      timezone: "Asia/Kolkata",
      currency: "INR",
      hasFinanceAccess: true,
      hasHrAccess: true,
    };

    ctxAdmin = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      membershipId: adminMember.id,
      userId: adminUser.id,
      userEmail: adminUser.email,
      role: TenantRole.ADMIN,
      userFullName: adminUser.fullName,
      employeeId: null,
      timezone: "Asia/Kolkata",
      currency: "INR",
      hasFinanceAccess: true,
      hasHrAccess: true,
    };

    ctxAdminNoHr = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      membershipId: adminMemberNoHr.id,
      userId: adminUserNoHr.id,
      userEmail: adminUserNoHr.email,
      role: TenantRole.ADMIN,
      userFullName: adminUserNoHr.fullName,
      employeeId: null,
      timezone: "Asia/Kolkata",
      currency: "INR",
      hasFinanceAccess: false,
      hasHrAccess: false,
    };

    ctxEmpA = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      membershipId: employeeMemberA.id,
      userId: employeeUserA.id,
      userEmail: employeeUserA.email,
      role: TenantRole.EMPLOYEE,
      userFullName: employeeUserA.fullName,
      employeeId: "EMP-A",
      timezone: "Asia/Kolkata",
      currency: "INR",
      hasFinanceAccess: false,
      hasHrAccess: false,
    };

    ctxEmpB = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      membershipId: employeeMemberB.id,
      userId: employeeUserB.id,
      userEmail: employeeUserB.email,
      role: TenantRole.EMPLOYEE,
      userFullName: employeeUserB.fullName,
      employeeId: "EMP-B",
      timezone: "Asia/Kolkata",
      currency: "INR",
      hasFinanceAccess: false,
      hasHrAccess: false,
    };
  });

  after(async () => {
    // Cleanup tenant and cascade delete test entities
    if (tenant?.id) {
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
    }
  });

  // ==========================================
  // SECTION 1: SECURE EMPLOYEE DOCUMENTS
  // ==========================================
  describe("1. Secure Employee Documents & Storage", () => {
    test("Magic bytes validation: Real PDF header accepted, executable rejected", () => {
      const validPdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
      const fakePdfExecutableBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"); // DOS/PE header

      assert.strictEqual(validateFileMagicBytes(validPdfBuffer, "application/pdf"), true);
      assert.strictEqual(validateFileMagicBytes(fakePdfExecutableBuffer, "application/pdf"), false);
    });

    test("Self-Review Prevention: Admin cannot verify their own HR documents", () => {
      assert.throws(
        () => assertCannotSelfReview(ctxAdmin, adminMember.id),
        (err: any) => err instanceof ForbiddenException
      );
    });

    test("HR Permission Boundary: Task-managing Admin without HR permission cannot review documents", () => {
      assert.strictEqual(canManageHR(ctxAdminNoHr), false);
      assert.strictEqual(canManageHR(ctxAdmin), true);
      assert.strictEqual(canManageHR(ctxOwner), true);
    });
  });

  // ==========================================
  // SECTION 2: HR LETTERS & TEMPLATES
  // ==========================================
  describe("2. HR Letter Generation & Reference Allocation", () => {
    test("Sequential reference allocation: Concurrency-safe '100DS/HR/{year}/{seq}' sequence", async () => {
      const currentYear = new Date().getFullYear();
      const ref1 = await allocateSequentialReference(ctxOwner);
      assert.ok(ref1.startsWith(`100DS/HR/${currentYear}/`));

      // Persist an issued letter using ref1 to advance sequence
      const emp = await prisma.employee.findUnique({
        where: { membershipId: employeeMemberA.id },
      });
      await prisma.issuedLetter.create({
        data: {
          tenantId: ctxOwner.tenantId,
          employeeId: emp!.id,
          letterNumber: ref1,
          title: "First Sequential Letter",
          bodyContent: "Letter body content",
          status: "ISSUED",
        },
      });

      const ref2 = await allocateSequentialReference(ctxOwner);
      assert.ok(ref2.startsWith(`100DS/HR/${currentYear}/`));

      const seq1 = parseInt(ref1.split("/").pop()!, 10);
      const seq2 = parseInt(ref2.split("/").pop()!, 10);
      assert.strictEqual(seq2, seq1 + 1);
    });

    test("Template validation: Rejects issuance when required placeholders are missing", async () => {
      const emp = await prisma.employee.findUnique({
        where: { membershipId: employeeMemberA.id },
      });

      // Draft offer letter without salary override leaves {{salary}} unresolved in template
      const draft = await generateLetterDraft(ctxOwner, "OFFER", emp!.employeeId, {
        joinDate: "2026-11-01",
        // salary is intentionally missing
      });

      // Attempt to issue with unresolved {{salary}} placeholder
      await assert.rejects(
        async () => issueLetter(ctxOwner, draft.id),
        (err: any) => err.message.includes("unresolved placeholders") || err.message.includes("salary")
      );
    });

    test("Approval Invalidation: Editing an approved draft invalidates prior approval", async () => {
      const emp = await prisma.employee.findUnique({
        where: { membershipId: employeeMemberA.id },
      });

      const draft = await generateLetterDraft(ctxOwner, "PROBATION_CONFIRMATION", emp!.employeeId, {
        effectiveDate: "2026-11-01",
      });

      // Approve draft
      const approved = await approveLetterDraft(ctxOwner, draft.id);
      assert.strictEqual(approved.status, "APPROVED");

      // Edit draft content
      const edited = await updateLetterDraft(ctxOwner, draft.id, {
        bodyContent: "Modified probation confirmation terms.",
      });

      // Prior approval is invalidated!
      assert.strictEqual(edited.status, "DRAFT");
      assert.strictEqual(edited.approvedById, null);
    });
  });

  // ==========================================
  // SECTION 3: EXACT 10-FIELD SITE VISITS & SSRF
  // ==========================================
  describe("3. Exact 10-Field Assign Form, Persistent Sites & Journey Tracking", () => {
    test("SSRF Protection: Location resolver rejects localhost, 127.0.0.1, and private IPs", async () => {
      await assert.rejects(
        async () => resolveGoogleMapsLink("http://127.0.0.1:8080/secret"),
        (err: any) => err.message.includes("supported") || err.message.includes("SSRF") || err.message.includes("protocol")
      );

      await assert.rejects(
        async () => resolveGoogleMapsLink("http://localhost:3000/api"),
        (err: any) => err.message.includes("supported") || err.message.includes("SSRF") || err.message.includes("protocol")
      );

      await assert.rejects(
        async () => resolveGoogleMapsLink("file:///etc/passwd"),
        (err: any) => err.message.includes("protocol") || err.message.includes("supported")
      );
    });

    test("Multi-assignee session decoupling: Finish Inspection ends report but leaves journey active", async () => {
      const visit = await createSiteVisit(ctxOwner, {
        projectId: testProject.id,
        typologyAndScope: "HVAC & Electrical Ducting Inspection",
        priority: "HIGH",
        employeeIds: [employeeMemberA.id, employeeMemberB.id],
        customSiteName: "Horizon Sector 4 Spot",
        customSiteAddress: "Plot 104, Horizon Hills",
        customSiteLatitude: 18.5204,
        customSiteLongitude: 73.8567,
        customSiteRadiusMeters: 150,
        checklistItemsJson: [
          { item: "latest drawings available", checked: true },
          { item: "inspection scope reviewed", checked: true },
          { item: "tools/PPE prepared", checked: true },
          { item: "access/contractor availability confirmed", checked: true },
        ],
        meetingAgenda: "Verify rough-in conduit positioning before dry-wall close up",
        scheduledDate: "2026-10-25",
        scheduledTime: "10:30",
      });

      assert.strictEqual(visit.participants.length, 2);

      // Employee A starts journey
      const journeyStartA = await transitionParticipantJourney(ctxEmpA, visit.id, {
        transition: "START_JOURNEY",
        latitude: 18.5195,
        longitude: 73.855,
      });
      assert.strictEqual(journeyStartA.participant.operationalState, "JOURNEY_STARTED");

      // Employee A arrives at site
      const arrivedA = await transitionParticipantJourney(ctxEmpA, visit.id, {
        transition: "ARRIVED_AT_SITE",
        latitude: 18.5204,
        longitude: 73.8567,
      });
      assert.strictEqual(arrivedA.participant.operationalState, "ARRIVED_AT_SITE");

      // Employee A starts inspection
      const inspectStartA = await transitionParticipantJourney(ctxEmpA, visit.id, {
        transition: "START_INSPECTION",
      });
      assert.strictEqual(inspectStartA.participant.operationalState, "INSPECTION_STARTED");

      // Employee A finishes inspection: leaves journey active!
      const inspectFinishA = await transitionParticipantJourney(ctxEmpA, visit.id, {
        transition: "FINISH_INSPECTION",
      });
      assert.strictEqual(inspectFinishA.participant.operationalState, "INSPECTION_FINISHED");

      // Verify Employee B is still ASSIGNED (sessions completely decoupled!)
      const partB = await prisma.siteVisitParticipant.findUnique({
        where: {
          visitId_membershipId: {
            visitId: visit.id,
            membershipId: employeeMemberB.id,
          },
        },
      });
      assert.strictEqual(partB?.journeyState, "ASSIGNED");

      // Employee A returns to office: journey ends
      const returnEndA = await transitionParticipantJourney(ctxEmpA, visit.id, {
        transition: "RETURNED_TO_OFFICE",
      });
      assert.strictEqual(returnEndA.participant.operationalState, "RETURNED_OFFICE");
    });
  });

  // ==========================================
  // SECTION 4: STUDIO MEETINGS
  // ==========================================
  describe("4. Studio Meetings & Privacy Enforcement", () => {
    test("Audience snapshot: 'All active employees' freezes attendees at creation time", async () => {
      const meeting = await createStudioMeeting(ctxOwner, {
        title: "All Hands Studio Strategy",
        meetingDate: "2026-10-28",
        startTime: "14:00",
        endTime: "15:30",
        meetingType: "Partner Strategy",
        attendees: {
          allEmployees: true,
        },
      });

      assert.ok(meeting.audienceSnapshotJson);
      const snapshot = meeting.audienceSnapshotJson as any;
      assert.strictEqual(snapshot.allEmployees, true);
      assert.ok(Array.isArray(snapshot.snapshotMembershipIds));
      assert.ok(snapshot.snapshotMembershipIds.includes(employeeMemberA.id));
      assert.ok(snapshot.snapshotMembershipIds.includes(employeeMemberB.id));
    });

    test("Privacy & Draft MoM: Employees only see authorized meetings; unpublished MoM is redacted", async () => {
      // Create leadership meeting with Alice invited, Bob NOT invited
      const meeting = await createStudioMeeting(ctxOwner, {
        title: "Executive Compensation & Bonus Strategy",
        meetingDate: "2026-10-29",
        startTime: "16:00",
        endTime: "17:00",
        meetingType: "Budget & Financials",
        notes: "Confidential proposed architect appraisal matrix",
        decisions: "Agreed to 12% baseline increment pool",
        isMinutesPublished: false, // Draft
        attendees: {
          allEmployees: false,
          employeeIds: [employeeMemberA.id], // Only Alice
        },
      });

      // Employee B (Bob) queries meetings: must not see this meeting!
      const bobMeetings = await listStudioMeetings(ctxEmpB);
      const bobFound = bobMeetings.some((m) => m.id === meeting.id);
      assert.strictEqual(bobFound, false);

      // Employee A (Alice) queries meetings: sees meeting, but unpublished notes & decisions are REDACTED!
      const aliceMeetings = await listStudioMeetings(ctxEmpA);
      const aliceFound = aliceMeetings.find((m) => m.id === meeting.id);
      assert.ok(aliceFound);
      assert.strictEqual(aliceFound.notes, null); // Redacted
      assert.strictEqual(aliceFound.decisions, null); // Redacted

      // Owner/Admin sees full unredacted draft notes & decisions
      const ownerMeetings = await listStudioMeetings(ctxOwner);
      const ownerFound = ownerMeetings.find((m) => m.id === meeting.id);
      assert.ok(ownerFound);
      assert.strictEqual(ownerFound.notes, "Confidential proposed architect appraisal matrix");
      assert.strictEqual(ownerFound.decisions, "Agreed to 12% baseline increment pool");
    });
  });

  // ==========================================
  // SECTION 5: COMPLETED TASKS ARCHIVE
  // ==========================================
  describe("5. Completed Tasks Status-Based View & Reopening", () => {
    let completedTaskId: string;

    before(async () => {
      // Create a completed task on the canonical Task table
      const task = await prisma.task.create({
        data: {
          tenantId: tenant.id,
          projectId: testProject.id,
          title: "Structural Glazing Fabrication Drawings",
          description: "Complete facade sectional drawings for south tower",
          assigneeId: employeeMemberA.id,
          creatorId: ownerMember.id,
          priority: TaskPriority.HIGH,
          status: TaskWorkflowStatus.COMPLETED,
          dueDate: new Date("2026-10-15T18:00:00.000Z"),
          completionDate: new Date("2026-10-14T15:00:00.000Z"), // On-Time
          completedById: employeeMemberA.id,
          approvedById: ownerMember.id,
        },
      });
      completedTaskId = task.id;

      await prisma.taskAssignment.create({
        data: {
          tenantId: tenant.id,
          taskId: task.id,
          membershipId: employeeMemberA.id,
          isCompleted: true,
          completedAt: new Date("2026-10-14T15:00:00.000Z"),
        },
      });
    });

    test("Canonical table preservation: Completed task stays in 'tasks' table with ID and history", async () => {
      const task = await prisma.task.findUnique({
        where: { id: completedTaskId },
      });
      assert.ok(task);
      assert.strictEqual(task.status, TaskWorkflowStatus.COMPLETED);
    });

    test("Dossier and server-side filtering: Returns accurate metrics and on-time classification", async () => {
      const dossier = await getCompletedTasksDossier(ctxOwner, {
        search: "Glazing",
      });

      assert.ok(dossier.tasks.length >= 1);
      const found = dossier.tasks.find((t) => t.id === completedTaskId);
      assert.ok(found);
      assert.strictEqual(found.timingClassification, "ON_TIME");
      assert.ok(dossier.metrics.uniqueCompletedTasks >= 1);
      assert.ok(dossier.metrics.onTimeCount >= 1);
    });

    test("CSV Formula Injection Mitigation: Special characters escaped with leading apostrophe", async () => {
      // Create task with potentially malicious spreadsheet trigger
      const formulaTask = await prisma.task.create({
        data: {
          tenantId: tenant.id,
          projectId: testProject.id,
          title: "=SUM(1+1)",
          assigneeId: employeeMemberB.id,
          creatorId: ownerMember.id,
          status: TaskWorkflowStatus.COMPLETED,
          completionDate: new Date(),
        },
      });

      const csv = await exportCompletedTasksToCsv(ctxOwner, {
        search: "SUM",
      });

      assert.ok(csv.includes(`"'=SUM(1+1)"`)); // Escaped with leading single quote!
    });

    test("Reopening Completed Work: Moves to IN_PROGRESS, increments cycles, and requires justification", async () => {
      // Reopening without reason is rejected
      await assert.rejects(
        async () => reopenCompletedTask(ctxOwner, completedTaskId, { reason: "" }),
        (err: any) => err.message.includes("mandatory")
      );

      // Reopening by employee is forbidden
      await assert.rejects(
        async () => reopenCompletedTask(ctxEmpA, completedTaskId, { reason: "Need rework" }),
        (err: any) => err instanceof ForbiddenException
      );

      // Reopen by Owner succeeds
      const reopened = await reopenCompletedTask(ctxOwner, completedTaskId, {
        reason: "Client requested revision to mullion thickness",
      });

      assert.strictEqual(reopened.status, TaskWorkflowStatus.IN_PROGRESS);
      assert.strictEqual(reopened.reopenCount, 1);
      assert.strictEqual(reopened.reopenReason, "Client requested revision to mullion thickness");
      assert.ok(reopened.reopenedAt);
      assert.strictEqual(reopened.reopenedById, ownerMember.id);
    });
  });
});
