import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { updateVendor, deleteVendor } from "@/server/modules/vendors/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: "Forbidden: Editing vendor records requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const updated = await updateVendor(ctx, id, body);
    return NextResponse.json({ success: true, vendor: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update vendor record" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: "Forbidden: Deleting vendor records requires Owner or Admin privileges" },
        { status: 403 }
      );
    }

    const tombstoned = await deleteVendor(ctx, id);
    return NextResponse.json({
      success: true,
      message: "Vendor deleted with tombstone protection (will never resurrect on sync)",
      vendor: tombstoned,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete vendor record" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
