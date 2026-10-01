import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateEmployeeService } from "@/server/modules/employees/service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const employee = await updateEmployeeService(ctx, body);
    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    console.error("Employee update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update employee" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
