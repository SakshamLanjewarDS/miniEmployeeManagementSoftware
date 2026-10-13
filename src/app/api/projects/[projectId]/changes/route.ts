import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  requestProjectScopeChange,
  decideProjectScopeChange,
  applyProjectScopeChange,
  withdrawProjectScopeChange,
} from "@/server/modules/projects/lifecycle";
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

    const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.role === "PROJECT_MANAGER" || ctx.hasFinanceAccess;

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

    // Sanitize financial values for standard employees without finance access
    const sanitized = changeRequests.map((cr) => {
      if (!isPrivileged) {
        return {
          ...cr,
          feeImpactAmount: null, // Hidden from ordinary employees
        };
      }
      return cr;
    });

    return NextResponse.json({ changeRequests: sanitized });
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
    const { action, requestId } = body;

    // Explicit apply action
    if (action === "APPLY") {
      if (!requestId) return NextResponse.json({ error: "requestId is required to apply changes." }, { status: 400 });
      const result = await applyProjectScopeChange(ctx, requestId);
      return NextResponse.json(result);
    }

    const {
      title,
      reason,
      affectedScope,
      scheduleImpactDays,
      feeImpactAmount,
      currency,
      estimatedEffortHours,
      proposedDeliverables,
      supportingFileIds,
      source,
    } = body;

    const changeRequest = await requestProjectScopeChange(ctx, projectId, {
      title,
      reason,
      affectedScope,
      scheduleImpactDays: scheduleImpactDays ? Number(scheduleImpactDays) : undefined,
      feeImpactAmount: feeImpactAmount ? Number(feeImpactAmount) : undefined,
      currency,
      estimatedEffortHours: estimatedEffortHours ? Number(estimatedEffortHours) : undefined,
      proposedDeliverables,
      supportingFileIds,
      source,
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

    const body = await req.json();
    const {
      action,
      requestId,
      reason,
      decision,
      decisionNotes,
      autoApply,
      isClientAccepted,
      confirmationNotes,
      confirmationEvidence,
    } = body;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }

    // Client Confirmation action
    if (action === "CLIENT_CONFIRM") {
      const { recordClientConfirmation } = await import("@/server/modules/projects/lifecycle");
      const confirmed = await recordClientConfirmation(ctx, requestId, {
        isClientAccepted: Boolean(isClientAccepted),
        confirmationNotes,
        confirmationEvidence,
      });
      return NextResponse.json({ success: true, changeRequest: confirmed });
    }

    // Withdrawal action
    if (action === "WITHDRAW") {
      const withdrawn = await withdrawProjectScopeChange(ctx, requestId, {
        reason: reason || decisionNotes || "Withdrawn by requester",
      });
      return NextResponse.json({ success: true, changeRequest: withdrawn });
    }

    // Apply action
    if (action === "APPLY") {
      const applied = await applyProjectScopeChange(ctx, requestId);
      return NextResponse.json(applied);
    }

    // Decision action (Approve / Reject)
    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners and Administrators can approve or reject scope changes." },
        { status: 403 }
      );
    }

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "decision must be APPROVE or REJECT." }, { status: 400 });
    }

    const updated = await decideProjectScopeChange(ctx, requestId, {
      decision,
      decisionNotes,
      autoApply: Boolean(autoApply),
    });

    return NextResponse.json({ success: true, changeRequest: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to decide scope change" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const requestId = req.nextUrl.searchParams.get("requestId") || "";
    const reason = req.nextUrl.searchParams.get("reason") || "Withdrawn by requester";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }

    const withdrawn = await withdrawProjectScopeChange(ctx, requestId, { reason });
    return NextResponse.json({ success: true, changeRequest: withdrawn });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to withdraw scope change" }, { status: 400 });
  }
}
