import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/auth/session";
import { compareDrawingRevisions } from "@/server/modules/drawings/comparison";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ drawingId: string }> }
) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { drawingId } = await params;
    const { searchParams } = new URL(request.url);
    const revAId = searchParams.get("revA");
    const revBId = searchParams.get("revB");

    if (!revAId || !revBId) {
      return NextResponse.json(
        { error: "Both revA and revB revision IDs are required for comparison" },
        { status: 400 }
      );
    }

    const comparison = await compareDrawingRevisions(context, drawingId, revAId, revBId);
    return NextResponse.json(comparison);
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to compare revisions" },
      { status }
    );
  }
}
