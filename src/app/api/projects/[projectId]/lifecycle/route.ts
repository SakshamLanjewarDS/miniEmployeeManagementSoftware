import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  activateProject,
  holdProject,
  resumeProject,
  evaluateProjectCompletionChecklist,
  completeProject,
  reopenProject,
  cancelProject,
  archiveProject,
} from "@/server/modules/projects/lifecycle";

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
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

      case "HOLD": {
        if (!payload.reason || !payload.reason.trim()) {
          return NextResponse.json(
            { error: "A documented reason is required to place a project on hold." },
            { status: 400 }
          );
        }
        const result = await holdProject(ctx, projectId, { reason: payload.reason.trim() });
        return NextResponse.json(result);
      }

      case "RESUME": {
        const result = await resumeProject(ctx, projectId, {
          resumeReason: payload.resumeReason?.trim() || undefined,
          scheduleAdjustmentDays: payload.scheduleAdjustmentDays ? Number(payload.scheduleAdjustmentDays) : undefined,
        });
        return NextResponse.json(result);
      }

      case "EVALUATE_CHECKLIST": {
        const result = await evaluateProjectCompletionChecklist(ctx, projectId);
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
