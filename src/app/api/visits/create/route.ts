import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { createSiteVisit } from "@/server/modules/visits/service";

export async function POST(req: NextRequest) {
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
      projectId,
      siteId,
      customSiteName,
      customSiteAddress,
      customSiteLatitude,
      customSiteLongitude,
      employeeId,
      purpose,
      scheduledTime,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project selection is mandatory" }, { status: 400 });
    }
    if (!employeeId) {
      return NextResponse.json({ error: "Assigned employee is mandatory" }, { status: 400 });
    }
    if (!purpose || !purpose.trim()) {
      return NextResponse.json({ error: "Visit purpose / meeting agenda is mandatory" }, { status: 400 });
    }
    if (!scheduledTime) {
      return NextResponse.json({ error: "Scheduled date and time is mandatory" }, { status: 400 });
    }

    const visit = await createSiteVisit(ctx, {
      projectId,
      siteId,
      customSiteName,
      customSiteAddress,
      customSiteLatitude: customSiteLatitude ? parseFloat(customSiteLatitude) : undefined,
      customSiteLongitude: customSiteLongitude ? parseFloat(customSiteLongitude) : undefined,
      employeeId,
      purpose,
      scheduledTime: new Date(scheduledTime),
    });

    return NextResponse.json({ success: true, visit });
  } catch (error: any) {
    console.error("POST /api/visits/create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule and assign site visit" },
      { status: 400 }
    );
  }
}
