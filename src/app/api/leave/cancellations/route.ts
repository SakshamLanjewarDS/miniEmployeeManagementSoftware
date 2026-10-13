import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listLeaveCancellationRequests } from "@/server/modules/leave/cancellation";

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

    const status = searchParams.get("status") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;

    const cancellations = await listLeaveCancellationRequests(ctx, { status, employeeId });

    return NextResponse.json({ success: true, cancellations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list cancellation requests" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
