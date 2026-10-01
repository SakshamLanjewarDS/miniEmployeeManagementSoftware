import crypto from "crypto";

export interface StoredOtpChallenge {
  challengeId: string;
  userId: string;
  tenantId: string;
  workspaceSlug: string;
  hashedOtp: string;
  expiresAt: number; // epoch ms
  lastSentAt: number; // epoch ms
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  userAgent?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    employeeId: string | null;
  };
}

export interface CreateChallengeOptions {
  userId: string;
  tenantId: string;
  workspaceSlug: string;
  ipAddress?: string;
  userAgent?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    employeeId: string | null;
  };
}

export interface CreateChallengeResult {
  challengeId: string;
  otp: string; // Cleartext for immediate delivery / dispatch
  maskedEmail: string;
  expiresInSeconds: number;
}

export interface VerifyChallengeResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  challenge?: StoredOtpChallenge;
}

// Global store to persist challenges across Next.js HMR reloads in development
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, StoredOtpChallenge>;
  otpRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};

const challengeStore = globalForOtp.otpStore || new Map<string, StoredOtpChallenge>();
globalForOtp.otpStore = challengeStore;

const rateLimitStore = globalForOtp.otpRateLimitStore || new Map<string, { count: number; resetAt: number }>();
globalForOtp.otpRateLimitStore = rateLimitStore;

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Periodically purge expired challenges from the store
 */
function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [key, challenge] of challengeStore.entries()) {
    if (challenge.expiresAt <= now) {
      challengeStore.delete(key);
    }
  }
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Masks an email for secure presentation (e.g. tanya@100percentdesign.in -> t***a@100percentdesign.in)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@domain.com";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * Generates an unbiased 6-digit cryptographically secure OTP string
 */
function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a SHA-256 hash buffer of the OTP combined with the challenge salt
 */
function hashOtp(otp: string, challengeId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${challengeId}:${otp}:studio_salt_2026`)
    .digest("hex");
}

/**
 * Rate limit check per IP address
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || record.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

/**
 * Creates and registers a new time-sensitive OTP challenge
 */
export function createOtpChallenge(options: CreateChallengeOptions): CreateChallengeResult {
  cleanupExpiredChallenges();

  const rateKey = options.ipAddress || options.userId;
  if (!checkRateLimit(rateKey)) {
    throw new Error("Too many authentication requests. Please try again after 10 minutes.");
  }

  const challengeId = crypto.randomBytes(24).toString("hex");
  const otp = generateSecureOtp();
  const hashedOtp = hashOtp(otp, challengeId);
  const now = Date.now();

  const challenge: StoredOtpChallenge = {
    challengeId,
    userId: options.userId,
    tenantId: options.tenantId,
    workspaceSlug: options.workspaceSlug,
    hashedOtp,
    expiresAt: now + OTP_TTL_MS,
    lastSentAt: now,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    user: options.user,
  };

  challengeStore.set(challengeId, challenge);

  return {
    challengeId,
    otp,
    maskedEmail: maskEmail(options.user.email),
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
}

/**
 * Verifies an OTP against a registered challenge using constant-time comparison
 */
export function verifyOtpChallenge(
  challengeId: string,
  providedOtp: string
): VerifyChallengeResult {
  cleanupExpiredChallenges();

  if (!challengeId || !providedOtp) {
    return { success: false, error: "Challenge ID and OTP code are required" };
  }

  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return {
      success: false,
      error: "Authentication session expired or invalid. Please sign in again.",
    };
  }

  const now = Date.now();
  if (challenge.expiresAt <= now) {
    challengeStore.delete(challengeId);
    return {
      success: false,
      error: "OTP code has expired. Please request a new code.",
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challengeStore.delete(challengeId);
    return {
      success: false,
      error: "Maximum verification attempts exceeded. For security, please sign in again.",
    };
  }

  const cleanOtp = providedOtp.replace(/\D/g, "");
  const expectedHash = hashOtp(cleanOtp, challengeId);

  const hashBuffer = Buffer.from(expectedHash, "hex");
  const storedBuffer = Buffer.from(challenge.hashedOtp, "hex");

  let isValid = false;
  if (hashBuffer.length === storedBuffer.length) {
    isValid = crypto.timingSafeEqual(hashBuffer, storedBuffer);
  }

  if (!isValid) {
    challenge.attempts += 1;
    const remaining = challenge.maxAttempts - challenge.attempts;

    if (remaining <= 0) {
      challengeStore.delete(challengeId);
      return {
        success: false,
        error: "Maximum verification attempts exceeded. Security challenge revoked.",
        remainingAttempts: 0,
      };
    }

    return {
      success: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      remainingAttempts: remaining,
    };
  }

  // OTP verified successfully: Remove challenge to prevent replay attacks
  challengeStore.delete(challengeId);

  return {
    success: true,
    challenge,
  };
}

/**
 * Re-issues a fresh OTP code for an active challenge with cooldown enforcement
 */
export function resendOtpChallenge(challengeId: string): {
  success: boolean;
  error?: string;
  otp?: string;
  expiresInSeconds?: number;
} {
  cleanupExpiredChallenges();

  const challenge = challengeStore.get(challengeId);
  if (!challenge) {
    return {
      success: false,
      error: "Authentication session expired. Please sign in again.",
    };
  }

  const now = Date.now();
  if (now - challenge.lastSentAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - challenge.lastSentAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${waitSec} seconds before requesting a new code.`,
    };
  }

  const newOtp = generateSecureOtp();
  challenge.hashedOtp = hashOtp(newOtp, challengeId);
  challenge.expiresAt = now + OTP_TTL_MS;
  challenge.lastSentAt = now;
  challenge.attempts = 0; // Reset attempts on fresh code issue

  return {
    success: true,
    otp: newOtp,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
}
