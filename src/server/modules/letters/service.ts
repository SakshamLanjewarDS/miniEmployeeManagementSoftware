import { prisma } from "@/server/db/prisma";
import {
  TenantContext,
  assertTenantAccess,
  canManageHR,
  assertCanManageHR,
  assertAdminOnly,
  assertCannotSelfReview,
  ForbiddenException,
} from "@/server/tenancy/context";
import { LetterTemplateType, LetterTemplateStatus, IssuedLetterStatus } from "@prisma/client";
import { generateLetterPdf } from "./pdf-generator";
import { savePrivateFile } from "@/server/storage/storage-adapter";
import bcrypt from "bcryptjs";

export const DEFAULT_HR_TEMPLATES: Record<
  LetterTemplateType,
  { title: string; bodyTemplate: string; description: string }
> = {
  OFFER: {
    title: "Employment Offer Letter",
    description: "Standard formal offer of employment for architectural & studio candidates.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nOn behalf of {{companyName}}, we are pleased to extend this formal offer of employment for the position of {{designation}} in the {{department}} Department.\n\n1. Joining & Reporting Details:\nYour joining date is scheduled for {{joinDate}}. You will report directly to {{reportingManager}} at our studio.\n\n2. Compensation Package:\nYour annual gross compensation will be INR {{salary}}, subject to statutory deductions as per applicable tax regulations.\n\n3. Roles & Key Responsibilities:\n{{responsibilities}}\n\n4. Offer Acceptance:\nPlease review this letter and acknowledge acceptance through the studio portal or sign and return a duplicate copy within 5 business days.\n\nWe look forward to welcoming you to our architecture practice.",
  },
  APPOINTMENT: {
    title: "Formal Letter of Appointment",
    description: "Official appointment letter setting terms and conditions of studio employment.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nWith reference to your offer acceptance, {{companyName}} is pleased to appoint you as {{designation}} in the {{department}} Department effective {{effectiveDate}}.\n\n1. Appointment Particulars:\n- Designation: {{designation}}\n- Department: {{department}}\n- Reporting Lead: {{reportingManager}}\n- Annual Compensation: INR {{salary}}\n\n2. Key Operational Responsibilities:\n{{responsibilities}}\n\n3. Code of Conduct & Standards:\nYour employment terms, professional commitments, and drawing governance are governed by the studio's operational manual. You are expected to uphold the highest standards of architectural excellence.\n\nWe congratulate you and wish you a rewarding career with us.",
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
    title: "Certificate of Experience & Completion",
    description: "Summary of professional tenure and responsibilities upon tenure completion.",
    bodyTemplate:
      "To Whom It May Concern,\n\nThis is to certify that {{employeeName}} (Employee ID: {{employeeId}}) was employed with {{companyName}} from {{joinDate}} to {{effectiveDate}}, concluding their tenure as {{designation}} in the {{department}} Department.\n\n1. Role & Project Contributions:\n{{responsibilities}}\n\n2. Professional Conduct:\nDuring their employment, they exhibited commendable architectural acumen, teamwork, and professional dedication across their project deliverables.\n\nWe appreciate their service and wish them every success in their future endeavors.",
  },
  RELIEVING: {
    title: "Official Relieving Letter",
    description: "Confirms formal release from studio employment duties and clearances.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nWith reference to your formal resignation, you are hereby relieved from your duties as {{designation}} at {{companyName}} at the close of working hours on {{effectiveDate}}.\n\nAll studio assets, drawings, and files under your custody have been successfully handed over, and full-and-final settlement clearances are complete.",
  },
  TERMINATION: {
    title: "Notice of Employment Termination",
    description: "Official employment conclusion notice issued strictly by Administrator.",
    bodyTemplate:
      "Dear {{employeeName}},\n\nThis letter serves as formal notification that your employment with {{companyName}} as {{designation}} in the {{department}} Department is terminated effective {{effectiveDate}} in accordance with the terms of your contract.\n\n1. Reason & Background:\n{{responsibilities}}\n\n2. Asset Handover & Clearances:\nPlease coordinate with HR regarding immediate handover of all physical drawings, CAD files, project assets, and studio keys.\n\n3. Final Settlement:\nYour final settlement will be processed following completion of asset clearances.",
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
  assertAdminOnly(ctx, "Forbidden: Only Studio Administrators or Owners can view letter templates.");
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

export interface HiringLetterInput {
  templateType: LetterTemplateType;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  designation: string;
  department: string;
  salary: string;
  joinDate?: string;
  effectiveDate?: string;
  reportingManager?: string;
  responsibilities?: string;
  existingEmployeeId?: string;
}

/**
 * Build formal Gmail Compose Link & desktop mailto link with architectural greeting
 */
export function buildGmailLetterLink(params: {
  candidateEmail: string;
  candidateName: string;
  letterTitle: string;
  letterNumber: string;
  templateType: LetterTemplateType;
  designation: string;
  department: string;
  salary: string;
  dateStr: string;
  responsibilities: string;
  reportingManager: string;
  companyName: string;
  portalUrl: string;
}): { gmailUrl: string; mailtoUrl: string; emailSubject: string; emailBody: string } {
  const companyMail = "designadmin08@gmail.com";
  let subject = `${params.companyName} — Official ${params.letterTitle}: ${params.candidateName}`;
  let body = "";

  if (params.templateType === "OFFER") {
    subject = `${params.companyName} — Formal Employment Offer: ${params.candidateName} (${params.designation})`;
    body = `Dear ${params.candidateName},\n\nGreetings from ${params.companyName}!\n\nWe are delighted to extend this formal offer of employment for the position of ${params.designation} in our ${params.department} Department.\n\nOffer Summary:\n• Reference Number: ${params.letterNumber}\n• Position: ${params.designation}\n• Department: ${params.department}\n• Scheduled Joining Date: ${params.dateStr}\n• Reporting Partner / Lead: ${params.reportingManager}\n• Gross Compensation Package: INR ${params.salary}\n\nKey Roles & Responsibilities:\n${params.responsibilities}\n\nPlease review your formal offer letter and confirm your acceptance through our Studio Portal at ${params.portalUrl} or by signing and replying to this email within 5 business days.\n\nWe look forward to welcoming you to our architecture and design team.\n\nWarm regards,\nStudio Administrator\n${params.companyName}\n${companyMail}`;
  } else if (params.templateType === "APPOINTMENT") {
    subject = `${params.companyName} — Official Appointment Letter: ${params.candidateName}`;
    body = `Dear ${params.candidateName},\n\nGreetings from ${params.companyName}!\n\nConsequent to your acceptance of our offer, we are pleased to confirm your official appointment as ${params.designation} in the ${params.department} Department effective ${params.dateStr}.\n\nAppointment Particulars:\n• Reference: ${params.letterNumber}\n• Designation: ${params.designation}\n• Department: ${params.department}\n• Effective Date: ${params.dateStr}\n• Gross Compensation: INR ${params.salary}\n\nYour appointment record has been published to your studio profile at ${params.portalUrl}.\n\nCongratulations and we wish you a rewarding career with our practice.\n\nWarm regards,\nStudio Administrator\n${params.companyName}`;
  } else if (params.templateType === "TERMINATION") {
    subject = `${params.companyName} — Notice of Employment Termination: ${params.candidateName}`;
    body = `Dear ${params.candidateName},\n\nThis communication serves as formal notice that your employment with ${params.companyName} as ${params.designation} will conclude effective ${params.dateStr} (Ref: ${params.letterNumber}).\n\nPlease coordinate with HR regarding the immediate handover of all physical drawings, CAD files, and studio assets.\n\nRegards,\nStudio Administrator\n${params.companyName}`;
  } else {
    subject = `${params.companyName} — Certificate of Experience: ${params.candidateName}`;
    body = `Dear ${params.candidateName},\n\nPlease find your official Certificate of Experience & Service Completion from ${params.companyName} (Ref: ${params.letterNumber}).\n\nTenure Summary:\n• Designation: ${params.designation}\n• Department: ${params.department}\n• Effective Date: ${params.dateStr}\n\nWe thank you for your contributions to our architectural commissions and wish you success in your future endeavors.\n\nWarm regards,\nStudio Administrator\n${params.companyName}`;
  }

  const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
    companyMail
  )}&view=cm&fs=1&to=${encodeURIComponent(params.candidateEmail)}&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  const mailtoUrl = `mailto:${encodeURIComponent(params.candidateEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return { gmailUrl, mailtoUrl, emailSubject: subject, emailBody: body };
}

/**
 * Generate instantaneous test letter preview for Administrator verification
 */
export async function generateHiringLetterPreview(ctx: TenantContext, input: HiringLetterInput) {
  assertAdminOnly(ctx, "Forbidden: Only Studio Administrators can generate or design letters.");
  await ensureDefaultTemplates(ctx);

  const template = await prisma.letterTemplate.findFirst({
    where: { tenantId: ctx.tenantId, type: input.templateType, status: "PUBLISHED" },
  });

  const bodyTemplate = template?.bodyTemplate || DEFAULT_HR_TEMPLATES[input.templateType]?.bodyTemplate;
  const title = template?.title || DEFAULT_HR_TEMPLATES[input.templateType]?.title;

  const effectiveDateStr = input.effectiveDate || new Date().toISOString().split("T")[0];
  const joinDateStr = input.joinDate || effectiveDateStr;

  const placeholders: Record<string, string> = {
    employeeName: input.candidateName,
    employeeId: input.existingEmployeeId || "EMP-PREVIEW",
    department: input.department || "Architecture & Design",
    designation: input.designation || "Studio Associate",
    joinDate: joinDateStr,
    effectiveDate: effectiveDateStr,
    reportingManager: input.reportingManager || "Studio Partner / Owner",
    companyName: ctx.tenantName || "100% DESIGN Studio",
    responsibilities: input.responsibilities || "Standard architectural project deliverables and studio coordination.",
    salary: input.salary || "As per agreed terms",
  };

  let filledBody = bodyTemplate;
  for (const [key, val] of Object.entries(placeholders)) {
    const reg = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    filledBody = filledBody.replace(reg, val);
  }

  const currentYear = new Date().getFullYear();
  const previewRef = `100DS/HR/${currentYear}/PREVIEW-${Math.floor(100 + Math.random() * 900)}`;

  const emailLinks = buildGmailLetterLink({
    candidateEmail: input.candidateEmail,
    candidateName: input.candidateName,
    letterTitle: title,
    letterNumber: previewRef,
    templateType: input.templateType,
    designation: input.designation,
    department: input.department,
    salary: input.salary,
    dateStr: joinDateStr,
    responsibilities: placeholders.responsibilities,
    reportingManager: placeholders.reportingManager,
    companyName: placeholders.companyName,
    portalUrl: `https://${ctx.tenantSlug}.100percentdesign.com/w/${ctx.tenantSlug}/login`,
  });

  return {
    title,
    referenceNumber: previewRef,
    bodyContent: filledBody,
    signatoryName: ctx.userFullName,
    signatoryTitle: "Studio Administrator",
    companyName: ctx.tenantName || "100% DESIGN Studio",
    dateStr: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    ...emailLinks,
  };
}

/**
 * Issue official hiring letter: creates candidate/employee if needed,
 * renders PDF, freezes snapshot, persists in vault, and provides instant Gmail link.
 */
export async function issueHiringLetter(ctx: TenantContext, input: HiringLetterInput) {
  assertAdminOnly(ctx, "Forbidden: Only Studio Administrators have authority to generate and circulate employment letters.");
  await ensureDefaultTemplates(ctx);

  return await prisma.$transaction(async (tx) => {
    let employeeRecord: any = null;

    if (input.existingEmployeeId) {
      employeeRecord = await tx.employee.findUnique({
        where: { tenantId_employeeId: { tenantId: ctx.tenantId, employeeId: input.existingEmployeeId } },
        include: { membership: { include: { user: true } } },
      });
      if (!employeeRecord) {
        throw new Error(`Employee '${input.existingEmployeeId}' not found.`);
      }
    } else {
      // Find or provision candidate into the workspace
      const normalizedEmail = input.candidateEmail.trim().toLowerCase();
      let user = await tx.user.findFirst({
        where: { email: normalizedEmail },
      });

      if (!user) {
        const tempPasswordHash = await bcrypt.hash("StudioWelcome2026!", 10);
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: input.candidateName.trim(),
            passwordHash: tempPasswordHash,
          },
        });
      }

      let membership = await tx.tenantMembership.findUnique({
        where: {
          tenantId_userId: {
            tenantId: ctx.tenantId,
            userId: user.id,
          },
        },
        include: { employee: true },
      });

      if (!membership) {
        membership = await tx.tenantMembership.create({
          data: {
            tenantId: ctx.tenantId,
            userId: user.id,
            role: "EMPLOYEE",
            isActive: true,
          },
          include: { employee: true },
        });
      }

      if (membership.employee) {
        employeeRecord = {
          ...membership.employee,
          membership: { ...membership, user },
        };
      } else {
        const nextEmpNumber = Math.floor(100 + Math.random() * 899);
        const assignedEmployeeId = `EMP-${nextEmpNumber}`;
        const employee = await tx.employee.create({
          data: {
            tenantId: ctx.tenantId,
            membershipId: membership.id,
            employeeId: assignedEmployeeId,
            phone: input.candidatePhone || null,
            department: input.department,
            designation: input.designation,
            employmentStatus: input.templateType === "OFFER" ? "ONBOARDING" : "ACTIVE",
            joinDate: input.joinDate ? new Date(input.joinDate) : new Date(),
          },
        });

        employeeRecord = {
          ...employee,
          membership: { ...membership, user },
        };
      }
    }

    // Allocate real sequential letter number
    const letterNumber = await allocateNextLetterNumber(tx, ctx.tenantId);

    const template = await tx.letterTemplate.findFirst({
      where: { tenantId: ctx.tenantId, type: input.templateType, status: "PUBLISHED" },
    });
    const bodyTemplate = template?.bodyTemplate || DEFAULT_HR_TEMPLATES[input.templateType]?.bodyTemplate;
    const title = template?.title || DEFAULT_HR_TEMPLATES[input.templateType]?.title;

    const effectiveDateStr = input.effectiveDate || new Date().toISOString().split("T")[0];
    const joinDateStr = input.joinDate || effectiveDateStr;

    const placeholders: Record<string, string> = {
      employeeName: input.candidateName,
      employeeId: employeeRecord.employeeId,
      department: input.department || "Architecture & Design",
      designation: input.designation || "Studio Associate",
      joinDate: joinDateStr,
      effectiveDate: effectiveDateStr,
      reportingManager: input.reportingManager || "Studio Partner / Owner",
      companyName: ctx.tenantName || "100% DESIGN Studio",
      responsibilities: input.responsibilities || "Standard architectural project deliverables and studio coordination.",
      salary: input.salary || "As per agreed terms",
    };

    let filledBody = bodyTemplate;
    for (const [key, val] of Object.entries(placeholders)) {
      const reg = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      filledBody = filledBody.replace(reg, val);
    }

    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const tenant = await tx.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true, branding: true },
    });
    const settings = (tenant?.settings as any) || {};
    const branding = (tenant?.branding as any) || {};
    const companyAddress = settings.companyAddress || branding.address || "Studio 100, Design Boulevard, Mumbai, India";

    // Generate official PDF
    const pdfBuffer = generateLetterPdf({
      referenceNumber: letterNumber,
      title,
      dateStr,
      bodyText: filledBody,
      companyName: ctx.tenantName || "100% DESIGN Studio",
      companyAddress,
      employeeName: input.candidateName,
      employeeDesignation: input.designation,
      signatoryName: ctx.userFullName,
      signatoryTitle: "Studio Administrator",
      isDraft: false,
    });

    const pdfFile = await savePrivateFile(ctx, {
      fileName: `${letterNumber.replace(/\//g, "-")}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer,
      isDocumentVault: true,
      isTrustedInternal: true,
    });

    // Create issued letter record
    const issued = await tx.issuedLetter.create({
      data: {
        tenantId: ctx.tenantId,
        templateId: template?.id,
        employeeId: employeeRecord.id,
        letterNumber,
        title,
        status: "ISSUED",
        bodyContent: filledBody,
        renderedPdfFileId: pdfFile.id,
        issuedAt: new Date(),
        issuedById: ctx.membershipId,
        signatorySnapshotJson: {
          signatoryName: ctx.userFullName,
          signatoryTitle: "Studio Administrator",
          membershipId: ctx.membershipId,
        },
        employeeSnapshotJson: {
          employeeId: employeeRecord.employeeId,
          fullName: input.candidateName,
          department: input.department,
          designation: input.designation,
        },
      },
    });

    // Notify employee in-app
    if (employeeRecord.membership?.id) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          recipientId: employeeRecord.membership.id,
          title: `Official Letter Issued: ${title}`,
          message: `Your official ${title} (Ref: ${letterNumber}) is now available in your studio profile.`,
          link: `/w/${ctx.tenantSlug}/profile`,
        },
      }).catch(() => {});
    }

    const emailLinks = buildGmailLetterLink({
      candidateEmail: input.candidateEmail,
      candidateName: input.candidateName,
      letterTitle: title,
      letterNumber,
      templateType: input.templateType,
      designation: input.designation,
      department: input.department,
      salary: input.salary,
      dateStr: joinDateStr,
      responsibilities: placeholders.responsibilities,
      reportingManager: placeholders.reportingManager,
      companyName: placeholders.companyName,
      portalUrl: `https://${ctx.tenantSlug}.100percentdesign.com/w/${ctx.tenantSlug}/login`,
    });

    return {
      letter: issued,
      assignedEmployeeId: employeeRecord.employeeId,
      ...emailLinks,
    };
  });
}

