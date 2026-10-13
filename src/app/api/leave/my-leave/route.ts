import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getEmployeeMyLeaveSummary } from "@/server/modules/leave/service";

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

    // Resolved session-derived employee filter inside getEmployeeMyLeaveSummary

    const now = new Date();
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : now.getFullYear();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : now.getMonth() + 1;

    // Guaranteed session-derived employee filter! Never trusts client-supplied employeeId!
    const result = await getEmployeeMyLeaveSummary(ctx, year, month);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load employee leave records" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
