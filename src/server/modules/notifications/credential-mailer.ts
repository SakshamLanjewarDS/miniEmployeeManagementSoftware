import { prisma } from "../../db/prisma";
import crypto from "crypto";

export interface SendCredentialParams {
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  recipientEmail: string;
  recipientPhone?: string | null;
  recipientName: string;
  recipientMembershipId?: string;
  employeeId: string;
  password: string;
  customMessage?: string;
  actionType?: "WELCOME" | "PASSWORD_RESET" | "MANUAL_DISPATCH";
  baseUrl?: string;
}

export interface CredentialNotificationResult {
  outboxId: string;
  recipientEmail: string;
  recipientPhone?: string | null;
  employeeId: string;
  plainTextMessage: string;
  whatsappUrl: string;
  gmailUrl: string;
  mailtoUrl: string;
  inAppNotificationCreated: boolean;
}

/**
 * Format clean, human-readable notification text suitable for WhatsApp, SMS, or Email.
 */
export function buildCredentialTextMessage(params: {
  studioName: string;
  employeeName: string;
  employeeId: string;
  email: string;
  password: string;
  loginUrl: string;
  customMessage?: string;
  isPasswordReset?: boolean;
}): string {
  const { studioName, employeeName, employeeId, email, password, loginUrl, customMessage, isPasswordReset } = params;

  const header = isPasswordReset
    ? `🔐 *${studioName} — Password Updated*`
    : `🏢 *${studioName} — Welcome to the Studio Team!*`;

  const intro = isPasswordReset
    ? `Hello ${employeeName}, your login password for ${studioName} OS has been updated by the Administrator.`
    : `Hello ${employeeName}, your employee account has been created for ${studioName} OS.`;

  const customSection = customMessage?.trim()
    ? `\n*Note from Administrator:*\n"${customMessage.trim()}"\n`
    : "";

  return `${header}

${intro}

*Your Login Credentials:*
• Login Portal: ${loginUrl}
• Employee ID: ${employeeId}
• Work Email: ${email}
• Password: ${password}
${customSection}
Please log in to verify your account and review your assigned architectural projects and tasks.

_Note: Keep your password confidential. You can update your profile inside the Studio OS._`;
}

/**
 * Generate a responsive HTML email body with studio branding.
 */
export function buildCredentialHtmlEmail(params: {
  studioName: string;
  employeeName: string;
  employeeId: string;
  email: string;
  password: string;
  loginUrl: string;
  customMessage?: string;
  isPasswordReset?: boolean;
}): string {
  const { studioName, employeeName, employeeId, email, password, loginUrl, customMessage, isPasswordReset } = params;

  const title = isPasswordReset ? "Your Studio OS Password Has Been Updated" : "Welcome to 100% DESIGN Studio OS";
  const badgeText = isPasswordReset ? "Password Reset" : "Welcome & Credentials";
  const badgeColor = isPasswordReset ? "#D97706" : "#2563EB";

  const noteBlock = customMessage?.trim()
    ? `
    <div style="margin: 20px 0; padding: 14px 18px; background: #F8FAFC; border-left: 4px solid #5A81FA; border-radius: 8px;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Message from Administrator</p>
      <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5; font-style: italic;">"${customMessage.trim()}"</p>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 32px 16px; color: #1E293B;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          <!-- Header -->
          <tr>
            <td style="background: #0F172A; padding: 28px 32px; color: #FFFFFF;">
              <span style="display: inline-block; background: ${badgeColor}; color: #FFFFFF; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 12px;">${badgeText}</span>
              <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">${studioName}</h1>
              <p style="margin: 0; font-size: 13px; color: #94A3B8;">Multi-Tenant Architecture Studio Operating System</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1E293B; line-height: 1.5;">Hello <strong>${employeeName}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                ${
                  isPasswordReset
                    ? `Your login password has been updated by the Studio Administrator. Your previous active sessions have been securely revoked.`
                    : `Your employee access for <strong>${studioName}</strong> has been configured. Below are your official login credentials to access the studio portal.`
                }
              </p>

              ${noteBlock}

              <!-- Credentials Box -->
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Your Access Credentials</p>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748B; width: 140px;">Employee ID:</td>
                    <td style="padding: 6px 0; color: #0F172A; font-family: monospace; font-weight: 700; font-size: 14px;">${employeeId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Work Email:</td>
                    <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Password:</td>
                    <td style="padding: 6px 0; color: #2563EB; font-family: monospace; font-weight: 700; font-size: 14px; background: #EEF2FF; padding: 4px 8px; border-radius: 6px; display: inline-block;">${password}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: #5A81FA; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(90,129,250,0.35);">Sign In to Studio OS &rarr;</a>
              </div>

              <p style="text-align: center; margin: 0; font-size: 12px; color: #94A3B8;">Or copy this URL directly: <a href="${loginUrl}" style="color: #5A81FA; text-decoration: underline;">${loginUrl}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 32px; font-size: 11px; color: #94A3B8; text-align: center;">
              This is an automated security credential notification generated by ${studioName} OS.<br>
              Enterprise Encrypted &bull; Revocable Server Sessions &bull; Asia/Kolkata
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Queue credential notification into database NotificationOutbox and in-app Notification.
 * Generates instant WhatsApp and Mailto dispatch links for immediate 1-click sharing by Admin.
 */
export async function sendCredentialNotification(
  params: SendCredentialParams
): Promise<CredentialNotificationResult> {
  const {
    tenantId,
    tenantSlug,
    tenantName = "100% DESIGN Studio",
    recipientEmail,
    recipientPhone,
    recipientName,
    recipientMembershipId,
    employeeId,
    password,
    customMessage,
    actionType = "WELCOME",
    baseUrl = "http://localhost:3000",
  } = params;

  const isPasswordReset = actionType === "PASSWORD_RESET";
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/w/${tenantSlug}/login`;

  const subject = isPasswordReset
    ? `[${tenantName}] Your Studio OS Password Has Been Updated`
    : `[${tenantName}] Your Studio OS Login Credentials (${employeeId})`;

  const plainTextMessage = buildCredentialTextMessage({
    studioName: tenantName,
    employeeName: recipientName,
    employeeId,
    email: recipientEmail,
    password,
    loginUrl,
    customMessage,
    isPasswordReset,
  });

  const htmlBody = buildCredentialHtmlEmail({
    studioName: tenantName,
    employeeName: recipientName,
    employeeId,
    email: recipientEmail,
    password,
    loginUrl,
    customMessage,
    isPasswordReset,
  });

  // Unique deduplication key so we can safely retry or track
  const deduplicationKey = `cred_${tenantId}_${employeeId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // 1. Transactionally write to NotificationOutbox
  const outboxEntry = await prisma.notificationOutbox.create({
    data: {
      tenantId,
      recipientEmail: recipientEmail.toLowerCase().trim(),
      subject,
      htmlBody,
      status: "SENT", // In development and active environments, marked as SENT/OUTBOX_READY
      retryCount: 0,
      deduplicationKey,
      lastAttemptAt: new Date(),
    },
  });

  // 2. If recipient has a membership record, create an in-app Notification as well
  let inAppNotificationCreated = false;
  if (recipientMembershipId) {
    try {
      await prisma.notification.create({
        data: {
          tenantId,
          recipientId: recipientMembershipId,
          title: isPasswordReset ? "Password Updated by Administrator" : "Welcome to Studio OS",
          message: isPasswordReset
            ? `Your password was updated by the Studio Administrator. Your new credentials have been queued.`
            : `Welcome to ${tenantName}! Your Employee ID is ${employeeId}. Contact Admin for any questions.`,
          link: `/w/${tenantSlug}/tasks`,
          isRead: false,
        },
      });
      inAppNotificationCreated = true;
    } catch {
      // In-app notification creation is non-fatal
    }
  }

  // 3. Build WhatsApp Web Link
  // Clean phone number (strip spaces, dashes, brackets, leading +)
  let cleanPhone = recipientPhone ? recipientPhone.replace(/[^\d]/g, "") : "";
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone; // Default to India country code if 10 digits
  }
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(plainTextMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(plainTextMessage)}`;

  // 4. Build Direct Gmail Web Compose Link & Desktop Mailto Link
  // Explicitly targets company mail designadmin08@gmail.com in the browser
  const companyMail = "designadmin08@gmail.com";
  const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
    companyMail
  )}&view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(plainTextMessage)}`;
  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextMessage)}`;

  return {
    outboxId: outboxEntry.id,
    recipientEmail,
    recipientPhone,
    employeeId,
    plainTextMessage,
    whatsappUrl,
    gmailUrl,
    mailtoUrl,
    inAppNotificationCreated,
  };
}
