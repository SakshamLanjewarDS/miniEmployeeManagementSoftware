import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { saveCustomFieldValues, getCustomFieldValues } from "@/server/modules/custom-fields/repository";

// POST /api/custom-fields/values?workspaceSlug=...
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { entity = "PROJECT", recordId, values } = body;

    if (!recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }
    if (!values || typeof values !== "object") {
      return NextResponse.json({ error: "values must be an object" }, { status: 400 });
    }

    const updatedValues = await saveCustomFieldValues(ctx, entity.toUpperCase(), recordId, values);
    return NextResponse.json({ success: true, values: updatedValues });
  } catch (error: any) {
    console.error("POST /api/custom-fields/values error:", error);
    return NextResponse.json({ error: error.message || "Failed to save field values" }, { status: 400 });
  }
}

// GET /api/custom-fields/values?workspaceSlug=...&entity=PROJECT&recordId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const entity = (searchParams.get("entity") || "PROJECT").toUpperCase();
    const recordId = searchParams.get("recordId") || undefined;

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const values = await getCustomFieldValues(ctx, entity, recordId);
    return NextResponse.json({ values });
  } catch (error: any) {
    console.error("GET /api/custom-fields/values error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch field values" }, { status: 500 });
  }
}
