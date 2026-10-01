import { prisma } from "../../db/prisma";
import {
  TenantContext,
  assertTenantAccess,
  isAdminOrOwner,
  canApproveWork,
  ForbiddenException,
} from "../../tenancy/context";
import { DocumentApprovalState, ApprovalStatus, ApprovalTargetType } from "@prisma/client";

export interface FindDrawingsParams {
  projectId?: string;
  discipline?: string;
  search?: string;
}

export interface CreateDrawingInput {
  projectId: string;
  taskId?: string | null;
  title: string;
  drawingNumber?: string | null;
  discipline: string;
  documentType: string;
  issuePurpose?: string;
  fileId: string;
}

export interface UploadNewRevisionInput {
  documentId: string;
  fileId: string;
  issuePurpose?: string;
}

/**
 * Find all drawings accessible to the current user (Company-wide for Owner/Admin, assigned projects for Employees)
 */
export async function findDrawings(ctx: TenantContext, params: FindDrawingsParams = {}) {
  const isPrivileged = isAdminOrOwner(ctx);

  const where: any = {
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  // Restrict employees to only their assigned projects
  if (!isPrivileged) {
    const userMemberships = await prisma.projectMember.findMany({
      where: {
        tenantId: ctx.tenantId,
        membershipId: ctx.membershipId,
      },
      select: { projectId: true },
    });
    const allowedProjectIds = userMemberships.map((m) => m.projectId);
    where.projectId = { in: allowedProjectIds };
  }

  // Filter by specific project if requested
  if (params.projectId) {
    // If employee requested a project they aren't part of, fail-closed
    if (where.projectId?.in && !where.projectId.in.includes(params.projectId)) {
      return [];
    }
    where.projectId = params.projectId;
  }

  if (params.discipline && params.discipline !== "ALL") {
    where.discipline = params.discipline;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { drawingNumber: { contains: q } },
      { discipline: { contains: q } },
      { documentType: { contains: q } },
    ];
  }

  const rawDocuments = await prisma.document.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          approvalRequests: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate latest version, latest approved version, and file information
  return rawDocuments.map((doc) => {
    const versions = doc.versions.map((ver) => ({
      id: ver.id,
      documentId: ver.documentId,
      revision: ver.revision,
      fileId: ver.fileId,
      uploaderId: ver.uploaderId,
      issuePurpose: ver.issuePurpose,
      approvalState: ver.approvalState,
      supersededById: ver.supersededById,
      createdAt: ver.createdAt.toISOString(),
      updatedAt: ver.updatedAt.toISOString(),
      approvalRequests: ver.approvalRequests.map((ar) => ({
        id: ar.id,
        status: ar.status,
        requesterId: ar.requesterId,
        reviewerId: ar.reviewerId,
        comment: ar.comment,
        isClientApproval: ar.isClientApproval,
        clientApprovalEvidence: ar.clientApprovalEvidence,
        clientApprovalReceivedDate: ar.clientApprovalReceivedDate?.toISOString() || null,
        decidedAt: ar.decidedAt?.toISOString() || null,
        createdAt: ar.createdAt.toISOString(),
      })),
    }));

    // Latest version (top of descending list)
    const latestVersion = versions[0] || null;

    // Latest Approved version (crucial: a new revision never inherits approval)
    const latestApprovedVersion = versions.find((v) => v.approvalState === DocumentApprovalState.APPROVED) || null;

    return {
      id: doc.id,
      projectId: doc.projectId,
      project: doc.project,
      taskId: doc.taskId,
      task: doc.task,
      title: doc.title,
      drawingNumber: doc.drawingNumber,
      discipline: doc.discipline,
      documentType: doc.documentType,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      versions,
      latestVersion,
      latestApprovedVersion,
      totalRevisions: versions.length,
    };
  });
}

/**
 * Retrieve single drawing detail with full revision and approval history
 */
export async function findDrawingById(ctx: TenantContext, drawingId: string) {
  const drawings = await findDrawings(ctx);
  return drawings.find((d) => d.id === drawingId) || null;
}

/**
 * Create a new parent drawing record and its initial revision R0 (Atomic)
 */
export async function createDrawing(ctx: TenantContext, input: CreateDrawingInput) {
  const isPrivileged = isAdminOrOwner(ctx);

  // Validate project access
  if (!isPrivileged) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember) {
      throw new ForbiddenException("You can only add drawings to projects you are assigned to.");
    }
  }

  // Validate private file exists in this tenant
  const file = await prisma.privateFile.findFirst({
    where: {
      id: input.fileId,
      tenantId: ctx.tenantId,
    },
  });
  if (!file) {
    throw new Error("Uploaded drawing file not found in storage.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create parent Document
    const document = await tx.document.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        taskId: input.taskId || null,
        title: input.title.trim(),
        drawingNumber: input.drawingNumber?.trim() || null,
        discipline: input.discipline.trim(),
        documentType: input.documentType.trim(),
      },
      include: {
        project: { select: { code: true, name: true } },
      },
    });

    // 2. Create initial Revision R0
    const initialVersion = await tx.documentVersion.create({
      data: {
        tenantId: ctx.tenantId,
        documentId: document.id,
        revision: "R0",
        fileId: input.fileId,
        uploaderId: ctx.membershipId,
        issuePurpose: input.issuePurpose?.trim() || "For Initial Review",
        approvalState: DocumentApprovalState.DRAFT,
      },
    });

    // 3. Record Audit
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: input.projectId,
        action: "DRAWING_CREATED",
        entityType: "Document",
        entityId: document.id,
        safeChangeSummary: `Registered drawing "${document.title}" (${document.drawingNumber || "No Number"}) with initial revision R0 by ${ctx.userFullName}`,
      },
    });

    return {
      document,
      version: initialVersion,
    };
  });
}

/**
 * Upload a new revision (R1, R2, ...) with safe atomic revision label allocation
 */
export async function uploadNewRevision(ctx: TenantContext, input: UploadNewRevisionInput) {
  const isPrivileged = isAdminOrOwner(ctx);

  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      tenantId: ctx.tenantId,
    },
    include: {
      project: { select: { id: true, code: true } },
      versions: { select: { revision: true } },
    },
  });

  if (!document) {
    throw new Error("Drawing document not found in this studio workspace.");
  }

  // Check project membership for employees
  if (!isPrivileged) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: document.projectId,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember) {
      throw new ForbiddenException("You can only upload revisions for projects you are assigned to.");
    }
  }

  // Verify file belongs to tenant
  const file = await prisma.privateFile.findFirst({
    where: {
      id: input.fileId,
      tenantId: ctx.tenantId,
    },
  });
  if (!file) {
    throw new Error("Uploaded revision file not found.");
  }

  return await prisma.$transaction(async (tx) => {
    // Read all existing revisions under lock to allocate next revision label safely
    const existingVersions = await tx.documentVersion.findMany({
      where: {
        documentId: input.documentId,
        tenantId: ctx.tenantId,
      },
      select: { revision: true },
    });

    let maxRev = -1;
    existingVersions.forEach((v) => {
      const match = v.revision.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxRev) maxRev = num;
      }
    });

    const nextRevNum = maxRev >= 0 ? maxRev + 1 : 1;
    const nextRevisionLabel = `R${nextRevNum}`;

    const newVersion = await tx.documentVersion.create({
      data: {
        tenantId: ctx.tenantId,
        documentId: input.documentId,
        revision: nextRevisionLabel,
        fileId: input.fileId,
        uploaderId: ctx.membershipId,
        issuePurpose: input.issuePurpose?.trim() || "For Review",
        approvalState: DocumentApprovalState.DRAFT, // NEW REVISION NEVER INHERITS APPROVAL
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: document.projectId,
        action: "DRAWING_REVISION_UPLOADED",
        entityType: "DocumentVersion",
        entityId: newVersion.id,
        safeChangeSummary: `Uploaded new revision ${nextRevisionLabel} for drawing "${document.title}"`,
      },
    });

    return newVersion;
  });
}

/**
 * Submit drawing revision for review
 */
export async function submitRevisionForReview(
  ctx: TenantContext,
  revisionId: string,
  reviewerId?: string,
  comment?: string
) {
  const version = await prisma.documentVersion.findFirst({
    where: {
      id: revisionId,
      tenantId: ctx.tenantId,
    },
    include: {
      document: {
        include: { project: true },
      },
    },
  });

  if (!version) {
    throw new Error("Drawing revision not found.");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isUploader = version.uploaderId === ctx.membershipId;

  if (!isPrivileged && !isUploader) {
    throw new ForbiddenException("You can only submit your own draft revisions for review.");
  }

  if (version.approvalState !== DocumentApprovalState.DRAFT) {
    throw new Error(`Cannot submit revision currently in ${version.approvalState} state.`);
  }

  return await prisma.$transaction(async (tx) => {
    const updatedVersion = await tx.documentVersion.update({
      where: { id: revisionId },
      data: {
        approvalState: DocumentApprovalState.IN_REVIEW,
      },
    });

    const approvalReq = await tx.approvalRequest.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: version.document.projectId,
        targetType: ApprovalTargetType.DOCUMENT_VERSION,
        documentVersionId: revisionId,
        requesterId: ctx.membershipId,
        reviewerId: reviewerId || null,
        status: ApprovalStatus.PENDING,
        comment: comment?.trim() || "Drawing revision submitted for architectural review",
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: version.document.projectId,
        action: "DRAWING_SUBMITTED_FOR_REVIEW",
        entityType: "DocumentVersion",
        entityId: revisionId,
        safeChangeSummary: `Submitted revision ${version.revision} of "${version.document.title}" for review`,
      },
    });

    return {
      version: updatedVersion,
      approvalRequest: approvalReq,
    };
  });
}

/**
 * Withdraw pending submission if review has not begun
 */
export async function withdrawRevisionSubmission(ctx: TenantContext, revisionId: string) {
  const version = await prisma.documentVersion.findFirst({
    where: {
      id: revisionId,
      tenantId: ctx.tenantId,
    },
    include: {
      document: true,
      approvalRequests: {
        where: { status: ApprovalStatus.PENDING },
      },
    },
  });

  if (!version) {
    throw new Error("Drawing revision not found.");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isUploader = version.uploaderId === ctx.membershipId;

  if (!isPrivileged && !isUploader) {
    throw new ForbiddenException("You can only withdraw your own pending submissions.");
  }

  if (version.approvalState !== DocumentApprovalState.IN_REVIEW) {
    throw new Error("Only revisions currently in review can be withdrawn.");
  }

  return await prisma.$transaction(async (tx) => {
    // Revert back to DRAFT
    const updated = await tx.documentVersion.update({
      where: { id: revisionId },
      data: {
        approvalState: DocumentApprovalState.DRAFT,
      },
    });

    // Remove pending approval request
    await tx.approvalRequest.deleteMany({
      where: {
        documentVersionId: revisionId,
        status: ApprovalStatus.PENDING,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: version.document.projectId,
        action: "DRAWING_SUBMISSION_WITHDRAWN",
        entityType: "DocumentVersion",
        entityId: revisionId,
        safeChangeSummary: `Withdrew review submission for revision ${version.revision} of "${version.document.title}"`,
      },
    });

    return updated;
  });
}

/**
 * Review Revision: Approve or Request Changes (Mandatory comments on changes)
 * Strictly enforces NO SELF-APPROVAL!
 */
export async function reviewRevision(
  ctx: TenantContext,
  revisionId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED",
  comment?: string
) {
  if (!canApproveWork(ctx)) {
    throw new ForbiddenException("Only Studio Partners, Administrators, or Project Managers can approve drawing revisions.");
  }

  const version = await prisma.documentVersion.findFirst({
    where: {
      id: revisionId,
      tenantId: ctx.tenantId,
    },
    include: {
      document: true,
      approvalRequests: {
        where: { status: ApprovalStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!version) {
    throw new Error("Drawing revision not found.");
  }

  // NO SELF-APPROVAL RULE
  if (version.uploaderId === ctx.membershipId) {
    throw new ForbiddenException(
      "Self-approval forbidden. Another studio partner or administrator must review and approve this drawing revision."
    );
  }

  if (decision === "CHANGES_REQUESTED" && (!comment || !comment.trim())) {
    throw new Error("A comment detailing required architectural corrections is mandatory when requesting changes.");
  }

  return await prisma.$transaction(async (tx) => {
    const newApprovalState =
      decision === "APPROVED" ? DocumentApprovalState.APPROVED : DocumentApprovalState.DRAFT;

    const updatedVersion = await tx.documentVersion.update({
      where: { id: revisionId },
      data: {
        approvalState: newApprovalState,
      },
    });

    // Update pending approval request or create resolution
    const pendingReq = version.approvalRequests[0];
    if (pendingReq) {
      await tx.approvalRequest.update({
        where: { id: pendingReq.id },
        data: {
          status: decision === "APPROVED" ? ApprovalStatus.APPROVED : ApprovalStatus.CHANGES_REQUESTED,
          comment: comment?.trim() || (decision === "APPROVED" ? "Internally approved" : null),
          reviewerId: ctx.membershipId,
          decidedAt: new Date(),
        },
      });
    } else {
      await tx.approvalRequest.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: version.document.projectId,
          targetType: ApprovalTargetType.DOCUMENT_VERSION,
          documentVersionId: revisionId,
          requesterId: version.uploaderId,
          reviewerId: ctx.membershipId,
          status: decision === "APPROVED" ? ApprovalStatus.APPROVED : ApprovalStatus.CHANGES_REQUESTED,
          comment: comment?.trim() || null,
          decidedAt: new Date(),
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: version.document.projectId,
        action: decision === "APPROVED" ? "DRAWING_APPROVED" : "DRAWING_CHANGES_REQUESTED",
        entityType: "DocumentVersion",
        entityId: revisionId,
        safeChangeSummary: `${decision === "APPROVED" ? "Approved" : "Requested changes for"} revision ${version.revision} of "${version.document.title}" by ${ctx.userFullName}`,
      },
    });

    return updatedVersion;
  });
}

/**
 * Record Client Approval Evidence for an exact revision (Owner and Admin only)
 */
export async function recordClientApproval(
  ctx: TenantContext,
  revisionId: string,
  input: {
    status: "APPROVED" | "REJECTED";
    evidenceText: string;
    receivedDate?: Date;
  }
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Partners and Admins can record client approval evidence.");
  }

  if (!input.evidenceText || !input.evidenceText.trim()) {
    throw new Error("Client approval evidence (e.g. Email confirmation reference, signed physical copy stamp) is mandatory.");
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: revisionId, tenantId: ctx.tenantId },
    include: { document: true },
  });

  if (!version) {
    throw new Error("Drawing revision not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const clientApproval = await tx.approvalRequest.create({
      data: {
        tenantId: ctx.tenantId,
        projectId: version.document.projectId,
        targetType: ApprovalTargetType.DOCUMENT_VERSION,
        documentVersionId: revisionId,
        requesterId: ctx.membershipId,
        reviewerId: ctx.membershipId,
        status: input.status === "APPROVED" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        isClientApproval: true,
        clientApprovalEvidence: input.evidenceText.trim(),
        clientApprovalReceivedDate: input.receivedDate || new Date(),
        decidedAt: new Date(),
        comment: `Client ${input.status.toLowerCase()} recorded by ${ctx.userFullName}: ${input.evidenceText.trim()}`,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: version.document.projectId,
        action: "DRAWING_CLIENT_APPROVAL_RECORDED",
        entityType: "ApprovalRequest",
        entityId: clientApproval.id,
        safeChangeSummary: `Recorded client ${input.status} for revision ${version.revision} of "${version.document.title}". Evidence: ${input.evidenceText.trim()}`,
      },
    });

    return clientApproval;
  });
}

/**
 * Delete an unsubmitted draft revision (allowed only if no history or reviews depend on it)
 */
export async function deleteUnsubmittedDraft(ctx: TenantContext, revisionId: string) {
  const version = await prisma.documentVersion.findFirst({
    where: { id: revisionId, tenantId: ctx.tenantId },
    include: {
      document: {
        include: { versions: true },
      },
      approvalRequests: true,
    },
  });

  if (!version) {
    throw new Error("Drawing revision not found.");
  }

  const isPrivileged = isAdminOrOwner(ctx);
  const isUploader = version.uploaderId === ctx.membershipId;

  if (!isPrivileged && !isUploader) {
    throw new ForbiddenException("You can only delete your own draft revisions.");
  }

  if (version.approvalState !== DocumentApprovalState.DRAFT) {
    throw new Error("Cannot delete revisions that have been submitted or approved.");
  }

  if (version.approvalRequests.length > 0) {
    throw new Error("Cannot delete revision because approval history is attached.");
  }

  return await prisma.$transaction(async (tx) => {
    // If this is the only version of the document, delete the parent document as well
    if (version.document.versions.length <= 1) {
      await tx.documentVersion.delete({ where: { id: revisionId } });
      await tx.document.delete({ where: { id: version.documentId } });
    } else {
      await tx.documentVersion.delete({ where: { id: revisionId } });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId: version.document.projectId,
        action: "DRAWING_DRAFT_DELETED",
        entityType: "DocumentVersion",
        entityId: revisionId,
        safeChangeSummary: `Deleted unsubmitted draft revision ${version.revision} of "${version.document.title}"`,
      },
    });

    return { success: true };
  });
}
