import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { createTask } from "@/server/modules/tasks/repository";
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
      projectId,
      phaseId,
      title,
      description,
      assigneeId,
      assigneeIds,
      priority,
      dueDate,
      startDate,
      estimatedHours,
      checklist,
    } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: "Project and Task Title are required." }, { status: 400 });
    }

    // Create task
    const task = await createTask(ctx, {
      projectId,
      phaseId: phaseId || undefined,
      title,
      description,
      assigneeId: assigneeId || undefined,
      assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : undefined,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
    });

    // If checklist items provided, create them
    if (Array.isArray(checklist) && checklist.length > 0) {
      const itemsToCreate = checklist
        .map((itemText: string, idx: number) => itemText.trim())
        .filter((text: string) => text.length > 0)
        .map((text: string, idx: number) => ({
          tenantId: ctx.tenantId,
          taskId: task.id,
          title: text,
          sortOrder: idx + 1,
          isCompleted: false,
        }));

      if (itemsToCreate.length > 0) {
        await prisma.taskChecklistItem.createMany({
          data: itemsToCreate,
        });
      }
    }

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: task.projectId,
        action: "TASK_CREATED",
        entityType: "Task",
        entityId: task.id,
        safeChangeSummary: `Created task "${task.title}" with priority ${task.priority}${assigneeId ? ` assigned to membership ${assigneeId}` : ""}`,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error("Task creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create task" },
      { status: 400 }
    );
  }
}
