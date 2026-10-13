/**
 * Reusable Project and Checklist Templates Domain Service
 * 100% DESIGN Studio — Multi-Tenant Architecture
 *
 * Implements:
 * 1. Template lifecycle: DRAFT, PUBLISHED, ARCHIVED with versioning.
 * 2. Master template definition: Phases, Milestones, Deliverables/Tasks, Checklist items,
 *    Dependencies, Default Priorities, Relative Due Offsets, and Suggested Roles.
 * 3. Topological cycle detection to guarantee no cyclic dependencies.
 * 4. Safe Preview before application: maps roles to actual members, resolves date offsets,
 *    and detects duplicate application.
 * 5. Transactional application creating immutable snapshot without altering master or active projects.
 * 6. Audit logging and project provenance tracking.
 */

import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { Prisma, TaskPriority, TaskWorkflowStatus } from "@prisma/client";

export interface TemplatePhaseInput {
  name: string;
  sortOrder: number;
  offsetDays: number;
  durationDays: number;
  description?: string;
}

export interface TemplateDeliverableInput {
  title: string;
  phaseIndex: number; // 0-indexed index in phases array
  offsetDays: number;
  durationDays: number;
  estimatedHours?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggestedRole?: string; // e.g., "Project Architect", "Interior Designer", "Site Engineer"
  acceptanceCriteria?: string;
  checklists?: Array<{
    title: string;
    requiredEvidence?: boolean;
    sortOrder?: number;
  }>;
}

export interface TemplateDependencyInput {
  fromIndex: number; // Deliverable index
  toIndex: number; // Deliverable index
}

export interface CreateProjectTemplateInput {
  name: string;
  projectType: string;
  description?: string;
  category?: string;
  phases: TemplatePhaseInput[];
  deliverables: TemplateDeliverableInput[];
  dependencies?: TemplateDependencyInput[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

/**
 * Validates dependencies for cycles using depth-first search / Kahn's algorithm
 */
function validateNoCyclicDependencies(
  deliverableCount: number,
  dependencies: TemplateDependencyInput[]
): void {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < deliverableCount; i++) {
    adj.set(i, []);
  }

  for (const dep of dependencies) {
    if (dep.fromIndex < 0 || dep.fromIndex >= deliverableCount || dep.toIndex < 0 || dep.toIndex >= deliverableCount) {
      throw new Error(`Dependency refers to invalid deliverable index: ${dep.fromIndex} -> ${dep.toIndex}`);
    }
    if (dep.fromIndex === dep.toIndex) {
      throw new Error(`Cyclic dependency detected: Deliverable #${dep.fromIndex} depends on itself.`);
    }
    adj.get(dep.fromIndex)!.push(dep.toIndex);
  }

  // 0: unvisited, 1: visiting, 2: visited
  const visited = new Array(deliverableCount).fill(0);

  function dfs(u: number): boolean {
    visited[u] = 1;
    for (const v of adj.get(u) || []) {
      if (visited[v] === 1) return true; // cycle detected
      if (visited[v] === 0 && dfs(v)) return true;
    }
    visited[u] = 2;
    return false;
  }

  for (let i = 0; i < deliverableCount; i++) {
    if (visited[i] === 0) {
      if (dfs(i)) {
        throw new Error("Cyclic dependency detected in template workflow graph.");
      }
    }
  }
}

/**
 * Standard Studio Blueprints offered if tenant has no templates
 */
const DEFAULT_STUDIO_TEMPLATES: CreateProjectTemplateInput[] = [
  {
    name: "Luxury Residential Architecture",
    projectType: "Residential",
    category: "Architecture",
    description: "End-to-end villa & bungalow design blueprint: concept design through site execution and handover.",
    status: "PUBLISHED",
    phases: [
      { name: "Concept & Spatial Planning", sortOrder: 1, offsetDays: 0, durationDays: 14, description: "Zoning, massing, and mood conceptualization" },
      { name: "Schematic Architectural Design", sortOrder: 2, offsetDays: 14, durationDays: 21, description: "Floor plans, elevations, sections, and 3D visualization" },
      { name: "Working Drawings & BoQ", sortOrder: 3, offsetDays: 35, durationDays: 30, description: "Permit drawings, MEP layouts, structural coordination, and Bill of Quantities" },
      { name: "Site Execution & Quality Audits", sortOrder: 4, offsetDays: 65, durationDays: 90, description: "Periodic site reviews, contractor snagging, and client handover" },
    ],
    deliverables: [
      {
        title: "Site Analysis & Concept Moodboard",
        phaseIndex: 0,
        offsetDays: 2,
        durationDays: 5,
        estimatedHours: 24,
        priority: "HIGH",
        suggestedRole: "Project Architect",
        acceptanceCriteria: "Approved sun-path analysis, slope zoning, and spatial intent presentation.",
        checklists: [
          { title: "Topographical survey verification", requiredEvidence: true },
          { title: "Zoning bylaws and setback compliance check", requiredEvidence: false },
          { title: "Client design brief alignment sign-off", requiredEvidence: true },
        ],
      },
      {
        title: "Detailed Floor Plans & 3D Elevations",
        phaseIndex: 1,
        offsetDays: 16,
        durationDays: 10,
        estimatedHours: 40,
        priority: "HIGH",
        suggestedRole: "Project Architect",
        acceptanceCriteria: "Dimensioned layouts and photorealistic render packet for client sign-off.",
        checklists: [
          { title: "Internal circulation and room dimension sign-off", requiredEvidence: false },
          { title: "Window schedule & fenestration alignment", requiredEvidence: false },
          { title: "3D exterior renders generated and reviewed", requiredEvidence: true },
        ],
      },
      {
        title: "GFC Architecture & MEP Packages",
        phaseIndex: 2,
        offsetDays: 38,
        durationDays: 15,
        estimatedHours: 50,
        priority: "URGENT",
        suggestedRole: "Senior Architect",
        acceptanceCriteria: "Good-For-Construction drawings stamped and issued to contractor.",
        checklists: [
          { title: "Civil architectural working drawings issued", requiredEvidence: true },
          { title: "Electrical, plumbing & HVAC coordinated overlays", requiredEvidence: true },
          { title: "Detailed door/window and finish specifications", requiredEvidence: false },
        ],
      },
    ],
    dependencies: [
      { fromIndex: 0, toIndex: 1 },
      { fromIndex: 1, toIndex: 2 },
    ],
  },
  {
    name: "Turnkey Interior Fitout",
    projectType: "Interior",
    category: "Interior Design",
    description: "Fast-track interior workflow: space planning, millwork detailing, material schedules, and installation.",
    status: "PUBLISHED",
    phases: [
      { name: "Concept & Space Planning", sortOrder: 1, offsetDays: 0, durationDays: 10, description: "Layouts, material palettes, and 3D perspectives" },
      { name: "Joinery & Detailed Specifications", sortOrder: 2, offsetDays: 10, durationDays: 18, description: "Custom millwork, lighting schedules, and finishes" },
      { name: "Fabrication & Site Fitout", sortOrder: 3, offsetDays: 28, durationDays: 45, description: "On-site installation, MEP alignment, and final snagging" },
    ],
    deliverables: [
      {
        title: "Furniture Layout & Moodboards",
        phaseIndex: 0,
        offsetDays: 1,
        durationDays: 7,
        estimatedHours: 20,
        priority: "HIGH",
        suggestedRole: "Interior Designer",
        acceptanceCriteria: "Full layout plan with color schemes and sample board references.",
        checklists: [
          { title: "Measure on site verification", requiredEvidence: true },
          { title: "Client aesthetic brief confirmation", requiredEvidence: false },
        ],
      },
      {
        title: "Millwork & Joinery Detail Drawings",
        phaseIndex: 1,
        offsetDays: 12,
        durationDays: 12,
        estimatedHours: 35,
        priority: "HIGH",
        suggestedRole: "Interior Designer",
        acceptanceCriteria: "Complete wardrobe, kitchen, and vanity detail shop drawings.",
        checklists: [
          { title: "Hardware and mechanism specifications list", requiredEvidence: false },
          { title: "Veneer / laminate finish tag verification", requiredEvidence: true },
        ],
      },
    ],
    dependencies: [{ fromIndex: 0, toIndex: 1 }],
  },
];

/**
 * Lists available project templates for the tenant.
 * Auto-seeds standard studio blueprints if none exist.
 */
export async function listProjectTemplates(
  ctx: TenantContext,
  params?: { status?: string; projectType?: string }
) {
  let count = await prisma.projectTemplate.count({
    where: { tenantId: ctx.tenantId },
  });

  if (count === 0 && (ctx.role === "OWNER" || ctx.role === "ADMIN")) {
    // Seed default studio templates
    for (const t of DEFAULT_STUDIO_TEMPLATES) {
      await prisma.projectTemplate.create({
        data: {
          tenantId: ctx.tenantId,
          name: t.name,
          projectType: t.projectType,
          description: t.description,
          category: t.category,
          status: t.status || "PUBLISHED",
          phasesJson: t.phases as any,
          deliverablesJson: t.deliverables as any,
          dependenciesJson: (t.dependencies || []) as any,
          version: 1,
        },
      });
    }
  }

  return await prisma.projectTemplate.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.projectType ? { projectType: params.projectType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single template by ID
 */
export async function getProjectTemplate(ctx: TenantContext, templateId: string) {
  const template = await prisma.projectTemplate.findFirst({
    where: { id: templateId, tenantId: ctx.tenantId },
  });
  if (!template) throw new Error("Project template not found.");
  return template;
}

/**
 * Creates a new custom project template (Owner/Admin only)
 */
export async function createProjectTemplate(
  ctx: TenantContext,
  input: CreateProjectTemplateInput
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can create project templates.");

  if (!input.name?.trim()) throw new Error("Template name is required.");
  if (!input.projectType?.trim()) throw new Error("Project type is required.");
  if (!input.phases || input.phases.length === 0) {
    throw new Error("At least one project phase is required in a template.");
  }

  // Validate dependencies
  validateNoCyclicDependencies(input.deliverables?.length || 0, input.dependencies || []);

  return await prisma.projectTemplate.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      projectType: input.projectType.trim(),
      description: input.description?.trim() || null,
      category: input.category || "Architecture",
      status: input.status || "PUBLISHED",
      phasesJson: input.phases as any,
      deliverablesJson: (input.deliverables || []) as any,
      dependenciesJson: (input.dependencies || []) as any,
      version: 1,
    },
  });
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(s: string): Date {
  const parts = s.slice(0, 10).split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

/**
 * Previews the application of a template onto an existing project.
 * Resolves dates, suggested roles against memberships, and detects prior application.
 */
export async function previewApplyTemplate(
  ctx: TenantContext,
  params: {
    templateId: string;
    projectId: string;
    startDate: string; // YYYY-MM-DD
    roleMapping?: Record<string, string>; // suggestedRole -> membershipId
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can preview or apply project templates.");

  const template = await getProjectTemplate(ctx, params.templateId);
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, tenantId: ctx.tenantId },
    include: {
      phases: true,
      tasks: true,
    },
  });

  if (!project) throw new Error("Target project not found in this studio.");

  const warnings: string[] = [];
  const startObj = parseDateOnly(params.startDate);
  if (isNaN(startObj.getTime())) {
    throw new Error("Invalid project start date format. Expected YYYY-MM-DD.");
  }

  // Detect prior application
  const isDuplicateApplication =
    project.appliedTemplateId === template.id ||
    project.phases.length > 0 ||
    project.tasks.length > 0;

  if (isDuplicateApplication) {
    warnings.push(
      `Project "${project.name}" already has ${project.phases.length} existing phases and ${project.tasks.length} tasks. Applying this template will create additional phases and tasks.`
    );
  }

  const phases = (template.phasesJson as unknown as TemplatePhaseInput[]) || [];
  const deliverables = (template.deliverablesJson as unknown as TemplateDeliverableInput[]) || [];

  // Fetch active memberships to validate role mapping
  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: { user: true },
  });

  const memberMap = new Map<string, string>();
  for (const m of memberships) {
    memberMap.set(m.id, m.user.fullName);
  }

  // Resolved phases
  const resolvedPhases = phases.map((p, idx) => {
    const pStart = new Date(startObj);
    pStart.setDate(pStart.getDate() + (p.offsetDays || 0));

    const pEnd = new Date(pStart);
    pEnd.setDate(pEnd.getDate() + (p.durationDays || 7));

    return {
      name: p.name,
      sortOrder: p.sortOrder || idx + 1,
      plannedStartDate: formatDate(pStart),
      plannedEndDate: formatDate(pEnd),
      description: p.description,
    };
  });

  // Resolved tasks
  const resolvedTasks = deliverables.map((d) => {
    const parentPhase = phases[d.phaseIndex] || phases[0];
    const tStart = new Date(startObj);
    tStart.setDate(tStart.getDate() + (parentPhase?.offsetDays || 0) + (d.offsetDays || 0));

    const tDue = new Date(tStart);
    tDue.setDate(tDue.getDate() + (d.durationDays || 5));

    const assignedMembershipId = params.roleMapping && d.suggestedRole ? params.roleMapping[d.suggestedRole] : undefined;
    const assigneeName = assignedMembershipId ? memberMap.get(assignedMembershipId) : undefined;

    if (d.suggestedRole && !assignedMembershipId) {
      warnings.push(`Suggested role "${d.suggestedRole}" on task "${d.title}" is not mapped to an active team member.`);
    }

    return {
      title: d.title,
      phaseName: parentPhase?.name || "General",
      startDate: formatDate(tStart),
      dueDate: formatDate(tDue),
      estimatedHours: d.estimatedHours || 0,
      priority: d.priority || "MEDIUM",
      suggestedRole: d.suggestedRole,
      assignedMembershipId,
      assigneeName,
      acceptanceCriteria: d.acceptanceCriteria,
      checklistCount: d.checklists?.length || 0,
    };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
    projectId: project.id,
    projectName: project.name,
    projectStartDate: params.startDate,
    isDuplicateApplication,
    warnings,
    resolvedPhases,
    resolvedTasks,
    totalEstimatedHours: resolvedTasks.reduce((acc, t) => acc + t.estimatedHours, 0),
  };
}

/**
 * Applies template to target project transactionally.
 * Creates versioned snapshot without altering master template or existing work.
 */
export async function applyTemplateToProject(
  ctx: TenantContext,
  params: {
    templateId: string;
    projectId: string;
    startDate: string;
    roleMapping?: Record<string, string>;
    confirmationNotes?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can apply project templates.");

  const preview = await previewApplyTemplate(ctx, params);
  const template = await getProjectTemplate(ctx, params.templateId);
  const phases = (template.phasesJson as unknown as TemplatePhaseInput[]) || [];
  const deliverables = (template.deliverablesJson as unknown as TemplateDeliverableInput[]) || [];

  const startObj = new Date(params.startDate + "T00:00:00");

  return await prisma.$transaction(async (tx) => {
    // 1. Mark project with applied template snapshot
    const updatedProject = await tx.project.update({
      where: { id: params.projectId },
      data: {
        appliedTemplateId: template.id,
        templateVersion: template.version,
        templateAppliedAt: new Date(),
      },
    });

    // 2. Create Project Phases
    const createdPhases: any[] = [];
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      const pStart = new Date(startObj);
      pStart.setDate(pStart.getDate() + (p.offsetDays || 0));

      const pEnd = new Date(pStart);
      pEnd.setDate(pEnd.getDate() + (p.durationDays || 7));

      const createdPhase = await tx.projectPhase.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: params.projectId,
          phaseName: p.name,
          sortOrder: p.sortOrder || i + 1,
          plannedStartDate: pStart,
          plannedEndDate: pEnd,
          status: "NOT_STARTED",
        },
      });
      createdPhases.push(createdPhase);
    }

    // 3. Ensure mapped assignees are Project Members
    if (params.roleMapping) {
      for (const [role, memberId] of Object.entries(params.roleMapping)) {
        if (!memberId) continue;
        const existing = await tx.projectMember.findFirst({
          where: { projectId: params.projectId, membershipId: memberId },
        });
        if (!existing) {
          await tx.projectMember.create({
            data: {
              tenantId: ctx.tenantId,
              projectId: params.projectId,
              membershipId: memberId,
              projectRole: role,
            },
          });
        }
      }
    }

    // 4. Create Deliverables / Tasks & Checklist items
    const createdTasks: any[] = [];
    for (let i = 0; i < deliverables.length; i++) {
      const d = deliverables[i];
      const assignedPhase = createdPhases[d.phaseIndex] || createdPhases[0];

      const parentPhaseDef = phases[d.phaseIndex] || phases[0];
      const tStart = new Date(startObj);
      tStart.setDate(tStart.getDate() + (parentPhaseDef?.offsetDays || 0) + (d.offsetDays || 0));

      const tDue = new Date(tStart);
      tDue.setDate(tDue.getDate() + (d.durationDays || 5));

      const assigneeId = params.roleMapping && d.suggestedRole ? params.roleMapping[d.suggestedRole] : undefined;

      const task = await tx.task.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: params.projectId,
          phaseId: assignedPhase?.id || null,
          title: d.title,
          priority: (d.priority as TaskPriority) || TaskPriority.MEDIUM,
          status: TaskWorkflowStatus.NOT_STARTED,
          assigneeId: assigneeId || null,
          assignedMemberIds: assigneeId ? [assigneeId] : [],
          creatorId: ctx.membershipId,
          startDate: tStart,
          dueDate: tDue,
          estimatedHours: d.estimatedHours ? new Prisma.Decimal(d.estimatedHours) : null,
          acceptanceCriteria: d.acceptanceCriteria || null,
        },
      });

      // Create checklist items if configured
      if (d.checklists && d.checklists.length > 0) {
        for (let cIdx = 0; cIdx < d.checklists.length; cIdx++) {
          const item = d.checklists[cIdx];
          await tx.taskChecklistItem.create({
            data: {
              tenantId: ctx.tenantId,
              taskId: task.id,
              title: item.title,
              sortOrder: item.sortOrder || cIdx + 1,
              isCompleted: false,
              acceptanceCriteria: item.requiredEvidence ? "Mandatory file upload or approval evidence required." : null,
            },
          });
        }
      }

      createdTasks.push(task);
    }

    // 5. Record Audit Trail
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: params.projectId,
        action: "PROJECT_TEMPLATE_APPLIED",
        entityType: "Project",
        entityId: params.projectId,
        safeChangeSummary: `Applied template "${template.name}" (v${template.version}) to project "${updatedProject.name}". Generated ${createdPhases.length} phases and ${createdTasks.length} tasks.`,
      },
    });

    return {
      success: true,
      project: updatedProject,
      phasesCount: createdPhases.length,
      tasksCount: createdTasks.length,
      preview,
    };
  });
}
