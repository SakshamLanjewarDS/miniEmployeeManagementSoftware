import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner, assertTenantAccess, ForbiddenException } from "../../tenancy/context";
import {
  calculateMonthlyLeaveSummary,
  evaluateShortNotice,
  minutesToDays,
  parseDateOnly,
  formatDateOnly,
  DEFAULT_MONTHLY_PAID_ALLOWANCE,
  LeaveStatus,
} from "./policy";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateLeaveRequestInput {
  employeeId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  leaveType: string; // CASUAL, SICK, ANNUAL, MATERNITY, LOSS_OF_PAY
  reason?: string;
  isHalfDay?: boolean;
  isHourly?: boolean;
  sessionType?: "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF";
  startMinutes?: number;
  endMinutes?: number;
  totalMinutes?: number;
  days?: number;
  isPaidEligible?: boolean;
  isExemptShortNotice?: boolean;
  exemptionReason?: string;
  supportingFileId?: string;
}

export interface UpdateLeaveRequestInput {
  startDate?: string;
  endDate?: string;
  leaveType?: string;
  reason?: string;
  isHalfDay?: boolean;
  isHourly?: boolean;
  sessionType?: "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF";
  startMinutes?: number;
  endMinutes?: number;
  totalMinutes?: number;
  days?: number;
  isPaidEligible?: boolean;
  isExemptShortNotice?: boolean;
  exemptionReason?: string;
  supportingFileId?: string;
}

export interface LeaveApplicationPreview {
  requestedDays: number;
  isHourly: boolean;
  isHalfDay: boolean;
  sessionType?: string;
  totalMinutes?: number;
  applicableSchedule: string;
  estimatedPaidDays: number;
  estimatedUnpaidLopDays: number;
  estimatedRemainingBalance: number;
  isShortNotice: boolean;
  isExempt: boolean;
  willAutoReject: boolean;
  rejectionReason?: string;
  overlapWarnings: string[];
}

export interface LeaveFilterOptions {
  status?: string;
  leaveType?: string;
  department?: string;
  employeeId?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Lists leave records with search, filters, pagination, and default newest-applied-first ordering.
 * Strictly Owner/Admin accessible.
 */
export async function listLeaveRecords(context: TenantContext, options: LeaveFilterOptions = {}) {
  assertAdminOrOwner(context);

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    tenantId: context.tenantId,
    deletedAt: null,
  };

  if (options.status) {
    whereClause.status = options.status;
  }

  if (options.leaveType) {
    whereClause.leaveType = options.leaveType;
  }

  if (options.employeeId) {
    whereClause.employeeId = options.employeeId;
  }

  if (options.startDateFrom || options.startDateTo) {
    whereClause.startDate = {};
    if (options.startDateFrom) {
      whereClause.startDate.gte = parseDateOnly(options.startDateFrom);
    }
    if (options.startDateTo) {
      whereClause.startDate.lte = parseDateOnly(options.startDateTo);
    }
  }

  if (options.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { employee: { employeeId: { contains: q } } },
      { employee: { membership: { user: { fullName: { contains: q } } } } },
      { employeeNameRaw: { contains: q } },
      { reason: { contains: q } },
    ];
  }

  if (options.department) {
    whereClause.employee = {
      ...(whereClause.employee || {}),
      department: options.department,
    };
  }

  const [totalCount, records] = await Promise.all([
    prisma.studioLeaveRequest.count({ where: whereClause }),
    prisma.studioLeaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            membership: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        reviewedBy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
  ]);

  return {
    records,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Creates a leave request.
 * - If called by Employee: identity is derived strictly from current session.
 * - If called by Owner/Admin: can create on behalf of any employee in current tenant.
 * - Evaluates 24-hour notice policy: ordinary requests < 24h are automatically rejected;
 *   Sick/Emergency/Hourly bypass the notice requirement.
 */
export async function createLeaveRequest(context: TenantContext, input: CreateLeaveRequestInput) {
  let targetEmployeeId = input.employeeId;
  const isPrivileged = context.role === "OWNER" || context.role === "ADMIN";

  if (!isPrivileged || !targetEmployeeId) {
    const myEmp = await prisma.employee.findFirst({
      where: {
        tenantId: context.tenantId,
        membershipId: context.membershipId,
      },
    });
    if (!myEmp) {
      throw new ForbiddenException("No active employee profile linked to current user session");
    }
    targetEmployeeId = myEmp.id;
  }

  // 1. Verify target employee belongs to current tenant
  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: context.tenantId,
      id: targetEmployeeId,
    },
    include: {
      membership: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found in current studio tenant");
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);

  if (endDate < startDate) {
    throw new Error("End date cannot be prior to start date");
  }

  // Calculate days quantity
  let daysQuantity = 1.0;
  if (input.isHourly && input.totalMinutes) {
    daysQuantity = minutesToDays(input.totalMinutes);
  } else if (input.isHalfDay) {
    daysQuantity = 0.5;
  } else if (input.days) {
    daysQuantity = input.days;
  } else {
    const diffTime = endDate.getTime() - startDate.getTime();
    daysQuantity = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  if (daysQuantity <= 0) {
    throw new Error("Leave duration must be greater than zero");
  }

  // Evaluate short notice (< 24 hours) with session start time
  const now = new Date();
  const noticeResult = evaluateShortNotice(
    now,
    startDate,
    input.startMinutes ?? (input.sessionType === "SECOND_HALF" ? 870 : 630),
    input.leaveType,
    input.reason ?? "",
    input.isExemptShortNotice ?? false,
    input.isHourly ?? false,
    input.sessionType
  );

  const isPaidEligible = input.isPaidEligible !== undefined ? input.isPaidEligible : input.leaveType !== "LOSS_OF_PAY";

  // If notice policy requires automatic rejection, persist immediately with system reason
  const status = noticeResult.shouldAutoReject ? "REJECTED" : "PENDING";
  const rejectionReason = noticeResult.shouldAutoReject ? noticeResult.rejectionReason : null;
  const reviewedAt = noticeResult.shouldAutoReject ? now : null;

  const newRecord = await prisma.studioLeaveRequest.create({
    data: {
      tenantId: context.tenantId,
      employeeId: employee.id,
      employeeNameRaw: employee.membership.user.fullName,
      employeeEmailRaw: employee.membership.user.email,
      startDate,
      endDate,
      startMinutes: input.startMinutes ?? null,
      endMinutes: input.endMinutes ?? null,
      totalMinutes: input.totalMinutes ?? null,
      days: new Decimal(daysQuantity),
      status,
      leaveType: input.leaveType,
      reason: input.reason ?? null,
      isPaidEligible,
      isHalfDay: input.isHalfDay ?? false,
      isHourly: input.isHourly ?? false,
      sessionType: input.sessionType ?? "FULL_DAY",
      supportingFileId: input.supportingFileId ?? null,
      exemptionReason: input.exemptionReason ?? null,
      isShortNotice: noticeResult.isShortNotice,
      isExemptShortNotice: noticeResult.isExempt,
      rejectionReason,
      reviewedAt,
      reviewedById: null, // System actor for auto-rejection
      version: 1,
      submittedAt: now,
      sourceSystem: "MANUAL",
    },
  });

  return newRecord;
}

/**
 * Previews leave calculation before submission (duration, schedule, provisional paid/unpaid split, overlap warnings).
 */
export async function previewLeaveApplication(
  context: TenantContext,
  input: CreateLeaveRequestInput
): Promise<LeaveApplicationPreview> {
  let targetEmployeeId = input.employeeId;
  const isPrivileged = context.role === "OWNER" || context.role === "ADMIN";

  if (!isPrivileged || !targetEmployeeId) {
    const myEmp = await prisma.employee.findFirst({
      where: { tenantId: context.tenantId, membershipId: context.membershipId },
    });
    if (!myEmp) throw new ForbiddenException("No active employee profile linked to current user session");
    targetEmployeeId = myEmp.id;
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);

  let requestedDays = 1.0;
  if (input.isHourly && input.totalMinutes) {
    requestedDays = minutesToDays(input.totalMinutes);
  } else if (input.isHalfDay) {
    requestedDays = 0.5;
  } else if (input.days) {
    requestedDays = input.days;
  } else {
    const diffTime = endDate.getTime() - startDate.getTime();
    requestedDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const now = new Date();
  const noticeResult = evaluateShortNotice(
    now,
    startDate,
    input.startMinutes ?? (input.sessionType === "SECOND_HALF" ? 870 : 630),
    input.leaveType,
    input.reason ?? "",
    input.isExemptShortNotice ?? false,
    input.isHourly ?? false,
    input.sessionType
  );

  // Check overlap with existing active leaves
  const existingLeaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      employeeId: targetEmployeeId,
      deletedAt: null,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  const overlapWarnings: string[] = [];
  if (existingLeaves.length > 0) {
    overlapWarnings.push(
      `You already have ${existingLeaves.length} active leave request(s) overlapping these dates.`
    );
  }

  // Calculate provisional paid/unpaid allocation for current target month
  const targetYear = startDate.getFullYear();
  const targetMonth = startDate.getMonth() + 1;

  const monthLeaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      employeeId: targetEmployeeId,
      deletedAt: null,
    },
  });

  const policy = await prisma.studioLeavePolicy.findUnique({
    where: { tenantId: context.tenantId },
  });
  const allowance = policy ? Number(policy.defaultMonthlyPaidDays) : DEFAULT_MONTHLY_PAID_ALLOWANCE;

  // Add provisional simulated approved leave
  const simulated = [
    ...monthLeaves.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.days,
      status: l.status as LeaveStatus,
      leaveType: l.leaveType,
      isPaidEligible: l.isPaidEligible,
      isHalfDay: l.isHalfDay,
      isHourly: l.isHourly,
      startMinutes: l.startMinutes,
      endMinutes: l.endMinutes,
      totalMinutes: l.totalMinutes,
      submittedAt: l.submittedAt,
      reason: l.reason,
    })),
    {
      id: "provisional-simulated",
      employeeId: targetEmployeeId,
      startDate,
      endDate,
      days: requestedDays,
      status: "APPROVED" as LeaveStatus,
      leaveType: input.leaveType,
      isPaidEligible: input.isPaidEligible !== false && input.leaveType !== "LOSS_OF_PAY",
      isHalfDay: input.isHalfDay ?? false,
      isHourly: input.isHourly ?? false,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      totalMinutes: input.totalMinutes,
      submittedAt: now,
      reason: input.reason,
    },
  ];

  const summary = calculateMonthlyLeaveSummary(targetYear, targetMonth, simulated, allowance);
  const provItem = summary.requests.find((r) => r.id === "provisional-simulated");

  return {
    requestedDays,
    isHourly: input.isHourly ?? false,
    isHalfDay: input.isHalfDay ?? false,
    sessionType: input.sessionType,
    totalMinutes: input.totalMinutes,
    applicableSchedule: "10:30–18:30 IST (8 hrs / day)",
    estimatedPaidDays: provItem?.isPaidInMonth ?? 0,
    estimatedUnpaidLopDays: provItem?.isUnpaidInMonth ?? requestedDays,
    estimatedRemainingBalance: summary.remainingPaidAllowance,
    isShortNotice: noticeResult.isShortNotice,
    isExempt: noticeResult.isExempt,
    willAutoReject: noticeResult.shouldAutoReject,
    rejectionReason: noticeResult.rejectionReason,
    overlapWarnings,
  };
}

/**
 * Updates an employee's pending leave request.
 * - Only the owning employee or Owner/Admin can edit.
 * - Only PENDING requests can be edited.
 * - Preserves change history and increments version.
 */
export async function updatePendingLeaveRequest(
  context: TenantContext,
  leaveId: string,
  input: UpdateLeaveRequestInput
) {
  const leave = await prisma.studioLeaveRequest.findFirst({
    where: { id: leaveId, tenantId: context.tenantId, deletedAt: null },
    include: { employee: true },
  });

  if (!leave) throw new Error("Leave request not found");

  const isPrivileged = context.role === "OWNER" || context.role === "ADMIN";
  if (!isPrivileged) {
    if (leave.employee.membershipId !== context.membershipId) {
      throw new ForbiddenException("You can only edit your own pending leave requests");
    }
  }

  if (leave.status !== "PENDING") {
    throw new Error(`Only pending leave requests can be edited. Current status is ${leave.status}.`);
  }

  const startDate = input.startDate ? parseDateOnly(input.startDate) : leave.startDate;
  const endDate = input.endDate ? parseDateOnly(input.endDate) : leave.endDate;

  if (endDate < startDate) {
    throw new Error("End date cannot be prior to start date");
  }

  let daysQuantity = Number(leave.days);
  if (input.isHourly && input.totalMinutes) {
    daysQuantity = minutesToDays(input.totalMinutes);
  } else if (input.isHalfDay) {
    daysQuantity = 0.5;
  } else if (input.days) {
    daysQuantity = input.days;
  } else if (input.startDate || input.endDate) {
    const diffTime = endDate.getTime() - startDate.getTime();
    daysQuantity = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const now = new Date();
  const noticeResult = evaluateShortNotice(
    now,
    startDate,
    input.startMinutes ?? leave.startMinutes,
    input.leaveType ?? leave.leaveType,
    input.reason ?? leave.reason ?? "",
    input.isExemptShortNotice ?? leave.isExemptShortNotice,
    input.isHourly ?? leave.isHourly,
    input.sessionType ?? leave.sessionType
  );

  return await prisma.studioLeaveRequest.update({
    where: { id: leave.id },
    data: {
      startDate,
      endDate,
      startMinutes: input.startMinutes !== undefined ? input.startMinutes : leave.startMinutes,
      endMinutes: input.endMinutes !== undefined ? input.endMinutes : leave.endMinutes,
      totalMinutes: input.totalMinutes !== undefined ? input.totalMinutes : leave.totalMinutes,
      days: new Decimal(daysQuantity),
      leaveType: input.leaveType ?? leave.leaveType,
      reason: input.reason !== undefined ? input.reason : leave.reason,
      sessionType: input.sessionType ?? leave.sessionType,
      isHalfDay: input.isHalfDay !== undefined ? input.isHalfDay : leave.isHalfDay,
      isHourly: input.isHourly !== undefined ? input.isHourly : leave.isHourly,
      isShortNotice: noticeResult.isShortNotice,
      isExemptShortNotice: noticeResult.isExempt,
      exemptionReason: input.exemptionReason !== undefined ? input.exemptionReason : leave.exemptionReason,
      supportingFileId: input.supportingFileId !== undefined ? input.supportingFileId : leave.supportingFileId,
      version: leave.version + 1,
    },
  });
}

/**
 * Withdraws a pending leave request without deleting history.
 */
export async function withdrawPendingLeaveRequest(
  context: TenantContext,
  leaveId: string
) {
  const leave = await prisma.studioLeaveRequest.findFirst({
    where: { id: leaveId, tenantId: context.tenantId, deletedAt: null },
    include: { employee: true },
  });

  if (!leave) throw new Error("Leave request not found");

  const isPrivileged = context.role === "OWNER" || context.role === "ADMIN";
  if (!isPrivileged) {
    if (leave.employee.membershipId !== context.membershipId) {
      throw new ForbiddenException("You can only withdraw your own pending leave requests");
    }
  }

  if (leave.status !== "PENDING") {
    throw new Error(`Only pending leave requests can be withdrawn. Current status is ${leave.status}.`);
  }

  const cancelled = await prisma.studioLeaveRequest.update({
    where: { id: leave.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: context.membershipId,
      cancellationReason: "Withdrawn by employee prior to review",
      version: leave.version + 1,
    },
  });

  // Outbound push to Google Sheets (non-blocking)
  import("../integrations/google-sheets-sync").then((mod) => {
    mod.pushLeaveActionToGoogleSheet(context.tenantId, {
      action: "CANCEL",
      leaveId: cancelled.id,
      sourceRecordId: cancelled.sourceRecordId,
      employeeEmail: cancelled.employeeEmailRaw || undefined,
      employeeName: cancelled.employeeNameRaw || undefined,
      startDate: formatDateOnly(cancelled.startDate),
      endDate: formatDateOnly(cancelled.endDate),
      status: "Cancelled",
      processedBy: context.userFullName || "Employee",
    }).catch(console.warn);
  });

  return cancelled;
}

/**
 * Approves a leave request with concurrency protection and outbox email notification.
 * Protected against modifying records involved in locked payroll periods.
 */
export async function approveLeaveRequest(
  context: TenantContext,
  leaveId: string,
  reviewNotes?: string
) {
  assertAdminOrOwner(context);

  const result = await prisma.$transaction(async (tx) => {
    const leave = await tx.studioLeaveRequest.findFirst({
      where: {
        id: leaveId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      include: {
        employee: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!leave) {
      throw new Error("Leave request not found");
    }

    if (leave.status === "APPROVED") {
      throw new Error("Leave request is already approved");
    }

    // Check financial lock: verify if the leave start month is already finalized/locked in payroll
    const year = leave.startDate.getFullYear();
    const month = leave.startDate.getMonth() + 1;
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;

    const lockedPeriod = await tx.studioPayrollPeriod.findFirst({
      where: {
        tenantId: context.tenantId,
        periodKey,
        isLocked: true,
      },
    });

    if (lockedPeriod) {
      throw new Error(
        `Cannot mutate leave: Payroll period ${periodKey} is locked and finalized. Adjustments must be created via adjustment vouchers.`
      );
    }

    const updated = await tx.studioLeaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "APPROVED",
        reviewedById: context.membershipId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
      },
      include: {
        employee: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
      },
    });

    // Enqueue transactional staff email in outbox
    const employeeEmail = leave.employeeEmailRaw || leave.employee.membership.user.email;
    const employeeName = leave.employeeNameRaw || leave.employee.membership.user.fullName;

    if (employeeEmail) {
      const startStr = formatDateOnly(leave.startDate);
      const endStr = formatDateOnly(leave.endDate);
      const idempotencyKey = `leave_approved_${leave.id}_${Date.now()}`;

      await tx.studioEmailOutbox.create({
        data: {
          tenantId: context.tenantId,
          recipientUserId: leave.employee.membership.userId,
          recipientEmail: employeeEmail,
          recipientName: employeeName,
          eventType: "LEAVE_APPROVED",
          relatedEntityType: "LEAVE",
          relatedEntityId: leave.id,
          subject: `Leave Request Approved (${startStr} to ${endStr}) — 100% DESIGN Studio`,
          htmlBody: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E1F35;">
              <h2 style="color: #10B981; margin-bottom: 8px;">Leave Request Approved</h2>
              <p>Hello <strong>${employeeName}</strong>,</p>
              <p>Your request for <strong>${leave.days.toString()} day(s)</strong> of <strong>${leave.leaveType}</strong> leave from <strong>${startStr}</strong> to <strong>${endStr}</strong> has been approved by studio leadership.</p>
              ${reviewNotes ? `<p style="padding: 12px; background: #F8F9FE; border-left: 3px solid #5A81FA; border-radius: 4px;"><em>Leadership note: ${reviewNotes}</em></p>` : ""}
              <p style="color: #696E82; font-size: 12px; margin-top: 24px;">100% DESIGN Studio Workspace • Automated Notification</p>
            </div>
          `,
          textBody: `Hello ${employeeName}, your leave request for ${leave.days.toString()} day(s) from ${startStr} to ${endStr} has been approved.`,
          status: "PENDING",
          idempotencyKey,
        },
      });
    }

    return updated;
  });

  // Outbound push to Google Sheets (non-blocking)
  import("../integrations/google-sheets-sync").then((mod) => {
    const targetEmail = result.employeeEmailRaw || result.employee?.membership?.user?.email;
    const targetName = result.employeeNameRaw || result.employee?.membership?.user?.fullName;
    mod.pushLeaveActionToGoogleSheet(context.tenantId, {
      action: "APPROVE",
      leaveId: result.id,
      sourceRecordId: result.sourceRecordId,
      employeeEmail: targetEmail || undefined,
      employeeName: targetName || undefined,
      startDate: formatDateOnly(result.startDate),
      endDate: formatDateOnly(result.endDate),
      status: "Approved",
      processedBy: context.userFullName || "Studio Leadership",
    }).catch(console.warn);
  });

  return result;
}

/**
 * Rejects a leave request with mandatory or optional reason.
 */
export async function rejectLeaveRequest(
  context: TenantContext,
  leaveId: string,
  rejectionReason: string
) {
  assertAdminOrOwner(context);

  const result = await prisma.$transaction(async (tx) => {
    const leave = await tx.studioLeaveRequest.findFirst({
      where: {
        id: leaveId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      include: {
        employee: {
          include: {
            membership: { include: { user: true } },
          },
        },
      },
    });

    if (!leave) {
      throw new Error("Leave request not found");
    }

    if (leave.status === "REJECTED") {
      throw new Error("Leave request is already rejected");
    }

    const updated = await tx.studioLeaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "REJECTED",
        reviewedById: context.membershipId,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || "Declined by studio leadership",
      },
      include: {
        employee: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
      },
    });

    // Enqueue transactional staff email in outbox
    const employeeEmail = leave.employeeEmailRaw || leave.employee.membership.user.email;
    const employeeName = leave.employeeNameRaw || leave.employee.membership.user.fullName;

    if (employeeEmail) {
      const startStr = formatDateOnly(leave.startDate);
      const endStr = formatDateOnly(leave.endDate);
      const idempotencyKey = `leave_rejected_${leave.id}_${Date.now()}`;

      await tx.studioEmailOutbox.create({
        data: {
          tenantId: context.tenantId,
          recipientUserId: leave.employee.membership.userId,
          recipientEmail: employeeEmail,
          recipientName: employeeName,
          eventType: "LEAVE_REJECTED",
          relatedEntityType: "LEAVE",
          relatedEntityId: leave.id,
          subject: `Leave Request Update (${startStr} to ${endStr}) — 100% DESIGN Studio`,
          htmlBody: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E1F35;">
              <h2 style="color: #EF4444; margin-bottom: 8px;">Leave Request Rejected</h2>
              <p>Hello <strong>${employeeName}</strong>,</p>
              <p>Your request for <strong>${leave.days.toString()} day(s)</strong> of <strong>${leave.leaveType}</strong> leave from <strong>${startStr}</strong> to <strong>${endStr}</strong> could not be approved at this time.</p>
              <p style="padding: 12px; background: #FEE2E2; border-left: 3px solid #EF4444; border-radius: 4px;"><strong>Reason:</strong> ${rejectionReason || "Studio operational requirements"}</p>
              <p style="color: #696E82; font-size: 12px; margin-top: 24px;">100% DESIGN Studio Workspace • Automated Notification</p>
            </div>
          `,
          textBody: `Hello ${employeeName}, your leave request for ${leave.days.toString()} day(s) from ${startStr} to ${endStr} was rejected. Reason: ${rejectionReason}`,
          status: "PENDING",
          idempotencyKey,
        },
      });
    }

    return updated;
  });

  // Outbound push to Google Sheets (non-blocking)
  import("../integrations/google-sheets-sync").then((mod) => {
    const targetEmail = result.employeeEmailRaw || result.employee?.membership?.user?.email;
    const targetName = result.employeeNameRaw || result.employee?.membership?.user?.fullName;
    mod.pushLeaveActionToGoogleSheet(context.tenantId, {
      action: "REJECT",
      leaveId: result.id,
      sourceRecordId: result.sourceRecordId,
      employeeEmail: targetEmail || undefined,
      employeeName: targetName || undefined,
      startDate: formatDateOnly(result.startDate),
      endDate: formatDateOnly(result.endDate),
      status: "Rejected",
      processedBy: context.userFullName || "Studio Leadership",
      rejectionReason,
    }).catch(console.warn);
  });

  return result;
}

/**
 * Soft deletes a leave record with financial lock protection
 */
export async function deleteLeaveRequest(context: TenantContext, leaveId: string) {
  assertAdminOrOwner(context);

  const leave = await prisma.studioLeaveRequest.findFirst({
    where: {
      id: leaveId,
      tenantId: context.tenantId,
      deletedAt: null,
    },
    include: {
      employee: {
        include: {
          membership: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!leave) {
    throw new Error("Leave request not found");
  }

  // Financial lock protection
  const year = leave.startDate.getFullYear();
  const month = leave.startDate.getMonth() + 1;
  const periodKey = `${year}-${String(month).padStart(2, "0")}`;

  const lockedPeriod = await prisma.studioPayrollPeriod.findFirst({
    where: {
      tenantId: context.tenantId,
      periodKey,
      isLocked: true,
    },
  });

  if (lockedPeriod) {
    throw new Error(`Cannot delete leave: Payroll period ${periodKey} is locked and audited.`);
  }

  const deleted = await prisma.studioLeaveRequest.update({
    where: { id: leave.id },
    data: {
      deletedAt: new Date(),
      deletedById: context.membershipId,
    },
  });

  // Outbound push to Google Sheets (non-blocking)
  import("../integrations/google-sheets-sync").then((mod) => {
    const targetEmail = leave.employeeEmailRaw || leave.employee?.membership?.user?.email;
    const targetName = leave.employeeNameRaw || leave.employee?.membership?.user?.fullName;
    mod.pushLeaveActionToGoogleSheet(context.tenantId, {
      action: "DELETE",
      leaveId: deleted.id,
      sourceRecordId: deleted.sourceRecordId,
      employeeEmail: targetEmail || undefined,
      employeeName: targetName || undefined,
      startDate: formatDateOnly(deleted.startDate),
      endDate: formatDateOnly(deleted.endDate),
      status: "[DELETED IN STUDIO]",
      processedBy: context.userFullName || "Studio Leadership",
    }).catch(console.warn);
  });

  return deleted;
}

/**
 * Employee self-service dossier and My Leave summary.
 * Strictly scoped to the authenticated employee's session.
 */
export async function getEmployeeMyLeaveSummary(
  context: TenantContext,
  targetYear: number,
  targetMonth: number
) {
  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: context.tenantId,
      OR: [
        { membershipId: context.membershipId },
        ...(context.employeeId ? [{ employeeId: context.employeeId }] : []),
      ],
    },
  });

  if (!employee) {
    throw new ForbiddenException("Authenticated user has no associated studio employee record");
  }

  // Fetch all non-deleted leaves for this employee
  const leaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      employeeId: employee.id,
      deletedAt: null,
    },
    include: {
      cancellationRequests: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ startDate: "asc" }, { submittedAt: "asc" }, { id: "asc" }],
  });

  // Fetch tenant leave policy
  const policy = await prisma.studioLeavePolicy.findUnique({
    where: { tenantId: context.tenantId },
  });

  const allowance = policy ? Number(policy.defaultMonthlyPaidDays) : DEFAULT_MONTHLY_PAID_ALLOWANCE;

  const mappedLeaves = leaves.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.days,
    status: l.status as LeaveStatus,
    leaveType: l.leaveType,
    isPaidEligible: l.isPaidEligible,
    isHalfDay: l.isHalfDay,
    isHourly: l.isHourly,
    startMinutes: l.startMinutes,
    endMinutes: l.endMinutes,
    totalMinutes: l.totalMinutes,
    submittedAt: l.submittedAt,
    reason: l.reason,
  }));

  const summary = calculateMonthlyLeaveSummary(targetYear, targetMonth, mappedLeaves, allowance);

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: context.userFullName,
      department: employee.department,
      designation: employee.designation,
    },
    monthlySummary: summary,
    allHistory: leaves,
  };
}

/**
 * Owner/Admin comprehensive employee dossier for a specific employee
 */
export async function getEmployeeDossierForAdmin(
  context: TenantContext,
  targetEmployeeId: string, // ID or employeeId
  targetYear: number,
  targetMonth: number
) {
  assertAdminOrOwner(context);

  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: context.tenantId,
      OR: [{ id: targetEmployeeId }, { employeeId: targetEmployeeId }],
    },
    include: {
      membership: {
        include: { user: true },
      },
      compensations: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const leaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      employeeId: employee.id,
      deletedAt: null,
    },
    include: {
      reviewedBy: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: [{ startDate: "asc" }, { submittedAt: "asc" }, { id: "asc" }],
  });

  const policy = await prisma.studioLeavePolicy.findUnique({
    where: { tenantId: context.tenantId },
  });

  const allowance = policy ? Number(policy.defaultMonthlyPaidDays) : DEFAULT_MONTHLY_PAID_ALLOWANCE;

  const mappedLeaves = leaves.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.days,
    status: l.status as LeaveStatus,
    leaveType: l.leaveType,
    isPaidEligible: l.isPaidEligible,
    isHalfDay: l.isHalfDay,
    isHourly: l.isHourly,
    startMinutes: l.startMinutes,
    endMinutes: l.endMinutes,
    totalMinutes: l.totalMinutes,
    submittedAt: l.submittedAt,
    reason: l.reason,
  }));

  const summary = calculateMonthlyLeaveSummary(targetYear, targetMonth, mappedLeaves, allowance);

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.membership.user.fullName,
      email: employee.membership.user.email,
      department: employee.department,
      designation: employee.designation,
      phone: employee.phone,
      joinDate: employee.joinDate,
      compensation: employee.compensations[0] || null,
    },
    monthlySummary: summary,
    allHistory: leaves,
  };
}
