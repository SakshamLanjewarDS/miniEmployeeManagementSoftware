import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { raiseTaskBlocker, resolveTaskBlocker } from "@/server/modules/tasks/workflow";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, reason, neededToContinue, contactPerson } = body;

    if (!taskId || !itemId) {
      return NextResponse.json({ error: "Task ID and Item ID are required." }, { status: 400 });
    }

    const updated = await raiseTaskBlocker(ctx, taskId, itemId, {
      reason,
      neededToContinue,
      contactPerson,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to raise blocker" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, itemId, resolutionNotes } = body;

    if (!taskId || !itemId) {
      return NextResponse.json({ error: "Task ID and Item ID are required." }, { status: 400 });
    }

    const updated = await resolveTaskBlocker(ctx, taskId, itemId, {
      resolutionNotes,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve blocker" },
      { status: err.statusCode || 400 }
    );
  }
}
