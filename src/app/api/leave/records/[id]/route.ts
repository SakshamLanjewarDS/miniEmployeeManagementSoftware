import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { deleteLeaveRequest } from "@/server/modules/leave/service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to delete leave records" },
        { status: 403 }
      );
    }

    const deleted = await deleteLeaveRequest(ctx, id);

    // Outbound push is handled automatically by deleteLeaveRequest service
    return NextResponse.json({ success: true, message: "Leave record soft-deleted with tombstone protection" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete leave record" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { updatePendingLeaveRequest } = await import("@/server/modules/leave/service");
    const updated = await updatePendingLeaveRequest(ctx, id, {
      startDate: body.startDate,
      endDate: body.endDate,
      leaveType: body.leaveType,
      reason: body.reason,
      isHalfDay: body.isHalfDay,
      isHourly: body.isHourly,
      sessionType: body.sessionType,
      startMinutes: body.startMinutes,
      endMinutes: body.endMinutes,
      totalMinutes: body.totalMinutes,
      days: body.days,
      isPaidEligible: body.isPaidEligible,
      isExemptShortNotice: body.isExemptShortNotice,
      exemptionReason: body.exemptionReason,
      supportingFileId: body.supportingFileId,
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update pending leave request" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
