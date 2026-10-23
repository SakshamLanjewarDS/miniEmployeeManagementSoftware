import { prisma } from "@/server/db/prisma";
import {
  TenantContext,
  assertTenantAccess,
  canManageHR,
  assertCanManageHR,
  assertCannotSelfReview,
  ForbiddenException,
  UnauthorizedException,
} from "@/server/tenancy/context";
import { savePrivateFile, SaveFileInput } from "@/server/storage/storage-adapter";
import { EmployeeDocumentCategory, EmployeeDocumentStatus } from "@prisma/client";

export const MANDATORY_DOCUMENT_CATEGORIES: EmployeeDocumentCategory[] = [
  "AADHAAR",
  "DEGREE",
  "BANK_PASSBOOK",
];

export interface UploadDocumentInput {
  category: EmployeeDocumentCategory;
  title: string;
  file: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  };
  metadata?: {
    maskedNumber?: string;
    degreeName?: string;
    bankLast4?: string;
  };
}

/**
 * Get all document records and completion status for an employee.
 * Accessible to the employee themselves or users with HR management permission.
 */
export async function getEmployeeDocuments(ctx: TenantContext, employeeId: string) {
  // Authorize: Employee themselves or HR Admin/Owner
  const isSelf = ctx.employeeId === employeeId;
  if (!isSelf && !canManageHR(ctx)) {
    throw new ForbiddenException("Forbidden: You do not have permission to view this employee's sensitive document vault.");
  }

  const employee = await prisma.employee.findUnique({
    where: { tenantId_employeeId: { tenantId: ctx.tenantId, employeeId } },
    include: {
      membership: {
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });

  if (!employee) {
    throw new Error(`Employee '${employeeId}' not found in workspace.`);
  }

  const documents = await prisma.employeeDocument.findMany({
    where: {
      tenantId: ctx.tenantId,
      employeeId: employee.id,
      isCurrent: true,
    },
    include: {
      reviewer: {
        include: { user: { select: { fullName: true } } },
      },
      privateFile: {
        select: { id: true, fileName: true, byteSize: true, mimeType: true, scanStatus: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate completion
  const verifiedCount = documents.filter(
    (d) => MANDATORY_DOCUMENT_CATEGORIES.includes(d.category) && d.status === "VERIFIED"
  ).length;

  const totalMandatory = MANDATORY_DOCUMENT_CATEGORIES.length;
  const isDocumentationComplete = verifiedCount === totalMandatory;

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.membership.user.fullName,
      email: employee.membership.user.email,
      department: employee.department,
      designation: employee.designation,
    },
    documents,
    stats: {
      verifiedCount,
      totalMandatory,
      progressString: `${verifiedCount}/${totalMandatory} verified`,
      isDocumentationComplete,
    },
  };
}

/**
 * Upload a document to an employee's vault.
 * Accessible to employee (self-upload) or HR Admin/Owner.
 */
export async function uploadEmployeeDocument(
  ctx: TenantContext,
  employeeId: string,
  input: UploadDocumentInput
) {
  const isSelf = ctx.employeeId === employeeId;
  if (!isSelf && !canManageHR(ctx)) {
    throw new ForbiddenException("Forbidden: You cannot upload documents for another employee.");
  }

  const employee = await prisma.employee.findUnique({
    where: { tenantId_employeeId: { tenantId: ctx.tenantId, employeeId } },
    include: { membership: { include: { user: true } } },
  });

  if (!employee) {
    throw new Error(`Employee '${employeeId}' not found.`);
  }

  // Save file into private tenant storage with content inspection & quarantine check
  const savedFile = await savePrivateFile(ctx, {
    fileName: input.file.fileName,
    mimeType: input.file.mimeType,
    buffer: input.file.buffer,
    isDocumentVault: true,
  });

  // Archive previous current version of this category
  const previousDoc = await prisma.employeeDocument.findFirst({
    where: {
      tenantId: ctx.tenantId,
      employeeId: employee.id,
      category: input.category,
      isCurrent: true,
    },
  });

  const nextVersion = previousDoc ? previousDoc.version + 1 : 1;
  if (previousDoc) {
    await prisma.employeeDocument.update({
      where: { id: previousDoc.id },
      data: { isCurrent: false },
    });
  }

  // Create new document version
  const doc = await prisma.employeeDocument.create({
    data: {
      tenantId: ctx.tenantId,
      employeeId: employee.id,
      category: input.category,
      title: input.title,
      status: "PENDING_REVIEW",
      scanStatus: savedFile.scanStatus as any,
      privateFileId: savedFile.id,
      version: nextVersion,
      isCurrent: true,
      metadataJson: input.metadata ? (input.metadata as any) : undefined,
    },
  });

  // Audit upload event (no raw sensitive data logged)
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "EMPLOYEE_DOCUMENT_UPLOADED",
      entityType: "EmployeeDocument",
      entityId: doc.id,
      safeChangeSummary: `${ctx.userFullName} uploaded ${input.category} document (v${nextVersion}) for ${employee.membership.user.fullName}.`,
    },
  }).catch(() => {});

  // Create notification for HR reviewer queue
  await prisma.notification.create({
    data: {
      tenantId: ctx.tenantId,
      recipientId: ctx.membershipId, // or broadcast to HR in real outbox
      title: "New Employee Document Uploaded",
      message: `Document '${input.title}' (${input.category}) uploaded for employee ${employeeId} and is pending verification.`,
    },
  });

  return doc;
}

/**
 * Review an employee document (Verify, Reject, or Request Replacement).
 * Administrators cannot verify their own documents!
 */
export async function reviewEmployeeDocument(
  ctx: TenantContext,
  documentId: string,
  decision: "VERIFIED" | "REJECTED" | "REPLACEMENT_REQUESTED",
  remarks?: string
) {
  assertCanManageHR(ctx);

  const document = await prisma.employeeDocument.findUnique({
    where: { id: documentId },
    include: {
      employee: {
        include: {
          membership: {
            include: { user: { select: { id: true, fullName: true, email: true } } },
          },
        },
      },
    },
  });

  if (!document || document.tenantId !== ctx.tenantId) {
    throw new Error("Document not found in this workspace.");
  }

  // Four-eyes policy: Admin cannot verify their own HR documents!
  assertCannotSelfReview(
    ctx,
    document.employee.employeeId,
    "Forbidden: Administrators cannot verify their own HR documents. Please route to the Studio Owner or another authorized HR administrator."
  );

  const updatedDoc = await prisma.employeeDocument.update({
    where: { id: documentId },
    data: {
      status: decision,
      reviewerId: ctx.membershipId,
      reviewedAt: new Date(),
      reviewerRemarks: remarks ?? null,
      rejectionReason: decision !== "VERIFIED" ? remarks ?? null : null,
    },
  });

  // Audit review action
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: `EMPLOYEE_DOCUMENT_${decision}`,
      entityType: "EmployeeDocument",
      entityId: documentId,
      safeChangeSummary: `${ctx.userFullName} set document status to ${decision} for ${document.employee.membership?.user?.fullName || document.title}.`,
    },
  }).catch(() => {});

  // Notify employee of review outcome with safe remarks
  await prisma.notification.create({
    data: {
      tenantId: ctx.tenantId,
      recipientId: document.employee.membership.id,
      title: decision === "VERIFIED" ? "Document Verified" : "Document Review Update",
      message:
        decision === "VERIFIED"
          ? `Your document '${document.title}' has been successfully verified.`
          : `Update regarding '${document.title}': ${decision.replace(/_/g, " ")}. Remarks: ${remarks || "Please check your document vault for details."}`,
    },
  });

  return updatedDoc;
}

/**
 * Delete a document from the vault.
 * Permitted only for HR Admin/Owner or employee before review begins.
 */
export async function deleteEmployeeDocument(ctx: TenantContext, documentId: string) {
  const document = await prisma.employeeDocument.findUnique({
    where: { id: documentId },
    include: { employee: true },
  });

  if (!document || document.tenantId !== ctx.tenantId) {
    throw new Error("Document not found.");
  }

  const isSelf = ctx.employeeId === document.employee.employeeId;
  const isHR = canManageHR(ctx);

  if (!isSelf && !isHR) {
    throw new ForbiddenException("Forbidden: Insufficient privileges to delete this document.");
  }

  // Employee can only delete unreviewed / draft / rejected documents
  if (isSelf && !isHR && document.status === "VERIFIED") {
    throw new ForbiddenException("Forbidden: Verified documents cannot be deleted by employees. Contact HR administration.");
  }

  await prisma.employeeDocument.update({
    where: { id: documentId },
    data: { isCurrent: false, status: "REPLACEMENT_REQUESTED" },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "EMPLOYEE_DOCUMENT_DELETED",
      entityType: "EmployeeDocument",
      entityId: documentId,
      safeChangeSummary: `${ctx.userFullName} deleted or requested replacement for document ${document.title} (${document.category}).`,
    },
  }).catch(() => {});

  return { success: true };
}

/**
 * Get the global HR document review queue for Owner / HR Admins.
 */
export async function getDocumentReviewQueue(ctx: TenantContext) {
  assertCanManageHR(ctx);

  const pendingDocuments = await prisma.employeeDocument.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "PENDING_REVIEW",
      isCurrent: true,
    },
    include: {
      employee: {
        include: {
          membership: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      },
      privateFile: {
        select: { id: true, fileName: true, byteSize: true, mimeType: true, scanStatus: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return pendingDocuments;
}
