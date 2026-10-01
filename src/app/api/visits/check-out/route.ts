import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { executeSiteCheckOut } from "@/server/modules/visits/service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { visitId, latitude, longitude, accuracyMeters, idempotencyKey, findings, nextActions } = body;

    const result = await executeSiteCheckOut(ctx, {
      visitId,
      latitude: typeof latitude === "number" ? latitude : undefined,
      longitude: typeof longitude === "number" ? longitude : undefined,
      accuracyMeters: typeof accuracyMeters === "number" ? accuracyMeters : undefined,
      idempotencyKey: idempotencyKey || `chkout-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      findings,
      nextActions,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Check-out error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute site check-out" },
      { status: 400 }
    );
  }
}
