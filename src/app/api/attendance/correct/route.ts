import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { correctAttendancePunch } from "@/server/modules/attendance/service";

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

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Attendance corrections require leadership privileges" },
        { status: 403 }
      );
    }

    const updated = await correctAttendancePunch(ctx, {
      recordId: body.recordId,
      punchIn: body.punchIn,
      punchOut: body.punchOut,
      status: body.status,
      correctionReason: body.correctionReason,
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to correct attendance punch" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
