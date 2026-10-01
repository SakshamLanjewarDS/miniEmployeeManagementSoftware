import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, canManageFinance, assertAdminOrOwner } from "../../tenancy/context";
import { ProjectStatus, PhaseStatus, TaskWorkflowStatus } from "@prisma/client";
import { calculateProjectTaskProgress } from "../tasks/repository";

export async function findProjects(ctx: TenantContext) {
  const whereClause: any = {
    tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
  };

  // Employees and Project Managers only see assigned projects
  if (!isAdminOrOwner(ctx)) {
    whereClause.OR = [
      { members: { some: { membershipId: ctx.membershipId } } },
      { projectManagerId: ctx.membershipId },
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
      projectManager: {
        include: {
          user: {
            select: {
              fullName: true,
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
      { projectManagerId: ctx.membershipId },
    ];
  }

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      primaryClient: true,
      projectManager: {
        include: {
          user: true,
          employee: true,
        },
      },
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
    },
  });

  if (!project) return null;

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
  };
}

export async function createProject(
  ctx: TenantContext,
  data: {
    code: string;
    name: string;
    description?: string;
    primaryClientId?: string;
    projectType?: string;
    siteAddress?: string;
    projectManagerId?: string;
    budget?: number;
    currency?: string;
    startDate?: Date;
    targetDate?: Date;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can create projects.");

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        tenantId: ctx.tenantId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description,
        primaryClientId: data.primaryClientId,
        projectType: data.projectType,
        siteAddress: data.siteAddress,
        projectManagerId: data.projectManagerId,
        budget: data.budget,
        currency: data.currency || ctx.currency,
        startDate: data.startDate,
        targetDate: data.targetDate,
        status: ProjectStatus.ACTIVE,
      },
    });

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
    projectManagerId?: string | null;
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
  if (data.projectManagerId !== undefined) updatePayload.projectManagerId = data.projectManagerId || null;
  if (data.currentPhase !== undefined) updatePayload.currentPhase = data.currentPhase;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.budget !== undefined) updatePayload.budget = data.budget;
  if (data.currency !== undefined) updatePayload.currency = data.currency;
  if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
  if (data.targetDate !== undefined) updatePayload.targetDate = data.targetDate;

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: updatePayload,
  });

  // Log audit event
  try {
    await prisma.auditEvent.create({
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

export async function getProjectFormData(ctx: TenantContext) {
  const [clients, members] = await Promise.all([
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
  ]);

  return { clients, members };
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
