import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const testUrl = "mysql://root:Saksham%40123@localhost:3306/studio_os_test?connection_limit=25&pool_timeout=20";
  console.log("Setting up studio_os_test database...");

  // 1. Ensure database exists
  const rootPrisma = new PrismaClient({
    datasources: { db: { url: "mysql://root:Saksham%40123@localhost:3306/mysql" } },
  });
  await rootPrisma.$executeRawUnsafe("CREATE DATABASE IF NOT EXISTS studio_os_test;");
  await rootPrisma.$disconnect();

  // 2. Run prisma db push with DATABASE_URL pointed to studio_os_test
  console.log("Running prisma db push to studio_os_test...");
  execSync("npx prisma db push --schema=prisma/schema.prisma --skip-generate", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });

  console.log("✅ studio_os_test schema synchronized successfully!");
}

main().catch((e) => {
  console.error("Failed to setup test db:", e);
  process.exit(1);
});
