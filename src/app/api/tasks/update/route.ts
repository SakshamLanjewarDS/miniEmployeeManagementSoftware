import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateTask } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, title, description, priority, dueDate, estimatedHours, phaseId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    const updated = await updateTask(ctx, taskId, {
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
      estimatedHours: estimatedHours !== undefined ? (estimatedHours ? Number(estimatedHours) : null) : undefined,
      phaseId,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error("Task update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
