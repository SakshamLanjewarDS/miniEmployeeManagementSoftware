import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ultra-lightweight health & keep-alive ping endpoint.
 * Responds in < 1ms to prevent Render.com free instances from spinning down (sleeping).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      app: "100% DESIGN Studio OS",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
