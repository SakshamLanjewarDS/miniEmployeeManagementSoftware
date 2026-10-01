import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateConsultant } from "@/server/modules/consultants/repository";

export async function POST(req: NextRequest) {
  try {
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

    const { consultantId, ...updates } = body;
    if (!consultantId) {
      return NextResponse.json({ error: "consultantId is required" }, { status: 400 });
    }

    const consultant = await updateConsultant(ctx, consultantId, updates);
    return NextResponse.json({ success: true, consultant });
  } catch (err: any) {
    console.error("POST /api/consultants/update error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update consultant" }, { status });
  }
}
