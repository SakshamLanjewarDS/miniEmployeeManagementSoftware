import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { createProjectMilestone, achieveProjectMilestone } from "@/server/modules/projects/lifecycle";
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

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      include: {
        phase: { select: { id: true, phaseName: true } },
      },
      orderBy: { targetDate: "asc" },
    });

    return NextResponse.json({ milestones });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch delivery milestones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Only Owners and Admins can create delivery milestones." }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, targetDate, phaseId, isClientSignoffRequired } = body;

    const milestone = await createProjectMilestone(ctx, {
      projectId,
      phaseId: phaseId || undefined,
      title,
      description,
      targetDate: new Date(targetDate),
      isClientSignoffRequired: Boolean(isClientSignoffRequired),
    });

    return NextResponse.json({ success: true, milestone }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create milestone" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Only Owners and Admins can update delivery milestones." }, { status: 403 });
    }

    const body = await req.json();
    const { milestoneId, action, clientApprovedBy, clientApprovalNotes } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId is required." }, { status: 400 });
    }

    if (action === "ACHIEVE") {
      const updated = await achieveProjectMilestone(ctx, milestoneId, {
        isClientSignoff: Boolean(body.isClientSignoff),
      });
      return NextResponse.json({ success: true, milestone: updated });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update milestone" }, { status: 400 });
  }
}
