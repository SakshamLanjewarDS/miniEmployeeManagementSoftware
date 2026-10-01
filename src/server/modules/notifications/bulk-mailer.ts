import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { TenantContext } from "../../tenancy/context";

export interface BulkRecipient {
  membershipId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
}

export interface BulkMailParams {
  templateType: "LEAVE_NOTICE" | "FUNCTION_GREETING" | "CREDENTIALS" | "CIRCULAR" | "CUSTOM";
  subjectTemplate: string;
  bodyTemplate: string;
  recipients: BulkRecipient[];
  createInAppNotification?: boolean;
}

export interface DispatchedRecipientResult {
  membershipId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  personalizedSubject: string;
  personalizedBody: string;
  gmailUrl: string;
  whatsappUrl?: string;
  outboxId?: string;
  inAppNotificationCreated: boolean;
}

export interface BulkMailDispatchResponse {
  success: boolean;
  totalRecipients: number;
  outboxEntriesCreated: number;
  inAppNotificationsCreated: number;
  groupGmailUrl: string;
  dispatchedRecipients: DispatchedRecipientResult[];
}

/**
 * Replace dynamic placeholders {name}, {employeeId}, {email}, etc.
 */
export function interpolateTemplate(
  template: string,
  data: {
    name: string;
    employeeId: string;
    email: string;
    designation: string;
    department: string;
    workspace: string;
    date: string;
    companyEmail: string;
    loginUrl: string;
  }
): string {
  if (!template) return "";
  return template
    .replace(/\{name\}/gi, data.name)
    .replace(/\{employeeId\}/gi, data.employeeId)
    .replace(/\{email\}/gi, data.email)
    .replace(/\{designation\}/gi, data.designation)
    .replace(/\{department\}/gi, data.department)
    .replace(/\{workspace\}/gi, data.workspace)
    .replace(/\{date\}/gi, data.date)
    .replace(/\{companyEmail\}/gi, data.companyEmail)
    .replace(/\{loginUrl\}/gi, data.loginUrl);
}

/**
 * Build rich HTML email for studio announcements
 */
function buildStudioAnnouncementHtml(params: {
  studioName: string;
  recipientName: string;
  recipientEmployeeId: string;
  subject: string;
  bodyText: string;
  templateType: string;
  companyEmail: string;
}): string {
  const {
    studioName,
    recipientName,
    recipientEmployeeId,
    subject,
    bodyText,
    templateType,
    companyEmail,
  } = params;

  const formattedBody = bodyText
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #2D3748;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  let badgeColor = "#4B5320"; // Studio olive
  let badgeLabel = "OFFICIAL STUDIO NOTICE";
  if (templateType === "LEAVE_NOTICE") {
    badgeColor = "#D97706";
    badgeLabel = "LEAVE & HOLIDAY CIRCULAR";
  } else if (templateType === "FUNCTION_GREETING") {
    badgeColor = "#7C3AED";
    badgeLabel = "CELEBRATION & GREETINGS";
  } else if (templateType === "CREDENTIALS") {
    badgeColor = "#2563EB";
    badgeLabel = "STUDIO OS CREDENTIALS";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FD;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E6F0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #1F1F1F; padding: 24px 28px; border-bottom: 3px solid ${badgeColor};">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="display: inline-block; padding: 4px 10px; background-color: ${badgeColor}; color: #FFFFFF; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; border-radius: 6px; text-transform: uppercase;">
          ${badgeLabel}
        </span>
        <span style="color: #A8B1CE; font-size: 11px;">100% DESIGN Studio OS</span>
      </div>
      <h1 style="color: #FFFFFF; font-size: 18px; margin: 12px 0 0 0; font-weight: 700;">
        ${subject}
      </h1>
    </div>

    <!-- Recipient Info Banner -->
    <div style="background-color: #F1F4F9; padding: 10px 28px; border-bottom: 1px solid #E2E6F0; font-size: 11px; color: #4A5568;">
      Personalized for: <strong style="color: #1A202C;">${recipientName}</strong> (ID: <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #2B6CB0;">${recipientEmployeeId}</code>)
    </div>

    <!-- Body -->
    <div style="padding: 28px; font-size: 14px;">
      ${formattedBody}
    </div>

    <!-- Footer -->
    <div style="background-color: #FAFAFB; padding: 20px 28px; border-top: 1px solid #E2E6F0; text-align: center; font-size: 11px; color: #718096;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #2D3748;">
        ${studioName} — Architecture & Interior Design
      </p>
      <p style="margin: 0; color: #A0AEC0;">
        Official Dispatch Address: <a href="mailto:${companyEmail}" style="color: #3182CE; text-decoration: none;">${companyEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches bulk notifications to selected studio members.
 * - Writes records to NotificationOutbox
 * - Creates in-app notifications
 * - Formats direct Gmail Web URLs (using designadmin08@gmail.com)
 * - Formats WhatsApp URLs
 */
export async function dispatchBulkNotifications(
  ctx: TenantContext,
  params: BulkMailParams
): Promise<BulkMailDispatchResponse> {
  const {
    templateType,
    subjectTemplate,
    bodyTemplate,
    recipients,
    createInAppNotification = true,
  } = params;

  if (!recipients || recipients.length === 0) {
    throw new Error("No recipients specified for bulk dispatch");
  }

  const companyEmail = "designadmin08@gmail.com";
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const loginUrl = `http://localhost:3000/w/${ctx.tenantSlug}/login`;

  const dispatchedRecipients: DispatchedRecipientResult[] = [];
  let outboxCount = 0;
  let inAppCount = 0;

  for (const r of recipients) {
    const dataVars = {
      name: r.fullName,
      employeeId: r.employeeId,
      email: r.email,
      designation: r.designation || "Architect",
      department: r.department || "Architecture",
      workspace: ctx.tenantName,
      date: currentDate,
      companyEmail,
      loginUrl,
    };

    const personalizedSubject = interpolateTemplate(subjectTemplate, dataVars);
    const personalizedBody = interpolateTemplate(bodyTemplate, dataVars);

    // Build direct Gmail Web URL for this employee
    const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
      companyEmail
    )}&view=cm&fs=1&to=${encodeURIComponent(r.email)}&su=${encodeURIComponent(
      personalizedSubject
    )}&body=${encodeURIComponent(personalizedBody)}`;

    // Build WhatsApp URL if phone is present
    let whatsappUrl: string | undefined;
    if (r.phone) {
      let cleanPhone = r.phone.replace(/[^\d]/g, "");
      if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        personalizedSubject + "\n\n" + personalizedBody
      )}`;
    }

    // Rich HTML email for outbox
    const htmlEmail = buildStudioAnnouncementHtml({
      studioName: ctx.tenantName,
      recipientName: r.fullName,
      recipientEmployeeId: r.employeeId,
      subject: personalizedSubject,
      bodyText: personalizedBody,
      templateType,
      companyEmail,
    });

    const deduplicationKey = `bulk_${ctx.tenantId}_${r.employeeId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    let outboxEntryId: string | undefined;
    try {
      const outbox = await prisma.notificationOutbox.create({
        data: {
          tenantId: ctx.tenantId,
          recipientEmail: r.email.trim().toLowerCase(),
          subject: personalizedSubject,
          htmlBody: htmlEmail,
          status: "SENT",
          retryCount: 0,
          deduplicationKey,
          lastAttemptAt: new Date(),
        },
      });
      outboxEntryId = outbox.id;
      outboxCount++;
    } catch (err) {
      console.warn(`Failed to write outbox for ${r.email}:`, err);
    }

    // In-app notification
    let inAppCreated = false;
    if (createInAppNotification && r.membershipId) {
      try {
        await prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: r.membershipId,
            title: personalizedSubject,
            message: personalizedBody.slice(0, 200) + (personalizedBody.length > 200 ? "..." : ""),
            link: `/w/${ctx.tenantSlug}/team`,
            isRead: false,
          },
        });
        inAppCreated = true;
        inAppCount++;
      } catch (err) {
        console.warn(`Failed to create in-app notification for ${r.fullName}:`, err);
      }
    }

    dispatchedRecipients.push({
      membershipId: r.membershipId,
      employeeId: r.employeeId,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      personalizedSubject,
      personalizedBody,
      gmailUrl,
      whatsappUrl,
      outboxId: outboxEntryId,
      inAppNotificationCreated: inAppCreated,
    });
  }

  // Build group BCC Gmail URL (all recipients in BCC, sent from designadmin08@gmail.com)
  const allEmails = recipients.map((r) => r.email.trim().toLowerCase());
  const generalSubject = interpolateTemplate(subjectTemplate, {
    name: "Team Member",
    employeeId: "ALL",
    email: "",
    designation: "Studio Team",
    department: "All Departments",
    workspace: ctx.tenantName,
    date: currentDate,
    companyEmail,
    loginUrl,
  });
  const generalBody = interpolateTemplate(bodyTemplate, {
    name: "Team Member",
    employeeId: "",
    email: "",
    designation: "",
    department: "",
    workspace: ctx.tenantName,
    date: currentDate,
    companyEmail,
    loginUrl,
  });

  const groupGmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
    companyEmail
  )}&view=cm&fs=1&bcc=${encodeURIComponent(allEmails.join(","))}&su=${encodeURIComponent(
    generalSubject
  )}&body=${encodeURIComponent(generalBody)}`;

  // Audit event
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "BULK_NOTIFICATION_DISPATCH",
        entityType: "NotificationOutbox",
        entityId: ctx.tenantId,
        safeChangeSummary: `Dispatched ${recipients.length} bulk notifications (${templateType}) by ${ctx.userFullName}`,
      },
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    totalRecipients: recipients.length,
    outboxEntriesCreated: outboxCount,
    inAppNotificationsCreated: inAppCount,
    groupGmailUrl,
    dispatchedRecipients,
  };
}
