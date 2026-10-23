import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { exportCompletedTasksToCsv } from "@/server/modules/tasks/completed-tasks";

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

    const search = searchParams.get("search") || undefined;
    const employeeIds = searchParams.get("employeeIds")?.split(",").filter(Boolean) || undefined;
    const projectIds = searchParams.get("projectIds")?.split(",").filter(Boolean) || undefined;
    const priorities = searchParams.get("priorities")?.split(",").filter(Boolean) || undefined;
    const dateRange = (searchParams.get("dateRange") as any) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const onTimeStatus = (searchParams.get("onTimeStatus") as any) || undefined;
    const hasReopenHistory = searchParams.get("hasReopenHistory") === "true";

    const csvContent = await exportCompletedTasksToCsv(ctx, {
      search,
      employeeIds,
      projectIds,
      priorities,
      dateRange,
      startDate,
      endDate,
      onTimeStatus,
      hasReopenHistory,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="completed-tasks-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to export completed tasks" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
