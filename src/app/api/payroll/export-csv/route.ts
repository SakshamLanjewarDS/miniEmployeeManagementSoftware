import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getMonthlyPayrollPreview, generateBankPayoutCSV } from "@/server/modules/payroll/lifecycle";

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
        { error: "Forbidden: Exporting payroll requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const now = new Date();
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : now.getFullYear();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : now.getMonth() + 1;

    const preview = await getMonthlyPayrollPreview(ctx, year, month);
    const csvContent = generateBankPayoutCSV(preview);

    const fileName = `Bank_Payout_${preview.periodKey}_${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate bank payout CSV" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
