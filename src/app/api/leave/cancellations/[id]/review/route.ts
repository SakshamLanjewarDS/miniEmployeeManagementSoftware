import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reviewLeaveCancellation } from "@/server/modules/leave/cancellation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to review leave cancellations" },
        { status: 403 }
      );
    }

    const { decision, rejectionReason } = body;
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid decision. Must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    const result = await reviewLeaveCancellation(ctx, {
      cancellationRequestId: id,
      decision,
      rejectionReason,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to review leave cancellation" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
