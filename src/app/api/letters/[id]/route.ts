import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateLetterDraft, issueLetter } from "@/server/modules/letters/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH: Edit letter draft content.
 * Invalidates prior approval if modified before issuance.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const { bodyContent, title } = body;

    if (!bodyContent) {
      return NextResponse.json({ error: "Missing bodyContent" }, { status: 400 });
    }

    const updated = await updateLetterDraft(ctx, id, bodyContent, title);
    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update draft" }, { status });
  }
}

/**
 * POST: Issue the letter.
 * Concurrency-safe sequential reference allocation, PDF rendering, snapshot freezing.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issued = await issueLetter(ctx, id);
    return NextResponse.json(issued);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to issue letter" }, { status });
  }
}
