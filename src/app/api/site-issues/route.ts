import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listSiteIssues, createSiteIssue } from "@/server/modules/visits/issues";

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

    const projectId = searchParams.get("projectId") || undefined;
    const responsibleEmployeeId = searchParams.get("responsibleEmployeeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const isOverdue = searchParams.get("isOverdue") === "true";

    const issues = await listSiteIssues(ctx, {
      projectId,
      responsibleEmployeeId,
      status,
      category,
      priority,
      search,
      isOverdue,
    });

    return NextResponse.json({ success: true, issues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const newIssue = await createSiteIssue(ctx, body);
    return NextResponse.json({ success: true, issue: newIssue }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
