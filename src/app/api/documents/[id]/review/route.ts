import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reviewEmployeeDocument } from "@/server/modules/documents/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    const body = await req.json();
    const { decision, remarks } = body;

    if (!["VERIFIED", "REJECTED", "REPLACEMENT_REQUESTED"].includes(decision)) {
      return NextResponse.json({ error: "Invalid review decision" }, { status: 400 });
    }

    const updated = await reviewEmployeeDocument(ctx, id, decision, remarks);
    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Review submission failed" }, { status });
  }
}
