import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { getOwnerDecisionInbox } from "@/server/modules/inbox/service";

// GET /api/inbox?workspaceSlug=...&tab=...&type=...&urgency=...&q=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";
    const tab = searchParams.get("tab") as any;
    const type = searchParams.get("type") || undefined;
    const urgency = searchParams.get("urgency") || undefined;
    const searchQuery = searchParams.get("q") || undefined;

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const inbox = await getOwnerDecisionInbox(ctx, {
      tab,
      type,
      urgency,
      searchQuery,
    });

    return NextResponse.json(inbox);
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") || error.message?.includes("Only Studio Owners") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to load decision inbox" }, { status });
  }
}
