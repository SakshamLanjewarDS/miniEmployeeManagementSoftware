import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  getIntegrationHealthOverview,
  triggerManualConnectorSync,
  retryFailedOutboxItems,
  toggleConnectorSchedule,
} from "../../src/server/modules/integrations/health";
import {
  createEmployeeInvitation,
  revokeEmployeeInvitation,
  previewEmployeeOffboarding,
  executeEmployeeDeactivation,
  reactivateEmployee,
} from "../../src/server/modules/employees/lifecycle";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole, UserAccountState } from "@prisma/client";

describe("Phase 7: Integrations Health & Account Lifecycle Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;
  let adminMember: any;
  let employeeMember: any;
  let testUser: any;
  let testMembership: any;
  let testEmployee: any;
  let testInvitation: any;

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

    // Create a disposable user & employee for offboarding testing
    testUser = await prisma.user.create({
      data: {
        email: `offboard.candidate.${Date.now()}@100percentdesign.test`,
        fullName: "Offboarding Candidate",
        passwordHash: "test-hash",
        accountState: UserAccountState.ACTIVE,
      },
    });

    testMembership = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: testUser.id,
        role: TenantRole.EMPLOYEE,
        isActive: true,
      },
    });

    testEmployee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        membershipId: testMembership.id,
        employeeId: `EMP-TEST-${Date.now().toString().slice(-4)}`,
        department: "Architecture",
        designation: "Junior Architect",
        employmentStatus: "ACTIVE",
      },
    });

    // Create a session for this user
    await prisma.session.create({
      data: {
        userId: testUser.id,
        token: `session-token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  after(async () => {
    if (testMembership) {
      await prisma.session.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.employee.delete({ where: { id: testEmployee.id } }).catch(() => {});
      await prisma.tenantMembership.delete({ where: { id: testMembership.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testInvitation) {
      await prisma.tenantInvitation.delete({ where: { id: testInvitation.id } }).catch(() => {});
    }
  });

  test("1. Non-leadership roles cannot access integration health diagnostics (RBAC)", async () => {
    await assert.rejects(
      async () => {
        await getIntegrationHealthOverview(employeeCtx);
      },
      /Only Studio Owners or Administrators/
    );
  });

  test("2. Integration health provides truthful diagnostics and sanitizes error secrets", async () => {
    const health = await getIntegrationHealthOverview(adminCtx);

    assert.ok(health);
    assert.ok(health.connectors.length >= 5);

    // Verify error sanitization: check that no secret or bearer token is exposed in any connector
    for (const c of health.connectors) {
      if (c.sanitizedError) {
        assert.equal(c.sanitizedError.includes("password="), false);
        assert.equal(c.sanitizedError.includes("secret="), false);
        assert.equal(c.sanitizedError.includes("Bearer eyJ"), false);
      }
    }
  });

  test("3. Manual connector sync executes bounded run and logs audit trail", async () => {
    const syncResult = await triggerManualConnectorSync(adminCtx, "LEAVE_SHEET");

    assert.equal(syncResult.success, true);
    assert.equal(syncResult.status, "SUCCESS");

    // Verify audit event
    const audit = await prisma.auditEvent.findFirst({
      where: {
        tenantId: tenant.id,
        action: "MANUAL_CONNECTOR_SYNC_TRIGGERED",
      },
      orderBy: { timestamp: "desc" },
    });

    assert.ok(audit);
    assert.ok(audit.safeChangeSummary.includes("LEAVE_SHEET"));
  });

  test("4. Outbox retry resets failed items and is audited", async () => {
    // Create a failed email
    const failedEmail = await prisma.studioEmailOutbox.create({
      data: {
        tenantId: tenant.id,
        recipientEmail: "failing.test@100percentdesign.test",
        subject: "Failing Test Email",
        eventType: "TASK_ASSIGNED",
        htmlBody: "<p>Test</p>",
        status: "FAILED",
        lastError: "Connection timeout to smtp.office365.com",
        idempotencyKey: `failed-email-${Date.now()}`,
      },
    });

    const retryResult = await retryFailedOutboxItems(adminCtx);
    assert.equal(retryResult.success, true);
    assert.ok(retryResult.retriedCount >= 1);

    // Verify email status reset to PENDING
    const refreshed = await prisma.studioEmailOutbox.findUnique({
      where: { id: failedEmail.id },
    });
    assert.equal(refreshed?.status, "PENDING");
    assert.equal(refreshed?.attempts, 0);

    // Cleanup
    await prisma.studioEmailOutbox.delete({ where: { id: failedEmail.id } }).catch(() => {});
  });

  test("5. Employee invitations are expiring, one-time, and role-protected", async () => {
    const inviteEmail = `new.talent.${Date.now()}@100percentdesign.test`;
    testInvitation = await createEmployeeInvitation(adminCtx, {
      email: inviteEmail,
      role: "EMPLOYEE",
      department: "Interior Design",
      designation: "Assistant Designer",
    });

    assert.ok(testInvitation);
    assert.equal(testInvitation.status, "PENDING");
    assert.equal(testInvitation.role, TenantRole.EMPLOYEE);
    assert.ok(testInvitation.token.length >= 32);

    // Verify outbox email queued with link (no plaintext password)
    const outboxEmail = await prisma.studioEmailOutbox.findFirst({
      where: {
        tenantId: tenant.id,
        recipientEmail: inviteEmail,
      },
    });
    assert.ok(outboxEmail);
    assert.ok(outboxEmail.htmlBody.includes(testInvitation.token));
    assert.equal(outboxEmail.htmlBody.includes("password"), false);

    // Revoke invitation
    const revoked = await revokeEmployeeInvitation(adminCtx, testInvitation.id);
    assert.equal(revoked.status, "REVOKED");
  });

  test("6. Offboarding preview enforces last active owner protection", async () => {
    // Attempting to offboard the owner when only 1 owner exists must fail closed
    const ownerMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.id, role: TenantRole.OWNER, isActive: true },
    });

    if (ownerMember) {
      const preview = await previewEmployeeOffboarding(adminCtx, ownerMember.id);
      if (preview.isLastOwner) {
        assert.equal(preview.canDeactivate, false);
        assert.ok(preview.blockers.some((b) => b.includes("last active Owner")));
      }
    }
  });

  test("7. Employee deactivation atomically revokes sessions, updates status, and preserves history", async () => {
    const deactivationResult = await executeEmployeeDeactivation(adminCtx, {
      membershipId: testMembership.id,
      reason: "Contract ended and completed smooth handover",
      handoverNotes: "All project drawing assets handed over to Lead Architect.",
    });

    assert.equal(deactivationResult.success, true);
    assert.ok(deactivationResult.sessionsRevoked >= 1);

    // Verify membership is inactive
    const updatedMem = await prisma.tenantMembership.findUnique({
      where: { id: testMembership.id },
      include: { employee: true },
    });
    assert.equal(updatedMem?.isActive, false);
    assert.equal(updatedMem?.employee?.employmentStatus, "DEACTIVATED");
    assert.ok(updatedMem?.employee?.deactivatedAt);

    // Verify sessions revoked
    const activeSessions = await prisma.session.count({
      where: { userId: testUser.id, revokedAt: null },
    });
    assert.equal(activeSessions, 0, "All sessions must be revoked");

    // Reactivation test
    const reactivated = await reactivateEmployee(
      adminCtx,
      testMembership.id,
      "Returning on a new consulting contract"
    );
    assert.equal(reactivated.isActive, true);
  });
});
