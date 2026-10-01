import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { addTaskComment } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { taskId, content } = body;
    if (!taskId || !content) {
      return NextResponse.json({ error: "taskId and content are required" }, { status: 400 });
    }

    const comment = await addTaskComment(ctx, taskId, content);
    return NextResponse.json({ success: true, comment });
  } catch (err: any) {
    console.error("Task comment error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add comment" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
