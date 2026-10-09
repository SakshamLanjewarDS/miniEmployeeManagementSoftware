import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { removeProjectMemberSafeguard } from "@/server/modules/projects/lifecycle";
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

    const members = await prisma.projectMember.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      include: {
        membership: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            employee: { select: { designation: true, department: true } },
          },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Only Owners and Admins can assign project members." }, { status: 403 });
    }

    const body = await req.json();
    const { membershipId, projectRole } = body;
    if (!membershipId) {
      return NextResponse.json({ error: "membershipId is required." }, { status: 400 });
    }

    // Verify member belongs to this tenant
    const membership = await prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: ctx.tenantId, isActive: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Team member not found or is inactive in this workspace." }, { status: 400 });
    }

    const created = await prisma.projectMember.create({
      data: {
        tenantId: ctx.tenantId,
        projectId,
        membershipId,
        projectRole: projectRole?.trim() || "Project Team Member",
      },
      include: {
        membership: {
          include: { user: true, employee: true },
        },
      },
    });

    return NextResponse.json({ success: true, member: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add project member" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json({ error: "Only Owners and Admins can remove project members." }, { status: 403 });
    }

    const body = await req.json();
    const { membershipId, reassignToMembershipId } = body;

    if (!membershipId) {
      return NextResponse.json({ error: "membershipId is required." }, { status: 400 });
    }

    const result = await removeProjectMemberSafeguard(
      ctx,
      projectId,
      membershipId,
      reassignToMembershipId || undefined
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to remove member",
        hasResponsibilities: err.hasResponsibilities || false,
        openTasks: err.openTasks || undefined,
        pendingReviews: err.pendingReviews || undefined,
      },
      { status: err.hasResponsibilities ? 409 : 400 }
    );
  }
}
