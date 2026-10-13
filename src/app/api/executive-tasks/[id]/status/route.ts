import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateExecutiveTaskStatus } from "@/server/modules/executive/tasks";

export async function PATCH(
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

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Executive tasks require Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const updated = await updateExecutiveTaskStatus(ctx, id, body.status);
    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update executive task status" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
