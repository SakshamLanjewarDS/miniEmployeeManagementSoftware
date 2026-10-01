import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { exportDataToCsv } from "@/server/modules/csv/csv-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const rawType = searchParams.get("type");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug parameter" }, { status: 400 });
    }

    if (!rawType) {
      return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
    }

    const type = rawType.toLowerCase() as "employees" | "contractors" | "consultants" | "clients" | "projects" | "all";
    if (!["employees", "contractors", "consultants", "clients", "projects", "all"].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be employees, contractors, consultants, clients, projects, or all" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { filename, content } = await exportDataToCsv(ctx, type);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("CSV export error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate CSV export" }, { status: 500 });
  }
}
