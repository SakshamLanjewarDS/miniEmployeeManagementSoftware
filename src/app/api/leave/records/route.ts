import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listLeaveRecords, createLeaveRequest } from "@/server/modules/leave/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug parameter" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to view all studio leave records" },
        { status: 403 }
      );
    }

    const status = searchParams.get("status") || undefined;
    const leaveType = searchParams.get("leaveType") || undefined;
    const department = searchParams.get("department") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDateFrom = searchParams.get("startDateFrom") || undefined;
    const startDateTo = searchParams.get("startDateTo") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 200;

    const result = await listLeaveRecords(ctx, {
      status,
      leaveType,
      department,
      employeeId,
      search,
      startDateFrom,
      startDateTo,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list leave records" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}

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

    // Any active tenant member (Owner, Admin, Employee) can submit a leave application.
    // If Employee, target employee is strictly derived from session inside createLeaveRequest.

    const newRecord = await createLeaveRequest(ctx, {
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
      supportingFileId: body.supportingFileId,
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create leave request" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
