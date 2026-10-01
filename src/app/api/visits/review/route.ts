import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reviewSiteVisit } from "@/server/modules/visits/service";
import { canApproveWork } from "@/server/tenancy/context";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!canApproveWork(ctx)) {
      return NextResponse.json({ error: "Only Project Managers or Partners can review reports" }, { status: 403 });
    }

    const body = await req.json();
    const { visitId, decision, comment } = body;

    const updated = await reviewSiteVisit(ctx, visitId, decision, comment);

    return NextResponse.json({ success: true, visit: updated });
  } catch (err: any) {
    console.error("Review error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 400 });
  }
}
