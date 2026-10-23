import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getEmployeeLetters,
  generateLetterDraft,
} from "@/server/modules/letters/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");
    const employeeId = searchParams.get("employeeId");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetEmployeeId = employeeId || ctx.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "No employee profile found" }, { status: 400 });
    }

    const letters = await getEmployeeLetters(ctx, targetEmployeeId);
    return NextResponse.json(letters);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Failed to load letters" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { templateType, employeeId, overrides } = body;

    if (!templateType || !employeeId) {
      return NextResponse.json(
        { error: "Missing templateType or employeeId" },
        { status: 400 }
      );
    }

    const draft = await generateLetterDraft(ctx, templateType, employeeId, overrides);
    return NextResponse.json(draft, { status: 201 });
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to generate draft" }, { status });
  }
}
