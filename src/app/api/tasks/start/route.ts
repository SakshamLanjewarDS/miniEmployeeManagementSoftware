import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { startChecklistWork } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, acknowledgeIfUnacknowledged, overrideDependency } = body;

    if (!taskId || !itemId) {
      return NextResponse.json({ error: "Task ID and Item ID are required." }, { status: 400 });
    }

    const updated = await startChecklistWork(ctx, taskId, itemId, {
      acknowledgeIfUnacknowledged: Boolean(acknowledgeIfUnacknowledged),
      overrideDependency: Boolean(overrideDependency),
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start work" },
      { status: err.statusCode || 400 }
    );
  }
}
