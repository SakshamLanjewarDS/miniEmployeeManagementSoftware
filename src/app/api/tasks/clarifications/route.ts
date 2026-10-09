import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { askTaskClarification, replyToTaskClarification } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, checklistItemId, question, clarificationId, message, attachments } = body;

    // If replying to existing clarification
    if (clarificationId) {
      if (!message || !message.trim()) {
        return NextResponse.json({ error: "Reply message cannot be empty." }, { status: 400 });
      }
      const reply = await replyToTaskClarification(ctx, clarificationId, { message });
      return NextResponse.json({ success: true, reply });
    }

    // Otherwise asking new clarification
    if (!taskId || !question) {
      return NextResponse.json({ error: "Task ID and question text are required." }, { status: 400 });
    }

    const clarification = await askTaskClarification(ctx, taskId, {
      checklistItemId,
      question,
      attachments,
    });

    return NextResponse.json({ success: true, clarification });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process clarification" },
      { status: err.statusCode || 400 }
    );
  }
}
