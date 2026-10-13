import crypto from "crypto";
import { prisma } from "../db/prisma";
import { TenantContext, ForbiddenException, UnauthorizedException } from "../tenancy/context";

/**
 * Multi-Factor Authentication (MFA) & TOTP Service (AUTH-03)
 * Full lifecycle: Enrollment, Verification, Recovery Codes (SHA-256 hashed), and Reauthentication.
 */

// Base32 Alphabet for TOTP Secrets (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

function base32Decode(base32Str: string): Buffer {
  const clean = base32Str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Computes RFC 6238 TOTP code for a secret at a specific counter/time window
 */
export function computeTotpCode(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const code = (binary % 1000000).toString().padStart(6, "0");
  return code;
}

/**
 * Validates a TOTP code against a secret with +/- 1 window drift tolerance
 */
export function verifyTotpToken(secretBase32: string, token: string): boolean {
  if (!token || token.trim().length !== 6) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(nowSec / 30);

  for (let window = -1; window <= 1; window++) {
    const expected = computeTotpCode(secretBase32, currentCounter + window);
    if (crypto.timingSafeEqual(Buffer.from(token.trim()), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

/**
 * Generates an array of secure plaintext recovery codes and their SHA-256 hashes
 */
export function generateRecoveryCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // e.g. "A1B2C3D4E5"
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    rawCodes.push(raw);
    hashedCodes.push(hash);
  }

  return { rawCodes, hashedCodes };
}

/**
 * Step 1: Initialize MFA Enrollment for Authenticated User
 */
export async function setupMfaEnrollment(userId: string, userEmail: string): Promise<{
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
}> {
  const secret = generateBase32Secret(20);
  const { rawCodes, hashedCodes } = generateRecoveryCodes(8);

  // Store temporary secret and recovery hashes until confirmed
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret: secret,
      mfaRecoveryCodes: hashedCodes,
    },
  });

  const encodedIssuer = encodeURIComponent("100% DESIGN Studio OS");
  const encodedEmail = encodeURIComponent(userEmail);
  const otpauthUri = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return {
    secret,
    otpauthUri,
    recoveryCodes: rawCodes,
  };
}

/**
 * Step 2: Confirm and Activate MFA Enrollment
 */
export async function confirmMfaEnrollment(
  userId: string,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) {
    return { success: false, error: "MFA enrollment session not found. Please restart setup." };
  }

  const isValid = verifyTotpToken(user.mfaSecret, verificationCode);
  if (!isValid) {
    return { success: false, error: "Invalid verification code. Please check your authenticator app." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });

  return { success: true };
}

/**
 * Step 3: Validate MFA during sign-in using either TOTP code or Backup Recovery Code
 */
export async function verifyUserMfa(
  userId: string,
  codeOrRecoveryToken: string
): Promise<{ success: boolean; usedRecoveryCode?: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return { success: false, error: "MFA is not enabled on this account." };
  }

  const token = codeOrRecoveryToken.trim();

  // Try TOTP code first if 6 digits
  if (/^\d{6}$/.test(token)) {
    if (verifyTotpToken(user.mfaSecret, token)) {
      return { success: true, usedRecoveryCode: false };
    }
  }

  // Fallback: Check recovery codes (stored as SHA-256 hashes)
  const hashedInput = crypto.createHash("sha256").update(token.toUpperCase()).digest("hex");
  const storedCodes = Array.isArray(user.mfaRecoveryCodes) ? (user.mfaRecoveryCodes as string[]) : [];

  const matchedIndex = storedCodes.indexOf(hashedInput);
  if (matchedIndex !== -1) {
    // Consume single-use recovery code
    const updatedCodes = [...storedCodes];
    updatedCodes.splice(matchedIndex, 1);

    await prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: updatedCodes },
    });

    return { success: true, usedRecoveryCode: true };
  }

  return { success: false, error: "Invalid MFA authenticator code or recovery key." };
}

/**
 * Step 4: Disable MFA (requires re-authentication with current password)
 */
export async function disableUserMfa(
  userId: string,
  currentPasswordHash: string,
  providedPassword: string
): Promise<{ success: boolean; error?: string }> {
  const bcrypt = await import("bcryptjs");
  const isMatch = await bcrypt.compare(providedPassword, currentPasswordHash);
  if (!isMatch) {
    return { success: false, error: "Incorrect password. Reauthentication failed." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryCodes: null,
    },
  });

  return { success: true };
}
