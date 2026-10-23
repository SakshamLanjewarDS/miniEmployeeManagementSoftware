import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getCompletedTasksDossier } from "@/server/modules/tasks/completed-tasks";

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
    const sortBy = (searchParams.get("sortBy") as any) || "completedAt_desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const dossier = await getCompletedTasksDossier(ctx, {
      search,
      employeeIds,
      projectIds,
      priorities,
      dateRange,
      startDate,
      endDate,
      onTimeStatus,
      hasReopenHistory,
      sortBy,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...dossier });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load completed tasks" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
