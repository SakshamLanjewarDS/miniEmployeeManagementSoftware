import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { sendDevicePushNotification } from "@/server/modules/notifications/push";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, delaySeconds = 3 } = body;

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // Schedule test push in background after delay (allowing user to close/minimize window)
    setTimeout(async () => {
      try {
        await sendDevicePushNotification(
          ctx.membershipId,
          {
            title: "🔔 Background Device Alert Verified!",
            message: `Hello ${ctx.userFullName}! This push notification was delivered while your app window was in background.`,
            link: `/w/${ctx.tenantSlug}/tasks`,
            tag: `test-background-push-${Date.now()}`,
          },
          ctx.tenantId
        );
      } catch (err) {
        console.error("[TestPush] Background delivery error:", err);
      }
    }, Math.max(1000, delaySeconds * 1000));

    return NextResponse.json({
      success: true,
      message: `Test push scheduled in ${delaySeconds} seconds. You can now minimize or close your browser to test background delivery!`,
    });
  } catch (err: any) {
    console.error("POST /api/notifications/test-push error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to schedule test push" },
      { status: 500 }
    );
  }
}
