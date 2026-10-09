import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reopenChecklistTask } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, reason } = body;

    if (!taskId || !itemId || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Task ID, Item ID, and reason for reopening are required." },
        { status: 400 }
      );
    }

    const reopened = await reopenChecklistTask(ctx, taskId, itemId, {
      reason,
    });

    return NextResponse.json({ success: true, item: reopened });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reopen completed work" },
      { status: err.statusCode || 400 }
    );
  }
}
