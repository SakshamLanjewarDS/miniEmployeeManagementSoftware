import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  listStudioMeetings,
  createStudioMeeting,
  updateStudioMeeting,
  deleteStudioMeeting,
} from "@/server/modules/executive/meetings";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // Parallel fetch meetings and all stakeholder catalogs for fast, single-flight client render
    const [meetings, employees, contractors, clients, consultants, projects] = await Promise.all([
      listStudioMeetings(ctx),
      prisma.tenantMembership.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          employee: { select: { designation: true, department: true, employeeId: true } },
        },
        orderBy: { user: { fullName: "asc" } },
      }),
      prisma.contractor.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { id: true, name: true, firmName: true, trade: true, contact: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.client.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { id: true, name: true, company: true, email: true, contact: true },
        orderBy: { name: "asc" },
      }),
      prisma.consultant.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { id: true, name: true, firmName: true, discipline: true, email: true, contact: true },
        orderBy: { name: "asc" },
      }),
      prisma.project.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      meetings,
      userRole: ctx.role,
      currentMembershipId: ctx.membershipId,
      participants: {
        employees,
        contractors,
        clients,
        consultants,
        projects,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list studio meetings" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Scheduling studio meetings requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const newMeeting = await createStudioMeeting(ctx, {
      title: body.title,
      meetingDate: body.meetingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      meetingType: body.meetingType,
      projectId: body.projectId,
      agenda: body.agenda,
      notes: body.notes,
      decisions: body.decisions,
      attendees: body.attendees,
      attendeeMembershipIds: body.attendeeMembershipIds,
      locationType: body.locationType,
      locationDetails: body.locationDetails,
      isRecurring: body.isRecurring,
      recurrenceRule: body.recurrenceRule,
      occurrenceCount: body.occurrenceCount,
      attachments: body.attachments,
      isMinutesPublished: body.isMinutesPublished,
    });

    return NextResponse.json({ success: true, meeting: newMeeting }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to schedule studio meeting" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");
    const meetingId = body.meetingId || body.id;

    if (!workspaceSlug || !meetingId) {
      return NextResponse.json({ error: "Missing workspaceSlug or meetingId" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Editing studio meetings requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const updated = await updateStudioMeeting(ctx, meetingId, {
      title: body.title,
      meetingDate: body.meetingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      meetingType: body.meetingType,
      projectId: body.projectId,
      agenda: body.agenda,
      notes: body.notes,
      decisions: body.decisions,
      status: body.status,
      attendees: body.attendees,
      locationType: body.locationType,
      locationDetails: body.locationDetails,
      attachments: body.attachments,
      isMinutesPublished: body.isMinutesPublished,
      recurrenceScope: body.recurrenceScope,
    });

    return NextResponse.json({ success: true, meeting: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update studio meeting" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");
    const meetingId = searchParams.get("meetingId") || searchParams.get("id");

    if (!workspaceSlug || !meetingId) {
      return NextResponse.json({ error: "Missing workspaceSlug or meetingId" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Deleting studio meetings requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    await deleteStudioMeeting(ctx, meetingId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete studio meeting" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
