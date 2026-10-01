import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { removeEmployeeService } from "@/server/modules/employees/service";

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

    const membershipId = body.membershipId;
    if (!membershipId) {
      return NextResponse.json({ error: "Missing membershipId" }, { status: 400 });
    }

    const result = await removeEmployeeService(ctx, membershipId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Employee remove error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove employee" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
