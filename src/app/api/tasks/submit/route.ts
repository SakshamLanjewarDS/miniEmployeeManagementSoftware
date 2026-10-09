import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { submitTasksForReview } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, checklistItemIds, summary, evidenceFiles, evidenceLinks } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }
    if (!summary || !summary.trim()) {
      return NextResponse.json(
        { error: "Submission summary is required to describe the completed work." },
        { status: 400 }
      );
    }
    if (!Array.isArray(checklistItemIds) || checklistItemIds.length === 0) {
      return NextResponse.json(
        { error: "At least one completed checklist task must be selected for submission." },
        { status: 400 }
      );
    }

    const submission = await submitTasksForReview(ctx, {
      taskId,
      checklistItemIds,
      summary,
      evidenceFiles,
      evidenceLinks,
    });

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit work for review" },
      { status: err.statusCode || 400 }
    );
  }
}
