import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listStudioMeetings, createStudioMeeting } from "@/server/modules/executive/meetings";

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

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Studio meetings require Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const meetings = await listStudioMeetings(ctx);
    return NextResponse.json({ success: true, meetings });
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
      attendeeMembershipIds: body.attendeeMembershipIds,
    });

    return NextResponse.json({ success: true, meeting: newMeeting }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to schedule studio meeting" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
