import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { transitionTaskStatus } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, comment, auditReason } = body;

    const updated = await transitionTaskStatus(ctx, taskId, status, {
      comment,
      auditReason,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error("Task status update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to transition task status" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
