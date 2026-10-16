import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { isAdminOrOwner } from "@/server/tenancy/context";
import {
  getFormFieldConfigs,
  upsertFormFieldConfig,
  hideFormFieldConfig,
  restoreFormFieldConfig,
} from "@/server/modules/form-fields/repository";

// GET /api/form-fields?workspaceSlug=...&formId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const formId = searchParams.get("formId") || undefined;

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const configs = await getFormFieldConfigs(ctx, formId);
    return NextResponse.json({ configs, isAdmin: isAdminOrOwner(ctx) });
  } catch (error: any) {
    console.error("GET /api/form-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch form field configurations" }, { status: 500 });
  }
}

// POST /api/form-fields?workspaceSlug=... (Admin/Owner only - Update field settings)
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
        { error: "Forbidden: Only Studio Administrators or Owners can customize form fields." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { formId, fieldKey, label, placeholder, helperText, required, isHidden } = body;

    if (!formId || !fieldKey) {
      return NextResponse.json({ error: "formId and fieldKey are required" }, { status: 400 });
    }

    const saved = await upsertFormFieldConfig(ctx, {
      formId: formId.trim(),
      fieldKey: fieldKey.trim(),
      label: label !== undefined ? String(label).trim() : undefined,
      placeholder: placeholder !== undefined ? String(placeholder).trim() : undefined,
      helperText: helperText !== undefined ? String(helperText).trim() : undefined,
      required: required !== undefined ? Boolean(required) : undefined,
      isHidden: isHidden !== undefined ? Boolean(isHidden) : false,
    });

    return NextResponse.json({ success: true, config: saved }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/form-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to update form field" }, { status: 400 });
  }
}

// DELETE /api/form-fields?workspaceSlug=...&formId=...&fieldKey=... (Admin/Owner only - Hide field)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const formId = searchParams.get("formId");
    const fieldKey = searchParams.get("fieldKey");
    const label = searchParams.get("label") || undefined;

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Administrators or Owners can remove form fields." },
        { status: 403 }
      );
    }

    if (!formId || !fieldKey) {
      return NextResponse.json({ error: "formId and fieldKey are required" }, { status: 400 });
    }

    const saved = await hideFormFieldConfig(ctx, formId, fieldKey, label);
    return NextResponse.json({ success: true, config: saved });
  } catch (error: any) {
    console.error("DELETE /api/form-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove form field" }, { status: 400 });
  }
}

// PATCH /api/form-fields?workspaceSlug=... (Admin/Owner only - Restore hidden field)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (!isAdminOrOwner(ctx)) {
      return NextResponse.json(
        { error: "Forbidden: Only Studio Administrators or Owners can restore form fields." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { formId, fieldKey } = body;

    if (!formId || !fieldKey) {
      return NextResponse.json({ error: "formId and fieldKey are required" }, { status: 400 });
    }

    const saved = await restoreFormFieldConfig(ctx, formId, fieldKey);
    return NextResponse.json({ success: true, config: saved });
  } catch (error: any) {
    console.error("PATCH /api/form-fields error:", error);
    return NextResponse.json({ error: error.message || "Failed to restore form field" }, { status: 400 });
  }
}
