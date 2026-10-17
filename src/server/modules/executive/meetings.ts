import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly } from "../leave/policy";
import { createExecutiveTask } from "./tasks";

export interface MeetingAttendeesPayload {
  allEmployees?: boolean;
  employeeIds?: string[];
  contractorIds?: string[];
  clientIds?: string[];
  consultantIds?: string[];
  locationType?: "STUDIO" | "SITE" | "CLIENT_OFFICE" | "VIRTUAL";
  meetingLink?: string;
  siteLocation?: string;
}

export interface CreateMeetingInput {
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string;   // "11:00"
  endTime: string;     // "12:30"
  meetingType: string; // Design Review, Client Presentation, Site Coordination, Partner Strategy, etc.
  projectId?: string;
  agenda?: string;
  notes?: string;
  decisions?: string;
  attendees?: MeetingAttendeesPayload;
  attendeeMembershipIds?: string[]; // backwards compatibility
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

  const attendeesJson = input.attendees || {
    allEmployees: false,
    employeeIds: input.attendeeMembershipIds || [context.membershipId],
    contractorIds: [],
    clientIds: [],
    consultantIds: [],
  };

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
      notes: input.notes?.trim() || null,
      decisions: input.decisions?.trim() || null,
      creatorId: context.membershipId,
      attendeesJson: attendeesJson as any,
    },
  });
}

/**
 * Updates an existing studio meeting (notes, decisions, agenda, status, attendees)
 */
export async function updateStudioMeeting(
  context: TenantContext,
  meetingId: string,
  input: Partial<CreateMeetingInput> & { status?: string }
) {
  assertAdminOrOwner(context);

  const existing = await prisma.studioMeeting.findFirst({
    where: { id: meetingId, tenantId: context.tenantId },
  });
  if (!existing) throw new Error("Meeting not found");

  const updateData: any = {};
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.meetingDate !== undefined) updateData.meetingDate = parseDateOnly(input.meetingDate);
  if (input.startTime !== undefined) updateData.startTime = input.startTime;
  if (input.endTime !== undefined) updateData.endTime = input.endTime;
  if (input.meetingType !== undefined) updateData.meetingType = input.meetingType;
  if (input.projectId !== undefined) updateData.projectId = input.projectId || null;
  if (input.agenda !== undefined) updateData.agenda = input.agenda?.trim() || null;
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;
  if (input.decisions !== undefined) updateData.decisions = input.decisions?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.attendees !== undefined) updateData.attendeesJson = input.attendees;

  return await prisma.studioMeeting.update({
    where: { id: meetingId },
    data: updateData,
  });
}

/**
 * Deletes a studio meeting
 */
export async function deleteStudioMeeting(context: TenantContext, meetingId: string) {
  assertAdminOrOwner(context);
  return await prisma.studioMeeting.delete({
    where: { id: meetingId, tenantId: context.tenantId },
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
