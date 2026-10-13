import { prisma } from "../../db/prisma";
import {
  TenantContext,
  isAdminOrOwner,
  ForbiddenException,
} from "../../tenancy/context";

export interface ListRFIsParams {
  projectId?: string;
  drawingVersionId?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export interface CreateRFIInput {
  projectId: string;
  title: string;
  question: string;
  drawingVersionId?: string | null;
  siteLocation?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  relatedContractorId?: string | null;
  evidenceFiles?: string[];
}

export interface RespondRFIInput {
  rfiId: string;
  resolutionNotes: string;
}

/**
 * List RFIs with project access enforcement, drawing revision linkage, and tenant isolation
 */
export async function listProjectRFIs(ctx: TenantContext, params: ListRFIsParams = {}) {
  const isPrivileged = isAdminOrOwner(ctx);
  const where: any = {
    tenantId: ctx.tenantId,
    category: "RFI",
  };

  // Scope regular employees to assigned projects
  if (!isPrivileged) {
    const userProjects = await prisma.projectMember.findMany({
      where: { tenantId: ctx.tenantId, membershipId: ctx.membershipId },
      select: { projectId: true },
    });
    const allowedProjectIds = userProjects.map((p) => p.projectId);
    where.projectId = { in: allowedProjectIds };
  }

  if (params.projectId) {
    if (where.projectId?.in && !where.projectId.in.includes(params.projectId)) {
      return { rfis: [], metrics: { total: 0, open: 0, answered: 0, closed: 0 } };
    }
    where.projectId = params.projectId;
  }

  if (params.drawingVersionId) {
    where.relatedDrawingVersionId = params.drawingVersionId;
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.priority && params.priority !== "ALL") {
    where.priority = params.priority;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { referenceNumber: { contains: q } },
    ];
  }

  const rfis = await prisma.studioSiteIssue.findMany({
    where,
    include: {
      project: { select: { id: true, code: true, name: true } },
      reporter: { include: { user: { select: { fullName: true, email: true } } } },
      responsibleEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
        },
      },
      verifier: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch linked drawing revisions in bulk to avoid N+1 query loops
  const drawingVersionIds = rfis
    .map((r) => r.relatedDrawingVersionId)
    .filter((id): id is string => Boolean(id));

  let drawingVersionMap = new Map<string, any>();
  if (drawingVersionIds.length > 0) {
    const versions = await prisma.documentVersion.findMany({
      where: {
        id: { in: drawingVersionIds },
        tenantId: ctx.tenantId,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            drawingNumber: true,
            discipline: true,
          },
        },
      },
    });
    drawingVersionMap = new Map(versions.map((v) => [v.id, v]));
  }

  const mappedRfis = rfis.map((r) => {
    const linkedDrawing = r.relatedDrawingVersionId
      ? drawingVersionMap.get(r.relatedDrawingVersionId)
      : null;

    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      projectId: r.projectId,
      projectCode: r.project.code,
      projectName: r.project.name,
      title: r.title,
      question: r.description || "",
      priority: r.priority,
      status: r.status,
      siteLocation: r.siteLocation,
      dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
      reporterName: r.reporter.user.fullName,
      responsiblePerson: r.responsibleEmployee
        ? `${r.responsibleEmployee.firstName} ${r.responsibleEmployee.lastName}`
        : null,
      resolutionNotes: r.resolutionNotes,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      verifierName: r.verifier?.user?.fullName || null,
      drawingVersion: linkedDrawing
        ? {
            id: linkedDrawing.id,
            revision: linkedDrawing.revision,
            documentTitle: linkedDrawing.document.title,
            drawingNumber: linkedDrawing.document.drawingNumber,
            discipline: linkedDrawing.document.discipline,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  const total = mappedRfis.length;
  const open = mappedRfis.filter((r) => r.status === "OPEN" || r.status === "ASSIGNED").length;
  const answered = mappedRfis.filter((r) => r.status === "READY_FOR_VERIFICATION" || r.status === "IN_PROGRESS").length;
  const closed = mappedRfis.filter((r) => r.status === "CLOSED").length;

  return {
    rfis: mappedRfis,
    metrics: { total, open, answered, closed },
  };
}

/**
 * Create a new RFI registered to a project and optionally linked to a drawing revision
 */
export async function createProjectRFI(ctx: TenantContext, input: CreateRFIInput) {
  // Validate project access
  if (!isAdminOrOwner(ctx)) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember) {
      throw new ForbiddenException("You can only submit RFIs for projects you are assigned to.");
    }
  }

  // Validate drawing version belongs to this tenant and project if specified
  if (input.drawingVersionId) {
    const drawingVersion = await prisma.documentVersion.findFirst({
      where: {
        id: input.drawingVersionId,
        tenantId: ctx.tenantId,
        document: { projectId: input.projectId },
      },
    });
    if (!drawingVersion) {
      throw new Error("Specified drawing revision does not belong to this project.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    // Generate sequential reference number
    const count = await tx.studioSiteIssue.count({
      where: { tenantId: ctx.tenantId, category: "RFI" },
    });
    const referenceNumber = `RFI-${String(count + 1).padStart(3, "0")}`;

    const rfi = await tx.studioSiteIssue.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        referenceNumber,
        category: "RFI",
        title: input.title.trim(),
        description: input.question.trim(),
        siteLocation: input.siteLocation?.trim() || "Project Site / Studio",
        priority: input.priority || "MEDIUM",
        status: "OPEN",
        reporterId: ctx.membershipId,
        relatedContractorId: input.relatedContractorId || null,
        relatedDrawingVersionId: input.drawingVersionId || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        evidencePhotosJson: input.evidenceFiles || [],
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: input.projectId,
        action: "RFI_CREATED",
        entityType: "RFI",
        entityId: rfi.id,
        safeChangeSummary: `Submitted ${referenceNumber}: "${rfi.title}" by ${ctx.userFullName}`,
      },
    });

    return rfi;
  });
}

/**
 * Respond to an RFI with architectural clarification
 */
export async function respondToRFI(ctx: TenantContext, input: RespondRFIInput) {
  const rfi = await prisma.studioSiteIssue.findFirst({
    where: {
      id: input.rfiId,
      tenantId: ctx.tenantId,
      category: "RFI",
    },
  });

  if (!rfi) {
    throw new Error("RFI record not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.studioSiteIssue.update({
      where: { id: input.rfiId },
      data: {
        resolutionNotes: input.resolutionNotes.trim(),
        status: "READY_FOR_VERIFICATION",
        activityJson: {
          respondedBy: ctx.userFullName,
          respondedAt: new Date().toISOString(),
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: rfi.projectId,
        action: "RFI_RESPONDED",
        entityType: "RFI",
        entityId: rfi.id,
        safeChangeSummary: `Architectural response added to ${rfi.referenceNumber} by ${ctx.userFullName}`,
      },
    });

    return updated;
  });
}

/**
 * Close and verify an RFI
 */
export async function closeRFI(ctx: TenantContext, rfiId: string) {
  const rfi = await prisma.studioSiteIssue.findFirst({
    where: {
      id: rfiId,
      tenantId: ctx.tenantId,
      category: "RFI",
    },
  });

  if (!rfi) {
    throw new Error("RFI record not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.studioSiteIssue.update({
      where: { id: rfiId },
      data: {
        status: "CLOSED",
        verifierId: ctx.membershipId,
        verifiedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: rfi.projectId,
        action: "RFI_CLOSED",
        entityType: "RFI",
        entityId: rfi.id,
        safeChangeSummary: `Closed RFI ${rfi.referenceNumber} after verification by ${ctx.userFullName}`,
      },
    });

    return updated;
  });
}
