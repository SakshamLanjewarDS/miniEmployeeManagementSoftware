import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { convertActionItemToExecutiveTask } from "@/server/modules/executive/meetings";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  try {
    const { id, actionItemId } = await params;
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
        { error: "Forbidden: Converting action items requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const result = await convertActionItemToExecutiveTask(ctx, id, actionItemId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to convert action item to task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
