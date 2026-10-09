import React from "react";
import { notFound } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findProjectDetail } from "@/server/modules/projects/repository";
import { prisma } from "@/server/db/prisma";
import { ProjectDetailClientView } from "./ProjectDetailClientView";

interface ProjectDetailPageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { workspaceSlug, projectId } = await params;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [project, allWorkspaceMembers] = await Promise.all([
    findProjectDetail(ctx, projectId),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        employee: { select: { designation: true, department: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailClientView
      context={ctx}
      project={project}
      allWorkspaceMembers={allWorkspaceMembers}
    />
  );
}
