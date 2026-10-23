import { prisma } from "../../db/prisma";
import { TenantContext, ForbiddenException } from "../../tenancy/context";
import {
  SiteVisitOperationalState,
  SiteVisitEventType,
  GeofenceAssessment,
  SiteVisitReviewDecision,
  JourneyState,
} from "@prisma/client";
import { sendDevicePushNotification } from "../notifications/push";
import { dispatchNotification } from "../notifications/dispatch";

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
  checkInAddress?: string;
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
    checkInAddress,
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
    include: { site: true, project: true },
  });

  if (!visit) {
    throw new Error("Site visit record not found in this studio workspace");
  }

  // Lifecycle check: New site-visit check-ins are blocked on ON_HOLD, DRAFT, CANCELLED, COMPLETED, or ARCHIVED projects
  if (visit.project) {
    if (visit.project.status === "ON_HOLD") {
      throw new Error(
        `Cannot check in: Project '${visit.project.name}' is currently ON HOLD (${visit.project.holdReason || "Operational work paused"}). New check-ins are suspended until resumed.`
      );
    }
    if (visit.project.status === "DRAFT") {
      throw new Error(`Cannot check in: Project '${visit.project.name}' is currently in DRAFT status.`);
    }
    if (visit.project.status === "CANCELLED") {
      throw new Error(`Cannot check in: Project '${visit.project.name}' is CANCELLED.`);
    }
    if (visit.project.status === "COMPLETED") {
      throw new Error(`Cannot check in: Project '${visit.project.name}' is COMPLETED.`);
    }
    if (visit.project.isArchived) {
      throw new Error(`Cannot check in: Project '${visit.project.name}' is ARCHIVED.`);
    }
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

  // 5. Transactional commit: Save event + update visit state with concurrency safety
  return await prisma.$transaction(async (tx) => {
    // 1. Transactional row lock on employee membership record to serialize simultaneous check-in attempts
    await tx.$executeRawUnsafe(
      "SELECT id FROM tenant_memberships WHERE id = ? FOR UPDATE",
      ctx.membershipId
    );

    // 2. Concurrency Guard: Check if employee already has an active visit
    const concurrentActive = await tx.siteVisit.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: SiteVisitOperationalState.ACTIVE,
      },
      include: { site: true, project: true },
    });

    if (concurrentActive && concurrentActive.id !== visit.id) {
      throw new Error(
        `Concurrency Conflict: You currently have an active site visit at '${concurrentActive.site.name}' (${concurrentActive.project.code}). Check out of that visit before checking in elsewhere.`
      );
    }

    // Atomic conditional update on the targeted visit
    const updateCount = await tx.siteVisit.updateMany({
      where: {
        id: visit.id,
        tenantId: ctx.tenantId,
        operationalState: { not: SiteVisitOperationalState.ACTIVE },
      },
      data: {
        operationalState: SiteVisitOperationalState.ACTIVE,
        checkInAddress: checkInAddress || undefined,
      },
    });

    if (updateCount.count === 0) {
      throw new Error("This site visit is already active or has already been checked out.");
    }

    // Post-update verification: Employee cannot have more than 1 active visit across the tenant
    const totalActiveForEmployee = await tx.siteVisit.count({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: SiteVisitOperationalState.ACTIVE,
      },
    });

    if (totalActiveForEmployee > 1) {
      throw new Error("Concurrency Conflict: An employee cannot acquire two active site visits simultaneously.");
    }

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

    const updatedVisit = await tx.siteVisit.findUniqueOrThrow({
      where: { id: visit.id },
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
  checkOutAddress?: string;
  weather?: string;
  photosJson?: any;
  snagsJson?: any;
  checklistItemsJson?: any;
  contractorSignOff?: any;
  voiceMemoTranscript?: string;
}

/**
 * Execute employee site visit check-out
 */
export async function executeSiteCheckOut(ctx: TenantContext, params: CheckOutParams) {
  const {
    visitId,
    latitude,
    longitude,
    accuracyMeters,
    idempotencyKey,
    findings,
    nextActions,
    checkOutAddress,
    weather,
    photosJson,
    snagsJson,
    checklistItemsJson,
    contractorSignOff,
    voiceMemoTranscript,
  } = params;

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
        checkOutAddress: checkOutAddress || undefined,
        weather: weather || undefined,
        photosJson: photosJson || visit.photosJson,
        snagsJson: snagsJson || visit.snagsJson,
        checklistItemsJson: checklistItemsJson || visit.checklistItemsJson,
        contractorSignOff: contractorSignOff || visit.contractorSignOff,
        voiceMemoTranscript: voiceMemoTranscript || visit.voiceMemoTranscript,
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
  const updated = await prisma.siteVisit.update({
    where: { id: visitId },
    data: {
      reviewDecision: decision,
      reviewComment: comment,
      reviewerId: ctx.membershipId,
      reviewedAt: new Date(),
    },
    include: {
      site: true,
    },
  });

  dispatchNotification({
    tenantId: ctx.tenantId,
    recipientId: updated.employeeId,
    title: decision === SiteVisitReviewDecision.ACCEPTED ? "Site Visit Report Approved 🎉" : "Site Visit Report - Action Needed",
    message: `${ctx.userFullName} reviewed your visit to '${updated.site.name}': ${decision}.${comment ? ` Note: ${comment}` : ""}`,
    link: `/w/${ctx.tenantSlug}/visits`,
    tag: `visit-review-${visitId}`,
  }).catch(() => {});

  return updated;
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
  customSiteRadiusMeters?: number;
  customSiteLandmarkNotes?: string;
  customSiteGoogleMapsUrl?: string;
  employeeId?: string;
  employeeIds?: string[];
  purpose?: string;
  meetingAgenda?: string;
  typologyAndScope?: string;
  scheduledDate?: string;
  scheduledTime: Date | string;
  inspectionType?: string;
  priority?: string;
  taskId?: string;
  milestoneId?: string;
  attendeesJson?: any;
  checklistItemsJson?: any;
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

  // 1. Resolve Assignees (Searchable multi-select: at least 1 active, no duplicates)
  const rawIds = input.employeeIds && input.employeeIds.length > 0
    ? input.employeeIds
    : (input.employeeId ? [input.employeeId] : []);
  const targetEmployeeIds = Array.from(new Set(rawIds.filter(Boolean)));

  if (targetEmployeeIds.length === 0) {
    throw new Error("At least one active employee must be assigned to the site visit.");
  }

  const activeMemberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId: ctx.tenantId,
      id: { in: targetEmployeeIds },
      isActive: true,
    },
  });

  if (activeMemberships.length !== targetEmployeeIds.length) {
    throw new Error("One or more assigned employees are inactive or do not belong to this studio.");
  }

  // 2. Resolve / Create Site Location & Perimeter
  let targetSiteId = input.siteId;

  if (targetSiteId && (input.customSiteRadiusMeters || input.customSiteLandmarkNotes || input.customSiteGoogleMapsUrl)) {
    await prisma.site.update({
      where: { id: targetSiteId },
      data: {
        ...(input.customSiteRadiusMeters ? { radiusMeters: input.customSiteRadiusMeters } : {}),
        ...(input.customSiteLandmarkNotes ? { landmarkNotes: input.customSiteLandmarkNotes.trim() } : {}),
        ...(input.customSiteGoogleMapsUrl ? { googleMapsUrl: input.customSiteGoogleMapsUrl.trim() } : {}),
      },
    });
  }

  if (!targetSiteId && input.customSiteName) {
    const site = await prisma.site.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        name: input.customSiteName.trim(),
        address: input.customSiteAddress?.trim() || "Project Site Location",
        latitude: input.customSiteLatitude || null,
        longitude: input.customSiteLongitude || null,
        radiusMeters: input.customSiteRadiusMeters || 150,
        accuracyThresholdMeters: 100,
        landmarkNotes: input.customSiteLandmarkNotes?.trim() || null,
        googleMapsUrl: input.customSiteGoogleMapsUrl?.trim() || null,
      },
    });
    targetSiteId = site.id;
  }

  if (!targetSiteId) {
    throw new Error("Please select an existing project site or provide a site location name.");
  }

  const site = await prisma.site.findUnique({
    where: { id: targetSiteId },
  });

  if (!site || site.tenantId !== ctx.tenantId) {
    throw new Error("Target site not found or access denied.");
  }

  // 3. Freeze Destination Snapshot (Preserves historical location independently of future site edits)
  const destinationSnapshot = {
    siteId: site.id,
    name: site.name,
    address: site.address,
    latitude: site.latitude,
    longitude: site.longitude,
    radiusMeters: site.radiusMeters,
    accuracyThresholdMeters: site.accuracyThresholdMeters,
    landmarkNotes: site.landmarkNotes,
    googleMapsUrl: site.googleMapsUrl,
  };

  // 4. Default 4 QA/QC checklist items if none provided
  const canonicalChecklist = [
    { item: "Latest drawings available", checked: false },
    { item: "Inspection scope reviewed", checked: false },
    { item: "Tools/PPE prepared", checked: false },
    { item: "Access/contractor availability confirmed", checked: false },
  ];
  const finalChecklist = (input.checklistItemsJson && Array.isArray(input.checklistItemsJson) && input.checklistItemsJson.length > 0)
    ? input.checklistItemsJson
    : canonicalChecklist;

  let resolvedScheduledTime: Date;
  if (input.scheduledTime instanceof Date) {
    resolvedScheduledTime = input.scheduledTime;
  } else if (input.scheduledDate && typeof input.scheduledTime === "string" && !input.scheduledTime.includes("-")) {
    resolvedScheduledTime = new Date(`${input.scheduledDate}T${input.scheduledTime}:00`);
  } else if (input.scheduledTime) {
    resolvedScheduledTime = new Date(input.scheduledTime);
  } else {
    resolvedScheduledTime = new Date();
  }

  const resolvedPurpose = (input.purpose || input.meetingAgenda || input.typologyAndScope || "Site QA/QC Inspection").trim();

  const visit = await prisma.$transaction(async (tx) => {
    const newVisit = await tx.siteVisit.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        siteId: site.id,
        employeeId: targetEmployeeIds[0], // primary assignee for backwards compatibility
        taskId: input.taskId || null,
        milestoneId: input.milestoneId || null,
        purpose: resolvedPurpose,
        inspectionType: input.inspectionType || "ROUTINE",
        priority: input.priority || "MEDIUM",
        scheduledTime: resolvedScheduledTime,
        operationalState: SiteVisitOperationalState.SCHEDULED,
        destinationSnapshotJson: destinationSnapshot as any,
        attendeesJson: input.attendeesJson || null,
        checklistItemsJson: finalChecklist as any,
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

    // Create SiteVisitParticipant session for each assigned employee
    const createdParticipants = [];
    for (const mId of targetEmployeeIds) {
      const p = await tx.siteVisitParticipant.create({
        data: {
          tenantId: ctx.tenantId,
          visitId: newVisit.id,
          membershipId: mId,
          journeyState: JourneyState.ASSIGNED,
        },
      });
      createdParticipants.push(p);
    }

    return {
      ...newVisit,
      participants: createdParticipants,
    };
  });

  // Notify each assigned employee
  for (const mId of targetEmployeeIds) {
    try {
      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: mId,
          title: "New Site Visit Assigned 📍",
          message: `You were assigned to visit '${site.name}' for ${visit.project.code}: "${visit.purpose}" on ${new Date(
            input.scheduledTime
          ).toLocaleString("en-IN", { timeZone: ctx.timezone || "Asia/Kolkata" })}.`,
          link: `/w/${ctx.tenantSlug}/visits`,
          isRead: false,
        },
      });

      sendDevicePushNotification(
        mId,
        {
          title: "New Site Visit Assigned 📍",
          message: `You were assigned to visit '${site.name}' for ${visit.project.code}: "${visit.purpose}"`,
          link: `/w/${ctx.tenantSlug}/visits`,
          tag: `visit-${visit.id}`,
        },
        ctx.tenantId
      ).catch(() => {});
    } catch (err) {
      console.error("Failed to create site visit assignment notification:", err);
    }
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
  weather?: string;
  checklistItemsJson?: any;
  snagsJson?: any;
  photosJson?: any;
  contractorSignOff?: any;
  voiceMemoTranscript?: string;
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
      weather: input.weather !== undefined ? input.weather : visit.weather,
      checklistItemsJson: input.checklistItemsJson !== undefined ? input.checklistItemsJson : visit.checklistItemsJson,
      snagsJson: input.snagsJson !== undefined ? input.snagsJson : visit.snagsJson,
      photosJson: input.photosJson !== undefined ? input.photosJson : visit.photosJson,
      contractorSignOff: input.contractorSignOff !== undefined ? input.contractorSignOff : visit.contractorSignOff,
      voiceMemoTranscript: input.voiceMemoTranscript !== undefined ? input.voiceMemoTranscript : visit.voiceMemoTranscript,
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

// ==========================================
// INDIVIDUAL JOURNEY & INSPECTION WORKFLOW
// ==========================================

export interface TransitionJourneyParams {
  visitId: string;
  milestone: JourneyState;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  deviceTimestamp?: Date;
  exceptionNotes?: string;
}

/**
 * Transitions an individual employee's journey milestone with explicit server validation.
 * One person's progress does not complete or stop another person's tracking.
 *
 * Sequence:
 * Assigned -> Start Journey -> Arrived at Site -> Start Inspection -> Finish Inspection -> Start Return Journey -> Returned to Office / End Journey.
 *
 * NOTE: Finish Inspection ends the inspection session but leaves the journey ACTIVE!
 * End Journey stops tracking capture.
 */
export async function transitionParticipantJourney(
  ctx: TenantContext,
  visitIdOrParams: string | (TransitionJourneyParams & { transition?: string }),
  maybeParams?: any
) {
  const isPositional = typeof visitIdOrParams === "string";
  const visitId = isPositional ? visitIdOrParams : visitIdOrParams.visitId;
  const rawParams = isPositional ? (maybeParams || {}) : visitIdOrParams;
  const rawMilestone = rawParams.milestone || rawParams.transition;
  const milestoneMap: Record<string, JourneyState> = {
    START_JOURNEY: JourneyState.JOURNEY_STARTED,
    JOURNEY_STARTED: JourneyState.JOURNEY_STARTED,
    ARRIVED_AT_SITE: JourneyState.ARRIVED_AT_SITE,
    START_INSPECTION: JourneyState.INSPECTION_STARTED,
    INSPECTION_STARTED: JourneyState.INSPECTION_STARTED,
    FINISH_INSPECTION: JourneyState.INSPECTION_FINISHED,
    INSPECTION_FINISHED: JourneyState.INSPECTION_FINISHED,
    START_RETURN_JOURNEY: JourneyState.RETURN_STARTED,
    RETURN_STARTED: JourneyState.RETURN_STARTED,
    RETURNED_TO_OFFICE: JourneyState.RETURNED_OFFICE,
    RETURNED_OFFICE: JourneyState.RETURNED_OFFICE,
    END_JOURNEY: JourneyState.RETURNED_OFFICE,
    CANCEL: JourneyState.CANCELLED,
    CANCELLED: JourneyState.CANCELLED,
  };
  const milestone = (milestoneMap[rawMilestone] || rawMilestone) as JourneyState;
  const { latitude, longitude, accuracyMeters, deviceTimestamp, exceptionNotes } = rawParams;

  // 1. Locate participant record for the current user
  let participant = await prisma.siteVisitParticipant.findFirst({
    where: {
      tenantId: ctx.tenantId,
      visitId,
      membershipId: ctx.membershipId,
    },
    include: {
      visit: {
        include: { site: true, project: true },
      },
    },
  });

  // If Owner/Admin is testing or transitioning for an assigned visit, or if participant session wasn't pre-created
  if (!participant) {
    const isOwnerOrAdmin = ctx.role === "OWNER" || ctx.role === "ADMIN";
    const visitExists = await prisma.siteVisit.findFirst({
      where: { id: visitId, tenantId: ctx.tenantId },
      include: { site: true, project: true },
    });

    if (!visitExists) {
      throw new Error("Site visit record not found.");
    }

    if (visitExists.employeeId === ctx.membershipId || isOwnerOrAdmin) {
      // Auto-initialize participant session
      participant = await prisma.siteVisitParticipant.create({
        data: {
          tenantId: ctx.tenantId,
          visitId,
          membershipId: ctx.membershipId,
          journeyState: JourneyState.ASSIGNED,
        },
        include: {
          visit: {
            include: { site: true, project: true },
          },
        },
      });
    } else {
      throw new ForbiddenException("You are not an assigned participant for this site visit.");
    }
  }

  const visit = participant.visit;
  const now = new Date();
  const effectiveCaptureTime = deviceTimestamp ? new Date(deviceTimestamp) : now;
  const currentState = participant.journeyState;

  // 2. Validate state transitions
  if (currentState === JourneyState.RETURNED_OFFICE && milestone !== JourneyState.ASSIGNED) {
    throw new Error("Journey has already concluded (Returned to Office). It cannot be transitioned further.");
  }
  if (currentState === JourneyState.CANCELLED && milestone !== JourneyState.ASSIGNED) {
    throw new Error("Journey was cancelled. Only an administrator can reopen it.");
  }

  const validTransitions: Record<JourneyState, JourneyState[]> = {
    ASSIGNED: [JourneyState.JOURNEY_STARTED, JourneyState.CANCELLED],
    JOURNEY_STARTED: [JourneyState.ARRIVED_AT_SITE, JourneyState.RETURN_STARTED, JourneyState.CANCELLED],
    ARRIVED_AT_SITE: [JourneyState.INSPECTION_STARTED, JourneyState.RETURN_STARTED, JourneyState.CANCELLED],
    INSPECTION_STARTED: [JourneyState.INSPECTION_FINISHED, JourneyState.CANCELLED],
    INSPECTION_FINISHED: [JourneyState.RETURN_STARTED, JourneyState.RETURNED_OFFICE, JourneyState.INSPECTION_STARTED, JourneyState.CANCELLED],
    RETURN_STARTED: [JourneyState.RETURNED_OFFICE, JourneyState.CANCELLED],
    RETURNED_OFFICE: [],
    CANCELLED: [JourneyState.ASSIGNED],
  };

  const allowed = validTransitions[currentState] || [];
  if (!allowed.includes(milestone)) {
    throw new Error(`Invalid milestone transition: cannot transition from ${currentState} to ${milestone}.`);
  }

  // 3. Build update payload
  const updateData: any = {
    journeyState: milestone,
    updatedAt: now,
  };

  if (latitude !== undefined && longitude !== undefined) {
    updateData.lastLatitude = latitude;
    updateData.lastLongitude = longitude;
    updateData.lastAccuracyMeters = accuracyMeters ?? null;
    updateData.lastHeartbeatAt = now;
  }

  if (exceptionNotes) {
    updateData.exceptionNotes = participant.exceptionNotes
      ? `${participant.exceptionNotes}\n[${now.toISOString()}]: ${exceptionNotes}`
      : `[${now.toISOString()}]: ${exceptionNotes}`;
  }

  if (milestone === JourneyState.JOURNEY_STARTED) {
    updateData.departureTime = effectiveCaptureTime;
    updateData.isTrackingActive = true;
  } else if (milestone === JourneyState.ARRIVED_AT_SITE) {
    updateData.arrivalTime = effectiveCaptureTime;
    updateData.isTrackingActive = true; // Still active
  } else if (milestone === JourneyState.INSPECTION_STARTED) {
    updateData.inspectionStartTime = effectiveCaptureTime;
    updateData.isTrackingActive = true; // Still active
  } else if (milestone === JourneyState.INSPECTION_FINISHED) {
    updateData.inspectionEndTime = effectiveCaptureTime;
    // CRITICAL: Finishing inspection ends the inspection session, but leaves journey active!
    updateData.isTrackingActive = true;
  } else if (milestone === JourneyState.RETURN_STARTED) {
    updateData.returnDepartureTime = effectiveCaptureTime;
    updateData.isTrackingActive = true;
  } else if (milestone === JourneyState.RETURNED_OFFICE) {
    updateData.returnEndTime = effectiveCaptureTime;
    // End Journey stops tracking!
    updateData.isTrackingActive = false;

    if (participant.departureTime) {
      const diffMs = effectiveCaptureTime.getTime() - participant.departureTime.getTime();
      updateData.totalDurationMinutes = Math.max(1, Math.round(diffMs / 60000));
    }
  } else if (milestone === JourneyState.CANCELLED) {
    updateData.isTrackingActive = false;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.siteVisitParticipant.update({
      where: { id: participant.id },
      data: updateData,
      include: {
        membership: { include: { user: true, employee: true } },
      },
    });

    // Record location sample
    if (latitude !== undefined && longitude !== undefined) {
      await tx.siteVisitLocationSample.create({
        data: {
          tenantId: ctx.tenantId,
          visitId,
          participantId: participant.id,
          latitude,
          longitude,
          accuracyMeters: accuracyMeters ?? null,
          clientCaptureTime: effectiveCaptureTime,
          serverReceiptTime: now,
          isException: Boolean(exceptionNotes),
          exceptionReason: exceptionNotes ?? null,
        },
      });
    }

    // Record audit event
    await tx.siteVisitEvent.create({
      data: {
        tenantId: ctx.tenantId,
        visitId,
        eventType: milestone === JourneyState.JOURNEY_STARTED ? SiteVisitEventType.CHECK_IN :
                   milestone === JourneyState.RETURNED_OFFICE ? SiteVisitEventType.CHECK_OUT :
                   SiteVisitEventType.EXCEPTION,
        actorId: ctx.membershipId,
        serverReceiptTime: now,
        clientCaptureTime: effectiveCaptureTime,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracyMeters: accuracyMeters ?? null,
        failureReason: `JOURNEY_TRANSITION: ${milestone}${exceptionNotes ? ` (${exceptionNotes})` : ""}`,
        geofenceAssessment: GeofenceAssessment.UNCERTAIN,
        idempotencyKey: `ms-${participant.id.replace(/-/g, "").slice(0, 16)}-${milestone.slice(0, 12)}-${now.getTime()}`.slice(0, 64),
        siteCenterLat: visit.site.latitude,
        siteCenterLng: visit.site.longitude,
        siteRadiusMeters: visit.site.radiusMeters,
      },
    });

    // If visit is still SCHEDULED and journey starts, move operationalState to ACTIVE
    if (milestone === JourneyState.JOURNEY_STARTED && visit.operationalState === SiteVisitOperationalState.SCHEDULED) {
      await tx.siteVisit.update({
        where: { id: visit.id },
        data: { operationalState: SiteVisitOperationalState.ACTIVE },
      });
    }

    const result: any = updated;
    result.participant = {
      ...updated,
      operationalState: updated.journeyState,
    };
    result.operationalState = updated.journeyState;
    return result;
  });
}

export interface IngestLocationSamplesParams {
  visitId: string;
  samples: Array<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    clientCaptureTime: string | Date;
    isException?: boolean;
    exceptionReason?: string;
    idempotencyKey?: string;
  }>;
}

/**
 * Ingests a batch of offline/queued or foreground location samples.
 * Bounded batch size, rate-limited, ownership validated.
 */
export async function ingestLocationSamples(
  ctx: TenantContext,
  params: IngestLocationSamplesParams
) {
  const { visitId, samples } = params;
  if (!samples || samples.length === 0) return { received: 0 };

  const participant = await prisma.siteVisitParticipant.findFirst({
    where: {
      tenantId: ctx.tenantId,
      visitId,
      membershipId: ctx.membershipId,
    },
  });

  if (!participant) {
    throw new ForbiddenException("Not an assigned participant for this visit.");
  }

  // Reject new points if journey has already ended
  if (participant.journeyState === JourneyState.RETURNED_OFFICE || participant.journeyState === JourneyState.CANCELLED) {
    return { received: 0, rejectedReason: "Journey has already concluded." };
  }

  const now = new Date();
  let latestLat: number | null = null;
  let latestLng: number | null = null;
  let latestAccuracy: number | null = null;
  let savedCount = 0;

  for (const s of samples.slice(0, 50)) {
    if (typeof s.latitude !== "number" || typeof s.longitude !== "number") continue;
    if (s.latitude < -90 || s.latitude > 90 || s.longitude < -180 || s.longitude > 180) continue;

    if (s.idempotencyKey) {
      const exists = await prisma.siteVisitLocationSample.findFirst({
        where: { tenantId: ctx.tenantId, idempotencyKey: s.idempotencyKey },
        select: { id: true },
      });
      if (exists) continue;
    }

    const captureTime = new Date(s.clientCaptureTime || now);
    await prisma.siteVisitLocationSample.create({
      data: {
        tenantId: ctx.tenantId,
        visitId,
        participantId: participant.id,
        latitude: s.latitude,
        longitude: s.longitude,
        accuracyMeters: s.accuracyMeters ?? null,
        clientCaptureTime: captureTime,
        serverReceiptTime: now,
        isException: Boolean(s.isException),
        exceptionReason: s.exceptionReason ?? null,
        idempotencyKey: s.idempotencyKey ?? null,
      },
    });

    latestLat = s.latitude;
    latestLng = s.longitude;
    latestAccuracy = s.accuracyMeters ?? null;
    savedCount++;
  }

  if (latestLat !== null && latestLng !== null) {
    await prisma.siteVisitParticipant.update({
      where: { id: participant.id },
      data: {
        lastLatitude: latestLat,
        lastLongitude: latestLng,
        lastAccuracyMeters: latestAccuracy,
        lastHeartbeatAt: now,
      },
    });
  }

  return { received: samples.length, saved: savedCount };
}

export interface SaveInspectionReportInput {
  visitId: string;
  checklistAnswersJson?: any;
  observations?: string;
  photosJson?: any;
  snagsJson?: any;
  isFinalSubmission?: boolean;
}

/**
 * Saves inspection report draft or submits it.
 * Note: Finishing / submitting an inspection report leaves the journey active!
 */
export async function saveInspectionReport(
  ctx: TenantContext,
  input: SaveInspectionReportInput
) {
  let participant = await prisma.siteVisitParticipant.findFirst({
    where: {
      tenantId: ctx.tenantId,
      visitId: input.visitId,
      membershipId: ctx.membershipId,
    },
  });

  if (!participant && ctx.role === "EMPLOYEE") {
    throw new ForbiddenException("You are not an assigned participant for this visit.");
  }

  if (!participant) {
    participant = await prisma.siteVisitParticipant.findFirst({
      where: { tenantId: ctx.tenantId, visitId: input.visitId },
    });
  }

  if (!participant) {
    throw new Error("No participant session exists for this visit.");
  }

  let report = await prisma.siteVisitInspectionReport.findFirst({
    where: {
      tenantId: ctx.tenantId,
      visitId: input.visitId,
      participantId: participant.id,
    },
  });

  const now = new Date();
  const status = input.isFinalSubmission ? "SUBMITTED" : (report?.status || "DRAFT");

  if (!report) {
    report = await prisma.siteVisitInspectionReport.create({
      data: {
        tenantId: ctx.tenantId,
        visitId: input.visitId,
        participantId: participant.id,
        checklistAnswersJson: input.checklistAnswersJson || null,
        observations: input.observations || null,
        photosJson: input.photosJson || null,
        snagsJson: input.snagsJson || null,
        status,
        submittedAt: input.isFinalSubmission ? now : null,
      },
    });
  } else {
    report = await prisma.siteVisitInspectionReport.update({
      where: { id: report.id },
      data: {
        checklistAnswersJson: input.checklistAnswersJson ?? report.checklistAnswersJson,
        observations: input.observations ?? report.observations,
        photosJson: input.photosJson ?? report.photosJson,
        snagsJson: input.snagsJson ?? report.snagsJson,
        status,
        submittedAt: input.isFinalSubmission ? now : report.submittedAt,
      },
    });
  }

  // If final submission, update participant inspection status and time
  if (input.isFinalSubmission) {
    await prisma.siteVisitParticipant.update({
      where: { id: participant.id },
      data: {
        journeyState: JourneyState.INSPECTION_FINISHED,
        inspectionEndTime: now,
      },
    });

    // Also update parent visit findings and snags for overview visibility
    await prisma.siteVisit.update({
      where: { id: input.visitId },
      data: {
        findings: input.observations || undefined,
        submittedReportTime: now,
        photosJson: input.photosJson || undefined,
        snagsJson: input.snagsJson || undefined,
      },
    });
  }

  return report;
}

/**
 * Admin review for submitted inspection report
 */
export async function reviewInspectionReport(
  ctx: TenantContext,
  reportId: string,
  decision: "APPROVED" | "CORRECTIONS_REQUESTED",
  comment?: string
) {
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    throw new ForbiddenException("Only Owner or Admin can review inspection reports.");
  }

  const updated = await prisma.siteVisitInspectionReport.update({
    where: { id: reportId },
    data: {
      status: decision,
      reviewerId: ctx.membershipId,
      reviewedAt: new Date(),
      reviewComment: comment || null,
    },
    include: {
      participant: { include: { membership: { include: { user: true } } } },
      visit: { include: { site: true } },
    },
  });

  // Notify participant
  try {
    await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        recipientId: updated.participant.membershipId,
        title: decision === "APPROVED" ? "Inspection Report Approved ✅" : "Inspection Report - Corrections Requested",
        message: `${ctx.userFullName} reviewed your inspection report for '${updated.visit.site.name}': ${decision}.${comment ? ` Note: ${comment}` : ""}`,
        link: `/w/${ctx.tenantSlug}/visits`,
      },
    });
  } catch {}

  return updated;
}

/**
 * Retrieves comprehensive site visit dossier with participants, reports, samples, and destination snapshot.
 */
export async function getSiteVisitDossier(ctx: TenantContext, visitId: string) {
  const visit = await prisma.siteVisit.findFirst({
    where: { id: visitId, tenantId: ctx.tenantId },
    include: {
      site: true,
      project: { select: { id: true, code: true, name: true } },
      employee: { include: { user: true, employee: true } },
      participants: {
        include: {
          membership: { include: { user: true, employee: true } },
          inspectionReports: true,
        },
      },
      events: { orderBy: { serverReceiptTime: "asc" } },
    },
  });

  if (!visit) {
    throw new Error("Site visit not found.");
  }

  // Authorization check: Employee can only see their own private route; Owner/Admin sees all
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const userParticipant = visit.participants.find((p) => p.membershipId === ctx.membershipId);

  // Load location samples
  let samples: any[] = [];
  if (isPrivileged) {
    samples = await prisma.siteVisitLocationSample.findMany({
      where: { visitId, tenantId: ctx.tenantId },
      orderBy: { clientCaptureTime: "asc" },
    });
  } else if (userParticipant) {
    samples = await prisma.siteVisitLocationSample.findMany({
      where: { visitId, tenantId: ctx.tenantId, participantId: userParticipant.id },
      orderBy: { clientCaptureTime: "asc" },
    });
  }

  return {
    visit,
    samples,
    destinationSnapshot: visit.destinationSnapshotJson,
  };
}

