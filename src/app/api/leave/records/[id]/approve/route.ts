import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { approveLeaveRequest } from "@/server/modules/leave/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
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
        { error: "Forbidden: Leadership privileges required to approve leaves" },
        { status: 403 }
      );
    }

    const updated = await approveLeaveRequest(ctx, id, body.reviewNotes);

    // Outbound push is handled automatically by approveLeaveRequest service
    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to approve leave request" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
