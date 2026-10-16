import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, taskId, toMembershipId, reason } = body;

    if (!workspaceSlug || !taskId || !toMembershipId) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceSlug, taskId, toMembershipId" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // Role check: Only OWNER or ADMIN can rebalance workload
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership authority required to rebalance workload" },
        { status: 403 }
      );
    }

    // Verify task exists and belongs to this tenant
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: ctx.tenantId,
      },
      include: {
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify target membership exists and belongs to this tenant
    const targetMember = await prisma.tenantMembership.findFirst({
      where: {
        id: toMembershipId,
        tenantId: ctx.tenantId,
      },
      include: {
        user: true,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Target team member not found" }, { status: 404 });
    }

    const oldAssigneeName = task.assignee?.user.fullName || "Unassigned";
    const newAssigneeName = targetMember.user.fullName;

    // Execute reassignment
    await prisma.$transaction(async (tx) => {
      // 1. Update task assignee
      await tx.task.update({
        where: { id: taskId },
        data: {
          assigneeId: toMembershipId,
          assignedMemberIds: [toMembershipId],
        },
      });

      // 2. Upsert task assignment
      await tx.taskAssignment.upsert({
        where: {
          taskId_membershipId: {
            taskId,
            membershipId: toMembershipId,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          taskId,
          membershipId: toMembershipId,
          isCompleted: false,
        },
        update: {
          isCompleted: false,
        },
      });

      // 3. Log task activity history
      await tx.taskActivityHistory.create({
        data: {
          tenantId: ctx.tenantId,
          taskId,
          actorId: ctx.membershipId,
          action: "WORKLOAD_REBALANCED",
          oldValue: oldAssigneeName,
          newValue: newAssigneeName,
          reason: reason || "Capacity rebalancing via Employee Performance Suite",
        },
      });

      // 4. Log audit event
      await tx.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.membershipId,
          action: "PERFORMANCE_WORKLOAD_REBALANCED",
          entityType: "Task",
          entityId: taskId,
          safeChangeSummary: `${ctx.userFullName} (${ctx.role}) rebalanced "${task.title}" from ${oldAssigneeName} to ${newAssigneeName}: ${reason || "No notes"}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully rebalanced "${task.title}" to ${newAssigneeName}`,
    });
  } catch (error: any) {
    console.error("POST /api/performance/rebalance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to rebalance task" },
      { status: 500 }
    );
  }
}
