import { prisma } from "../../db/prisma";
import {
  TenantContext,
  isAdminOrOwner,
  ForbiddenException,
} from "../../tenancy/context";

export interface DrawingRevisionComparisonResult {
  document: {
    id: string;
    title: string;
    drawingNumber: string | null;
    discipline: string;
    documentType: string;
    projectId: string;
    projectName: string;
    projectCode: string;
  };
  revisionA: {
    id: string;
    revision: string;
    issuePurpose: string;
    approvalState: string;
    fileId: string;
    fileName?: string;
    fileSize?: number;
    uploaderId: string;
    uploaderName?: string;
    createdAt: string;
    approvalHistory: Array<{
      id: string;
      status: string;
      comment: string | null;
      reviewerName?: string;
      decidedAt: string | null;
    }>;
  };
  revisionB: {
    id: string;
    revision: string;
    issuePurpose: string;
    approvalState: string;
    fileId: string;
    fileName?: string;
    fileSize?: number;
    uploaderId: string;
    uploaderName?: string;
    createdAt: string;
    approvalHistory: Array<{
      id: string;
      status: string;
      comment: string | null;
      reviewerName?: string;
      decidedAt: string | null;
    }>;
  };
  diff: {
    revisionProgression: string;
    purposeChanged: boolean;
    previousPurpose: string;
    currentPurpose: string;
    approvalStatusComparison: {
      revAState: string;
      revBState: string;
      superseded: boolean;
    };
    daysBetweenUploads: number;
    associatedIssuesCount: {
      revA: number;
      revB: number;
    };
  };
}

/**
 * Compare two revisions of a drawing document with strict tenant and project authorization.
 */
export async function compareDrawingRevisions(
  ctx: TenantContext,
  documentId: string,
  revAId: string,
  revBId: string
): Promise<DrawingRevisionComparisonResult> {
  // 1. Fetch document with tenant isolation
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId: ctx.tenantId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!doc) {
    throw new Error("Drawing document not found in active workspace.");
  }

  // 2. Enforce employee project access
  if (!isAdminOrOwner(ctx)) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        tenantId: ctx.tenantId,
        projectId: doc.projectId,
        membershipId: ctx.membershipId,
      },
    });
    if (!isMember) {
      throw new ForbiddenException("You do not have access to drawings on this project.");
    }
  }

  // 3. Fetch both revisions
  const [versionA, versionB] = await Promise.all([
    prisma.documentVersion.findFirst({
      where: {
        id: revAId,
        documentId,
        tenantId: ctx.tenantId,
      },
      include: {
        approvalRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.documentVersion.findFirst({
      where: {
        id: revBId,
        documentId,
        tenantId: ctx.tenantId,
      },
      include: {
        approvalRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!versionA || !versionB) {
    throw new Error("One or both specified drawing revisions could not be found.");
  }

  // 4. Fetch private file metadata & uploader details
  const fileIds = [versionA.fileId, versionB.fileId];
  const files = await prisma.privateFile.findMany({
    where: {
      id: { in: fileIds },
      tenantId: ctx.tenantId,
    },
    select: {
      id: true,
      fileName: true,
      byteSize: true,
    },
  });

  const fileMap = new Map(files.map((f) => [f.id, f]));

  const uploaderMemberships = await prisma.tenantMembership.findMany({
    where: {
      id: { in: [versionA.uploaderId, versionB.uploaderId] },
      tenantId: ctx.tenantId,
    },
    include: {
      user: { select: { fullName: true } },
    },
  });
  const uploaderMap = new Map(uploaderMemberships.map((m) => [m.id, m.user.fullName]));

  // 5. Fetch linked site issues
  const [issuesA, issuesB] = await Promise.all([
    prisma.studioSiteIssue.count({
      where: {
        tenantId: ctx.tenantId,
        relatedDrawingVersionId: versionA.id,
      },
    }),
    prisma.studioSiteIssue.count({
      where: {
        tenantId: ctx.tenantId,
        relatedDrawingVersionId: versionB.id,
      },
    }),
  ]);

  // 6. Compute timeline delta
  const diffTime = Math.abs(versionB.createdAt.getTime() - versionA.createdAt.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    document: {
      id: doc.id,
      title: doc.title,
      drawingNumber: doc.drawingNumber,
      discipline: doc.discipline,
      documentType: doc.documentType,
      projectId: doc.projectId,
      projectName: doc.project.name,
      projectCode: doc.project.code,
    },
    revisionA: {
      id: versionA.id,
      revision: versionA.revision,
      issuePurpose: versionA.issuePurpose,
      approvalState: versionA.approvalState,
      fileId: versionA.fileId,
      fileName: fileMap.get(versionA.fileId)?.fileName,
      fileSize: fileMap.get(versionA.fileId)?.byteSize,
      uploaderId: versionA.uploaderId,
      uploaderName: uploaderMap.get(versionA.uploaderId) || "Studio Member",
      createdAt: versionA.createdAt.toISOString(),
      approvalHistory: versionA.approvalRequests.map((ar) => ({
        id: ar.id,
        status: ar.status,
        comment: ar.comment,
        decidedAt: ar.decidedAt ? ar.decidedAt.toISOString() : null,
      })),
    },
    revisionB: {
      id: versionB.id,
      revision: versionB.revision,
      issuePurpose: versionB.issuePurpose,
      approvalState: versionB.approvalState,
      fileId: versionB.fileId,
      fileName: fileMap.get(versionB.fileId)?.fileName,
      fileSize: fileMap.get(versionB.fileId)?.byteSize,
      uploaderId: versionB.uploaderId,
      uploaderName: uploaderMap.get(versionB.uploaderId) || "Studio Member",
      createdAt: versionB.createdAt.toISOString(),
      approvalHistory: versionB.approvalRequests.map((ar) => ({
        id: ar.id,
        status: ar.status,
        comment: ar.comment,
        decidedAt: ar.decidedAt ? ar.decidedAt.toISOString() : null,
      })),
    },
    diff: {
      revisionProgression: `${versionA.revision} → ${versionB.revision}`,
      purposeChanged: versionA.issuePurpose !== versionB.issuePurpose,
      previousPurpose: versionA.issuePurpose,
      currentPurpose: versionB.issuePurpose,
      approvalStatusComparison: {
        revAState: versionA.approvalState,
        revBState: versionB.approvalState,
        superseded: versionA.supersededById === versionB.id,
      },
      daysBetweenUploads: diffDays,
      associatedIssuesCount: {
        revA: issuesA,
        revB: issuesB,
      },
    },
  };
}
