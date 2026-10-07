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
      checklistItems,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project selection is required." }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Architectural Brief & Instructions are required." }, { status: 400 });
    }

    // Format checklist items if given as structured items or simple strings
    let formattedChecklistItems: any[] | undefined = undefined;
    if (Array.isArray(checklistItems) && checklistItems.length > 0) {
      formattedChecklistItems = checklistItems;
    } else if (Array.isArray(checklist) && checklist.length > 0) {
      formattedChecklistItems = checklist
        .map((itemText: string) => (typeof itemText === "string" ? itemText.trim() : ""))
        .filter((text: string) => text.length > 0)
        .map((text: string, idx: number) => ({
          title: text,
          assignedMemberId: (Array.isArray(assigneeIds) && assigneeIds[0]) || assigneeId || ctx.membershipId,
          priority: priority || "MEDIUM",
          dueDate: dueDate ? new Date(dueDate) : undefined,
          sortOrder: idx + 1,
        }));
    }

    // Create deliverable with structured checklist items atomically
    const task = await createTask(ctx, {
      projectId,
      phaseId: phaseId || undefined,
      title: title ? title.trim() : undefined,
      description: description.trim(),
      assigneeId: assigneeId || undefined,
      assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : undefined,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      checklistItems: formattedChecklistItems,
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error("Task creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create deliverable" },
      { status: 400 }
    );
  }
}
