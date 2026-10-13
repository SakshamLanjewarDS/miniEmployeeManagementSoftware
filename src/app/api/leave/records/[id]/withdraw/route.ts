import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { withdrawPendingLeaveRequest } from "@/server/modules/leave/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const workspaceSlug = body.workspaceSlug || searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const withdrawn = await withdrawPendingLeaveRequest(ctx, id);
    return NextResponse.json({ success: true, record: withdrawn });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to withdraw leave request" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
