import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  calculateHaversineDistanceMeters,
  evaluateGeofence,
  executeSiteCheckIn,
  executeSiteCheckOut,
  exportSiteVisitsToCsv,
} from "../src/server/modules/visits/service";
import { transitionTaskStatus } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskWorkflowStatus } from "@prisma/client";

describe("Phase 2 & Phase 3: Site Visits Geofence, Concurrency, and Task Workflow Tests", () => {
  let tenant1: any;
  let ananyaCtx: TenantContext;
  let tanyaCtx: TenantContext;
  let testSite: any;
  let visit1: any;
  let visit2: any;
  let ananyaTask: any;

  before(async () => {
    tenant1 = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant1);

    const ananyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, role: { in: [TenantRole.EMPLOYEE, TenantRole.PROJECT_MANAGER] }, isActive: true },
      include: { user: true, employee: true },
    });
    assert.ok(ananyaMember, "Active employee member must exist");

    const tanyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, role: { in: [TenantRole.OWNER, TenantRole.ADMIN] }, isActive: true },
      include: { user: true, employee: true },
    });
    assert.ok(tanyaMember, "Active owner/admin member must exist");

    ananyaCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ananyaMember.userId,
      userEmail: ananyaMember.user.email,
      userFullName: ananyaMember.user.fullName,
      membershipId: ananyaMember.id,
      employeeId: ananyaMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    tanyaCtx = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: tanyaMember.userId,
      userEmail: tanyaMember.user.email,
      userFullName: tanyaMember.user.fullName,
      membershipId: tanyaMember.id,
      employeeId: tanyaMember.employee?.employeeId ?? null,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: tenant1.timezone,
      currency: tenant1.currency,
    };

    let project = await prisma.project.findFirst({ where: { tenantId: tenant1.id } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          tenantId: tenant1.id,
          code: "TEST-PRJ-01",
          name: "Test Architectural Project",
          status: "ACTIVE",
        },
      });
    }

    testSite = await prisma.site.findFirst({ where: { projectId: project.id } });
    if (!testSite) {
      testSite = await prisma.site.create({
        data: {
          tenantId: tenant1.id,
          projectId: project.id,
          name: "Test Site Alpha",
          address: "100 Marine Drive, Mumbai",
          latitude: 18.7758,
          longitude: 72.8596,
          radiusMeters: 150,
        },
      });
    } else {
      testSite = await prisma.site.update({
        where: { id: testSite.id },
        data: { latitude: 18.7758, longitude: 72.8596, radiusMeters: 150 },
      });
    }

    // Clean up any stale active visits for the test employee
    await prisma.siteVisit.deleteMany({
      where: { tenantId: tenant1.id, employeeId: ananyaMember.id },
    });

    // Create 2 test visits for concurrency testing
    visit1 = await prisma.siteVisit.create({
      data: {
        tenantId: tenant1.id,
        projectId: project.id,
        siteId: testSite.id,
        employeeId: ananyaMember.id,
        purpose: "Concurrency Test Visit 1",
        scheduledTime: new Date(),
      },
    });

    visit2 = await prisma.siteVisit.create({
      data: {
        tenantId: tenant1.id,
        projectId: project.id,
        siteId: testSite.id,
        employeeId: ananyaMember.id,
        purpose: "Concurrency Test Visit 2",
        scheduledTime: new Date(),
      },
    });

    // Create task assigned to Ananya
    ananyaTask = await prisma.task.create({
      data: {
        tenantId: tenant1.id,
        projectId: project.id,
        title: "Test Deliverable Approval Isolation",
        assigneeId: ananyaMember.id,
        creatorId: tanyaMember.id,
        status: TaskWorkflowStatus.IN_REVIEW,
      },
    });
  });

  test("1. Haversine Distance Calculation & Geofence Heuristics", () => {
    // Alibaug site: ~18.7758, 72.8596
    const distExact = calculateHaversineDistanceMeters(18.7758, 72.8596, 18.7758, 72.8596);
    assert.equal(distExact, 0);

    // Within Radius: d=20m, a=30m, r=150m -> d+a = 50 <= 150 -> WITHIN_RADIUS
    const gWithin = evaluateGeofence(20, 30, 150, 100);
    assert.equal(gWithin, "WITHIN_RADIUS");

    // Outside Radius: d=400m, a=20m, r=150m -> d-a = 380 > 150 -> OUTSIDE_RADIUS
    const gOutside = evaluateGeofence(400, 20, 150, 100);
    assert.equal(gOutside, "OUTSIDE_RADIUS");

    // Poor Accuracy: accuracy 150m exceeds threshold 100m -> UNCERTAIN
    const gUncertain = evaluateGeofence(50, 150, 150, 100);
    assert.equal(gUncertain, "UNCERTAIN");
  });

  test("2. Concurrency Lock: Exactly 1 active visit per employee at any time", async () => {
    // 1. Check in to Visit 1 -> succeeds
    const checkIn1 = await executeSiteCheckIn(ananyaCtx, {
      visitId: visit1.id,
      latitude: 18.7758,
      longitude: 72.8596,
      accuracyMeters: 20,
      idempotencyKey: `idem-v1-${Date.now()}`,
    });
    assert.equal(checkIn1.success, true);
    assert.equal(checkIn1.assessment, "WITHIN_RADIUS");

    // 2. Attempt to check in to Visit 2 while Visit 1 is ACTIVE -> Must throw concurrency conflict!
    await assert.rejects(
      async () => {
        await executeSiteCheckIn(ananyaCtx, {
          visitId: visit2.id,
          latitude: 18.7758,
          longitude: 72.8596,
          accuracyMeters: 20,
          idempotencyKey: `idem-v2-${Date.now()}`,
        });
      },
      (err: any) => {
        return err.message.includes("Concurrency Conflict");
      },
      "Must reject simultaneous active visit check-ins for the same employee"
    );

    // 3. Check out of Visit 1
    const checkOut1 = await executeSiteCheckOut(ananyaCtx, {
      visitId: visit1.id,
      idempotencyKey: `idem-out1-${Date.now()}`,
      findings: "PCC excavation approved on site.",
    });
    assert.equal(checkOut1.success, true);
    assert.equal(checkOut1.visit.operationalState, "CHECKED_OUT");

    // 4. Now Visit 2 can be checked in
    const checkIn2 = await executeSiteCheckIn(ananyaCtx, {
      visitId: visit2.id,
      isLocationUnavailable: true,
      failureReason: "Inspecting deep basement shaft with zero GPS signal",
      idempotencyKey: `idem-v2-ok-${Date.now()}`,
    });
    assert.equal(checkIn2.success, true);
    assert.equal(checkIn2.assessment, "LOCATION_UNAVAILABLE");

    // Clean up Visit 2
    await executeSiteCheckOut(ananyaCtx, {
      visitId: visit2.id,
      idempotencyKey: `idem-out2-${Date.now()}`,
    });
  });

  test("3. Task Workflow & Forbidden Self-Approval", async () => {
    // Ananya (assignee) attempts to self-approve her task in review -> Must throw ForbiddenException!
    await assert.rejects(
      async () => {
        await transitionTaskStatus(ananyaCtx, ananyaTask.id, TaskWorkflowStatus.COMPLETED);
      },
      (err: any) => {
        return err.name === "ForbiddenException" && err.message.includes("Self-approval is forbidden");
      },
      "Assignee must not be permitted to self-approve their own deliverable"
    );

    // Partner Tanya (Owner/Reviewer) approves Ananya's deliverable -> Succeeds!
    const approved = await transitionTaskStatus(tanyaCtx, ananyaTask.id, TaskWorkflowStatus.COMPLETED);
    assert.equal(approved.status, TaskWorkflowStatus.COMPLETED);
  });

  test("4. Formula Injection Protection on CSV Export", async () => {
    const csv = await exportSiteVisitsToCsv(tanyaCtx);
    assert.ok(csv.includes("Visit ID,Employee ID,Employee Name"));
    assert.ok(csv.includes("WITHIN_RADIUS"));
    // Ensure no raw formula characters start unquoted cells
    const lines = csv.split("\n");
    for (const line of lines) {
      const cells = line.split(",");
      for (const cell of cells) {
        if (cell.startsWith('"=')) {
          assert.ok(cell.startsWith("\"'="), `Formula injection unprotected: ${cell}`);
        }
      }
    }
  });
});
