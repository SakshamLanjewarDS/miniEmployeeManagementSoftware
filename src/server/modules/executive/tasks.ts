import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly, formatDateOnly } from "../leave/policy";

export interface CreateExecutiveTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  category?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status?: "TO_DO" | "IN_PROGRESS" | "WAITING" | "DONE";
  startDate?: string;
  dueDate?: string;
  dueTime?: string;
  assigneeMembershipIds: string[]; // Can be 1 or multiple (joint assignment)
  sourceMeetingId?: string;
  sourceActionItemId?: string;
}

export interface ExecutiveTaskFilterOptions {
  status?: string;
  priority?: string;
  category?: string;
  projectId?: string;
  assigneeMembershipId?: string;
  isArchived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Computes the 8 Executive KPI metrics for leadership dashboard
 */
export async function getExecutiveTaskKPIMetrics(context: TenantContext) {
  assertAdminOrOwner(context);

  const today = parseDateOnly(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = formatDateOnly(today);
  const tomorrowStr = formatDateOnly(tomorrow);

  const allActiveTasks = await prisma.executiveTask.findMany({
    where: {
      tenantId: context.tenantId,
      isArchived: false,
    },
    include: {
      assignments: {
        include: {
          assignee: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });

  let totalActive = 0;
  let toDoCount = 0;
  let inProgressCount = 0;
  let waitingCount = 0;
  let doneCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueTomorrowCount = 0;

  // Workload counts per leader
  const leaderWorkload: Record<string, { name: string; count: number }> = {};

  for (const t of allActiveTasks) {
    if (t.status !== "DONE") {
      totalActive += 1;
    }

    if (t.status === "TO_DO") toDoCount++;
    else if (t.status === "IN_PROGRESS") inProgressCount++;
    else if (t.status === "WAITING") waitingCount++;
    else if (t.status === "DONE") doneCount++;

    if (t.dueDate) {
      const taskDueDateStr = formatDateOnly(t.dueDate);
      if (t.status !== "DONE" && taskDueDateStr < todayStr) {
        overdueCount++;
      } else if (taskDueDateStr === todayStr) {
        dueTodayCount++;
      } else if (taskDueDateStr === tomorrowStr) {
        dueTomorrowCount++;
      }
    }

    // Workload tracking
    for (const a of t.assignments) {
      const leaderName = a.assignee.user.fullName;
      if (!leaderWorkload[a.assigneeId]) {
        leaderWorkload[a.assigneeId] = { name: leaderName, count: 0 };
      }
      if (t.status !== "DONE") {
        leaderWorkload[a.assigneeId].count += 1;
      }
    }
  }

  return {
    totalActive,
    toDoCount,
    inProgressCount,
    waitingCount,
    doneCount,
    overdueCount,
    dueTodayCount,
    dueTomorrowCount,
    leaderWorkload: Object.values(leaderWorkload),
  };
}

/**
 * Lists executive tasks with single & joint assignment details
 */
export async function listExecutiveTasks(
  context: TenantContext,
  options: ExecutiveTaskFilterOptions = {}
) {
  assertAdminOrOwner(context);

  const whereClause: any = {
    tenantId: context.tenantId,
    isArchived: options.isArchived !== undefined ? options.isArchived : false,
  };

  if (options.status) {
    whereClause.status = options.status;
  }
  if (options.priority) {
    whereClause.priority = options.priority;
  }
  if (options.category) {
    whereClause.category = options.category;
  }
  if (options.projectId) {
    whereClause.projectId = options.projectId;
  }
  if (options.assigneeMembershipId) {
    whereClause.assignments = {
      some: { assigneeId: options.assigneeMembershipId },
    };
  }
  if (options.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { category: { contains: q } },
    ];
  }

  const tasks = await prisma.executiveTask.findMany({
    where: whereClause,
    include: {
      project: { select: { id: true, name: true, code: true } },
      creator: { include: { user: { select: { fullName: true } } } },
      assignments: {
        include: {
          assignee: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      },
      comments: {
        include: {
          author: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
      activity: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return tasks;
}

/**
 * Creates an executive task with single or joint leadership assignment
 */
export async function createExecutiveTask(
  context: TenantContext,
  input: CreateExecutiveTaskInput
) {
  assertAdminOrOwner(context);

  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Executive deliverable title is required");
  }

  const startDate = input.startDate ? parseDateOnly(input.startDate) : null;
  const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;

  return await prisma.$transaction(async (tx) => {
    // 1. Create single ExecutiveTask record
    const task = await tx.executiveTask.create({
      data: {
        tenantId: context.tenantId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        projectId: input.projectId || null,
        category: input.category || "Design Review",
        priority: input.priority || "MEDIUM",
        status: input.status || "TO_DO",
        startDate,
        dueDate,
        dueTime: input.dueTime || null,
        creatorId: context.membershipId,
        sourceMeetingId: input.sourceMeetingId || null,
        sourceActionItemId: input.sourceActionItemId || null,
      },
    });

    // 2. Create assignment rows (one or multiple for joint assignment)
    const assignees = input.assigneeMembershipIds.length > 0
      ? input.assigneeMembershipIds
      : [context.membershipId];

    for (const assigneeId of assignees) {
      await tx.executiveTaskAssignment.create({
        data: {
          tenantId: context.tenantId,
          taskId: task.id,
          assigneeId,
        },
      });

      // Notification
      await tx.studioExecutiveNotification.create({
        data: {
          tenantId: context.tenantId,
          recipientMembershipId: assigneeId,
          notificationType: "TASK_ASSIGNED",
          title: "Executive Task Assigned",
          message: `You were assigned deliverable: "${task.title}"`,
          deepLinkUrl: `/w/${context.tenantSlug}/executive-tasks`,
          relatedTaskId: task.id,
        },
      });
    }

    // 3. Log initial activity
    await tx.executiveTaskActivity.create({
      data: {
        tenantId: context.tenantId,
        taskId: task.id,
        actorId: context.membershipId,
        actionType: "CREATED",
        details: `Deliverable created by ${context.userFullName}`,
      },
    });

    return task;
  });
}

/**
 * Updates status of an executive task (To Do, In Progress, Waiting, Done)
 */
export async function updateExecutiveTaskStatus(
  context: TenantContext,
  taskId: string,
  newStatus: "TO_DO" | "IN_PROGRESS" | "WAITING" | "DONE"
) {
  assertAdminOrOwner(context);

  return await prisma.$transaction(async (tx) => {
    const task = await tx.executiveTask.findFirst({
      where: { id: taskId, tenantId: context.tenantId },
    });

    if (!task) throw new Error("Executive task not found");

    const oldStatus = task.status;
    const completedAt = newStatus === "DONE" ? new Date() : null;

    const updated = await tx.executiveTask.update({
      where: { id: task.id },
      data: {
        status: newStatus,
        completedAt,
      },
    });

    await tx.executiveTaskActivity.create({
      data: {
        tenantId: context.tenantId,
        taskId: task.id,
        actorId: context.membershipId,
        actionType: "STATUS_CHANGED",
        details: `Status transitioned from ${oldStatus} to ${newStatus} by ${context.userFullName}`,
      },
    });

    return updated;
  });
}

/**
 * Adds collaboration comment to an executive task
 */
export async function addExecutiveTaskComment(
  context: TenantContext,
  taskId: string,
  content: string
) {
  assertAdminOrOwner(context);

  if (!content || content.trim().length === 0) {
    throw new Error("Comment content cannot be empty");
  }

  const comment = await prisma.executiveTaskComment.create({
    data: {
      tenantId: context.tenantId,
      taskId,
      authorId: context.membershipId,
      content: content.trim(),
    },
  });

  await prisma.executiveTaskActivity.create({
    data: {
      tenantId: context.tenantId,
      taskId,
      actorId: context.membershipId,
      actionType: "COMMENT_ADDED",
      details: `Comment added by ${context.userFullName}`,
    },
  });

  return comment;
}
