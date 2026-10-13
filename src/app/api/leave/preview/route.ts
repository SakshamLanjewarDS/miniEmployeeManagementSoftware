import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { previewLeaveApplication } from "@/server/modules/leave/service";

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

    const preview = await previewLeaveApplication(ctx, {
      employeeId: body.employeeId,
      startDate: body.startDate,
      endDate: body.endDate,
      leaveType: body.leaveType || "CASUAL",
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
    });

    return NextResponse.json({ success: true, preview });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to preview leave application" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
