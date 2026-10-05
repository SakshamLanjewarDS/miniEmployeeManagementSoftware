import { prisma } from "../../db/prisma";
import { TenantContext, canApproveWork, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { TaskPriority, TaskWorkflowStatus } from "@prisma/client";

export interface TaskFilterParams {
  filter?: "TODAY" | "UPCOMING" | "OVERDUE" | "IN_PROGRESS" | "WAITING_REVIEW" | "COMPLETED" | "ALL";
  dueDateCategory?: "TODAY" | "UPCOMING" | "OVERDUE" | "ALL";
  statusCategory?: TaskWorkflowStatus | "ALL";
  priority?: TaskPriority | "ALL";
  projectId?: string;
  assigneeId?: string;
  myTasksOnly?: boolean;
  search?: string;
}

export interface CreateTaskData {
  projectId: string;
  phaseId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority: TaskPriority;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
}

/**
 * Calculates start and end of current calendar day in the workspace timezone
 */
export function getWorkspaceDayBoundaries(timezone: string = "Asia/Kolkata") {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
    const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

    const startOfToday = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    return { startOfToday, endOfToday };
  } catch {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startOfToday, endOfToday };
  }
}

export async function findTasks(ctx: TenantContext, params: TaskFilterParams = {}) {
  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  const whereClause: any = {
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  // Employees can only ever see their own assigned tasks
  if (params.myTasksOnly || !isAdminOrOwner(ctx)) {
    whereClause.assigneeId = ctx.membershipId;
  } else if (params.assigneeId) {
    whereClause.assigneeId = params.assigneeId;
  }

  if (params.projectId) {
    whereClause.projectId = params.projectId;
  }

  if (params.priority && params.priority !== "ALL") {
    whereClause.priority = params.priority;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    whereClause.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  // 1. Due Date Category Filter (Today, Overdue, Upcoming)
  const dueFilter = params.dueDateCategory || (
    params.filter === "TODAY" || params.filter === "OVERDUE" || params.filter === "UPCOMING"
      ? params.filter
      : undefined
  );

  if (dueFilter === "TODAY") {
    whereClause.dueDate = { gte: startOfToday, lte: endOfToday };
    whereClause.status = { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] };
  } else if (dueFilter === "OVERDUE") {
    whereClause.dueDate = { lt: startOfToday };
    whereClause.status = { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] };
  } else if (dueFilter === "UPCOMING") {
    whereClause.dueDate = { gt: endOfToday };
    whereClause.status = { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] };
  }

  // 2. Status Category Filter (can overlap with due date filters)
  const statusFilter = params.statusCategory || (
    params.filter === "IN_PROGRESS"
      ? TaskWorkflowStatus.IN_PROGRESS
      : params.filter === "WAITING_REVIEW"
      ? TaskWorkflowStatus.IN_REVIEW
      : params.filter === "COMPLETED"
      ? TaskWorkflowStatus.COMPLETED
      : undefined
  );

  if (statusFilter && statusFilter !== "ALL") {
    whereClause.status = statusFilter;
  }

  return await prisma.task.findMany({
    where: whereClause,
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      phase: {
        select: {
          id: true,
          phaseName: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          employee: {
            select: {
              employeeId: true,
              designation: true,
            },
          },
        },
      },
      creator: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      checklistItems: {
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 20,
      },
      activityHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

export async function findTaskById(ctx: TenantContext, taskId: string) {
  return await prisma.task.findFirst({
    where: {
      id: taskId,
      tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
    },
    include: {
      project: true,
      phase: true,
      assignee: {
        include: {
          user: true,
          employee: true,
        },
      },
      creator: {
        include: {
          user: true,
        },
      },
      checklistItems: {
        orderBy: { sortOrder: "asc" },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
      activityHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createTask(ctx: TenantContext, data: CreateTaskData) {
  // Verify project belongs to this tenant
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, tenantId: ctx.tenantId },
  });

  if (!project) {
    throw new Error("Project not found in this studio workspace");
  }

  const task = await prisma.task.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: data.projectId,
      phaseId: data.phaseId,
      title: data.title.trim(),
      description: data.description,
      assigneeId: data.assigneeId,
      creatorId: ctx.membershipId,
      priority: data.priority,
      status: TaskWorkflowStatus.NOT_STARTED,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
    },
  });

  // Create real-time notification for the assigned employee
  if (data.assigneeId) {
    try {
      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: data.assigneeId,
          title: "New Task Assigned",
          message: `${ctx.userFullName || "A manager"} assigned you a new task: "${task.title}" (${project.code}).`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        },
      });
    } catch (err) {
      console.error("Failed to create task assignment notification:", err);
    }
  }

  return task;
}

/**
 * Transition task workflow status with strict permission rules:
 * - NOT_STARTED -> IN_PROGRESS
 * - IN_PROGRESS -> IN_REVIEW (Submit for review)
 * - IN_REVIEW -> COMPLETED (Approve: Forbidden for assignee to self-approve!)
 * - IN_REVIEW -> IN_PROGRESS (Request Changes: requires comment)
 * - Any -> COMPLETED (Direct completion override: Admin/Owner only with audit reason)
 */
export async function transitionTaskStatus(
  ctx: TenantContext,
  taskId: string,
  newStatus: TaskWorkflowStatus,
  options: {
    comment?: string;
    auditReason?: string;
  } = {}
) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found in this studio workspace");
  }

  const oldStatus = task.status;
  if (oldStatus === newStatus) {
    return task;
  }

  const isAssignee = task.assigneeId === ctx.membershipId;
  const isPrivileged = isAdminOrOwner(ctx);

  // Workflow validation
  if (newStatus === TaskWorkflowStatus.COMPLETED) {
    if (oldStatus === TaskWorkflowStatus.IN_REVIEW) {
      // Check: No Self-Approval!
      if (isAssignee && !isPrivileged) {
        throw new ForbiddenException(
          "Self-approval is forbidden. An independent reviewer or project manager must approve your deliverable."
        );
      }
    } else {
      // Direct completion without review
      if (!isPrivileged) {
        throw new ForbiddenException(
          "Direct completion override requires Administrator or Partner authority with an audit reason."
        );
      }
      if (!options.auditReason) {
        throw new Error("An audit reason is required for direct completion override.");
      }
    }
  }

  if (oldStatus === TaskWorkflowStatus.IN_REVIEW && newStatus === TaskWorkflowStatus.IN_PROGRESS) {
    // Reviewer requested changes
    if (!options.comment) {
      throw new Error("A review comment detailing requested changes is required.");
    }
  }

  // Execute update in transaction with activity history
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completionDate: newStatus === TaskWorkflowStatus.COMPLETED ? new Date() : null,
        version: { increment: 1 },
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "STATUS_CHANGED",
        oldValue: oldStatus,
        newValue: newStatus,
        reason: options.comment || options.auditReason || `Workflow transition from ${oldStatus} to ${newStatus}`,
      },
    });

    if (options.comment) {
      await tx.taskComment.create({
        data: {
          tenantId: ctx.tenantId,
          taskId: task.id,
          authorId: ctx.membershipId,
          content: `[Status: ${newStatus}] ${options.comment}`,
        },
      });
    }

    // Real-time status notifications
    if (newStatus === TaskWorkflowStatus.IN_REVIEW && task.creatorId && task.creatorId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: task.creatorId,
            title: "Task Review Requested",
            message: `${ctx.userFullName} submitted task "${task.title}" for review.`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to create review notification:", e);
      }
    } else if (newStatus === TaskWorkflowStatus.COMPLETED && task.assigneeId && task.assigneeId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: task.assigneeId,
            title: "Task Approved & Completed",
            message: `${ctx.userFullName} approved and marked task "${task.title}" as Completed!`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to create approval notification:", e);
      }
    } else if (oldStatus === TaskWorkflowStatus.IN_REVIEW && newStatus === TaskWorkflowStatus.IN_PROGRESS && task.assigneeId && task.assigneeId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: task.assigneeId,
            title: "Task Revisions Requested",
            message: `${ctx.userFullName} requested changes on "${task.title}": ${options.comment || "See comments"}`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to create changes requested notification:", e);
      }
    }

    return updated;
  });
}

/**
 * Project task progress calculation:
 * completed active tasks / all active tasks (excluding cancelled).
 * Returns { percentage: number, label: string }
 */
export async function calculateProjectTaskProgress(ctx: TenantContext, projectId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      tenantId: ctx.tenantId,
      status: { not: TaskWorkflowStatus.CANCELLED },
    },
    select: { status: true },
  });

  const total = tasks.length;
  if (total === 0) {
    return {
      percentage: 0,
      label: "No tasks",
      completedCount: 0,
      totalCount: 0,
    };
  }

  const completed = tasks.filter((t) => t.status === TaskWorkflowStatus.COMPLETED).length;
  const percentage = Math.round((completed / total) * 100);

  return {
    percentage,
    label: `${percentage}% Task completion (${completed}/${total})`,
    completedCount: completed,
    totalCount: total,
  };
}

/**
 * Reassign / Delegate task:
 * - Boss and Admin can reassign any task.
 * - Current assignee can reassign/delegate their own assigned task to another employee in the tenant.
 * - Captures activity history, delegation comment, and audit event.
 */
export async function reassignTask(
  ctx: TenantContext,
  taskId: string,
  newAssigneeMembershipId: string,
  handoverReason?: string
) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found in this studio workspace");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isCurrentAssignee = task.assigneeId === ctx.membershipId;

  if (!isPrivileged && !isCurrentAssignee) {
    throw new ForbiddenException(
      "You can only delegate tasks assigned to you. Studio Boss or Admin privileges required to reassign tasks for other members."
    );
  }

  // Validate target assignee exists in this tenant
  const targetMember = await prisma.tenantMembership.findFirst({
    where: {
      id: newAssigneeMembershipId,
      tenantId: ctx.tenantId,
      isActive: true,
    },
    include: {
      user: { select: { fullName: true, email: true } },
      employee: { select: { employeeId: true, designation: true } },
    },
  });

  if (!targetMember) {
    throw new Error("Target employee was not found in this studio workspace or is inactive.");
  }

  const oldAssigneeName = task.assignee?.user?.fullName || "Unassigned";
  const newAssigneeName = targetMember.user.fullName;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        assigneeId: targetMember.id,
        version: { increment: 1 },
      },
    });

    const note = handoverReason?.trim()
      ? `Task delegated by ${ctx.userFullName} to ${newAssigneeName}: ${handoverReason.trim()}`
      : `Task reassigned from ${oldAssigneeName} to ${newAssigneeName}`;

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "REASSIGNED",
        oldValue: oldAssigneeName,
        newValue: newAssigneeName,
        reason: note,
      },
    });

    await tx.taskComment.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        authorId: ctx.membershipId,
        content: `[Task Delegation] Reassigned to ${newAssigneeName} (${targetMember.employee?.employeeId || "Staff"}). ${handoverReason ? `Reason: ${handoverReason}` : ""}`,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: task.projectId,
        action: "TASK_REASSIGNED",
        entityType: "Task",
        entityId: task.id,
        safeChangeSummary: `Delegated task "${task.title}" to ${newAssigneeName}`,
      },
    });

    // Create real-time notification for the newly assigned employee
    if (newAssigneeMembershipId && newAssigneeMembershipId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: newAssigneeMembershipId,
            title: "Task Reassigned to You",
            message: `${ctx.userFullName} assigned task "${task.title}" to you.${handoverReason ? ` Note: ${handoverReason.trim()}` : ""}`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (err) {
        console.error("Failed to create task reassignment notification:", err);
      }
    }

    return updated;
  });
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  phaseId?: string | null;
}

/**
 * Edit task details:
 * - Assignee or Boss/Admin can update title, description, priority, due date, estimated hours.
 */
export async function updateTask(
  ctx: TenantContext,
  taskId: string,
  data: UpdateTaskData
) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found in this studio workspace");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isAssignee = task.assigneeId === ctx.membershipId;

  if (!isPrivileged && !isAssignee) {
    throw new ForbiddenException(
      "You can only edit tasks assigned to you, or have Studio Boss/Admin privileges."
    );
  }

  // Strict Employee Field Restrictions: Employees cannot change protected fields
  if (!isPrivileged) {
    if (data.priority !== undefined || data.dueDate !== undefined || data.phaseId !== undefined) {
      throw new ForbiddenException(
        "Employees cannot modify protected task fields (priority, due date, project/phase links). Only task progress, deliverable descriptions, estimated hours, checklists, and comments can be updated."
      );
    }
  }

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;
  if (data.estimatedHours !== undefined) updatePayload.estimatedHours = data.estimatedHours;
  if (data.phaseId !== undefined) updatePayload.phaseId = data.phaseId;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ...updatePayload,
        version: { increment: 1 },
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "TASK_EDITED",
        reason: `Task details edited by ${ctx.userFullName}`,
      },
    });

    return updated;
  });
}

/**
 * Toggle or update checklist item status:
 * - Assignee or Boss/Admin can toggle checklist completion.
 */
export async function toggleChecklistItem(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  isCompleted: boolean
) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isAssignee = task.assigneeId === ctx.membershipId;

  if (!isPrivileged && !isAssignee) {
    throw new ForbiddenException("Only the assignee or Studio Admin/Boss can update checklist items.");
  }

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });

  if (!item) {
    throw new Error("Checklist item not found");
  }

  return await prisma.taskChecklistItem.update({
    where: { id: itemId },
    data: {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedById: isCompleted ? ctx.membershipId : null,
    },
  });
}

/**
 * Add discussion comment or feedback to a task
 */
export async function addTaskComment(
  ctx: TenantContext,
  taskId: string,
  content: string
) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found in this studio workspace");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isAssignee = task.assigneeId === ctx.membershipId;

  if (!isPrivileged && !isAssignee) {
    throw new ForbiddenException("You can only comment on tasks assigned to you.");
  }

  if (!content || !content.trim()) {
    throw new Error("Comment content cannot be empty.");
  }

  return await prisma.$transaction(async (tx) => {
    const comment = await tx.taskComment.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        authorId: ctx.membershipId,
        content: content.trim(),
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "COMMENT_ADDED",
        reason: `${ctx.userFullName} commented on task deliverable`,
      },
    });

    return comment;
  });
}

/**
 * Compute summary dashboard metrics in the workspace timezone
 * Optimized to a single lightweight query instead of 5 separate roundtrips.
 */
export async function getTaskDashboardMetrics(ctx: TenantContext, myTasksOnly: boolean = false) {
  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  const baseWhere: any = {
    tenantId: ctx.tenantId,
  };
  if (myTasksOnly || !isAdminOrOwner(ctx)) {
    baseWhere.assigneeId = ctx.membershipId;
  }

  // 1 single query fetching only status & dueDate instead of 5 separate roundtrips
  const tasks = await prisma.task.findMany({
    where: baseWhere,
    select: {
      status: true,
      dueDate: true,
    },
  });

  let dueToday = 0;
  let overdue = 0;
  let inProgress = 0;
  let waitingReview = 0;
  let completed = 0;

  for (const t of tasks) {
    if (t.status === TaskWorkflowStatus.IN_PROGRESS) inProgress++;
    else if (t.status === TaskWorkflowStatus.IN_REVIEW) waitingReview++;
    else if (t.status === TaskWorkflowStatus.COMPLETED) completed++;

    const isActive = t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED;
    if (isActive && t.dueDate) {
      if (t.dueDate >= startOfToday && t.dueDate <= endOfToday) {
        dueToday++;
      } else if (t.dueDate < startOfToday) {
        overdue++;
      }
    }
  }

  return {
    dueToday,
    overdue,
    inProgress,
    waitingReview,
    completed,
  };
}

/**
 * Delete a task deliverable:
 * - Studio Boss (OWNER) or Admin can delete any task in the tenant.
 * - The employee who created/assigned the task can delete their task.
 * - Enforces strict tenant isolation.
 * - Records an audit event before permanent deletion.
 */
export async function deleteTask(ctx: TenantContext, taskId: string) {
  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task not found in this studio workspace");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isCreator = task.creatorId === ctx.membershipId;

  if (!isPrivileged && !isCreator) {
    throw new ForbiddenException(
      "Only Studio Owners, Administrators, or the person who assigned the task can delete this deliverable."
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Record audit event for studio compliance & traceability
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: task.projectId,
        action: "TASK_DELETED",
        entityType: "Task",
        entityId: task.id,
        safeChangeSummary: `${ctx.userFullName} deleted task deliverable "${task.title}" (Project: ${task.project.code})`,
      },
    });

    // 2. Delete child items (cascade)
    await tx.taskChecklistItem.deleteMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
    });
    await tx.taskComment.deleteMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
    });
    await tx.taskActivityHistory.deleteMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
    });

    // 3. Nullify references in site visits or documents if any
    await tx.siteVisit.updateMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
      data: { taskId: null },
    });
    await tx.document.updateMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
      data: { taskId: null },
    });
    await tx.approvalRequest.deleteMany({
      where: { taskId: task.id, tenantId: ctx.tenantId },
    });

    // 4. Finally delete the task
    const deleted = await tx.task.delete({
      where: { id: task.id },
    });

    return deleted;
  });
}
