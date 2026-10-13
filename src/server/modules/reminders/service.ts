import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner } from "../../tenancy/context";
import { TaskWorkflowStatus, TaskPriority, DocumentApprovalState, ChangeRequestStatus } from "@prisma/client";

export interface ReminderRunResult {
  evaluatedCount: number;
  remindersSent: number;
  remindersEscalated: number;
  skippedQuietHours: number;
  skippedResolved: number;
  skippedAlreadySent: number;
}

/**
 * Checks if current time is within configured quiet hours (e.g. 21:00 to 09:00).
 */
export function isWithinQuietHours(
  now: Date,
  quietStart: number = 21,
  quietEnd: number = 9,
  timezone: string = "Asia/Kolkata"
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const currentHour = parseInt(formatter.format(now), 10);
    if (quietStart > quietEnd) {
      // Over midnight: e.g. 21 to 9 means >= 21 OR < 9
      return currentHour >= quietStart || currentHour < quietEnd;
    }
    return currentHour >= quietStart && currentHour < quietEnd;
  } catch {
    const currentHour = now.getHours();
    return currentHour >= 21 || currentHour < 9;
  }
}

/**
 * Evaluates deadlines and triggers reminders/escalations for tasks, approvals, and reviews.
 * Re-evaluates current state before sending, deduplicating with StudioReminderLog.
 */
export async function runDeadlineRemindersAndEscalations(
  tenantId?: string
): Promise<ReminderRunResult> {
  const now = new Date();
  const whereTenant = tenantId ? { tenantId } : {};

  // Fetch reminder configs
  const configs = await prisma.studioReminderConfig.findMany({
    where: { ...whereTenant, isEnabled: true },
  });

  const configMap = new Map<string, any>(configs.map((c) => [`${c.tenantId}_${c.entityType}`, c]));

  let evaluatedCount = 0;
  let remindersSent = 0;
  let remindersEscalated = 0;
  let skippedQuietHours = 0;
  let skippedResolved = 0;
  let skippedAlreadySent = 0;

  // 1. Process Task Deadlines
  const activeTasks = await prisma.task.findMany({
    where: {
      ...whereTenant,
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      dueDate: { not: null },
    },
    include: {
      tenant: true,
      assignee: {
        include: { user: true },
      },
    },
  });

  for (const task of activeTasks) {
    evaluatedCount++;
    if (!task.dueDate || !task.assigneeId || !task.assignee) continue;

    const taskTenantId = task.tenantId;
    const config = configMap.get(`${taskTenantId}_TASK`) || {
      leadTimeHours: 24,
      escalationDelayHours: 4,
      quietHoursStart: "21:00",
      quietHoursEnd: "09:00",
    };

    const quietStartHour = parseInt(config.quietHoursStart.split(":")[0], 10) || 21;
    const quietEndHour = parseInt(config.quietHoursEnd.split(":")[0], 10) || 9;

    const timezone = task.tenant.timezone || "Asia/Kolkata";
    const inQuietHours = isWithinQuietHours(now, quietStartHour, quietEndHour, timezone);

    const diffHours = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Is it time for pre-deadline reminder? (e.g. within leadTimeHours before deadline)
    if (diffHours > 0 && diffHours <= config.leadTimeHours) {
      if (inQuietHours && task.priority !== TaskPriority.URGENT) {
        skippedQuietHours++;
        continue;
      }

      const dedupKey = `task_pre_${task.id}_${task.dueDate.toISOString().split("T")[0]}`;
      const existing = await prisma.studioReminderLog.findUnique({
        where: {
          tenantId_dedupKey: {
            tenantId: taskTenantId,
            dedupKey,
          },
        },
      });

      if (existing) {
        skippedAlreadySent++;
        continue;
      }

      // Record reminder in log
      await prisma.studioReminderLog.create({
        data: {
          tenantId: taskTenantId,
          entityType: "TASK",
          entityId: task.id,
          recipientId: task.assigneeId,
          dedupKey,
          stage: "REMINDER",
          channel: "INBOX",
          status: "SENT",
        },
      });

      // Enqueue notification in email outbox
      await prisma.studioEmailOutbox.create({
        data: {
          tenantId: taskTenantId,
          idempotencyKey: `rem_${dedupKey}`,
          recipientUserId: task.assignee.userId,
          recipientEmail: task.assignee.user.email,
          recipientName: task.assignee.user.fullName,
          eventType: "TASK_DEADLINE_REMINDER",
          relatedEntityType: "TASK",
          relatedEntityId: task.id,
          subject: `Deadline Reminder: "${task.title}" is due soon — 100% DESIGN Studio`,
          htmlBody: `<p>Deliverable <strong>${task.title}</strong> is due in approximately ${Math.round(diffHours)} hour(s).</p>`,
        },
      }).catch(() => {});

      remindersSent++;
    }

    // Is it overdue past escalation delay? (e.g. overdue by > 4 hours)
    if (diffHours < 0 && Math.abs(diffHours) >= config.escalationDelayHours) {
      if (inQuietHours && task.priority !== TaskPriority.URGENT) {
        skippedQuietHours++;
        continue;
      }

      const escalationKey = `task_esc_${task.id}_${task.dueDate.toISOString().split("T")[0]}`;
      const existingEsc = await prisma.studioReminderLog.findUnique({
        where: {
          tenantId_dedupKey: {
            tenantId: taskTenantId,
            dedupKey: escalationKey,
          },
        },
      });

      if (existingEsc) {
        skippedAlreadySent++;
        continue;
      }

      // Escalate to Studio Owner / Admin
      const studioOwner = await prisma.tenantMembership.findFirst({
        where: { tenantId: taskTenantId, role: "OWNER", isActive: true },
        include: { user: true },
      });

      await prisma.studioReminderLog.create({
        data: {
          tenantId: taskTenantId,
          entityType: "TASK",
          entityId: task.id,
          recipientId: task.assigneeId,
          dedupKey: escalationKey,
          stage: "ESCALATION",
          channel: "INBOX",
          status: "ESCALATED",
        },
      });

      if (studioOwner) {
        await prisma.studioEmailOutbox.create({
          data: {
            tenantId: taskTenantId,
            idempotencyKey: `esc_${escalationKey}`,
            recipientUserId: studioOwner.userId,
            recipientEmail: studioOwner.user.email,
            recipientName: studioOwner.user.fullName,
            eventType: "TASK_OVERDUE_ESCALATION",
            relatedEntityType: "TASK",
            relatedEntityId: task.id,
            subject: `[ESCALATION] Deliverable Overdue: "${task.title}" (${task.assignee.user.fullName})`,
            htmlBody: `<p>Task <strong>${task.title}</strong> assigned to ${task.assignee.user.fullName} is overdue by ${Math.round(Math.abs(diffHours))} hours and has been escalated for review.</p>`,
          },
        }).catch(() => {});
      }

      remindersEscalated++;
    }
  }

  return {
    evaluatedCount,
    remindersSent,
    remindersEscalated,
    skippedQuietHours,
    skippedResolved,
    skippedAlreadySent,
  };
}

/**
 * Configure reminder and escalation policies for a tenant.
 */
export async function configureReminderPolicy(
  context: TenantContext,
  params: {
    entityType: "TASK" | "APPROVAL" | "DRAWING" | "SITE_ISSUE" | "SCOPE";
    hoursBeforeDeadline?: number;
    leadTimeHours?: number;
    escalationDelayHours?: number;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    isEnabled?: boolean;
  }
) {
  const isPrivileged = isAdminOrOwner(context);
  if (!isPrivileged) throw new Error("Forbidden: Leadership privileges required to configure reminder policies.");

  const leadTime = params.leadTimeHours ?? params.hoursBeforeDeadline ?? 24;
  const escalationDelay = params.escalationDelayHours ?? 48;

  return await prisma.studioReminderConfig.upsert({
    where: {
      tenantId_entityType: {
        tenantId: context.tenantId,
        entityType: params.entityType,
      },
    },
    update: {
      leadTimeHours: leadTime,
      escalationDelayHours: escalationDelay,
      quietHoursStart: params.quietHoursStart ?? "22:00",
      quietHoursEnd: params.quietHoursEnd ?? "08:00",
      isEnabled: params.isEnabled !== undefined ? params.isEnabled : true,
    },
    create: {
      tenantId: context.tenantId,
      entityType: params.entityType,
      leadTimeHours: leadTime,
      escalationDelayHours: escalationDelay,
      quietHoursStart: params.quietHoursStart ?? "22:00",
      quietHoursEnd: params.quietHoursEnd ?? "08:00",
      isEnabled: params.isEnabled !== undefined ? params.isEnabled : true,
    },
  });
}
