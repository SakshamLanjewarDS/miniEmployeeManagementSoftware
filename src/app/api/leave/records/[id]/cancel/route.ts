import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { requestLeaveCancellation } from "@/server/modules/leave/cancellation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: "A cancellation reason is required" }, { status: 400 });
    }

    const cancellation = await requestLeaveCancellation(ctx, {
      leaveRequestId: id,
      reason: body.reason,
    });

    return NextResponse.json({ success: true, cancellation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit leave cancellation request" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
