import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly } from "../leave/policy";
import { createExecutiveTask } from "./tasks";

export interface CreateMeetingInput {
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string;   // "11:00"
  endTime: string;     // "12:30"
  meetingType: string; // Design Review, Client Presentation, Site Coordination, Partner Strategy
  projectId?: string;
  agenda?: string;
  attendeeMembershipIds?: string[];
}

/**
 * Lists studio meetings with action items
 */
export async function listStudioMeetings(context: TenantContext) {
  assertAdminOrOwner(context);

  return await prisma.studioMeeting.findMany({
    where: { tenantId: context.tenantId },
    include: {
      project: { select: { id: true, name: true, code: true } },
      creator: { include: { user: { select: { fullName: true } } } },
      actionItems: {
        include: {
          assignee: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: [{ meetingDate: "desc" }, { startTime: "asc" }],
  });
}

/**
 * Schedules a new leadership meeting
 */
export async function createStudioMeeting(context: TenantContext, input: CreateMeetingInput) {
  assertAdminOrOwner(context);

  const meetingDate = parseDateOnly(input.meetingDate);

  return await prisma.studioMeeting.create({
    data: {
      tenantId: context.tenantId,
      title: input.title.trim(),
      meetingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      meetingType: input.meetingType || "Design Review",
      projectId: input.projectId || null,
      agenda: input.agenda?.trim() || null,
      creatorId: context.membershipId,
      attendeesJson: input.attendeeMembershipIds || [context.membershipId],
    },
  });
}

/**
 * Adds an action item to a meeting
 */
export async function addMeetingActionItem(
  context: TenantContext,
  meetingId: string,
  description: string,
  assigneeId?: string,
  dueDate?: string
) {
  assertAdminOrOwner(context);

  const meeting = await prisma.studioMeeting.findFirst({
    where: { id: meetingId, tenantId: context.tenantId },
  });

  if (!meeting) throw new Error("Meeting not found");

  return await prisma.studioMeetingActionItem.create({
    data: {
      tenantId: context.tenantId,
      meetingId,
      description: description.trim(),
      assigneeId: assigneeId || null,
      dueDate: dueDate ? parseDateOnly(dueDate) : null,
      status: "PENDING",
    },
  });
}

/**
 * Idempotently converts a meeting action item into an ExecutiveTask
 * Repeated clicks return the existing converted task without creating duplicates!
 */
export async function convertActionItemToExecutiveTask(
  context: TenantContext,
  meetingId: string,
  actionItemId: string
) {
  assertAdminOrOwner(context);

  return await prisma.$transaction(async (tx) => {
    const actionItem = await tx.studioMeetingActionItem.findFirst({
      where: {
        id: actionItemId,
        meetingId,
        tenantId: context.tenantId,
      },
      include: {
        meeting: true,
      },
    });

    if (!actionItem) {
      throw new Error("Action item not found in specified meeting");
    }

    // Idempotency check: if already converted, return existing task!
    if (actionItem.convertedTaskId) {
      const existingTask = await tx.executiveTask.findFirst({
        where: { id: actionItem.convertedTaskId, tenantId: context.tenantId },
        include: { assignments: true },
      });
      if (existingTask) {
        return { task: existingTask, alreadyConverted: true };
      }
    }

    // Create new executive task with meeting provenance
    const assigneeIds = actionItem.assigneeId ? [actionItem.assigneeId] : [context.membershipId];

    const newTask = await tx.executiveTask.create({
      data: {
        tenantId: context.tenantId,
        title: actionItem.description,
        description: `Deliverable generated from Meeting: "${actionItem.meeting.title}" on ${actionItem.meeting.meetingDate.toISOString().split("T")[0]}`,
        projectId: actionItem.meeting.projectId,
        category: "Action Item",
        priority: "MEDIUM",
        status: "TO_DO",
        dueDate: actionItem.dueDate,
        creatorId: context.membershipId,
        sourceMeetingId: meetingId,
        sourceActionItemId: actionItemId,
      },
    });

    for (const aId of assigneeIds) {
      await tx.executiveTaskAssignment.create({
        data: {
          tenantId: context.tenantId,
          taskId: newTask.id,
          assigneeId: aId,
        },
      });
    }

    // Update action item status
    await tx.studioMeetingActionItem.update({
      where: { id: actionItem.id },
      data: {
        status: "CONVERTED_TO_TASK",
        convertedTaskId: newTask.id,
      },
    });

    return { task: newTask, alreadyConverted: false };
  });
}
