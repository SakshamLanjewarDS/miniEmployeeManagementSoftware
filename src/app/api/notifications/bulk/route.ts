import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { dispatchBulkNotifications, BulkMailParams } from "@/server/modules/notifications/bulk-mailer";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();

    const workspaceSlug = body.workspaceSlug || searchParams.get("workspaceSlug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only Owner, Admin, or Project Manager can dispatch bulk communications
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN" && ctx.role !== "PROJECT_MANAGER") {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to send bulk communications." },
        { status: 403 }
      );
    }

    const {
      templateType = "CUSTOM",
      subjectTemplate,
      bodyTemplate,
      recipients,
      createInAppNotification = true,
    } = body;

    if (!subjectTemplate || !bodyTemplate) {
      return NextResponse.json(
        { error: "Subject template and body template are required" },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient must be selected" },
        { status: 400 }
      );
    }

    const result = await dispatchBulkNotifications(ctx, {
      templateType,
      subjectTemplate,
      bodyTemplate,
      recipients,
      createInAppNotification,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/notifications/bulk error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch bulk notifications" },
      { status: 500 }
    );
  }
}
