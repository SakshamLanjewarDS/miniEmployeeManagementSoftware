import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { getWorkspaceDayBoundaries, getMultiAssignedTaskIds } from "./repository";
import { TaskWorkflowStatus, TaskPriority } from "@prisma/client";

export interface MyWorkDashboardData {
  role: string;
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
    // Delegated metrics
    totalDelegated?: number;
    delegatedOverdue?: number;
    delegatedDueToday?: number;
    delegatedBlocked?: number;
  };
  awaitingMyAction: any[];
  waitingForOthers: any[];
  delegatedTasks: any[];
  teamMembers: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    designation: string | null;
  }>;
  timelineEvents: Array<{
    id: string;
    type: "MEETING" | "SITE_VISIT" | "DELIVERABLE_DEADLINE";
    time: string;
    endTime?: string;
    title: string;
    subtitle?: string;
    status: string;
    projectCode?: string;
    badge?: string;
    meta?: any;
  }>;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
  }>;
  studioBlockers: any[];
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
      documents: {
        select: {
          id: true,
          title: true,
          drawingNumber: true,
          discipline: true,
          versions: {
            orderBy: { createdAt: "desc" },
            take: 2,
            select: { id: true, revision: true, issuePurpose: true, approvalState: true },
          },
        },
        take: 2,
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

    const doc = t.documents?.[0];
    const drawingRef = doc ? {
      documentId: doc.id,
      drawingCode: doc.drawingNumber || "DWG-01",
      drawingTitle: doc.title,
      discipline: doc.discipline || "ARCHITECTURAL",
      latestRevision: doc.versions?.[0]?.revision || "R1",
      previousRevision: doc.versions?.[1]?.revision || "R0",
    } : (t.title.toLowerCase().includes("dwg") || t.title.toLowerCase().includes("drawing") || t.title.toLowerCase().includes("plan") ? {
      documentId: t.id,
      drawingCode: `DWG-${t.project?.code || "101"}`,
      drawingTitle: t.title,
      discipline: "ARCHITECTURAL",
      latestRevision: "R2.1",
      previousRevision: "R2.0",
    } : null);

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
      checklistItems: t.checklistItems.map((i) => ({
        id: i.id,
        title: i.title,
        isCompleted: i.isCompleted,
        status: i.status,
      })),
      drawingRef,
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

  // --- PHASE 1: Fetch Delegated Tasks (for Owners/Admins/PMs) ---
  const delegatedTasks: any[] = [];
  let delegatedOverdueCount = 0;
  let delegatedDueTodayCount = 0;
  let delegatedBlockedCount = 0;

  if (isPrivileged) {
    const rawDelegated = await prisma.task.findMany({
      where: {
        tenantId: context.tenantId,
        assigneeId: { not: activeMembershipId },
        status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      },
      include: {
        project: { select: { id: true, code: true, name: true, status: true } },
        assignee: {
          include: {
            user: { select: { fullName: true, email: true } },
            employee: { select: { designation: true } },
          },
        },
        checklistItems: { where: { tenantId: context.tenantId } },
        submissions: {
          where: { tenantId: context.tenantId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        documents: {
          select: {
            id: true,
            title: true,
            drawingNumber: true,
            discipline: true,
            versions: {
              orderBy: { createdAt: "desc" },
              take: 2,
              select: { id: true, revision: true, issuePurpose: true, approvalState: true },
            },
          },
          take: 2,
        },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
      ],
      take: 40,
    });

    for (const dt of rawDelegated) {
      const isOverdue = dt.dueDate && new Date(dt.dueDate) < startOfToday;
      const isDueToday = dt.dueDate && new Date(dt.dueDate) >= startOfToday && new Date(dt.dueDate) <= endOfToday;
      const isBlocked = dt.status === TaskWorkflowStatus.BLOCKED || !!dt.blockerReason;
      const isWaitingReview = dt.status === TaskWorkflowStatus.IN_REVIEW;

      if (isOverdue) delegatedOverdueCount++;
      if (isDueToday) delegatedDueTodayCount++;
      if (isBlocked) delegatedBlockedCount++;

      const doc = dt.documents?.[0];
      const drawingRef = doc ? {
        documentId: doc.id,
        drawingCode: doc.drawingNumber || "DWG-REF",
        drawingTitle: doc.title,
        discipline: doc.discipline || "ARCHITECTURAL",
        latestRevision: doc.versions?.[0]?.revision || "R1",
        previousRevision: doc.versions?.[1]?.revision || "R0",
      } : (dt.title.toLowerCase().includes("dwg") || dt.title.toLowerCase().includes("drawing") ? {
        documentId: dt.id,
        drawingCode: `DWG-${dt.project?.code || "100"}`,
        drawingTitle: dt.title,
        discipline: "ARCHITECTURAL",
        latestRevision: "R2.1",
        previousRevision: "R2.0",
      } : null);

      delegatedTasks.push({
        id: dt.id,
        title: dt.title,
        description: dt.description,
        status: dt.status,
        priority: dt.priority,
        dueDate: dt.dueDate ? dt.dueDate.toISOString() : null,
        project: dt.project,
        assignee: dt.assignee ? {
          id: dt.assignee.id,
          fullName: dt.assignee.user.fullName,
          email: dt.assignee.user.email,
          designation: dt.assignee.employee?.designation || null,
        } : null,
        isOverdue,
        isDueToday,
        isBlocked,
        isWaitingReview,
        blockerReason: dt.blockerReason,
        checklistProgress: {
          total: dt.checklistItems.length,
          completed: dt.checklistItems.filter((i) => i.isCompleted).length,
        },
        drawingRef,
      });
    }
  }

  // --- Active Team Members for Micro-Delegation ---
  const teamMembersRaw = await prisma.tenantMembership.findMany({
    where: {
      tenantId: context.tenantId,
      user: { accountState: "ACTIVE" },
    },
    include: {
      user: { select: { fullName: true, email: true } },
      employee: { select: { designation: true } },
    },
    take: 50,
  });

  const teamMembers = teamMembersRaw.map((m) => ({
    id: m.id,
    fullName: m.user.fullName,
    email: m.user.email,
    role: m.role,
    designation: m.employee?.designation || null,
  }));

  // --- PHASE 2: Chronological Day Timeline (Meetings + Site Visits + Deadlines) ---
  const timelineEvents: Array<{
    id: string;
    type: "MEETING" | "SITE_VISIT" | "DELIVERABLE_DEADLINE";
    time: string;
    endTime?: string;
    title: string;
    subtitle?: string;
    status: string;
    projectCode?: string;
    badge?: string;
    meta?: any;
  }> = [];

  // Meetings
  try {
    const todayMeetings = await prisma.studioMeeting.findMany({
      where: {
        tenantId: context.tenantId,
        meetingDate: { gte: startOfToday, lte: endOfToday },
        status: { not: "CANCELLED" },
      },
      include: {
        project: { select: { code: true, name: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    for (const m of todayMeetings) {
      timelineEvents.push({
        id: `meeting-${m.id}`,
        type: "MEETING",
        time: m.startTime || "10:00",
        endTime: m.endTime || "11:00",
        title: m.title,
        subtitle: m.project ? `${m.project.code} • ${m.meetingType}` : m.meetingType,
        status: m.status,
        projectCode: m.project?.code,
        badge: "MEETING",
        meta: {
          meetingType: m.meetingType,
          agenda: m.agenda,
        },
      });
    }
  } catch (e) {
    console.warn("Notice: could not query studioMeetings for timeline:", e);
  }

  // Site visits
  try {
    const todaySiteVisits = await prisma.siteVisit.findMany({
      where: {
        tenantId: context.tenantId,
        scheduledTime: { gte: startOfToday, lte: endOfToday },
        operationalState: { not: "CANCELLED" },
      },
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { name: true, address: true } },
      },
      orderBy: { scheduledTime: "asc" },
      take: 10,
    });

    for (const sv of todaySiteVisits) {
      const timeStr = sv.scheduledTime ? sv.scheduledTime.toTimeString().substring(0, 5) : "14:00";
      timelineEvents.push({
        id: `visit-${sv.id}`,
        type: "SITE_VISIT",
        time: timeStr,
        title: `${sv.purpose} @ ${sv.site.name}`,
        subtitle: sv.project ? `${sv.project.code} • ${sv.inspectionType || "Site Inspection"}` : sv.inspectionType || "Site Inspection",
        status: sv.operationalState,
        projectCode: sv.project?.code,
        badge: "SITE VISIT",
        meta: {
          address: sv.site.address,
          weather: sv.weather,
          state: sv.operationalState,
        },
      });
    }
  } catch (e) {
    console.warn("Notice: could not query siteVisits for timeline:", e);
  }

  // Deliverables due today
  for (const t of tasks.filter((x) => x.dueDate && new Date(x.dueDate) >= startOfToday && new Date(x.dueDate) <= endOfToday)) {
    timelineEvents.push({
      id: `task-${t.id}`,
      type: "DELIVERABLE_DEADLINE",
      time: "18:30",
      title: t.title,
      subtitle: `${t.project.code} • Hard Delivery EOD`,
      status: t.status,
      projectCode: t.project.code,
      badge: "DELIVERABLE",
      meta: {
        priority: t.priority,
      },
    });
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => a.time.localeCompare(b.time));

  // --- PHASE 3: Active Projects for Focus HUD & Studio Blockers ---
  const projects = await prisma.project.findMany({
    where: { tenantId: context.tenantId, status: { not: "ARCHIVED" } },
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
    take: 30,
  });

  const rawBlockers = await prisma.task.findMany({
    where: {
      tenantId: context.tenantId,
      status: TaskWorkflowStatus.BLOCKED,
    },
    include: {
      project: { select: { code: true, name: true } },
      assignee: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const studioBlockers = rawBlockers.map((b) => ({
    id: b.id,
    title: b.title,
    blockerReason: b.blockerReason || "Unspecified impediment",
    projectCode: b.project.code,
    projectName: b.project.name,
    assigneeName: b.assignee?.user.fullName || "Unassigned",
    updatedAt: b.updatedAt.toISOString(),
  }));

  return {
    role: context.role,
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
      totalDelegated: delegatedTasks.length,
      delegatedOverdue: delegatedOverdueCount,
      delegatedDueToday: delegatedDueTodayCount,
      delegatedBlocked: delegatedBlockedCount,
    },
    awaitingMyAction,
    waitingForOthers,
    delegatedTasks,
    teamMembers,
    timelineEvents,
    projects,
    studioBlockers,
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
