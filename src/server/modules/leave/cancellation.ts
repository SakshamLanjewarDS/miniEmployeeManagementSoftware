import { prisma } from "../../db/prisma";
import {
  TenantContext,
  assertAdminOrOwner,
  assertTenantAccess,
  ForbiddenException,
  isAdminOrOwner,
} from "../../tenancy/context";
import { enqueueLeaveDecisionNotification } from "../notifications/email";

export interface LeaveCancellationRequestInput {
  leaveRequestId: string;
  reason: string;
}

export interface ReviewCancellationInput {
  cancellationRequestId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

/**
 * Submits an employee request to cancel an approved leave.
 * While pending or rejected, the original leave remains APPROVED and continues consuming quota.
 */
export async function requestLeaveCancellation(
  context: TenantContext,
  input: LeaveCancellationRequestInput
) {
  if (!input.reason || !input.reason.trim()) {
    throw new Error("A reason is required to request leave cancellation");
  }

  // 1. Fetch leave request
  const leave = await prisma.studioLeaveRequest.findFirst({
    where: {
      id: input.leaveRequestId,
      tenantId: context.tenantId,
      deletedAt: null,
    },
    include: {
      employee: {
        include: {
          membership: true,
        },
      },
      cancellationRequests: {
        where: { status: "PENDING" },
      },
    },
  });

  if (!leave) {
    throw new Error("Leave request not found");
  }

  // 2. Authorization: Employee can only request cancellation for their own leave
  if (!isAdminOrOwner(context)) {
    if (leave.employee.membershipId !== context.membershipId) {
      throw new ForbiddenException("You can only request cancellation of your own approved leave");
    }
  }

  // 3. Must be in APPROVED state
  if (leave.status !== "APPROVED") {
    throw new Error(`Only approved leave can be cancelled. Current status is ${leave.status}.`);
  }

  // 4. Check if pending cancellation request already exists
  if (leave.cancellationRequests.length > 0) {
    throw new Error("A cancellation request is already pending for this leave record.");
  }

  // 5. Check if period is locked in finalized payroll
  const startYear = leave.startDate.getFullYear();
  const startMonth = leave.startDate.getMonth() + 1;
  const periodKey = `${startYear}-${String(startMonth).padStart(2, "0")}`;

  const lockedPeriod = await prisma.studioPayrollPeriod.findFirst({
    where: {
      tenantId: context.tenantId,
      periodKey,
      isLocked: true,
    },
  });

  if (lockedPeriod) {
    throw new Error(
      `Cannot directly cancel leave from finalized and locked payroll period (${periodKey}). Submit an adjustment voucher instead.`
    );
  }

  // 6. Create cancellation request
  const cancellation = await prisma.studioLeaveCancellationRequest.create({
    data: {
      tenantId: context.tenantId,
      leaveRequestId: leave.id,
      employeeId: leave.employeeId,
      reason: input.reason.trim(),
      status: "PENDING",
    },
  });

  return cancellation;
}

/**
 * Reviews a leave cancellation request (Owner/Admin only).
 * If approved: original leave is marked CANCELLED atomically and allocation is released.
 * If rejected: original leave remains APPROVED.
 */
export async function reviewLeaveCancellation(
  context: TenantContext,
  input: ReviewCancellationInput
) {
  assertAdminOrOwner(context);

  if (input.decision === "REJECT" && (!input.rejectionReason || !input.rejectionReason.trim())) {
    throw new Error("A rejection reason is required to reject a leave cancellation request");
  }

  return await prisma.$transaction(async (tx) => {
    const cancellation = await tx.studioLeaveCancellationRequest.findFirst({
      where: {
        id: input.cancellationRequestId,
        tenantId: context.tenantId,
      },
      include: {
        leaveRequest: {
          include: {
            employee: {
              include: {
                membership: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cancellation) {
      throw new Error("Cancellation request not found");
    }

    if (cancellation.status !== "PENDING") {
      throw new Error(`Cancellation request has already been ${cancellation.status.toLowerCase()}`);
    }

    const now = new Date();

    if (input.decision === "REJECT") {
      const updated = await tx.studioLeaveCancellationRequest.update({
        where: { id: cancellation.id },
        data: {
          status: "REJECTED",
          reviewedById: context.membershipId,
          reviewedAt: now,
          rejectionReason: input.rejectionReason?.trim() || "Rejected by studio leadership",
        },
      });

      return {
        cancellation: updated,
        leaveStatus: cancellation.leaveRequest.status,
      };
    }

    // Decision === "APPROVE"
    // 1. Mark cancellation request APPROVED
    const updatedCancellation = await tx.studioLeaveCancellationRequest.update({
      where: { id: cancellation.id },
      data: {
        status: "APPROVED",
        reviewedById: context.membershipId,
        reviewedAt: now,
      },
    });

    // 2. Mark original leave request CANCELLED atomically
    const updatedLeave = await tx.studioLeaveRequest.update({
      where: { id: cancellation.leaveRequestId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledById: context.membershipId,
        cancellationReason: `Cancellation approved: ${cancellation.reason}`,
      },
    });

    // 3. Enqueue transactional notification
    const recipientEmail = cancellation.leaveRequest.employee.membership.user.email;
    const recipientName = cancellation.leaveRequest.employee.membership.user.fullName;
    await enqueueLeaveDecisionNotification(tx, {
      tenantId: context.tenantId,
      recipientEmail,
      recipientName,
      action: "Approved Cancellation",
      days: Number(cancellation.leaveRequest.days),
      startDate: cancellation.leaveRequest.startDate.toISOString().split("T")[0],
      endDate: cancellation.leaveRequest.endDate.toISOString().split("T")[0],
      notes: "Your leave cancellation request was approved.",
    });

    return {
      cancellation: updatedCancellation,
      leaveStatus: updatedLeave.status,
    };
  });
}

/**
 * Lists leave cancellation requests for Owner/Admin or Employee.
 */
export async function listLeaveCancellationRequests(
  context: TenantContext,
  params?: { status?: string; employeeId?: string }
) {
  const where: any = {
    tenantId: context.tenantId,
  };

  if (!isAdminOrOwner(context)) {
    // Restrict employee to only their own cancellations
    const myEmp = await prisma.employee.findFirst({
      where: { tenantId: context.tenantId, membershipId: context.membershipId },
    });
    if (!myEmp) return [];
    where.employeeId = myEmp.id;
  } else if (params?.employeeId) {
    where.employeeId = params.employeeId;
  }

  if (params?.status) {
    where.status = params.status;
  }

  return await prisma.studioLeaveCancellationRequest.findMany({
    where,
    include: {
      employee: {
        include: {
          membership: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      },
      leaveRequest: true,
      reviewedBy: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
