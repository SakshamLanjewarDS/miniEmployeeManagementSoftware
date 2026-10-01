import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { createEmployeeService } from "@/server/modules/employees/service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const employee = await createEmployeeService(ctx, body);

    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    console.error("Employee create error:", err);

    let message = err.message || "Failed to create employee";
    if (err.name === "ZodError" && Array.isArray(err.issues)) {
      message = err.issues.map((i: any) => `${i.message}`).join(", ");
    } else if (err.code === "P2002") {
      message = "An employee with this Employee ID or Email address already exists in this workspace.";
    }

    return NextResponse.json(
      { error: message },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
