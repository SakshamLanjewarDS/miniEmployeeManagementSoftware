import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { recordClientApproval } from "@/server/modules/drawings/repository";

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

    const { status, evidenceText, receivedDate } = body;
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: 'status must be "APPROVED" or "REJECTED"' }, { status: 400 });
    }
    if (!evidenceText || !evidenceText.trim()) {
      return NextResponse.json({ error: "Client approval evidence text is required" }, { status: 400 });
    }

    const clientApproval = await recordClientApproval(ctx, revisionId, {
      status,
      evidenceText,
      receivedDate: receivedDate ? new Date(receivedDate) : undefined,
    });

    return NextResponse.json({ success: true, clientApproval });
  } catch (err: any) {
    console.error("POST /api/drawings/revisions/[revisionId]/client-approval error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to record client approval" }, { status });
  }
}
