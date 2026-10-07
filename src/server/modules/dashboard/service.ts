import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { TaskWorkflowStatus, TaskPriority } from "@prisma/client";
import { getWorkspaceDayBoundaries } from "../tasks/repository";

export interface OwnerDashboardData {
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
  dailySummary: {
    tasksDueToday: number;
    overdueTasks: number;
    pendingSubmissions: number;
    scheduledSiteVisitsToday: number;
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

export interface EmployeeDashboardData {
  mySummary: {
    pendingTasksCount: number;
    dueTodayCount: number;
    overdueCount: number;
    inReviewCount: number;
    changesRequestedCount: number;
    completedCount: number;
  };
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
}

/**
 * 1. OWNER DASHBOARD DATA SERVICE
 * Accessible to OWNER and ADMIN. Strict tenant isolation.
 */
export async function getOwnerDashboardData(ctx: TenantContext): Promise<OwnerDashboardData> {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Owner Dashboard is reserved for Studio Leadership (Owner/Admin).");
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  // 1. Projects Query
  const projects = await prisma.project.findMany({
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
  });

  const activeProjects = projects.filter((p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED");

  // 2. Tasks Aggregates
  const allTasks = await prisma.task.findMany({
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
  });

  const activeTasks = allTasks.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED);
  const overdueTasksCount = activeTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
  const pendingReviewsCount = allTasks.filter((t) => t.status === TaskWorkflowStatus.IN_REVIEW).length;

  // 3. Finances Query
  const [paymentsAgg, expensesAgg, milestonesAgg, contractorCount] = await Promise.all([
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
  ]);

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

  // 5. Approval Inbox
  const pendingApprovals = await prisma.approvalRequest.findMany({
    where: { tenantId: ctx.tenantId, status: "PENDING" },
    include: {
      project: { select: { code: true, name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const members = await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: {
      user: { select: { fullName: true } },
      employee: { select: { designation: true, employeeId: true } },
    },
  });

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

  // 8. Upcoming Site Visits
  const siteVisits = await prisma.siteVisit.findMany({
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
  });

  const upcomingSiteVisits = siteVisits.map((v) => ({
    id: v.id,
    purpose: v.purpose,
    projectCode: v.project.code,
    projectName: v.project.name,
    siteName: v.site.name,
    inspectorName: v.employee?.user?.fullName || "Assigned Architect",
    scheduledTime: v.scheduledTime,
  }));

  // 9. Recent Activity
  const auditEvents = await prisma.auditEvent.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { timestamp: "desc" },
    take: 8,
  });

  return {
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
}

/**
 * 2. ADMIN DASHBOARD DATA SERVICE
 * Focuses on daily coordination, queues, and task dispatch.
 */
export async function getAdminDashboardData(ctx: TenantContext): Promise<AdminDashboardData> {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Admin Dashboard is reserved for Studio Leadership (Admin/Owner).");
  }

  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  // 1. Fetch active tasks & items
  const allTasks = await prisma.task.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      project: { select: { code: true, name: true, projectType: true } },
      checklistItems: {
        include: {
          assignedMember: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  const activeTasks = allTasks.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED);

  // Counts
  const tasksDueToday = activeTasks.filter((t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday).length;
  const overdueTasks = activeTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
  const pendingSubmissions = allTasks.filter((t) => t.status === TaskWorkflowStatus.IN_REVIEW).length;

  // Site visits today
  const siteVisitsToday = await prisma.siteVisit.findMany({
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
  });

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
    }))
    .slice(0, 10);

  // 3. Review Queue: Tasks and checklist items in review
  const reviewTasks = allTasks
    .filter((t) => t.status === TaskWorkflowStatus.IN_REVIEW)
    .map((t) => {
      const waitMs = Date.now() - new Date(t.updatedAt).getTime();
      return {
        id: t.id,
        title: t.title,
        projectCode: t.project.code,
        projectName: t.project.name,
        submitterName: "Assigned Staff",
        submittedAt: t.updatedAt,
        waitingHours: Math.max(0, Math.round(waitMs / (1000 * 60 * 60))),
        priority: t.priority,
        taskId: t.id,
      };
    })
    .slice(0, 10);

  // 4. Project Delivery Progress
  const projects = await prisma.project.findMany({
    where: { tenantId: ctx.tenantId, status: { notIn: ["COMPLETED", "ARCHIVED"] } },
    include: {
      tasks: { select: { status: true, dueDate: true } },
      feeMilestones: { where: { status: { not: "PAID" } }, orderBy: { milestoneDate: "asc" }, take: 1 },
    },
    take: 8,
  });

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

  // 5. Team Work Distribution
  const members = await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: {
      user: { select: { fullName: true } },
      employee: { select: { designation: true, employeeId: true } },
    },
  });

  const teamDistribution = members.map((m) => {
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
  }).filter((m) => m.totalActive > 0).slice(0, 10);

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

  return {
    dailySummary: {
      tasksDueToday,
      overdueTasks,
      pendingSubmissions,
      scheduledSiteVisitsToday: siteVisitsToday.length,
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
}

/**
 * 3. EMPLOYEE DASHBOARD DATA SERVICE
 * Strictly scoped to the authenticated employee's personal work.
 * ZERO exposure of finances, private salaries, or other employees' records.
 */
export async function getEmployeeDashboardData(ctx: TenantContext): Promise<EmployeeDashboardData> {
  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  // 1. Fetch deliverables where this employee is primary or multi-assigned
  const myTasks = await prisma.task.findMany({
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
  });

  // Also query checklist items specifically assigned to this employee across all tasks
  const specificChecklistItems = await prisma.taskChecklistItem.findMany({
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
  });

  // Flatten into the employee's personal work queue
  const workQueueItems: Array<EmployeeDashboardData["workQueue"][0]> = [];
  const seenIds = new Set<string>();

  // Add individual checklist items
  for (const item of specificChecklistItems) {
    seenIds.add(item.id);
    const d = item.dueDate;
    const isDueToday = Boolean(d && d >= startOfToday && d <= endOfToday);
    const isOverdue = Boolean(d && d < startOfToday && item.status !== TaskWorkflowStatus.COMPLETED && !item.isCompleted);

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
    });
  }

  // Add parent deliverable tasks if not already covered
  for (const task of myTasks) {
    if (!task.checklistItems.length) {
      const d = task.dueDate;
      const isDueToday = Boolean(d && d >= startOfToday && d <= endOfToday);
      const isOverdue = Boolean(d && d < startOfToday && task.status !== TaskWorkflowStatus.COMPLETED);

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
      // Prioritize urgent/high first, then due today, then due date
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

  // My Site Visits
  const siteVisits = await prisma.siteVisit.findMany({
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
  });

  const mySiteVisits = siteVisits.map((v) => ({
    id: v.id,
    purpose: v.purpose,
    projectCode: v.project.code,
    siteName: v.site.name,
    scheduledTime: v.scheduledTime,
    operationalState: v.operationalState,
  }));

  // My Notifications
  const notifications = await prisma.notification.findMany({
    where: {
      tenantId: ctx.tenantId,
      recipientId: ctx.membershipId,
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    mySummary: {
      pendingTasksCount: pendingTasks.length,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      inReviewCount: inReview.length,
      changesRequestedCount: changesRequested.length,
      completedCount: completed.length,
    },
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
  };
}
