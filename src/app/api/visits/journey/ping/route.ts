import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { ingestLocationSamples } from "@/server/modules/visits/service";

export async function POST(req: NextRequest) {
  try {
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
    const { visitId, samples, latitude, longitude, accuracyMeters, clientCaptureTime } = body;

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required." }, { status: 400 });
    }

    // Support single ping or batch
    const points = Array.isArray(samples)
      ? samples
      : typeof latitude === "number" && typeof longitude === "number"
      ? [{ latitude, longitude, accuracyMeters, clientCaptureTime }]
      : [];

    if (points.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await ingestLocationSamples(ctx, {
      visitId,
      samples: points,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("POST /api/visits/journey/ping error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record location sample" },
      { status: 400 }
    );
  }
}
