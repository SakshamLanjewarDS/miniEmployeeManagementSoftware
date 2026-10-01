import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { resetPasswordService } from "@/server/modules/employees/service";

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

    const result = await resetPasswordService(ctx, body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Employee password reset error:", err);

    let message = err.message || "Failed to reset password";
    if (err.name === "ZodError" && Array.isArray(err.issues)) {
      message = err.issues.map((i: any) => `${i.message}`).join(", ");
    }

    return NextResponse.json(
      { error: message },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
