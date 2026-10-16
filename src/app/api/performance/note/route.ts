import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, employeeId, noteType, message } = body;

    if (!workspaceSlug || !employeeId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceSlug, employeeId, message" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership authority required" },
        { status: 403 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: ctx.tenantId,
      },
      include: {
        membership: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const typeLabel = noteType === "KUDOS" ? "Commendation" : noteType === "COACHING" ? "Coaching Plan" : "Leadership Note";

    // Create AuditEvent record for the leadership feedback note
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: `PERFORMANCE_${noteType || "NOTE"}_RECORDED`,
        entityType: "EmployeePerformanceDossier",
        entityId: employeeId,
        safeChangeSummary: `${ctx.userFullName} (${ctx.role}) recorded ${typeLabel} for ${employee.membership.user.fullName}: "${message.slice(0, 160)}"`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${typeLabel} recorded in audit trail for ${employee.membership.user.fullName}`,
    });
  } catch (error: any) {
    console.error("POST /api/performance/note error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log leadership note" },
      { status: 500 }
    );
  }
}
