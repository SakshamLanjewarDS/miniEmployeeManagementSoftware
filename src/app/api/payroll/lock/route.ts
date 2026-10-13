import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { finalizeAndLockPayrollPeriod } from "@/server/modules/payroll/lifecycle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Locking payroll periods requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const year = parseInt(body.year, 10);
    const month = parseInt(body.month, 10);

    if (!year || !month) {
      return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
    }

    const lockedPeriod = await finalizeAndLockPayrollPeriod(ctx, year, month);
    return NextResponse.json({ success: true, period: lockedPeriod });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to finalize and lock payroll period" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
