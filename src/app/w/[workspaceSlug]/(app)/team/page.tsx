import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listEmployeesService } from "@/server/modules/employees/service";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import TeamClientView from "./TeamClientView";

interface TeamPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [employees, projects] = await Promise.all([
    listEmployeesService(ctx),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const serializedEmployees = employees.map((emp) => ({
    ...emp,
    joinDate: emp.joinDate ? (typeof emp.joinDate === "string" ? emp.joinDate : emp.joinDate.toISOString()) : null,
  }));

  return (
    <TeamClientView
      workspaceSlug={ctx.tenantSlug}
      currentUserId={ctx.userId}
      userRole={ctx.role}
      userFullName={ctx.userFullName}
      initialEmployees={serializeForClient(serializedEmployees) as any}
      availableProjects={serializeForClient(projects)}
    />
  );
}
