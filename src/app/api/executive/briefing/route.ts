import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getMorningExecutiveBriefing } from "@/server/modules/executive/briefing";

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
        { error: "Forbidden: Morning executive briefing is restricted to Owner/Admin" },
        { status: 403 }
      );
    }

    const briefing = await getMorningExecutiveBriefing(ctx);
    return NextResponse.json({ success: true, ...briefing });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate morning briefing" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}
