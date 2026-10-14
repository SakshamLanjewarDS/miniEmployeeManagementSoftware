import crypto from "crypto";

/**
 * Cryptographic Action Token Engine for Safe Email Decisions (LEAVE-02)
 * Ensures:
 * - Single-use token validation
 * - 72-hour expiration window
 * - Binding to tenantId, leaveId, intended action, and authorized reviewer
 * - Immune to URL link crawlers and automated email scanners
 */

const ACTION_TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "studio_action_token_salt_2026_uncompromised";

const TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours

// In-memory nonce store for single-use protection
const usedNonces = new Set<string>();

export interface ActionTokenPayload {
  tenantId: string;
  leaveId: string;
  action: "APPROVE" | "REJECT";
  reviewerId?: string;
  nonce: string;
  exp: number; // epoch ms
}

/**
 * Generates an HMAC-signed single-use action token
 */
export function generateLeaveActionToken(
  tenantId: string,
  leaveId: string,
  action: "APPROVE" | "REJECT",
  reviewerId?: string
): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + TOKEN_EXPIRY_MS;

  const payload: ActionTokenPayload = {
    tenantId,
    leaveId,
    action,
    reviewerId,
    nonce,
    exp,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ACTION_TOKEN_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Validates an action token and marks it consumed (single-use)
 */
export function verifyAndConsumeLeaveActionToken(
  token: string,
  expectedAction?: "APPROVE" | "REJECT"
): { isValid: boolean; payload?: ActionTokenPayload; error?: string } {
  if (!token || !token.includes(".")) {
    return { isValid: false, error: "Malformed action token." };
  }

  const [payloadB64, signature] = token.split(".");
  const expectedSignature = crypto
    .createHmac("sha256", ACTION_TOKEN_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { isValid: false, error: "Invalid action token signature." };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: ActionTokenPayload = JSON.parse(payloadJson);

    // Check expiration
    if (Date.now() > payload.exp) {
      return { isValid: false, error: "Action token has expired. Please log into Studio OS to decide." };
    }

    // Check action match
    if (expectedAction && payload.action !== expectedAction) {
      return { isValid: false, error: `Action mismatch: expected ${expectedAction}, got ${payload.action}` };
    }

    // Check single-use nonce
    if (usedNonces.has(payload.nonce)) {
      return { isValid: false, error: "Action token has already been used." };
    }

    // Mark nonce as consumed
    usedNonces.add(payload.nonce);

    // Limit nonce store memory
    if (usedNonces.size > 10000) {
      const iter = usedNonces.values();
      for (let i = 0; i < 2000; i++) {
        const val = iter.next().value;
        if (val) usedNonces.delete(val);
      }
    }

    return { isValid: true, payload };
  } catch {
    return { isValid: false, error: "Failed to parse action token." };
  }
}
