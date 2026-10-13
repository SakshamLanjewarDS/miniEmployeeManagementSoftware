import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/auth/session";
import { reviewMaterialSample } from "@/server/modules/materials/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { sampleId } = await params;
    const body = await request.json();

    if (!body.decision || !["APPROVED", "CHANGES_REQUESTED", "CLIENT_APPROVED"].includes(body.decision)) {
      return NextResponse.json(
        { error: "Valid decision (APPROVED, CHANGES_REQUESTED, CLIENT_APPROVED) is required" },
        { status: 400 }
      );
    }

    const updated = await reviewMaterialSample(context, {
      sampleId,
      decision: body.decision,
      reviewNotes: body.reviewNotes || "",
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to review material sample" },
      { status }
    );
  }
}
