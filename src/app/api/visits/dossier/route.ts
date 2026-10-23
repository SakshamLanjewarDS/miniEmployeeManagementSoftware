import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getSiteVisitDossier } from "@/server/modules/visits/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const visitId = searchParams.get("visitId");

    if (!workspaceSlug || !visitId) {
      return NextResponse.json({ error: "Missing workspaceSlug or visitId" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dossier = await getSiteVisitDossier(ctx, visitId);
    return NextResponse.json({ success: true, ...dossier });
  } catch (error: any) {
    console.error("GET /api/visits/dossier error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load site visit dossier" },
      { status: 400 }
    );
  }
}
