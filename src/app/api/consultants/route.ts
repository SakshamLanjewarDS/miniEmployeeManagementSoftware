import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findConsultants, createConsultant } from "@/server/modules/consultants/repository";

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

    const consultants = await findConsultants(ctx, { search, isActive, projectId });
    return NextResponse.json({ consultants });
  } catch (err: any) {
    console.error("GET /api/consultants error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch consultants" }, { status: 500 });
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

    const consultant = await createConsultant(ctx, {
      name: body.name,
      email: body.email,
      contact: body.contact,
      firmName: body.firmName,
      firmAddress: body.firmAddress,
      discipline: body.discipline,
      notes: body.notes,
      projectIds: body.projectIds,
    });

    return NextResponse.json({ success: true, consultant });
  } catch (err: any) {
    console.error("POST /api/consultants error:", err);
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to create consultant" }, { status });
  }
}
