import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { withdrawRevisionSubmission } from "@/server/modules/drawings/repository";

interface RouteParams {
  params: Promise<{ revisionId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { revisionId } = await params;
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const updated = await withdrawRevisionSubmission(ctx, revisionId);
    return NextResponse.json({ success: true, version: updated });
  } catch (err: any) {
    console.error("POST /api/drawings/revisions/[revisionId]/withdraw error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to withdraw revision" }, { status });
  }
}
