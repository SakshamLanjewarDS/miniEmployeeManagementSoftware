import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { deleteTask } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  return handleDelete(req);
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    let taskId = searchParams.get("taskId");
    if (!taskId) {
      try {
        const body = await req.json();
        taskId = body?.taskId;
      } catch {
        // No json body
      }
    }

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required for deletion." }, { status: 400 });
    }

    const deleted = await deleteTask(ctx, taskId);

    return NextResponse.json({
      success: true,
      deletedTaskId: deleted.id,
      message: `Task "${deleted.title}" deleted successfully.`,
    });
  } catch (err: any) {
    console.error("Task delete error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
