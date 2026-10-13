import { prisma } from "../../db/prisma";
import {
  TenantContext,
  isAdminOrOwner,
  ForbiddenException,
} from "../../tenancy/context";

export interface ListMaterialsParams {
  projectId?: string;
  status?: string;
  search?: string;
}

export interface SubmitMaterialSampleInput {
  projectId: string;
  materialName: string;
  manufacturerOrVendor?: string;
  specificationDetails: string;
  proposedLocation?: string;
  drawingVersionId?: string | null;
  contractorId?: string | null;
  samplePhotos?: string[];
}

export interface ReviewMaterialSampleInput {
  sampleId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED" | "CLIENT_APPROVED";
  reviewNotes: string;
}

/**
 * List Material & Sample Approvals for the workspace
 */
export async function listMaterialSamples(ctx: TenantContext, params: ListMaterialsParams = {}) {
  const isPrivileged = isAdminOrOwner(ctx);
  const where: any = {
    tenantId: ctx.tenantId,
    category: "MATERIAL_SAMPLE",
  };

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
      return { samples: [], metrics: { total: 0, pending: 0, approved: 0, changesRequested: 0 } };
    }
    where.projectId = params.projectId;
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { referenceNumber: { contains: q } },
    ];
  }

  const items = await prisma.studioSiteIssue.findMany({
    where,
    include: {
      project: { select: { id: true, code: true, name: true } },
      reporter: { include: { user: { select: { fullName: true } } } },
      verifier: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const samples = items.map((item) => ({
    id: item.id,
    referenceNumber: item.referenceNumber,
    projectId: item.projectId,
    projectCode: item.project.code,
    projectName: item.project.name,
    materialName: item.title,
    specifications: item.description || "",
    location: item.siteLocation,
    status: item.status, // OPEN (Pending), CLOSED (Approved), REOPENED (Changes Requested), READY_FOR_VERIFICATION (Client Approved)
    submittedBy: item.reporter.user.fullName,
    submitterMembershipId: item.reporterId,
    reviewedBy: item.verifier?.user?.fullName || null,
    reviewedAt: item.verifiedAt ? item.verifiedAt.toISOString() : null,
    reviewNotes: item.resolutionNotes,
    samplePhotos: Array.isArray(item.evidencePhotosJson) ? item.evidencePhotosJson : [],
    createdAt: item.createdAt.toISOString(),
  }));

  const total = samples.length;
  const pending = samples.filter((s) => s.status === "OPEN" || s.status === "ASSIGNED").length;
  const approved = samples.filter((s) => s.status === "CLOSED" || s.status === "READY_FOR_VERIFICATION").length;
  const changesRequested = samples.filter((s) => s.status === "REOPENED").length;

  return {
    samples,
    metrics: { total, pending, approved, changesRequested },
  };
}

/**
 * Submit a physical material/finish sample for architectural review
 */
export async function submitMaterialSample(ctx: TenantContext, input: SubmitMaterialSampleInput) {
  if (!isAdminOrOwner(ctx)) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember) {
      throw new ForbiddenException("You can only submit material samples for projects you are assigned to.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const count = await tx.studioSiteIssue.count({
      where: { tenantId: ctx.tenantId, category: "MATERIAL_SAMPLE" },
    });
    const referenceNumber = `MAT-${String(count + 1).padStart(3, "0")}`;

    const sample = await tx.studioSiteIssue.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        referenceNumber,
        category: "MATERIAL_SAMPLE",
        title: input.materialName.trim(),
        description: input.specificationDetails.trim(),
        siteLocation: input.proposedLocation?.trim() || "Studio Sample Board",
        priority: "HIGH",
        status: "OPEN",
        reporterId: ctx.membershipId,
        relatedContractorId: input.contractorId || null,
        relatedDrawingVersionId: input.drawingVersionId || null,
        evidencePhotosJson: input.samplePhotos || [],
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: input.projectId,
        action: "MATERIAL_SAMPLE_SUBMITTED",
        entityType: "MaterialSample",
        entityId: sample.id,
        safeChangeSummary: `Submitted sample ${referenceNumber}: "${sample.title}" by ${ctx.userFullName}`,
      },
    });

    return sample;
  });
}

/**
 * Review Material Sample: Approve, Request Changes, or Client Approved
 * Strictly enforces NO SELF-APPROVAL!
 */
export async function reviewMaterialSample(ctx: TenantContext, input: ReviewMaterialSampleInput) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Partners or Administrators can approve material samples.");
  }

  const sample = await prisma.studioSiteIssue.findFirst({
    where: {
      id: input.sampleId,
      tenantId: ctx.tenantId,
      category: "MATERIAL_SAMPLE",
    },
  });

  if (!sample) {
    throw new Error("Material sample record not found.");
  }

  // NO SELF-APPROVAL RULE: Submitter cannot approve their own sample
  if (sample.reporterId === ctx.membershipId) {
    throw new ForbiddenException(
      "Self-approval forbidden. An independent studio architect or partner must review and sign off on this sample."
    );
  }

  if (input.decision === "CHANGES_REQUESTED" && (!input.reviewNotes || !input.reviewNotes.trim())) {
    throw new Error("Review feedback explaining why the sample was rejected is required.");
  }

  const nextStatus =
    input.decision === "APPROVED"
      ? "CLOSED"
      : input.decision === "CLIENT_APPROVED"
      ? "READY_FOR_VERIFICATION"
      : "REOPENED";

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.studioSiteIssue.update({
      where: { id: input.sampleId },
      data: {
        status: nextStatus,
        resolutionNotes: input.reviewNotes.trim(),
        verifierId: ctx.membershipId,
        verifiedAt: new Date(),
        activityJson: {
          decision: input.decision,
          reviewedBy: ctx.userFullName,
          reviewedAt: new Date().toISOString(),
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: sample.projectId,
        action: `MATERIAL_SAMPLE_${input.decision}`,
        entityType: "MaterialSample",
        entityId: sample.id,
        safeChangeSummary: `Material sample ${sample.referenceNumber} (${sample.title}) marked ${input.decision} by ${ctx.userFullName}`,
      },
    });

    return updated;
  });
}
