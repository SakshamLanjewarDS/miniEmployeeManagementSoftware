import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getLetterTemplates } from "@/server/modules/letters/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await getLetterTemplates(ctx);
    return NextResponse.json(templates);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to load letter templates" }, { status });
  }
}
