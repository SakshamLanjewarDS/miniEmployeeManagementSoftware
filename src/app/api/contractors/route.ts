import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findContractors, createContractor } from "@/server/modules/contractors/repository";

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

    const search = searchParams.get("search") || undefined;
    const activeParam = searchParams.get("isActive");
    const isActive = activeParam !== null ? activeParam === "true" : undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const contractors = await findContractors(ctx, { search, isActive, projectId });
    return NextResponse.json({ contractors });
  } catch (err: any) {
    console.error("GET /api/contractors error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch contractors" }, { status: 500 });
  }
}

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

    const contractor = await createContractor(ctx, {
      name: body.name,
      contact: body.contact,
      email: body.email,
      firmName: body.firmName,
      trade: body.trade,
      address: body.address,
      projectIds: body.projectIds,
    });

    return NextResponse.json({ success: true, contractor });
  } catch (err: any) {
    console.error("POST /api/contractors error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to create contractor" }, { status });
  }
}
