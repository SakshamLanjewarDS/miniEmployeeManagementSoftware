import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { completeProjectPhaseWithValidation } from "@/server/modules/projects/lifecycle";
import { prisma } from "@/server/db/prisma";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const phases = await prisma.projectPhase.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      include: {
        tasks: {
          select: { id: true, title: true, status: true },
        },
        milestones: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ phases });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load project phases" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Only Owners and Admins can complete architectural phases." }, { status: 403 });
    }

    const body = await req.json();
    const { phaseId, action, exceptionReason } = body;

    if (!phaseId) {
      return NextResponse.json({ error: "phaseId is required." }, { status: 400 });
    }

    if (action === "COMPLETE") {
      const completed = await completeProjectPhaseWithValidation(ctx, phaseId, {
        exceptionReason: exceptionReason?.trim() || undefined,
      });
      return NextResponse.json({ success: true, phase: completed });
    }

    return NextResponse.json({ error: `Unsupported phase action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to complete phase",
        unapprovedDeliverables: err.unapprovedDeliverables || undefined,
        pendingMilestones: err.pendingMilestones || undefined,
      },
      { status: 400 }
    );
  }
}
