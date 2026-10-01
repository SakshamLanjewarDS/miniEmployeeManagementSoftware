import { prisma } from "../../db/prisma";
import {
  TenantContext,
  assertCanManageDirectories,
  isAdminOrOwner,
} from "../../tenancy/context";

export interface FindConsultantsParams {
  search?: string;
  isActive?: boolean;
  projectId?: string;
}

export interface CreateConsultantInput {
  name: string;
  email?: string | null;
  contact?: string | null;
  firmName?: string | null;
  firmAddress?: string | null;
  discipline: string;
  notes?: string | null;
  projectIds?: string[];
}

export interface UpdateConsultantInput {
  name?: string;
  email?: string | null;
  contact?: string | null;
  firmName?: string | null;
  firmAddress?: string | null;
  discipline?: string;
  notes?: string | null;
  isActive?: boolean;
}

/**
 * Retrieve consultants with tenant isolation and permission-aware project scoping.
 */
export async function findConsultants(ctx: TenantContext, params: FindConsultantsParams = {}) {
  const where: any = {
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { contact: { contains: q } },
      { firmName: { contains: q } },
      { discipline: { contains: q } },
    ];
  }

  // If specific project filter requested
  if (params.projectId) {
    where.projects = {
      some: {
        projectId: params.projectId,
        tenantId: ctx.tenantId,
      },
    };
  }

  // Non-admin employees can only view associations for projects they belong to
  const isPrivileged = isAdminOrOwner(ctx);

  let allowedProjectIds: Set<string> | null = null;
  if (!isPrivileged) {
    const userProjectMemberships = await prisma.projectMember.findMany({
      where: {
        tenantId: ctx.tenantId,
        membershipId: ctx.membershipId,
      },
      select: { projectId: true },
    });
    allowedProjectIds = new Set(userProjectMemberships.map((pm) => pm.projectId));
  }

  const rawConsultants = await prisma.consultant.findMany({
    where,
    include: {
      projects: {
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              isArchived: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return rawConsultants.map((consultant) => {
    // Filter projects if non-privileged
    const accessibleProjects = isPrivileged
      ? consultant.projects
      : consultant.projects.filter((pc) => allowedProjectIds?.has(pc.projectId));

    const sanitizedProjects = accessibleProjects.map((pc) => ({
      id: pc.id,
      projectId: pc.projectId,
      project: pc.project,
      scope: pc.scope,
      engagementStatus: pc.engagementStatus,
      createdAt: pc.createdAt.toISOString(),
    }));

    return {
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      contact: consultant.contact,
      firmName: consultant.firmName,
      firmAddress: consultant.firmAddress,
      discipline: consultant.discipline,
      notes: consultant.notes,
      isActive: consultant.isActive,
      createdAt: consultant.createdAt.toISOString(),
      updatedAt: consultant.updatedAt.toISOString(),
      projects: sanitizedProjects,
      totalAccessibleProjects: sanitizedProjects.length,
    };
  });
}

/**
 * Retrieve single consultant detail
 */
export async function findConsultantById(ctx: TenantContext, consultantId: string) {
  const consultants = await findConsultants(ctx);
  return consultants.find((c) => c.id === consultantId) || null;
}

/**
 * Create a new consultant (Owner and Admin only)
 */
export async function createConsultant(ctx: TenantContext, input: CreateConsultantInput) {
  assertCanManageDirectories(ctx);

  if (!input.name || !input.name.trim()) {
    throw new Error("Consultant name is required.");
  }
  if (!input.discipline || !input.discipline.trim()) {
    throw new Error("Consultant discipline is required (e.g. Structural, MEP, Landscape, Lighting).");
  }

  // Validate projectIds belong to this tenant
  if (input.projectIds && input.projectIds.length > 0) {
    const validProjects = await prisma.project.findMany({
      where: {
        id: { in: input.projectIds },
        tenantId: ctx.tenantId,
      },
      select: { id: true },
    });
    if (validProjects.length !== input.projectIds.length) {
      throw new Error("One or more selected projects are invalid or belong to another studio.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const consultant = await tx.consultant.create({
      data: {
        tenantId: ctx.tenantId,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        contact: input.contact?.trim() || null,
        firmName: input.firmName?.trim() || null,
        firmAddress: input.firmAddress?.trim() || null,
        discipline: input.discipline.trim(),
        notes: input.notes?.trim() || null,
        isActive: true,
      },
    });

    if (input.projectIds && input.projectIds.length > 0) {
      await tx.projectConsultant.createMany({
        data: input.projectIds.map((projectId) => ({
          tenantId: ctx.tenantId,
          projectId,
          consultantId: consultant.id,
          engagementStatus: "Engaged",
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "CONSULTANT_CREATED",
        entityType: "Consultant",
        entityId: consultant.id,
        safeChangeSummary: `Registered consultant ${consultant.name} (${consultant.discipline}) with ${input.projectIds?.length || 0} initial projects`,
      },
    });

    return consultant;
  });
}

/**
 * Update an existing consultant (Owner and Admin only)
 */
export async function updateConsultant(
  ctx: TenantContext,
  consultantId: string,
  input: UpdateConsultantInput
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.consultant.findFirst({
    where: {
      id: consultantId,
      tenantId: ctx.tenantId,
    },
  });

  if (!existing) {
    throw new Error("Consultant not found in this studio workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.consultant.update({
      where: { id: consultantId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.contact !== undefined ? { contact: input.contact?.trim() || null } : {}),
        ...(input.firmName !== undefined ? { firmName: input.firmName?.trim() || null } : {}),
        ...(input.firmAddress !== undefined ? { firmAddress: input.firmAddress?.trim() || null } : {}),
        ...(input.discipline !== undefined ? { discipline: input.discipline.trim() } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "CONSULTANT_UPDATED",
        entityType: "Consultant",
        entityId: consultantId,
        safeChangeSummary: `Updated consultant details for ${consultantId}`,
      },
    });

    return updated;
  });
}

/**
 * Associate consultant with a project (Owner and Admin only)
 */
export async function associateConsultantProject(
  ctx: TenantContext,
  consultantId: string,
  projectId: string,
  scope?: string
) {
  assertCanManageDirectories(ctx);

  const [consultant, project] = await Promise.all([
    prisma.consultant.findFirst({ where: { id: consultantId, tenantId: ctx.tenantId } }),
    prisma.project.findFirst({ where: { id: projectId, tenantId: ctx.tenantId } }),
  ]);

  if (!consultant || !project) {
    throw new Error("Consultant or project not found in this workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const link = await tx.projectConsultant.upsert({
      where: {
        projectId_consultantId: {
          projectId,
          consultantId,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        projectId,
        consultantId,
        scope: scope?.trim() || null,
        engagementStatus: "Engaged",
      },
      update: {
        scope: scope?.trim() || null,
        engagementStatus: "Engaged",
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId,
        action: "CONSULTANT_PROJECT_ASSOCIATED",
        entityType: "ProjectConsultant",
        entityId: link.id,
        safeChangeSummary: `Engaged consultant ${consultant.name} on project ${project.code}`,
      },
    });

    return link;
  });
}

/**
 * Remove project association from consultant (Owner and Admin only)
 */
export async function disassociateConsultantProject(
  ctx: TenantContext,
  consultantId: string,
  projectId: string
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.projectConsultant.findFirst({
    where: {
      consultantId,
      projectId,
      tenantId: ctx.tenantId,
    },
  });

  if (!existing) {
    return { success: true };
  }

  return await prisma.$transaction(async (tx) => {
    await tx.projectConsultant.delete({
      where: {
        projectId_consultantId: {
          projectId,
          consultantId,
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId,
        action: "CONSULTANT_PROJECT_REMOVED",
        entityType: "ProjectConsultant",
        entityId: existing.id,
        safeChangeSummary: `Removed project association for consultant ${consultantId} on project ${projectId}`,
      },
    });

    return { success: true };
  });
}

/**
 * Toggle consultant active/archived status
 */
export async function toggleConsultantStatus(
  ctx: TenantContext,
  consultantId: string,
  isActive: boolean
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.consultant.findFirst({
    where: { id: consultantId, tenantId: ctx.tenantId },
  });

  if (!existing) {
    throw new Error("Consultant not found in this studio workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.consultant.update({
      where: { id: consultantId },
      data: { isActive },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: isActive ? "CONSULTANT_REACTIVATED" : "CONSULTANT_ARCHIVED",
        entityType: "Consultant",
        entityId: consultantId,
        safeChangeSummary: `${isActive ? "Reactivated" : "Archived"} consultant ${existing.name}`,
      },
    });

    return updated;
  });
}
