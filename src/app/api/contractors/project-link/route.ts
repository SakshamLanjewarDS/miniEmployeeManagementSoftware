import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  associateContractorProject,
  disassociateContractorProject,
} from "@/server/modules/contractors/repository";

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

    const { action, contractorId, projectId, scope } = body;
    if (!contractorId || !projectId) {
      return NextResponse.json({ error: "contractorId and projectId are required" }, { status: 400 });
    }

    if (action === "remove") {
      const result = await disassociateContractorProject(ctx, contractorId, projectId);
      return NextResponse.json({ success: true, result });
    } else {
      const link = await associateContractorProject(ctx, contractorId, projectId, scope);
      return NextResponse.json({ success: true, link });
    }
  } catch (err: any) {
    console.error("POST /api/contractors/project-link error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to update contractor project association" }, { status });
  }
}
