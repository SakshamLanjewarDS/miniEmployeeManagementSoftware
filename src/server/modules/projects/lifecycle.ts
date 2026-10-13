import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { ProjectStatus, PhaseStatus, TaskWorkflowStatus, ProjectMilestoneStatus, ChangeRequestStatus, Prisma } from "@prisma/client";
import { validateProjectStatusTransition } from "./policy";

/**
 * ============================================================================
 * STEP 1: PROJECT CREATION, DRAFTS, AND STRICT ACTIVATION
 * ============================================================================
 */

export interface ProjectDraftInput {
  code: string;
  name: string;
  description?: string;
  brief?: string;
  scopeItems?: any;
  exclusions?: any;
  acceptanceCriteria?: string;
  requiredClientInputs?: any;
  primaryClientId?: string;
  projectType?: string;
  siteAddress?: string;
  siteCity?: string;
  googleMapLocation?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  projectArchitectId?: string;
  projectManagerId?: string;
  projectCoordinatorId?: string;
  contractorId?: string;
  contractorIds?: string[];
  consultantId?: string;
  consultantIds?: string[];
  plotArea?: string;
  constructionArea?: string;
  budget?: number;
  currency?: string;
  startDate?: Date;
  targetDate?: Date;
  status?: ProjectStatus;
}

/**
 * Validates linked relational identifiers belong to the same studio tenant.
 */
export async function validateSameTenantEntities(
  tenantId: string,
  data: {
    primaryClientId?: string;
    projectArchitectId?: string;
    projectManagerId?: string;
    projectCoordinatorId?: string;
    contractorIds?: string[];
    consultantIds?: string[];
  }
) {
  if (data.primaryClientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.primaryClientId, tenantId },
    });
    if (!client) throw new Error("Selected Client does not belong to this studio workspace.");
  }

  const memberIds = [data.projectArchitectId, data.projectManagerId, data.projectCoordinatorId].filter(
    Boolean
  ) as string[];

  if (memberIds.length > 0) {
    const members = await prisma.tenantMembership.findMany({
      where: { id: { in: memberIds }, tenantId, isActive: true },
    });
    if (members.length !== memberIds.length) {
      throw new Error("One or more assigned studio team leads do not belong to this workspace or are inactive.");
    }
  }

  if (data.contractorIds && data.contractorIds.length > 0) {
    const contractors = await prisma.contractor.findMany({
      where: { id: { in: data.contractorIds }, tenantId },
    });
    if (contractors.length !== data.contractorIds.length) {
      throw new Error("One or more selected contractors do not belong to this studio workspace.");
    }
  }

  if (data.consultantIds && data.consultantIds.length > 0) {
    const consultants = await prisma.consultant.findMany({
      where: { id: { in: data.consultantIds }, tenantId },
    });
    if (consultants.length !== data.consultantIds.length) {
      throw new Error("One or more selected consultants do not belong to this studio workspace.");
    }
  }
}

/**
 * Strict Activation Validator (Used upon activating a project).
 */
export function validateStrictProjectActivation(data: ProjectDraftInput) {
  const errors: string[] = [];

  const code = (data.code || "").trim();
  if (!code) {
    errors.push("Project Code is required for activation (e.g., PRJ-101).");
  } else if (!/^[A-Za-z0-9_-]+$/.test(code)) {
    errors.push("Project Code must be alphanumeric with hyphens or underscores.");
  }

  const name = (data.name || "").trim();
  if (!name || name.length < 3) {
    errors.push("Project Name is required and must be at least 3 characters long.");
  }

  const brief = (data.brief || data.description || "").trim();
  if (!brief || brief.length < 10) {
    errors.push("A substantive Architectural Brief / Description (at least 10 characters) is required for activation.");
  }

  const topology = (data.projectType || "").trim();
  if (!topology) {
    errors.push("Architectural Typology / Topology configuration is required for activation.");
  }

  if (!data.primaryClientId) {
    errors.push("Primary Client assignment is required for project activation.");
  }

  // Accountable Owner or Admin lead
  if (!data.projectArchitectId && !data.projectManagerId) {
    errors.push("At least one accountable lead (Project Architect or Project Architecture 2) is required for activation.");
  }

  // Date range verification
  if (data.startDate && data.targetDate) {
    const start = new Date(data.startDate).getTime();
    const target = new Date(data.targetDate).getTime();
    if (target < start) {
      errors.push("Project Target/End Date cannot be before Planned Start Date.");
    }
  }

  // Geofence coordinate bounds (if provided)
  if (data.latitude !== undefined && data.latitude !== null) {
    if (data.latitude < -90 || data.latitude > 90) {
      errors.push("Latitude must be between -90 and 90 degrees.");
    }
  }
  if (data.longitude !== undefined && data.longitude !== null) {
    if (data.longitude < -180 || data.longitude > 180) {
      errors.push("Longitude must be between -180 and 180 degrees.");
    }
  }

  if (errors.length > 0) {
    const msg = errors.join(" ");
    const err: any = new Error(msg);
    err.validationErrors = errors;
    throw err;
  }
}

/**
 * Creates a project as either DRAFT or ACTIVE atomically.
 */
export async function createProjectWithLifecycle(ctx: TenantContext, data: ProjectDraftInput) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can create projects.");

  const requestedStatus = data.status || ProjectStatus.ACTIVE;
  const isPreCommission = requestedStatus === ProjectStatus.DRAFT || requestedStatus === ProjectStatus.PLANNING;
  const isDraft = requestedStatus === ProjectStatus.DRAFT;

  // 1. If Activating, enforce strict validation
  if (!isPreCommission) {
    validateStrictProjectActivation(data);
  } else {
    // Draft or Planning requires at least code or name to identify it
    if (!data.code?.trim() && !data.name?.trim()) {
      throw new Error(`${requestedStatus} project requires at least a Project Code or Name.`);
    }
  }

  const code = (data.code || `DRAFT-${Date.now().toString().slice(-6)}`).trim().toUpperCase();

  // 2. Check tenant-level unique project code
  const existingCode = await prisma.project.findUnique({
    where: {
      tenantId_code: {
        tenantId: ctx.tenantId,
        code,
      },
    },
  });
  if (existingCode) {
    throw new Error(`Project Code "${code}" is already in use in this studio workspace. Please provide a unique code.`);
  }

  // 3. Normalize contractors and consultants
  const contractorIds = Array.isArray(data.contractorIds)
    ? Array.from(new Set(data.contractorIds.filter(Boolean)))
    : data.contractorId
    ? [data.contractorId]
    : [];

  const consultantIds = Array.isArray(data.consultantIds)
    ? Array.from(new Set(data.consultantIds.filter(Boolean)))
    : data.consultantId
    ? [data.consultantId]
    : [];

  // 4. Validate all linked relations belong to same tenant
  await validateSameTenantEntities(ctx.tenantId, {
    primaryClientId: data.primaryClientId,
    projectArchitectId: data.projectArchitectId,
    projectManagerId: data.projectManagerId,
    projectCoordinatorId: data.projectCoordinatorId,
    contractorIds,
    consultantIds,
  });

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        tenantId: ctx.tenantId,
        code,
        name: (data.name || code).trim(),
        description: data.description?.trim() || null,
        brief: data.brief?.trim() || data.description?.trim() || null,
        scopeItems: data.scopeItems ? (data.scopeItems as any) : Prisma.JsonNull,
        exclusions: data.exclusions ? (data.exclusions as any) : Prisma.JsonNull,
        acceptanceCriteria: data.acceptanceCriteria?.trim() || null,
        requiredClientInputs: data.requiredClientInputs ? (data.requiredClientInputs as any) : Prisma.JsonNull,
        primaryClientId: data.primaryClientId || null,
        projectType: data.projectType || null,
        siteAddress: data.siteAddress?.trim() || null,
        siteCity: data.siteCity?.trim() || null,
        googleMapLocation: data.googleMapLocation?.trim() || null,
        projectArchitectId: data.projectArchitectId || null,
        projectManagerId: data.projectManagerId || null,
        projectCoordinatorId: data.projectCoordinatorId || null,
        contractorId: contractorIds[0] || null,
        consultantId: consultantIds[0] || null,
        plotArea: data.plotArea?.trim() || null,
        constructionArea: data.constructionArea?.trim() || null,
        budget: data.budget ? new Prisma.Decimal(data.budget) : null,
        currency: data.currency || ctx.currency,
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        status: requestedStatus,
      },
    });

    // Link Contractors
    for (const cId of contractorIds) {
      await tx.projectContractor.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          contractorId: cId,
          scope: "Commissioned Contractor",
        },
      }).catch(() => {});
    }

    // Link Consultants
    for (const cId of consultantIds) {
      await tx.projectConsultant.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          consultantId: cId,
          scope: "Commissioned Consultant",
        },
      }).catch(() => {});
    }

    // Link Leads as project members
    if (data.projectArchitectId) {
      await tx.projectMember.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          membershipId: data.projectArchitectId,
          projectRole: "Project Architect",
        },
      }).catch(() => {});
    }

    if (data.projectCoordinatorId) {
      await tx.projectMember.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          membershipId: data.projectCoordinatorId,
          projectRole: "Project Coordinator",
        },
      }).catch(() => {});
    }

    if (data.projectManagerId) {
      await tx.projectMember.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          membershipId: data.projectManagerId,
          projectRole: "Project Architecture 2",
        },
      }).catch(() => {});
    }

    // Create Site entity if coordinates/geofence provided
    if (data.siteAddress || data.latitude || data.longitude) {
      await tx.site.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          name: `${project.name} Site`,
          address: data.siteAddress || "Primary Site Address",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          radiusMeters: data.geofenceRadiusMeters || 150.0,
        },
      }).catch(() => {});
    }

    // Seed default 11 phases
    const defaultPhases = [
      { name: "Brief", order: 1 },
      { name: "Site Survey", order: 2 },
      { name: "Concept", order: 3 },
      { name: "Space Planning", order: 4 },
      { name: "Detailed Design", order: 5 },
      { name: "3D Visualization", order: 6 },
      { name: "Working Drawings", order: 7 },
      { name: "BOQ & Tendering", order: 8 },
      { name: "Approvals & Sanctioning", order: 9 },
      { name: "Execution", order: 10 },
      { name: "Handover", order: 11 },
    ];

    for (const dp of defaultPhases) {
      await tx.projectPhase.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          phaseName: dp.name,
          sortOrder: dp.order,
          status: isDraft ? PhaseStatus.NOT_STARTED : dp.order === 1 ? PhaseStatus.IN_PROGRESS : PhaseStatus.NOT_STARTED,
        },
      });
    }

    // Log audit event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: isDraft ? "PROJECT_DRAFT_SAVED" : "PROJECT_ACTIVATED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `${isDraft ? "Saved draft of" : "Activated"} project "${project.name}" (${project.code})`,
      },
    }).catch(() => {});

    return project;
  });
}

/**
 * Activates a previously drafted project.
 */
export async function activateProject(ctx: TenantContext, projectId: string) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can activate projects.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: {
      primaryClient: true,
      projectArchitect: true,
      projectManager: true,
      phases: true,
    },
  });

  if (!project) throw new Error("Project not found in this studio workspace.");

  if (project.status === ProjectStatus.ACTIVE) {
    return { success: true, project, alreadyActive: true };
  }

  if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED) {
    throw new Error(
      `Cannot commission project: Project is currently ${project.status}. Use the reopenProject action to restore closed projects.`
    );
  }

  if (project.status === ProjectStatus.ON_HOLD) {
    throw new Error(
      "Cannot commission project: Project is currently ON HOLD. Use the resumeProject action to restore held projects."
    );
  }

  // Validate strict activation rules
  validateStrictProjectActivation({
    code: project.code,
    name: project.name,
    brief: project.brief || project.description || undefined,
    projectType: project.projectType || undefined,
    primaryClientId: project.primaryClientId || undefined,
    projectArchitectId: project.projectArchitectId || undefined,
    projectManagerId: project.projectManagerId || undefined,
    startDate: project.startDate || undefined,
    targetDate: project.targetDate || undefined,
  });

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.ACTIVE,
      },
    });

    // Advance first phase to IN_PROGRESS if all NOT_STARTED
    const firstPhase = project.phases.find((p) => p.sortOrder === 1);
    if (firstPhase && firstPhase.status === PhaseStatus.NOT_STARTED) {
      await tx.projectPhase.update({
        where: { id: firstPhase.id },
        data: { status: PhaseStatus.IN_PROGRESS },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_ACTIVATED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Activated draft project "${project.name}" (${project.code}) into operational portfolio.`,
      },
    }).catch(() => {});

    return { success: true, project: updated, alreadyActive: false };
  });
}

/**
 * ============================================================================
 * STEP 2: PROJECT MEMBERSHIP SAFEGUARDS & REMOVAL CONFLICT DETECTION
 * ============================================================================
 */

export async function removeProjectMemberSafeguard(
  ctx: TenantContext,
  projectId: string,
  membershipIdToRemove: string,
  reassignToMembershipId?: string
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can manage project membership.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: { members: true },
  });
  if (!project) throw new Error("Project not found.");

  const isMember = project.members.some((m) => m.membershipId === membershipIdToRemove);
  if (!isMember) {
    throw new Error("The specified user is not a member of this project.");
  }

  // 1. Identify open tasks assigned to this member on this project
  const openTasks = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      projectId,
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      OR: [
        { assigneeId: membershipIdToRemove },
        { checklistItems: { some: { assignedMemberId: membershipIdToRemove, isCompleted: false } } },
      ],
    },
    select: { id: true, title: true },
  });

  // 2. Identify pending reviews where this member is reviewer
  const pendingReviews = await prisma.taskSubmission.findMany({
    where: {
      tenantId: ctx.tenantId,
      task: { projectId },
      reviewerId: membershipIdToRemove,
      status: "PENDING",
    },
    select: { id: true, version: true },
  });

  const hasResponsibilities = openTasks.length > 0 || pendingReviews.length > 0;

  if (hasResponsibilities) {
    if (!reassignToMembershipId) {
      const err: any = new Error(
        `Cannot remove member: User has ${openTasks.length} active deliverables and ${pendingReviews.length} pending reviews on this project. Reassign these responsibilities first.`
      );
      err.conflict = {
        openTasksCount: openTasks.length,
        openTasks,
        pendingReviewsCount: pendingReviews.length,
        pendingReviews,
      };
      throw err;
    }

    // Verify replacement member exists in project
    const replacementMember = project.members.find((m) => m.membershipId === reassignToMembershipId);
    if (!replacementMember) {
      throw new Error("Designated replacement member must already belong to this project.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    // Reassign open items if replacement provided
    if (reassignToMembershipId && hasResponsibilities) {
      // Reassign deliverable assignee
      await tx.task.updateMany({
        where: { projectId, assigneeId: membershipIdToRemove },
        data: { assigneeId: reassignToMembershipId },
      });

      // Reassign open checklist tasks
      await tx.taskChecklistItem.updateMany({
        where: {
          task: { projectId },
          assignedMemberId: membershipIdToRemove,
          isCompleted: false,
        },
        data: { assignedMemberId: reassignToMembershipId },
      });

      // Reassign pending reviews
      await tx.taskSubmission.updateMany({
        where: {
          task: { projectId },
          reviewerId: membershipIdToRemove,
          status: "PENDING",
        },
        data: { reviewerId: reassignToMembershipId },
      });
    }

    // Remove from ProjectMember table (revokes project access while keeping historical records intact)
    await tx.projectMember.deleteMany({
      where: {
        projectId,
        membershipId: membershipIdToRemove,
      },
    });

    // Log audit event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId,
        action: "PROJECT_MEMBER_REMOVED",
        entityType: "ProjectMember",
        entityId: membershipIdToRemove,
        safeChangeSummary: `Removed member from project "${project.name}" (open tasks reassigned: ${Boolean(
          reassignToMembershipId
        )})`,
      },
    }).catch(() => {});

    return {
      success: true,
      removedMembershipId: membershipIdToRemove,
      reassignedToMembershipId: reassignToMembershipId || null,
      openTasksReassigned: openTasks.length,
    };
  });
}

/**
 * ============================================================================
 * STEP 3: SCOPE, PHASES, AND DELIVERY MILESTONES
 * ============================================================================
 */

export async function createProjectMilestone(
  ctx: TenantContext,
  data: {
    projectId: string;
    phaseId?: string;
    title: string;
    description?: string;
    targetDate: Date;
    isClientSignoffRequired?: boolean;
  }
) {
  assertAdminOrOwner(ctx);

  if (!data.title?.trim()) throw new Error("Milestone title is required.");
  if (!data.targetDate) throw new Error("Milestone target date is required.");

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  return await prisma.projectMilestone.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: data.projectId,
      phaseId: data.phaseId || null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      targetDate: new Date(data.targetDate),
      isClientSignoffRequired: Boolean(data.isClientSignoffRequired),
      status: ProjectMilestoneStatus.PENDING,
    },
  });
}

export async function achieveProjectMilestone(
  ctx: TenantContext,
  milestoneId: string,
  options: { isClientSignoff?: boolean } = {}
) {
  assertAdminOrOwner(ctx);

  const milestone = await prisma.projectMilestone.findFirst({
    where: { id: milestoneId, tenantId: ctx.tenantId },
  });
  if (!milestone) throw new Error("Delivery milestone not found.");

  const now = new Date();

  return await prisma.projectMilestone.update({
    where: { id: milestone.id },
    data: {
      status: ProjectMilestoneStatus.ACHIEVED,
      actualDate: now,
      clientSignedOffAt: options.isClientSignoff ? now : milestone.clientSignedOffAt,
    },
  });
}

export async function completeProjectPhaseWithValidation(
  ctx: TenantContext,
  phaseId: string,
  options: { exceptionReason?: string } = {}
) {
  assertAdminOrOwner(ctx, "Only Studio Leadership can complete project phases.");

  const phase = await prisma.projectPhase.findFirst({
    where: { id: phaseId, tenantId: ctx.tenantId },
    include: {
      tasks: {
        include: { checklistItems: true },
      },
      milestones: true,
      project: true,
    },
  });
  if (!phase) throw new Error("Phase not found.");

  // Check required deliverables
  const uncompletedTasks = phase.tasks.filter((t) => t.status !== TaskWorkflowStatus.COMPLETED);
  const unachievedMilestones = phase.milestones.filter((m) => m.status !== ProjectMilestoneStatus.ACHIEVED);

  const hasIncompleteItems = uncompletedTasks.length > 0 || unachievedMilestones.length > 0;

  if (hasIncompleteItems) {
    if (!options.exceptionReason?.trim()) {
      throw new Error(
        `Cannot complete phase "${phase.phaseName}": ${uncompletedTasks.length} unapproved deliverables and ${unachievedMilestones.length} pending milestones remain. An authorized leadership exception reason is required to proceed.`
      );
    }
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.projectPhase.update({
      where: { id: phase.id },
      data: {
        status: PhaseStatus.COMPLETED,
        actualEndDate: now,
      },
    });

    // Advance next phase to IN_PROGRESS if exists
    const nextPhase = await tx.projectPhase.findFirst({
      where: {
        projectId: phase.projectId,
        tenantId: ctx.tenantId,
        sortOrder: { gt: phase.sortOrder },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (nextPhase && nextPhase.status === PhaseStatus.NOT_STARTED) {
      await tx.projectPhase.update({
        where: { id: nextPhase.id },
        data: {
          status: PhaseStatus.IN_PROGRESS,
          actualStartDate: now,
        },
      });

      await tx.project.update({
        where: { id: phase.projectId },
        data: { currentPhase: nextPhase.phaseName },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: phase.projectId,
        action: "PHASE_COMPLETED",
        entityType: "ProjectPhase",
        entityId: phase.id,
        safeChangeSummary: `Completed phase "${phase.phaseName}" on "${phase.project.name}"${
          options.exceptionReason ? ` (Exception: ${options.exceptionReason})` : ""
        }`,
      },
    }).catch(() => {});

    return updated;
  });
}

/**
 * ============================================================================
 * STEP 4: SCOPE CHANGES & PROJECT HOLDS / RESUME
 * ============================================================================
 */

export async function requestProjectScopeChange(
  ctx: TenantContext,
  projectId: string,
  data: {
    title: string;
    reason: string;
    affectedScope?: string;
    scheduleImpactDays?: number;
    feeImpactAmount?: number;
    currency?: string;
    estimatedEffortHours?: number;
    proposedDeliverables?: Array<{ title: string; estimatedHours?: number; dueDate?: string }>;
    supportingFileIds?: string[];
    source?: string;
  }
) {
  if (!data.title?.trim()) throw new Error("Scope change title is required.");
  if (!data.reason?.trim()) throw new Error("Justification reason is required for scope change requests.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  return await prisma.projectChangeRequest.create({
    data: {
      tenantId: ctx.tenantId,
      projectId,
      requesterId: ctx.membershipId,
      title: data.title.trim(),
      reason: data.reason.trim(),
      affectedScope: data.affectedScope?.trim() || null,
      scheduleImpactDays: data.scheduleImpactDays || 0,
      feeImpactAmount: data.feeImpactAmount ? new Prisma.Decimal(data.feeImpactAmount) : null,
      currency: data.currency || project.currency || "INR",
      estimatedEffortHours: data.estimatedEffortHours ? new Prisma.Decimal(data.estimatedEffortHours) : null,
      proposedDeliverables: (data.proposedDeliverables || []) as any,
      supportingFileIds: (data.supportingFileIds || []) as any,
      source: data.source || "INTERNAL",
      status: ChangeRequestStatus.PENDING,
      version: 1,
    },
  });
}

/**
 * Allows the requester or leadership to withdraw a pending scope change request.
 */
export async function withdrawProjectScopeChange(
  ctx: TenantContext,
  requestId: string,
  data: { reason: string }
) {
  if (!data.reason?.trim()) {
    throw new Error("A specific, documented justification reason is required to withdraw a change request.");
  }

  const request = await prisma.projectChangeRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { project: true },
  });
  if (!request) throw new Error("Scope change request not found.");

  const isRequester = request.requesterId === ctx.membershipId;
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!isRequester && !isPrivileged) {
    throw new Error("Forbidden: Only the original requester or studio leadership can withdraw this change request.");
  }

  if (request.status !== ChangeRequestStatus.PENDING) {
    throw new Error(`Cannot withdraw request: Request has already been ${request.status.toLowerCase()}.`);
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.projectChangeRequest.update({
      where: { id: request.id },
      data: {
        status: ChangeRequestStatus.REJECTED,
        decidedById: ctx.membershipId,
        decidedAt: now,
        decisionNotes: `[WITHDRAWN] ${data.reason.trim()}`,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: request.projectId,
        action: "SCOPE_CHANGE_WITHDRAWN",
        entityType: "ProjectChangeRequest",
        entityId: request.id,
        safeChangeSummary: `Withdrew scope change "${request.title}" on project "${request.project.name}": ${data.reason.trim()}`,
      },
    }).catch(() => {});

    return updated;
  });
}

/**
 * Decides a project scope change request (approve or reject) with Four-Eyes principle.
 */
export async function decideProjectScopeChange(
  ctx: TenantContext,
  requestId: string,
  data: {
    decision: "APPROVE" | "REJECT";
    decisionNotes?: string;
    autoApply?: boolean;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can approve scope changes.");

  const request = await prisma.projectChangeRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { project: true },
  });
  if (!request) throw new Error("Scope change request not found.");

  // Four-Eyes Rule: Requester cannot approve their own change request
  if (data.decision === "APPROVE" && request.requesterId === ctx.membershipId) {
    throw new Error(
      "Four-eyes principle: Requester cannot approve their own scope change request. Another Administrator or Owner must review it."
    );
  }

  if (request.status !== ChangeRequestStatus.PENDING) {
    throw new Error(`This change request has already been ${request.status.toLowerCase()}.`);
  }

  if (data.decision === "REJECT" && !data.decisionNotes?.trim()) {
    throw new Error("A specific decision note or reason is required to reject a scope change request.");
  }

  const now = new Date();
  const isApproved = data.decision === "APPROVE";

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.projectChangeRequest.update({
      where: { id: request.id },
      data: {
        status: isApproved ? ChangeRequestStatus.APPROVED : ChangeRequestStatus.REJECTED,
        decidedById: ctx.membershipId,
        decidedAt: now,
        decisionNotes: data.decisionNotes?.trim() || (isApproved ? "Approved by leadership" : "Rejected by leadership"),
        appliedAt: isApproved && data.autoApply ? now : null,
      },
    });

    if (isApproved && data.autoApply) {
      // Apply approved changes immediately if requested
      const updates: Prisma.ProjectUpdateInput = {};

      if (request.scheduleImpactDays && request.project.targetDate) {
        const currentTarget = new Date(request.project.targetDate);
        currentTarget.setDate(currentTarget.getDate() + request.scheduleImpactDays);
        updates.targetDate = currentTarget;
      }

      if (request.feeImpactAmount && request.project.budget) {
        updates.budget = Prisma.Decimal.add(request.project.budget, request.feeImpactAmount);
      }

      if (Object.keys(updates).length > 0) {
        await tx.project.update({
          where: { id: request.projectId },
          data: updates,
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: request.projectId,
        action: isApproved ? "SCOPE_CHANGE_APPROVED" : "SCOPE_CHANGE_REJECTED",
        entityType: "ProjectChangeRequest",
        entityId: request.id,
        safeChangeSummary: `${isApproved ? "Approved" : "Rejected"} scope change "${request.title}" on project "${
          request.project.name
        }"`,
      },
    }).catch(() => {});

    return updated;
  });
}

/**
 * Explicit, retry-safe controlled application of an approved scope change request.
 */
export async function applyProjectScopeChange(ctx: TenantContext, requestId: string) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can apply approved scope changes.");

  const request = await prisma.projectChangeRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { project: true },
  });
  if (!request) throw new Error("Scope change request not found.");

  // Idempotency: prevent double-application
  if (request.appliedAt) {
    return { success: true, changeRequest: request, alreadyApplied: true };
  }

  if (request.status !== ChangeRequestStatus.APPROVED) {
    throw new Error(`Cannot apply scope change: Request status is ${request.status}, not APPROVED.`);
  }

  // Four-eyes check on applying
  if (request.requesterId === ctx.membershipId) {
    throw new Error(
      "Four-eyes principle: Requester cannot apply their own scope change request. Another Administrator or Owner must apply it."
    );
  }

  // Stale detection: ensure project is active or on-hold
  if (
    request.project.status === ProjectStatus.CANCELLED ||
    request.project.status === ProjectStatus.COMPLETED ||
    request.project.isArchived
  ) {
    throw new Error(`Cannot apply scope change: Project "${request.project.name}" is currently ${request.project.status}.`);
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const updates: Prisma.ProjectUpdateInput = {};

    if (request.scheduleImpactDays && request.project.targetDate) {
      const currentTarget = new Date(request.project.targetDate);
      currentTarget.setDate(currentTarget.getDate() + request.scheduleImpactDays);
      updates.targetDate = currentTarget;
    }

    if (request.feeImpactAmount && request.project.budget) {
      updates.budget = Prisma.Decimal.add(request.project.budget, request.feeImpactAmount);
    }

    if (Object.keys(updates).length > 0) {
      await tx.project.update({
        where: { id: request.projectId },
        data: updates,
      });
    }

    // Link resulting tasks to the change request
    const createdTasks: any[] = [];
    if (request.proposedDeliverables && Array.isArray(request.proposedDeliverables)) {
      for (const deliv of request.proposedDeliverables as Array<{ title?: string; estimatedHours?: number; dueDate?: string }>) {
        if (!deliv.title) continue;
        const task = await tx.task.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: request.projectId,
            title: deliv.title,
            scopeChangeId: request.id,
            status: TaskWorkflowStatus.NOT_STARTED,
            creatorId: ctx.membershipId,
            estimatedHours: deliv.estimatedHours ? new Prisma.Decimal(deliv.estimatedHours) : null,
            dueDate: deliv.dueDate ? new Date(deliv.dueDate) : null,
            description: `Generated from approved scope change: ${request.title}`,
          },
        });
        createdTasks.push(task);
      }
    }

    const updatedRequest = await tx.projectChangeRequest.update({
      where: { id: request.id },
      data: { appliedAt: now },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: request.projectId,
        action: "SCOPE_CHANGE_APPLIED",
        entityType: "ProjectChangeRequest",
        entityId: request.id,
        safeChangeSummary: `Applied approved scope change "${request.title}" on project "${request.project.name}" (+${request.scheduleImpactDays} days, +${request.feeImpactAmount || 0}, ${createdTasks.length} tasks generated)`,
      },
    }).catch(() => {});

    return { success: true, changeRequest: updatedRequest, createdTasksCount: createdTasks.length, alreadyApplied: false };
  });
}

/**
 * Records explicit client confirmation evidence for a scope change request.
 * Keeps internal approval distinct from client acceptance.
 */
export async function recordClientConfirmation(
  ctx: TenantContext,
  requestId: string,
  data: {
    isClientAccepted: boolean;
    confirmationNotes?: string;
    confirmationEvidence?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can record client confirmation for scope changes.");

  const request = await prisma.projectChangeRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { project: true },
  });
  if (!request) throw new Error("Scope change request not found.");

  const now = new Date();
  const updated = await prisma.projectChangeRequest.update({
    where: { id: request.id },
    data: {
      isClientAccepted: data.isClientAccepted,
      clientConfirmedAt: data.isClientAccepted ? now : null,
      clientConfirmationNotes: data.confirmationNotes?.trim() || null,
      clientConfirmationEvidence: data.confirmationEvidence?.trim() || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      projectId: request.projectId,
      action: data.isClientAccepted ? "SCOPE_CHANGE_CLIENT_ACCEPTED" : "SCOPE_CHANGE_CLIENT_REJECTED",
      entityType: "ProjectChangeRequest",
      entityId: request.id,
      safeChangeSummary: `Recorded client confirmation for scope change "${request.title}": ${
        data.isClientAccepted ? "Accepted by client" : "Not accepted by client"
      }. Notes: ${data.confirmationNotes || "None"}`,
    },
  }).catch(() => {});

  return updated;
}

export async function holdProject(
  ctx: TenantContext,
  projectId: string,
  data: {
    reason: string;
    reviewTargetDate?: Date;
    responsibleContactId?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can place a project on hold.");

  if (!data.reason?.trim()) {
    throw new Error("A specific, documented reason is required to place a project on hold.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  if (project.status === ProjectStatus.ON_HOLD) {
    return { success: true, project, alreadyHeld: true };
  }

  const now = new Date();
  const currentChecklist = (project.completionChecklist as any) || {};
  const holdHistory = Array.isArray(currentChecklist.holdHistory) ? currentChecklist.holdHistory : [];
  holdHistory.push({
    heldAt: now.toISOString(),
    heldById: ctx.membershipId,
    reason: data.reason.trim(),
    reviewTargetDate: data.reviewTargetDate ? new Date(data.reviewTargetDate).toISOString() : null,
    responsibleContactId: data.responsibleContactId || null,
  });

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.ON_HOLD,
        holdReason: data.reason.trim(),
        heldAt: now,
        heldById: ctx.membershipId,
        completionChecklist: {
          ...currentChecklist,
          holdHistory,
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_HELD",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Placed project "${project.name}" on hold: ${data.reason.trim()}${
          data.reviewTargetDate ? ` (Target Review: ${new Date(data.reviewTargetDate).toLocaleDateString()})` : ""
        }`,
      },
    }).catch(() => {});

    return { success: true, project: updated, alreadyHeld: false };
  });
}

export async function resumeProject(
  ctx: TenantContext,
  projectId: string,
  options: { resumeReason: string; scheduleAdjustmentDays?: number }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can resume a project.");

  if (!options.resumeReason?.trim()) {
    throw new Error("A specific, documented justification reason is required to resume a project from hold.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  if (project.status !== ProjectStatus.ON_HOLD) {
    throw new Error(`Project is currently ${project.status}, not on hold.`);
  }

  return await prisma.$transaction(async (tx) => {
    const currentChecklist = (project.completionChecklist as any) || {};
    const resumeHistory = Array.isArray(currentChecklist.resumeHistory) ? currentChecklist.resumeHistory : [];
    const now = new Date();
    const holdDurationDays = project.heldAt
      ? Math.max(0, Math.round((now.getTime() - new Date(project.heldAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const originalTarget = project.targetDate ? new Date(project.targetDate) : null;
    let newTarget = originalTarget ? new Date(originalTarget) : null;

    const dataUpdates: Prisma.ProjectUpdateInput = {
      status: ProjectStatus.ACTIVE,
      holdReason: null,
      heldAt: null,
      heldById: null,
    };

    // If an explicit schedule adjustment is approved, adjust targetDate
    if (options.scheduleAdjustmentDays && newTarget) {
      newTarget.setDate(newTarget.getDate() + options.scheduleAdjustmentDays);
      dataUpdates.targetDate = newTarget;
    }

    resumeHistory.push({
      resumedAt: now.toISOString(),
      resumedById: ctx.membershipId,
      resumeReason: options.resumeReason.trim(),
      holdDurationDays,
      originalTargetDate: originalTarget ? originalTarget.toISOString() : null,
      adjustedTargetDate: newTarget ? newTarget.toISOString() : null,
      scheduleAdjustmentDays: options.scheduleAdjustmentDays || 0,
    });

    dataUpdates.completionChecklist = {
      ...currentChecklist,
      resumeHistory,
      lastResumeAdjustmentDays: options.scheduleAdjustmentDays || 0,
    };

    // Atomic conditional update: ensure project is currently ON_HOLD to prevent double date shifts
    const updateCount = await tx.project.updateMany({
      where: {
        id: project.id,
        tenantId: ctx.tenantId,
        status: ProjectStatus.ON_HOLD,
      },
      data: dataUpdates,
    });

    if (updateCount.count === 0) {
      throw new Error("Project is not currently on hold or has already been resumed.");
    }

    const updated = await tx.project.findUniqueOrThrow({
      where: { id: project.id },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_RESUMED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Resumed project "${project.name}" from hold: ${options.resumeReason.trim()}${
          options.scheduleAdjustmentDays ? ` with ${options.scheduleAdjustmentDays} days schedule adjustment` : ""
        }`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

/**
 * ============================================================================
 * STEP 5: PROJECT CLOSURE, HANDOVER, REOPENING, CANCELLATION & ARCHIVE
 * ============================================================================
 */

export async function evaluateProjectCompletionChecklist(ctx: TenantContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: {
      tasks: {
        include: { checklistItems: true },
      },
      phases: true,
      milestones: true,
      documents: {
        include: { versions: true },
      },
      expenses: true,
      feeMilestones: {
        include: { payments: true },
      },
    },
  });
  if (!project) throw new Error("Project not found.");

  // 1. Deliverables check
  const openTasks = project.tasks.filter(
    (t) => t.status !== TaskWorkflowStatus.COMPLETED && t.status !== TaskWorkflowStatus.CANCELLED
  );

  // 2. Unresolved blockers check
  const allChecklistItems = project.tasks.flatMap((t) => t.checklistItems);
  const activeBlockers = allChecklistItems.filter((i) => i.isBlocked);

  // 3. Drawing approvals check
  const allVersions = project.documents.flatMap((d) => d.versions);
  const unapprovedDrawings = allVersions.filter(
    (v) => v.approvalState !== "APPROVED" && v.approvalState !== "SUPERSEDED"
  );

  // 4. Milestone completion check
  const pendingMilestones = project.milestones.filter((m) => m.status !== ProjectMilestoneStatus.ACHIEVED);

  // 5. Active site visits check (Mandatory gate: no active visits allowed on closing)
  const activeSiteVisits = await prisma.siteVisit.findMany({
    where: {
      projectId,
      tenantId: ctx.tenantId,
      operationalState: "ACTIVE",
    },
    select: { id: true, purpose: true, employeeId: true },
  });

  // 6. Financial settlement status (Separate from design completion!)
  const totalInvoiced = project.feeMilestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const totalPaid = project.feeMilestones.flatMap((m) => m.payments).reduce((acc, p) => acc + Number(p.amount), 0);
  const outstandingBalance = totalInvoiced - totalPaid;

  const canCompleteWithoutExceptions =
    openTasks.length === 0 &&
    activeBlockers.length === 0 &&
    unapprovedDrawings.length === 0 &&
    pendingMilestones.length === 0 &&
    activeSiteVisits.length === 0;

  return {
    projectId,
    projectName: project.name,
    projectCode: project.code,
    openTasksCount: openTasks.length,
    openTasks: openTasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    activeBlockersCount: activeBlockers.length,
    activeBlockers: activeBlockers.map((b) => ({ id: b.id, title: b.title, reason: b.blockerReason })),
    unapprovedDrawingsCount: unapprovedDrawings.length,
    pendingMilestonesCount: pendingMilestones.length,
    pendingMilestones: pendingMilestones.map((m) => ({ id: m.id, title: m.title })),
    activeSiteVisitsCount: activeSiteVisits.length,
    activeSiteVisits,
    financialSummary: {
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      isFullySettled: outstandingBalance <= 0,
    },
    canCompleteWithoutExceptions,
  };
}

/**
 * Handover Package dossier generation for client delivery.
 */
export async function getProjectHandoverPackage(ctx: TenantContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: {
      primaryClient: true,
      tasks: {
        where: { status: TaskWorkflowStatus.COMPLETED },
        include: { assignee: { include: { user: true } } },
      },
      documents: {
        include: {
          versions: {
            where: { approvalState: "APPROVED" },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      milestones: {
        where: { status: ProjectMilestoneStatus.ACHIEVED },
      },
    },
  });
  if (!project) throw new Error("Project not found.");

  // Compile latest approved drawing revisions
  const issuedDrawings = project.documents
    .map((doc) => {
      const latestApproved = doc.versions[0];
      if (!latestApproved) return null;
      return {
        documentId: doc.id,
        title: doc.title,
        drawingNumber: doc.drawingNumber,
        discipline: doc.discipline,
        documentType: doc.documentType,
        revision: latestApproved.revision,
        issuePurpose: latestApproved.issuePurpose,
        approvalState: latestApproved.approvalState,
        fileId: latestApproved.fileId,
        approvedAt: latestApproved.updatedAt,
      };
    })
    .filter(Boolean);

  const completionData = (project.completionChecklist as any) || {};

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    client: project.primaryClient ? { id: project.primaryClient.id, name: project.primaryClient.name } : null,
    handoverStatus: project.status === ProjectStatus.COMPLETED ? "COMPLETED" : "IN_PROGRESS",
    approvedDeliverablesCount: project.tasks.length,
    approvedDeliverables: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completionDate,
      assigneeName: t.assignee?.user.fullName || "Studio Staff",
    })),
    issuedDrawingsCount: issuedDrawings.length,
    issuedDrawings,
    achievedMilestonesCount: project.milestones.length,
    achievedMilestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      actualDate: m.actualDate,
      clientSignedOffAt: m.clientSignedOffAt,
    })),
    handoverMetadata: {
      issuedTo: completionData.handoverIssuedTo || null,
      issuedAt: completionData.handoverIssuedAt || null,
      acknowledgedBy: completionData.handoverAcknowledgedBy || null,
      acknowledgedAt: completionData.handoverAcknowledgedAt || null,
      acknowledgementEvidence: completionData.handoverAcknowledgementEvidence || null,
    },
  };
}

/**
 * Records handover issuance to the client or authorized recipient.
 */
export async function recordProjectHandoverIssue(
  ctx: TenantContext,
  projectId: string,
  data: { recipientName: string; recipientContact?: string; notes?: string }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can record handover issuance.");

  if (!data.recipientName?.trim()) {
    throw new Error("Recipient name is required to issue the handover package.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  const currentChecklist = (project.completionChecklist as any) || {};
  const now = new Date();

  const updatedChecklist = {
    ...currentChecklist,
    handoverIssuedTo: data.recipientName.trim(),
    handoverIssuedContact: data.recipientContact?.trim() || null,
    handoverIssuedAt: now.toISOString(),
    handoverIssueNotes: data.notes?.trim() || null,
  };

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { completionChecklist: updatedChecklist },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_HANDOVER_ISSUED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Issued architectural handover package for "${project.name}" to ${data.recipientName.trim()}`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

/**
 * Records client acknowledgement of handover package.
 */
export async function recordProjectHandoverAcknowledgement(
  ctx: TenantContext,
  projectId: string,
  data: { acknowledgedByName: string; acknowledgementDate?: Date | string; acknowledgementEvidence: string; notes?: string }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can record handover acknowledgement.");

  if (!data.acknowledgedByName?.trim()) {
    throw new Error("Acknowledged-by contact name is required.");
  }
  if (!data.acknowledgementEvidence?.trim()) {
    throw new Error("Specific acknowledgement evidence reference (e.g. signed letter, transmittal receipt) is required.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  const currentChecklist = (project.completionChecklist as any) || {};
  const ackDate = data.acknowledgementDate ? new Date(data.acknowledgementDate) : new Date();

  const updatedChecklist = {
    ...currentChecklist,
    handoverAcknowledgedBy: data.acknowledgedByName.trim(),
    handoverAcknowledgedAt: ackDate.toISOString(),
    handoverAcknowledgementEvidence: data.acknowledgementEvidence.trim(),
    handoverAcknowledgementNotes: data.notes?.trim() || null,
  };

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { completionChecklist: updatedChecklist },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_HANDOVER_ACKNOWLEDGED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Recorded client handover acknowledgement for "${project.name}" by ${data.acknowledgedByName.trim()} (${data.acknowledgementEvidence.trim()})`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

export async function completeProject(
  ctx: TenantContext,
  projectId: string,
  options: { permittedExceptions?: string[] } = {}
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can close projects.");

  const evaluation = await evaluateProjectCompletionChecklist(ctx, projectId);

  // Mandatory non-waivable gate: Active site visits
  if (evaluation.activeSiteVisitsCount > 0) {
    throw new Error(
      `Cannot close project: There are ${evaluation.activeSiteVisitsCount} active site inspections currently checked in. Check out all site visits before closing the project.`
    );
  }

  if (!evaluation.canCompleteWithoutExceptions) {
    if (!options.permittedExceptions || options.permittedExceptions.length === 0) {
      throw new Error(
        `Cannot close project: ${evaluation.openTasksCount} open deliverables, ${evaluation.activeBlockersCount} blockers, and ${evaluation.unapprovedDrawingsCount} unapproved drawings remain. Permitted management exceptions must be explicitly provided.`
      );
    }
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Re-verify active site visits inside transaction for concurrency safety
    const concurrentVisits = await tx.siteVisit.count({
      where: {
        projectId,
        tenantId: ctx.tenantId,
        operationalState: "ACTIVE",
      },
    });
    if (concurrentVisits > 0) {
      throw new Error("Cannot close project: An active site inspection was initiated concurrently.");
    }

    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.COMPLETED,
        completedById: ctx.membershipId,
        completionChecklist: {
          evaluatedAt: now.toISOString(),
          actorId: ctx.membershipId,
          actorName: ctx.userFullName,
          openTasksCount: evaluation.openTasksCount,
          activeBlockersCount: evaluation.activeBlockersCount,
          unapprovedDrawingsCount: evaluation.unapprovedDrawingsCount,
          permittedExceptions: options.permittedExceptions || [],
          financialSummary: evaluation.financialSummary,
        },
      },
    });

    const completionEvent = await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId,
        action: "PROJECT_COMPLETED",
        entityType: "Project",
        entityId: projectId,
        safeChangeSummary: `Closed architectural project "${evaluation.projectName}" (${evaluation.projectCode}) with verified handover checks.`,
      },
    }).catch(() => null);

    return { success: true, project: updated, completionEvent, evaluation };
  });
}

export async function reopenProject(
  ctx: TenantContext,
  projectId: string,
  data: { reason: string; reopenTaskIds?: string[]; reopenPhaseIds?: string[] }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can reopen completed projects.");

  if (!data.reason?.trim()) {
    throw new Error("A specific, documented justification reason is required to reopen a closed project.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Selectively reopen specific tasks if designated
    if (data.reopenTaskIds && data.reopenTaskIds.length > 0) {
      const validTaskIds = data.reopenTaskIds.filter((id): id is string => Boolean(id));
      if (validTaskIds.length > 0) {
        await tx.task.updateMany({
          where: {
            id: { in: validTaskIds },
            projectId: project.id,
            tenantId: ctx.tenantId,
          },
          data: {
            status: TaskWorkflowStatus.IN_PROGRESS,
          },
        });
      }
    }

    // Selectively reopen specific phases if designated
    if (data.reopenPhaseIds && data.reopenPhaseIds.length > 0) {
      await tx.projectPhase.updateMany({
        where: {
          id: { in: data.reopenPhaseIds },
          projectId: project.id,
          tenantId: ctx.tenantId,
        },
        data: {
          status: PhaseStatus.IN_PROGRESS,
        },
      });
    }

    const updated = await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.ACTIVE,
        reopenReason: data.reason.trim(),
        reopenedAt: now,
        reopenedById: ctx.membershipId,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_REOPENED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Reopened completed project "${project.name}": ${data.reason.trim()}${
          data.reopenTaskIds?.length ? ` (${data.reopenTaskIds.length} deliverables selectively reopened)` : ""
        }`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

export async function cancelProject(
  ctx: TenantContext,
  projectId: string,
  data: { reason: string; dispositionOfWork?: string }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can cancel projects.");

  if (!data.reason?.trim()) {
    throw new Error("A specific cancellation reason is required.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Cancel open tasks with disposition note
    await tx.task.updateMany({
      where: {
        projectId: project.id,
        status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
      },
      data: {
        status: TaskWorkflowStatus.CANCELLED,
      },
    });

    const updated = await tx.project.update({
      where: { id: project.id },
      data: {
        status: ProjectStatus.CANCELLED,
        cancellationReason: data.reason.trim(),
        cancelledAt: now,
        cancelledById: ctx.membershipId,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_CANCELLED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Cancelled project "${project.name}": ${data.reason.trim()}${
          data.dispositionOfWork ? ` (Disposition: ${data.dispositionOfWork})` : ""
        }`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

export async function archiveProject(ctx: TenantContext, projectId: string) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can archive projects.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { isArchived: true },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_ARCHIVED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Archived project "${project.name}" (${project.code}) from active studio listings.`,
      },
    }).catch(() => {});

    return updated;
  });
}

/**
 * Unarchives a project, restoring visibility to active lists without resetting lifecycle status.
 */
export async function unarchiveProject(ctx: TenantContext, projectId: string) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can unarchive projects.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found.");

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { isArchived: false },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_UNARCHIVED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Unarchived project "${project.name}" (${project.code}), restoring active listing visibility (lifecycle status: ${project.status}).`,
      },
    }).catch(() => {});

    return updated;
  });
}

/**
 * Advances a DRAFT project to the formal pre-commissioning PLANNING phase.
 */
export async function advanceProjectToPlanning(ctx: TenantContext, projectId: string) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can advance projects to planning.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new Error("Project not found in this studio workspace.");

  if (project.status !== ProjectStatus.DRAFT) {
    throw new Error(`Cannot advance to planning: Project is currently ${project.status}, not DRAFT.`);
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.PLANNING },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: project.id,
        action: "PROJECT_PLANNING_ADVANCED",
        entityType: "Project",
        entityId: project.id,
        safeChangeSummary: `Advanced draft project "${project.name}" (${project.code}) to pre-commissioning planning phase.`,
      },
    }).catch(() => {});

    return { success: true, project: updated };
  });
}

