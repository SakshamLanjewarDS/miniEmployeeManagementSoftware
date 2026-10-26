import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext, resolveSessionAndTenant, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { getEmployeeDashboardData, clearDashboardCache } from "@/server/modules/dashboard/service";
import { prisma } from "@/server/db/prisma";

async function resolveContext(req: NextRequest, workspaceSlug: string) {
  let ctx = await getCurrentTenantContext(workspaceSlug).catch(() => null);
  if (ctx) return ctx;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const token = authHeader || cookieVal;
  if (token) {
    return await resolveSessionAndTenant(token, workspaceSlug).catch(() => null);
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await resolveContext(req, workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const data = await getEmployeeDashboardData(ctx);
    return NextResponse.json({
      success: true,
      reopenedTasks: data.reopenedTasks || [],
      count: data.reopenedTasks?.length || 0,
    });
  } catch (err: any) {
    console.error("GET /api/employee/reopened-tasks error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load reopened tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const workspaceSlug = body.workspaceSlug || searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await resolveContext(req, workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { taskId, acknowledgeAll } = body;
    const now = new Date();

    if (acknowledgeAll) {
      // Find all reopened tasks assigned to this employee in this workspace
      const reopenedTasks = await prisma.task.findMany({
        where: {
          tenantId: ctx.tenantId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          OR: [
            { assigneeId: ctx.membershipId },
            { assignments: { some: { membershipId: ctx.membershipId } } },
            { checklistItems: { some: { assignedMemberId: ctx.membershipId } } },
          ],
          activityHistory: {
            some: { action: "TASK_REOPENED" },
          },
        },
        select: { id: true, title: true, reopenCount: true, version: true },
      });

      for (const t of reopenedTasks) {
        await prisma.taskAssignment.upsert({
          where: {
            taskId_membershipId: {
              taskId: t.id,
              membershipId: ctx.membershipId,
            },
          },
          update: {
            acknowledgedAt: now,
            acknowledgedVersion: t.version || 1,
          },
          create: {
            tenantId: ctx.tenantId,
            taskId: t.id,
            membershipId: ctx.membershipId,
            acknowledgedAt: now,
            acknowledgedVersion: t.version || 1,
          },
        });
      }

      try {
        await prisma.auditEvent.create({
          data: {
            tenantId: ctx.tenantId,
            actorId: ctx.userId,
            action: "TASK_REOPEN_ACKNOWLEDGED_ALL",
            entityType: "TenantMembership",
            entityId: ctx.membershipId,
            safeChangeSummary: `Employee ${ctx.userFullName} acknowledged ${reopenedTasks.length} reopened task alerts.`,
          },
        });
      } catch (_) {}

      clearDashboardCache(ctx.tenantId);

      return NextResponse.json({
        success: true,
        acknowledgedCount: reopenedTasks.length,
        acknowledgedAt: now.toISOString(),
      });
    }

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId in request body" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId: ctx.tenantId },
      include: {
        assignments: { where: { membershipId: ctx.membershipId } },
        checklistItems: { where: { assignedMemberId: ctx.membershipId }, select: { id: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found in this studio workspace" }, { status: 404 });
    }

    // Stale / Invalid state check
    if (task.status === "COMPLETED" || task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Stale request: Task is already completed or cancelled" },
        { status: 400 }
      );
    }

    // Assignment Authorization Check
    const isAssigned =
      task.assigneeId === ctx.membershipId ||
      task.assignments.length > 0 ||
      task.checklistItems.length > 0;

    if (!isAssigned) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to this deliverable" },
        { status: 403 }
      );
    }

    // acknowledgedVersion strictly tracks deliverable instruction version (task.version)
    const taskVersion = task.version || 1;

    await prisma.taskAssignment.upsert({
      where: {
        taskId_membershipId: {
          taskId: task.id,
          membershipId: ctx.membershipId,
        },
      },
      update: {
        acknowledgedAt: now,
        acknowledgedVersion: taskVersion,
      },
      create: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        membershipId: ctx.membershipId,
        acknowledgedAt: now,
        acknowledgedVersion: taskVersion,
      },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.userId,
          action: "TASK_REOPEN_ACKNOWLEDGED",
          entityType: "Task",
          entityId: task.id,
          safeChangeSummary: `Employee ${ctx.userFullName} acknowledged reopened task "${task.title}" (instruction v${taskVersion}, reopen cycle ${task.reopenCount || 1})`,
        },
      });
    } catch (_) {}

    clearDashboardCache(ctx.tenantId);

    return NextResponse.json({
      success: true,
      taskId: task.id,
      acknowledgedAt: now.toISOString(),
      acknowledgedVersion: taskVersion,
      reopenCount: task.reopenCount || 1,
    });
  } catch (err: any) {
    console.error("POST /api/employee/reopened-tasks error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to persist reopened task acknowledgment" },
      { status: 500 }
    );
  }
}

