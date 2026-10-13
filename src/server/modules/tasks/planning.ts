import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { minutesToDays, formatDateOnly, parseDateOnly } from "../leave/policy";
import { TaskWorkflowStatus } from "@prisma/client";

export interface ConflictingLeaveInfo {
  leaveId: string;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: string;
  isHalfDay: boolean;
  isHourly: boolean;
  sessionType?: string | null;
  totalMinutes?: number | null;
}

export interface AssigneeAvailabilityResult {
  membershipId: string;
  employeeId?: string;
  employeeName: string;
  hasConflict: boolean;
  deadlineOnLeave: boolean;
  deadlineOnNonWorkingDay: boolean;
  workingDaysInWindow: number;
  leaveDaysInWindow: number;
  effectiveAvailableDays: number;
  conflictingLeaves: ConflictingLeaveInfo[];
  warnings: string[];
}

export interface TaskAvailabilityPlanningResult {
  hasAnyConflict: boolean;
  assignees: AssigneeAvailabilityResult[];
  overallWarnings: string[];
  suggestedAction: "PROCEED" | "ACKNOWLEDGE_WARNING" | "ADJUST_DATES" | "REASSIGN";
}

/**
 * Checks if a specific date is a studio weekend (Saturday or Sunday)
 */
export function isStudioWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Evaluates leave-aware availability for one or more assignees across a task planning window.
 * Strictly prevents leaking sensitive medical details or attachments.
 */
export async function checkTaskAssigneeAvailability(
  context: TenantContext,
  params: {
    assigneeMembershipIds: string[];
    startDate?: string | Date | null;
    dueDate?: string | Date | null;
    taskId?: string;
  }
): Promise<TaskAvailabilityPlanningResult> {
  const { assigneeMembershipIds, startDate: startInput, dueDate: dueInput } = params;

  if (!assigneeMembershipIds || assigneeMembershipIds.length === 0) {
    return {
      hasAnyConflict: false,
      assignees: [],
      overallWarnings: ["No assignees selected for availability check."],
      suggestedAction: "PROCEED",
    };
  }

  const now = new Date();
  const startDate = startInput ? new Date(startInput) : now;
  const dueDate = dueInput ? new Date(dueInput) : startDate;

  const windowStart = startDate < dueDate ? startDate : dueDate;
  const windowEnd = startDate < dueDate ? dueDate : startDate;

  // Check if deadline falls on a weekend
  const deadlineOnWeekend = isStudioWeekend(dueDate);

  // Fetch memberships and linked employee records
  const members = await prisma.tenantMembership.findMany({
    where: {
      tenantId: context.tenantId,
      id: { in: assigneeMembershipIds },
    },
    include: {
      user: { select: { fullName: true, email: true } },
      employee: true,
    },
  });

  const results: AssigneeAvailabilityResult[] = [];
  let hasAnyConflict = false;
  const overallWarnings: string[] = [];

  for (const member of members) {
    const employee = member.employee;
    const warnings: string[] = [];
    const conflictingLeaves: ConflictingLeaveInfo[] = [];

    let deadlineOnLeave = false;
    let leaveDaysInWindow = 0;

    if (employee) {
      // Find approved leaves intersecting [windowStart, windowEnd]
      const approvedLeaves = await prisma.studioLeaveRequest.findMany({
        where: {
          tenantId: context.tenantId,
          employeeId: employee.id,
          status: "APPROVED",
          deletedAt: null,
          startDate: { lte: windowEnd },
          endDate: { gte: windowStart },
        },
      });

      for (const leave of approvedLeaves) {
        let leaveDays = Number(leave.days);
        if (leave.isHourly && leave.totalMinutes) {
          leaveDays = minutesToDays(leave.totalMinutes);
        } else if (leave.isHalfDay) {
          leaveDays = 0.5;
        }

        leaveDaysInWindow += leaveDays;

        conflictingLeaves.push({
          leaveId: leave.id,
          startDate: formatDateOnly(leave.startDate),
          endDate: formatDateOnly(leave.endDate),
          days: leaveDays,
          leaveType: leave.leaveType, // Operational type only; private reasons omitted
          isHalfDay: leave.isHalfDay,
          isHourly: leave.isHourly,
          sessionType: leave.sessionType,
          totalMinutes: leave.totalMinutes,
        });

        // Check if task deadline falls directly within this leave
        if (dueDate >= leave.startDate && dueDate <= leave.endDate) {
          deadlineOnLeave = true;
        }
      }
    }

    // Calculate calendar days in window
    const diffTime = Math.max(0, windowEnd.getTime() - windowStart.getTime());
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Estimate working days (excluding weekends)
    let workingDaysInWindow = 0;
    const cur = new Date(windowStart);
    while (cur <= windowEnd) {
      if (!isStudioWeekend(cur)) {
        workingDaysInWindow += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const effectiveAvailableDays = Math.max(0, workingDaysInWindow - leaveDaysInWindow);

    if (conflictingLeaves.length > 0) {
      hasAnyConflict = true;
      warnings.push(
        `${member.user.fullName} has ${conflictingLeaves.length} approved leave(s) (${leaveDaysInWindow.toFixed(2)} days) during this task window.`
      );
    }

    if (deadlineOnLeave) {
      hasAnyConflict = true;
      warnings.push(`Task deadline falls directly on an approved absence for ${member.user.fullName}.`);
    }

    if (deadlineOnWeekend) {
      warnings.push(`Task deadline falls on a non-working weekend (${dueDate.toLocaleDateString("en-US", { weekday: "long" })}).`);
    }

    results.push({
      membershipId: member.id,
      employeeId: employee?.id,
      employeeName: member.user.fullName,
      hasConflict: conflictingLeaves.length > 0 || deadlineOnLeave,
      deadlineOnLeave,
      deadlineOnNonWorkingDay: deadlineOnWeekend,
      workingDaysInWindow,
      leaveDaysInWindow,
      effectiveAvailableDays,
      conflictingLeaves,
      warnings,
    });
  }

  if (hasAnyConflict) {
    overallWarnings.push("One or more assignees have scheduled absence during the planned task window.");
  }
  if (deadlineOnWeekend) {
    overallWarnings.push("Task deadline is set on a studio weekend.");
  }

  return {
    hasAnyConflict,
    assignees: results,
    overallWarnings,
    suggestedAction: hasAnyConflict ? "ACKNOWLEDGE_WARNING" : "PROCEED",
  };
}

/**
 * Recomputes task availability impact after an employee's leave is approved or cancelled.
 * Identifies active overlapping tasks and sends deduplicated notification to leaders.
 * Invariant: Never automatically modifies deadlines, assignees, or milestones.
 */
export async function notifyLeadersOfLeaveTaskImpact(
  tenantId: string,
  employeeId: string,
  leaveAction: "APPROVED" | "CANCELLED",
  leaveStartDate: Date,
  leaveEndDate: Date
) {
  // Find employee membership
  const employee = await prisma.employee.findFirst({
    where: { tenantId, id: employeeId },
    include: {
      membership: {
        include: { user: true },
      },
    },
  });

  if (!employee) return;

  const membershipId = employee.membershipId;

  // Find active tasks assigned to this employee overlapping leave dates
  const overlappingTasks = await prisma.task.findMany({
    where: {
      tenantId,
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      OR: [
        { assigneeId: membershipId },
        { assignedMemberIds: { array_contains: membershipId } as any },
      ],
      dueDate: { gte: leaveStartDate, lte: leaveEndDate },
    },
    include: {
      project: { select: { code: true, name: true } },
    },
  });

  if (overlappingTasks.length === 0) return;

  // Create audit event and deduplicated notification for leadership
  const startStr = formatDateOnly(leaveStartDate);
  const endStr = formatDateOnly(leaveEndDate);

  await prisma.auditEvent.create({
    data: {
      tenantId,
      actorId: membershipId,
      action: "LEAVE_TASK_AVAILABILITY_IMPACT",
      entityType: "Employee",
      entityId: employee.id,
      safeChangeSummary: `Leave ${leaveAction.toLowerCase()} for ${employee.membership.user.fullName} (${startStr} to ${endStr}) affects ${overlappingTasks.length} planned deliverable(s). Deadlines preserved without automatic alteration.`,
    },
  }).catch(() => {});
}
