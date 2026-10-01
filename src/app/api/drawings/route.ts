import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findDrawings, createDrawing } from "@/server/modules/drawings/repository";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug parameter" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const projectId = searchParams.get("projectId") || undefined;
    const discipline = searchParams.get("discipline") || undefined;
    const search = searchParams.get("search") || undefined;

    const drawings = await findDrawings(ctx, { projectId, discipline, search });
    return NextResponse.json({ drawings });
  } catch (err: any) {
    console.error("GET /api/drawings error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch drawings" }, { status: 500 });
  }
}

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

    const { projectId, taskId, title, drawingNumber, discipline, documentType, issuePurpose, fileId } = body;

    if (!projectId || !title || !discipline || !documentType || !fileId) {
      return NextResponse.json(
        { error: "projectId, title, discipline, documentType, and fileId are required" },
        { status: 400 }
      );
    }

    const result = await createDrawing(ctx, {
      projectId,
      taskId,
      title,
      drawingNumber,
      discipline,
      documentType,
      issuePurpose,
      fileId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("POST /api/drawings error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to create drawing" }, { status });
  }
}
