import { prisma } from "../../db/prisma";
import {
  sendDevicePushNotification,
  sendDevicePushToRoles,
  PushNotificationPayload,
} from "./push";

export interface DispatchNotificationOptions {
  tenantId: string;
  recipientId: string;
  title: string;
  message: string;
  link?: string | null;
  tag?: string;
}

export interface DispatchRolesNotificationOptions {
  tenantId: string;
  roles: Array<"OWNER" | "ADMIN" | "EMPLOYEE">;
  title: string;
  message: string;
  link?: string | null;
  tag?: string;
  excludeMembershipId?: string;
}

/**
 * Dispatch a single notification: persists in-app notification in MySQL
 * and instantly pushes to device OS tray / lock screen via Web Push.
 */
export async function dispatchNotification(
  opts: DispatchNotificationOptions
): Promise<void> {
  try {
    // 1. Persist to DB for in-app bell & notification history
    await prisma.notification.create({
      data: {
        tenantId: opts.tenantId,
        recipientId: opts.recipientId,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
        isRead: false,
      },
    });

    // 2. Fire instant device push (non-blocking background)
    sendDevicePushNotification(
      opts.recipientId,
      {
        title: opts.title,
        message: opts.message,
        link: opts.link,
        tag: opts.tag,
      },
      opts.tenantId
    ).catch((err) => {
      console.warn("[Dispatch] Device push error:", err);
    });
  } catch (err) {
    console.error("[Dispatch] Failed to dispatch notification:", err);
  }
}

/**
 * Dispatch notification to all users matching specific roles in a tenant
 * (e.g. notify all studio Admins and Owners).
 */
export async function dispatchNotificationToRoles(
  opts: DispatchRolesNotificationOptions
): Promise<void> {
  try {
    const recipients = await prisma.tenantMembership.findMany({
      where: {
        tenantId: opts.tenantId,
        role: { in: opts.roles },
        isActive: true,
        ...(opts.excludeMembershipId ? { id: { not: opts.excludeMembershipId } } : {}),
      },
      select: { id: true },
    });

    if (recipients.length === 0) return;

    // 1. Batch persist to DB for in-app inbox
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        tenantId: opts.tenantId,
        recipientId: r.id,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
        isRead: false,
      })),
    });

    // 2. Fire device push to all target roles
    sendDevicePushToRoles(
      opts.tenantId,
      opts.roles,
      {
        title: opts.title,
        message: opts.message,
        link: opts.link,
        tag: opts.tag,
      },
      opts.excludeMembershipId
    ).catch((err) => {
      console.warn("[Dispatch] Device push to roles error:", err);
    });
  } catch (err) {
    console.error("[Dispatch] Failed to dispatch notification to roles:", err);
  }
}

/**
 * Dispatch notification to an explicit list of membership IDs
 */
export async function dispatchNotificationToMemberships(
  tenantId: string,
  recipientIds: string[],
  payload: PushNotificationPayload
): Promise<void> {
  if (!recipientIds || recipientIds.length === 0) return;

  try {
    // Unique recipient IDs only
    const uniqueIds = Array.from(new Set(recipientIds));

    // 1. Batch persist in DB
    await prisma.notification.createMany({
      data: uniqueIds.map((id) => ({
        tenantId,
        recipientId: id,
        title: payload.title,
        message: payload.message,
        link: payload.link || null,
        isRead: false,
      })),
    });

    // 2. Fire device push to each recipient
    const pushes = uniqueIds.map((id) =>
      sendDevicePushNotification(id, payload, tenantId)
    );
    await Promise.allSettled(pushes);
  } catch (err) {
    console.error("[Dispatch] Failed to dispatch notifications to memberships:", err);
  }
}
