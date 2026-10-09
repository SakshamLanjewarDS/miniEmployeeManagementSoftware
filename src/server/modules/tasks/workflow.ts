import { prisma } from "@/server/db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "@/server/tenancy/context";
import { TaskWorkflowStatus, TaskPriority, Prisma } from "@prisma/client";

/**
 * ----------------------------------------------------------------------------
 * 1. ASSIGNMENT & ACKNOWLEDGEMENT (CHUNK 1)
 * ----------------------------------------------------------------------------
 */

export interface AcknowledgeResult {
  success: boolean;
  alreadyAcknowledged: boolean;
  acknowledgedAt: Date;
  version: number;
}

export async function acknowledgeAssignment(
  ctx: TenantContext,
  taskId: string
): Promise<AcknowledgeResult> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) {
    throw new Error("Deliverable not found in this studio workspace.");
  }

  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isAssignee =
    task.assigneeId === ctx.membershipId || assignedMemberIds.includes(ctx.membershipId);

  // If not directly on task.assigneeId/assignedMemberIds, check if they have any assigned checklist items
  const hasAssignedItems = await prisma.taskChecklistItem.count({
    where: { taskId: task.id, assignedMemberId: ctx.membershipId, tenantId: ctx.tenantId },
  });

  if (!isAssignee && hasAssignedItems === 0) {
    throw new ForbiddenException("Only an assigned team member can acknowledge their assignment.");
  }

  const currentVersion = task.version || 1;
  const existing = await prisma.taskAssignment.findUnique({
    where: {
      taskId_membershipId: {
        taskId: task.id,
        membershipId: ctx.membershipId,
      },
    },
  });

  if (existing?.acknowledgedAt && existing.acknowledgedVersion === currentVersion) {
    return {
      success: true,
      alreadyAcknowledged: true,
      acknowledgedAt: existing.acknowledgedAt,
      version: existing.acknowledgedVersion,
    };
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.taskAssignment.upsert({
      where: {
        taskId_membershipId: {
          taskId: task.id,
          membershipId: ctx.membershipId,
        },
      },
      update: {
        acknowledgedAt: now,
        acknowledgedVersion: currentVersion,
      },
      create: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        membershipId: ctx.membershipId,
        acknowledgedAt: now,
        acknowledgedVersion: currentVersion,
        isCompleted: false,
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "ASSIGNMENT_ACKNOWLEDGED",
        newValue: `v${currentVersion}`,
        reason: `${ctx.userFullName} acknowledged assignment for deliverable "${task.title}" (instruction v${currentVersion})`,
      },
    });

    return {
      success: true,
      alreadyAcknowledged: false,
      acknowledgedAt: updated.acknowledgedAt!,
      version: updated.acknowledgedVersion!,
    };
  });
}

/**
 * ----------------------------------------------------------------------------
 * 2. STARTING WORK & DEPENDENCY CHECKS (CHUNK 2 & CHUNK 4)
 * ----------------------------------------------------------------------------
 */

export async function startChecklistWork(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  options: { acknowledgeIfUnacknowledged?: boolean; overrideDependency?: boolean } = {}
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
    include: { project: true },
  });
  if (!task) throw new Error("Deliverable not found.");

  if (task.project?.status === "ON_HOLD") {
    throw new Error(
      `Cannot start work: Project "${task.project.name}" is currently ON HOLD (${task.project.holdReason || "Hold active"}). Operational work starts are paused until resumed.`
    );
  }
  if (task.project?.status === "DRAFT") {
    throw new Error("Cannot start work on a Draft project.");
  }
  if (task.project?.status === "CANCELLED" || task.project?.status === "ARCHIVED") {
    throw new Error("Cannot start work on a Cancelled or Archived project.");
  }

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
    include: { prerequisiteItem: true },
  });
  if (!item) throw new Error("Checklist item not found.");

  const isItemAssignee = item.assignedMemberId === ctx.membershipId;
  const isPrivileged = isAdminOrOwner(ctx);
  if (!isItemAssignee && !isPrivileged) {
    throw new ForbiddenException("Only the designated employee can start work on this checklist item.");
  }

  // 1. Acknowledgement check
  const targetMemberId = item.assignedMemberId || ctx.membershipId;
  let assignment = await prisma.taskAssignment.findUnique({
    where: {
      taskId_membershipId: {
        taskId: task.id,
        membershipId: targetMemberId,
      },
    },
  });

  const isAcknowledged = Boolean(assignment?.acknowledgedAt);
  if (!isAcknowledged && !options.acknowledgeIfUnacknowledged) {
    throw new Error("ASSIGNMENT_NOT_ACKNOWLEDGED: Please acknowledge the assignment instructions before starting work.");
  }

  // 2. Dependency validation: prerequisite must be officially completed & approved
  if (item.prerequisiteItemId && item.prerequisiteItem) {
    const isPrereqDone =
      item.prerequisiteItem.status === TaskWorkflowStatus.COMPLETED &&
      item.prerequisiteItem.isCompleted &&
      Boolean(item.prerequisiteItem.completedAt);
    if (!isPrereqDone) {
      if (!options.overrideDependency || !isPrivileged) {
        throw new Error(
          `Prerequisite dependency "${item.prerequisiteItem.title}" must be completed and approved before starting this task.`
        );
      }
    }
  }

  // 3. Blocker check
  if (item.isBlocked) {
    throw new Error(
      `Cannot start work: this task is currently blocked (${item.blockerReason || "Blocker reported"}). Resolve the blocker first.`
    );
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Auto-acknowledge if requested
    if (!isAcknowledged || !assignment) {
      await tx.taskAssignment.upsert({
        where: {
          taskId_membershipId: {
            taskId: task.id,
            membershipId: targetMemberId,
          },
        },
        update: {
          acknowledgedAt: now,
          acknowledgedVersion: task.version || 1,
        },
        create: {
          tenantId: ctx.tenantId,
          taskId: task.id,
          membershipId: targetMemberId,
          acknowledgedAt: now,
          acknowledgedVersion: task.version || 1,
          isCompleted: false,
        },
      });
    }

    const updated = await tx.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        status: TaskWorkflowStatus.IN_PROGRESS,
        startedAt: item.startedAt || now,
      },
    });

    if (task.status === TaskWorkflowStatus.NOT_STARTED) {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskWorkflowStatus.IN_PROGRESS,
          startDate: task.startDate || now,
        },
      });
    }

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "WORK_STARTED",
        newValue: item.title,
        reason: `${ctx.userFullName} started work on checklist task "${item.title}"`,
      },
    });

    return updated;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 3. CLARIFICATIONS & BLOCKERS (CHUNK 3)
 * ----------------------------------------------------------------------------
 */

export async function raiseTaskBlocker(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  data: {
    reason: string;
    neededToContinue: string;
    contactPerson?: string;
  }
) {
  if (!data.reason?.trim()) throw new Error("Blocker reason is required.");
  if (!data.neededToContinue?.trim()) {
    throw new Error("Specification of what is needed to continue is required.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });
  if (!item) throw new Error("Checklist task not found.");

  const now = new Date();
  const blockerDetails = {
    reason: data.reason.trim(),
    neededToContinue: data.neededToContinue.trim(),
    contactPerson: data.contactPerson?.trim() || null,
    createdAt: now.toISOString(),
    createdById: ctx.membershipId,
    createdByName: ctx.userFullName,
  };

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        isBlocked: true,
        blockerReason: data.reason.trim(),
        blockerDetails,
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "BLOCKER_RAISED",
        newValue: item.title,
        reason: `Blocker raised on "${item.title}": ${data.reason.trim()} (Needed: ${data.neededToContinue.trim()})`,
      },
    });

    // Notify leadership
    const leadership = await tx.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        id: { not: ctx.membershipId },
      },
      select: { id: true },
    });

    if (leadership.length > 0) {
      await tx.notification.createMany({
        data: leadership.map((l) => ({
          tenantId: ctx.tenantId,
          recipientId: l.id,
          title: "Blocker Reported on Deliverable Task",
          message: `${ctx.userFullName} reported a blocker on "${item.title}" (${task.title}): ${data.reason.trim()}`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        })),
      });
    }

    return updated;
  });
}

export async function resolveTaskBlocker(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  data: { resolutionNotes: string }
) {
  if (!data.resolutionNotes?.trim()) {
    throw new Error("Resolution details are required.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });
  if (!item) throw new Error("Checklist task not found.");

  const now = new Date();
  const existingDetails = (item.blockerDetails as any) || {};
  const updatedDetails = {
    ...existingDetails,
    resolvedAt: now.toISOString(),
    resolvedById: ctx.membershipId,
    resolvedByName: ctx.userFullName,
    resolutionNotes: data.resolutionNotes.trim(),
  };

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        isBlocked: false,
        blockerReason: null,
        blockerDetails: updatedDetails,
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "BLOCKER_RESOLVED",
        newValue: item.title,
        reason: `Blocker resolved on "${item.title}": ${data.resolutionNotes.trim()}`,
      },
    });

    // Notify item assignee if someone else resolved it
    if (item.assignedMemberId && item.assignedMemberId !== ctx.membershipId) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: item.assignedMemberId,
          title: "Blocker Resolved",
          message: `${ctx.userFullName} resolved the blocker on "${item.title}": ${data.resolutionNotes.trim()}`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        },
      });
    }

    return updated;
  });
}

export async function askTaskClarification(
  ctx: TenantContext,
  taskId: string,
  data: {
    checklistItemId?: string;
    question: string;
    attachments?: any;
  }
) {
  if (!data.question?.trim()) throw new Error("Question text cannot be empty.");

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  return await prisma.$transaction(async (tx) => {
    const clarification = await tx.taskClarification.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        checklistItemId: data.checklistItemId || null,
        authorId: ctx.membershipId,
        question: data.question.trim(),
        attachments: data.attachments || null,
      },
    });

    // Notify task creator and leadership
    const notifyRecipients = new Set<string>();
    if (task.creatorId && task.creatorId !== ctx.membershipId) {
      notifyRecipients.add(task.creatorId);
    }
    if (task.reviewerId && task.reviewerId !== ctx.membershipId) {
      notifyRecipients.add(task.reviewerId);
    }

    for (const recipientId of notifyRecipients) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId,
          title: "New Clarification Question Asked",
          message: `${ctx.userFullName} asked a clarification question on "${task.title}": "${data.question.slice(0, 100)}"`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        },
      });
    }

    return clarification;
  });
}

export async function replyToTaskClarification(
  ctx: TenantContext,
  clarificationId: string,
  data: { message?: string; reply?: string }
) {
  const replyText = (data.message || data.reply || "").trim();
  if (!replyText) throw new Error("Clarification reply cannot be empty.");

  const clar = await prisma.taskClarification.findFirst({
    where: { id: clarificationId, tenantId: ctx.tenantId },
    include: { task: true },
  });
  if (!clar) throw new Error("Clarification thread not found.");

  return await prisma.$transaction(async (tx) => {
    const reply = await tx.taskClarificationReply.create({
      data: {
        tenantId: ctx.tenantId,
        clarificationId: clar.id,
        authorId: ctx.membershipId,
        message: replyText,
      },
    });

    // Notify author if responder is different
    if (clar.authorId !== ctx.membershipId) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: clar.authorId,
          title: "Clarification Answer Received",
          message: `${ctx.userFullName} replied to your question on "${clar.task.title}": "${replyText.slice(0, 100)}"`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${clar.taskId}`,
          isRead: false,
        },
      });
    }

    return reply;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 4. DEPENDENCIES & DEADLINE EXTENSIONS (CHUNK 4)
 * ----------------------------------------------------------------------------
 */

export async function validateNoCircularDependencies(
  tenantId: string,
  itemId: string,
  proposedPrereqId: string
) {
  if (itemId === proposedPrereqId) {
    throw new Error("Self-dependency is invalid: A checklist item cannot depend on itself.");
  }

  let currentId: string | null = proposedPrereqId;
  const visited = new Set<string>([itemId]);

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Circular dependency detected: This dependency would create a loop.");
    }
    visited.add(currentId);

    const nextItem: { prerequisiteItemId: string | null } | null = await prisma.taskChecklistItem.findUnique({
      where: { id: currentId },
      select: { prerequisiteItemId: true },
    });
    currentId = nextItem?.prerequisiteItemId || null;
  }
}

export async function requestDeadlineExtension(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  data: {
    proposedDueDate: string | Date;
    reason: string;
  }
) {
  if (!data.reason?.trim()) {
    throw new Error("Reason for deadline extension request is required.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
  });
  if (!item) throw new Error("Checklist task not found.");

  const isOwner = item.assignedMemberId === ctx.membershipId;
  if (!isOwner && !isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only the assigned employee can request a deadline extension.");
  }

  const proposedDate = new Date(data.proposedDueDate);
  if (isNaN(proposedDate.getTime())) {
    throw new Error("Invalid proposed due date.");
  }

  // Prevent multiple pending requests for same item
  const existingPending = await prisma.taskExtensionRequest.findFirst({
    where: {
      tenantId: ctx.tenantId,
      checklistItemId: item.id,
      status: "PENDING",
    },
  });
  if (existingPending) {
    throw new Error("There is already a pending deadline extension request for this checklist task.");
  }

  return await prisma.$transaction(async (tx) => {
    const ext = await tx.taskExtensionRequest.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        checklistItemId: item.id,
        requesterId: ctx.membershipId,
        currentDueDate: item.dueDate,
        proposedDueDate: proposedDate,
        reason: data.reason.trim(),
        status: "PENDING",
      },
    });

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "EXTENSION_REQUESTED",
        newValue: proposedDate.toISOString().split("T")[0],
        reason: `${ctx.userFullName} requested extension for "${item.title}" to ${proposedDate.toLocaleDateString()}: ${data.reason.trim()}`,
      },
    });

    // Notify leadership
    const leadership = await tx.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });

    if (leadership.length > 0) {
      await tx.notification.createMany({
        data: leadership.map((l) => ({
          tenantId: ctx.tenantId,
          recipientId: l.id,
          title: "Deadline Extension Requested",
          message: `${ctx.userFullName} requested extension for "${item.title}" (${task.title}) to ${proposedDate.toLocaleDateString()}`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        })),
      });
    }

    return ext;
  });
}

export async function decideDeadlineExtension(
  ctx: TenantContext,
  requestId: string,
  data: {
    decision: "APPROVE" | "REJECT";
    decisionReason?: string;
  }
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Leadership (Owner/Admin) can decide deadline extension requests.");
  }

  const ext = await prisma.taskExtensionRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { checklistItem: true, task: true },
  });
  if (!ext) throw new Error("Extension request not found.");
  if (ext.status !== "PENDING") {
    throw new Error(`Extension request has already been decided (${ext.status}).`);
  }

  // Competing edit reconciliation: check if the deadline was changed after the request was created
  if (
    ext.currentDueDate &&
    ext.checklistItem.dueDate &&
    ext.currentDueDate.getTime() !== ext.checklistItem.dueDate.getTime()
  ) {
    throw new Error(
      "Reconciliation required: The checklist item's due date was modified after this request was submitted. Please review the current deadline directly."
    );
  }

  const now = new Date();
  const isApproved = data.decision === "APPROVE";

  return await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.taskExtensionRequest.update({
      where: { id: ext.id },
      data: {
        status: isApproved ? "APPROVED" : "REJECTED",
        deciderId: ctx.membershipId,
        decidedAt: now,
        decisionReason: data.decisionReason?.trim() || null,
      },
    });

    if (isApproved) {
      await tx.taskChecklistItem.update({
        where: { id: ext.checklistItemId },
        data: { dueDate: ext.proposedDueDate },
      });

      // Update parent task due date if proposed date exceeds parent due date
      if (!ext.task.dueDate || ext.proposedDueDate > ext.task.dueDate) {
        await tx.task.update({
          where: { id: ext.taskId },
          data: { dueDate: ext.proposedDueDate },
        });
      }
    }

    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: ext.taskId,
        actorId: ctx.membershipId,
        action: isApproved ? "EXTENSION_APPROVED" : "EXTENSION_REJECTED",
        newValue: ext.proposedDueDate.toISOString().split("T")[0],
        reason: `${ctx.userFullName} ${isApproved ? "approved" : "rejected"} deadline extension request for "${ext.checklistItem.title}": ${data.decisionReason || "Decision recorded"}`,
      },
    });

    // Notify requester
    await tx.notification.create({
      data: {
        tenantId: ctx.tenantId,
        recipientId: ext.requesterId,
        title: `Deadline Extension ${isApproved ? "Approved" : "Declined"}`,
        message: `${ctx.userFullName} ${isApproved ? "approved" : "declined"} your deadline extension request for "${ext.checklistItem.title}".`,
        link: `/w/${ctx.tenantSlug}/tasks?taskId=${ext.taskId}`,
        isRead: false,
      },
    });

    return updatedRequest;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 5. SUBMISSION PREPARATION & SNAPSHOT CREATION (CHUNK 5)
 * ----------------------------------------------------------------------------
 */

export interface SubmitForReviewData {
  taskId: string;
  checklistItemIds: string[];
  summary: string;
  evidenceFiles?: Array<{
    fileId?: string;
    fileName: string;
    storagePath?: string;
    mimeType?: string;
    size?: number;
    url?: string;
  }>;
  evidenceLinks?: Array<{
    url: string;
    title: string;
  }>;
}

export async function submitTasksForReview(
  ctx: TenantContext,
  data: SubmitForReviewData
) {
  if (!data.summary?.trim()) {
    throw new Error("Submission summary is required to describe the completed work.");
  }
  if (!Array.isArray(data.checklistItemIds) || data.checklistItemIds.length === 0) {
    throw new Error("At least one completed checklist task must be selected for submission.");
  }

  // Validate allowed link schemes
  if (Array.isArray(data.evidenceLinks)) {
    for (const link of data.evidenceLinks) {
      if (!link.url || typeof link.url !== "string") {
        throw new Error("Invalid evidence link provided.");
      }
      const trimmed = link.url.trim().toLowerCase();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        throw new Error("Invalid link URL scheme: Only http:// and https:// URLs are allowed.");
      }
    }
  }

  const task = await prisma.task.findFirst({
    where: { id: data.taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  // Fetch covered items and verify ownership
  const items = await prisma.taskChecklistItem.findMany({
    where: {
      id: { in: data.checklistItemIds },
      taskId: task.id,
      tenantId: ctx.tenantId,
    },
    include: { prerequisiteItem: true },
  });

  if (items.length !== data.checklistItemIds.length) {
    throw new Error("One or more selected checklist tasks do not belong to this deliverable.");
  }

  for (const item of items) {
    // Ownership check: employees must not submit another employee's work
    if (item.assignedMemberId && item.assignedMemberId !== ctx.membershipId && !isAdminOrOwner(ctx)) {
      throw new ForbiddenException(`You can only submit your own assigned work. "${item.title}" belongs to another team member.`);
    }

    // Blocker check: no unresolved blocker on submitted work
    if (item.isBlocked) {
      throw new Error(`Cannot submit: "${item.title}" has an active unresolved blocker. Resolve it first.`);
    }

    // Prerequisite check: prerequisite must be completed
    if (item.prerequisiteItem) {
      const isPrereqDone =
        item.prerequisiteItem.status === TaskWorkflowStatus.COMPLETED ||
        item.prerequisiteItem.isCompleted;
      if (!isPrereqDone) {
        throw new Error(
          `Cannot submit: Prerequisite dependency "${item.prerequisiteItem.title}" is not yet approved/completed.`
        );
      }
    }
  }

  // Prevent overlapping active submissions for the same checklist task
  const activeSubmissions = await prisma.taskSubmission.findMany({
    where: {
      tenantId: ctx.tenantId,
      taskId: task.id,
      status: "PENDING",
    },
  });

  for (const sub of activeSubmissions) {
    const existingTaskIds = Array.isArray(sub.checklistTaskIds)
      ? (sub.checklistTaskIds as string[])
      : [];
    const overlap = data.checklistItemIds.some((id) => existingTaskIds.includes(id));
    if (overlap) {
      throw new Error("An active pending submission already exists covering one or more of these checklist tasks.");
    }
  }

  // Determine next version number for this task
  const lastSub = await prisma.taskSubmission.findFirst({
    where: { tenantId: ctx.tenantId, taskId: task.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (lastSub?.version || 0) + 1;

  // Criteria snapshot
  const criteriaSnapshot = items
    .map((item) => `• [${item.title}]: ${item.acceptanceCriteria || task.acceptanceCriteria || "Standard architectural quality check"}`)
    .join("\n");

  // Determine reviewer: assigned reviewer on task, or task creator, or null
  const reviewerId = task.reviewerId || (task.creatorId !== ctx.membershipId ? task.creatorId : null);

  return await prisma.$transaction(async (tx) => {
    // Create versioned immutable submission snapshot
    const submission = await tx.taskSubmission.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        submitterId: ctx.membershipId,
        reviewerId,
        version: nextVersion,
        summary: data.summary.trim(),
        checklistTaskIds: data.checklistItemIds,
        criteriaSnapshot,
        evidenceFiles: data.evidenceFiles ? (data.evidenceFiles as any) : Prisma.JsonNull,
        evidenceLinks: data.evidenceLinks ? (data.evidenceLinks as any) : Prisma.JsonNull,
        status: "PENDING",
      },
    });

    // Move covered checklist tasks to IN_REVIEW
    await tx.taskChecklistItem.updateMany({
      where: { id: { in: data.checklistItemIds } },
      data: {
        status: TaskWorkflowStatus.IN_REVIEW,
      },
    });

    // Move parent deliverable to IN_REVIEW if not already
    if (task.status !== TaskWorkflowStatus.IN_REVIEW) {
      await tx.task.update({
        where: { id: task.id },
        data: { status: TaskWorkflowStatus.IN_REVIEW },
      });
    }

    // Activity history
    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "WORK_SUBMITTED",
        newValue: `v${nextVersion}`,
        reason: `${ctx.userFullName} submitted version ${nextVersion} covering ${items.length} checklist tasks: "${data.summary.trim()}"`,
      },
    });

    // Notify reviewer / leadership
    const leadership = await tx.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        id: { not: ctx.membershipId },
      },
      select: { id: true },
    });

    if (leadership.length > 0) {
      await tx.notification.createMany({
        data: leadership.map((l) => ({
          tenantId: ctx.tenantId,
          recipientId: l.id,
          title: "Deliverable Work Submitted for Review",
          message: `${ctx.userFullName} submitted ${items.length} tasks on "${task.title}" (v${nextVersion}) for review.`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        })),
      });
    }

    return submission;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 6. REVIEW DECISIONS: APPROVE & REQUEST CHANGES (CHUNK 6 & CHUNK 7)
 * ----------------------------------------------------------------------------
 */

export async function reviewTaskSubmission(
  ctx: TenantContext,
  submissionId: string,
  data: {
    decision: "APPROVE" | "REQUEST_CHANGES";
    feedback?: string;
  }
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Leadership (Owner/Admin) can review and approve work.");
  }

  const sub = await prisma.taskSubmission.findFirst({
    where: { id: submissionId, tenantId: ctx.tenantId },
    include: { task: true },
  });
  if (!sub) throw new Error("Submission snapshot not found.");

  if (sub.status !== "PENDING") {
    throw new Error(`Conflict: This submission has already been reviewed (${sub.status}) by another reviewer.`);
  }

  // Four-eyes policy: submitter cannot self-approve their submission!
  if (sub.submitterId === ctx.membershipId) {
    throw new ForbiddenException("Four-eyes policy: You cannot approve your own submission.");
  }

  const coveredTaskIds = Array.isArray(sub.checklistTaskIds)
    ? (sub.checklistTaskIds as string[])
    : [];

  const isApprove = data.decision === "APPROVE";
  if (!isApprove && !data.feedback?.trim()) {
    throw new Error("Clear feedback describing the corrections needed is required when requesting changes.");
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Update submission record
    const updatedSub = await tx.taskSubmission.update({
      where: { id: sub.id },
      data: {
        status: isApprove ? "APPROVED" : "CHANGES_REQUESTED",
        reviewerId: ctx.membershipId,
        reviewFeedback: data.feedback?.trim() || (isApprove ? "Approved" : "Changes requested"),
        decidedAt: now,
      },
    });

    if (isApprove) {
      // 2. Mark covered checklist items as COMPLETED
      await tx.taskChecklistItem.updateMany({
        where: { id: { in: coveredTaskIds } },
        data: {
          status: TaskWorkflowStatus.COMPLETED,
          isCompleted: true,
          completedAt: now,
          completedById: ctx.membershipId,
        },
      });

      // 3. Check if all checklist items for this employee are now completed
      const remainingEmployeeItems = await tx.taskChecklistItem.count({
        where: {
          taskId: sub.taskId,
          tenantId: ctx.tenantId,
          assignedMemberId: sub.submitterId,
          status: { not: TaskWorkflowStatus.COMPLETED },
          isCompleted: false,
        },
      });

      if (remainingEmployeeItems === 0) {
        await tx.taskAssignment.updateMany({
          where: {
            taskId: sub.taskId,
            membershipId: sub.submitterId,
          },
          data: {
            isCompleted: true,
            completedAt: now,
          },
        });
      }

      // 4. Check if all active checklist items across the deliverable are completed
      const remainingAllItems = await tx.taskChecklistItem.count({
        where: {
          taskId: sub.taskId,
          tenantId: ctx.tenantId,
          status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
          isCompleted: false,
        },
      });

      if (remainingAllItems === 0) {
        // Complete parent deliverable
        await tx.task.update({
          where: { id: sub.taskId },
          data: {
            status: TaskWorkflowStatus.COMPLETED,
            completionDate: now,
          },
        });
      } else {
        // Still other unfinished tasks, set parent back to IN_PROGRESS
        await tx.task.update({
          where: { id: sub.taskId },
          data: { status: TaskWorkflowStatus.IN_PROGRESS },
        });
      }

      await tx.taskActivityHistory.create({
        data: {
          tenantId: ctx.tenantId,
          taskId: sub.taskId,
          actorId: ctx.membershipId,
          action: "SUBMISSION_APPROVED",
          newValue: `v${sub.version}`,
          reason: `${ctx.userFullName} approved submission v${sub.version} covering ${coveredTaskIds.length} checklist tasks.`,
        },
      });

      // Notify submitter
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: sub.submitterId,
          title: "Work Approved & Completed",
          message: `${ctx.userFullName} approved your submission (v${sub.version}) on "${sub.task.title}".`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${sub.taskId}`,
          isRead: false,
        },
      });
    } else {
      // 5. Request Changes: move covered items back to IN_PROGRESS / CHANGES_REQUESTED
      await tx.taskChecklistItem.updateMany({
        where: { id: { in: coveredTaskIds } },
        data: {
          status: TaskWorkflowStatus.IN_PROGRESS,
          isCompleted: false,
        },
      });

      await tx.task.update({
        where: { id: sub.taskId },
        data: { status: TaskWorkflowStatus.IN_PROGRESS },
      });

      await tx.taskActivityHistory.create({
        data: {
          tenantId: ctx.tenantId,
          taskId: sub.taskId,
          actorId: ctx.membershipId,
          action: "CHANGES_REQUESTED",
          newValue: `v${sub.version}`,
          reason: `${ctx.userFullName} requested changes on submission v${sub.version}: "${data.feedback?.trim()}"`,
        },
      });

      // Notify submitter
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: sub.submitterId,
          title: "Corrections Requested on Submitted Work",
          message: `${ctx.userFullName} requested revisions on "${sub.task.title}" (v${sub.version}): "${data.feedback?.trim()}"`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${sub.taskId}`,
          isRead: false,
        },
      });
    }

    return updatedSub;
  });
}

/**
 * ----------------------------------------------------------------------------
 * 7. REOPENING COMPLETED WORK (CHUNK 8)
 * ----------------------------------------------------------------------------
 */

export async function reopenChecklistTask(
  ctx: TenantContext,
  taskId: string,
  itemId: string,
  data: { reason: string }
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Leadership (Owner/Admin) can reopen completed work.");
  }
  if (!data.reason?.trim()) {
    throw new Error("Reason for reopening completed work is required.");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: ctx.tenantId },
  });
  if (!task) throw new Error("Deliverable not found.");

  const item = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId, tenantId: ctx.tenantId },
    include: { dependentItems: true },
  });
  if (!item) throw new Error("Checklist task not found.");

  return await prisma.$transaction(async (tx) => {
    // 1. Reopen checklist task to IN_PROGRESS
    const updatedItem = await tx.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        status: TaskWorkflowStatus.IN_PROGRESS,
        isCompleted: false,
        completedAt: null,
        completedById: null,
      },
    });

    // 2. Reopen parent deliverable if completed
    if (task.status === TaskWorkflowStatus.COMPLETED) {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: TaskWorkflowStatus.IN_PROGRESS,
          completionDate: null,
        },
      });
    }

    // 3. Reopen employee assignment if completed
    if (item.assignedMemberId) {
      await tx.taskAssignment.updateMany({
        where: {
          taskId: task.id,
          membershipId: item.assignedMemberId,
        },
        data: {
          isCompleted: false,
          completedAt: null,
        },
      });
    }

    // 4. Record audit event
    await tx.taskActivityHistory.create({
      data: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        actorId: ctx.membershipId,
        action: "TASK_REOPENED",
        oldValue: "COMPLETED",
        newValue: "IN_PROGRESS",
        reason: `${ctx.userFullName} reopened "${item.title}": ${data.reason.trim()}`,
      },
    });

    // 5. Notify affected employee
    if (item.assignedMemberId && item.assignedMemberId !== ctx.membershipId) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: item.assignedMemberId,
          title: "Deliverable Work Reopened",
          message: `${ctx.userFullName} reopened completed task "${item.title}": ${data.reason.trim()}`,
          link: `/w/${ctx.tenantSlug}/tasks?taskId=${task.id}`,
          isRead: false,
        },
      });
    }

    return updatedItem;
  });
}
