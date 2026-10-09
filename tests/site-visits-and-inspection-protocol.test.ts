import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  createSiteVisit,
  executeSiteCheckIn,
  executeSiteCheckOut,
  reviewSiteVisit,
} from "../src/server/modules/visits/service";
import { TenantContext } from "../src/server/tenancy/context";

test("Site Visits & Enterprise Inspection Protocol Test Suite", async (t) => {
  // Setup test tenant context
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "100percentdesign" },
  });
  assert.ok(tenant, "Default tenant must exist");

  const ownerMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, role: "OWNER" },
  });
  assert.ok(ownerMembership, "Owner membership must exist");

  const employeeMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, role: "EMPLOYEE" },
  });
  assert.ok(employeeMembership, "Employee membership must exist");

  const project = await prisma.project.findFirst({
    where: { tenantId: tenant.id, status: "ACTIVE" },
  });
  assert.ok(project, "Active project must exist");

  const ownerCtx: TenantContext = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    userId: ownerMembership.userId,
    userEmail: "owner@100percentdesign.com",
    userFullName: "Ar. Saksham Lanjewar",
    membershipId: ownerMembership.id,
    employeeId: "EMP-001",
    role: "OWNER",
    hasFinanceAccess: true,
    timezone: tenant.timezone,
    currency: tenant.currency,
  };

  const employeeCtx: TenantContext = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    userId: employeeMembership.userId,
    userEmail: "employee@100percentdesign.com",
    userFullName: "Ananya Sharma",
    membershipId: employeeMembership.id,
    employeeId: "EMP-003",
    role: "EMPLOYEE",
    hasFinanceAccess: false,
    timezone: tenant.timezone,
    currency: tenant.currency,
  };

  let testVisitId = "";
  let testSiteId = "";

  await t.test("1. Schedule & Assign Site Visit with Custom Radius, Typology, and Checklist", async () => {
    const scheduledTime = new Date(Date.now() + 3600000);

    const visit = await createSiteVisit(ownerCtx, {
      projectId: project.id,
      customSiteName: "Enterprise Test Campus Site",
      customSiteAddress: "Sector 14, Hinjewadi Phase 2, Pune",
      customSiteLatitude: 18.5912,
      customSiteLongitude: 73.7389,
      customSiteRadiusMeters: 350,
      customSiteLandmarkNotes: "Gate 4, opposite substation",
      customSiteGoogleMapsUrl: "https://maps.google.com/?q=18.5912,73.7389",
      employeeId: employeeMembership.id,
      purpose: "Structural Quality Audit & Footing Inspection",
      scheduledTime,
      inspectionType: "STRUCTURAL",
      priority: "HIGH",
      attendeesJson: [
        { name: "Kunal Sharma", role: "RCC Contractor", phone: "+919876543210" },
        { name: "Ar. Priya Nair", role: "Structural Consultant", phone: "+919876543211" },
      ],
      checklistItemsJson: [
        { item: "Verify column footing reinforcement spacing against Drawing R2", checked: false },
        { item: "Inspect shuttering line, level, and cover blocks", checked: false },
      ],
    });

    assert.ok(visit.id, "Visit should be created");
    assert.equal(visit.inspectionType, "STRUCTURAL");
    assert.equal(visit.priority, "HIGH");
    assert.equal(visit.operationalState, "SCHEDULED");
    assert.equal(visit.site.radiusMeters, 350);
    assert.equal(visit.site.landmarkNotes, "Gate 4, opposite substation");

    testVisitId = visit.id;
    testSiteId = visit.siteId;
  });

  await t.test("2. Execute Site Check-In with Audited Locality Address", async () => {
    const checkInRes = await executeSiteCheckIn(employeeCtx, {
      visitId: testVisitId,
      latitude: 18.5913,
      longitude: 73.7390,
      accuracyMeters: 15.0,
      clientCaptureTime: new Date(),
      idempotencyKey: `checkin-test-${Date.now()}`,
      checkInAddress: "Hinjewadi Phase 2, Pune, Maharashtra",
    });

    assert.equal(checkInRes.success, true);
    assert.equal(checkInRes.assessment, "WITHIN_RADIUS");
    assert.ok(checkInRes.distanceMeters! <= 350, "Distance should be within 350m geofence");

    // Verify database state
    const visitInDb = await prisma.siteVisit.findUnique({
      where: { id: testVisitId },
    });
    assert.equal(visitInDb?.operationalState, "ACTIVE");
    assert.equal(visitInDb?.checkInAddress, "Hinjewadi Phase 2, Pune, Maharashtra");
  });

  await t.test("3. Execute Site Check-Out with Photo Evidence, Snags Register, Weather, and Sign-Off", async () => {
    const checkOutRes = await executeSiteCheckOut(employeeCtx, {
      visitId: testVisitId,
      latitude: 18.5914,
      longitude: 73.7391,
      accuracyMeters: 12.0,
      idempotencyKey: `checkout-test-${Date.now()}`,
      findings: "Verified rebar spacing on Grid B-3. Concrete cube test specimens taken. Two minor snags flagged.",
      nextActions: "Ensure 48h water curing before shuttering removal.",
      checkOutAddress: "Main Security Gate, Hinjewadi Phase 2, Pune",
      weather: "Sunny 32°C (Optimal Curing)",
      photosJson: [
        {
          url: "data:image/png;base64,mockImageData1",
          caption: "Column B3 Rebar spacing checked",
          tag: "PROGRESS_PHOTO",
          timestamp: new Date().toISOString(),
        },
        {
          url: "data:image/png;base64,mockImageData2",
          caption: "Cover block displacement at footer edge",
          tag: "QUALITY_ISSUE",
          timestamp: new Date().toISOString(),
        },
      ],
      snagsJson: [
        {
          title: "Cover block displacement on footing F2",
          severity: "MAJOR",
          contractorResponsible: "Kunal Sharma",
          targetDate: new Date().toISOString().split("T")[0],
          status: "OPEN",
        },
      ],
      checklistItemsJson: [
        { item: "Verify column footing reinforcement spacing against Drawing R2", checked: true },
        { item: "Inspect shuttering line, level, and cover blocks", checked: true },
      ],
      contractorSignOff: {
        representativeName: "Kunal Sharma",
        phone: "+919876543210",
        signedAt: new Date().toISOString(),
      },
      voiceMemoTranscript: "All rebar spacing verified against R2. Shuttering line ok.",
    });

    assert.equal(checkOutRes.success, true);

    // Verify DB state
    const visitInDb = await prisma.siteVisit.findUnique({
      where: { id: testVisitId },
    });
    assert.equal(visitInDb?.operationalState, "CHECKED_OUT");
    assert.equal(visitInDb?.checkOutAddress, "Main Security Gate, Hinjewadi Phase 2, Pune");
    assert.equal(visitInDb?.weather, "Sunny 32°C (Optimal Curing)");
    assert.equal(visitInDb?.voiceMemoTranscript, "All rebar spacing verified against R2. Shuttering line ok.");

    const photos = visitInDb?.photosJson as any[];
    assert.equal(photos.length, 2);
    assert.equal(photos[0].tag, "PROGRESS_PHOTO");

    const snags = visitInDb?.snagsJson as any[];
    assert.equal(snags.length, 1);
    assert.equal(snags[0].severity, "MAJOR");

    const signOff = visitInDb?.contractorSignOff as any;
    assert.equal(signOff.representativeName, "Kunal Sharma");
  });

  await t.test("4. Owner/Admin Architectural Review of Inspection Report", async () => {
    const reviewRes = await reviewSiteVisit(
      ownerCtx,
      testVisitId,
      "ACCEPTED",
      "Reinforcement verified against structural drawing R2. Approved for casting."
    );

    assert.equal(reviewRes.reviewDecision, "ACCEPTED");
    assert.equal(reviewRes.reviewComment, "Reinforcement verified against structural drawing R2. Approved for casting.");
  });

  // Cleanup test visit and site
  await prisma.siteVisitEvent.deleteMany({ where: { visitId: testVisitId } });
  await prisma.siteVisit.delete({ where: { id: testVisitId } });
  await prisma.site.delete({ where: { id: testSiteId } });
});
