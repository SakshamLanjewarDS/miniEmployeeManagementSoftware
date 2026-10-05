import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateTask } from "@/server/modules/tasks/repository";
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
    const {
      taskId,
      projectId,
      phaseId,
      title,
      description,
      priority,
      dueDate,
      estimatedHours,
      assigneeId,
      assigneeIds,
      checklist,
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    const updated = await updateTask(ctx, taskId, {
      projectId: projectId || undefined,
      phaseId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
      estimatedHours: estimatedHours !== undefined ? (estimatedHours ? Number(estimatedHours) : null) : undefined,
      assigneeId,
      assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : undefined,
    });

    // If checklist array is provided, synchronize checklist items
    if (Array.isArray(checklist)) {
      const existingItems = await prisma.taskChecklistItem.findMany({
        where: { taskId, tenantId: ctx.tenantId },
      });

      await prisma.taskChecklistItem.deleteMany({
        where: { taskId, tenantId: ctx.tenantId },
      });

      const itemsToCreate = checklist
        .map((text: string) => (typeof text === "string" ? text.trim() : ""))
        .filter((text: string) => text.length > 0)
        .map((text: string, idx: number) => {
          const matched = existingItems.find(
            (e) => e.title.trim().toLowerCase() === text.toLowerCase()
          );
          return {
            tenantId: ctx.tenantId,
            taskId,
            title: text,
            sortOrder: idx + 1,
            isCompleted: matched ? matched.isCompleted : false,
          };
        });

      if (itemsToCreate.length > 0) {
        await prisma.taskChecklistItem.createMany({
          data: itemsToCreate,
        });
      }
    }

    // Fetch refreshed task with relations for client state
    const refreshedTask = await prisma.task.findFirst({
      where: { id: taskId, tenantId: ctx.tenantId },
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
        phase: {
          select: { id: true, phaseName: true },
        },
        assignee: {
          include: {
            user: { select: { fullName: true, email: true } },
            employee: { select: { employeeId: true, designation: true } },
          },
        },
        creator: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        checklistItems: {
          orderBy: { sortOrder: "asc" },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({ success: true, task: refreshedTask || updated });
  } catch (err: any) {
    console.error("Task update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
