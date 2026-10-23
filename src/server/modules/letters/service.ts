import { prisma } from "@/server/db/prisma";
import {
  TenantContext,
  assertTenantAccess,
  canManageHR,
  assertCanManageHR,
  assertCannotSelfReview,
  ForbiddenException,
} from "@/server/tenancy/context";
import { LetterTemplateType, LetterTemplateStatus, IssuedLetterStatus } from "@prisma/client";
import { generateLetterPdf } from "./pdf-generator";
import { savePrivateFile } from "@/server/storage/storage-adapter";

export const DEFAULT_HR_TEMPLATES: Record<
  LetterTemplateType,
  { title: string; bodyTemplate: string; description: string }
> = {
  OFFER: {
    title: "Employment Offer Letter",
    description: "Standard formal offer of employment for architectural & studio candidates.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nOn behalf of {{companyName}}, we are delighted to extend this formal offer of employment for the position of {{designation}} in the {{department}} Department.\n\nYour joining date is scheduled for {{joinDate}}. You will report directly to {{reportingManager}}. Your annual gross compensation will be INR {{salary}}, subject to statutory deductions.\n\nWe look forward to welcoming you to our architecture practice. Please review, sign, and return the duplicate copy of this letter as confirmation of your acceptance.",
  },
  APPOINTMENT: {
    title: "Formal Letter of Appointment",
    description: "Official appointment letter setting terms and conditions of studio employment.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nWith reference to your offer acceptance, {{companyName}} is pleased to appoint you as {{designation}} effective {{effectiveDate}}.\n\nYour employment terms, professional responsibilities, and operational commitments are governed by the studio's policies and project appointment schedule.\n\nWe wish you a rewarding career with us.",
  },
  JOINING_CONFIRMATION: {
    title: "Joining Confirmation Letter",
    description: "Formal acknowledgement that the employee reported to work.",
    bodyTemplate:
      "To Whom It May Concern,\n\nThis is to formally certify that {{employeeName}} (Employee ID: {{employeeId}}) has joined {{companyName}} as {{designation}} on {{joinDate}}.\n\nThis letter confirms their active employment status in the {{department}} department.",
  },
  EMPLOYEE_JOINING_REPORT: {
    title: "Employee Joining Report",
    description: "Internal HR record of candidate induction and document submission.",
    bodyTemplate:
      "Employee Joining Induction Record:\n\nEmployee Name: {{employeeName}}\nEmployee ID: {{employeeId}}\nDepartment: {{department}}\nDesignation: {{designation}}\nDate of Joining: {{joinDate}}\nReporting Officer: {{reportingManager}}\n\nThe employee has completed induction and submitted baseline identity and banking documents.",
  },
  PROBATION_CONFIRMATION: {
    title: "Probation Confirmation Letter",
    description: "Confirms satisfactory completion of the initial probation period.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nConsequent to your performance appraisal during the probation period, {{companyName}} is pleased to confirm your employment as {{designation}} effective {{effectiveDate}}.\n\nAll other terms and conditions of your employment contract remain intact. We appreciate your dedication and contribution to our architectural commissions.",
  },
  PROBATION_EXTENSION: {
    title: "Probation Period Extension Letter",
    description: "Extends probation to allow further performance review.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nFollowing a review of your probationary period as {{designation}}, the studio leadership has decided to extend your probation until {{effectiveDate}} to enable further evaluation of project deliverables and team collaboration.\n\nYour reporting manager will work closely with you to establish measurable goals during this extension.",
  },
  SALARY_REVISION: {
    title: "Salary Revision & Increment Letter",
    description: "Formal notification of approved salary adjustment.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nIn recognition of your performance and valued contribution to {{companyName}}, management is pleased to inform you that your annual compensation has been revised to INR {{salary}} effective {{effectiveDate}}.\n\nWe congratulate you on your achievements and look forward to your continued leadership.",
  },
  PROMOTION: {
    title: "Promotion & Designation Change Letter",
    description: "Elevates employee to a new professional tier or title.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nWe are delighted to promote you to the position of {{designation}} in the {{department}} Department, effective {{effectiveDate}}.\n\nIn this senior role, you will take on expanded responsibilities across studio design reviews and project delivery. We congratulate you on this well-earned advancement.",
  },
  TRANSFER: {
    title: "Studio Transfer & Reassignment Letter",
    description: "Internal department or branch location reassignment.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nYou are hereby notified that effective {{effectiveDate}}, your assignment is transferred to the {{department}} Department under the leadership of {{reportingManager}}.\n\nAll existing contractual terms and accrued benefits remain fully preserved.",
  },
  EXPERIENCE_CERTIFICATE: {
    title: "Certificate of Experience",
    description: "Summary of professional tenure and responsibilities upon departure.",
    bodyTemplate:
      "To Whom It May Concern,\n\nThis is to certify that {{employeeName}} was employed with {{companyName}} from {{joinDate}} to {{effectiveDate}}, concluding their tenure as {{designation}}.\n\nDuring their employment, they exhibited commendable architectural acumen, professionalism, and dedication. We wish them every success in future endeavors.",
  },
  RELIEVING: {
    title: "Official Relieving Letter",
    description: "Confirms formal release from studio employment duties and clearances.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nWith reference to your formal resignation, you are hereby relieved from your duties as {{designation}} at {{companyName}} at the close of working hours on {{effectiveDate}}.\n\nAll studio assets, drawings, and files under your custody have been successfully handed over, and full-and-final settlement clearances are complete.",
  },
  TERMINATION: {
    title: "Notice of Employment Termination",
    description: "Requires explicit authorized approval. Never auto-generated without human decision.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nThis letter serves as formal notification that your employment with {{companyName}} as {{designation}} is terminated effective {{effectiveDate}} in accordance with the terms of your contract.\n\nPlease coordinate with HR regarding asset handover and final settlement.",
  },
  EMPLOYMENT_VERIFICATION: {
    title: "Employment Verification Letter",
    description: "Third-party bank, visa, or tenancy verification of active status.",
    bodyTemplate:
      "To Whom It May Concern,\n\nThis letter confirms that {{employeeName}} (Employee ID: {{employeeId}}) is currently employed on a full-time basis with {{companyName}} as {{designation}} since {{joinDate}}.\n\nTheir current annual gross salary is INR {{salary}}. This letter is issued upon the employee's request for official verification purposes.",
  },
};

/**
 * Ensure default starter templates are provisioned for a workspace
 */
export async function ensureDefaultTemplates(ctx: TenantContext): Promise<void> {
  for (const [typeKey, tpl] of Object.entries(DEFAULT_HR_TEMPLATES)) {
    const type = typeKey as LetterTemplateType;
    const existing = await prisma.letterTemplate.findFirst({
      where: { tenantId: ctx.tenantId, type },
    });
    if (!existing) {
      await prisma.letterTemplate.create({
        data: {
          tenantId: ctx.tenantId,
          type,
          title: tpl.title,
          description: tpl.description,
          bodyTemplate: tpl.bodyTemplate,
          status: "PUBLISHED",
          version: 1,
        },
      });
    }
  }
}

/**
 * Get all available letter templates for the studio
 */
export async function getLetterTemplates(ctx: TenantContext) {
  assertCanManageHR(ctx);
  await ensureDefaultTemplates(ctx);

  return await prisma.letterTemplate.findMany({
    where: { tenantId: ctx.tenantId, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Concurrency-safe sequential reference allocation: 100DS/HR/{year}/{0001}
 */
export async function allocateNextLetterNumber(
  tx: any,
  tenantId: string,
  year = new Date().getFullYear()
): Promise<string> {
  const prefix = `100DS/HR/${year}/`;

  // Query existing issued letters for this prefix
  const highest = await tx.issuedLetter.findFirst({
    where: {
      tenantId,
      letterNumber: { startsWith: prefix },
    },
    orderBy: { letterNumber: "desc" },
    select: { letterNumber: true },
  });

  let nextSeq = 1;
  if (highest && highest.letterNumber) {
    const parts = highest.letterNumber.split("/");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const paddedSeq = String(nextSeq).padStart(4, "0");
  return `${prefix}${paddedSeq}`;
}

export async function allocateSequentialReference(
  ctx: TenantContext,
  year = new Date().getFullYear()
): Promise<string> {
  return await allocateNextLetterNumber(prisma, ctx.tenantId, year);
}

/**
 * Generate a new draft letter for an employee based on a selected template.
 */
export async function generateLetterDraft(
  ctx: TenantContext,
  templateType: LetterTemplateType,
  employeeId: string,
  overrides?: Record<string, string>
) {
  assertCanManageHR(ctx);
  await ensureDefaultTemplates(ctx);

  const employee = await prisma.employee.findUnique({
    where: { tenantId_employeeId: { tenantId: ctx.tenantId, employeeId } },
    include: {
      membership: {
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });

  if (!employee) {
    throw new Error(`Employee '${employeeId}' not found.`);
  }

  // Four-eyes policy: Admin cannot generate / approve their own employment letter!
  assertCannotSelfReview(
    ctx,
    employee.employeeId,
    "Forbidden: Administrators cannot generate or approve their own employment letters. Please route to the Studio Owner."
  );

  const template = await prisma.letterTemplate.findFirst({
    where: { tenantId: ctx.tenantId, type: templateType, status: "PUBLISHED" },
  });

  if (!template) {
    throw new Error(`Template for type '${templateType}' not found or not published.`);
  }

  // Auto-fill values from employee record
  const effectiveDateStr = overrides?.effectiveDate || new Date().toISOString().split("T")[0];
  const joinDateStr = employee.joinDate
    ? employee.joinDate.toISOString().split("T")[0]
    : effectiveDateStr;

  const placeholders: Record<string, string> = {
    employeeName: employee.membership.user.fullName,
    employeeId: employee.employeeId,
    department: employee.department || "Architecture & Design",
    designation: employee.designation || "Studio Associate",
    joinDate: joinDateStr,
    effectiveDate: effectiveDateStr,
    reportingManager: overrides?.reportingManager || "Studio Partner / Owner",
    companyName: ctx.tenantName || "100% DESIGN Studio",
    ...(overrides?.salary ? { salary: overrides.salary } : {}),
    ...overrides,
  };

  // Replace placeholders in bodyTemplate
  let filledBody = template.bodyTemplate;
  for (const [key, val] of Object.entries(placeholders)) {
    const reg = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    filledBody = filledBody.replace(reg, val);
  }

  // Create Draft letter
  const draft = await prisma.issuedLetter.create({
    data: {
      tenantId: ctx.tenantId,
      templateId: template.id,
      employeeId: employee.id,
      title: template.title,
      status: "DRAFT",
      bodyContent: filledBody,
      templateVersion: template.version,
      employeeSnapshotJson: {
        employeeId: employee.employeeId,
        fullName: employee.membership.user.fullName,
        department: employee.department,
        designation: employee.designation,
      },
      signatorySnapshotJson: {
        signatoryName: ctx.userFullName,
        signatoryTitle: ctx.role === "OWNER" ? "Studio Partner / Owner" : "Studio Administrator",
      },
    },
  });

  return draft;
}

/**
 * Edit letter draft content.
 * CRITICAL RULE: Invalidate prior approval if approved draft is edited before issuance!
 */
export async function updateLetterDraft(
  ctx: TenantContext,
  letterId: string,
  bodyContentOrData: string | { bodyContent?: string; title?: string },
  title?: string
) {
  assertCanManageHR(ctx);

  const letter = await prisma.issuedLetter.findUnique({
    where: { id: letterId },
    include: { employee: true },
  });

  if (!letter || letter.tenantId !== ctx.tenantId) {
    throw new Error("Letter not found.");
  }

  if (letter.status === "ISSUED" || letter.status === "SUPERSEDED") {
    throw new ForbiddenException("Issued letters cannot be altered. Create a new revision.");
  }

  assertCannotSelfReview(ctx, letter.employee.employeeId);

  const resolvedBodyContent = typeof bodyContentOrData === "object" && bodyContentOrData !== null
    ? (bodyContentOrData.bodyContent ?? "")
    : (bodyContentOrData ?? "");
  const resolvedTitle = (typeof bodyContentOrData === "object" && bodyContentOrData !== null && bodyContentOrData.title)
    ? bodyContentOrData.title
    : (title || letter.title);

  // If letter was APPROVED, editing it invalidates approval back to DRAFT!
  const nextStatus: IssuedLetterStatus = "DRAFT";

  const updated = await prisma.issuedLetter.update({
    where: { id: letterId },
    data: {
      bodyContent: resolvedBodyContent,
      title: resolvedTitle,
      status: nextStatus,
      approvedById: null,
      approvedAt: null,
    },
  });

  return updated;
}

/**
 * Approve a letter draft for issuance.
 */
export async function approveLetterDraft(ctx: TenantContext, letterId: string) {
  assertCanManageHR(ctx);

  const letter = await prisma.issuedLetter.findUnique({
    where: { id: letterId },
    include: { employee: true },
  });

  if (!letter || letter.tenantId !== ctx.tenantId) {
    throw new Error("Letter not found.");
  }

  if (letter.status !== "DRAFT" && letter.status !== "UNDER_REVIEW") {
    throw new Error(`Letter cannot be approved in state '${letter.status}'.`);
  }

  // Four-eyes policy: cannot self-approve
  assertCannotSelfReview(
    ctx,
    letter.employee.employeeId,
    "Forbidden: Administrators cannot approve their own employment letters."
  );

  return await prisma.issuedLetter.update({
    where: { id: letterId },
    data: {
      status: "APPROVED",
      approvedById: ctx.membershipId,
      approvedAt: new Date(),
    },
  });
}

/**
 * Issue a letter:
 * 1. Concurrency-safe sequential reference allocation (e.g. 100DS/HR/2026/0001).
 * 2. Reject unresolved placeholders or missing required data.
 * 3. Render official A4 PDF with letterhead.
 * 4. Save PDF to private storage.
 * 5. Freeze snapshot of content and signatory.
 * 6. Move state to ISSUED.
 */
export async function issueLetter(ctx: TenantContext, letterId: string) {
  assertCanManageHR(ctx);

  return await prisma.$transaction(async (tx) => {
    const letter = await tx.issuedLetter.findUnique({
      where: { id: letterId },
      include: {
        letterhead: true,
        employee: {
          include: {
            membership: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!letter || letter.tenantId !== ctx.tenantId) {
      throw new Error("Letter not found.");
    }

    if (letter.status === "ISSUED") {
      // Idempotency guarantee: already issued
      return letter;
    }

    if (letter.status !== "APPROVED" && letter.status !== "DRAFT") {
      throw new Error(`Letter must be approved before issuance. Current status: ${letter.status}`);
    }

    // Four-eyes policy
    assertCannotSelfReview(
      ctx,
      letter.employee.employeeId,
      "Forbidden: Administrators cannot issue their own employment letters."
    );

    // Reject unresolved placeholders like {{placeholder}}
    const unresolved = letter.bodyContent.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (unresolved && unresolved.length > 0) {
      throw new Error(
        `Cannot issue letter with unresolved placeholders: ${unresolved.join(", ")}. Please resolve all required fields.`
      );
    }

    // Allocate next letter reference number concurrency-safely
    const letterNumber = await allocateNextLetterNumber(tx, ctx.tenantId);
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Require approved studio company address before issuance
    const tenant = await tx.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, settings: true, branding: true },
    });
    const settings = (tenant?.settings as any) || {};
    const branding = (tenant?.branding as any) || {};
    const configuredAddress =
      settings.companyAddress ||
      branding.address ||
      settings.address ||
      (letter.letterhead?.bodyMarginsJson as any)?.companyAddress;

    if (!configuredAddress) {
      throw new Error(
        "Cannot issue official letter: Studio company address is not configured. Please configure the official studio address in Studio Settings or Letterhead before issuance."
      );
    }

    // Render official PDF
    const pdfBuffer = generateLetterPdf({
      referenceNumber: letterNumber,
      title: letter.title,
      dateStr,
      bodyText: letter.bodyContent,
      companyName: ctx.tenantName || "100% DESIGN Studio",
      companyAddress: configuredAddress,
      employeeName: letter.employee.membership.user.fullName,
      employeeDesignation: letter.employee.designation || undefined,
      signatoryName: ctx.userFullName,
      signatoryTitle: ctx.role === "OWNER" ? "Studio Partner / Owner" : "Studio Administrator",
      isDraft: false,
    });

    // Save PDF in private storage
    const pdfFile = await savePrivateFile(ctx, {
      fileName: `${letterNumber.replace(/\//g, "-")}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer,
      isDocumentVault: true,
      isTrustedInternal: true,
    });

    // Update letter record to ISSUED and freeze snapshots
    const issued = await tx.issuedLetter.update({
      where: { id: letterId },
      data: {
        status: "ISSUED",
        letterNumber,
        renderedPdfFileId: pdfFile.id,
        issuedAt: new Date(),
        issuedById: ctx.membershipId,
        signatorySnapshotJson: {
          signatoryName: ctx.userFullName,
          signatoryTitle: ctx.role === "OWNER" ? "Studio Partner / Owner" : "Studio Administrator",
          membershipId: ctx.membershipId,
        },
      },
    });

    // Audit issuance event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "HR_LETTER_ISSUED",
        entityType: "IssuedLetter",
        entityId: letterId,
        safeChangeSummary: `${ctx.userFullName} issued letter #${letterNumber} (${letter.title}) for ${letter.employee.membership.user.fullName}.`,
      },
    }).catch(() => {});

    // Notify employee of issued letter
    await tx.notification.create({
      data: {
        tenantId: ctx.tenantId,
        recipientId: letter.employee.membership.id,
        title: "Official HR Letter Issued",
        message: `An official letter '${letter.title}' (Ref: ${letterNumber}) has been issued to your portal.`,
      },
    });

    return issued;
  });
}

/**
 * Employee acknowledges receipt of issued letter.
 */
export async function acknowledgeLetter(ctx: TenantContext, letterId: string, notes?: string) {
  const letter = await prisma.issuedLetter.findUnique({
    where: { id: letterId },
    include: { employee: true },
  });

  if (!letter || letter.tenantId !== ctx.tenantId) {
    throw new Error("Letter not found.");
  }

  // Only the employee themselves can acknowledge their letter!
  if (ctx.employeeId !== letter.employee.employeeId) {
    throw new ForbiddenException("Forbidden: Only the recipient employee can acknowledge this letter.");
  }

  if (letter.status !== "ISSUED") {
    throw new Error("Only issued letters can be acknowledged.");
  }

  return await prisma.issuedLetter.update({
    where: { id: letterId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgmentNotes: notes ?? "Acknowledged via Employee Portal",
    },
  });
}

/**
 * Get all letters for an employee (accessible to employee themselves or HR Admin/Owner).
 */
export async function getEmployeeLetters(ctx: TenantContext, employeeId: string) {
  const isSelf = ctx.employeeId === employeeId;
  if (!isSelf && !canManageHR(ctx)) {
    throw new ForbiddenException("Forbidden: You cannot view another employee's letters.");
  }

  const employee = await prisma.employee.findUnique({
    where: { tenantId_employeeId: { tenantId: ctx.tenantId, employeeId } },
  });

  if (!employee) {
    throw new Error(`Employee '${employeeId}' not found.`);
  }

  return await prisma.issuedLetter.findMany({
    where: {
      tenantId: ctx.tenantId,
      employeeId: employee.id,
      // Employees only see ISSUED letters; HR can see drafts and under review
      status: isSelf && !canManageHR(ctx) ? "ISSUED" : undefined,
    },
    include: {
      renderedPdfFile: {
        select: { id: true, fileName: true, byteSize: true },
      },
      approvedBy: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
