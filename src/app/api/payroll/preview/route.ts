import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getMonthlyPayrollPreview } from "@/server/modules/payroll/lifecycle";

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

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Payroll preview requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const now = new Date();
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : now.getFullYear();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : now.getMonth() + 1;

    const preview = await getMonthlyPayrollPreview(ctx, year, month);
    return NextResponse.json({ success: true, ...preview });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load payroll preview" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
