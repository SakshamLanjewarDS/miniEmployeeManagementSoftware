import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listVendorsForAdmin, createVendor } from "@/server/modules/vendors/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Vendor CRM requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const industryType = searchParams.get("industryType") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 30;

    const result = await listVendorsForAdmin(ctx, {
      industryType,
      status,
      search,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list vendors" },
      { status: err.name === "ForbiddenException" ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Creating vendor records requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const newVendor = await createVendor(ctx, {
      name: body.name,
      companyName: body.companyName,
      designation: body.designation,
      industryType: body.industryType,
      phoneNumber: body.phoneNumber,
      email: body.email,
      websiteUrl: body.websiteUrl,
      status: body.status,
      purposeOfVisit: body.purposeOfVisit,
      notes: body.notes,
      followupDate: body.followupDate,
      rating: body.rating,
    });

    return NextResponse.json({ success: true, vendor: newVendor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create vendor record" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
