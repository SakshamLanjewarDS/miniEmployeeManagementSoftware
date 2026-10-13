import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { getWorkspaceDayBoundaries, getMultiAssignedTaskIds } from "./repository";
import { TaskWorkflowStatus, TaskPriority } from "@prisma/client";

export interface MyWorkDashboardData {
  employeeInfo: {
    membershipId: string;
    employeeId?: string;
    fullName: string;
    email: string;
    designation?: string | null;
  };
  metrics: {
    totalActive: number;
    awaitingMyAction: number;
    waitingForOthers: number;
    overdue: number;
    dueToday: number;
    awaitingAck: number;
    correctionsRequested: number;
  };
  awaitingMyAction: any[];
  waitingForOthers: any[];
  myLeavesSummary: {
    upcomingApproved: any[];
    pendingReview: any[];
  };
}

/**
 * Retrieves daily operational work for an employee ("My Work Today").
 * Separates "Awaiting My Action" from "Waiting for Someone Else".
 * Prioritizes: Overdue -> Urgent Priority -> Due Today -> Upcoming.
 */
export async function getDailyEmployeeWork(
  context: TenantContext,
  targetMembershipId?: string
): Promise<MyWorkDashboardData> {
  const isPrivileged = isAdminOrOwner(context);
  const activeMembershipId = (isPrivileged && targetMembershipId) ? targetMembershipId : context.membershipId;

  // Resolve target membership and employee details
  const membership = await prisma.tenantMembership.findFirst({
    where: { id: activeMembershipId, tenantId: context.tenantId },
    include: {
      user: { select: { fullName: true, email: true } },
      employee: true,
    },
  });

  if (!membership) {
    throw new Error("Target staff membership not found");
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(context.timezone);
  const now = new Date();

  // Find tasks assigned to this employee (directly or multi-assigned)
  const multiTaskIds = await getMultiAssignedTaskIds(context.tenantId, activeMembershipId);
  const orClauses: any[] = [
    { assigneeId: activeMembershipId },
  ];
  if (multiTaskIds.length > 0) {
    orClauses.push({ id: { in: multiTaskIds } });
  }

  const tasks = await prisma.task.findMany({
    where: {
      tenantId: context.tenantId,
      OR: orClauses,
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
    },
    include: {
      project: {
        select: { id: true, code: true, name: true, status: true },
      },
      checklistItems: {
        where: { tenantId: context.tenantId },
      },
      assignments: {
        where: { membershipId: activeMembershipId },
      },
      submissions: {
        where: { tenantId: context.tenantId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      extensionRequests: {
        where: { tenantId: context.tenantId, status: "PENDING" },
      },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
    ],
  });

  // Fetch employee's leave requests
  let upcomingApprovedLeaves: any[] = [];
  let pendingLeaves: any[] = [];

  if (membership.employee) {
    const leaves = await prisma.studioLeaveRequest.findMany({
      where: {
        tenantId: context.tenantId,
        employeeId: membership.employee.id,
        deletedAt: null,
        endDate: { gte: startOfToday },
      },
      orderBy: { startDate: "asc" },
    });

    upcomingApprovedLeaves = leaves.filter((l) => l.status === "APPROVED");
    pendingLeaves = leaves.filter((l) => l.status === "PENDING");
  }

  const awaitingMyAction: any[] = [];
  const waitingForOthers: any[] = [];

  let overdueCount = 0;
  let dueTodayCount = 0;
  let awaitingAckCount = 0;
  let correctionsCount = 0;

  for (const t of tasks) {
    const isOverdue = t.dueDate && new Date(t.dueDate) < startOfToday;
    const isDueToday = t.dueDate && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) <= endOfToday;
    const assignment = t.assignments[0];
    const isAwaitingAck = !assignment?.acknowledgedAt || (assignment.acknowledgedVersion ?? 0) < (t.version || 1);
    const latestSubmission = t.submissions[0];
    const isCorrectionsRequested = latestSubmission?.status === "CHANGES_REQUESTED";
    const isWaitingReview = t.status === TaskWorkflowStatus.IN_REVIEW || latestSubmission?.status === "PENDING";
    const isBlocked = t.status === TaskWorkflowStatus.BLOCKED || !!t.blockerReason;

    if (isOverdue) overdueCount++;
    if (isDueToday) dueTodayCount++;
    if (isAwaitingAck) awaitingAckCount++;
    if (isCorrectionsRequested) correctionsCount++;

    const item = {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      project: t.project,
      isOverdue,
      isDueToday,
      isAwaitingAck,
      isCorrectionsRequested,
      isWaitingReview,
      isBlocked,
      blockerReason: t.blockerReason,
      reviewFeedback: isCorrectionsRequested ? latestSubmission?.reviewFeedback : null,
      hasPendingExtension: t.extensionRequests.length > 0,
      checklistProgress: {
        total: t.checklistItems.length,
        completed: t.checklistItems.filter((i) => i.isCompleted).length,
      },
    };

    // Separation: Awaiting My Action vs Waiting for Others
    if (isWaitingReview || (isBlocked && !isCorrectionsRequested)) {
      waitingForOthers.push(item);
    } else {
      awaitingMyAction.push(item);
    }
  }

  // Priority sorting helper: Overdue (0) -> Urgent (1) -> Due Today (2) -> High (3) -> Medium (4) -> Low (5)
  const getSortScore = (item: any) => {
    if (item.isOverdue) return 0;
    if (item.priority === TaskPriority.URGENT) return 1;
    if (item.isDueToday) return 2;
    if (item.isCorrectionsRequested) return 3;
    if (item.isAwaitingAck) return 4;
    if (item.priority === TaskPriority.HIGH) return 5;
    if (item.priority === TaskPriority.MEDIUM) return 6;
    return 7;
  };

  awaitingMyAction.sort((a, b) => getSortScore(a) - getSortScore(b));

  return {
    employeeInfo: {
      membershipId: membership.id,
      employeeId: membership.employee?.employeeId,
      fullName: membership.user.fullName,
      email: membership.user.email,
      designation: membership.employee?.designation,
    },
    metrics: {
      totalActive: tasks.length,
      awaitingMyAction: awaitingMyAction.length,
      waitingForOthers: waitingForOthers.length,
      overdue: overdueCount,
      dueToday: dueTodayCount,
      awaitingAck: awaitingAckCount,
      correctionsRequested: correctionsCount,
    },
    awaitingMyAction,
    waitingForOthers,
    myLeavesSummary: {
      upcomingApproved: upcomingApprovedLeaves.map((l) => ({
        id: l.id,
        startDate: l.startDate.toISOString().split("T")[0],
        endDate: l.endDate.toISOString().split("T")[0],
        days: Number(l.days),
        leaveType: l.leaveType,
      })),
      pendingReview: pendingLeaves.map((l) => ({
        id: l.id,
        startDate: l.startDate.toISOString().split("T")[0],
        endDate: l.endDate.toISOString().split("T")[0],
        days: Number(l.days),
        leaveType: l.leaveType,
        version: l.version,
      })),
    },
  };
}
