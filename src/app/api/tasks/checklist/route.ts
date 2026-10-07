import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { toggleChecklistItem, transitionChecklistItemStatus } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, isCompleted, status, comment, blockerReason } = body;

    if (!taskId || !itemId) {
      return NextResponse.json({ error: "taskId and itemId are required." }, { status: 400 });
    }

    let updated: any;
    if (status) {
      updated = await transitionChecklistItemStatus(ctx, taskId, itemId, status, {
        comment,
        blockerReason,
      });
    } else {
      updated = await toggleChecklistItem(ctx, taskId, itemId, Boolean(isCompleted));
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("Checklist update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update checklist item" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
