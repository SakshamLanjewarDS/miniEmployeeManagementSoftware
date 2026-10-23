import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getEmployeeLetters,
  generateLetterDraft,
  generateHiringLetterPreview,
  issueHiringLetter,
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

    // If an owner visits without an employee profile, return empty list cleanly
    const targetEmployeeId = employeeId || ctx.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json([]);
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
    const action = body.action;

    // Action 1: Instant Test Letter Preview
    if (action === "PREVIEW_HIRING") {
      const preview = await generateHiringLetterPreview(ctx, body);
      return NextResponse.json(preview);
    }

    // Action 2: Formal Hiring Letter Issuance
    if (action === "ISSUE_HIRING") {
      const result = await issueHiringLetter(ctx, body);
      return NextResponse.json(result, { status: 201 });
    }

    // Action 3: Legacy Draft Generation
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
    return NextResponse.json({ error: err.message || "Failed to process letter action" }, { status });
  }
}

