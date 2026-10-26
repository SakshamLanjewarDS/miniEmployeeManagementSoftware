import { PrismaClient } from "@prisma/client";

/**
 * ============================================================================
 * TEST DATABASE ISOLATION & SAFETY HARNESS (F1 Safeguard)
 * ============================================================================
 * Guarantees that automated integration tests only execute against a dedicated,
 * disposable test database (studio_os_test or *_test).
 * Development databases (including studio_os_db) and operational databases are
 * strictly rejected, regardless of whether they run on localhost.
 * Never prints database credentials or connection secrets.
 */

// If TEST_DATABASE_URL is not explicitly provided in environment, default to dedicated studio_os_test
const DEFAULT_TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "mysql://root:Saksham%40123@localhost:3306/studio_os_test?connection_limit=25&pool_timeout=20";

// Ensure process.env points to the isolated test database for all imported modules
process.env.TEST_DATABASE_URL = DEFAULT_TEST_DATABASE_URL;
process.env.DATABASE_URL = DEFAULT_TEST_DATABASE_URL;

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
    const match = effectiveUrl.match(/@([^:/]+)(?::(\d+))?\/([^?]+)/);
    const host = match ? match[1] : "unknown";
    const dbName = match ? match[3] : "unknown";
    const lowerDb = dbName.toLowerCase();

    // 1. Explicit Development Database Rejection (CRITICAL REQUIREMENT)
    // Never allow studio_os_db merely because it runs on localhost.
    if (lowerDb === "studio_os_db") {
      return {
        isSafe: false,
        targetName: `${host}/${dbName}`,
        reason:
          "Target 'studio_os_db' is the development database. Tests require a dedicated disposable test database (e.g. 'studio_os_test' via TEST_DATABASE_URL) to guarantee test isolation.",
      };
    }

    // 2. Production host / remote domain rejection
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

    // 3. Strict allowlist for test database naming pattern
    const isExplicitTestDb =
      lowerDb === "studio_os_test" ||
      lowerDb.endsWith("_test") ||
      lowerDb.startsWith("test_") ||
      lowerDb.includes("_disposable_") ||
      lowerDb.includes("_test_");

    if (!isExplicitTestDb) {
      return {
        isSafe: false,
        targetName: `${host}/${dbName}`,
        reason: `Database name '${dbName}' does not match dedicated test database patterns (*_test or test_*).`,
      };
    }

    // 4. Reject production/operational indicators
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

    // 5. Environment check
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

// Instantiate dedicated Prisma client for test execution
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DEFAULT_TEST_DATABASE_URL,
    },
  },
  log: ["error"],
});

// Set globally so all src/server modules use the exact same test database client
(globalThis as any).prismaGlobal = prisma;

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
