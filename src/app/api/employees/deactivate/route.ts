import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { deactivateEmployeeService } from "@/server/modules/employees/service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { membershipId } = body;

    const result = await deactivateEmployeeService(ctx, membershipId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Employee deactivate error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to deactivate member" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
