import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";

export interface CreateSiteIssueInput {
  projectId: string;
  siteLocation: string;
  title: string;
  description?: string;
  category: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  responsibleEmployeeId?: string | null;
  relatedContractorId?: string | null;
  relatedDrawingVersionId?: string | null;
  siteVisitId?: string | null;
  dueDate?: string | null;
  evidencePhotos?: string[];
}

export interface UpdateSiteIssueInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  responsibleEmployeeId?: string | null;
  relatedContractorId?: string | null;
  dueDate?: string | null;
  resolutionNotes?: string;
  evidencePhotos?: string[];
}

export interface SiteIssueFilterParams {
  projectId?: string;
  responsibleEmployeeId?: string;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  isOverdue?: boolean;
}

/**
 * Lists site issues with multi-dimensional filtering, permission gating, and overdue indicators.
 */
export async function listSiteIssues(context: TenantContext, params: SiteIssueFilterParams = {}) {
  const isPrivileged = isAdminOrOwner(context);
  const where: any = {
    tenantId: context.tenantId,
  };

  // Regular employees only see issues for projects they are assigned to
  if (!isPrivileged) {
    const userProjects = await prisma.projectMember.findMany({
      where: { tenantId: context.tenantId, membershipId: context.membershipId },
      select: { projectId: true },
    });
    const allowedProjectIds = userProjects.map((p) => p.projectId);
    where.projectId = { in: allowedProjectIds };
  }

  if (params.projectId) {
    if (where.projectId?.in && !where.projectId.in.includes(params.projectId)) {
      return [];
    }
    where.projectId = params.projectId;
  }

  if (params.responsibleEmployeeId) {
    where.responsibleEmployeeId = params.responsibleEmployeeId;
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params.priority && params.priority !== "ALL") {
    where.priority = params.priority;
  }

  if (params.category && params.category !== "ALL") {
    where.category = params.category;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { referenceNumber: { contains: q } },
      { siteLocation: { contains: q } },
    ];
  }

  const now = new Date();
  if (params.isOverdue) {
    where.dueDate = { lt: now };
    where.status = { notIn: ["CLOSED"] };
  }

  const issues = await prisma.studioSiteIssue.findMany({
    where,
    include: {
      project: { select: { id: true, code: true, name: true } },
      reporter: {
        include: { user: { select: { fullName: true, email: true } } },
      },
      responsibleEmployee: {
        include: {
          membership: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      },
      verifier: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return issues.map((issue) => {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < now && issue.status !== "CLOSED";
    return {
      ...issue,
      isOverdue,
    };
  });
}

/**
 * Creates a new site issue with auto-generated reference number and initial audit event.
 */
export async function createSiteIssue(context: TenantContext, input: CreateSiteIssueInput) {
  // Check project membership if not admin
  if (!isAdminOrOwner(context)) {
    const member = await prisma.projectMember.findFirst({
      where: {
        tenantId: context.tenantId,
        projectId: input.projectId,
        membershipId: context.membershipId,
      },
    });
    if (!member) {
      throw new ForbiddenException("You must be assigned to the project to report site issues.");
    }
  }

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, tenantId: context.tenantId },
  });
  if (!project) throw new Error("Project not found");

  const issueCount = await prisma.studioSiteIssue.count({
    where: { tenantId: context.tenantId, projectId: input.projectId },
  });
  const referenceNumber = `ISSUE-${project.code}-${String(issueCount + 1).padStart(3, "0")}`;

  const initialStatus = input.responsibleEmployeeId ? "ASSIGNED" : "OPEN";
  const now = new Date();

  const activity = [
    {
      actor: context.userFullName,
      action: "REPORTED",
      timestamp: now.toISOString(),
      notes: `Reported issue ${referenceNumber}: ${input.title}`,
    },
  ];

  return await prisma.studioSiteIssue.create({
    data: {
      tenantId: context.tenantId,
      referenceNumber,
      projectId: input.projectId,
      siteLocation: input.siteLocation,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      priority: input.priority || "MEDIUM",
      status: initialStatus,
      reporterId: context.membershipId,
      responsibleEmployeeId: input.responsibleEmployeeId || null,
      relatedContractorId: input.relatedContractorId || null,
      relatedDrawingVersionId: input.relatedDrawingVersionId || null,
      siteVisitId: input.siteVisitId || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      evidencePhotosJson: input.evidencePhotos ? (input.evidencePhotos as any) : null,
      activityJson: activity as any,
    },
    include: {
      project: { select: { code: true, name: true } },
      reporter: { include: { user: true } },
    },
  });
}

/**
 * Updates site issue details, submits resolution evidence, or transitions workflow status.
 */
export async function updateSiteIssue(
  context: TenantContext,
  issueId: string,
  input: UpdateSiteIssueInput
) {
  const issue = await prisma.studioSiteIssue.findFirst({
    where: { id: issueId, tenantId: context.tenantId },
  });
  if (!issue) throw new Error("Site issue not found");

  const now = new Date();
  const activity = Array.isArray(issue.activityJson) ? [...issue.activityJson] : [];

  const updateData: any = {};
  if (input.title) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.category) updateData.category = input.category;
  if (input.priority) updateData.priority = input.priority;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.relatedContractorId !== undefined) updateData.relatedContractorId = input.relatedContractorId;

  if (input.responsibleEmployeeId !== undefined) {
    updateData.responsibleEmployeeId = input.responsibleEmployeeId;
    if (input.responsibleEmployeeId && issue.status === "OPEN") {
      updateData.status = "ASSIGNED";
    }
  }

  if (input.resolutionNotes) {
    updateData.resolutionNotes = input.resolutionNotes.trim();
  }

  if (input.evidencePhotos) {
    updateData.evidencePhotosJson = input.evidencePhotos as any;
  }

  if (input.status && input.status !== issue.status) {
    updateData.status = input.status;
    activity.push({
      actor: context.userFullName,
      action: `STATUS_CHANGED_TO_${input.status}`,
      timestamp: now.toISOString(),
      notes: input.resolutionNotes || `Status updated from ${issue.status} to ${input.status}`,
    });
  }

  updateData.activityJson = activity as any;

  return await prisma.studioSiteIssue.update({
    where: { id: issue.id },
    data: updateData,
  });
}

/**
 * Verifies and closes or reopens a site issue.
 * Strictly requires authorized leadership or project lead verifier.
 */
export async function verifySiteIssue(
  context: TenantContext,
  issueId: string,
  decision: "CLOSE" | "REOPEN",
  reopenReason?: string
) {
  const isPrivileged = isAdminOrOwner(context);
  if (!isPrivileged) {
    throw new ForbiddenException("Only Studio Leadership can formally close or reopen site issues.");
  }

  const issue = await prisma.studioSiteIssue.findFirst({
    where: { id: issueId, tenantId: context.tenantId },
  });
  if (!issue) throw new Error("Site issue not found");

  const now = new Date();
  const activity = Array.isArray(issue.activityJson) ? [...issue.activityJson] : [];

  if (decision === "CLOSE") {
    activity.push({
      actor: context.userFullName,
      action: "VERIFIED_AND_CLOSED",
      timestamp: now.toISOString(),
      notes: "Resolution evidence verified and signed off.",
    });

    return await prisma.studioSiteIssue.update({
      where: { id: issue.id },
      data: {
        status: "CLOSED",
        verifierId: context.membershipId,
        verifiedAt: now,
        activityJson: activity as any,
      },
    });
  } else {
    // REOPEN
    if (!reopenReason || !reopenReason.trim()) {
      throw new Error("A specific reason is mandatory to reopen a site issue.");
    }

    activity.push({
      actor: context.userFullName,
      action: "REOPENED",
      timestamp: now.toISOString(),
      notes: reopenReason.trim(),
    });

    return await prisma.studioSiteIssue.update({
      where: { id: issue.id },
      data: {
        status: "REOPENED",
        reopenReason: reopenReason.trim(),
        verifierId: context.membershipId,
        verifiedAt: now,
        activityJson: activity as any,
      },
    });
  }
}

/**
 * Idempotently converts a site issue into a formal project task.
 * Prevents recursive update loops by recording taskId on the site issue.
 */
export async function convertSiteIssueToTask(context: TenantContext, issueId: string) {
  const issue = await prisma.studioSiteIssue.findFirst({
    where: { id: issueId, tenantId: context.tenantId },
    include: { project: true, responsibleEmployee: true },
  });
  if (!issue) throw new Error("Site issue not found");

  // Idempotency: if already converted, return existing task
  if (issue.taskId) {
    const existingTask = await prisma.task.findUnique({
      where: { id: issue.taskId },
    });
    if (existingTask) {
      return { task: existingTask, alreadyConverted: true };
    }
  }

  // Create new task
  const newTask = await prisma.task.create({
    data: {
      tenantId: context.tenantId,
      projectId: issue.projectId,
      creatorId: context.membershipId,
      assigneeId: issue.responsibleEmployee?.membershipId || null,
      title: `[SITE ISSUE ${issue.referenceNumber}] ${issue.title}`,
      description: `Location: ${issue.siteLocation}\nCategory: ${issue.category}\n\n${issue.description || ""}`,
      priority: issue.priority as any,
      dueDate: issue.dueDate,
    },
  });

  // Link task back to site issue
  await prisma.studioSiteIssue.update({
    where: { id: issue.id },
    data: { taskId: newTask.id },
  });

  return { task: newTask, alreadyConverted: false };
}
