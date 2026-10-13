/**
 * Environment & Secret Configuration Validator (SEC-03)
 * Validates system prerequisites at startup and rejects insecure production defaults.
 */

const INSECURE_SECRET_PATTERNS = [
  "changeme",
  "secret",
  "password",
  "default",
  "123456",
  "12345678",
  "test",
  "admin",
  "studiopassword",
];

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironmentConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Database URL check
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push("DATABASE_URL is not configured.");
  } else if (isProduction) {
    if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
      warnings.push("DATABASE_URL in production appears to reference a local host.");
    }
    if (dbUrl.includes("root:") && dbUrl.includes("@")) {
      warnings.push("DATABASE_URL is using root database user; least-privilege runtime account recommended.");
    }
  }

  // 2. Session / Auth Secret
  const sessionSecret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (isProduction) {
    if (!sessionSecret) {
      errors.push("SESSION_SECRET (or NEXTAUTH_SECRET) must be set in production.");
    } else {
      if (sessionSecret.length < 32) {
        errors.push("SESSION_SECRET must be at least 32 characters long in production.");
      }
      const lower = sessionSecret.toLowerCase();
      if (INSECURE_SECRET_PATTERNS.some((p) => lower.includes(p))) {
        errors.push("SESSION_SECRET contains an insecure, predictable placeholder value.");
      }
    }
  } else {
    if (!sessionSecret) {
      warnings.push("SESSION_SECRET is not set; running with development cryptographic fallback.");
    }
  }

  // 3. Timezone consistency
  const tz = process.env.TZ || process.env.APP_TIMEZONE || "Asia/Kolkata";
  if (tz !== "Asia/Kolkata") {
    warnings.push(`Studio configured with non-standard timezone: ${tz}. Expected: Asia/Kolkata.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertValidEnvironment(): void {
  const result = validateEnvironmentConfig();
  if (result.warnings.length > 0 && process.env.NODE_ENV !== "production") {
    result.warnings.forEach((w) => console.warn(`[CONFIG WARNING] ${w}`));
  }
  if (!result.isValid) {
    const errorMsg = `[SECURITY BLOCK] Environment startup validation failed:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    }
  }
}
