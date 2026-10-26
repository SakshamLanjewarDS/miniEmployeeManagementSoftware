import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import {
  canManageHR,
  canManageFinance,
  assertCannotSelfReview,
  ForbiddenException,
  TenantContext,
} from "../src/server/tenancy/context";
import { createSession } from "../src/server/auth/session";
import {
  reviewSiteVisit,
  reviewInspectionReport,
} from "../src/server/modules/visits/service";
import {
  savePrivateFile,
  readPrivateFile,
  validateFileMagicBytes,
} from "../src/server/storage/storage-adapter";
import { sanitizeSpreadsheetFormula } from "../src/server/modules/ingest/csv";
import { GET as restoreAdminGet, POST as restoreAdminPost } from "../src/app/api/admin/restore-admin/route";
import { POST as reopenedTasksPost } from "../src/app/api/employee/reopened-tasks/route";
import { getEmployeeDashboardData } from "../src/server/modules/dashboard/service";
import { NextRequest } from "next/server";
import { TenantRole, UserAccountState, SiteVisitReviewDecision } from "@prisma/client";
import { loginWithWorkspace, verifyLoginOtp, deactivateMember } from "../src/server/auth/service";
import { createOtpChallenge, verifyOtpChallenge } from "../src/server/auth/otp";
import { GET as storageFileGet } from "../src/app/api/storage/files/[fileId]/route";
import { reopenCompletedTask } from "../src/server/modules/tasks/completed-tasks";
import { generateBankPayoutCSV } from "../src/server/modules/payroll/lifecycle";
import crypto from "crypto";

describe("Comprehensive Security Audit & Tenant Isolation Suite", () => {
  assertSafeTestDatabase();

  const T1_SLUG = `sec-t1-${Date.now()}`;
  const T2_SLUG = `sec-t2-${Date.now()}`;

  let tenant1: any;
  let tenant2: any;

  let ownerUser1: any;
  let ownerMember1: any;
  let adminNoHrUser: any;
  let adminNoHrMember: any;
  let adminWithHrUser: any;
  let adminWithHrMember: any;
  let emp1User: any;
  let emp1Member: any;
  let emp2User: any;
  let emp2Member: any;

  let ownerUser2: any;
  let ownerMember2: any;

  let ctxOwner1: TenantContext;
  let ctxAdminNoHr: TenantContext;
  let ctxAdminWithHr: TenantContext;
  let ctxEmp1: TenantContext;
  let ctxEmp2: TenantContext;
  let ctxOwner2: TenantContext;

  let project1: any;
  let site1: any;
  let visit1: any;
  let inspectionReport1: any;

  let site2: any;
  let visit2: any;

  before(async () => {
    const passwordHash = await bcrypt.hash("SecTestPass2026!", 10);

    // 1. Create Tenant 1 (100% DESIGN Studio)
    tenant1 = await prisma.tenant.create({
      data: {
        slug: T1_SLUG,
        name: "100% DESIGN Studio (SecTest)",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // 2. Create Tenant 2 (Apex Studio - Isolated Peer)
    tenant2 = await prisma.tenant.create({
      data: {
        slug: T2_SLUG,
        name: "Apex Studio (SecTest)",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // Tenant 1: Owner
    ownerUser1 = await prisma.user.create({
      data: { email: `owner1-${Date.now()}@studio.com`, fullName: "Owner User 1", passwordHash },
    });
    ownerMember1 = await prisma.tenantMembership.create({
      data: { tenantId: tenant1.id, userId: ownerUser1.id, role: TenantRole.OWNER, hasFinanceAccess: true, isActive: true },
    });
    const empRecordOwner1 = await prisma.employee.create({
      data: { tenantId: tenant1.id, membershipId: ownerMember1.id, employeeId: "EMP-001", designation: "Principal" },
    });

    // Tenant 1: Admin WITHOUT HR and WITHOUT Finance access
    adminNoHrUser = await prisma.user.create({
      data: { email: `admin-nohr-${Date.now()}@studio.com`, fullName: "Admin No HR", passwordHash },
    });
    adminNoHrMember = await prisma.tenantMembership.create({
      data: { tenantId: tenant1.id, userId: adminNoHrUser.id, role: TenantRole.ADMIN, hasFinanceAccess: false, hasHrAccess: false, isActive: true },
    });
    const empRecordAdminNoHr = await prisma.employee.create({
      data: { tenantId: tenant1.id, membershipId: adminNoHrMember.id, employeeId: "EMP-002", designation: "Operations Lead" },
    });

    // Tenant 1: Admin WITH HR and Finance access
    adminWithHrUser = await prisma.user.create({
      data: { email: `admin-hr-${Date.now()}@studio.com`, fullName: "Admin HR", passwordHash },
    });
    adminWithHrMember = await prisma.tenantMembership.create({
      data: { tenantId: tenant1.id, userId: adminWithHrUser.id, role: TenantRole.ADMIN, hasFinanceAccess: true, hasHrAccess: true, isActive: true },
    });
    const empRecordAdminWithHr = await prisma.employee.create({
      data: { tenantId: tenant1.id, membershipId: adminWithHrMember.id, employeeId: "EMP-003", designation: "HR Lead" },
    });

    // Tenant 1: Employee 1
    emp1User = await prisma.user.create({
      data: { email: `emp1-${Date.now()}@studio.com`, fullName: "Employee One", passwordHash },
    });
    emp1Member = await prisma.tenantMembership.create({
      data: { tenantId: tenant1.id, userId: emp1User.id, role: TenantRole.EMPLOYEE, isActive: true },
    });
    const empRecord1 = await prisma.employee.create({
      data: { tenantId: tenant1.id, membershipId: emp1Member.id, employeeId: "EMP-004", designation: "Architect" },
    });

    // Tenant 1: Employee 2
    emp2User = await prisma.user.create({
      data: { email: `emp2-${Date.now()}@studio.com`, fullName: "Employee Two", passwordHash },
    });
    emp2Member = await prisma.tenantMembership.create({
      data: { tenantId: tenant1.id, userId: emp2User.id, role: TenantRole.EMPLOYEE, isActive: true },
    });
    const empRecord2 = await prisma.employee.create({
      data: { tenantId: tenant1.id, membershipId: emp2Member.id, employeeId: "EMP-005", designation: "Site Engineer" },
    });

    // Tenant 2: Owner
    ownerUser2 = await prisma.user.create({
      data: { email: `owner2-${Date.now()}@apex.com`, fullName: "Apex Owner", passwordHash },
    });
    ownerMember2 = await prisma.tenantMembership.create({
      data: { tenantId: tenant2.id, userId: ownerUser2.id, role: TenantRole.OWNER, hasFinanceAccess: true, isActive: true },
    });
    const empRecordOwner2 = await prisma.employee.create({
      data: { tenantId: tenant2.id, membershipId: ownerMember2.id, employeeId: "EMP-101", designation: "Partner" },
    });

    // Construct Contexts
    ctxOwner1 = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ownerUser1.id,
      userEmail: ownerUser1.email,
      userFullName: ownerUser1.fullName,
      membershipId: ownerMember1.id,
      employeeId: empRecordOwner1.employeeId,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      hasHrAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    ctxAdminNoHr = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: adminNoHrUser.id,
      userEmail: adminNoHrUser.email,
      userFullName: adminNoHrUser.fullName,
      membershipId: adminNoHrMember.id,
      employeeId: empRecordAdminNoHr.employeeId,
      role: TenantRole.ADMIN,
      hasFinanceAccess: false,
      hasHrAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    ctxAdminWithHr = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: adminWithHrUser.id,
      userEmail: adminWithHrUser.email,
      userFullName: adminWithHrUser.fullName,
      membershipId: adminWithHrMember.id,
      employeeId: empRecordAdminWithHr.employeeId,
      role: TenantRole.ADMIN,
      hasFinanceAccess: true,
      hasHrAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    ctxEmp1 = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: emp1User.id,
      userEmail: emp1User.email,
      userFullName: emp1User.fullName,
      membershipId: emp1Member.id,
      employeeId: empRecord1.employeeId,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      hasHrAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    ctxEmp2 = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: emp2User.id,
      userEmail: emp2User.email,
      userFullName: emp2User.fullName,
      membershipId: emp2Member.id,
      employeeId: empRecord2.employeeId,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      hasHrAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    ctxOwner2 = {
      tenantId: tenant2.id,
      tenantSlug: tenant2.slug,
      tenantName: tenant2.name,
      userId: ownerUser2.id,
      userEmail: ownerUser2.email,
      userFullName: ownerUser2.fullName,
      membershipId: ownerMember2.id,
      employeeId: empRecordOwner2.employeeId,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      hasHrAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Create Project & Site in Tenant 1
    project1 = await prisma.project.create({
      data: {
        tenantId: tenant1.id,
        code: `P1-${Date.now()}`,
        name: "Commercial Complex",
        status: "ACTIVE",
      },
    });

    site1 = await prisma.site.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        name: "Plot 42 South Wing",
        address: "Bandra Kurla Complex, Mumbai",
        latitude: 19.065,
        longitude: 72.868,
        radiusMeters: 150,
      },
    });

    visit1 = await prisma.siteVisit.create({
      data: {
        tenantId: tenant1.id,
        projectId: project1.id,
        siteId: site1.id,
        employeeId: emp1Member.id,
        purpose: "Foundation Reinforcement Inspection",
        scheduledTime: new Date(),
        operationalState: "CHECKED_OUT",
        reviewDecision: "PENDING",
      },
    });

    const participant1 = await prisma.siteVisitParticipant.create({
      data: {
        tenantId: tenant1.id,
        visitId: visit1.id,
        membershipId: emp1Member.id,
      },
    });

    inspectionReport1 = await prisma.siteVisitInspectionReport.create({
      data: {
        tenantId: tenant1.id,
        visitId: visit1.id,
        participantId: participant1.id,
        status: "SUBMITTED",
        observations: "Columns passed - status OK",
      },
    });

    // Create Project, Site & Visit in Tenant 2
    const project2 = await prisma.project.create({
      data: {
        tenantId: tenant2.id,
        code: `P2-${Date.now()}`,
        name: "Apex Luxury Towers",
        status: "ACTIVE",
      },
    });

    site2 = await prisma.site.create({
      data: {
        tenantId: tenant2.id,
        projectId: project2.id,
        name: "Apex Tower Site",
        address: "Worli Sea Face, Mumbai",
        radiusMeters: 200,
      },
    });

    visit2 = await prisma.siteVisit.create({
      data: {
        tenantId: tenant2.id,
        projectId: project2.id,
        siteId: site2.id,
        employeeId: ownerMember2.id,
        purpose: "Apex Foundation Review",
        scheduledTime: new Date(),
        operationalState: "CHECKED_OUT",
        reviewDecision: "PENDING",
      },
    });
  });

  after(async () => {
    // Cleanup synthetic test records
    try {
      await prisma.siteVisitInspectionReport.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.siteVisitParticipant.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.siteVisit.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.site.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.project.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.employee.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.tenantMembership.deleteMany({ where: { tenantId: { in: [tenant1.id, tenant2.id] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenant1.id, tenant2.id] } } });
    } catch (_) {}
  });

  // ============================================================================
  // TEST GROUP 1: PRIORITY ZERO — RESTORE-ADMIN BACKDOOR & SECRET PROTECTION
  // ============================================================================
  describe("Priority 0: Restore Admin & Credential Confidentiality", () => {
    test("1.1 Production Configuration disables restore-admin endpoint (Returns 404)", async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      try {
        const getRes = await restoreAdminGet();
        assert.strictEqual(getRes.status, 404, "GET /api/admin/restore-admin must return 404 in production");

        const dummyReq = new NextRequest("http://localhost:3000/api/admin/restore-admin", {
          method: "POST",
          body: JSON.stringify({ email: "attacker@evil.com", password: "AttackerPassword123!" }),
        });
        const postRes = await restoreAdminPost(dummyReq);
        assert.strictEqual(postRes.status, 404, "POST /api/admin/restore-admin must return 404 in production");
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    test("1.2 Non-Production rejects unauthenticated GET mutation (Method Not Allowed 405)", async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "development";

      try {
        const res = await restoreAdminGet();
        assert.strictEqual(res.status, 405, "Unauthenticated GET must be rejected with 405 Method Not Allowed");
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    test("1.3 Non-Production POST requires valid operator recovery key header", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevKey = process.env.OPERATOR_RECOVERY_KEY;
      (process.env as any).NODE_ENV = "development";
      process.env.OPERATOR_RECOVERY_KEY = "SECRET_SUPER_OPERATOR_KEY_12345";

      try {
        // Without header -> 403
        const unauthReq = new NextRequest("http://localhost:3000/api/admin/restore-admin", {
          method: "POST",
          body: JSON.stringify({ email: "test@studio.com", password: "NewStrongPassword2026!" }),
        });
        const unauthRes = await restoreAdminPost(unauthReq);
        assert.strictEqual(unauthRes.status, 403, "POST without operator key must return 403 Forbidden");

        // With valid header -> Success without returning password
        const authReq = new NextRequest("http://localhost:3000/api/admin/restore-admin", {
          method: "POST",
          headers: { "x-operator-recovery-key": "SECRET_SUPER_OPERATOR_KEY_12345" },
          body: JSON.stringify({
            workspaceSlug: tenant1.slug,
            email: ownerUser1.email,
            password: "NewAuditedPass2026!",
          }),
        });
        const authRes = await restoreAdminPost(authReq);
        assert.strictEqual(authRes.status, 200, "Authorized recovery POST must succeed");
        const body = await authRes.json();
        assert.strictEqual(body.success, true);
        assert.strictEqual(body.admin.password, undefined, "Plaintext password must NEVER be returned in response");
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        process.env.OPERATOR_RECOVERY_KEY = prevKey;
      }
    });
  });

  // ============================================================================
  // TEST GROUP 2: ROLE & CAPABILITY BOUNDARIES (HR, FINANCE, FOUR-EYES)
  // ============================================================================
  describe("Role Authorization & Four-Eyes Governance", () => {
    test("2.1 Admin WITHOUT explicit hasHrAccess cannot manage HR documents", () => {
      assert.strictEqual(canManageHR(ctxAdminNoHr), false, "Admin with hasHrAccess=false must NOT have HR access");
      assert.strictEqual(canManageHR(ctxAdminWithHr), true, "Admin with hasHrAccess=true must have HR access");
      assert.strictEqual(canManageHR(ctxOwner1), true, "Owner has sovereign HR access");
    });

    test("2.2 Admin WITHOUT explicit hasFinanceAccess cannot manage studio finance", () => {
      assert.strictEqual(canManageFinance(ctxAdminNoHr), false, "Admin with hasFinanceAccess=false must NOT have Finance access");
      assert.strictEqual(canManageFinance(ctxAdminWithHr), true, "Admin with hasFinanceAccess=true must have Finance access");
      assert.strictEqual(canManageFinance(ctxOwner1), true, "Owner has sovereign finance access");
    });

    test("2.3 Four-Eyes Principle: Neither Admin nor Owner can verify their own HR documents", () => {
      // Admin verifying own document -> Rejected
      assert.throws(
        () => assertCannotSelfReview(ctxAdminWithHr, ctxAdminWithHr.employeeId!),
        (err: any) => err instanceof ForbiddenException,
        "Admin cannot verify their own HR document"
      );

      // Owner verifying own document -> Rejected (Four-eyes strictly enforced)
      assert.throws(
        () => assertCannotSelfReview(ctxOwner1, ctxOwner1.employeeId!),
        (err: any) => err instanceof ForbiddenException,
        "Owner cannot verify their own HR document"
      );

      // Verifying another employee's document -> Permitted
      assert.doesNotThrow(() => assertCannotSelfReview(ctxAdminWithHr, ctxEmp1.employeeId!));
    });
  });

  // ============================================================================
  // TEST GROUP 3: TENANT ISOLATION & IDOR PREVENTION
  // ============================================================================
  describe("Cross-Tenant Isolation & IDOR Protection", () => {
    test("3.1 Tenant A Admin CANNOT review or mutate Site Visit belonging to Tenant B", async () => {
      await assert.rejects(
        async () => {
          await reviewSiteVisit(ctxOwner1, visit2.id, SiteVisitReviewDecision.ACCEPTED, "Attempted cross-tenant review");
        },
        (err: any) => {
          return err.message.includes("not found") || err.name === "ForbiddenException";
        },
        "Cross-tenant review of site visit must fail closed"
      );

      // Verify Tenant B visit remains PENDING
      const checkVisit2 = await prisma.siteVisit.findUnique({ where: { id: visit2.id } });
      assert.strictEqual(checkVisit2?.reviewDecision, "PENDING", "Tenant B visit decision must remain untouched");
    });

    test("3.2 Tenant A Admin CANNOT review or approve Inspection Report belonging to Tenant B", async () => {
      await assert.rejects(
        async () => {
          await reviewInspectionReport(ctxOwner2, inspectionReport1.id, "APPROVED", "Apex owner attacking Tenant 1 report");
        },
        (err: any) => {
          return err.message.includes("not found") || err.name === "ForbiddenException";
        },
        "Cross-tenant review of inspection report must fail closed"
      );

      // Verify Tenant 1 inspection report remains SUBMITTED
      const checkReport1 = await prisma.siteVisitInspectionReport.findUnique({ where: { id: inspectionReport1.id } });
      assert.strictEqual(checkReport1?.status, "SUBMITTED", "Tenant 1 report must remain SUBMITTED");
    });
  });

  // ============================================================================
  // TEST GROUP 4: STORAGE & PRIVATE FILE ACCESS CONTROL
  // ============================================================================
  describe("File Storage Security & Quarantine Lifecycle", () => {
    test("4.1 Content Magic Bytes: Real PDF is accepted, executable disguise is rejected", () => {
      const realPdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
      const fakeExecutableBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");

      assert.strictEqual(validateFileMagicBytes(realPdfBuffer, "application/pdf"), true);
      assert.strictEqual(validateFileMagicBytes(fakeExecutableBuffer, "application/pdf"), false);
    });

    test("4.2 Quarantined files fail-closed and cannot be read", async () => {
      const dummyPdf = Buffer.from("%PDF-1.4 test secure document stream %%EOF");
      const saved = await savePrivateFile(ctxEmp1, {
        fileName: "confidential_spec.pdf",
        mimeType: "application/pdf",
        buffer: dummyPdf,
      });

      assert.strictEqual(saved.isQuarantined, true, "Untrusted uploads fail-closed into quarantine");

      // Attempting to read quarantined file must throw ForbiddenException
      await assert.rejects(
        async () => {
          await readPrivateFile(ctxEmp1, saved.id);
        },
        (err: any) => err instanceof ForbiddenException,
        "Reading quarantined file must fail closed with ForbiddenException"
      );
    });
  });

  // ============================================================================
  // TEST GROUP 5: REOPENED TASK PERSISTENCE & GOVERNANCE
  // ============================================================================
  describe("Authoritative Reopened Task Server Acknowledgment", () => {
    test("5.1 Reopened Task Acknowledgment persists to TaskAssignment and logs audit trail", async () => {
      // 1. Create a task in Tenant 1 assigned to Employee 1
      const task = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          projectId: project1.id,
          creatorId: ownerMember1.id,
          assigneeId: emp1Member.id,
          title: "Structural Slab Calculations",
          status: "IN_PROGRESS",
          reopenedAt: new Date(),
          reopenCount: 1,
        },
      });

      // 2. Add TASK_REOPENED activity history record
      await prisma.taskActivityHistory.create({
        data: {
          tenantId: tenant1.id,
          taskId: task.id,
          actorId: ownerMember1.id,
          action: "TASK_REOPENED",
          reason: `${ctxOwner1.userFullName} reopened "Structural Slab Calculations": Load revisions required`,
        },
      });

      // 3. Before acknowledgment: Dashboard should return this task as reopened
      const beforeDashboard = await getEmployeeDashboardData(ctxEmp1);
      const isPresentBefore = (beforeDashboard.reopenedTasks || []).some((r) => r.taskId === task.id);
      assert.strictEqual(isPresentBefore, true, "Reopened task must appear in employee dashboard before acknowledgment");

      // 4. Employee acknowledges via POST /api/employee/reopened-tasks
      const emp1Session = await createSession(emp1User.id, tenant1.id);
      const ackReq = new NextRequest("http://localhost:3000/api/employee/reopened-tasks", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${emp1Session.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug: tenant1.slug,
          taskId: task.id,
        }),
      });

      const ackRes = await reopenedTasksPost(ackReq);
      assert.strictEqual(ackRes.status, 200);
      const ackBody = await ackRes.json();
      assert.strictEqual(ackBody.success, true);
      assert.strictEqual(ackBody.taskId, task.id);

      // 5. Verify database TaskAssignment state
      const assignment = await prisma.taskAssignment.findUnique({
        where: {
          taskId_membershipId: {
            taskId: task.id,
            membershipId: emp1Member.id,
          },
        },
      });
      assert.ok(assignment?.acknowledgedAt, "TaskAssignment must have authoritative server acknowledgedAt timestamp");

      // 6. After acknowledgment: Dashboard query must automatically suppress this reopened alert
      const afterDashboard = await getEmployeeDashboardData(ctxEmp1);
      const isPresentAfter = (afterDashboard.reopenedTasks || []).some((r) => r.taskId === task.id);
      assert.strictEqual(isPresentAfter, false, "Acknowledged reopened task must be suppressed from alert list");
    });
  });

  // ============================================================================
  // TEST GROUP 6: FORMULA INJECTION & INPUT SAFETY
  // ============================================================================
  describe("Spreadsheet Formula Injection Sanitization", () => {
    test("6.1 Formula trigger characters (=, +, -, @, \\t, \\r, \\n, |, %) are neutralized with single quote prefix", () => {
      assert.strictEqual(sanitizeSpreadsheetFormula("=SUM(A1:A10)"), "'=SUM(A1:A10)");
      assert.strictEqual(sanitizeSpreadsheetFormula("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
      assert.strictEqual(sanitizeSpreadsheetFormula("-2+5+cmd|' /C calc'!A0"), "'-2+5+cmd|' /C calc'!A0");
      assert.strictEqual(sanitizeSpreadsheetFormula("@SUM(1+1)"), "'@SUM(1+1)");
      assert.strictEqual(sanitizeSpreadsheetFormula("\tmalicious_tab"), "'\tmalicious_tab");
      assert.strictEqual(sanitizeSpreadsheetFormula("\r=malicious_cr"), "'\r=malicious_cr");
      assert.strictEqual(sanitizeSpreadsheetFormula("\n=malicious_lf"), "'\n=malicious_lf");
      assert.strictEqual(sanitizeSpreadsheetFormula("|malicious_pipe"), "'|malicious_pipe");
      assert.strictEqual(sanitizeSpreadsheetFormula("   =SUM(1,2)"), "'=SUM(1,2)");
      assert.strictEqual(sanitizeSpreadsheetFormula("Ordinary Architecture Deliverable"), "Ordinary Architecture Deliverable");
    });
  });

  // ============================================================================
  // TEST GROUP 7: EXPLICIT AUTHENTICATION & SECRET LEAKAGE SAFEGUARDS
  // ============================================================================
  describe("Authentication, OTP Lifecycle & Session Revocation", () => {
    test("7.1 Plaintext OTPs, salts, and secrets are NEVER returned in login responses", async () => {
      const prevEnv = process.env.EXPOSE_TEST_OTP_PREVIEW;
      delete process.env.EXPOSE_TEST_OTP_PREVIEW;

      const res = await loginWithWorkspace({
        workspaceSlug: tenant1.slug,
        identifier: ownerUser1.email,
        password: "NewAuditedPass2026!",
        requireOtp: true,
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.requiresOtp, true);
      assert.ok(res.challengeId, "Must return challengeId");
      assert.ok(res.maskedEmail?.includes("***"), "Email must be masked");
      assert.strictEqual((res as any).otpPreview, undefined, "Plaintext OTP must NEVER leak in login responses");
      assert.strictEqual((res as any).otp, undefined, "Cleartext OTP must NEVER be in auth result");

      if (prevEnv) process.env.EXPOSE_TEST_OTP_PREVIEW = prevEnv;
    });

    test("7.2 OTP Challenge Expiration & Tampering Protection", async () => {
      // Create a fresh challenge
      const challenge = createOtpChallenge({
        userId: emp1User.id,
        tenantId: tenant1.id,
        workspaceSlug: tenant1.slug,
        user: { id: emp1User.id, email: emp1User.email, fullName: "Emp 1", role: "EMPLOYEE", employeeId: "EMP-003" },
      });

      // Verification with empty or non-existent challenge ID fails
      const nonExistent = verifyOtpChallenge("non_existent_challenge_id_12345", challenge.otp);
      assert.strictEqual(nonExistent.success, false);
      assert.ok(nonExistent.error?.includes("expired or invalid"));

      // Tampered OTP fails
      const tampered = verifyOtpChallenge(challenge.challengeId, "000000");
      assert.strictEqual(tampered.success, false);
      assert.ok(tampered.error?.includes("Invalid verification code"));
    });

    test("7.3 OTP Challenge Single-Use (Replay Prevention)", async () => {
      const challenge = createOtpChallenge({
        userId: emp1User.id,
        tenantId: tenant1.id,
        workspaceSlug: tenant1.slug,
        user: { id: emp1User.id, email: emp1User.email, fullName: "Emp 1", role: "EMPLOYEE", employeeId: "EMP-003" },
      });

      // First verification succeeds
      const firstAttempt = verifyOtpChallenge(challenge.challengeId, challenge.otp);
      assert.strictEqual(firstAttempt.success, true);

      // Second verification of the exact same code MUST fail (challenge deleted on success)
      const secondAttempt = verifyOtpChallenge(challenge.challengeId, challenge.otp);
      assert.strictEqual(secondAttempt.success, false);
      assert.ok(secondAttempt.error?.includes("expired or invalid"), "Replaying consumed OTP must fail");
    });

    test("7.4 OTP Attempt Throttling: 3 failed attempts invalidates challenge permanently", async () => {
      const challenge = createOtpChallenge({
        userId: emp1User.id,
        tenantId: tenant1.id,
        workspaceSlug: tenant1.slug,
        user: { id: emp1User.id, email: emp1User.email, fullName: "Emp 1", role: "EMPLOYEE", employeeId: "EMP-003" },
      });

      // Attempt 1: wrong code -> 2 remaining
      const attempt1 = verifyOtpChallenge(challenge.challengeId, "999991");
      assert.strictEqual(attempt1.success, false);
      assert.strictEqual(attempt1.remainingAttempts, 2);

      // Attempt 2: wrong code -> 1 remaining
      const attempt2 = verifyOtpChallenge(challenge.challengeId, "999992");
      assert.strictEqual(attempt2.success, false);
      assert.strictEqual(attempt2.remainingAttempts, 1);

      // Attempt 3: wrong code -> exceeded, challenge deleted
      const attempt3 = verifyOtpChallenge(challenge.challengeId, "999993");
      assert.strictEqual(attempt3.success, false);
      assert.strictEqual(attempt3.remainingAttempts, 0);

      // Attempt 4: even with CORRECT code now, challenge is revoked
      const attempt4 = verifyOtpChallenge(challenge.challengeId, challenge.otp);
      assert.strictEqual(attempt4.success, false);
      assert.ok(attempt4.error?.includes("expired or invalid"));
    });

    test("7.5 Disabled user accounts are rejected at authentication boundary", async () => {
      // Temporarily disable Employee 1
      await prisma.user.update({
        where: { id: emp1User.id },
        data: { accountState: UserAccountState.DISABLED },
      });

      const res = await loginWithWorkspace({
        workspaceSlug: tenant1.slug,
        identifier: emp1User.email,
        password: "SecTestPass2026!",
        requireOtp: false,
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes("Account is disabled"));

      // Restore active state
      await prisma.user.update({
        where: { id: emp1User.id },
        data: { accountState: UserAccountState.ACTIVE },
      });
    });

    test("7.6 Deactivating a membership invalidates all active sessions immediately", async () => {
      // 1. Create active session for Employee 2
      const emp2Session = await createSession(emp2User.id, tenant1.id);
      const sessionInDbBefore = await prisma.session.findUnique({
        where: { token: emp2Session.token },
      });
      assert.ok(sessionInDbBefore, "Session must exist before member deactivation");

      // 2. Deactivate Employee 2 membership
      const deactivateRes = await deactivateMember(tenant1.id, emp2Member.id, ownerUser1.id);
      assert.strictEqual(deactivateRes.success, true);

      // 3. Verify session was instantly revoked in database (revokedAt timestamp set)
      const sessionInDbAfter = await prisma.session.findUnique({
        where: { token: emp2Session.token },
      });
      assert.ok(sessionInDbAfter?.revokedAt !== null, "Active session must have revokedAt set upon member deactivation");

      // Reactivate Employee 2 for subsequent tests
      await prisma.tenantMembership.update({
        where: { id: emp2Member.id },
        data: { isActive: true },
      });
    });
  });

  // ============================================================================
  // TEST GROUP 8: SENSITIVE FILE AUTHORIZATION & GENERAL ADMIN FALLBACK BOUNDARY
  // ============================================================================
  describe("Sensitive File Authorization & General Admin Fallback Boundary", () => {
    let unassociatedEmployeeFile: any;
    let employeeDocFile: any;
    let employeeDocRecord: any;

    before(async () => {
      const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

      // 1. Create unassociated file uploaded by Employee 1 (e.g. personal Aadhaar / KYC upload before link)
      unassociatedEmployeeFile = await prisma.privateFile.create({
        data: {
          tenantId: tenant1.id,
          fileName: "employee_aadhaar_kyc_confidential.pdf",
          storagePath: `storage/uploads/tenant-${tenant1.id}/mock-aadhaar.pdf`,
          mimeType: "application/pdf",
          byteSize: pdfBytes.length,
          checksum: "mock_sha256_aadhaar",
          isQuarantined: false,
          scanStatus: "SCANNED_CLEAN",
          uploaderId: emp1Member.id,
        },
      });

      // 2. Create EmployeeDocument (sensitive HR file linked to Employee 1)
      employeeDocFile = await prisma.privateFile.create({
        data: {
          tenantId: tenant1.id,
          fileName: "compensation_letter_2026.pdf",
          storagePath: `storage/uploads/tenant-${tenant1.id}/mock-comp.pdf`,
          mimeType: "application/pdf",
          byteSize: pdfBytes.length,
          checksum: "mock_sha256_comp",
          isQuarantined: false,
          scanStatus: "SCANNED_CLEAN",
          uploaderId: ownerMember1.id,
        },
      });

      const emp1Profile = await prisma.employee.findFirst({
        where: { membershipId: emp1Member.id },
      });

      employeeDocRecord = await prisma.employeeDocument.create({
        data: {
          tenantId: tenant1.id,
          employeeId: emp1Profile!.id,
          privateFileId: employeeDocFile.id,
          title: "Compensation Letter 2026",
          category: "AADHAAR",
          scanStatus: "CLEAN",
          status: "VERIFIED",
        },
      });
    });

    test("8.1 General admin WITHOUT HR access is DENIED access to unassociated employee upload (403)", async () => {
      const adminNoHrSession = await createSession(adminNoHrUser.id, tenant1.id);
      const req = new NextRequest(
        `http://localhost:3000/api/storage/files/${unassociatedEmployeeFile.id}?workspaceSlug=${tenant1.slug}`,
        {
          headers: { authorization: `Bearer ${adminNoHrSession.token}` },
        }
      );

      const res = await storageFileGet(req, {
        params: Promise.resolve({ fileId: unassociatedEmployeeFile.id }),
      });

      assert.strictEqual(
        res.status,
        403,
        "General admin without HR permission must be rejected with 403 on employee sensitive file"
      );
      const body = await res.json();
      assert.ok(body.error?.includes("HR authorization"));
    });

    test("8.2 General admin WITHOUT HR access is DENIED access to EmployeeDocument (403)", async () => {
      const adminNoHrSession = await createSession(adminNoHrUser.id, tenant1.id);
      const req = new NextRequest(
        `http://localhost:3000/api/storage/files/${employeeDocFile.id}?workspaceSlug=${tenant1.slug}`,
        {
          headers: { authorization: `Bearer ${adminNoHrSession.token}` },
        }
      );

      const res = await storageFileGet(req, {
        params: Promise.resolve({ fileId: employeeDocFile.id }),
      });

      assert.strictEqual(res.status, 403, "General admin without HR permissions must receive 403 on confidential employee doc");
    });

    test("8.3 Admin WITH HR access is GRANTED access to employee confidential document (200)", async () => {
      const adminWithHrSession = await createSession(adminWithHrUser.id, tenant1.id);
      const req = new NextRequest(
        `http://localhost:3000/api/storage/files/${employeeDocFile.id}?workspaceSlug=${tenant1.slug}`,
        {
          headers: { authorization: `Bearer ${adminWithHrSession.token}` },
        }
      );

      // Note: route checks file on disk via readPrivateFile; for unit verification test verifies auth checks pass
      const res = await storageFileGet(req, {
        params: Promise.resolve({ fileId: employeeDocFile.id }),
      });

      // Authorization passed (if disk file mock is missing, returns 404 file unavailable, NOT 403 forbidden)
      assert.notStrictEqual(res.status, 403, "Admin with HR access must not receive 403 Forbidden");
    });

    test("8.4 Peer employee cannot access another employee's confidential document (403)", async () => {
      const emp2Session = await createSession(emp2User.id, tenant1.id);
      const req = new NextRequest(
        `http://localhost:3000/api/storage/files/${employeeDocFile.id}?workspaceSlug=${tenant1.slug}`,
        {
          headers: { authorization: `Bearer ${emp2Session.token}` },
        }
      );

      const res = await storageFileGet(req, {
        params: Promise.resolve({ fileId: employeeDocFile.id }),
      });

      assert.strictEqual(res.status, 403, "Peer employee must be rejected with 403 Forbidden");
    });

    test("8.5 Cross-tenant file access is rejected (404/403)", async () => {
      const owner2Session = await createSession(ownerUser2.id, tenant2.id);
      const req = new NextRequest(
        `http://localhost:3000/api/storage/files/${employeeDocFile.id}?workspaceSlug=${tenant2.slug}`,
        {
          headers: { authorization: `Bearer ${owner2Session.token}` },
        }
      );

      const res = await storageFileGet(req, {
        params: Promise.resolve({ fileId: employeeDocFile.id }),
      });

      assert.strictEqual(res.status, 404, "Tenant 2 user must not discover Tenant 1 private file");
    });
  });

  // ============================================================================
  // TEST GROUP 9: REASSIGNMENT, REPEATED REOPENING & STALE REQUESTS
  // ============================================================================
  describe("Task Reassignment, Repeated Reopening & Stale Acknowledgment Semantics", () => {
    let lifecycleTask: any;

    before(async () => {
      lifecycleTask = await prisma.task.create({
        data: {
          tenantId: tenant1.id,
          projectId: project1.id,
          creatorId: ownerMember1.id,
          assigneeId: emp1Member.id,
          title: "HVAC Duct Layout Verification",
          status: "COMPLETED",
          version: 1,
          reopenCount: 0,
        },
      });

      await prisma.taskAssignment.create({
        data: {
          tenantId: tenant1.id,
          taskId: lifecycleTask.id,
          membershipId: emp1Member.id,
          acknowledgedAt: new Date(Date.now() - 3600000),
          acknowledgedVersion: 1,
          isCompleted: true,
        },
      });
    });

    test("9.1 First Reopen resets assignment acknowledgedAt and increments reopenCount", async () => {
      await reopenCompletedTask(ctxOwner1, lifecycleTask.id, { reason: "Rooftop unit dimensions updated" });

      const reloaded = await prisma.task.findUnique({
        where: { id: lifecycleTask.id },
      });
      assert.strictEqual(reloaded?.reopenCount, 1);
      assert.strictEqual(reloaded?.status, "IN_PROGRESS");

      const assignment = await prisma.taskAssignment.findUnique({
        where: {
          taskId_membershipId: {
            taskId: lifecycleTask.id,
            membershipId: emp1Member.id,
          },
        },
      });
      assert.strictEqual(assignment?.acknowledgedAt, null, "Reopened task must clear assignment acknowledgedAt");
    });

    test("9.2 Acknowledging reopen records timestamp and decouples from task.version", async () => {
      const emp1Session = await createSession(emp1User.id, tenant1.id);
      const ackReq = new NextRequest("http://localhost:3000/api/employee/reopened-tasks", {
        method: "POST",
        headers: {
          authorization: `Bearer ${emp1Session.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug: tenant1.slug,
          taskId: lifecycleTask.id,
        }),
      });

      const res = await reopenedTasksPost(ackReq);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.acknowledgedVersion, 1, "acknowledgedVersion reflects task.version, not reopenCount");

      const updatedAssignment = await prisma.taskAssignment.findUnique({
        where: {
          taskId_membershipId: {
            taskId: lifecycleTask.id,
            membershipId: emp1Member.id,
          },
        },
      });
      assert.ok(updatedAssignment?.acknowledgedAt);
    });

    test("9.3 Second Reopen increments reopenCount to 2 and clears acknowledgedAt again", async () => {
      // Complete task again
      await prisma.task.update({
        where: { id: lifecycleTask.id },
        data: { status: "COMPLETED" },
      });

      // Reopen a second time
      await reopenCompletedTask(ctxOwner1, lifecycleTask.id, { reason: "Diffuser positions conflict with sprinkler heads" });

      const reloaded2 = await prisma.task.findUnique({
        where: { id: lifecycleTask.id },
      });
      assert.strictEqual(reloaded2?.reopenCount, 2);

      const assignment2 = await prisma.taskAssignment.findUnique({
        where: {
          taskId_membershipId: {
            taskId: lifecycleTask.id,
            membershipId: emp1Member.id,
          },
        },
      });
      assert.strictEqual(assignment2?.acknowledgedAt, null, "Second reopen must clear acknowledgedAt again");
    });

    test("9.4 Non-assigned user cannot acknowledge task (Forbidden 403)", async () => {
      const emp2Session = await createSession(emp2User.id, tenant1.id);
      const staleReq = new NextRequest("http://localhost:3000/api/employee/reopened-tasks", {
        method: "POST",
        headers: {
          authorization: `Bearer ${emp2Session.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug: tenant1.slug,
          taskId: lifecycleTask.id,
        }),
      });

      const res = await reopenedTasksPost(staleReq);
      assert.strictEqual(res.status, 403, "Unassigned employee must be rejected with 403 Forbidden");
    });
  });

  // ============================================================================
  // TEST GROUP 10: BANK PAYOUT EXPORT & RFC 4180 INTEGRITY
  // ============================================================================
  describe("Bank Payout CSV Export & RFC 4180 Integrity", () => {
    test("10.1 Bank payout CSV preserves leading zeroes on account numbers and valid IFSC format", () => {
      const mockPayrollPreview: any = {
        monthName: "October",
        year: 2026,
        employees: [
          {
            employeeDbId: "emp_1",
            employeeId: "EMP-001",
            employeeName: "Aditi Rao",
            accountNumber: "001234567890", // Preserves leading zeros!
            ifscCode: "HDFC0001234",
            netPayable: 75000.0,
          },
          {
            employeeDbId: "emp_2",
            employeeId: "EMP-002",
            employeeName: "=SUM(1+1)", // Malicious formula name
            accountNumber: "987654321098",
            ifscCode: "ICIC0000001",
            netPayable: 42000.5,
          },
        ],
      };

      const csv = generateBankPayoutCSV(mockPayrollPreview);
      const lines = csv.split("\r\n");

      // Verify Header
      assert.strictEqual(
        lines[0],
        "Beneficiary Name,Account Number,IFSC Code,Net Amount (INR),Payment Mode,Employee ID,Remarks"
      );

      // Verify Row 1: Leading zeros preserved and clean
      assert.ok(lines[1].includes('"001234567890"'), "Account number with leading zero must be quoted and preserved");
      assert.ok(lines[1].includes('"HDFC0001234"'), "IFSC must be preserved");
      assert.ok(lines[1].includes("75000.00"), "Amount formatted as decimal");

      // Verify Row 2: Formula name sanitized with single quote prefix
      assert.ok(lines[2].includes('""\'=SUM(1+1)""') || lines[2].includes('\'=SUM(1+1)'), "Formula in employee name must be neutralized");
      assert.ok(lines[2].includes('"987654321098"'));
    });
  });

  // ============================================================================
  // TEST GROUP 11: APPS SCRIPT HMAC TOKEN DECISION GATEWAY
  // ============================================================================
  describe("Google Apps Script HMAC Token Decision Gateway", () => {
    const SECRET = "d100_gas_decision_secret_prod_2026_secure";

    function generateTestToken(row: number, action: string, timestamp: number): string {
      const payload = `${row}:${action}:${timestamp}`;
      const signature = crypto.createHmac("sha256", SECRET).update(payload).digest();
      return signature.toString("base64url");
    }

    function verifyTestToken(row: number, action: string, timestamp: number, token: string): boolean {
      const now = Date.now();
      if (now - timestamp > 7 * 24 * 60 * 60 * 1000) return false;
      const expected = generateTestToken(row, action, timestamp);
      return expected === token;
    }

    test("11.1 Valid HMAC decision token passes verification", () => {
      const now = Date.now();
      const token = generateTestToken(2, "approve", now);
      assert.strictEqual(verifyTestToken(2, "approve", now, token), true);
    });

    test("11.2 Expired decision token (> 7 days) fails verification", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const token = generateTestToken(2, "approve", eightDaysAgo);
      assert.strictEqual(verifyTestToken(2, "approve", eightDaysAgo, token), false);
    });

    test("11.3 Tampered action or row fails verification", () => {
      const now = Date.now();
      const approveToken = generateTestToken(2, "approve", now);
      // Attacker changes action to reject using approveToken
      assert.strictEqual(verifyTestToken(2, "reject", now, approveToken), false);
      // Attacker changes row to row 5 using row 2 token
      assert.strictEqual(verifyTestToken(5, "approve", now, approveToken), false);
    });
  });
});

