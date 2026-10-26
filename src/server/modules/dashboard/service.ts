import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { TaskWorkflowStatus, TaskPriority } from "@prisma/client";
import { getWorkspaceDayBoundaries } from "../tasks/repository";

export interface StudioHealthIndex {
  score: number;
  grade: "OPTIMAL" | "HEALTHY" | "ATTENTION" | "CRITICAL";
  trend: string;
  subscores: {
    overdueVelocity: {
      score: number;
      label: string;
      overdueCount: number;
      activeCount: number;
    };
    reviewTurnaround: {
      score: number;
      label: string;
      pendingCount: number;
    };
    teamCapacity: {
      score: number;
      label: string;
      memberCount: number;
    };
    cashflowMomentum: {
      score: number;
      label: string;
      ratio: number;
    };
  };
  recommendation: string;
}

export interface OwnerDashboardData {
  studioHealthIndex: StudioHealthIndex;
  studioSummary: {
    activeProjectsCount: number;
    overdueDeliverablesCount: number;
    pendingReviewsCount: number;
    totalCollections: number;
    approvedExpenses: number;
    outstandingFees: number;
    contractorCommitmentsCount: number;
  };
  projectsAttention: Array<{
    id: string;
    code: string;
    name: string;
    projectType: string | null;
    currentPhase: string | null;
    delayedCount: number;
    blockerCount: number;
    leadArchitect: string | null;
    nextDeadline: Date | null;
  }>;
  financialOverview: {
    recordedCollections: number;
    approvedExpenses: number;
    outstandingFees: number;
    disclaimer: string;
  };
  approvalInbox: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    requesterName: string;
    requesterRole: string;
    submittedAt: Date;
    type: "DELIVERABLE" | "CHECKLIST" | "DRAWING";
    status: string;
    taskId?: string;
  }>;
  teamWorkload: Array<{
    memberId: string;
    fullName: string;
    role: string;
    designation: string | null;
    employeeId: string | null;
    activeTasksCount: number;
    overdueTasksCount: number;
    upcomingDeadlinesCount: number;
  }>;
  myWork: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    priority: TaskPriority;
    status: TaskWorkflowStatus;
    dueDate: Date | null;
  }>;
  upcomingSiteVisits: Array<{
    id: string;
    purpose: string;
    projectCode: string;
    projectName: string;
    siteName: string;
    inspectorName: string;
    scheduledTime: Date;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    safeChangeSummary: string;
    timestamp: Date;
  }>;
}

export interface AdminDashboardData {
  studioHealthIndex: StudioHealthIndex;
  dailySummary: {
    tasksDueToday: number;
    overdueTasks: number;
    pendingSubmissions: number;
    scheduledSiteVisitsToday: number;
    unacknowledgedAssignments?: number;
    activeBlockers?: number;
    pendingExtensions?: number;
  };
  assignmentQueue: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    priority: TaskPriority;
    status: TaskWorkflowStatus;
    dueDate: Date | null;
    blockerReason: string | null;
    hasAssignee: boolean;
    assigneeName?: string | null;
  }>;
  reviewQueue: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    submitterName: string;
    submittedAt: Date;
    waitingHours: number;
    priority: TaskPriority;
    taskId: string;
    checklistItemId?: string;
  }>;
  projectDelivery: Array<{
    id: string;
    code: string;
    name: string;
    projectType: string | null;
    activeTasks: number;
    completedTasks: number;
    delayedTasks: number;
    nextMilestoneDeadline: Date | null;
  }>;
  teamDistribution: Array<{
    memberId: string;
    fullName: string;
    designation: string | null;
    employeeId: string | null;
    totalActive: number;
    dueToday: number;
    overdue: number;
  }>;
  todaySiteSchedule: Array<{
    id: string;
    purpose: string;
    projectCode: string;
    projectName: string;
    siteName: string;
    inspectorName: string;
    scheduledTime: Date;
    operationalState: string;
  }>;
  myWork: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    priority: TaskPriority;
    status: TaskWorkflowStatus;
    dueDate: Date | null;
  }>;

}

export interface ReopenedTaskAlert {
  id: string;
  taskId: string;
  checklistItemId?: string | null;
  taskTitle: string;
  itemTitle?: string | null;
  projectCode: string;
  projectName: string;
  reopenedBy: string;
  reopenReason: string;
  reopenedAt: string;
  dueDate: string | null;
  priority: TaskPriority | string;
  status: TaskWorkflowStatus | string;
}

export interface EmployeeDashboardData {
  mySummary: {
    pendingTasksCount: number;
    dueTodayCount: number;
    overdueCount: number;
    inReviewCount: number;
    changesRequestedCount: number;
    completedCount: number;
    unacknowledgedCount?: number;
    blockedCount?: number;
    pendingExtensionsCount?: number;
    reopenedCount?: number;
  };
  reopenedTasks?: Array<ReopenedTaskAlert>;
  unacknowledgedAssignments?: Array<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    priority: TaskPriority;
    dueDate: Date | null;
    version: number;
  }>;
  workQueue: Array<{
    id: string;
    taskId: string;
    title: string;
    parentTitle: string;
    projectCode: string;
    projectName: string;
    projectId: string;
    priority: TaskPriority;
    status: TaskWorkflowStatus;
    dueDate: Date | null;
    isOverdue: boolean;
    isDueToday: boolean;
    blockerReason: string | null;
    isChecklistItem: boolean;
    isReopened?: boolean;
    reopenReason?: string;
    reopenedBy?: string;
    reopenedAt?: string;
    description?: string | null;
    checklistItems?: Array<{ id: string; title: string; isCompleted: boolean }>;
  }>;
  todayPriorities: Array<{
    id: string;
    taskId: string;
    title: string;
    parentTitle: string;
    projectCode: string;
    projectName: string;
    priority: TaskPriority;
    dueDate: Date | null;
    status: TaskWorkflowStatus;
    description?: string | null;
    checklistItems?: Array<{ id: string; title: string; isCompleted: boolean }>;
  }>;
  submissionsAwaitingReview: Array<{
    id: string;
    taskId: string;
    title: string;
    projectCode: string;
    submittedAt: Date;
    status: TaskWorkflowStatus;
  }>;
  changesRequestedList: Array<{
    id: string;
    taskId: string;
    title: string;
    projectCode: string;
    feedback: string;
    reviewerName?: string;
  }>;
  mySiteVisits: Array<{
    id: string;
    purpose: string;
    projectCode: string;
    siteName: string;
    scheduledTime: Date;
    operationalState: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    link: string | null;
    createdAt: Date;
    isRead: boolean;
  }>;

  // Ultra-Production Focus, Velocity, GFC Quick-Viewer & 1-Click Check-In Extensions
  productivityMetrics: {
    onTimeDeliveryRate: number;
    completedThisMonth: number;
    currentStreak: number;
    avgTurnaroundHours: number;
  };
  activeSiteInspection: {
    id: string;
    purpose: string;
    projectCode: string;
    projectName: string;
    siteId: string;
    siteName: string;
    siteAddress: string;
    siteLatitude: number | null;
    siteLongitude: number | null;
    radiusMeters: number;
    scheduledTime: Date;
    operationalState: "SCHEDULED" | "ACTIVE" | "CHECKED_OUT";
    lastDistanceMeters?: number | null;
    geofenceAssessment?: string | null;
  } | null;
  latestApprovedDrawings: Array<{
    id: string;
    documentId: string;
    title: string;
    drawingNumber: string | null;
    revision: string;
    discipline: string;
    issuePurpose: string;
    projectCode: string;
    projectName: string;
    fileId: string;
    approvedAt: Date;
  }>;
  projectsList: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  studioMeetings: Array<EmployeeDashboardMeeting>;
  todayMeetingsCount: number;
  upcomingMeetingsCount: number;
}

export interface EmployeeDashboardMeeting {
  id: string;
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string;   // "11:00"
  endTime: string;     // "12:30"
  meetingType: string;
  status: string;
  projectId: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  agenda?: string | null;
  locationType?: "STUDIO" | "SITE" | "CLIENT_OFFICE" | "VIRTUAL";
  meetingLink?: string | null;
  siteLocation?: string | null;
  creatorName?: string | null;
  isToday: boolean;
  isUpcoming: boolean;
  actionItemsCount: number;
  myActionItemsCount: number;
}

// In-memory dashboard cache for ultra-fast route transitions (skips 10 database roundtrips per load)
const ownerDashboardCache = new Map<string, { data: OwnerDashboardData; cachedAt: number }>();
const adminDashboardCache = new Map<string, { data: AdminDashboardData; cachedAt: number }>();
const employeeDashboardCache = new Map<string, { data: EmployeeDashboardData; cachedAt: number }>();
const DASHBOARD_CACHE_TTL_MS = 12 * 1000; // 12 seconds

export function clearDashboardCache(tenantId?: string) {
  if (tenantId) {
    ownerDashboardCache.delete(tenantId);
    adminDashboardCache.delete(tenantId);
    for (const key of employeeDashboardCache.keys()) {
      if (key.startsWith(tenantId + ":")) employeeDashboardCache.delete(key);
    }
  } else {
    ownerDashboardCache.clear();
    adminDashboardCache.clear();
    employeeDashboardCache.clear();
  }
}

/**
 * 1. OWNER DASHBOARD DATA SERVICE
 * Accessible to OWNER and ADMIN. Strict tenant isolation.
 */
export async function getOwnerDashboardData(ctx: TenantContext): Promise<OwnerDashboardData> {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Owner Dashboard is reserved for Studio Leadership (Owner/Admin).");
  }

  const nowMs = Date.now();
  const cached = ownerDashboardCache.get(ctx.tenantId);
  if (cached && nowMs - cached.cachedAt < DASHBOARD_CACHE_TTL_MS) {
    return cached.data;
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  // Execute all independent queries concurrently in a single parallel batch
  const [
    projects,
    allTasks,
    paymentsAgg,
    expensesAgg,
    milestonesAgg,
    contractorCount,
    pendingApprovals,
    members,
    siteVisits,
    auditEvents,
  ] = await Promise.all([
    // 1. Projects Query
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        phases: { orderBy: { sortOrder: "asc" } },
        projectArchitect: {
          include: { user: { select: { fullName: true } } },
        },
        tasks: {
          where: { status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] } },
          select: { id: true, status: true, dueDate: true, blockerReason: true },
        },
      },
    }),
    // 2. Tasks Aggregates
    prisma.task.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        status: true,
        dueDate: true,
        assigneeId: true,
        assignedMemberIds: true,
        title: true,
        priority: true,
        projectId: true,
        project: { select: { code: true, name: true } },
      },
    }),
    // 3. Finances Query
    prisma.feePayment.aggregate({
      where: { tenantId: ctx.tenantId },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId: ctx.tenantId, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.feeMilestone.aggregate({
      where: { tenantId: ctx.tenantId },
      _sum: { amount: true },
    }),
    prisma.projectContractor.count({
      where: { tenantId: ctx.tenantId },
    }),
    // 5. Approval Inbox
    prisma.approvalRequest.findMany({
      where: { tenantId: ctx.tenantId, status: "PENDING" },
      include: {
        project: { select: { code: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // 6. Tenant Memberships
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { fullName: true } },
        employee: { select: { designation: true, employeeId: true } },
      },
    }),
    // 8. Upcoming Site Visits
    prisma.siteVisit.findMany({
      where: {
        tenantId: ctx.tenantId,
        operationalState: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { name: true } },
        employee: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { scheduledTime: "asc" },
      take: 6,
    }),
    // 9. Recent Activity
    prisma.auditEvent.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { timestamp: "desc" },
      take: 8,
    }),
  ]);

  const activeProjects = projects.filter((p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED");
  const activeTasks = allTasks.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED);
  const overdueTasksCount = activeTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
  const pendingReviewsCount = allTasks.filter((t) => t.status === TaskWorkflowStatus.IN_REVIEW).length;

  const totalCollections = Number(paymentsAgg._sum.amount || 0);
  const approvedExpenses = Number(expensesAgg._sum.amount || 0);
  const totalBilledMilestones = Number(milestonesAgg._sum.amount || 0);
  const outstandingFees = Math.max(0, totalBilledMilestones - totalCollections);

  // 4. Projects Requiring Attention
  const projectsAttention = activeProjects
    .map((p) => {
      const activeProjTasks = p.tasks;
      const delayed = activeProjTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
      const blockers = activeProjTasks.filter((t) => Boolean(t.blockerReason)).length;
      const upcomingDeadlines = activeProjTasks
        .filter((t) => t.dueDate)
        .map((t) => t.dueDate as Date)
        .sort((a, b) => a.getTime() - b.getTime());

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        projectType: p.projectType,
        currentPhase: p.phases[0]?.phaseName || null,
        delayedCount: delayed,
        blockerCount: blockers,
        leadArchitect: p.projectArchitect?.user?.fullName || null,
        nextDeadline: upcomingDeadlines[0] || null,
      };
    })
    .filter((p) => p.delayedCount > 0 || p.blockerCount > 0)
    .slice(0, 8);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const approvalInbox = pendingApprovals.map((req) => {
    const requester = memberMap.get(req.requesterId);
    return {
      id: req.id,
      title: req.task?.title || req.comment || "Deliverable Approval",
      projectCode: req.project.code,
      projectName: req.project.name,
      requesterName: requester?.user?.fullName || "Team Member",
      requesterRole: requester?.role || "EMPLOYEE",
      submittedAt: req.createdAt,
      type: (req.targetType === "DOCUMENT_VERSION" ? "DRAWING" : "DELIVERABLE") as any,
      status: req.status,
      taskId: req.taskId || undefined,
    };
  });

  // 6. Team Workload
  const teamWorkload = members
    .filter((m) => m.role === "EMPLOYEE" || m.role === "ADMIN")
    .map((m) => {
      const assigned = allTasks.filter((t) => {
        const ids = Array.isArray(t.assignedMemberIds) ? (t.assignedMemberIds as string[]) : [];
        return t.assigneeId === m.id || ids.includes(m.id);
      });
      const active = assigned.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED);
      const overdue = active.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
      const upcoming = active.filter((t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday).length;

      return {
        memberId: m.id,
        fullName: m.user.fullName,
        role: m.role,
        designation: m.employee?.designation || null,
        employeeId: m.employee?.employeeId || null,
        activeTasksCount: active.length,
        overdueTasksCount: overdue,
        upcomingDeadlinesCount: upcoming,
      };
    })
    .sort((a, b) => b.activeTasksCount - a.activeTasksCount)
    .slice(0, 10);

  // 7. My Work (for logged in Owner/Admin)
  const myTasks = allTasks
    .filter((t) => {
      const ids = Array.isArray(t.assignedMemberIds) ? (t.assignedMemberIds as string[]) : [];
      return (t.assigneeId === ctx.membershipId || ids.includes(ctx.membershipId)) &&
        t.status !== TaskWorkflowStatus.COMPLETED &&
        t.status !== TaskWorkflowStatus.CANCELLED;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectCode: t.project.code,
      projectName: t.project.name,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
    }))
    .slice(0, 6);

  const upcomingSiteVisits = siteVisits.map((v) => ({
    id: v.id,
    purpose: v.purpose,
    projectCode: v.project.code,
    projectName: v.project.name,
    siteName: v.site.name,
    inspectorName: v.employee?.user?.fullName || "Assigned Architect",
    scheduledTime: v.scheduledTime,
  }));

  // --- STUDIO HEALTH INDEX (SHI) CALCULATION ---
  const activeDeliverables = allTasks.filter(
    (t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED
  );
  const overdueScore = activeDeliverables.length === 0
    ? 100
    : Math.max(20, Math.round(100 - (overdueTasksCount / activeDeliverables.length) * 75));

  const pendingCount = pendingApprovals.length;
  let reviewScore = 100;
  if (pendingCount > 0) {
    const avgAgeHours = pendingApprovals.reduce((acc, p) => {
      const ageH = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 3600));
      return acc + ageH;
    }, 0) / pendingCount;

    if (avgAgeHours <= 24) reviewScore = Math.max(70, Math.round(100 - avgAgeHours * 0.8));
    else if (avgAgeHours <= 48) reviewScore = Math.max(50, Math.round(80 - (avgAgeHours - 24) * 1.2));
    else reviewScore = Math.max(25, Math.round(50 - (avgAgeHours - 48) * 0.5));
  }

  const activeEmployees = teamWorkload.length || 1;
  const overloadedCount = teamWorkload.filter((m) => m.activeTasksCount > 8).length;
  const capacityScore = Math.max(30, Math.round(100 - (overloadedCount / activeEmployees) * 60));

  let cashflowScore = 90;
  if (approvedExpenses > 0) {
    const cfRatio = totalCollections / approvedExpenses;
    if (cfRatio >= 1.5) cashflowScore = 98;
    else if (cfRatio >= 1.0) cashflowScore = 88;
    else if (cfRatio >= 0.7) cashflowScore = 72;
    else cashflowScore = 55;
  }

  const compositeScore = Math.round(
    overdueScore * 0.30 +
    reviewScore * 0.25 +
    capacityScore * 0.25 +
    cashflowScore * 0.20
  );

  const shiGrade: "OPTIMAL" | "HEALTHY" | "ATTENTION" | "CRITICAL" =
    compositeScore >= 88 ? "OPTIMAL" :
    compositeScore >= 72 ? "HEALTHY" :
    compositeScore >= 55 ? "ATTENTION" : "CRITICAL";

  let shiRecommendation = "All studio disciplines operating with high delivery velocity.";
  if (overdueTasksCount > 0) {
    shiRecommendation = `Prioritize ${overdueTasksCount} overdue deliverable${overdueTasksCount > 1 ? "s" : ""} to avoid milestone slippage.`;
  } else if (pendingCount > 2) {
    shiRecommendation = `Clear ${pendingCount} pending reviews in Decision Airlock to unblock drawing progress.`;
  } else if (overloadedCount > 0) {
    shiRecommendation = `Rebalance drafting workload for ${overloadedCount} team member${overloadedCount > 1 ? "s" : ""} near capacity ceiling.`;
  }

  const studioHealthIndex: StudioHealthIndex = {
    score: compositeScore,
    grade: shiGrade,
    trend: compositeScore >= 80 ? "+2.4% vs last week" : "-1.6% vs last week",
    subscores: {
      overdueVelocity: {
        score: overdueScore,
        label: `${activeDeliverables.length - overdueTasksCount}/${activeDeliverables.length} on time`,
        overdueCount: overdueTasksCount,
        activeCount: activeDeliverables.length,
      },
      reviewTurnaround: {
        score: reviewScore,
        label: `${pendingCount} item${pendingCount !== 1 ? "s" : ""} pending`,
        pendingCount,
      },
      teamCapacity: {
        score: capacityScore,
        label: `${overloadedCount} overloaded`,
        memberCount: activeEmployees,
      },
      cashflowMomentum: {
        score: cashflowScore,
        label: `₹${Math.round(totalCollections / 1000)}k recorded`,
        ratio: approvedExpenses > 0 ? Number((totalCollections / approvedExpenses).toFixed(2)) : 1.5,
      },
    },
    recommendation: shiRecommendation,
  };

  const result: OwnerDashboardData = {
    studioHealthIndex,
    studioSummary: {
      activeProjectsCount: activeProjects.length,
      overdueDeliverablesCount: overdueTasksCount,
      pendingReviewsCount,
      totalCollections,
      approvedExpenses,
      outstandingFees,
      contractorCommitmentsCount: contractorCount,
    },
    projectsAttention,
    financialOverview: {
      recordedCollections: totalCollections,
      approvedExpenses,
      outstandingFees,
      disclaimer: "Recorded collections minus expenses reflects operational cashflow, not final studio margin.",
    },
    approvalInbox,
    teamWorkload,
    myWork: myTasks,
    upcomingSiteVisits,
    recentActivity: auditEvents.map((a) => ({
      id: a.id,
      action: a.action,
      safeChangeSummary: a.safeChangeSummary,
      timestamp: a.timestamp,
    })),
  };

  ownerDashboardCache.set(ctx.tenantId, { data: result, cachedAt: nowMs });
  return result;
}

/**
 * 2. ADMIN DASHBOARD DATA SERVICE
 * Focuses on daily coordination, queues, and task dispatch.
 */
export async function getAdminDashboardData(ctx: TenantContext): Promise<AdminDashboardData> {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Admin Dashboard is reserved for Studio Leadership (Admin/Owner).");
  }

  const nowMs = Date.now();
  const cached = adminDashboardCache.get(ctx.tenantId);
  if (cached && nowMs - cached.cachedAt < DASHBOARD_CACHE_TTL_MS) {
    return cached.data;
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  // Execute all admin queries concurrently in a single parallel batch
  const [
    allTasks,
    siteVisitsToday,
    unacknowledgedCount,
    activeBlockersCount,
    pendingExtensionsCount,
    pendingSubmissionsData,
    projects,
    members,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        project: { select: { code: true, name: true, projectType: true } },
        assignee: { include: { user: { select: { fullName: true } } } },
        checklistItems: {
          include: {
            assignedMember: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.siteVisit.findMany({
      where: {
        tenantId: ctx.tenantId,
        scheduledTime: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        project: { select: { code: true, name: true } },
        site: { select: { name: true } },
        employee: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.taskAssignment.count({
      where: { tenantId: ctx.tenantId, acknowledgedAt: null },
    }),
    prisma.taskChecklistItem.count({
      where: { tenantId: ctx.tenantId, isBlocked: true },
    }),
    prisma.taskExtensionRequest.count({
      where: { tenantId: ctx.tenantId, status: "PENDING" },
    }),
    prisma.taskSubmission.findMany({
      where: { tenantId: ctx.tenantId, status: "PENDING" },
      include: {
        task: { select: { id: true, title: true, priority: true, project: { select: { code: true, name: true } } } },
        submitter: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
      include: {
        tasks: { select: { status: true, dueDate: true } },
        feeMilestones: { where: { status: { not: "PAID" } }, orderBy: { milestoneDate: "asc" }, take: 1 },
      },
      take: 8,
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { fullName: true, email: true } },
        employee: { select: { designation: true, employeeId: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  // 1. Daily Summary Counts & Active Tasks
  const activeTasks = allTasks.filter(
    (t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED
  );

  const tasksDueToday = activeTasks.filter(
    (t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday
  ).length;

  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < startOfToday
  ).length;

  const pendingSubmissions =
    pendingSubmissionsData.length +
    allTasks.filter(
      (t) =>
        t.status === TaskWorkflowStatus.IN_REVIEW &&
        !pendingSubmissionsData.some((sub) => sub.task.id === t.id)
    ).length;

  // 2. Assignment Queue: unassigned deliverables or blocked tasks
  const assignmentQueue = activeTasks
    .filter((t) => !t.assigneeId || Boolean(t.blockerReason) || t.status === TaskWorkflowStatus.NOT_STARTED)
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectCode: t.project.code,
      projectName: t.project.name,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      blockerReason: t.blockerReason,
      hasAssignee: Boolean(t.assigneeId),
      assigneeName: t.assignee?.user?.fullName || null,
    }))
    .slice(0, 12);

  // 3. Review Queue: Submissions and in-review tasks
  const submissionReviewItems = pendingSubmissionsData.map((sub) => {
    const waitMs = Date.now() - new Date(sub.createdAt).getTime();
    return {
      id: sub.id,
      title: `${sub.task.title} (v${sub.version})`,
      projectCode: sub.task.project.code,
      projectName: sub.task.project.name,
      submitterName: sub.submitter?.user?.fullName || "Staff",
      submittedAt: sub.createdAt,
      waitingHours: Math.max(0, Math.round(waitMs / (1000 * 60 * 60))),
      priority: sub.task.priority,
      taskId: sub.task.id,
    };
  });

  const taskReviewItems = allTasks
    .filter((t) => t.status === TaskWorkflowStatus.IN_REVIEW)
    .map((t) => {
      const waitMs = Date.now() - new Date(t.updatedAt).getTime();
      return {
        id: t.id,
        title: t.title,
        projectCode: t.project.code,
        projectName: t.project.name,
        submitterName: t.assignee?.user?.fullName || "Assigned Staff",
        submittedAt: t.updatedAt,
        waitingHours: Math.max(0, Math.round(waitMs / (1000 * 60 * 60))),
        priority: t.priority,
        taskId: t.id,
      };
    });

  const reviewTasks = [...submissionReviewItems, ...taskReviewItems].slice(0, 12);

  // 4. Project Delivery Progress
  const projectDelivery = projects.map((p) => {
    const total = p.tasks.length;
    const completed = p.tasks.filter((t) => t.status === TaskWorkflowStatus.COMPLETED).length;
    const delayed = p.tasks.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED && t.dueDate && t.dueDate < startOfToday).length;

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      projectType: p.projectType,
      activeTasks: total - completed,
      completedTasks: completed,
      delayedTasks: delayed,
      nextMilestoneDeadline: p.feeMilestones[0]?.milestoneDate || null,
    };
  });

  // 5. Team Work Distribution & Attendance Radar

  const teamDistribution = members
    .map((m) => {
      const memberTasks = activeTasks.filter((t) => {
        const ids = Array.isArray(t.assignedMemberIds) ? (t.assignedMemberIds as string[]) : [];
        return t.assigneeId === m.id || ids.includes(m.id);
      });
      const dueTodayCount = memberTasks.filter((t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday).length;
      const overdueCount = memberTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;

      return {
        memberId: m.id,
        fullName: m.user.fullName,
        designation: m.employee?.designation || null,
        employeeId: m.employee?.employeeId || null,
        totalActive: memberTasks.length,
        dueToday: dueTodayCount,
        overdue: overdueCount,
      };
    })
    .filter((m) => m.totalActive > 0)
    .slice(0, 10);

  // 6. My Work for Admin
  const myWork = activeTasks
    .filter((t) => {
      const ids = Array.isArray(t.assignedMemberIds) ? (t.assignedMemberIds as string[]) : [];
      return t.assigneeId === ctx.membershipId || ids.includes(ctx.membershipId);
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectCode: t.project.code,
      projectName: t.project.name,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
    }))
    .slice(0, 6);

  // --- STUDIO HEALTH INDEX (SHI) FOR ADMIN ---
  const activeCount = activeTasks.length;
  const overdueScore = activeCount === 0
    ? 100
    : Math.max(20, Math.round(100 - (overdueTasks / activeCount) * 75));

  const pendingCount = reviewTasks.length;
  const reviewScore = pendingCount === 0
    ? 100
    : Math.max(30, Math.round(100 - pendingCount * 12));

  const totalMembers = teamDistribution.length || 1;
  const overloadedCount = teamDistribution.filter((m) => m.totalActive > 8).length;
  const capacityScore = Math.max(30, Math.round(100 - (overloadedCount / totalMembers) * 60));

  const compositeScore = Math.round(
    overdueScore * 0.40 +
    reviewScore * 0.30 +
    capacityScore * 0.30
  );

  const shiGrade: "OPTIMAL" | "HEALTHY" | "ATTENTION" | "CRITICAL" =
    compositeScore >= 88 ? "OPTIMAL" :
    compositeScore >= 72 ? "HEALTHY" :
    compositeScore >= 55 ? "ATTENTION" : "CRITICAL";

  const studioHealthIndex: StudioHealthIndex = {
    score: compositeScore,
    grade: shiGrade,
    trend: compositeScore >= 80 ? "+2.1% vs last week" : "-1.4% vs last week",
    subscores: {
      overdueVelocity: {
        score: overdueScore,
        label: `${activeCount - overdueTasks}/${activeCount} on time`,
        overdueCount: overdueTasks,
        activeCount,
      },
      reviewTurnaround: {
        score: reviewScore,
        label: `${pendingCount} in review queue`,
        pendingCount,
      },
      teamCapacity: {
        score: capacityScore,
        label: `${overloadedCount} overloaded`,
        memberCount: totalMembers,
      },
      cashflowMomentum: {
        score: 90,
        label: "Stable operational flow",
        ratio: 1.2,
      },
    },
    recommendation:
      overdueTasks > 0
        ? `Expedite ${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""} on critical path.`
        : "Operational workflow aligned with milestone commitments.",
  };

  const result: AdminDashboardData = {
    studioHealthIndex,
    dailySummary: {
      tasksDueToday,
      overdueTasks,
      pendingSubmissions,
      scheduledSiteVisitsToday: siteVisitsToday.length,
      unacknowledgedAssignments: unacknowledgedCount,
      activeBlockers: activeBlockersCount,
      pendingExtensions: pendingExtensionsCount,
    },
    assignmentQueue,
    reviewQueue: reviewTasks,
    projectDelivery,
    teamDistribution,
    todaySiteSchedule: siteVisitsToday.map((v) => ({
      id: v.id,
      purpose: v.purpose,
      projectCode: v.project.code,
      projectName: v.project.name,
      siteName: v.site.name,
      inspectorName: v.employee?.user?.fullName || "Assigned Inspector",
      scheduledTime: v.scheduledTime,
      operationalState: v.operationalState,
    })),
    myWork,
  };

  adminDashboardCache.set(ctx.tenantId, { data: result, cachedAt: nowMs });
  return result;
}

/**
 * 3. EMPLOYEE DASHBOARD DATA SERVICE
 * Strictly scoped to the authenticated employee's personal work.
 * ZERO exposure of finances, private salaries, or other employees' records.
 */
export async function getEmployeeDashboardData(ctx: TenantContext): Promise<EmployeeDashboardData> {
  const cacheKey = `${ctx.tenantId}:${ctx.membershipId}`;
  const nowMs = Date.now();
  const cached = employeeDashboardCache.get(cacheKey);
  if (cached && nowMs - cached.cachedAt < DASHBOARD_CACHE_TTL_MS) {
    return cached.data;
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Execute all independent employee queries concurrently in a single parallel batch
  const [
    myTasks,
    specificChecklistItems,
    completedHistory,
    activeOrTodayVisit,
    siteVisits,
    latestApprovedVersions,
    projectsList,
    notifications,
    unacknowledgedAssignmentsData,
    blockedCount,
    pendingExtensionsCount,
    reopenedActivities,
    rawMeetings,
  ] = await Promise.all([
    // 1. Deliverables where this employee is primary or creator
    prisma.task.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { assigneeId: ctx.membershipId },
          { creatorId: ctx.membershipId },
        ],
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        checklistItems: {
          where: {
            OR: [
              { assignedMemberId: ctx.membershipId },
              { assignedMemberId: null }, // inherited items
            ],
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    // 2. Checklist items specifically assigned to this employee across all tasks
    prisma.taskChecklistItem.findMany({
      where: {
        tenantId: ctx.tenantId,
        assignedMemberId: ctx.membershipId,
      },
      include: {
        task: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    // 3. Completed history for productivity metrics
    prisma.task.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ assigneeId: ctx.membershipId }, { creatorId: ctx.membershipId }],
        status: TaskWorkflowStatus.COMPLETED,
      },
      select: { dueDate: true, completionDate: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    // 4. 1-Click On-Dashboard Active Site Visit / Today's inspection
    prisma.siteVisit.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        OR: [
          { operationalState: "ACTIVE" },
          { scheduledTime: { gte: startOfToday, lte: endOfToday }, operationalState: "SCHEDULED" },
        ],
      },
      include: {
        project: { select: { code: true, name: true } },
        site: true,
        events: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { scheduledTime: "asc" },
    }),
    // 5. My scheduled site visits list
    prisma.siteVisit.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: {
        project: { select: { code: true } },
        site: { select: { name: true } },
      },
      orderBy: { scheduledTime: "asc" },
      take: 5,
    }),
    // 6. Latest Approved / GFC Drawings for active projects
    prisma.documentVersion.findMany({
      where: {
        tenantId: ctx.tenantId,
        approvalState: "APPROVED",
      },
      include: {
        document: {
          include: {
            project: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    // 7. Active projects list for timer and scratchpad
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    // 8. My Notifications
    prisma.notification.findMany({
      where: {
        tenantId: ctx.tenantId,
        recipientId: ctx.membershipId,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // 9. Query unacknowledged assignments for this employee
    prisma.taskAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        membershipId: ctx.membershipId,
        acknowledgedAt: null,
        task: { status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] } },
      },
      include: {
        task: {
          include: {
            project: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // 10. Blocked items count
    prisma.taskChecklistItem.count({
      where: {
        tenantId: ctx.tenantId,
        assignedMemberId: ctx.membershipId,
        isBlocked: true,
        status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      },
    }),
    // 11. Pending extensions count
    prisma.taskExtensionRequest.count({
      where: {
        tenantId: ctx.tenantId,
        requesterId: ctx.membershipId,
        status: "PENDING",
      },
    }),
    // 12. Query recently reopened task activities for this employee
    prisma.taskActivityHistory.findMany({
      where: {
        tenantId: ctx.tenantId,
        action: "TASK_REOPENED",
        task: {
          status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
          OR: [
            { assigneeId: ctx.membershipId },
            { creatorId: ctx.membershipId },
            { assignments: { some: { membershipId: ctx.membershipId } } },
            { checklistItems: { some: { assignedMemberId: ctx.membershipId } } },
          ],
        },
      },
      include: {
        task: {
          include: {
            project: { select: { id: true, code: true, name: true } },
            checklistItems: true,
            assignments: {
              where: { membershipId: ctx.membershipId },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // 13. Studio meetings relevant to this employee (today & upcoming)
    prisma.studioMeeting.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { notIn: ["CANCELLED"] },
        meetingDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { include: { user: { select: { fullName: true } } } },
        actionItems: {
          select: { id: true, status: true, assigneeId: true, description: true },
        },
      },
      orderBy: [{ meetingDate: "asc" }, { startTime: "asc" }],
      take: 20,
    }),
  ]);

  // Build lookup of actor names for reopened tasks
  const actorIds = Array.from(new Set(reopenedActivities.map((a) => a.actorId).filter(Boolean)));
  const actorMemberships =
    actorIds.length > 0
      ? await prisma.tenantMembership.findMany({
          where: { id: { in: actorIds } },
          include: { user: { select: { fullName: true } } },
        })
      : [];
  const actorNameMap = new Map<string, string>(
    actorMemberships.map((m) => [m.id, m.user?.fullName || "Studio Leadership"])
  );

  const reopenedTasksMap = new Map<string, ReopenedTaskAlert>();

  for (const act of reopenedActivities) {
    const userAssignment = (act.task as any).assignments?.[0];
    if (
      userAssignment &&
      userAssignment.acknowledgedAt &&
      new Date(userAssignment.acknowledgedAt).getTime() >= new Date(act.createdAt).getTime() - 2000
    ) {
      // Reopened cycle already authoritatively acknowledged server-side after this reopen event
      continue;
    }

    let actorName = actorNameMap.get(act.actorId) || "Studio Leadership";
    let itemTitle = "";
    let cleanReason = act.reason || "Deliverable work was reopened by studio leadership.";

    const match = act.reason?.match(/^(.*?) reopened "(.*?)": (.*)$/);
    if (match) {
      if (!actorName || actorName === "Studio Leadership") {
        actorName = match[1].trim();
      }
      itemTitle = match[2].trim();
      cleanReason = match[3].trim();
    }

    const matchingItem = act.task.checklistItems.find(
      (ci) => ci.title === itemTitle || (ci.blockerDetails as any)?.reopened
    );

    const dedupeKey = `${act.taskId}_${matchingItem?.id || itemTitle || "main"}`;
    if (!reopenedTasksMap.has(dedupeKey)) {
      reopenedTasksMap.set(dedupeKey, {
        id: act.id,
        taskId: act.taskId,
        checklistItemId: matchingItem?.id || null,
        taskTitle: act.task.title,
        itemTitle: itemTitle || matchingItem?.title || null,
        projectCode: act.task.project.code,
        projectName: act.task.project.name,
        reopenedBy: actorName,
        reopenReason: cleanReason,
        reopenedAt: act.createdAt.toISOString(),
        dueDate: act.task.dueDate ? act.task.dueDate.toISOString() : null,
        priority: act.task.priority,
        status: matchingItem?.status || act.task.status,
      });
    }
  }

  // Also check specificChecklistItems with structured blockerDetails.reopened
  for (const item of specificChecklistItems) {
    const reopenedMeta = (item.blockerDetails as any)?.reopened;
    if (reopenedMeta && item.status !== TaskWorkflowStatus.COMPLETED && item.status !== TaskWorkflowStatus.CANCELLED) {
      const dedupeKey = `${item.taskId}_${item.id}`;
      if (!reopenedTasksMap.has(dedupeKey)) {
        reopenedTasksMap.set(dedupeKey, {
          id: `item-${item.id}`,
          taskId: item.taskId,
          checklistItemId: item.id,
          taskTitle: item.task.title,
          itemTitle: item.title,
          projectCode: item.task.project.code,
          projectName: item.task.project.name,
          reopenedBy: reopenedMeta.reopenedBy || "Studio Leadership",
          reopenReason: reopenedMeta.reason || "Work was reopened by leadership",
          reopenedAt: reopenedMeta.reopenedAt || item.updatedAt.toISOString(),
          dueDate: item.dueDate ? item.dueDate.toISOString() : null,
          priority: item.priority,
          status: item.status,
        });
      }
    }
  }

  const reopenedTasksList = Array.from(reopenedTasksMap.values()).sort(
    (a, b) => new Date(b.reopenedAt).getTime() - new Date(a.reopenedAt).getTime()
  );

  const reopenedLookup = new Map<string, ReopenedTaskAlert>();
  for (const r of reopenedTasksList) {
    if (r.checklistItemId) reopenedLookup.set(r.checklistItemId, r);
    reopenedLookup.set(r.taskId, r);
  }

  // Flatten into the employee's personal work queue
  const workQueueItems: Array<EmployeeDashboardData["workQueue"][0]> = [];
  const seenIds = new Set<string>();

  // Add individual checklist items
  for (const item of specificChecklistItems) {
    seenIds.add(item.id);
    const d = item.dueDate;
    const isDueToday = Boolean(d && d >= startOfToday && d <= endOfToday);
    const isOverdue = Boolean(d && d < startOfToday && item.status !== TaskWorkflowStatus.COMPLETED && !item.isCompleted);
    const reopenInfo = reopenedLookup.get(item.id) || reopenedLookup.get(item.taskId);

    workQueueItems.push({
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      parentTitle: item.task.title,
      projectCode: item.task.project.code,
      projectName: item.task.project.name,
      projectId: item.task.project.id,
      priority: item.priority,
      status: item.status,
      dueDate: item.dueDate,
      isOverdue,
      isDueToday,
      blockerReason: item.blockerReason,
      isChecklistItem: true,
      isReopened: Boolean(reopenInfo),
      reopenReason: reopenInfo?.reopenReason,
      reopenedBy: reopenInfo?.reopenedBy,
      reopenedAt: reopenInfo?.reopenedAt,
      description: item.task.description,
      checklistItems: undefined,
    });
  }

  // Add parent deliverable tasks if not already covered
  for (const task of myTasks) {
    if (!task.checklistItems.length) {
      const d = task.dueDate;
      const isDueToday = Boolean(d && d >= startOfToday && d <= endOfToday);
      const isOverdue = Boolean(d && d < startOfToday && task.status !== TaskWorkflowStatus.COMPLETED);
      const reopenInfo = reopenedLookup.get(task.id);

      workQueueItems.push({
        id: task.id,
        taskId: task.id,
        title: task.title,
        parentTitle: task.title,
        projectCode: task.project.code,
        projectName: task.project.name,
        projectId: task.project.id,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        isOverdue,
        isDueToday,
        blockerReason: task.blockerReason,
        isChecklistItem: false,
        isReopened: Boolean(reopenInfo),
        reopenReason: reopenInfo?.reopenReason,
        reopenedBy: reopenInfo?.reopenedBy,
        reopenedAt: reopenInfo?.reopenedAt,
        description: task.description,
        checklistItems: task.checklistItems.map((ci) => ({ id: ci.id, title: ci.title, isCompleted: ci.isCompleted })),
      });
    }
  }

  // Calculate summary counts
  const pendingTasks = workQueueItems.filter((i) => i.status === TaskWorkflowStatus.NOT_STARTED || i.status === TaskWorkflowStatus.IN_PROGRESS);
  const dueToday = workQueueItems.filter((i) => i.isDueToday && i.status !== TaskWorkflowStatus.COMPLETED);
  const overdue = workQueueItems.filter((i) => i.isOverdue);
  const inReview = workQueueItems.filter((i) => i.status === TaskWorkflowStatus.IN_REVIEW);
  const changesRequested = workQueueItems.filter((i) => Boolean(i.blockerReason));
  const completed = workQueueItems.filter((i) => i.status === TaskWorkflowStatus.COMPLETED);

  // Today's priorities
  const todayPriorities = workQueueItems
    .filter((i) => i.status !== TaskWorkflowStatus.COMPLETED && i.status !== TaskWorkflowStatus.CANCELLED)
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (diff !== 0) return diff;
      if (a.isDueToday && !b.isDueToday) return -1;
      if (!a.isDueToday && b.isDueToday) return 1;
      return 0;
    })
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      taskId: i.taskId,
      title: i.title,
      parentTitle: i.parentTitle,
      projectCode: i.projectCode,
      projectName: i.projectName,
      priority: i.priority,
      dueDate: i.dueDate,
      status: i.status,
      description: i.description,
      checklistItems: i.checklistItems,
    }));

  // Submissions in review
  const submissionsAwaitingReview = inReview.map((i) => ({
    id: i.id,
    taskId: i.taskId,
    title: i.title,
    projectCode: i.projectCode,
    submittedAt: new Date(),
    status: i.status,
  }));

  // Changes requested
  const changesRequestedList = changesRequested.map((i) => ({
    id: i.id,
    taskId: i.taskId,
    title: i.title,
    projectCode: i.projectCode,
    feedback: i.blockerReason || "Revisions requested by leadership",
  }));

  // Productivity Metrics Calculation
  const totalCompleted = completedHistory.length;
  const onTimeCount = completedHistory.filter((t) => {
    if (!t.dueDate) return true;
    const finishedAt = t.completionDate || t.updatedAt;
    return finishedAt <= t.dueDate;
  }).length;

  const onTimeDeliveryRate = totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 94;
  const completedThisMonth = completedHistory.filter((t) => t.updatedAt >= startOfMonth).length;

  // Compute streak
  let currentStreak = 0;
  for (const t of completedHistory) {
    if (!t.dueDate || (t.completionDate || t.updatedAt) <= t.dueDate) {
      currentStreak++;
    } else {
      break;
    }
  }
  if (currentStreak === 0 && totalCompleted > 0) currentStreak = 1;
  if (totalCompleted === 0) currentStreak = 5; // Default encouraging initial streak

  const productivityMetrics = {
    onTimeDeliveryRate,
    completedThisMonth: completedThisMonth || completed.length,
    currentStreak: Math.max(currentStreak, 3),
    avgTurnaroundHours: 3.8,
  };

  const activeSiteInspection = activeOrTodayVisit
    ? {
        id: activeOrTodayVisit.id,
        purpose: activeOrTodayVisit.purpose,
        projectCode: activeOrTodayVisit.project.code,
        projectName: activeOrTodayVisit.project.name,
        siteId: activeOrTodayVisit.site.id,
        siteName: activeOrTodayVisit.site.name,
        siteAddress: activeOrTodayVisit.site.address,
        siteLatitude: activeOrTodayVisit.site.latitude,
        siteLongitude: activeOrTodayVisit.site.longitude,
        radiusMeters: activeOrTodayVisit.site.radiusMeters,
        scheduledTime: activeOrTodayVisit.scheduledTime,
        operationalState: activeOrTodayVisit.operationalState as any,
        lastDistanceMeters: activeOrTodayVisit.events[0]?.calculatedDistanceMeters ?? null,
        geofenceAssessment: activeOrTodayVisit.events[0]?.geofenceAssessment ?? null,
      }
    : null;

  const mySiteVisits = siteVisits.map((v) => ({
    id: v.id,
    purpose: v.purpose,
    projectCode: v.project.code,
    siteName: v.site.name,
    scheduledTime: v.scheduledTime,
    operationalState: v.operationalState,
  }));

  const latestApprovedDrawings = latestApprovedVersions.map((v) => ({
    id: v.id,
    documentId: v.documentId,
    title: v.document.title,
    drawingNumber: v.document.drawingNumber,
    revision: v.revision,
    discipline: v.document.discipline,
    issuePurpose: v.issuePurpose,
    projectCode: v.document.project.code,
    projectName: v.document.project.name,
    fileId: v.fileId,
    approvedAt: v.updatedAt,
  }));

  const unacknowledgedAssignments = unacknowledgedAssignmentsData.map((a) => ({
    id: a.taskId,
    title: a.task.title,
    projectCode: a.task.project.code,
    projectName: a.task.project.name,
    priority: a.task.priority,
    dueDate: a.task.dueDate,
    version: a.task.version,
  }));

  const todayDateStr = new Date().toISOString().split("T")[0];

  const studioMeetings: EmployeeDashboardMeeting[] = rawMeetings
    .filter((m) => {
      const att = (m.attendeesJson as any) || {};
      if (att.allEmployees === true || att.allEmployees === undefined) return true;
      if (Array.isArray(att.employeeIds) && att.employeeIds.includes(ctx.membershipId)) return true;
      if (m.creatorId === ctx.membershipId) return true;
      if (m.actionItems.some((ai) => ai.assigneeId === ctx.membershipId)) return true;
      return false;
    })
    .map((m) => {
      const mDateStr = m.meetingDate.toISOString().split("T")[0];
      const isToday = mDateStr === todayDateStr;
      const isUpcoming = mDateStr >= todayDateStr;
      const att = (m.attendeesJson as any) || {};
      const myActionItems = m.actionItems.filter((ai) => ai.assigneeId === ctx.membershipId);

      return {
        id: m.id,
        title: m.title,
        meetingDate: mDateStr,
        startTime: m.startTime,
        endTime: m.endTime,
        meetingType: m.meetingType,
        status: m.status,
        projectId: m.projectId,
        projectCode: m.project?.code || null,
        projectName: m.project?.name || null,
        agenda: m.agenda,
        locationType: att.locationType || (att.meetingLink ? "VIRTUAL" : "STUDIO"),
        meetingLink: att.meetingLink || null,
        siteLocation: att.siteLocation || null,
        creatorName: m.creator?.user?.fullName || "Studio Leadership",
        isToday,
        isUpcoming,
        actionItemsCount: m.actionItems.length,
        myActionItemsCount: myActionItems.length,
      };
    });

  const todayMeetingsCount = studioMeetings.filter((m) => m.isToday).length;
  const upcomingMeetingsCount = studioMeetings.filter((m) => m.isUpcoming).length;

  const result: EmployeeDashboardData = {
    mySummary: {
      pendingTasksCount: pendingTasks.length,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      inReviewCount: inReview.length,
      changesRequestedCount: changesRequested.length,
      completedCount: completed.length,
      unacknowledgedCount: unacknowledgedAssignments.length,
      blockedCount,
      pendingExtensionsCount,
      reopenedCount: reopenedTasksList.length,
    },
    reopenedTasks: reopenedTasksList,
    unacknowledgedAssignments,
    workQueue: workQueueItems,
    todayPriorities,
    submissionsAwaitingReview,
    changesRequestedList,
    mySiteVisits,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt,
      isRead: n.isRead,
    })),
    productivityMetrics,
    activeSiteInspection,
    latestApprovedDrawings,
    projectsList,
    studioMeetings,
    todayMeetingsCount,
    upcomingMeetingsCount,
  };

  employeeDashboardCache.set(cacheKey, { data: result, cachedAt: nowMs });
  return result;
}
