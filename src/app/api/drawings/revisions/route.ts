import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { uploadNewRevision } from "@/server/modules/drawings/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const workspaceSlug = searchParams.get("workspaceSlug") || body.workspaceSlug;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug parameter" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { documentId, fileId, issuePurpose } = body;
    if (!documentId || !fileId) {
      return NextResponse.json({ error: "documentId and fileId are required" }, { status: 400 });
    }

    const newVersion = await uploadNewRevision(ctx, {
      documentId,
      fileId,
      issuePurpose,
    });

    return NextResponse.json({ success: true, version: newVersion });
  } catch (err: any) {
    console.error("POST /api/drawings/revisions error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to upload revision" }, { status });
  }
}
