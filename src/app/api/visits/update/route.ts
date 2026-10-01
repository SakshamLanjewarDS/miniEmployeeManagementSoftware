import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateSiteVisit } from "@/server/modules/visits/service";

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      visitId,
      purpose,
      scheduledTime,
      findings,
      nextActions,
      siteName,
      siteAddress,
      siteLatitude,
      siteLongitude,
    } = body;

    if (!visitId) {
      return NextResponse.json({ error: "Visit ID is mandatory" }, { status: 400 });
    }

    const updated = await updateSiteVisit(ctx, {
      visitId,
      purpose,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      findings,
      nextActions,
      siteName,
      siteAddress,
      siteLatitude: typeof siteLatitude === "number" ? siteLatitude : undefined,
      siteLongitude: typeof siteLongitude === "number" ? siteLongitude : undefined,
    });

    return NextResponse.json({ success: true, visit: updated });
  } catch (error: any) {
    console.error("PATCH /api/visits/update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update site visit report" },
      { status: 400 }
    );
  }
}
