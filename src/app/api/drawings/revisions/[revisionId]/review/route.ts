import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reviewRevision } from "@/server/modules/drawings/repository";

interface RouteParams {
  params: Promise<{ revisionId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { revisionId } = await params;
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { decision, comment } = body;
    if (decision !== "APPROVED" && decision !== "CHANGES_REQUESTED") {
      return NextResponse.json(
        { error: 'decision must be either "APPROVED" or "CHANGES_REQUESTED"' },
        { status: 400 }
      );
    }

    const updated = await reviewRevision(ctx, revisionId, decision, comment);
    return NextResponse.json({ success: true, version: updated });
  } catch (err: any) {
    console.error("POST /api/drawings/revisions/[revisionId]/review error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to record review decision" }, { status });
  }
}
