import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getEmployeeDashboardData } from "@/server/modules/dashboard/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const data = await getEmployeeDashboardData(ctx);
    return NextResponse.json({
      success: true,
      reopenedTasks: data.reopenedTasks || [],
      count: data.reopenedTasks?.length || 0,
    });
  } catch (err: any) {
    console.error("GET /api/employee/reopened-tasks error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load reopened tasks" },
      { status: 500 }
    );
  }
}
