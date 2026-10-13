import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  activateProject,
  advanceProjectToPlanning,
  holdProject,
  resumeProject,
  evaluateProjectCompletionChecklist,
  getProjectHandoverPackage,
  recordProjectHandoverIssue,
  recordProjectHandoverAcknowledgement,
  completeProject,
  reopenProject,
  cancelProject,
  archiveProject,
  unarchiveProject,
} from "@/server/modules/projects/lifecycle";

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

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const handoverPackage = await getProjectHandoverPackage(ctx, projectId);
    return NextResponse.json({ success: true, handoverPackage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load project handover package" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug") || "";
    const ctx = await getCurrentTenantContext(workspaceSlug);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners and Administrators can execute project lifecycle actions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, ...payload } = body;

    switch (action) {
      case "ACTIVATE": {
        const result = await activateProject(ctx, projectId);
        return NextResponse.json(result);
      }

      case "PLAN": {
        const result = await advanceProjectToPlanning(ctx, projectId);
        return NextResponse.json(result);
      }

      case "HOLD": {
        if (!payload.reason || !payload.reason.trim()) {
          return NextResponse.json(
            { error: "A documented reason is required to place a project on hold." },
            { status: 400 }
          );
        }
        const result = await holdProject(ctx, projectId, {
          reason: payload.reason.trim(),
          reviewTargetDate: payload.reviewTargetDate ? new Date(payload.reviewTargetDate) : undefined,
          responsibleContactId: payload.responsibleContactId || undefined,
        });
        return NextResponse.json(result);
      }

      case "RESUME": {
        if (!payload.resumeReason || !payload.resumeReason.trim()) {
          return NextResponse.json(
            { error: "A documented justification reason is required to resume a project from hold." },
            { status: 400 }
          );
        }
        const result = await resumeProject(ctx, projectId, {
          resumeReason: payload.resumeReason.trim(),
          scheduleAdjustmentDays: payload.scheduleAdjustmentDays ? Number(payload.scheduleAdjustmentDays) : undefined,
        });
        return NextResponse.json(result);
      }

      case "EVALUATE_CHECKLIST": {
        const result = await evaluateProjectCompletionChecklist(ctx, projectId);
        return NextResponse.json(result);
      }

      case "GET_HANDOVER": {
        const result = await getProjectHandoverPackage(ctx, projectId);
        return NextResponse.json({ success: true, handoverPackage: result });
      }

      case "RECORD_HANDOVER_ISSUE": {
        const result = await recordProjectHandoverIssue(ctx, projectId, {
          recipientName: payload.recipientName,
          recipientContact: payload.recipientContact,
          notes: payload.notes,
        });
        return NextResponse.json(result);
      }

      case "RECORD_HANDOVER_ACKNOWLEDGE": {
        const result = await recordProjectHandoverAcknowledgement(ctx, projectId, {
          acknowledgedByName: payload.acknowledgedByName,
          acknowledgementDate: new Date(payload.acknowledgementDate || Date.now()),
          acknowledgementEvidence: payload.acknowledgementEvidence,
          notes: payload.notes,
        });
        return NextResponse.json(result);
      }

      case "COMPLETE": {
        const result = await completeProject(ctx, projectId, {
          permittedExceptions: Array.isArray(payload.permittedExceptions) ? payload.permittedExceptions : undefined,
        });
        return NextResponse.json(result);
      }

      case "REOPEN": {
        if (!payload.reason || !payload.reason.trim()) {
          return NextResponse.json(
            { error: "A documented justification reason is required to reopen a completed project." },
            { status: 400 }
          );
        }
        const result = await reopenProject(ctx, projectId, {
          reason: payload.reason.trim(),
          reopenTaskIds: Array.isArray(payload.reopenTaskIds) ? payload.reopenTaskIds : undefined,
          reopenPhaseIds: Array.isArray(payload.reopenPhaseIds) ? payload.reopenPhaseIds : undefined,
        });
        return NextResponse.json(result);
      }

      case "CANCEL": {
        if (!payload.reason || !payload.reason.trim()) {
          return NextResponse.json(
            { error: "A documented cancellation reason is required." },
            { status: 400 }
          );
        }
        const result = await cancelProject(ctx, projectId, {
          reason: payload.reason.trim(),
          dispositionOfWork: payload.dispositionOfWork || "CANCEL_OPEN_TASKS",
        });
        return NextResponse.json(result);
      }

      case "ARCHIVE": {
        const result = await archiveProject(ctx, projectId);
        return NextResponse.json(result);
      }

      case "UNARCHIVE": {
        const result = await unarchiveProject(ctx, projectId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unsupported lifecycle action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Project lifecycle error:", err);
    return NextResponse.json(
      {
        error: err.message || "Project lifecycle action failed",
        validationErrors: err.validationErrors || undefined,
        violations: err.violations || undefined,
      },
      { status: err.status || 400 }
    );
  }
}
