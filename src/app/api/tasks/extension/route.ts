import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { requestDeadlineExtension, decideDeadlineExtension } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, proposedDueDate, reason } = body;

    if (!taskId || !itemId || !proposedDueDate || !reason) {
      return NextResponse.json(
        { error: "Task ID, Item ID, proposed due date, and reason are required." },
        { status: 400 }
      );
    }

    const ext = await requestDeadlineExtension(ctx, taskId, itemId, {
      proposedDueDate,
      reason,
    });

    return NextResponse.json({ success: true, request: ext });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit extension request" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, decision, decisionReason } = body;

    if (!requestId || !decision || !["APPROVE", "REJECT"].includes(decision)) {
      return NextResponse.json(
        { error: "Request ID and valid decision ('APPROVE' or 'REJECT') are required." },
        { status: 400 }
      );
    }

    const decided = await decideDeadlineExtension(ctx, requestId, {
      decision,
      decisionReason,
    });

    return NextResponse.json({ success: true, request: decided });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process extension decision" },
      { status: err.statusCode || 400 }
    );
  }
}
