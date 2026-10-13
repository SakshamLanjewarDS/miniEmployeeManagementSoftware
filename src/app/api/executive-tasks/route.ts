import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  listExecutiveTasks,
  createExecutiveTask,
  getExecutiveTaskKPIMetrics,
} from "@/server/modules/executive/tasks";

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
        { error: "Forbidden: Executive tasks require Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const category = searchParams.get("category") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const assigneeMembershipId = searchParams.get("assigneeMembershipId") || undefined;
    const search = searchParams.get("search") || undefined;

    const [tasks, kpis] = await Promise.all([
      listExecutiveTasks(ctx, {
        status,
        priority,
        category,
        projectId,
        assigneeMembershipId,
        search,
      }),
      getExecutiveTaskKPIMetrics(ctx),
    ]);

    return NextResponse.json({ success: true, tasks, kpis });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list executive tasks" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
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

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Creating executive deliverables requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const newTask = await createExecutiveTask(ctx, {
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      category: body.category,
      priority: body.priority,
      status: body.status,
      startDate: body.startDate,
      dueDate: body.dueDate,
      dueTime: body.dueTime,
      assigneeMembershipIds: body.assigneeMembershipIds || [ctx.membershipId],
    });

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create executive task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
