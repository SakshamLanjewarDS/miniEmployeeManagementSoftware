import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  createEmployeeInvitation,
  revokeEmployeeInvitation,
  previewEmployeeOffboarding,
  executeEmployeeDeactivation,
  reactivateEmployee,
} from "@/server/modules/employees/lifecycle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { action } = body;

    if (action === "INVITE") {
      const { email, role, department, designation, projectIds, suggestedStartDate } = body;
      const invitation = await createEmployeeInvitation(ctx, {
        email,
        role: role || "EMPLOYEE",
        department,
        designation,
        projectIds,
        suggestedStartDate,
      });
      return NextResponse.json({ success: true, invitation }, { status: 201 });
    }

    if (action === "REVOKE_INVITATION") {
      const { invitationId } = body;
      if (!invitationId) return NextResponse.json({ error: "invitationId is required." }, { status: 400 });
      const revoked = await revokeEmployeeInvitation(ctx, invitationId);
      return NextResponse.json({ success: true, invitation: revoked });
    }

    if (action === "PREVIEW_OFFBOARDING") {
      const { membershipId } = body;
      if (!membershipId) return NextResponse.json({ error: "membershipId is required." }, { status: 400 });
      const preview = await previewEmployeeOffboarding(ctx, membershipId);
      return NextResponse.json({ success: true, preview });
    }

    if (action === "DEACTIVATE") {
      const { membershipId, reason, taskReassignmentMapping, handoverNotes } = body;
      if (!membershipId || !reason?.trim()) {
        return NextResponse.json(
          { error: "membershipId and justification reason are required for deactivation." },
          { status: 400 }
        );
      }
      const result = await executeEmployeeDeactivation(ctx, {
        membershipId,
        reason,
        taskReassignmentMapping,
        handoverNotes,
      });
      return NextResponse.json(result);
    }

    if (action === "REACTIVATE") {
      const { membershipId, reason } = body;
      if (!membershipId || !reason?.trim()) {
        return NextResponse.json(
          { error: "membershipId and justification reason are required for reactivation." },
          { status: 400 }
        );
      }
      const reactivated = await reactivateEmployee(ctx, membershipId, reason);
      return NextResponse.json({ success: true, membership: reactivated });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process employee lifecycle action" },
      { status: err.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
