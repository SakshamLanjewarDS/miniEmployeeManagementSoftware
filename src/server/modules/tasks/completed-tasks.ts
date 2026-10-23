import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { TaskWorkflowStatus, TaskPriority } from "@prisma/client";
import { getWorkspaceDayBoundaries } from "./repository";

export interface CompletedTasksFilterParams {
  search?: string;
  employeeIds?: string[];
  projectIds?: string[];
  priorities?: string[];
  dateRange?: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM" | "ALL_TIME";
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onTimeStatus?: "ALL" | "ON_TIME" | "LATE" | "NO_DUE_DATE" | "UNKNOWN";
  hasReopenHistory?: boolean;
  sortBy?: "completedAt_desc" | "completedAt_asc" | "dueDate" | "priority" | "project" | "employee";
  page?: number;
  pageSize?: number;
}

/**
 * Builds the canonical Completed Tasks WHERE query with strict tenant isolation,
 * role authorization, and advanced filter predicates.
 */
export async function buildCompletedTasksQuery(ctx: TenantContext, params: CompletedTasksFilterParams) {
  const isPrivileged = isAdminOrOwner(ctx);

  const andConditions: any[] = [
    { tenantId: ctx.tenantId },
    { status: TaskWorkflowStatus.COMPLETED },
  ];

  // 1. Employee / Assignee Authorization & Scoping
  if (!isPrivileged) {
    // Non-privileged employee is strictly server-scoped to their own tasks
    andConditions.push({
      OR: [
        { assigneeId: ctx.membershipId },
        { assignments: { some: { membershipId: ctx.membershipId } } },
        { creatorId: ctx.membershipId },
      ],
    });
  } else if (params.employeeIds && params.employeeIds.length > 0) {
    // Owner / Admin filtering by one or more employees
    andConditions.push({
      OR: [
        { assigneeId: { in: params.employeeIds } },
        { assignments: { some: { membershipId: { in: params.employeeIds } } } },
      ],
    });
  }

  // 2. Project Filter
  if (params.projectIds && params.projectIds.length > 0) {
    andConditions.push({ projectId: { in: params.projectIds } });
  }

  // 3. Priority Filter
  if (params.priorities && params.priorities.length > 0) {
    andConditions.push({ priority: { in: params.priorities as TaskPriority[] } });
  }

  // 4. Search Filter (title, description, project name, or code)
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { project: { name: { contains: q } } },
        { project: { code: { contains: q } } },
      ],
    });
  }

  // 5. Completion Date Range
  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  if (params.dateRange === "TODAY") {
    andConditions.push({ completionDate: { gte: startOfToday, lte: endOfToday } });
  } else if (params.dateRange === "THIS_WEEK") {
    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1); // Monday
    andConditions.push({ completionDate: { gte: startOfWeek, lte: endOfToday } });
  } else if (params.dateRange === "THIS_MONTH") {
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    andConditions.push({ completionDate: { gte: startOfMonth, lte: endOfToday } });
  } else if (params.dateRange === "LAST_MONTH") {
    const startOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1);
    const endOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0, 23, 59, 59, 999);
    andConditions.push({ completionDate: { gte: startOfLastMonth, lte: endOfLastMonth } });
  } else if (params.dateRange === "CUSTOM" && (params.startDate || params.endDate)) {
    const rangeClause: any = {};
    if (params.startDate) rangeClause.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    if (params.endDate) rangeClause.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    andConditions.push({ completionDate: rangeClause });
  }

  // 6. Reopen History Filter
  if (params.hasReopenHistory === true) {
    andConditions.push({ reopenCount: { gt: 0 } });
  }

  return { AND: andConditions };
}

/**
 * Retrieves paginated completed tasks, sorting, and aggregate summary metrics.
 */
export async function getCompletedTasksDossier(ctx: TenantContext, params: CompletedTasksFilterParams) {
  const where = await buildCompletedTasksQuery(ctx, params);
  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize || 25, 5), 100);
  const skip = (page - 1) * pageSize;

  // Sorting
  let orderBy: any = [{ completionDate: "desc" }, { id: "asc" }];
  if (params.sortBy === "completedAt_asc") {
    orderBy = [{ completionDate: "asc" }, { id: "asc" }];
  } else if (params.sortBy === "dueDate") {
    orderBy = [{ dueDate: "asc" }, { completionDate: "desc" }];
  } else if (params.sortBy === "priority") {
    orderBy = [{ priority: "desc" }, { completionDate: "desc" }];
  } else if (params.sortBy === "project") {
    orderBy = [{ project: { name: "asc" } }, { completionDate: "desc" }];
  }

  // Execute queries: data, count, and all-matching for metric aggregation
  const [totalCount, rawTasks, allMatching] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        project: { select: { id: true, code: true, name: true, projectType: true } },
        phase: { select: { id: true, phaseName: true } },
        assignee: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            employee: { select: { employeeId: true, designation: true, department: true } },
          },
        },
        completedBy: {
          include: { user: { select: { fullName: true } } },
        },
        approvedBy: {
          include: { user: { select: { fullName: true } } },
        },
        reopenedBy: {
          include: { user: { select: { fullName: true } } },
        },
        assignments: {
          include: {
            membership: {
              include: {
                user: { select: { id: true, fullName: true, email: true } },
                employee: { select: { employeeId: true, designation: true } },
              },
            },
          },
        },
        activityHistory: {
          where: { action: { in: ["TASK_COMPLETED", "SUBMISSION_APPROVED", "TASK_REOPENED"] } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    prisma.task.findMany({
      where,
      select: {
        id: true,
        dueDate: true,
        completionDate: true,
        assigneeId: true,
        assignments: { select: { membershipId: true, isCompleted: true } },
      },
    }),
  ]);

  // Metric Computations across the full matching result set
  let onTimeCount = 0;
  let lateCount = 0;
  let noDueDateCount = 0;
  let legacyUnknownCount = 0;
  let totalContributions = 0;
  const contributingMembers = new Set<string>();

  for (const t of allMatching) {
    if (t.assigneeId) contributingMembers.add(t.assigneeId);
    for (const a of t.assignments) {
      contributingMembers.add(a.membershipId);
      if (a.isCompleted) totalContributions++;
    }

    if (!t.completionDate) {
      legacyUnknownCount++;
    } else if (!t.dueDate) {
      noDueDateCount++;
    } else if (new Date(t.completionDate).getTime() <= new Date(t.dueDate).getTime()) {
      onTimeCount++;
    } else {
      lateCount++;
    }
  }

  // Filter in-memory by onTimeStatus if requested
  let tasks = rawTasks.map((task) => {
    let timingClassification: "ON_TIME" | "LATE" | "NO_DUE_DATE" | "UNKNOWN" = "UNKNOWN";
    if (!task.completionDate) {
      timingClassification = "UNKNOWN";
    } else if (!task.dueDate) {
      timingClassification = "NO_DUE_DATE";
    } else if (new Date(task.completionDate).getTime() <= new Date(task.dueDate).getTime()) {
      timingClassification = "ON_TIME";
    } else {
      timingClassification = "LATE";
    }

    return {
      ...task,
      timingClassification,
    };
  });

  if (params.onTimeStatus && params.onTimeStatus !== "ALL") {
    tasks = tasks.filter((t) => t.timingClassification === params.onTimeStatus);
  }

  return {
    tasks,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    metrics: {
      uniqueCompletedTasks: allMatching.length,
      uniqueEmployeesContributing: contributingMembers.size,
      onTimeCount,
      lateCount,
      noDueDateCount,
      legacyUnknownCount,
      totalContributions: Math.max(totalContributions, allMatching.length),
    },
  };
}

/**
 * Escapes values to protect against CSV Formula Injection.
 * Formats CSV rows safely without leaking sensitive HR or compensation data.
 */
export async function exportCompletedTasksToCsv(ctx: TenantContext, params: CompletedTasksFilterParams) {
  const where = await buildCompletedTasksQuery(ctx, params);

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ completionDate: "desc" }, { id: "asc" }],
    include: {
      project: { select: { code: true, name: true } },
      assignee: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { employeeId: true } },
        },
      },
      assignments: {
        include: {
          membership: {
            include: { user: { select: { fullName: true } } },
          },
        },
      },
      completedBy: { include: { user: { select: { fullName: true } } } },
      approvedBy: { include: { user: { select: { fullName: true } } } },
    },
    take: 2000, // Bound maximum export size
  });

  const headers = [
    "Task ID",
    "Task Title",
    "Project Code",
    "Project Name",
    "Priority",
    "Primary Assignee",
    "Employee ID",
    "All Assignees",
    "Completed Date",
    "Due Date",
    "Timing Status",
    "Completed By",
    "Approved By",
    "Reopened Cycles",
  ];

  function sanitizeCell(val: any): string {
    if (val === null || val === undefined) return "";
    let str = String(val).replace(/"/g, '""');
    // Formula Injection Mitigation: prepend single quote if starting with formula triggers
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  }

  const rows = tasks.map((t) => {
    let timing = "Unknown";
    if (!t.completionDate) {
      timing = "Unknown / Legacy";
    } else if (!t.dueDate) {
      timing = "No Due Date";
    } else if (new Date(t.completionDate).getTime() <= new Date(t.dueDate).getTime()) {
      timing = "On-Time";
    } else {
      timing = "Late";
    }

    const allAssignees = [
      t.assignee?.user.fullName,
      ...t.assignments.map((a) => a.membership.user.fullName),
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ");

    return [
      sanitizeCell(t.id),
      sanitizeCell(t.title),
      sanitizeCell(t.project?.code || ""),
      sanitizeCell(t.project?.name || ""),
      sanitizeCell(t.priority),
      sanitizeCell(t.assignee?.user.fullName || "Unassigned"),
      sanitizeCell(t.assignee?.employee?.employeeId || "N/A"),
      sanitizeCell(allAssignees),
      sanitizeCell(t.completionDate ? t.completionDate.toISOString().split("T")[0] : "Unknown"),
      sanitizeCell(t.dueDate ? t.dueDate.toISOString().split("T")[0] : "None"),
      sanitizeCell(timing),
      sanitizeCell(t.completedBy?.user.fullName || "System"),
      sanitizeCell(t.approvedBy?.user.fullName || "Leadership"),
      sanitizeCell(t.reopenCount),
    ].join(",");
  });

  // Audit export
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "COMPLETED_TASKS_EXPORTED",
      entityType: "TASK",
      entityId: "BULK",
      safeChangeSummary: `Exported ${tasks.length} completed tasks to CSV`,
    },
  }).catch(() => {});

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Reopens a completed task back into active workflow with a required audit reason.
 */
export async function reopenCompletedTask(
  ctx: TenantContext,
  taskId: string,
  data: { reason: string }
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Leadership (Owner/Admin) can reopen completed work.");
  }
  if (!data.reason?.trim()) {
    throw new Error("A justification reason for reopening completed work is mandatory.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
    include: { assignments: true, checklistItems: true },
  });
  if (!task) throw new Error("Task not found.");

  return await prisma.$transaction(async (tx) => {
    // 1. Reopen parent deliverable
    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        status: TaskWorkflowStatus.IN_PROGRESS,
        reopenedAt: new Date(),
        reopenedById: ctx.membershipId,
        reopenReason: data.reason.trim(),
        reopenCount: { increment: 1 },
      },
    });

    // 2. Reopen assignments
    await tx.taskAssignment.updateMany({
      where: { taskId: task.id },
      data: { isCompleted: false, completedAt: null },
    });

    // 3. Reopen checklist items if any
    if (task.checklistItems.length > 0) {
      await tx.taskChecklistItem.updateMany({
        where: { taskId: task.id },
        data: { isCompleted: false, status: TaskWorkflowStatus.IN_PROGRESS },
      });
    }

    // 4. Audit history record
    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "TASK_REOPENED",
        oldValue: "COMPLETED",
        newValue: "IN_PROGRESS",
        reason: `${ctx.userFullName} reopened task "${task.title}": ${data.reason.trim()}`,
      },
    });

    // 5. Notify assignees
    const recipientIds = new Set<string>();
    if (task.assigneeId && task.assigneeId !== ctx.membershipId) recipientIds.add(task.assigneeId);
    for (const a of task.assignments) {
      if (a.membershipId !== ctx.membershipId) recipientIds.add(a.membershipId);
    }

    for (const rid of recipientIds) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: rid,
          title: `Task Reopened: ${task.title}`,
          message: `${ctx.userFullName} reopened "${task.title}": ${data.reason.trim()}`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
        },
      });
    }

    return updated;
  });
}
