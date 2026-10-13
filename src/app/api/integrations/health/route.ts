import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  getIntegrationHealthOverview,
  triggerManualConnectorSync,
  retryFailedOutboxItems,
  toggleConnectorSchedule,
} from "@/server/modules/integrations/health";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug =
      searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const overview = await getIntegrationHealthOverview(ctx);
    return NextResponse.json(overview);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load integration health" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { action } = body;

    if (action === "MANUAL_SYNC") {
      const { syncType } = body;
      if (!syncType) {
        return NextResponse.json({ error: "syncType is required for manual sync." }, { status: 400 });
      }
      const result = await triggerManualConnectorSync(ctx, syncType);
      return NextResponse.json(result);
    }

    if (action === "RETRY_OUTBOX") {
      const result = await retryFailedOutboxItems(ctx);
      return NextResponse.json(result);
    }

    if (action === "TOGGLE_SCHEDULE") {
      const { syncType, isEnabled } = body;
      if (!syncType) {
        return NextResponse.json({ error: "syncType is required." }, { status: 400 });
      }
      const result = await toggleConnectorSchedule(ctx, syncType, Boolean(isEnabled));
      return NextResponse.json({ success: true, config: result });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process integration action" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
