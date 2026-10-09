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

/**
 * Helper to retrieve IDs of all tasks in the tenant where the given membership ID
 * is included in `assignedMemberIds` (JSON array of strings).
 * 
 * Compatible across TiDB Cloud and MySQL using JSON_CONTAINS, JSON_SEARCH,
 * and LIKE pattern fallback.
 */
export async function getMultiAssignedTaskIds(tenantId: string, membershipId: string): Promise<string[]> {
  if (!tenantId || !membershipId) return [];

  const taskIds = new Set<string>();

  // 1. Check junction task assignments
  try {
    const assignments = await prisma.taskAssignment.findMany({
      where: { tenantId, membershipId },
      select: { taskId: true },
    });
    for (const a of assignments) taskIds.add(a.taskId);
  } catch (err) {
    // ignore
  }

  // 2. Check individual checklist item assignments
  try {
    const checklistItems = await prisma.taskChecklistItem.findMany({
      where: { tenantId, assignedMemberId: membershipId },
      select: { taskId: true },
    });
    for (const c of checklistItems) taskIds.add(c.taskId);
  } catch (err) {
    // ignore
  }

  // 3. Check JSON assignedMemberIds
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tasks 
      WHERE tenantId = ${tenantId} 
        AND assignedMemberIds IS NOT NULL
        AND (
          JSON_CONTAINS(assignedMemberIds, JSON_QUOTE(${membershipId}))
          OR JSON_SEARCH(assignedMemberIds, 'one', ${membershipId}) IS NOT NULL
        )
    `;
    for (const r of rows) taskIds.add(r.id);
  } catch (err) {
    try {
      const fallbackRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM tasks 
        WHERE tenantId = ${tenantId} 
          AND assignedMemberIds IS NOT NULL
          AND assignedMemberIds LIKE ${`%${membershipId}%`}
      `;
      for (const r of fallbackRows) taskIds.add(r.id);
    } catch (fallbackErr) {
      console.warn("Could not query multi-assigned task IDs:", fallbackErr);
    }
  }

  return Array.from(taskIds);
}

export async function findTasks(ctx: TenantContext, params: TaskFilterParams = {}) {
  const { startOfToday, endOfToday } = getWorkspaceDayBoundaries(ctx.timezone);

  const andConditions: any[] = [
    { tenantId: ctx.tenantId }, // STRICT TENANT ISOLATION
  ];

  // Employees can see their primary assigned tasks, co-assigned tasks (in assignedMemberIds), or deliverables they created
  if (params.myTasksOnly || !isAdminOrOwner(ctx)) {
    const multiTaskIds = await getMultiAssignedTaskIds(ctx.tenantId, ctx.membershipId);
    const orClauses: any[] = [
      { assigneeId: ctx.membershipId },
      { creatorId: ctx.membershipId },
    ];
    if (multiTaskIds.length > 0) {
      orClauses.push({ id: { in: multiTaskIds } });
    }
    andConditions.push({ OR: orClauses });
  } else if (params.assigneeId) {
    const multiTaskIds = await getMultiAssignedTaskIds(ctx.tenantId, params.assigneeId);
    const orClauses: any[] = [
      { assigneeId: params.assigneeId },
    ];
    if (multiTaskIds.length > 0) {
      orClauses.push({ id: { in: multiTaskIds } });
    }
    andConditions.push({ OR: orClauses });
  }

  if (params.projectId) {
    andConditions.push({ projectId: params.projectId });
  }

  if (params.priority && params.priority !== "ALL") {
    andConditions.push({ priority: params.priority });
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    });
  }

  // 1. Due Date Category Filter (Today, Overdue, Upcoming)
  const dueFilter = params.dueDateCategory || (
    params.filter === "TODAY" || params.filter === "OVERDUE" || params.filter === "UPCOMING"
      ? params.filter
      : undefined
  );

  if (dueFilter === "TODAY") {
    andConditions.push({
      dueDate: { gte: startOfToday, lte: endOfToday },
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
    });
  } else if (dueFilter === "OVERDUE") {
    andConditions.push({
      dueDate: { lt: startOfToday },
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
    });
  } else if (dueFilter === "UPCOMING") {
    andConditions.push({
      dueDate: { gt: endOfToday },
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
    });
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
    andConditions.push({ status: statusFilter });
  }

  return await prisma.task.findMany({
    where: { AND: andConditions },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          projectType: true,
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
      reviewer: {
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
      assignments: {
        include: {
          membership: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      },
      submissions: {
        include: {
          submitter: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          reviewer: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { version: "desc" },
      },
      extensionRequests: {
        include: {
          requester: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          checklistItem: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      clarifications: {
        include: {
          author: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          answers: {
            include: {
              author: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      checklistItems: {
        include: {
          assignedMember: {
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
          prerequisiteItem: {
            select: {
              id: true,
              title: true,
              status: true,
              isCompleted: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
      reviewer: {
        include: {
          user: true,
        },
      },
      assignments: {
        include: {
          membership: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      },
      submissions: {
        include: {
          submitter: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          reviewer: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: { version: "desc" },
      },
      extensionRequests: {
        include: {
          requester: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          checklistItem: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      clarifications: {
        include: {
          author: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          answers: {
            include: {
              author: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      checklistItems: {
        include: {
          assignedMember: {
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
          prerequisiteItem: {
            select: {
              id: true,
              title: true,
              status: true,
              isCompleted: true,
            },
          },
          dependentItems: {
            select: {
              id: true,
              title: true,
              status: true,
              isCompleted: true,
            },
          },
          approvalRequests: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

export interface ChecklistItemData {
  title?: string;
  text?: string;
  description?: string;
  acceptanceCriteria?: string;
  assignedMemberId: string;
  priority?: TaskPriority;
  dueDate?: Date | string | null;
  sortOrder?: number;
  prerequisiteItemId?: string;
}

export interface CreateTaskData {
  projectId: string;
  phaseId?: string;
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  reviewerId?: string;
  referenceFiles?: any;
  assigneeId?: string;
  assigneeIds?: string[];
  priority: TaskPriority;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  checklistItems?: ChecklistItemData[];
}

export async function createTask(ctx: TenantContext, data: CreateTaskData) {
  // 1. Verify project belongs to this tenant and has valid topology
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, tenantId: ctx.tenantId },
  });

  if (!project) {
    throw new Error("Project not found in this studio workspace");
  }

  // Lifecycle check: Operational tasks cannot be assigned to Draft, On Hold, Cancelled, or Archived projects
  if (project.status === "DRAFT") {
    throw new Error("Cannot assign deliverables to a Draft project. Please activate the project first.");
  }
  if (project.status === "ON_HOLD") {
    throw new Error("Project is currently On Hold. Operational task assignments are paused until the project is resumed.");
  }
  if (project.status === "CANCELLED") {
    throw new Error("Cannot assign deliverables to a Cancelled project.");
  }
  if (project.status === "ARCHIVED") {
    throw new Error("Cannot assign deliverables to an Archived project.");
  }

  if (!project.projectType || !project.projectType.trim()) {
    throw new Error(`Project "${project.name}" (${project.code}) does not have an architectural topology configured. Please assign a topology to the project before creating deliverables.`);
  }

  // 2. Validate Architectural Brief & Instructions
  const brief = (data.description || "").trim();
  if (!brief) {
    throw new Error("Architectural Brief & Instructions are required for deliverable assignment.");
  }
  if (brief.length < 5) {
    throw new Error("Architectural Brief & Instructions must be at least 5 characters long.");
  }
  if (brief.length > 10000) {
    throw new Error("Architectural Brief & Instructions exceeds maximum length of 10,000 characters.");
  }

  // 3. Handle multi-assignee and validation
  const allAssigneeIds: string[] = Array.isArray(data.assigneeIds) && data.assigneeIds.length > 0
    ? Array.from(new Set(data.assigneeIds.filter(Boolean)))
    : (data.assigneeId ? [data.assigneeId] : []);

  if (allAssigneeIds.length === 0) {
    throw new Error("At least one eligible assignee must be selected for the deliverable.");
  }

  // Scratchpad & non-management security: Employees cannot assign other members or bypass management permissions
  if (!isAdminOrOwner(ctx)) {
    if (allAssigneeIds.length !== 1 || allAssigneeIds[0] !== ctx.membershipId) {
      throw new Error("Forbidden: Employees can only create personal tasks assigned to themselves. Management assignments require Studio Owner or Admin permissions.");
    }
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: project.id,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember && project.projectArchitectId !== ctx.membershipId && project.projectManagerId !== ctx.membershipId) {
      throw new Error("Forbidden: You must be an assigned member of this project to create deliverable tasks.");
    }
  }

  // Validate all assignees exist, are active, and belong to this tenant
  const activeMembers = await prisma.tenantMembership.findMany({
    where: {
      id: { in: allAssigneeIds },
      tenantId: ctx.tenantId,
      isActive: true,
    },
    select: { id: true, userId: true, role: true },
  });

  if (activeMembers.length !== allAssigneeIds.length) {
    throw new Error("One or more selected assignees are inactive or do not belong to this studio workspace.");
  }

  const primaryAssigneeId = allAssigneeIds[0] || null;

  // 3b. Validate Reviewer (Four-Eyes Policy)
  let validatedReviewerId = data.reviewerId || null;
  if (validatedReviewerId) {
    if (allAssigneeIds.includes(validatedReviewerId)) {
      throw new Error("Four-eyes policy violation: A deliverable assignee cannot be designated as its reviewer.");
    }
    const reviewer = await prisma.tenantMembership.findFirst({
      where: {
        id: validatedReviewerId,
        tenantId: ctx.tenantId,
        isActive: true,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!reviewer) {
      throw new Error("Designated reviewer must be an active Owner or Admin in this studio workspace.");
    }
  } else if (isAdminOrOwner(ctx) && !allAssigneeIds.includes(ctx.membershipId)) {
    validatedReviewerId = ctx.membershipId;
  }

  // 4. Server-side concise title generation if omitted
  let deliverableTitle = (data.title || "").trim();
  if (!deliverableTitle) {
    const taskCount = await prisma.task.count({
      where: { projectId: project.id, tenantId: ctx.tenantId },
    });
    deliverableTitle = `${project.code} — Deliverable #${taskCount + 1}`;
  }

  // 5. Checklist items validation & Parent due date derivation
  let derivedDueDate: Date | undefined = data.dueDate;
  const checklistInput = Array.isArray(data.checklistItems) ? data.checklistItems : [];

  if (allAssigneeIds.length > 0 && checklistInput.length === 0) {
    throw new Error("Every assigned employee must have at least one checklist task assigned.");
  }

  // Verify each selected assignee has at least one valid checklist item
  for (const memberId of allAssigneeIds) {
    const memberTasks = checklistInput.filter(
      (item) => item.assignedMemberId === memberId && (item.title || (item as any).text)?.trim()
    );
    if (memberTasks.length === 0) {
      throw new Error(`Every assigned employee must have at least one checklist task assigned.`);
    }
  }

  // Derive parent deadline from latest checklist item deadline if not explicitly given
  let maxChecklistDate: Date | null = null;
  for (const item of checklistInput) {
    const itemTitle = (item.title || (item as any).text || "").trim();
    if (!itemTitle) {
      throw new Error("Checklist task description cannot be empty.");
    }
    if (item.dueDate) {
      const d = new Date(item.dueDate);
      if (!isNaN(d.getTime())) {
        if (!maxChecklistDate || d > maxChecklistDate) {
          maxChecklistDate = d;
        }
      }
    }
  }

  if (!derivedDueDate && maxChecklistDate) {
    derivedDueDate = maxChecklistDate;
  }

  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: data.projectId,
        phaseId: data.phaseId || null,
        title: deliverableTitle,
        description: brief,
        acceptanceCriteria: data.acceptanceCriteria?.trim() || null,
        reviewerId: validatedReviewerId,
        referenceFiles: data.referenceFiles || null,
        assigneeId: primaryAssigneeId,
        assignedMemberIds: allAssigneeIds.length > 0 ? allAssigneeIds : undefined,
        creatorId: ctx.membershipId,
        priority: data.priority,
        status: TaskWorkflowStatus.NOT_STARTED,
        startDate: data.startDate,
        dueDate: derivedDueDate,
        estimatedHours: data.estimatedHours,
      },
    });

    // Create employee-level TaskAssignment records for tracking acknowledgements & progress
    for (const memberId of allAssigneeIds) {
      await tx.taskAssignment.create({
        data: {
          tenantId: ctx.tenantId,
          taskId: task.id,
          membershipId: memberId,
          acknowledgedAt: null,
          acknowledgedVersion: null,
          isCompleted: false,
        },
      });
    }

    // Create checklist items atomically
    if (checklistInput.length > 0) {
      for (let idx = 0; idx < checklistInput.length; idx++) {
        const item = checklistInput[idx];
        const itemTitle = (item.title || (item as any).text || "").trim();
        await tx.taskChecklistItem.create({
          data: {
            tenantId: ctx.tenantId,
            taskId: task.id,
            title: itemTitle,
            description: item.description?.trim() || null,
            acceptanceCriteria: item.acceptanceCriteria?.trim() || data.acceptanceCriteria?.trim() || null,
            assignedMemberId: item.assignedMemberId || primaryAssigneeId,
            priority: item.priority || data.priority || TaskPriority.MEDIUM,
            dueDate: item.dueDate ? new Date(item.dueDate) : derivedDueDate || null,
            prerequisiteItemId: item.prerequisiteItemId || null,
            status: TaskWorkflowStatus.NOT_STARTED,
            isCompleted: false,
            sortOrder: item.sortOrder ?? (idx + 1),
          },
        });
      }
    }

    // Audit event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: task.projectId,
        action: "TASK_CREATED",
        entityType: "Task",
        entityId: task.id,
        safeChangeSummary: `Created deliverable "${task.title}" with priority ${task.priority} for project ${project.code}`,
      },
    });

    // Create notifications for assigned members
    const recipientIds = allAssigneeIds.filter((id) => id && id !== ctx.membershipId);
    if (recipientIds.length > 0) {
      try {
        await tx.notification.createMany({
          data: recipientIds.map((recipientId) => ({
            tenantId: ctx.tenantId,
            recipientId,
            title: "New Architectural Deliverable Assigned",
            message: `${ctx.userFullName || "Leadership"} assigned deliverable: "${task.title}" (${project.code}).`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          })),
        });
      } catch (err) {
        console.error("Failed to create task assignment notifications:", err);
      }
    }

    const fullTask = await tx.task.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        checklistItems: {
          orderBy: { sortOrder: "asc" },
        },
        assignee: {
          include: { user: true, employee: true },
        },
      },
    });

    return fullTask;
  });
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

  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isAssignee = task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);
  const isPrivileged = isAdminOrOwner(ctx);
  const isCreator = task.creatorId === ctx.membershipId;

  if (!isPrivileged && !isAssignee && !isCreator) {
    throw new ForbiddenException(
      "Only assigned team members, the task assigner, or Studio Leadership can update deliverable status."
    );
  }

  // Four-eyes rule: Deliverable assignees CANNOT self-approve their work to COMPLETED!
  if (newStatus === TaskWorkflowStatus.COMPLETED) {
    if (isAssignee) {
      throw new ForbiddenException(
        "Self-approval is forbidden: Deliverable assignees cannot approve their own completed work."
      );
    }
    if (!isPrivileged) {
      throw new ForbiddenException(
        "Only Studio Leadership (Owner/Admin) can approve deliverable completion."
      );
    }

    // Parent completion condition: Check if checklist items exist. If so, all must be completed/approved!
    if (task.checklistItems && task.checklistItems.length > 0) {
      const incompleteItems = task.checklistItems.filter(
        (item) => item.status !== TaskWorkflowStatus.COMPLETED && !item.isCompleted
      );
      if (incompleteItems.length > 0) {
        throw new Error(
          `Cannot complete deliverable: All assigned employee checklist items must be completed and approved first (${incompleteItems.length} remaining).`
        );
      }
    }
  }

  // Reason note helper
  const defaultReason = isAssignee
    ? `Status updated to ${newStatus} by assignee ${ctx.userFullName}`
    : `Workflow transition from ${oldStatus} to ${newStatus} by ${ctx.userFullName}`;

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
        reason: options.comment || options.auditReason || defaultReason,
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
    const isCheckingOrReview = newStatus === TaskWorkflowStatus.IN_REVIEW || (newStatus as any) === "CHECKING";
    const isProgressOrStarted = newStatus === TaskWorkflowStatus.IN_PROGRESS || (newStatus as any) === "ONGOING" || (newStatus as any) === "STARTED";

    if (isCheckingOrReview && task.creatorId && task.creatorId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: task.creatorId,
            title: "Task Review / Checking Requested",
            message: `${ctx.userFullName} submitted task "${task.title}" for review/checking.`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to create review notification:", e);
      }
    } else if (newStatus === TaskWorkflowStatus.COMPLETED) {
      // If employee completed, notify creator; if manager completed, notify assignees
      const notifyRecipients = new Set<string>();
      if (isAssignee && task.creatorId && task.creatorId !== ctx.membershipId) {
        notifyRecipients.add(task.creatorId);
      }
      if (isPrivileged) {
        if (task.assigneeId && task.assigneeId !== ctx.membershipId) notifyRecipients.add(task.assigneeId);
        assignedMemberIds.forEach((id) => {
          if (id !== ctx.membershipId) notifyRecipients.add(id);
        });
      }

      if (notifyRecipients.size > 0) {
        try {
          await tx.notification.createMany({
            data: Array.from(notifyRecipients).map((recipientId) => ({
              tenantId: ctx.tenantId,
              recipientId,
              title: "Task Completed",
              message: `${ctx.userFullName} marked task "${task.title}" as Completed!`,
              link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
              isRead: false,
            })),
          });
        } catch (e) {
          console.error("Failed to create completion notifications:", e);
        }
      }
    } else if (
      (oldStatus === TaskWorkflowStatus.IN_REVIEW || (oldStatus as any) === "CHECKING") &&
      isProgressOrStarted
    ) {
      const notifyRecipients = new Set<string>();
      if (task.assigneeId && task.assigneeId !== ctx.membershipId) notifyRecipients.add(task.assigneeId);
      assignedMemberIds.forEach((id) => {
        if (id !== ctx.membershipId) notifyRecipients.add(id);
      });

      if (notifyRecipients.size > 0) {
        try {
          await tx.notification.createMany({
            data: Array.from(notifyRecipients).map((recipientId) => ({
              tenantId: ctx.tenantId,
              recipientId,
              title: "Task Revisions Requested",
              message: `${ctx.userFullName} requested revisions on "${task.title}": ${options.comment || "See comments"}`,
              link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
              isRead: false,
            })),
          });
        } catch (e) {
          console.error("Failed to create changes requested notifications:", e);
        }
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
  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isCurrentAssignee = task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);

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
        assignedMemberIds: [targetMember.id],
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
  projectId?: string | null;
  phaseId?: string | null;
  assigneeId?: string | null;
  assigneeIds?: string[] | null;
}

/**
 * Edit task details:
 * - Studio Boss/Admin or Task Creator can update all fields (Project, Phase, Assignees, Priority, Due Date, Title, etc.)
 * - Assignees can update description, progress notes, and estimated hours.
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

  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isAssignee = task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);
  const isPrivileged = isAdminOrOwner(ctx);
  const isCreator = task.creatorId === ctx.membershipId;
  const isCanEditFull = isPrivileged || isCreator;

  if (!isCanEditFull && !isAssignee) {
    throw new ForbiddenException(
      "You can only edit tasks assigned to you, created by you, or have Studio Boss/Admin privileges."
    );
  }

  // Strict Employee Field Restrictions: Non-managers cannot change protected structural fields
  if (!isCanEditFull) {
    if (
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.phaseId !== undefined ||
      data.projectId !== undefined ||
      data.assigneeId !== undefined ||
      data.assigneeIds !== undefined
    ) {
      throw new ForbiddenException(
        "Employees cannot modify protected task fields (priority, due date, project/phase links, or assignees). Only task progress, deliverable descriptions, estimated hours, checklists, and comments can be updated."
      );
    }
  }

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;
  if (data.estimatedHours !== undefined) updatePayload.estimatedHours = data.estimatedHours;
  if (data.projectId !== undefined && data.projectId) updatePayload.projectId = data.projectId;
  if (data.phaseId !== undefined) updatePayload.phaseId = data.phaseId;

  let newAssigneeList: string[] | null = null;
  if (data.assigneeIds !== undefined) {
    newAssigneeList = Array.isArray(data.assigneeIds) ? data.assigneeIds.filter(Boolean) : [];
    updatePayload.assigneeId = newAssigneeList[0] || null;
    updatePayload.assignedMemberIds = newAssigneeList;
  } else if (data.assigneeId !== undefined) {
    updatePayload.assigneeId = data.assigneeId;
    updatePayload.assignedMemberIds = data.assigneeId ? [data.assigneeId] : [];
    newAssigneeList = data.assigneeId ? [data.assigneeId] : [];
  }

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
        reason: `Task deliverable updated by ${ctx.userFullName}`,
      },
    });

    // Notify newly assigned members
    if (newAssigneeList && newAssigneeList.length > 0) {
      for (const recipientId of newAssigneeList) {
        if (!assignedMemberIds.includes(recipientId) && recipientId !== ctx.membershipId) {
          try {
            await tx.notification.create({
              data: {
                tenantId: ctx.tenantId,
                recipientId,
                title: "Assigned to Task",
                message: `${ctx.userFullName} assigned you to deliverable "${updated.title}".`,
                link: `/w/${ctx.tenantSlug}/tasks?taskId=${updated.id}`,
                isRead: false,
              },
            });
          } catch (e) {
            console.error("Failed to notify new assignee:", e);
          }
        }
      }
    }

    return updated;
  });
}

/**
 * Toggle or update checklist item status:
 * - Assigned employees, item assignees, task creator, or Studio Leadership can check/toggle checklist items.
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
  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const assignmentMemberIds = Array.isArray(task.assignments)
    ? task.assignments.map((a: any) => a.membershipId)
    : [];
  const isAssignee =
    task.assigneeId === ctx.membershipId ||
    assignedMemberIds.includes(ctx.membershipId) ||
    assignmentMemberIds.includes(ctx.membershipId);
  const isCreator = task.creatorId === ctx.membershipId;

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });

  if (!item) {
    throw new Error("Checklist item not found");
  }

  const isItemAssignee = item.assignedMemberId === ctx.membershipId;

  if (!isPrivileged && !isAssignee && !isItemAssignee && !isCreator) {
    throw new ForbiddenException("Only assigned employees, the task creator, or Studio Admin/Boss can update checklist items.");
  }

  return await prisma.taskChecklistItem.update({
    where: { id: itemId },
    data: {
      isCompleted,
      status: isCompleted ? TaskWorkflowStatus.COMPLETED : TaskWorkflowStatus.IN_PROGRESS,
      completedAt: isCompleted ? new Date() : null,
      completedById: isCompleted ? ctx.membershipId : null,
    },
  });
}

/**
 * Transition checklist item workflow status:
 * - NOT_STARTED -> IN_PROGRESS (Employee begins work)
 * - IN_PROGRESS -> IN_REVIEW (Employee submits work for review)
 * - IN_REVIEW -> COMPLETED (Studio Leadership approves work. Forbidden for assignee!)
 * - IN_REVIEW -> IN_PROGRESS (Studio Leadership requests revisions with required comment)
 */
export async function transitionChecklistItemStatus(
  ctx: TenantContext,
  arg1: string,
  arg2: any,
  arg3?: any,
  arg4?: any
) {
  let taskId: string;
  let itemId: string;
  let newStatus: TaskWorkflowStatus;
  let options: { comment?: string; blockerReason?: string } = {};

  // Detect which signature was provided:
  if (typeof arg2 === "string" && (typeof arg3 === "string" && (Object.values(TaskWorkflowStatus).includes(arg3 as any) || arg3 === "CHANGES_REQUESTED"))) {
    // 5-arg signature: (ctx, taskId, itemId, newStatus, options)
    taskId = arg1;
    itemId = arg2;
    const rawStatus = arg3 as string;
    if (rawStatus === "CHANGES_REQUESTED") {
      newStatus = TaskWorkflowStatus.IN_PROGRESS;
    } else {
      newStatus = rawStatus as TaskWorkflowStatus;
    }
    if (typeof arg4 === "string") {
      options = { comment: arg4 };
    } else if (arg4 && typeof arg4 === "object") {
      options = arg4;
    }
  } else {
    // 4-arg signature: (ctx, itemId, newStatus, comment/options)
    itemId = arg1;
    const rawStatus = arg2 as string;
    if (rawStatus === "CHANGES_REQUESTED") {
      newStatus = TaskWorkflowStatus.IN_PROGRESS;
    } else {
      newStatus = rawStatus as TaskWorkflowStatus;
    }
    if (typeof arg3 === "string") {
      options = { comment: arg3 };
    } else if (arg3 && typeof arg3 === "object") {
      options = arg3;
    }

    const itemRecord = await prisma.taskChecklistItem.findFirst({
      where: { id: itemId, tenantId: ctx.tenantId },
    });
    if (!itemRecord) {
      throw new Error("Checklist item not found");
    }
    taskId = itemRecord.taskId;
  }

  const task = await findTaskById(ctx, taskId);
  if (!task) {
    throw new Error("Task deliverable not found");
  }

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });

  if (!item) {
    throw new Error("Checklist item not found");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isItemAssignee = item.assignedMemberId === ctx.membershipId;
  const isDeliverableAssignee = task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);

  if (!isPrivileged && !isItemAssignee && !isDeliverableAssignee) {
    throw new ForbiddenException("Only the assigned employee or Studio Leadership can update checklist items.");
  }

  // Four-eyes self-approval rule on checklist items:
  if (newStatus === TaskWorkflowStatus.COMPLETED) {
    if (isItemAssignee || isDeliverableAssignee) {
      throw new ForbiddenException(
        "Four-eyes policy: Deliverable assignees cannot approve their own completed checklist work."
      );
    }
    if (!isPrivileged) {
      throw new ForbiddenException(
        "Four-eyes policy: Only Studio Leadership (Owner/Admin) can approve checklist work."
      );
    }
  }

  // If requesting revisions, comment is required
  if (
    item.status === TaskWorkflowStatus.IN_REVIEW &&
    (newStatus === TaskWorkflowStatus.IN_PROGRESS ||
      String(arg2) === "CHANGES_REQUESTED" ||
      String(arg3) === "CHANGES_REQUESTED")
  ) {
    if (!options.comment?.trim() && !options.blockerReason?.trim()) {
      throw new Error("Feedback comment or explanation is required when requesting revisions.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const isCompleted = newStatus === TaskWorkflowStatus.COMPLETED;
    const updated = await tx.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        status: newStatus,
        isCompleted,
        completedAt: isCompleted ? new Date() : (newStatus === TaskWorkflowStatus.IN_PROGRESS ? null : item.completedAt),
        completedById: isCompleted ? ctx.membershipId : (newStatus === TaskWorkflowStatus.IN_PROGRESS ? null : item.completedById),
        blockerReason:
          newStatus === TaskWorkflowStatus.COMPLETED
            ? null
            : options.blockerReason !== undefined
            ? options.blockerReason
            : options.comment
            ? options.comment
            : item.blockerReason,
      },
    });

    // Record approval request if submitted for review
    if (newStatus === TaskWorkflowStatus.IN_REVIEW) {
      await tx.approvalRequest.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: task.projectId,
          targetType: "TASK",
          taskId: task.id,
          checklistItemId: item.id,
          status: "PENDING",
          requesterId: ctx.membershipId,
          comment: options.comment || `Submitted checklist "${item.title}" for review by ${ctx.userFullName}`,
        },
      });
    }

    // Resolve approval requests if approved or changes requested
    if (isPrivileged && (newStatus === TaskWorkflowStatus.COMPLETED || newStatus === TaskWorkflowStatus.IN_PROGRESS)) {
      await tx.approvalRequest.updateMany({
        where: {
          tenantId: ctx.tenantId,
          checklistItemId: item.id,
          status: "PENDING",
        },
        data: {
          status: newStatus === TaskWorkflowStatus.COMPLETED ? "APPROVED" : "CHANGES_REQUESTED",
          reviewerId: ctx.membershipId,
          decidedAt: new Date(),
          comment: options.comment || (newStatus === TaskWorkflowStatus.COMPLETED ? "Approved" : "Revisions requested"),
        },
      });
    }

    // Activity history on parent task
    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "CHECKLIST_STATUS_CHANGED",
        oldValue: item.status,
        newValue: newStatus,
        reason: options.comment || `Checklist item "${item.title}" status changed to ${newStatus} by ${ctx.userFullName}`,
      },
    });

    if (options.comment) {
      await tx.taskComment.create({
        data: {
          tenantId: ctx.tenantId,
          taskId: task.id,
          authorId: ctx.membershipId,
          content: `[Checklist: "${item.title}" -> ${newStatus}] ${options.comment}`,
        },
      });
    }

    // Notifications
    if (newStatus === TaskWorkflowStatus.IN_REVIEW && task.creatorId && task.creatorId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: task.creatorId,
            title: "Checklist Item Submitted for Review",
            message: `${ctx.userFullName} submitted checklist task "${item.title}" for review.`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to notify creator about checklist review:", e);
      }
    } else if (newStatus === TaskWorkflowStatus.COMPLETED && item.assignedMemberId && item.assignedMemberId !== ctx.membershipId) {
      try {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: item.assignedMemberId,
            title: "Checklist Item Approved",
            message: `${ctx.userFullName} approved your work on "${item.title}".`,
            link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
            isRead: false,
          },
        });
      } catch (e) {
        console.error("Failed to notify assignee about checklist approval:", e);
      }
    }

    return updated;
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
  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isAssignee = task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);
  const isCreator = task.creatorId === ctx.membershipId;

  if (!isPrivileged && !isAssignee && !isCreator) {
    throw new ForbiddenException("You can only comment on tasks assigned to you, created by you, or as Studio Admin/Boss.");
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

  const andConditions: any[] = [{ tenantId: ctx.tenantId }];
  if (myTasksOnly || !isAdminOrOwner(ctx)) {
    const multiTaskIds = await getMultiAssignedTaskIds(ctx.tenantId, ctx.membershipId);
    const orClauses: any[] = [
      { assigneeId: ctx.membershipId },
      { creatorId: ctx.membershipId },
    ];
    if (multiTaskIds.length > 0) {
      orClauses.push({ id: { in: multiTaskIds } });
    }
    andConditions.push({ OR: orClauses });
  }

  // 1 single query fetching only status & dueDate instead of 5 separate roundtrips
  const tasks = await prisma.task.findMany({
    where: { AND: andConditions },
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
    const s = t.status as string;
    if (s === "IN_PROGRESS" || s === "STARTED" || s === "ONGOING") inProgress++;
    else if (s === "IN_REVIEW" || s === "CHECKING") waitingReview++;
    else if (s === "COMPLETED") completed++;

    const isActive = s !== "COMPLETED" && s !== "CANCELLED";
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

// Re-export task workflow methods
export {
  acknowledgeAssignment,
  startChecklistWork,
  raiseTaskBlocker,
  resolveTaskBlocker,
  askTaskClarification,
  replyToTaskClarification,
  validateNoCircularDependencies,
  requestDeadlineExtension,
  decideDeadlineExtension,
  submitTasksForReview,
  reviewTaskSubmission,
  reopenChecklistTask,
} from "./workflow";
