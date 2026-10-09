import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, canManageFinance, assertAdminOrOwner } from "../../tenancy/context";
import { ProjectStatus, PhaseStatus, TaskWorkflowStatus } from "@prisma/client";
import { calculateProjectTaskProgress } from "../tasks/repository";

export async function findProjects(ctx: TenantContext) {
  const whereClause: any = {
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  // Employees, Project Managers, Architects, and Coordinators only see assigned projects
  if (!isAdminOrOwner(ctx)) {
    whereClause.OR = [
      { members: { some: { membershipId: ctx.membershipId } } },
      { projectArchitectId: ctx.membershipId },
      { projectManagerId: ctx.membershipId },
      { projectCoordinatorId: ctx.membershipId },
    ];
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      primaryClient: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
      projectArchitect: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      projectManager: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      projectCoordinator: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      contractor: {
        select: {
          id: true,
          name: true,
          firmName: true,
          trade: true,
        },
      },
      consultant: {
        select: {
          id: true,
          name: true,
          firmName: true,
          discipline: true,
        },
      },
      contractors: {
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              firmName: true,
              trade: true,
            },
          },
        },
      },
      consultants: {
        include: {
          consultant: {
            select: {
              id: true,
              name: true,
              firmName: true,
              discipline: true,
            },
          },
        },
      },
      phases: {
        orderBy: { sortOrder: "asc" },
      },
      tasks: {
        where: { status: { not: TaskWorkflowStatus.CANCELLED } },
        select: { status: true },
      },
      _count: {
        select: {
          tasks: true,
          documents: true,
          siteVisits: true,
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate task and architectural phase progress metrics directly in-memory
  return projects.map((p) => {
    const total = p.tasks.length;
    const completed = p.tasks.filter((t) => t.status === TaskWorkflowStatus.COMPLETED).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const taskProgress = {
      percentage,
      label: total === 0 ? "No tasks" : `${percentage}% Task completion (${completed}/${total})`,
      completedCount: completed,
      totalCount: total,
    };

    // Calculate Architectural Phase Progress
    const totalPhases = p.phases.length;
    const completedPhases = p.phases.filter((ph) => ph.status === PhaseStatus.COMPLETED).length;
    const currentPhaseItem =
      p.phases.find((ph) => ph.status === PhaseStatus.IN_PROGRESS) ||
      p.phases.find((ph) => ph.phaseName.toLowerCase() === (p.currentPhase || "").toLowerCase()) ||
      p.phases[0];
    const phasePercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
    const phaseProgress = {
      percentage: phasePercentage,
      completedCount: completedPhases,
      totalCount: totalPhases,
      currentPhase: p.currentPhase || (currentPhaseItem ? currentPhaseItem.phaseName : "Brief"),
      label: `${phasePercentage}% Phase completion (${completedPhases}/${totalPhases} phases)`,
    };

    const { tasks: _tasks, ...rest } = p;
    return {
      ...rest,
      taskProgress,
      phaseProgress,
      budget: canManageFinance(ctx) ? (p.budget ? Number(p.budget) : null) : null,
    };
  });
}

export async function findProjectDetail(ctx: TenantContext, projectId: string) {
  const whereClause: any = {
    id: projectId,
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  if (!isAdminOrOwner(ctx)) {
    whereClause.OR = [
      { members: { some: { membershipId: ctx.membershipId } } },
      { projectArchitectId: ctx.membershipId },
      { projectManagerId: ctx.membershipId },
      { projectCoordinatorId: ctx.membershipId },
    ];
  }

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      primaryClient: true,
      projectArchitect: {
        include: {
          user: true,
          employee: true,
        },
      },
      projectManager: {
        include: {
          user: true,
          employee: true,
        },
      },
      projectCoordinator: {
        include: {
          user: true,
          employee: true,
        },
      },
      contractor: true,
      consultant: true,
      phases: {
        orderBy: { sortOrder: "asc" },
      },
      members: {
        include: {
          membership: {
            include: {
              user: true,
              employee: true,
            },
          },
        },
      },
      consultants: {
        include: {
          consultant: true,
        },
      },
      contractors: {
        include: {
          contractor: true,
          quotations: {
            orderBy: [{ revision: "desc" }, { createdAt: "desc" }],
          },
        },
      },
      sites: {
        include: {
          visits: {
            orderBy: { scheduledTime: "desc" },
            take: 5,
            include: {
              employee: {
                include: { user: true, employee: true },
              },
            },
          },
        },
      },
      tasks: {
        include: {
          assignee: {
            include: { user: true, employee: true },
          },
          phase: true,
        },
        orderBy: { dueDate: "asc" },
      },
      documents: {
        include: {
          versions: {
            orderBy: { revision: "desc" },
          },
        },
      },
      budgets: true,
      feeMilestones: {
        include: {
          payments: true,
        },
      },
      expenses: {
        orderBy: { expenseDate: "desc" },
      },
      milestones: {
        include: { phase: true },
        orderBy: { targetDate: "asc" },
      },
      changeRequests: {
        include: {
          requester: { include: { user: true } },
          decidedBy: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) return null;

  const auditEvents = await prisma.auditEvent.findMany({
    where: { projectId: project.id, tenantId: ctx.tenantId },
    orderBy: { timestamp: "desc" },
    take: 30,
  });

  const activeTasks = project.tasks.filter((t) => t.status !== TaskWorkflowStatus.CANCELLED);
  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === TaskWorkflowStatus.COMPLETED).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const taskProgress = {
    percentage,
    label: total === 0 ? "No tasks" : `${percentage}% Task completion (${completed}/${total})`,
    completedCount: completed,
    totalCount: total,
  };

  const totalPhases = project.phases.length;
  const completedPhases = project.phases.filter((ph) => ph.status === PhaseStatus.COMPLETED).length;
  const phasePercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  const phaseProgress = {
    percentage: phasePercentage,
    completedCount: completedPhases,
    totalCount: totalPhases,
    currentPhase: project.currentPhase || (project.phases[0]?.phaseName || "Brief"),
    label: `${phasePercentage}% Phase completion (${completedPhases}/${totalPhases} phases)`,
  };

  const hasFinance = canManageFinance(ctx);

  return {
    ...project,
    budget: hasFinance ? (project.budget ? Number(project.budget) : null) : null,
    budgets: hasFinance
      ? project.budgets.map((b) => ({ ...b, plannedAmount: Number(b.plannedAmount) }))
      : [],
    feeMilestones: hasFinance
      ? project.feeMilestones.map((m) => ({
          ...m,
          amount: Number(m.amount),
          payments: m.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
        }))
      : [],
    expenses: hasFinance
      ? project.expenses.map((e) => ({ ...e, amount: Number(e.amount) }))
      : [],
    contractors: project.contractors.map((pc) => ({
      ...pc,
      quotations: hasFinance
        ? pc.quotations.map((q) => ({ ...q, amount: Number(q.amount) }))
        : [],
    })),
    taskProgress,
    phaseProgress,
    auditEvents,
  };
}

export const getProjectById = findProjectDetail;

export async function createProject(
  ctx: TenantContext,
  data: {
    code: string;
    name: string;
    description?: string;
    primaryClientId?: string;
    projectType?: string;
    siteAddress?: string;
    siteCity?: string;
    googleMapLocation?: string;
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
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can create projects.");

  const rawContractorIds = Array.isArray(data.contractorIds)
    ? data.contractorIds.filter(Boolean)
    : (data.contractorId ? [data.contractorId] : []);
  const uniqueContractorIds = Array.from(new Set(rawContractorIds));

  const rawConsultantIds = Array.isArray(data.consultantIds)
    ? data.consultantIds.filter(Boolean)
    : (data.consultantId ? [data.consultantId] : []);
  const uniqueConsultantIds = Array.from(new Set(rawConsultantIds));

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        tenantId: ctx.tenantId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description,
        primaryClientId: data.primaryClientId || null,
        projectType: data.projectType,
        siteAddress: data.siteAddress,
        siteCity: data.siteCity,
        googleMapLocation: data.googleMapLocation,
        projectArchitectId: data.projectArchitectId || null,
        projectManagerId: data.projectManagerId || null,
        projectCoordinatorId: data.projectCoordinatorId || null,
        contractorId: uniqueContractorIds[0] || data.contractorId || null,
        consultantId: uniqueConsultantIds[0] || data.consultantId || null,
        plotArea: data.plotArea,
        constructionArea: data.constructionArea,
        budget: data.budget,
        currency: data.currency || ctx.currency,
        startDate: data.startDate,
        targetDate: data.targetDate,
        status: ProjectStatus.ACTIVE,
      },
    });

    for (const cId of uniqueContractorIds) {
      await tx.projectContractor.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          contractorId: cId,
          scope: "Commissioned Contractor",
        },
      }).catch(() => {});
    }

    for (const cId of uniqueConsultantIds) {
      await tx.projectConsultant.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: project.id,
          consultantId: cId,
          scope: "Commissioned Consultant",
        },
      }).catch(() => {});
    }

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
          projectRole: "Project Manager",
        },
      }).catch(() => {});
    }

    // Seed default architectural phases
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
          status: dp.order === 1 ? PhaseStatus.IN_PROGRESS : PhaseStatus.NOT_STARTED,
        },
      });
    }

    // Log audit event
    try {
      await tx.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.membershipId,
          projectId: project.id,
          action: "PROJECT_CREATED",
          entityType: "Project",
          entityId: project.id,
          safeChangeSummary: `Commissioned new architectural project "${project.name}" (${project.code})`,
        },
      });
    } catch (e) {
      console.error("Failed to log project creation audit event:", e);
    }

    return project;
  });
}

export async function updateProject(
  ctx: TenantContext,
  projectId: string,
  data: {
    code?: string;
    name?: string;
    description?: string;
    primaryClientId?: string | null;
    projectType?: string;
    siteAddress?: string;
    siteCity?: string | null;
    googleMapLocation?: string | null;
    projectArchitectId?: string | null;
    projectManagerId?: string | null;
    projectCoordinatorId?: string | null;
    contractorId?: string | null;
    contractorIds?: string[] | null;
    consultantId?: string | null;
    consultantIds?: string[] | null;
    plotArea?: string | null;
    constructionArea?: string | null;
    currentPhase?: string | null;
    status?: ProjectStatus;
    budget?: number | null;
    currency?: string;
    startDate?: Date | null;
    targetDate?: Date | null;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can modify projects.");

  const existing = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });

  if (!existing) {
    throw new Error("Project not found in this studio workspace");
  }

  const updatePayload: any = {};
  if (data.code !== undefined) updatePayload.code = data.code.trim().toUpperCase();
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.primaryClientId !== undefined) updatePayload.primaryClientId = data.primaryClientId || null;
  if (data.projectType !== undefined) updatePayload.projectType = data.projectType;
  if (data.siteAddress !== undefined) updatePayload.siteAddress = data.siteAddress;
  if (data.siteCity !== undefined) updatePayload.siteCity = data.siteCity || null;
  if (data.googleMapLocation !== undefined) updatePayload.googleMapLocation = data.googleMapLocation || null;
  if (data.projectArchitectId !== undefined) updatePayload.projectArchitectId = data.projectArchitectId || null;
  if (data.projectManagerId !== undefined) updatePayload.projectManagerId = data.projectManagerId || null;
  if (data.projectCoordinatorId !== undefined) updatePayload.projectCoordinatorId = data.projectCoordinatorId || null;

  let uniqueContractorIds: string[] | null = null;
  if (data.contractorIds !== undefined) {
    uniqueContractorIds = Array.isArray(data.contractorIds)
      ? Array.from(new Set(data.contractorIds.filter(Boolean)))
      : [];
    updatePayload.contractorId = uniqueContractorIds[0] || null;
  } else if (data.contractorId !== undefined) {
    updatePayload.contractorId = data.contractorId || null;
  }

  let uniqueConsultantIds: string[] | null = null;
  if (data.consultantIds !== undefined) {
    uniqueConsultantIds = Array.isArray(data.consultantIds)
      ? Array.from(new Set(data.consultantIds.filter(Boolean)))
      : [];
    updatePayload.consultantId = uniqueConsultantIds[0] || null;
  } else if (data.consultantId !== undefined) {
    updatePayload.consultantId = data.consultantId || null;
  }

  if (data.plotArea !== undefined) updatePayload.plotArea = data.plotArea || null;
  if (data.constructionArea !== undefined) updatePayload.constructionArea = data.constructionArea || null;
  if (data.currentPhase !== undefined) updatePayload.currentPhase = data.currentPhase;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.budget !== undefined) updatePayload.budget = data.budget;
  if (data.currency !== undefined) updatePayload.currency = data.currency;
  if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
  if (data.targetDate !== undefined) updatePayload.targetDate = data.targetDate;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: updatePayload,
    });

    if (uniqueContractorIds !== null) {
      await tx.projectContractor.deleteMany({
        where: { projectId: projectId, tenantId: ctx.tenantId },
      });
      for (const cId of uniqueContractorIds) {
        await tx.projectContractor.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: projectId,
            contractorId: cId,
            scope: "Commissioned Contractor",
          },
        }).catch(() => {});
      }
    }

    if (uniqueConsultantIds !== null) {
      await tx.projectConsultant.deleteMany({
        where: { projectId: projectId, tenantId: ctx.tenantId },
      });
      for (const cId of uniqueConsultantIds) {
        await tx.projectConsultant.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: projectId,
            consultantId: cId,
            scope: "Commissioned Consultant",
          },
        }).catch(() => {});
      }
    }

    // Log audit event
    try {
      await tx.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.membershipId,
          projectId: existing.id,
          action: "PROJECT_UPDATED",
          entityType: "Project",
          entityId: existing.id,
          safeChangeSummary: `Updated architectural project "${existing.name}" (${existing.code})`,
        },
      });
    } catch (e) {
      console.error("Failed to log project update audit event:", e);
    }

    return updated;
  });
}

export async function deleteProject(ctx: TenantContext, projectId: string) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can delete projects.");

  const existing = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });

  if (!existing) {
    throw new Error("Project not found in this studio workspace");
  }

  const deleted = await prisma.project.delete({
    where: { id: projectId },
  });

  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "PROJECT_DELETED",
        entityType: "Project",
        entityId: projectId,
        safeChangeSummary: `Deleted project "${existing.name}" (${existing.code})`,
      },
    });
  } catch (e) {
    console.error("Failed to log project deletion audit event:", e);
  }

  return deleted;
}

export async function deleteProjectsBulk(ctx: TenantContext, projectIds: string[]) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can delete projects.");

  if (!projectIds || projectIds.length === 0) {
    return { count: 0 };
  }

  const validProjects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      tenantId: ctx.tenantId,
    },
    select: { id: true, code: true, name: true },
  });

  if (validProjects.length === 0) {
    return { count: 0 };
  }

  const idsToDelete = validProjects.map((p) => p.id);

  const res = await prisma.project.deleteMany({
    where: {
      id: { in: idsToDelete },
      tenantId: ctx.tenantId,
    },
  });

  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "PROJECTS_BULK_DELETED",
        entityType: "Project",
        entityId: idsToDelete[0],
        safeChangeSummary: `Bulk deleted ${validProjects.length} projects (${validProjects.map((p) => p.code).join(", ")})`,
      },
    });
  } catch (e) {
    console.error("Failed to log bulk project deletion audit event:", e);
  }

  return res;
}

export async function getProjectFormData(ctx: TenantContext) {
  const [clients, members, contractors, consultants] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        employee: { select: { employeeId: true, designation: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.contractor.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, firmName: true, trade: true },
      orderBy: { name: "asc" },
    }),
    prisma.consultant.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, firmName: true, discipline: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { clients, members, contractors, consultants };
}

export async function updateProjectProgress(
  ctx: TenantContext,
  projectId: string,
  params: {
    targetPhaseName?: string;
    phaseUpdates?: { phaseId: string; status: PhaseStatus }[];
    status?: ProjectStatus;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can manipulate project progress.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: {
      phases: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) {
    throw new Error("Project not found in this studio workspace");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. If targetPhaseName is selected (e.g. "Working Drawings"):
    // Set all phases before it to COMPLETED, targetPhase to IN_PROGRESS, subsequent phases to NOT_STARTED
    if (params.targetPhaseName) {
      const targetPhase = project.phases.find(
        (p) => p.phaseName.toLowerCase() === params.targetPhaseName!.toLowerCase()
      );

      if (targetPhase) {
        // Mark previous phases as COMPLETED
        await tx.projectPhase.updateMany({
          where: {
            projectId,
            tenantId: ctx.tenantId,
            sortOrder: { lt: targetPhase.sortOrder },
          },
          data: { status: PhaseStatus.COMPLETED, actualEndDate: new Date() },
        });

        // Mark target phase as IN_PROGRESS
        await tx.projectPhase.update({
          where: { id: targetPhase.id },
          data: { status: PhaseStatus.IN_PROGRESS, actualStartDate: new Date(), actualEndDate: null },
        });

        // Mark subsequent phases as NOT_STARTED
        await tx.projectPhase.updateMany({
          where: {
            projectId,
            tenantId: ctx.tenantId,
            sortOrder: { gt: targetPhase.sortOrder },
          },
          data: { status: PhaseStatus.NOT_STARTED, actualStartDate: null, actualEndDate: null },
        });

        // Update project currentPhase
        await tx.project.update({
          where: { id: projectId },
          data: {
            currentPhase: targetPhase.phaseName,
            ...(params.status ? { status: params.status } : {}),
          },
        });
      }
    }

    // 2. Granular phase status updates (e.g., mark specific phase COMPLETED or DELAYED)
    if (params.phaseUpdates && params.phaseUpdates.length > 0) {
      for (const pu of params.phaseUpdates) {
        await tx.projectPhase.update({
          where: { id: pu.phaseId },
          data: {
            status: pu.status,
            ...(pu.status === PhaseStatus.COMPLETED ? { actualEndDate: new Date() } : {}),
            ...(pu.status === PhaseStatus.IN_PROGRESS ? { actualStartDate: new Date() } : {}),
          },
        });
      }

      // Re-determine current active in-progress phase
      const updatedPhases = await tx.projectPhase.findMany({
        where: { projectId },
        orderBy: { sortOrder: "asc" },
      });
      const inProg = updatedPhases.find((p) => p.status === PhaseStatus.IN_PROGRESS);
      if (inProg) {
        await tx.project.update({
          where: { id: projectId },
          data: { currentPhase: inProg.phaseName },
        });
      }
    }

    // Log audit event
    try {
      await tx.auditEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorId: ctx.membershipId,
          projectId,
          action: "PROJECT_PROGRESS_MANIPULATED",
          entityType: "Project",
          entityId: projectId,
          safeChangeSummary: `Manipulated progress & phase to "${params.targetPhaseName || "custom"}" for "${project.name}" (${project.code})`,
        },
      });
    } catch (e) {
      console.error("Failed to log audit event:", e);
    }

    return await tx.project.findFirst({
      where: { id: projectId },
      include: {
        phases: { orderBy: { sortOrder: "asc" } },
      },
    });
  });
}
