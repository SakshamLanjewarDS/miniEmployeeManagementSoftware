import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findProjects, getProjectFormData } from "@/server/modules/projects/repository";
import { ProjectsClientView } from "./ProjectsClientView";

interface ProjectsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [rawProjects, formData] = await Promise.all([
    findProjects(ctx),
    getProjectFormData(ctx),
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
    projectManagerId: p.projectManagerId,
    primaryClient: p.primaryClient
      ? {
          id: p.primaryClient.id,
          name: p.primaryClient.name,
          company: p.primaryClient.company,
        }
      : null,
    projectManager: p.projectManager
      ? {
          user: {
            fullName: p.projectManager.user.fullName,
          },
        }
      : null,
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

  return (
    <ProjectsClientView
      context={ctx}
      initialProjects={projects}
      clients={clients}
      members={members}
    />
  );
}
