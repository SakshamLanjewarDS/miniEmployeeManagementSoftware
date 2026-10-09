import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import { requestProjectScopeChange, decideProjectScopeChange } from "@/server/modules/projects/lifecycle";
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

    const changeRequests = await prisma.projectChangeRequest.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      include: {
        requester: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        decidedBy: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ changeRequests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load change requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    const body = await req.json();
    const { title, reason, affectedScope, scheduleImpactDays, feeImpactAmount } = body;

    const changeRequest = await requestProjectScopeChange(ctx, projectId, {
      title,
      reason,
      affectedScope,
      scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : undefined,
      feeImpactAmount: feeImpactAmount ? Number(feeImpactAmount) : undefined,
    });

    return NextResponse.json({ success: true, changeRequest }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to request scope change" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners and Administrators can approve or reject scope changes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { requestId, decision, decisionNotes } = body;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "decision must be APPROVE or REJECT." }, { status: 400 });
    }

    const updated = await decideProjectScopeChange(ctx, requestId, {
      decision,
      decisionNotes,
    });

    return NextResponse.json({ success: true, changeRequest: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to decide scope change" }, { status: 400 });
  }
}
