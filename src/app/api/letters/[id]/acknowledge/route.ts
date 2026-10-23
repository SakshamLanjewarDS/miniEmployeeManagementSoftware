import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { acknowledgeLetter } from "@/server/modules/letters/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const acknowledged = await acknowledgeLetter(ctx, id, body?.notes);
    return NextResponse.json(acknowledged);
  } catch (err: any) {
    const status = err.name === "ForbiddenException" ? 403 : 400;
    return NextResponse.json({ error: err.message || "Failed to acknowledge letter" }, { status });
  }
}
