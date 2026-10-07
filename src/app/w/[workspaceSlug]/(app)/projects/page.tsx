import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findProjects, getProjectFormData } from "@/server/modules/projects/repository";
import {
  getCustomFieldDefinitions,
  getCustomFieldValues,
} from "@/server/modules/custom-fields/repository";
import { ProjectsClientView } from "./ProjectsClientView";

interface ProjectsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [rawProjects, formData, customFieldDefinitions, customFieldValues] = await Promise.all([
    findProjects(ctx),
    getProjectFormData(ctx),
    getCustomFieldDefinitions(ctx, "PROJECT"),
    getCustomFieldValues(ctx, "PROJECT"),
  ]);

  // Ensure plain JSON serializable objects for Client Component
  const projects = rawProjects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    projectType: p.projectType,
    siteAddress: p.siteAddress,
    currentPhase: p.currentPhase,
    status: p.status as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED",
    budget: p.budget ? Number(p.budget) : null,
    currency: p.currency,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    targetDate: p.targetDate ? p.targetDate.toISOString() : null,
    primaryClientId: p.primaryClientId,
    projectArchitectId: (p as any).projectArchitectId,
    projectManagerId: p.projectManagerId,
    projectCoordinatorId: p.projectCoordinatorId,
    siteCity: p.siteCity,
    googleMapLocation: p.googleMapLocation,
    contractorId: p.contractorId,
    consultantId: p.consultantId,
    plotArea: p.plotArea,
    constructionArea: p.constructionArea,
    customFields: customFieldValues[p.id] || {},
    primaryClient: p.primaryClient
      ? {
          id: p.primaryClient.id,
          name: p.primaryClient.name,
          company: p.primaryClient.company,
        }
      : null,
    projectArchitect: (p as any).projectArchitect
      ? {
          user: {
            fullName: (p as any).projectArchitect.user.fullName,
          },
        }
      : null,
    projectManager: p.projectManager
      ? {
          user: {
            fullName: p.projectManager.user.fullName,
          },
        }
      : null,
    projectCoordinator: p.projectCoordinator
      ? {
          user: {
            fullName: p.projectCoordinator.user.fullName,
          },
        }
      : null,
    contractor: p.contractor
      ? {
          id: p.contractor.id,
          name: p.contractor.name,
          firmName: p.contractor.firmName,
          trade: p.contractor.trade,
        }
      : null,
    contractors: (p as any).contractors?.map((pc: any) => ({
      contractor: {
        id: pc.contractor.id,
        name: pc.contractor.name,
        firmName: pc.contractor.firmName,
        trade: pc.contractor.trade,
      },
    })) || [],
    consultant: p.consultant
      ? {
          id: p.consultant.id,
          name: p.consultant.name,
          firmName: p.consultant.firmName,
          discipline: p.consultant.discipline,
        }
      : null,
    consultants: (p as any).consultants?.map((pc: any) => ({
      consultant: {
        id: pc.consultant.id,
        name: pc.consultant.name,
        firmName: pc.consultant.firmName,
        discipline: pc.consultant.discipline,
      },
    })) || [],
    taskProgress: p.taskProgress,
    phaseProgress: p.phaseProgress,
    _count: p._count,
  }));

  const clients = formData.clients.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));

  const members = formData.members.map((m) => ({
    id: m.id,
    user: {
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
    },
    employee: m.employee
      ? {
          employeeId: m.employee.employeeId,
          designation: m.employee.designation,
        }
      : null,
  }));

  const contractors = (formData.contractors || []).map((c) => ({
    id: c.id,
    name: c.name,
    firmName: c.firmName,
    trade: c.trade,
  }));

  const consultants = (formData.consultants || []).map((c) => ({
    id: c.id,
    name: c.name,
    firmName: c.firmName,
    discipline: c.discipline,
  }));

  return (
    <ProjectsClientView
      context={ctx}
      initialProjects={projects}
      clients={clients}
      members={members}
      contractors={contractors}
      consultants={consultants}
      initialCustomFields={customFieldDefinitions}
      initialCustomValues={customFieldValues}
    />
  );
}
