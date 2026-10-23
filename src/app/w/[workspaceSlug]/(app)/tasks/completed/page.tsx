import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import CompletedTasksClientView from "./CompletedTasksClientView";

interface CompletedTasksPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{
    search?: string;
    assigneeId?: string;
    projectId?: string;
    priority?: string;
    dateRange?: string;
    onTimeStatus?: string;
  }>;
}

export default async function CompletedTasksPage({ params, searchParams }: CompletedTasksPageProps) {
  const { workspaceSlug } = await params;
  const sParams = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";

  // Pre-load projects and active employees for filter dropdowns
  const [projects, employees] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        employee: { select: { employeeId: true, designation: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
  ]);

  return (
    <CompletedTasksClientView
      workspaceSlug={workspaceSlug}
      userRole={ctx.role}
      currentMembershipId={ctx.membershipId}
      isPrivileged={isPrivileged}
      projects={projects}
      employees={employees}
      initialFilters={{
        search: sParams.search || "",
        assigneeId: sParams.assigneeId || "",
        projectId: sParams.projectId || "",
        priority: sParams.priority || "",
        dateRange: sParams.dateRange || "ALL_TIME",
        onTimeStatus: sParams.onTimeStatus || "ALL",
      }}
    />
  );
}
