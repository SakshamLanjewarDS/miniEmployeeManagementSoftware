import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  createDrawing,
  uploadNewRevision,
  submitRevisionForReview,
  reviewRevision,
  findDrawings,
} from "../../src/server/modules/drawings/repository";
import {
  createSiteIssue,
  updateSiteIssue,
  verifySiteIssue,
  convertSiteIssueToTask,
} from "../../src/server/modules/visits/issues";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole, DocumentApprovalState } from "@prisma/client";

describe("Phase 4: Drawings Revision Control & Site Issue Tracking Suite", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let ownerCtx: TenantContext;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;

  let ownerMember: any;
  let adminMember: any;
  let employeeMember: any;

  let project: any;
  let testFile: any;
  let testFile2: any;

  let createdDrawingId: string;
  let r0VersionId: string;
  let r1VersionId: string;
  let createdIssueId: string;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant);

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    ownerMember = members.find((m) => m.role === TenantRole.OWNER);
    adminMember = members.find((m) => m.role === TenantRole.ADMIN);
    employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(ownerMember && adminMember && employeeMember);

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

    project = await prisma.project.findFirst({
      where: { tenantId: tenant.id },
    });
    assert.ok(project);

    // Create a mock private file for drawing attachment
    testFile = await prisma.privateFile.create({
      data: {
        tenantId: tenant.id,
        uploaderId: adminMember.id,
        fileName: "drawing_r0.pdf",
        storagePath: "/storage/drawings/drawing_r0.pdf",
        mimeType: "application/pdf",
        byteSize: 1024,
      },
    });

    testFile2 = await prisma.privateFile.create({
      data: {
        tenantId: tenant.id,
        uploaderId: adminMember.id,
        fileName: "drawing_r1.pdf",
        storagePath: "/storage/drawings/drawing_r1.pdf",
        mimeType: "application/pdf",
        byteSize: 2048,
      },
    });
  });

  after(async () => {
    if (createdDrawingId) {
      await prisma.document.delete({ where: { id: createdDrawingId } }).catch(() => {});
    }
    if (createdIssueId) {
      await prisma.studioSiteIssue.delete({ where: { id: createdIssueId } }).catch(() => {});
    }
    if (testFile) {
      await prisma.privateFile.delete({ where: { id: testFile.id } }).catch(() => {});
    }
    if (testFile2) {
      await prisma.privateFile.delete({ where: { id: testFile2.id } }).catch(() => {});
    }
  });

  test("TEST-DRAW-01: Creating drawing initializes R0 in DRAFT state", async () => {
    const drawing = await createDrawing(adminCtx, {
      projectId: project.id,
      title: "Ground Floor Plan (Test Drawing)",
      drawingNumber: "AR-101",
      discipline: "Architectural",
      documentType: "Working Drawing",
      fileId: testFile.id,
    });

    assert.ok(drawing.document);
    assert.ok(drawing.version);
    createdDrawingId = drawing.document.id;
    r0VersionId = drawing.version.id;

    assert.strictEqual(drawing.version.revision, "R0");
    assert.strictEqual(drawing.version.approvalState, DocumentApprovalState.DRAFT);
  });

  test("TEST-DRAW-02: Approving R1 atomically supersedes previous approved R0", async () => {
    // 1. Submit R0 for review and approve it
    await submitRevisionForReview(adminCtx, r0VersionId);
    await reviewRevision(ownerCtx, r0VersionId, "APPROVED", "Approved R0 by Owner");

    const r0AfterApproval = await prisma.documentVersion.findUnique({ where: { id: r0VersionId } });
    assert.strictEqual(r0AfterApproval?.approvalState, DocumentApprovalState.APPROVED);

    // 2. Upload R1
    const r1 = await uploadNewRevision(adminCtx, {
      documentId: createdDrawingId,
      fileId: testFile2.id,
      issuePurpose: "Revision for MEP Coordination",
    });
    r1VersionId = r1.id;
    assert.strictEqual(r1.revision, "R1");
    assert.strictEqual(r1.approvalState, DocumentApprovalState.DRAFT);

    // 3. Verify that site views still show R0 as latest approved while R1 is in draft
    const drawings = await findDrawings(adminCtx, { projectId: project.id });
    const targetDrawing = drawings.find((d) => d.id === createdDrawingId);
    assert.strictEqual(targetDrawing?.latestApprovedVersion?.id, r0VersionId, "Draft R1 must never replace latest approved R0 in site views");

    // 4. Submit and approve R1
    await submitRevisionForReview(adminCtx, r1VersionId);
    await reviewRevision(ownerCtx, r1VersionId, "APPROVED", "Approved R1 by Owner");

    // 5. Verify R1 is now APPROVED and R0 is marked SUPERSEDED
    const r1AfterApproval = await prisma.documentVersion.findUnique({ where: { id: r1VersionId } });
    const r0AfterR1Approval = await prisma.documentVersion.findUnique({ where: { id: r0VersionId } });

    assert.strictEqual(r1AfterApproval?.approvalState, DocumentApprovalState.APPROVED);
    assert.strictEqual(r0AfterR1Approval?.approvalState, DocumentApprovalState.SUPERSEDED);
    assert.strictEqual(r0AfterR1Approval?.supersededById, r1VersionId);
  });

  test("TEST-ISSUE-01: Site issue lifecycle from OPEN to VERIFIED_AND_CLOSED", async () => {
    // 1. Create site issue
    const issue = await createSiteIssue(adminCtx, {
      projectId: project.id,
      siteLocation: "Living Room Column C3",
      title: "Honeycombing observed after formwork shuttering removal",
      category: "CIVIL",
      priority: "HIGH",
      dueDate: "2026-10-25",
    });

    assert.ok(issue);
    assert.ok(issue.referenceNumber.startsWith("ISSUE-"));
    createdIssueId = issue.id;

    // 2. Assign and move to IN_PROGRESS
    const updated = await updateSiteIssue(adminCtx, createdIssueId, {
      status: "IN_PROGRESS",
      responsibleEmployeeId: employeeMember.employee.id,
    });
    assert.strictEqual(updated.status, "IN_PROGRESS");

    // 3. Submit remedial evidence
    const readyForVerif = await updateSiteIssue(adminCtx, createdIssueId, {
      status: "READY_FOR_VERIFICATION",
      resolutionNotes: "Epoxy pressure grouting completed by specialist waterproofing team.",
    });
    assert.strictEqual(readyForVerif.status, "READY_FOR_VERIFICATION");

    // 4. Verify and close
    const closed = await verifySiteIssue(ownerCtx, createdIssueId, "CLOSE");
    assert.strictEqual(closed.status, "CLOSED");
    assert.strictEqual(closed.verifierId, ownerMember.id);
  });

  test("TEST-ISSUE-02: Reopening a closed issue requires a mandatory reason", async () => {
    // Reopen without reason must fail
    await assert.rejects(
      async () => {
        await verifySiteIssue(ownerCtx, createdIssueId, "REOPEN", "");
      },
      /reason is mandatory/
    );

    // Reopen with valid reason
    const reopened = await verifySiteIssue(
      ownerCtx,
      createdIssueId,
      "REOPEN",
      "Core sampling showed insufficient mortar bonding; re-apply finish."
    );
    assert.strictEqual(reopened.status, "REOPENED");
    assert.strictEqual(reopened.reopenReason, "Core sampling showed insufficient mortar bonding; re-apply finish.");
  });

  test("TEST-ISSUE-03: Converting site issue to task is idempotent", async () => {
    const res1 = await convertSiteIssueToTask(adminCtx, createdIssueId);
    assert.ok(res1.task);
    assert.strictEqual(res1.alreadyConverted, false);

    // Re-converting must return existing task without duplicating
    const res2 = await convertSiteIssueToTask(adminCtx, createdIssueId);
    assert.strictEqual(res2.task.id, res1.task.id);
    assert.strictEqual(res2.alreadyConverted, true);

    // Clean up created task
    await prisma.task.delete({ where: { id: res1.task.id } }).catch(() => {});
  });
});
