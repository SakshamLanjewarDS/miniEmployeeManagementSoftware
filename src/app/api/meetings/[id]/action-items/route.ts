import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { addMeetingActionItem } from "@/server/modules/executive/meetings";
import { dispatchNotification } from "@/server/modules/notifications/dispatch";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await req.json().catch(() => ({}));
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug || !meetingId) {
      return NextResponse.json({ error: "Missing workspaceSlug or meetingId" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Adding action items requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const actionItem = await addMeetingActionItem(
      ctx,
      meetingId,
      body.description,
      body.assigneeId,
      body.dueDate
    );

    // If an action item is assigned to a member, dispatch notification
    if (body.assigneeId && body.assigneeId !== ctx.membershipId) {
      dispatchNotification({
        tenantId: ctx.tenantId,
        recipientId: body.assigneeId,
        title: "Action Item Assigned from Meeting",
        message: `You were assigned: "${body.description}"${body.dueDate ? ` (Due: ${body.dueDate})` : ""}`,
        link: `/w/${ctx.tenantSlug}/meetings`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, actionItem }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to add action item" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
