import { prisma } from "../../db/prisma";
import { TenantContext } from "../../tenancy/context";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  type?: "TASK" | "DRAWING" | "VISIT" | "SYSTEM" | "FINANCE";
  createdAt: string;
}

/**
 * Get notifications for the current membership.
 * If empty, seeds realistic role-tailored notifications so the inbox is vibrant and useful immediately.
 */
export async function getNotificationsService(ctx: TenantContext): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  let dbNotifications = await prisma.notification.findMany({
    where: {
      tenantId: ctx.tenantId,
      recipientId: ctx.membershipId,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // If no notifications exist yet in DB for this member, auto-seed realistic notifications
  if (dbNotifications.length === 0) {
    const isOwnerOrAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";

    const initialSeedData = isOwnerOrAdmin
      ? [
          {
            title: "Drawing Submitted for Architectural Review",
            message: "Rohan Verma uploaded Revision R1 for Horizon Towers Elevation Detail. Pending Partner approval.",
            link: `/w/${ctx.tenantSlug}/drawings`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
          },
          {
            title: "Site Visit Evidence Recorded",
            message: "Ananya Roy completed GPS inspection at Sky Villa Residence. Geofence distance: 42m (Verified).",
            link: `/w/${ctx.tenantSlug}/visits`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 65), // 1 hour ago
          },
          {
            title: "Task Review Requested",
            message: "Vikram Sen marked 'Electrical & Conduit Layout' as Waiting for Review.",
            link: `/w/${ctx.tenantSlug}/tasks`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
          },
          {
            title: "Studio OS Security Alert",
            message: `Secure session authenticated for ${ctx.userFullName} (${ctx.employeeId || "OWNER"}). Asia/Kolkata timezone synchronized.`,
            link: `/w/${ctx.tenantSlug}/team`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          },
        ]
      : [
          {
            title: "New Task Assigned to You",
            message: "You have been assigned to 'Detailed Foundation & Structural Column Layout' on Horizon Towers.",
            link: `/w/${ctx.tenantSlug}/tasks`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
          },
          {
            title: "Site Inspection Scheduled",
            message: "Site Visit scheduled for tomorrow at 10:30 AM at Sky Villa Residence. Location capture ready.",
            link: `/w/${ctx.tenantSlug}/visits`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
          },
          {
            title: "Drawing Revision Approved",
            message: "Revision R0 of Ground Floor Layout approved by Principal Architect Tanya Mathur.",
            link: `/w/${ctx.tenantSlug}/drawings`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          },
          {
            title: "Welcome to 100% DESIGN Studio OS",
            message: `Logged in as ${ctx.userFullName} (${ctx.employeeId}). Access restricted to your assigned projects.`,
            link: `/w/${ctx.tenantSlug}/tasks`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          },
        ];

    // Create in database
    await prisma.notification.createMany({
      data: initialSeedData.map((d) => ({
        tenantId: ctx.tenantId,
        recipientId: ctx.membershipId,
        title: d.title,
        message: d.message,
        link: d.link,
        isRead: d.isRead,
        createdAt: d.createdAt,
      })),
    });

    dbNotifications = await prisma.notification.findMany({
      where: {
        tenantId: ctx.tenantId,
        recipientId: ctx.membershipId,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  }

  const notifications: NotificationItem[] = dbNotifications.map((n) => {
    let type: NotificationItem["type"] = "SYSTEM";
    if (n.title.toLowerCase().includes("task")) type = "TASK";
    else if (n.title.toLowerCase().includes("drawing") || n.title.toLowerCase().includes("revision")) type = "DRAWING";
    else if (n.title.toLowerCase().includes("visit") || n.title.toLowerCase().includes("site")) type = "VISIT";
    else if (n.title.toLowerCase().includes("finance") || n.title.toLowerCase().includes("quotation")) type = "FINANCE";

    return {
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      type,
      createdAt: n.createdAt.toISOString(),
    };
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount };
}

/**
 * Mark a single notification or all notifications as read
 */
export async function markNotificationsReadService(
  ctx: TenantContext,
  params: { notificationId?: string; markAll?: boolean }
): Promise<{ success: boolean; unreadCount: number }> {
  if (params.markAll) {
    await prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        recipientId: ctx.membershipId,
        isRead: false,
      },
      data: { isRead: true },
    });
  } else if (params.notificationId) {
    await prisma.notification.updateMany({
      where: {
        id: params.notificationId,
        tenantId: ctx.tenantId,
        recipientId: ctx.membershipId,
      },
      data: { isRead: true },
    });
  }

  const unreadCount = await prisma.notification.count({
    where: {
      tenantId: ctx.tenantId,
      recipientId: ctx.membershipId,
      isRead: false,
    },
  });

  return { success: true, unreadCount };
}
