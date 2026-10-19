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
    const { taskId, evidenceFiles, evidenceLinks } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    const rawItems = body.checklistItemIds || body.checklistTaskIds;
    const checklistItemIds = Array.isArray(rawItems) ? rawItems : [];
    const summary = (body.summary && body.summary.trim()) || (body.submissionNotes && body.submissionNotes.trim()) || "Work submitted for review";

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
