import { prisma } from "../../db/prisma";
import { TenantContext } from "../../tenancy/context";
import {
  SiteVisitOperationalState,
  SiteVisitEventType,
  GeofenceAssessment,
  SiteVisitReviewDecision,
} from "@prisma/client";

/**
 * Calculates Haversine great-circle distance between two GPS coordinates in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Heuristic Geofence Assessment:
 * - With distance d, accuracy a, and site radius r:
 *   - If poor accuracy a > threshold: UNCERTAIN
 *   - If d + a <= r: WITHIN_RADIUS
 *   - If d - a > r: OUTSIDE_RADIUS
 *   - Overlap: UNCERTAIN
 */
export function evaluateGeofence(
  distanceMeters: number | null,
  accuracyMeters: number | null,
  radiusMeters: number,
  accuracyThresholdMeters: number
): GeofenceAssessment {
  if (distanceMeters === null || accuracyMeters === null) {
    return GeofenceAssessment.UNCERTAIN;
  }

  // If reported sensor accuracy exceeds the acceptable threshold
  if (accuracyMeters > accuracyThresholdMeters) {
    return GeofenceAssessment.UNCERTAIN;
  }

  const d = distanceMeters;
  const a = accuracyMeters;
  const r = radiusMeters;

  if (d + a <= r) {
    return GeofenceAssessment.WITHIN_RADIUS;
  }

  if (d - a > r) {
    return GeofenceAssessment.OUTSIDE_RADIUS;
  }

  return GeofenceAssessment.UNCERTAIN;
}

export interface CheckInParams {
  visitId: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  clientCaptureTime?: Date;
  idempotencyKey: string;
  isLocationUnavailable?: boolean;
  failureReason?: string;
}

/**
 * Execute employee site visit check-in with strict concurrency locking and geofence evaluation
 */
export async function executeSiteCheckIn(ctx: TenantContext, params: CheckInParams) {
  const {
    visitId,
    latitude,
    longitude,
    accuracyMeters,
    clientCaptureTime,
    idempotencyKey,
    isLocationUnavailable,
    failureReason,
  } = params;

  // 1. Idempotency Check
  const existingEvent = await prisma.siteVisitEvent.findFirst({
    where: {
      tenantId: ctx.tenantId,
      idempotencyKey,
    },
  });

  if (existingEvent) {
    return {
      success: true,
      event: existingEvent,
      assessment: existingEvent.geofenceAssessment,
      distanceMeters: existingEvent.calculatedDistanceMeters,
      isReplay: true,
    };
  }

  // 2. Concurrency Check: Max 1 active visit per employee at any time
  const existingActiveVisit = await prisma.siteVisit.findFirst({
    where: {
      tenantId: ctx.tenantId,
      employeeId: ctx.membershipId,
      operationalState: SiteVisitOperationalState.ACTIVE,
    },
    include: { site: true, project: true },
  });

  if (existingActiveVisit && existingActiveVisit.id !== visitId) {
    throw new Error(
      `Concurrency Conflict: You currently have an active site visit at '${existingActiveVisit.site.name}' (${existingActiveVisit.project.code}). Check out of that visit before checking in elsewhere.`
    );
  }

  // 3. Find and validate targeted visit
  const visit = await prisma.siteVisit.findFirst({
    where: {
      id: visitId,
      tenantId: ctx.tenantId,
    },
    include: { site: true },
  });

  if (!visit) {
    throw new Error("Site visit record not found in this studio workspace");
  }

  if (visit.operationalState === SiteVisitOperationalState.ACTIVE) {
    throw new Error("This site visit is already active.");
  }

  if (visit.operationalState === SiteVisitOperationalState.CHECKED_OUT) {
    throw new Error("This site visit has already been concluded and checked out.");
  }

  // 4. Calculate Distance & Geofence
  let distanceMeters: number | null = null;
  let assessment: GeofenceAssessment = GeofenceAssessment.LOCATION_UNAVAILABLE;
  let resolvedFailureReason = failureReason || null;

  if (isLocationUnavailable) {
    // Explicit location-unavailable exception from the user
    if (!resolvedFailureReason) {
      resolvedFailureReason = "Location unavailable as reported by field device.";
    }
    assessment = GeofenceAssessment.LOCATION_UNAVAILABLE;
  } else if (latitude === undefined || longitude === undefined) {
    // GPS coordinates not provided (e.g. browser permission denied, device has no GPS)
    // Gracefully fall back instead of blocking the check-in
    resolvedFailureReason = resolvedFailureReason || "GPS location was unavailable at time of check-in.";
    assessment = GeofenceAssessment.LOCATION_UNAVAILABLE;
  } else {
    // Valid GPS coordinates received — calculate distance & geofence
    if (visit.site.latitude !== null && visit.site.longitude !== null) {
      distanceMeters = calculateHaversineDistanceMeters(
        latitude,
        longitude,
        visit.site.latitude,
        visit.site.longitude
      );

      assessment = evaluateGeofence(
        distanceMeters,
        accuracyMeters ?? 50,
        visit.site.radiusMeters,
        visit.site.accuracyThresholdMeters
      );
    } else {
      // Site has no GPS anchor — cannot calculate geofence, but still store employee coords
      assessment = GeofenceAssessment.UNCERTAIN;
    }
  }

  const serverReceiptTime = new Date();

  // 5. Transactional commit: Save event + update visit state
  return await prisma.$transaction(async (tx) => {
    const event = await tx.siteVisitEvent.create({
      data: {
        tenantId: ctx.tenantId,
        visitId: visit.id,
        eventType: SiteVisitEventType.CHECK_IN,
        actorId: ctx.membershipId,
        serverReceiptTime,
        clientCaptureTime: clientCaptureTime || serverReceiptTime,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracyMeters: accuracyMeters ?? null,
        calculatedDistanceMeters: distanceMeters,
        geofenceAssessment: assessment,
        failureReason: resolvedFailureReason,
        idempotencyKey,
        siteCenterLat: visit.site.latitude,
        siteCenterLng: visit.site.longitude,
        siteRadiusMeters: visit.site.radiusMeters,
      },
    });

    const updatedVisit = await tx.siteVisit.update({
      where: { id: visit.id },
      data: {
        operationalState: SiteVisitOperationalState.ACTIVE,
      },
    });

    return {
      success: true,
      event,
      visit: updatedVisit,
      distanceMeters,
      assessment,
    };
  });
}

export interface CheckOutParams {
  visitId: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  idempotencyKey: string;
  findings?: string;
  nextActions?: string;
}

/**
 * Execute employee site visit check-out
 */
export async function executeSiteCheckOut(ctx: TenantContext, params: CheckOutParams) {
  const { visitId, latitude, longitude, accuracyMeters, idempotencyKey, findings, nextActions } = params;

  const visit = await prisma.siteVisit.findFirst({
    where: {
      id: visitId,
      tenantId: ctx.tenantId,
    },
    include: { site: true },
  });

  if (!visit) {
    throw new Error("Site visit record not found");
  }

  if (visit.operationalState !== SiteVisitOperationalState.ACTIVE) {
    throw new Error("Can only check out of an ACTIVE visit");
  }

  let distanceMeters: number | null = null;
  let assessment: GeofenceAssessment = GeofenceAssessment.UNCERTAIN;

  if (latitude !== undefined && longitude !== undefined && visit.site.latitude !== null && visit.site.longitude !== null) {
    distanceMeters = calculateHaversineDistanceMeters(latitude, longitude, visit.site.latitude, visit.site.longitude);
    assessment = evaluateGeofence(
      distanceMeters,
      accuracyMeters ?? 50,
      visit.site.radiusMeters,
      visit.site.accuracyThresholdMeters
    );
  }

  const serverReceiptTime = new Date();

  return await prisma.$transaction(async (tx) => {
    const event = await tx.siteVisitEvent.create({
      data: {
        tenantId: ctx.tenantId,
        visitId: visit.id,
        eventType: SiteVisitEventType.CHECK_OUT,
        actorId: ctx.membershipId,
        serverReceiptTime,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracyMeters: accuracyMeters ?? null,
        calculatedDistanceMeters: distanceMeters,
        geofenceAssessment: assessment,
        idempotencyKey,
      },
    });

    const updatedVisit = await tx.siteVisit.update({
      where: { id: visit.id },
      data: {
        operationalState: SiteVisitOperationalState.CHECKED_OUT,
        findings: findings || visit.findings,
        nextActions: nextActions || visit.nextActions,
        submittedReportTime: serverReceiptTime,
      },
    });

    return {
      success: true,
      event,
      visit: updatedVisit,
    };
  });
}

export interface LocationPingParams {
  visitId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  clientCaptureTime?: Date;
  note?: string;
}

/**
 * Record a location tracking waypoint / breadcrumb during an active site visit
 */
export async function recordSiteVisitLocationPing(ctx: TenantContext, params: LocationPingParams) {
  const { visitId, latitude, longitude, accuracyMeters, clientCaptureTime, note } = params;

  const visit = await prisma.siteVisit.findFirst({
    where: {
      id: visitId,
      tenantId: ctx.tenantId,
    },
    include: { site: true },
  });

  if (!visit) {
    throw new Error("Site visit record not found");
  }

  if (visit.operationalState !== SiteVisitOperationalState.ACTIVE) {
    throw new Error("Location tracking pings can only be recorded while a site visit is ACTIVE.");
  }

  const isAssigned = visit.employeeId === ctx.membershipId;
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!isAssigned && !isPrivileged) {
    throw new Error("You are not authorized to log location for this site visit.");
  }

  let distanceMeters: number | null = null;
  let assessment: GeofenceAssessment = GeofenceAssessment.UNCERTAIN;

  if (visit.site.latitude !== null && visit.site.longitude !== null) {
    distanceMeters = calculateHaversineDistanceMeters(
      latitude,
      longitude,
      visit.site.latitude,
      visit.site.longitude
    );

    assessment = evaluateGeofence(
      distanceMeters,
      accuracyMeters ?? 50,
      visit.site.radiusMeters,
      visit.site.accuracyThresholdMeters
    );
  }

  const serverReceiptTime = new Date();
  const idempotencyKey = `track-${visitId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const event = await prisma.siteVisitEvent.create({
    data: {
      tenantId: ctx.tenantId,
      visitId: visit.id,
      eventType: SiteVisitEventType.EXCEPTION,
      actorId: ctx.membershipId,
      serverReceiptTime,
      clientCaptureTime: clientCaptureTime || serverReceiptTime,
      latitude,
      longitude,
      accuracyMeters: accuracyMeters ?? null,
      calculatedDistanceMeters: distanceMeters,
      geofenceAssessment: assessment,
      failureReason: note ? `LOCATION_TRACK: ${note}` : "LOCATION_TRACK: Live GPS waypoint",
      idempotencyKey,
      siteCenterLat: visit.site.latitude,
      siteCenterLng: visit.site.longitude,
      siteRadiusMeters: visit.site.radiusMeters,
    },
  });

  return {
    success: true,
    event,
    distanceMeters,
    assessment,
  };
}

/**
 * Admin Review Decision on field report
 */
export async function reviewSiteVisit(
  ctx: TenantContext,
  visitId: string,
  decision: SiteVisitReviewDecision,
  comment?: string
) {
  return await prisma.siteVisit.update({
    where: { id: visitId },
    data: {
      reviewDecision: decision,
      reviewComment: comment,
      reviewerId: ctx.membershipId,
      reviewedAt: new Date(),
    },
  });
}

/**
 * Sanitizes CSV cell values to prevent Formula Injection (OWASP mitigation)
 */
function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  // If first character is =, +, -, @, prefix with single quote '
  if (/^[=+\-@]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export authorized site visit records to CSV with formula injection protection
 */
export async function exportSiteVisitsToCsv(ctx: TenantContext): Promise<string> {
  const visits = await prisma.siteVisit.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      project: true,
      site: true,
      employee: {
        include: { user: true, employee: true },
      },
      events: {
        orderBy: { serverReceiptTime: "asc" },
      },
    },
    orderBy: { scheduledTime: "desc" },
  });

  const headers = [
    "Visit ID",
    "Employee ID",
    "Employee Name",
    "Project Code",
    "Project Name",
    "Site Name",
    "Scheduled Time (UTC)",
    "Operational State",
    "Check-In Server Time",
    "Distance (Meters)",
    "Accuracy (Meters)",
    "Geofence Assessment",
    "GPS Waypoints Count",
    "Latest Track Coords",
    "Admin Review State",
    "Map Link",
  ];

  const rows = visits.map((v) => {
    const checkInEvent = v.events.find((e) => e.eventType === SiteVisitEventType.CHECK_IN);
    const trackingEvents = v.events.filter(
      (e) => e.eventType === SiteVisitEventType.EXCEPTION && e.latitude !== null
    );
    const latestEvent = v.events[v.events.length - 1];
    const latestCoords =
      latestEvent?.latitude && latestEvent?.longitude
        ? `${latestEvent.latitude.toFixed(5)}, ${latestEvent.longitude.toFixed(5)}`
        : "N/A";

    const mapLink =
      checkInEvent?.latitude && checkInEvent?.longitude
        ? `https://www.google.com/maps?q=${checkInEvent.latitude},${checkInEvent.longitude}`
        : "N/A";

    return [
      sanitizeCsvCell(v.id),
      sanitizeCsvCell(v.employee.employee?.employeeId ?? "N/A"),
      sanitizeCsvCell(v.employee.user.fullName),
      sanitizeCsvCell(v.project.code),
      sanitizeCsvCell(v.project.name),
      sanitizeCsvCell(v.site.name),
      sanitizeCsvCell(v.scheduledTime.toISOString()),
      sanitizeCsvCell(v.operationalState),
      sanitizeCsvCell(checkInEvent?.serverReceiptTime.toISOString() ?? "N/A"),
      sanitizeCsvCell(checkInEvent?.calculatedDistanceMeters ?? "N/A"),
      sanitizeCsvCell(checkInEvent?.accuracyMeters ?? "N/A"),
      sanitizeCsvCell(checkInEvent?.geofenceAssessment ?? "N/A"),
      sanitizeCsvCell(trackingEvents.length),
      sanitizeCsvCell(latestCoords),
      sanitizeCsvCell(v.reviewDecision),
      sanitizeCsvCell(mapLink),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export interface CreateSiteVisitInput {
  projectId: string;
  siteId?: string;
  customSiteName?: string;
  customSiteAddress?: string;
  customSiteLatitude?: number;
  customSiteLongitude?: number;
  employeeId: string;
  purpose: string;
  scheduledTime: Date;
}

/**
 * Assign and schedule a new site visit (Owner, Admin, or Project Manager)
 */
export async function createSiteVisit(ctx: TenantContext, input: CreateSiteVisitInput) {
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!isPrivileged) {
    const isPM = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        tenantId: ctx.tenantId,
        projectManagerId: ctx.membershipId,
      },
    });
    if (!isPM) {
      throw new Error("Only studio Partners, Admins, or Project Managers can schedule and assign site visits.");
    }
  }

  let targetSiteId = input.siteId;

  if (!targetSiteId && input.customSiteName) {
    const site = await prisma.site.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        name: input.customSiteName.trim(),
        address: input.customSiteAddress?.trim() || "Project Site Location",
        latitude: input.customSiteLatitude || null,
        longitude: input.customSiteLongitude || null,
        radiusMeters: 150,
        accuracyThresholdMeters: 100,
      },
    });
    targetSiteId = site.id;
  }

  if (!targetSiteId) {
    throw new Error("Please select an existing project site or provide a site location name.");
  }

  const visit = await prisma.siteVisit.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: input.projectId,
      siteId: targetSiteId,
      employeeId: input.employeeId,
      purpose: input.purpose.trim(),
      scheduledTime: input.scheduledTime,
      operationalState: SiteVisitOperationalState.SCHEDULED,
    },
    include: {
      site: true,
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      employee: {
        include: {
          user: true,
          employee: true,
        },
      },
    },
  });

  // Create notification for assigned employee
  try {
    await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        recipientId: input.employeeId,
        title: "New Site Visit Assigned",
        message: `You were assigned to visit '${visit.site.name}' for ${visit.project.code}: "${visit.purpose}" on ${new Date(
          input.scheduledTime
        ).toLocaleString("en-IN", { timeZone: ctx.timezone || "Asia/Kolkata" })}.`,
        link: `/w/${ctx.tenantSlug}/visits`,
        isRead: false,
      },
    });
  } catch (err) {
    console.error("Failed to create site visit assignment notification:", err);
  }

  return visit;
}

export interface UpdateSiteVisitInput {
  visitId: string;
  purpose?: string;
  scheduledTime?: Date;
  findings?: string;
  nextActions?: string;
  siteName?: string;
  siteAddress?: string;
  siteLatitude?: number;
  siteLongitude?: number;
}

/**
 * Update site visit details, meeting minutes, observations, and site coordinates
 */
export async function updateSiteVisit(ctx: TenantContext, input: UpdateSiteVisitInput) {
  const visit = await prisma.siteVisit.findFirst({
    where: {
      id: input.visitId,
      tenantId: ctx.tenantId,
    },
    include: { site: true },
  });

  if (!visit) {
    throw new Error("Site visit not found.");
  }

  const isAssigned = visit.employeeId === ctx.membershipId;
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";

  if (!isAssigned && !isPrivileged) {
    throw new Error("You do not have permission to update this site visit.");
  }

  const updated = await prisma.siteVisit.update({
    where: { id: input.visitId },
    data: {
      purpose: input.purpose !== undefined ? input.purpose : visit.purpose,
      scheduledTime: input.scheduledTime !== undefined ? input.scheduledTime : visit.scheduledTime,
      findings: input.findings !== undefined ? input.findings : visit.findings,
      nextActions: input.nextActions !== undefined ? input.nextActions : visit.nextActions,
    },
    include: {
      site: true,
      project: { select: { id: true, code: true, name: true } },
      employee: { include: { user: true, employee: true } },
    },
  });

  // Allow updating site coordinates, name, and address (e.g. calibrating to current user location)
  const siteUpdateData: any = {};
  if (input.siteAddress) siteUpdateData.address = input.siteAddress;
  if (input.siteName) siteUpdateData.name = input.siteName;
  if (typeof input.siteLatitude === "number") siteUpdateData.latitude = input.siteLatitude;
  if (typeof input.siteLongitude === "number") siteUpdateData.longitude = input.siteLongitude;

  if (Object.keys(siteUpdateData).length > 0) {
    const updatedSite = await prisma.site.update({
      where: { id: visit.siteId },
      data: siteUpdateData,
    });

    // If site coordinates were calibrated / updated, recalculate distance & geofence for this visit's events
    if (typeof input.siteLatitude === "number" && typeof input.siteLongitude === "number") {
      const events = await prisma.siteVisitEvent.findMany({
        where: { visitId: visit.id, tenantId: ctx.tenantId },
      });

      for (const ev of events) {
        if (ev.latitude !== null && ev.longitude !== null) {
          const dist = calculateHaversineDistanceMeters(
            ev.latitude,
            ev.longitude,
            input.siteLatitude,
            input.siteLongitude
          );
          const assess = evaluateGeofence(
            dist,
            ev.accuracyMeters ?? 50,
            updatedSite.radiusMeters,
            updatedSite.accuracyThresholdMeters
          );

          await prisma.siteVisitEvent.update({
            where: { id: ev.id },
            data: {
              calculatedDistanceMeters: dist,
              geofenceAssessment: assess,
              siteCenterLat: input.siteLatitude,
              siteCenterLng: input.siteLongitude,
            },
          });
        }
      }
    }
  }

  // Refetch the visit with updated site and events
  return await prisma.siteVisit.findUnique({
    where: { id: input.visitId },
    include: {
      site: true,
      project: { select: { id: true, code: true, name: true } },
      employee: { include: { user: true, employee: true } },
      events: { orderBy: { serverReceiptTime: "desc" } },
    },
  });
}

