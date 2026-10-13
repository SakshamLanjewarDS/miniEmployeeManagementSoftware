import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { verifySiteIssue } from "@/server/modules/visits/issues";

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

    const { decision, reopenReason } = body;
    if (decision !== "CLOSE" && decision !== "REOPEN") {
      return NextResponse.json({ error: "Decision must be CLOSE or REOPEN" }, { status: 400 });
    }

    const updated = await verifySiteIssue(ctx, id, decision, reopenReason);
    return NextResponse.json({ success: true, issue: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
