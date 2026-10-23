import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { resolveGoogleMapsLocation } from "@/server/modules/visits/location-resolver";

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
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Maps URL or coordinates string required." }, { status: 400 });
    }

    const resolved = await resolveGoogleMapsLocation(url);
    return NextResponse.json({ success: true, ...resolved });
  } catch (error: any) {
    console.error("POST /api/visits/resolve-location error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to resolve location from provided link" },
      { status: 400 }
    );
  }
}
