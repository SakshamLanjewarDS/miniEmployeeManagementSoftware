import webpush from "web-push";
import { prisma } from "../../db/prisma";

export const DEFAULT_VAPID_PUBLIC_KEY =
  "BOCY-mlARuHqbMwBsULCjmcPkgjFL56Lo0vyAj7L1spdlhLocvfIGQgZx3P_gQApPREy6yFPAKOWAQEtCAP-wEg";
export const DEFAULT_VAPID_PRIVATE_KEY =
  "6kKtbNI1dueRZI4lu46GGosuqtuYnlfdkAzfTNx8w0o";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@100percentdesign.in";

let isVapidReady = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidReady = true;
  } catch (err) {
    console.error("[WebPush] Failed to configure VAPID details:", err);
  }
}

export interface PushNotificationPayload {
  title: string;
  message: string;
  link?: string | null;
  tag?: string;
  icon?: string;
  badge?: string;
}

/**
 * Send instant background device push notification to a specific membership
 */
export async function sendDevicePushNotification(
  recipientMembershipId: string,
  payload: PushNotificationPayload,
  tenantId?: string
): Promise<void> {
  if (!isVapidReady) {
    return;
  }

  try {
    const whereClause: any = { membershipId: recipientMembershipId };
    if (tenantId) whereClause.tenantId = tenantId;

    const subscriptions = await prisma.devicePushSubscription.findMany({
      where: whereClause,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      link: payload.link || "/w",
      tag: payload.tag || `studio-os-${Date.now()}`,
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/favicon-32x32.png",
      timestamp: Date.now(),
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: "high",
          }
        );
      } catch (err: any) {
        // HTTP 410 Gone or 404 Not Found indicates device unregistered or uninstalled PWA
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.devicePushSubscription.delete({
            where: { id: sub.id },
          }).catch(() => {});
        } else {
          console.warn(`[WebPush] Failed delivery to device subscription ${sub.id}:`, err.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error("[WebPush] sendDevicePushNotification error:", err);
  }
}

/**
 * Send device push notification to all memberships matching specific roles in a tenant
 * (e.g. notify all "OWNER" and "ADMIN" when task is submitted for review)
 */
export async function sendDevicePushToRoles(
  tenantId: string,
  roles: Array<"OWNER" | "ADMIN" | "EMPLOYEE">,
  payload: PushNotificationPayload,
  excludeMembershipId?: string
): Promise<void> {
  if (!isVapidReady) return;

  try {
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId,
        role: { in: roles },
        isActive: true,
        ...(excludeMembershipId ? { id: { not: excludeMembershipId } } : {}),
      },
      select: { id: true },
    });

    const promises = memberships.map((m) =>
      sendDevicePushNotification(m.id, payload, tenantId)
    );

    await Promise.allSettled(promises);
  } catch (err) {
    console.error("[WebPush] sendDevicePushToRoles error:", err);
  }
}
