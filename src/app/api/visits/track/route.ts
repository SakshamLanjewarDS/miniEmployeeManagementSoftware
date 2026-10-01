import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { recordSiteVisitLocationPing } from "@/server/modules/visits/service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const {
      visitId,
      latitude,
      longitude,
      accuracyMeters,
      clientCaptureTime,
      note,
    } = body;

    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Valid latitude and longitude required" }, { status: 400 });
    }

    const result = await recordSiteVisitLocationPing(ctx, {
      visitId,
      latitude,
      longitude,
      accuracyMeters: typeof accuracyMeters === "number" ? accuracyMeters : undefined,
      clientCaptureTime: clientCaptureTime ? new Date(clientCaptureTime) : undefined,
      note: typeof note === "string" ? note.trim() : undefined,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Track location error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to log site location ping" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/visits/track" });
}
