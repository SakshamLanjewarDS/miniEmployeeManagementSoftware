import { prisma } from "../../src/server/db/prisma";
import { PrismaClient } from "@prisma/client";

/**
 * ============================================================================
 * TEST DATABASE ISOLATION & SAFETY HARNESS (F1 Safeguard)
 * ============================================================================
 * Guarantees that automated integration tests only execute against isolated
 * test database targets or explicitly authorized local testing environments.
 * Operational or production databases are rejected immediately.
 * Never prints database credentials or connection secrets.
 */

export interface TestTargetValidation {
  isSafe: boolean;
  targetName: string;
  reason?: string;
}

/**
 * Validates the current database URL without exposing secrets or credentials.
 */
export function validateTestDatabaseTarget(): TestTargetValidation {
  const effectiveUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";

  if (!effectiveUrl) {
    return {
      isSafe: false,
      targetName: "UNKNOWN",
      reason: "No database URL configured in environment.",
    };
  }

  try {
    // Parse connection string securely
    // Format: mysql://user:password@host:port/database
    const sanitizedUrl = effectiveUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
    const match = effectiveUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);

    const host = match ? match[1] : "unknown";
    const dbName = match ? match[3] : "unknown";

    // 1. Production host / domain rejection
    const isLocalhost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "mysql" ||
      host === "host.docker.internal";

    if (!isLocalhost && !process.env.ALLOW_REMOTE_TEST_DB) {
      return {
        isSafe: false,
        targetName: `${host}/${dbName}`,
        reason: `Remote database host '${host}' is blocked for test suites without explicit ALLOW_REMOTE_TEST_DB=true.`,
      };
    }

    // 2. Reject obvious production/live database names
    const lowerDb = dbName.toLowerCase();
    if (
      lowerDb.includes("prod") ||
      lowerDb.includes("production") ||
      lowerDb.includes("live") ||
      lowerDb.includes("operational")
    ) {
      return {
        isSafe: false,
        targetName: `${host}/${dbName}`,
        reason: `Database name '${dbName}' matches operational naming patterns and is rejected for automated tests.`,
      };
    }

    // 3. Environment check
    if (process.env.NODE_ENV === "production") {
      return {
        isSafe: false,
        targetName: `${host}/${dbName}`,
        reason: "Test execution is strictly prohibited when NODE_ENV is set to 'production'.",
      };
    }

    return {
      isSafe: true,
      targetName: `${host}/${dbName}`,
    };
  } catch (err: any) {
    return {
      isSafe: false,
      targetName: "UNPARSEABLE",
      reason: "Could not parse or validate database target configuration.",
    };
  }
}

/**
 * Asserts that the active database target is isolated and safe for test mutations.
 * Throws an error immediately if the target cannot be verified.
 */
export function assertSafeTestDatabase(): void {
  const check = validateTestDatabaseTarget();
  if (!check.isSafe) {
    throw new Error(
      `[TEST SAFETY GUARD FATAL] Test execution aborted: ${check.reason} (Target: ${check.targetName})`
    );
  }
}

// Auto-validate immediately on import
assertSafeTestDatabase();

/**
 * Creates an isolated test workspace / tenant for test runs with safe teardown.
 */
export async function createIsolatedTestTenant(prefix: string = "test") {
  assertSafeTestDatabase();
  const slug = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: `Test Studio (${slug})`,
      timezone: "Asia/Kolkata",
      currency: "INR",
      lifecycleState: "ACTIVE",
    },
  });

  return {
    tenant,
    cleanup: async () => {
      try {
        await prisma.tenant.delete({ where: { id: tenant.id } });
      } catch (err) {
        console.warn(`[TEST CLEANUP] Failed to remove test tenant ${tenant.id}:`, err);
      }
    },
  };
}

export { prisma };
