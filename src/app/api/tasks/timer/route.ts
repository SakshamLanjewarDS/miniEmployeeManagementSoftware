import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, projectId, durationSeconds, notes } = body;

    if (!taskId && !projectId) {
      return NextResponse.json({ error: "Either Task ID or Project ID is required" }, { status: 400 });
    }

    const hours = Number(((durationSeconds || 0) / 3600).toFixed(2));

    // If taskId is provided, update or record comment on task
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, tenantId: ctx.tenantId },
        select: { id: true, title: true, estimatedHours: true },
      });

      if (task) {
        // Record comment on task
        const durationFormatted = `${Math.floor((durationSeconds || 0) / 60)}m ${Math.floor((durationSeconds || 0) % 60)}s`;
        await prisma.taskComment.create({
          data: {
            tenantId: ctx.tenantId,
            taskId: task.id,
            authorId: ctx.membershipId,
            content: `[Focus Timer Logged] ${durationFormatted} of active deep work. Note: ${notes || "Architecture & Detailing session"}`,
          },
        });
      }
    }

    // Persist in tenant timesheet settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as any) || {};
    const timesheets = Array.isArray(settings.timesheets) ? settings.timesheets : [];

    const newEntry = {
      id: `time-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      membershipId: ctx.membershipId,
      taskId: taskId || null,
      projectId: projectId || null,
      durationSeconds: durationSeconds || 0,
      hours,
      notes: notes || "Pomodoro / Focus Timer",
      createdAt: new Date().toISOString(),
    };

    // Keep latest 200 entries
    const updatedTimesheets = [newEntry, ...timesheets].slice(0, 200);

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        settings: {
          ...settings,
          timesheets: updatedTimesheets,
        },
      },
    });

    return NextResponse.json({
      success: true,
      entry: newEntry,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log time" }, { status: 500 });
  }
}
