import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reviewTaskSubmission } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, decision, feedback } = body;

    if (!submissionId || !decision) {
      return NextResponse.json(
        { error: "Submission ID and decision ('APPROVE' or 'REQUEST_CHANGES') are required." },
        { status: 400 }
      );
    }

    if (!["APPROVE", "REQUEST_CHANGES"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'APPROVE' or 'REQUEST_CHANGES'." },
        { status: 400 }
      );
    }

    const reviewed = await reviewTaskSubmission(ctx, submissionId, {
      decision,
      feedback,
    });

    return NextResponse.json({ success: true, submission: reviewed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to record review decision" },
      { status: err.statusCode || 400 }
    );
  }
}
