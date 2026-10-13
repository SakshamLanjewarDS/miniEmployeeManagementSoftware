import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  getBackupVerificationOverview,
  recordStudioBackupRun,
  runIsolatedRestoreVerificationTest,
  generateTenantSafeExportManifest,
} from "../../src/server/modules/storage/backup";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";

describe("Phase 8: Backup and Recovery Verification Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;
  let adminMember: any;
  let employeeMember: any;
  let testBackup: any;

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
  });

  after(async () => {
    if (testBackup) {
      await prisma.studioBackupLog.delete({ where: { id: testBackup.id } }).catch(() => {});
    }
  });

  test("1. Non-leadership roles cannot access backup verification records (RBAC)", async () => {
    await assert.rejects(
      async () => {
        await getBackupVerificationOverview(employeeCtx);
      },
      /Only Studio Owners or Administrators/
    );
  });

  test("2. Backup success and restore verification are strictly separate states", async () => {
    // Record a new successful backup dump
    testBackup = await recordStudioBackupRun(adminCtx, {
      backupIdentifier: `BACKUP-${Date.now()}-DAILY-FULL`,
      scope: "FULL",
      sizeBytes: 15420000,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "SUCCESS",
      retentionDays: 30,
      notes: "Daily automated database dump and file manifest",
    });

    assert.ok(testBackup);
    assert.equal(testBackup.status, "SUCCESS");
    // Crucial requirement: verifiedRestoreAt must initially be null
    assert.equal(testBackup.verifiedRestoreAt, null, "Restore verification must not be assumed from backup success alone");

    const overview = await getBackupVerificationOverview(adminCtx);
    assert.ok(overview);
    assert.ok(overview.backupsList.some((b) => b.id === testBackup.id));
  });

  test("3. Isolated restore verification drill runs with side effects strictly disabled", async () => {
    const drillResult = await runIsolatedRestoreVerificationTest(adminCtx, testBackup.id);

    assert.equal(drillResult.success, true);
    assert.equal(drillResult.sideEffectsDisabled, true, "Outbound emails and live sync must be disabled");
    assert.ok(drillResult.measuredDurationMs > 0);
    assert.ok(Number(drillResult.measuredDurationSeconds) > 0);

    // Verify verification notes contain explicit proof
    assert.ok(drillResult.verificationNotes.includes("PASSED in disposable sandbox"));
    assert.ok(drillResult.verificationNotes.includes("DISABLED"));

    // Verify record in database updated
    const refreshed = await prisma.studioBackupLog.findUnique({
      where: { id: testBackup.id },
    });
    assert.ok(refreshed?.verifiedRestoreAt);
    assert.ok(refreshed?.verifiedRestoreDurationMs! > 0);
  });

  test("4. Cross-tenant backup access is strictly rejected", async () => {
    // Attempting to verify or access another tenant's backup ID must fail closed
    const foreignCtx: TenantContext = {
      ...adminCtx,
      tenantId: "foreign-tenant-id-12345",
      tenantSlug: "foreign-tenant",
    };

    await assert.rejects(
      async () => {
        await runIsolatedRestoreVerificationTest(foreignCtx, testBackup.id);
      },
      /Backup record not found/
    );
  });

  test("5. Tenant-safe export manifest generates consistent SHA-256 checksum", async () => {
    const manifestResult = await generateTenantSafeExportManifest(adminCtx);

    assert.ok(manifestResult.manifest);
    assert.equal(manifestResult.manifest.tenantId, tenant.id);
    assert.equal(manifestResult.manifest.tenantSlug, tenant.slug);
    assert.ok(manifestResult.checksum);
    assert.equal(manifestResult.checksum.length, 64, "SHA-256 checksum must be 64 hex characters");
    assert.equal(manifestResult.verificationState, "CONSISTENT");
  });
});
