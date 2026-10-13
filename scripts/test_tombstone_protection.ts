import { PrismaClient } from "@prisma/client";
import { syncLiveLeaveSheet, syncLiveVendorSheet } from "../src/server/modules/integrations/google-sheets-sync";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "100percentdesign" },
  });

  if (!tenant) {
    console.error("Tenant not found");
    return;
  }

  const dummyCtx: any = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: "admin-tester",
    membershipId: "membership-tester",
    role: "OWNER",
  };

  console.log("==================================================");
  console.log("1. TESTING TOMBSTONE PROTECTION ON LEAVE REQUESTS");
  console.log("==================================================");

  // Find an existing leave synced from Google Sheets
  const sampleLeave = await prisma.studioLeaveRequest.findFirst({
    where: {
      tenantId: tenant.id,
      sourceSystem: "GOOGLE_SHEETS",
      deletedAt: null,
    },
  });

  if (!sampleLeave) {
    console.log("No active Google Sheets leave found to test soft-delete.");
  } else {
    console.log(`Selected leave to soft-delete: ID ${sampleLeave.id}, SourceRecordId: ${sampleLeave.sourceRecordId}`);

    // Soft delete it
    await prisma.studioLeaveRequest.update({
      where: { id: sampleLeave.id },
      data: { deletedAt: new Date(), deletedById: dummyCtx.membershipId },
    });
    console.log("✓ Soft-deleted sample leave in database.");

    // Re-run Google Sheets live sync!
    console.log("Re-syncing from live Google Sheet CSV...");
    const leaveSyncRes = await syncLiveLeaveSheet(dummyCtx);
    console.log("Sync Result:", leaveSyncRes);

    // Verify it is STILL deleted and was NOT resurrected!
    const checkLeave = await prisma.studioLeaveRequest.findUnique({
      where: { id: sampleLeave.id },
    });

    if (checkLeave && checkLeave.deletedAt !== null) {
      console.log("🎯 SUCCESS: Tombstone Shield worked! The leave request remained deleted (deletedAt is not null).");
      console.log(`Skipped Tombstones Count: ${leaveSyncRes.skippedTombstonesCount}`);
    } else {
      console.error("❌ FAILED: The leave was resurrected!");
    }

    // Clean up test: restore it so user keeps all data intact
    await prisma.studioLeaveRequest.update({
      where: { id: sampleLeave.id },
      data: { deletedAt: null, deletedById: null },
    });
    console.log("Restored sample leave back to active for clean state.");
  }

  console.log("\n==================================================");
  console.log("2. TESTING TOMBSTONE PROTECTION ON VENDOR CRM");
  console.log("==================================================");

  const sampleVendor = await prisma.studioVendor.findFirst({
    where: {
      tenantId: tenant.id,
      sourceSystem: "GOOGLE_SHEETS",
      status: { not: "DELETED" },
    },
  });

  if (!sampleVendor) {
    console.log("No active Google Sheets vendor found.");
  } else {
    console.log(`Selected vendor to tombstone: ID ${sampleVendor.id}, Name: ${sampleVendor.name}`);

    // Mark deleted
    await prisma.studioVendor.update({
      where: { id: sampleVendor.id },
      data: { status: "DELETED" },
    });
    console.log("✓ Marked vendor status as DELETED.");

    // Re-run Google Sheets live sync!
    console.log("Re-syncing from live Google Sheet CSV...");
    const vendorSyncRes = await syncLiveVendorSheet(dummyCtx);
    console.log("Sync Result:", vendorSyncRes);

    // Verify it is STILL DELETED and was NOT recreated!
    const checkVendor = await prisma.studioVendor.findUnique({
      where: { id: sampleVendor.id },
    });

    if (checkVendor && checkVendor.status === "DELETED") {
      console.log("🎯 SUCCESS: Tombstone Shield worked! Vendor remained DELETED and was NOT recreated or overwritten.");
      console.log(`Skipped Tombstones Count: ${vendorSyncRes.skippedTombstonesCount}`);
    } else {
      console.error("❌ FAILED: The vendor was resurrected!");
    }

    // Clean up test: restore back to ACTIVE
    await prisma.studioVendor.update({
      where: { id: sampleVendor.id },
      data: { status: "ACTIVE" },
    });
    console.log("Restored sample vendor back to ACTIVE for clean state.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
