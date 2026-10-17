import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { executeInboxDecision } from "@/server/modules/inbox/service";

// POST /api/inbox/decide?workspaceSlug=...
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();

    // Support batch execution: { items: Array<{ type, id, action, feedback }> }
    if (Array.isArray(body.items) && body.items.length > 0) {
      const results: any[] = [];
      const errors: any[] = [];

      for (const item of body.items) {
        try {
          const res = await executeInboxDecision(ctx, {
            type: item.type,
            id: item.id,
            action: item.action,
            feedback: item.feedback,
          });
          results.push({ id: item.id, success: true, res });
        } catch (err: any) {
          errors.push({ id: item.id, error: err.message || "Failed to execute decision" });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        processedCount: results.length,
        failedCount: errors.length,
        results,
        errors,
      });
    }

    const { type, id, action, feedback } = body;

    if (!type || !id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: type, id, and action are required." },
        { status: 400 }
      );
    }

    const result = await executeInboxDecision(ctx, {
      type,
      id,
      action,
      feedback,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const status =
      error.message?.includes("Forbidden") ||
      error.message?.includes("Four-eyes") ||
      error.message?.includes("Only Studio Owners")
        ? 403
        : error.message?.includes("Conflict") || error.message?.includes("already been decided")
        ? 409
        : 500;
    return NextResponse.json({ error: error.message || "Failed to execute decision" }, { status });
  }
}
