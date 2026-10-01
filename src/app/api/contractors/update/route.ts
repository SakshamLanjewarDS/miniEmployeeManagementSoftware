import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateContractor } from "@/server/modules/contractors/repository";

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

    const { contractorId, ...updates } = body;
    if (!contractorId) {
      return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
    }

    const contractor = await updateContractor(ctx, contractorId, updates);
    return NextResponse.json({ success: true, contractor });
  } catch (err: any) {
    console.error("POST /api/contractors/update error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update contractor" }, { status });
  }
}
