import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { decideProfileRecordChangeRequest } from "@/server/modules/profile/service";

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Forbidden: Only Owners and Admins can approve profile changes." }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, decision, decisionNote } = body;

    if (!requestId) return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "decision must be APPROVE or REJECT." }, { status: 400 });
    }

    const result = await decideProfileRecordChangeRequest(ctx, requestId, {
      decision,
      decisionNote,
    });

    return NextResponse.json({ success: true, request: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to decide profile request" }, { status: 400 });
  }
}
