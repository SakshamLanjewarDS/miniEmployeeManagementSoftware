import { prisma } from "../../db/prisma";
import {
  TenantContext,
  assertCanManageDirectories,
  isAdminOrOwner,
  canManageFinance,
} from "../../tenancy/context";

export interface FindContractorsParams {
  search?: string;
  isActive?: boolean;
  projectId?: string;
}

export interface CreateContractorInput {
  name: string;
  contact?: string | null;
  email?: string | null;
  firmName?: string | null;
  trade: string;
  address?: string | null;
  projectIds?: string[];
}

export interface UpdateContractorInput {
  name?: string;
  contact?: string | null;
  email?: string | null;
  firmName?: string | null;
  trade?: string;
  address?: string | null;
  isActive?: boolean;
}

/**
 * Retrieve contractors with tenant isolation and permission-aware project/financial scoping.
 */
export async function findContractors(ctx: TenantContext, params: FindContractorsParams = {}) {
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
      { contact: { contains: q } },
      { email: { contains: q } },
      { firmName: { contains: q } },
      { trade: { contains: q } },
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
  const hasFinance = canManageFinance(ctx);

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

  const rawContractors = await prisma.contractor.findMany({
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
          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              revision: true,
              amount: true,
              currency: true,
              status: true,
              submittedDate: true,
              validityDate: true,
              notes: true,
            },
            orderBy: { submittedDate: "desc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Sanitize based on employee project access & financial permissions
  return rawContractors.map((contractor) => {
    // Filter projects if non-privileged
    const accessibleProjects = isPrivileged
      ? contractor.projects
      : contractor.projects.filter((pc) => allowedProjectIds?.has(pc.projectId));

    const sanitizedProjects = accessibleProjects.map((pc) => ({
      id: pc.id,
      projectId: pc.projectId,
      project: pc.project,
      scope: pc.scope,
      engagementStatus: pc.engagementStatus,
      createdAt: pc.createdAt.toISOString(),
      // Quotations are only visible if user has finance access
      quotations: hasFinance
        ? pc.quotations.map((q) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            revision: q.revision,
            amount: Number(q.amount),
            currency: q.currency,
            status: q.status,
            submittedDate: q.submittedDate.toISOString(),
            validityDate: q.validityDate ? q.validityDate.toISOString() : null,
            notes: q.notes,
          }))
        : [],
    }));

    return {
      id: contractor.id,
      name: contractor.name,
      contact: contractor.contact,
      email: contractor.email,
      firmName: contractor.firmName,
      trade: contractor.trade,
      address: contractor.address,
      isActive: contractor.isActive,
      createdAt: contractor.createdAt.toISOString(),
      updatedAt: contractor.updatedAt.toISOString(),
      projects: sanitizedProjects,
      totalAccessibleProjects: sanitizedProjects.length,
    };
  });
}

/**
 * Retrieve single contractor detail
 */
export async function findContractorById(ctx: TenantContext, contractorId: string) {
  const contractors = await findContractors(ctx);
  return contractors.find((c) => c.id === contractorId) || null;
}

/**
 * Create a new contractor (Owner and Admin only)
 */
export async function createContractor(ctx: TenantContext, input: CreateContractorInput) {
  assertCanManageDirectories(ctx);

  if (!input.name || !input.name.trim()) {
    throw new Error("Contractor name is required.");
  }
  if (!input.trade || !input.trade.trim()) {
    throw new Error("Contractor trade is required (e.g. Civil, Carpentry, Electrical).");
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
    const contractor = await tx.contractor.create({
      data: {
        tenantId: ctx.tenantId,
        name: input.name.trim(),
        contact: input.contact?.trim() || null,
        email: input.email?.trim() || null,
        firmName: input.firmName?.trim() || null,
        trade: input.trade.trim(),
        address: input.address?.trim() || null,
        isActive: true,
      },
    });

    if (input.projectIds && input.projectIds.length > 0) {
      await tx.projectContractor.createMany({
        data: input.projectIds.map((projectId) => ({
          tenantId: ctx.tenantId,
          projectId,
          contractorId: contractor.id,
          engagementStatus: "Active",
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "CONTRACTOR_CREATED",
        entityType: "Contractor",
        entityId: contractor.id,
        safeChangeSummary: `Created contractor ${contractor.name} (${contractor.trade}) with ${input.projectIds?.length || 0} initial projects`,
      },
    });

    return contractor;
  });
}

/**
 * Update an existing contractor (Owner and Admin only)
 */
export async function updateContractor(
  ctx: TenantContext,
  contractorId: string,
  input: UpdateContractorInput
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.contractor.findFirst({
    where: {
      id: contractorId,
      tenantId: ctx.tenantId,
    },
  });

  if (!existing) {
    throw new Error("Contractor not found in this studio workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.contractor.update({
      where: { id: contractorId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.contact !== undefined ? { contact: input.contact?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.firmName !== undefined ? { firmName: input.firmName?.trim() || null } : {}),
        ...(input.trade !== undefined ? { trade: input.trade.trim() } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "CONTRACTOR_UPDATED",
        entityType: "Contractor",
        entityId: contractorId,
        safeChangeSummary: `Updated contractor details for ${contractorId}`,
      },
    });

    return updated;
  });
}

/**
 * Associate contractor with a project (Owner and Admin only)
 */
export async function associateContractorProject(
  ctx: TenantContext,
  contractorId: string,
  projectId: string,
  scope?: string
) {
  assertCanManageDirectories(ctx);

  // Validate both belong to this tenant
  const [contractor, project] = await Promise.all([
    prisma.contractor.findFirst({ where: { id: contractorId, tenantId: ctx.tenantId } }),
    prisma.project.findFirst({ where: { id: projectId, tenantId: ctx.tenantId } }),
  ]);

  if (!contractor || !project) {
    throw new Error("Contractor or project not found in this workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const link = await tx.projectContractor.upsert({
      where: {
        projectId_contractorId: {
          projectId,
          contractorId,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        projectId,
        contractorId,
        scope: scope?.trim() || null,
        engagementStatus: "Active",
      },
      update: {
        scope: scope?.trim() || null,
        engagementStatus: "Active",
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId,
        action: "CONTRACTOR_PROJECT_ASSOCIATED",
        entityType: "ProjectContractor",
        entityId: link.id,
        safeChangeSummary: `Associated contractor ${contractor.name} with project ${project.code}`,
      },
    });

    return link;
  });
}

/**
 * Remove project association from contractor (Owner and Admin only)
 */
export async function disassociateContractorProject(
  ctx: TenantContext,
  contractorId: string,
  projectId: string
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.projectContractor.findFirst({
    where: {
      contractorId,
      projectId,
      tenantId: ctx.tenantId,
    },
  });

  if (!existing) {
    return { success: true };
  }

  return await prisma.$transaction(async (tx) => {
    await tx.projectContractor.delete({
      where: {
        projectId_contractorId: {
          projectId,
          contractorId,
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        projectId,
        action: "CONTRACTOR_PROJECT_REMOVED",
        entityType: "ProjectContractor",
        entityId: existing.id,
        safeChangeSummary: `Removed project association for contractor ${contractorId} on project ${projectId}`,
      },
    });

    return { success: true };
  });
}

/**
 * Toggle contractor active/archived status
 */
export async function toggleContractorStatus(
  ctx: TenantContext,
  contractorId: string,
  isActive: boolean
) {
  assertCanManageDirectories(ctx);

  const existing = await prisma.contractor.findFirst({
    where: { id: contractorId, tenantId: ctx.tenantId },
  });

  if (!existing) {
    throw new Error("Contractor not found in this studio workspace.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.contractor.update({
      where: { id: contractorId },
      data: { isActive },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: isActive ? "CONTRACTOR_REACTIVATED" : "CONTRACTOR_ARCHIVED",
        entityType: "Contractor",
        entityId: contractorId,
        safeChangeSummary: `${isActive ? "Reactivated" : "Archived"} contractor ${existing.name}`,
      },
    });

    return updated;
  });
}
