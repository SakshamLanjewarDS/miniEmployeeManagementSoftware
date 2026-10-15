import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { sendDevicePushNotification } from "@/server/modules/notifications/push";

export async function GET(req: NextRequest) {
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

    const count = await prisma.devicePushSubscription.count({
      where: {
        membershipId: ctx.membershipId,
      },
    });

    const DEFAULT_VAPID_PUBLIC_KEY =
      "BOCY-mlARuHqbMwBsULCjmcPkgjFL56Lo0vyAj7L1spdlhLocvfIGQgZx3P_gQApPREy6yFPAKOWAQEtCAP-wEg";

    return NextResponse.json({
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
      isSubscribed: count > 0,
      activeDeviceCount: count,
    });
  } catch (error: any) {
    console.error("GET /api/notifications/push-subscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get push status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, subscription, userAgent } = body;

    if (!workspaceSlug || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh || "";
    const auth = subscription.keys?.auth || "";

    if (!p256dh || !auth) {
      return NextResponse.json(
        { error: "Malformed subscription keys" },
        { status: 400 }
      );
    }

    // Check if subscription already exists for this endpoint
    const existing = await prisma.devicePushSubscription.findFirst({
      where: { endpoint },
    });

    let savedSubscription;
    if (existing) {
      savedSubscription = await prisma.devicePushSubscription.update({
        where: { id: existing.id },
        data: {
          tenantId: ctx.tenantId,
          membershipId: ctx.membershipId,
          p256dh,
          auth,
          userAgent: userAgent || null,
        },
      });
    } else {
      savedSubscription = await prisma.devicePushSubscription.create({
        data: {
          tenantId: ctx.tenantId,
          membershipId: ctx.membershipId,
          endpoint,
          p256dh,
          auth,
          userAgent: userAgent || null,
        },
      });
    }

    // Send immediate confirmation push notification to device
    sendDevicePushNotification(
      ctx.membershipId,
      {
        title: "🔔 Notifications Enabled!",
        message: `Instant device alerts are now active for ${ctx.userFullName} (${ctx.role}).`,
        link: `/w/${ctx.tenantSlug}/notifications`,
        tag: "push-registration-success",
      },
      ctx.tenantId
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      subscriptionId: savedSubscription.id,
      message: "Device successfully subscribed to real-time push alerts",
    });
  } catch (error: any) {
    console.error("POST /api/notifications/push-subscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register push subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceSlug, endpoint } = body;

    if (!workspaceSlug || !endpoint) {
      return NextResponse.json(
        { error: "Missing workspaceSlug or endpoint" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.devicePushSubscription.deleteMany({
      where: {
        membershipId: ctx.membershipId,
        endpoint,
      },
    });

    return NextResponse.json({ success: true, message: "Subscription removed" });
  } catch (error: any) {
    console.error("DELETE /api/notifications/push-subscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove push subscription" },
      { status: 500 }
    );
  }
}
