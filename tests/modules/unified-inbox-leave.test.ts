import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "../helpers/test-db";
import {
  getOwnerDecisionInbox,
  executeInboxDecision,
} from "../../src/server/modules/inbox/service";
import { TenantContext } from "../../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";

describe("Phase 2: Unified Approval Inbox — Leave & Cancellation Integration", () => {
  assertSafeTestDatabase();

  let tenant: any;
  let ownerCtx: TenantContext;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;

  let ownerMember: any;
  let adminMember: any;
  let employeeMember: any;

  let testLeaveRequestId: string;
  let testCancellationReqId: string;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    ownerMember = members.find((m) => m.role === TenantRole.OWNER);
    adminMember = members.find((m) => m.role === TenantRole.ADMIN) || ownerMember;
    employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);

    assert.ok(ownerMember, "Owner member must exist");
    assert.ok(adminMember, "Admin/Owner member must exist");
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

    // Clean up any stale test leaves
    await prisma.studioLeaveCancellationRequest.deleteMany({
      where: { tenantId: tenant.id, reason: { contains: "TEST_INBOX_" } },
    });
    await prisma.studioLeaveRequest.deleteMany({
      where: { tenantId: tenant.id, reason: { contains: "TEST_INBOX_" } },
    });
  });

  after(async () => {
    await prisma.studioLeaveCancellationRequest.deleteMany({
      where: { tenantId: tenant.id, reason: { contains: "TEST_INBOX_" } },
    });
    await prisma.studioLeaveRequest.deleteMany({
      where: { tenantId: tenant.id, reason: { contains: "TEST_INBOX_" } },
    });
  });

  test("TEST-INBOX-LEAVE-01: Pending leave request appears in Unified Approval Inbox", async () => {
    // Create a pending leave application for employee
    const leave = await prisma.studioLeaveRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: employeeMember.employee.id,
        employeeNameRaw: employeeMember.user.fullName,
        employeeEmailRaw: employeeMember.user.email,
        startDate: new Date("2026-11-10"),
        endDate: new Date("2026-11-11"),
        days: 2.0,
        status: "PENDING",
        leaveType: "CASUAL",
        reason: "TEST_INBOX_LEAVE_01 Family wedding celebration",
        isPaidEligible: true,
        isHalfDay: false,
        isHourly: false,
        sessionType: "FULL_DAY",
        version: 1,
        sourceSystem: "MANUAL",
      },
    });
    testLeaveRequestId = leave.id;

    const inbox = await getOwnerDecisionInbox(adminCtx, { tab: "all-authorized" });
    const leaveItem = inbox.items.find((i) => i.rawId === leave.id && i.type === "LEAVE_APPLICATION");

    assert.ok(leaveItem, "Pending leave application must appear in Unified Decision Inbox");
    assert.strictEqual(leaveItem.typeLabel, "Leave Application");
    assert.strictEqual(leaveItem.requesterName, employeeMember.user.fullName);
    assert.strictEqual(leaveItem.canApprove, true, "Admin should be able to approve employee leave");
    assert.strictEqual(inbox.counts.leaveApplications >= 1, true);
  });

  test("TEST-INBOX-LEAVE-02: Executive decision APPROVE via inbox executes leave approval", async () => {
    const result = await executeInboxDecision(ownerCtx, {
      type: "LEAVE_APPLICATION",
      id: testLeaveRequestId,
      action: "APPROVE",
      feedback: "Approved by Owner from unified inbox",
    });

    assert.ok(result, "Decision execution must return approved result");

    const updated = await prisma.studioLeaveRequest.findUnique({
      where: { id: testLeaveRequestId },
    });
    assert.strictEqual(updated?.status, "APPROVED");
    assert.strictEqual(updated?.reviewedById, ownerMember.id);
  });

  test("TEST-INBOX-LEAVE-03: Leave cancellation appears in inbox and can be approved", async () => {
    // Create a pending cancellation request for the approved leave
    const cancellation = await prisma.studioLeaveCancellationRequest.create({
      data: {
        tenantId: tenant.id,
        leaveRequestId: testLeaveRequestId,
        employeeId: employeeMember.employee.id,
        reason: "TEST_INBOX_Trip cancelled due to change in dates",
        status: "PENDING",
      },
    });
    testCancellationReqId = cancellation.id;

    const inbox = await getOwnerDecisionInbox(adminCtx, { tab: "all-authorized" });
    const cancelItem = inbox.items.find((i) => i.rawId === cancellation.id && i.type === "LEAVE_CANCELLATION");

    assert.ok(cancelItem, "Pending cancellation request must appear in Unified Decision Inbox");
    assert.strictEqual(cancelItem.typeLabel, "Leave Cancellation");
    assert.strictEqual(cancelItem.canApprove, true);

    // Approve cancellation from inbox
    const decisionResult = await executeInboxDecision(adminCtx, {
      type: "LEAVE_CANCELLATION",
      id: testCancellationReqId,
      action: "APPROVE",
      feedback: "Cancellation verified and approved by Admin",
    });

    assert.ok(decisionResult);

    const updatedCancellation = await prisma.studioLeaveCancellationRequest.findUnique({
      where: { id: testCancellationReqId },
    });
    assert.strictEqual(updatedCancellation?.status, "APPROVED");

    const updatedLeave = await prisma.studioLeaveRequest.findUnique({
      where: { id: testLeaveRequestId },
    });
    assert.strictEqual(updatedLeave?.status, "CANCELLED");
  });
});
