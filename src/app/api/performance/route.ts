import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getStudioPerformanceData } from "@/server/modules/performance/service";
import { DatePreset } from "@/server/modules/performance/date-controls";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // Role gate: Only OWNER or ADMIN
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership authority required to access Employee Performance" },
        { status: 403 }
      );
    }

    const preset = (searchParams.get("preset") as DatePreset) || "THIS_MONTH";
    const customStart = searchParams.get("startDate") || undefined;
    const customEnd = searchParams.get("endDate") || undefined;
    const department = searchParams.get("department") || undefined;
    const designation = searchParams.get("designation") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const searchQuery = searchParams.get("search") || undefined;

    const data = await getStudioPerformanceData(ctx, {
      preset,
      customStart,
      customEnd,
      filters: {
        department,
        designation,
        projectId,
        searchQuery,
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/performance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load employee performance analytics" },
      { status: error.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
