import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly } from "../leave/policy";
import { createExecutiveTask } from "./tasks";
import { broadcastStudioEvent } from "../../realtime/eventBus";
import { dispatchNotificationToMemberships } from "../notifications/dispatch";
import { clearNotificationCache } from "../notifications/service";
import { clearDashboardCache } from "../dashboard/service";

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
  locationType?: "PHYSICAL" | "ONLINE";
  locationDetails?: string;
  isRecurring?: boolean;
  recurrenceRule?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  occurrenceCount?: number;
  attachments?: any[];
  isMinutesPublished?: boolean;
}

/**
 * Dispatches multi-channel notifications to all target meeting attendees:
 * in-app notification, Web Push, Executive notifications, and email outbox.
 */
async function notifyMeetingAttendees(
  context: TenantContext,
  meeting: {
    id: string;
    title: string;
    meetingDate: Date;
    startTime: string;
    endTime: string;
    meetingType: string;
    agenda?: string | null;
    attendeesJson?: any;
    audienceSnapshotJson?: any;
  },
  notificationKind: "SCHEDULED" | "UPDATED" | "MINUTES_PUBLISHED" | "CANCELLED" = "SCHEDULED"
) {
  try {
    const attendees = meeting.attendeesJson || {};
    let targetRecipientIds: string[] = [];

    if (Array.isArray(attendees.employeeIds) && attendees.employeeIds.length > 0) {
      targetRecipientIds = attendees.employeeIds.filter((id: string) => id !== context.membershipId);
    } else if (attendees.allEmployees === true) {
      const snap = meeting.audienceSnapshotJson || {};
      if (Array.isArray(snap.snapshotMembershipIds) && snap.snapshotMembershipIds.length > 0) {
        targetRecipientIds = snap.snapshotMembershipIds.filter((id: string) => id !== context.membershipId);
      } else {
        const allMembers = await prisma.tenantMembership.findMany({
          where: {
            tenantId: context.tenantId,
            isActive: true,
            id: { not: context.membershipId },
          },
          select: { id: true },
        });
        targetRecipientIds = allMembers.map((m) => m.id);
      }
    }

    if (targetRecipientIds.length === 0) return;

    const dateStr = meeting.meetingDate.toISOString().split("T")[0];
    let prefix = "🗓️ New Studio Meeting";
    let message = `${meeting.title} has been scheduled for ${dateStr} (${meeting.startTime} - ${meeting.endTime}) [${meeting.meetingType}].`;

    if (notificationKind === "UPDATED") {
      prefix = "🔄 Meeting Updated";
      message = `${meeting.title} schedule/agenda was updated for ${dateStr} (${meeting.startTime} - ${meeting.endTime}).`;
    } else if (notificationKind === "MINUTES_PUBLISHED") {
      prefix = "📝 Minutes of Meeting Published";
      message = `Minutes & decisions for ${meeting.title} (${dateStr}) have been published by leadership.`;
    } else if (notificationKind === "CANCELLED") {
      prefix = "🚫 Meeting Cancelled";
      message = `${meeting.title} scheduled for ${dateStr} has been cancelled.`;
    }

    const title = `${prefix}: ${meeting.title}`;
    const deepLinkUrl = `/w/${context.tenantSlug}/meetings`;

    // 1. In-App Notifications & Device Web Push
    await dispatchNotificationToMemberships(context.tenantId, targetRecipientIds, {
      title,
      message,
      link: deepLinkUrl,
      tag: `meeting-${meeting.id}`,
    });

    // 2. Executive Notifications table
    await prisma.studioExecutiveNotification.createMany({
      data: targetRecipientIds.map((mId) => ({
        tenantId: context.tenantId,
        recipientMembershipId: mId,
        notificationType: notificationKind === "CANCELLED" ? "STATUS_CHANGED" : notificationKind === "MINUTES_PUBLISHED" ? "MEETING_SCHEDULED" : notificationKind === "UPDATED" ? "STATUS_CHANGED" : "MEETING_SCHEDULED",
        title,
        message,
        deepLinkUrl,
        relatedMeetingId: meeting.id,
      })),
    });

    // 3. Queue in StudioEmailOutbox (skip for cancelled)
    if (notificationKind !== "CANCELLED") {
      const targetMembers = await prisma.tenantMembership.findMany({
        where: { id: { in: targetRecipientIds } },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });

      if (targetMembers.length > 0) {
        await prisma.studioEmailOutbox.createMany({
          data: targetMembers.map((m) => ({
            tenantId: context.tenantId,
            recipientUserId: m.user.id,
            recipientEmail: m.user.email,
            recipientName: m.user.fullName,
            eventType: "MEETING_SCHEDULED",
            relatedEntityType: "StudioMeeting",
            relatedEntityId: meeting.id,
            subject: `${title} (${dateStr} ${meeting.startTime})`,
            htmlBody: `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;">
              <h2 style="color:#2563eb;">${title}</h2>
              <p>Hello <strong>${m.user.fullName}</strong>,</p>
              <p>${message}</p>
              ${meeting.agenda ? `<p style="margin:8px 0;padding:10px;background:#f1f5f9;border-radius:6px;"><strong>Agenda:</strong> ${meeting.agenda}</p>` : ""}
              <p><a href="/w/${context.tenantSlug}/meetings" style="display:inline-block;background:#2563eb;color:#ffffff;padding:8px 16px;text-decoration:none;border-radius:8px;font-weight:bold;">View in Studio Platform</a></p>
            </div>`,
            status: "PENDING",
            idempotencyKey: `meeting_${meeting.id}_${m.id}_${Date.now()}`,
          })),
          skipDuplicates: true,
        });
      }
    }

    // 4. Clear notification cache so the employee immediately sees the bell badge
    clearNotificationCache();
  } catch (err) {
    console.error("[Meetings] Failed to notify attendees:", err);
  }
}

/**
 * Lists studio meetings with action items.
 * Enforces server-side authorization:
 * - Owners & Admins see all meetings and draft MoM.
 * - Employees see only meetings where they are authorized attendees.
 * - Draft MoM is withheld from employees until published by Owner/Admin.
 */
export async function listStudioMeetings(context: TenantContext) {
  const meetings = await prisma.studioMeeting.findMany({
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

  // Owner/Admin has full visibility
  if (context.role === "OWNER" || context.role === "ADMIN") {
    return meetings;
  }

  // Employee read-only filtering and draft MoM redaction
  return meetings
    .filter((m) => {
      const att = (m.attendeesJson as any) || {};
      const snap = (m.audienceSnapshotJson as any) || {};
      const inEmployeeIds = Array.isArray(att.employeeIds) && att.employeeIds.includes(context.membershipId);
      const inSnapshot = Array.isArray(snap.snapshotMembershipIds) && snap.snapshotMembershipIds.includes(context.membershipId);
      const isCreator = m.creatorId === context.membershipId;
      return inEmployeeIds || inSnapshot || isCreator;
    })
    .map((m) => {
      // Drafts of minutes/decisions must remain private until published by Owner/Admin
      if (!m.isMinutesPublished) {
        return {
          ...m,
          notes: null,
          decisions: null,
        };
      }
      return m;
    });
}

/**
 * Schedules a new leadership meeting (Owner / Admin restricted).
 * Resolves All active employees to a saved audience snapshot.
 * Supports recurring series generation.
 */
export async function createStudioMeeting(context: TenantContext, input: CreateMeetingInput) {
  assertAdminOrOwner(context);

  const meetingDate = parseDateOnly(input.meetingDate);

  // Audience snapshot resolution
  let resolvedEmployeeIds = input.attendees?.employeeIds || input.attendeeMembershipIds || [context.membershipId];
  let audienceSnapshot: any = null;

  if (input.attendees?.allEmployees === true) {
    const activeMembers = await prisma.tenantMembership.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    resolvedEmployeeIds = activeMembers.map((m) => m.id);
    audienceSnapshot = {
      allEmployees: true,
      resolvedAt: new Date().toISOString(),
      attendees: activeMembers.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
      })),
      snapshotMembershipIds: resolvedEmployeeIds,
    };
  } else {
    audienceSnapshot = {
      allEmployees: false,
      resolvedAt: new Date().toISOString(),
      snapshotMembershipIds: resolvedEmployeeIds,
    };
  }

  const attendeesJson = {
    allEmployees: input.attendees?.allEmployees === true,
    employeeIds: resolvedEmployeeIds,
    contractorIds: input.attendees?.contractorIds || [],
    clientIds: input.attendees?.clientIds || [],
    consultantIds: input.attendees?.consultantIds || [],
    locationType: input.locationType || input.attendees?.locationType || "STUDIO",
    meetingLink: input.locationDetails || input.attendees?.meetingLink,
  };

  const isRecurring = Boolean(input.isRecurring && input.recurrenceRule);
  const seriesId = isRecurring ? `series_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;
  const occurrenceCount = isRecurring ? Math.min(Math.max(input.occurrenceCount || 4, 1), 12) : 1;

  const createdMeetings = [];

  for (let i = 0; i < occurrenceCount; i++) {
    const occDate = new Date(meetingDate);
    if (i > 0 && input.recurrenceRule) {
      if (input.recurrenceRule === "WEEKLY") {
        occDate.setDate(occDate.getDate() + 7 * i);
      } else if (input.recurrenceRule === "BIWEEKLY") {
        occDate.setDate(occDate.getDate() + 14 * i);
      } else if (input.recurrenceRule === "MONTHLY") {
        occDate.setMonth(occDate.getMonth() + i);
      }
    }

    const meeting = await prisma.studioMeeting.create({
      data: {
        tenantId: context.tenantId,
        title: input.title.trim(),
        meetingDate: occDate,
        startTime: input.startTime,
        endTime: input.endTime,
        meetingType: input.meetingType || "Design Review",
        projectId: input.projectId || null,
        agenda: input.agenda?.trim() || null,
        notes: input.notes?.trim() || null,
        decisions: input.decisions?.trim() || null,
        creatorId: context.membershipId,
        attendeesJson: attendeesJson as any,
        audienceSnapshotJson: audienceSnapshot as any,
        isRecurring,
        recurrenceRule: isRecurring ? input.recurrenceRule : null,
        seriesId,
        locationType: input.locationType || "PHYSICAL",
        locationDetails: input.locationDetails?.trim() || null,
        attachmentsJson: (input.attachments as any) ?? undefined,
        isMinutesPublished: input.isMinutesPublished === true,
        publishedMinutesAt: input.isMinutesPublished === true ? new Date() : null,
      },
    });
    createdMeetings.push(meeting);
  }

  const primaryMeeting = createdMeetings[0];

  // 1. Clear caches immediately
  clearDashboardCache(context.tenantId);
  clearNotificationCache();

  // 2. Broadcast realtime event
  broadcastStudioEvent(context.tenantId, {
    type: "MEETING_SCHEDULED",
    actorId: context.membershipId,
    actorName: context.userFullName,
    payload: {
      meetingId: primaryMeeting.id,
      title: primaryMeeting.title,
      meetingDate: input.meetingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      meetingType: primaryMeeting.meetingType,
    },
  });

  // 3. Dispatch notifications
  notifyMeetingAttendees(context, primaryMeeting, "SCHEDULED").catch((err) => {
    console.error("[Meetings] Background notification error:", err);
  });

  return primaryMeeting;
}

/**
 * Updates an existing studio meeting (notes, decisions, agenda, status, attendees).
 * Supports explicit single occurrence vs series update.
 * Invalidate pending reminders on participant removal or cancellation.
 */
export async function updateStudioMeeting(
  context: TenantContext,
  meetingId: string,
  input: Partial<CreateMeetingInput> & {
    status?: string;
    recurrenceScope?: "THIS_OCCURRENCE" | "THIS_AND_FUTURE";
  }
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
  if (input.locationType !== undefined) updateData.locationType = input.locationType;
  if (input.locationDetails !== undefined) updateData.locationDetails = input.locationDetails?.trim() || null;
  if (input.attachments !== undefined) updateData.attachmentsJson = input.attachments;

  // Minutes publication
  const willPublishMinutes = input.isMinutesPublished === true && !existing.isMinutesPublished;
  if (input.isMinutesPublished !== undefined) {
    updateData.isMinutesPublished = input.isMinutesPublished;
    if (input.isMinutesPublished) {
      updateData.publishedMinutesAt = new Date();
    }
  }

  // Handle participant changes & revoke pending reminders for removed members
  if (input.attendees !== undefined) {
    const prevEmployeeIds: string[] = (existing.attendeesJson as any)?.employeeIds || [];
    const newEmployeeIds: string[] = input.attendees.employeeIds || [];
    const removedMemberIds = prevEmployeeIds.filter((id) => !newEmployeeIds.includes(id));

    if (removedMemberIds.length > 0) {
      // Promptly cancel pending reminders for removed participants
      await prisma.studioEmailOutbox.updateMany({
        where: {
          tenantId: context.tenantId,
          relatedEntityId: meetingId,
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      }).catch(() => {});
    }

    updateData.attendeesJson = input.attendees;
  }

  // Handle meeting cancellation: invalidate pending reminder jobs
  if (input.status === "CANCELLED") {
    await prisma.studioEmailOutbox.updateMany({
      where: {
        tenantId: context.tenantId,
        relatedEntityId: meetingId,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    }).catch(() => {});
  }

  let updated = await prisma.studioMeeting.update({
    where: { id: meetingId },
    data: updateData,
  });

  // Handle series updates if THIS_AND_FUTURE requested
  if (input.recurrenceScope === "THIS_AND_FUTURE" && existing.seriesId) {
    const seriesUpdateData: any = {};
    if (updateData.title) seriesUpdateData.title = updateData.title;
    if (updateData.startTime) seriesUpdateData.startTime = updateData.startTime;
    if (updateData.endTime) seriesUpdateData.endTime = updateData.endTime;
    if (updateData.meetingType) seriesUpdateData.meetingType = updateData.meetingType;
    if (updateData.projectId !== undefined) seriesUpdateData.projectId = updateData.projectId;
    if (updateData.locationType) seriesUpdateData.locationType = updateData.locationType;
    if (updateData.locationDetails !== undefined) seriesUpdateData.locationDetails = updateData.locationDetails;

    await prisma.studioMeeting.updateMany({
      where: {
        tenantId: context.tenantId,
        seriesId: existing.seriesId,
        meetingDate: { gt: existing.meetingDate },
      },
      data: seriesUpdateData,
    });
  }

  // Clear caches
  clearDashboardCache(context.tenantId);
  clearNotificationCache();

  // Broadcast realtime update
  broadcastStudioEvent(context.tenantId, {
    type: "MEETING_SCHEDULED",
    actorId: context.membershipId,
    actorName: context.userFullName,
    payload: {
      meetingId: updated.id,
      title: updated.title,
      status: updated.status,
    },
  });

  // Dispatches appropriate notification
  if (input.status === "CANCELLED") {
    notifyMeetingAttendees(context, updated, "CANCELLED").catch(() => {});
  } else if (willPublishMinutes) {
    notifyMeetingAttendees(context, updated, "MINUTES_PUBLISHED").catch(() => {});
  } else if (input.meetingDate || input.startTime || input.status || input.agenda) {
    notifyMeetingAttendees(context, updated, "UPDATED").catch(() => {});
  }

  return updated;
}

/**
 * Deletes a studio meeting
 */
export async function deleteStudioMeeting(context: TenantContext, meetingId: string) {
  assertAdminOrOwner(context);
  const deleted = await prisma.studioMeeting.delete({
    where: { id: meetingId, tenantId: context.tenantId },
  });

  clearDashboardCache(context.tenantId);
  clearNotificationCache();

  broadcastStudioEvent(context.tenantId, {
    type: "MEETING_SCHEDULED",
    actorId: context.membershipId,
    actorName: context.userFullName,
    payload: {
      deletedMeetingId: meetingId,
    },
  });

  return deleted;
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
