import { PrismaClient } from "@prisma/client";
import { syncLiveLeaveSheet, syncLiveVendorSheet } from "../src/server/modules/integrations/google-sheets-sync";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "100percentdesign" },
  });

  if (!tenant) {
    console.error("Tenant 100percentdesign not found!");
    return;
  }

  const dummyCtx: any = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: "admin-system",
    membershipId: "membership-system",
    role: "OWNER",
  };

  console.log("=== 1. TESTING LIVE LEAVE SHEET SYNC ===");
  const leaveRes = await syncLiveLeaveSheet(dummyCtx);
  console.log("Leave Sync Result:", leaveRes);

  console.log("\n=== 2. TESTING LIVE VENDOR SHEET SYNC ===");
  const vendorRes = await syncLiveVendorSheet(dummyCtx);
  console.log("Vendor Sync Result:", vendorRes);

  const totalLeaves = await prisma.studioLeaveRequest.count({
    where: { tenantId: tenant.id },
  });
  const totalVendors = await prisma.studioVendor.count({
    where: { tenantId: tenant.id },
  });

  console.log(`\nVerified Database:`);
  console.log(`Total Leaves in DB now: ${totalLeaves}`);
  console.log(`Total Vendors in DB now: ${totalVendors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
