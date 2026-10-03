import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  getCustomFieldDefinitions,
  upsertCustomFieldDefinition,
  deleteCustomFieldDefinition,
  saveCustomFieldDefinitions,
  getCustomFieldValues,
} from "@/server/modules/custom-fields/repository";

// GET /api/custom-fields?workspaceSlug=...&entity=PROJECT
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const entity = (searchParams.get("entity") || "PROJECT").toUpperCase();

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const [fields, values] = await Promise.all([
      getCustomFieldDefinitions(ctx, entity),
      getCustomFieldValues(ctx, entity),
    ]);

    return NextResponse.json({ fields, values });
  } catch (error: any) {
    console.error("GET /api/custom-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch custom fields" }, { status: 500 });
  }
}

// POST /api/custom-fields?workspaceSlug=... (Add or Update field definition - Admin/Owner only)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can configure form fields." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, entity = "PROJECT", key, label, type, placeholder, options, required, showOnCard, showInFilters, category, sortOrder } = body;

    if (!label || !label.trim()) {
      return NextResponse.json({ error: "Field label is required" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: "Field type is required" }, { status: 400 });
    }

    // Generate safe key if not supplied
    const sanitizedKey = (key || label)
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_: string, chr: string) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, "");

    const savedField = await upsertCustomFieldDefinition(ctx, entity.toUpperCase(), {
      id,
      entity: entity.toUpperCase(),
      key: sanitizedKey,
      label: label.trim(),
      type,
      placeholder: placeholder?.trim() || undefined,
      options: Array.isArray(options) ? options.map((o: any) => String(o).trim()).filter(Boolean) : undefined,
      required: Boolean(required),
      showOnCard: showOnCard !== undefined ? Boolean(showOnCard) : true,
      showInFilters: showInFilters !== undefined ? Boolean(showInFilters) : true,
      category: category?.trim() || undefined,
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });

    return NextResponse.json({ success: true, field: savedField }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/custom-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to save custom field" }, { status: 400 });
  }
}

// DELETE /api/custom-fields?workspaceSlug=...&fieldId=...&entity=PROJECT (Admin/Owner only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const fieldId = searchParams.get("fieldId");
    const entity = (searchParams.get("entity") || "PROJECT").toUpperCase();

    if (!fieldId) {
      return NextResponse.json({ error: "fieldId query parameter is required" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can delete form fields." },
        { status: 403 }
      );
    }

    await deleteCustomFieldDefinition(ctx, entity, fieldId);
    return NextResponse.json({ success: true, message: "Field definition deleted" });
  } catch (error: any) {
    console.error("DELETE /api/custom-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete custom field" }, { status: 400 });
  }
}

// PUT /api/custom-fields?workspaceSlug=... (Batch save / reorder fields)
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Owners or Administrators can reorder form fields." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { entity = "PROJECT", fields } = body;

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: "fields must be an array" }, { status: 400 });
    }

    const updated = await saveCustomFieldDefinitions(ctx, entity.toUpperCase(), fields);
    return NextResponse.json({ success: true, fields: updated });
  } catch (error: any) {
    console.error("PUT /api/custom-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to update custom fields order" }, { status: 400 });
  }
}
