import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listEmployeesService } from "@/server/modules/employees/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug =
      searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json(
        { error: "Missing workspaceSlug" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json(
        { error: "Unauthorized session" },
        { status: 401 }
      );
    }

    const employees = await listEmployeesService(ctx);

    return NextResponse.json({
      success: true,
      employees,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list team members" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
