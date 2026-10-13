import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { listEmployeesService } from "@/server/modules/employees/service";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import {
  getCustomFieldDefinitions,
  getCustomFieldValues,
} from "@/server/modules/custom-fields/repository";
import TeamClientView from "./TeamClientView";

interface TeamPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [employees, projects, customFieldDefinitions, customFieldValues] = await Promise.all([
    listEmployeesService(ctx),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    getCustomFieldDefinitions(ctx, "TEAM"),
    getCustomFieldValues(ctx, "TEAM"),
  ]);

  const serializedEmployees = employees.map((emp) => ({
    ...emp,
    joinDate: emp.joinDate ? (typeof emp.joinDate === "string" ? emp.joinDate : emp.joinDate.toISOString()) : null,
    customFields: customFieldValues[emp.id] || {},
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">Studio Team Members</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Architecture partners, project architects, and studio team directory
          </p>
        </div>
      </div>

      <TeamClientView
        workspaceSlug={ctx.tenantSlug}
        currentUserId={ctx.userId}
        userRole={ctx.role}
        initialEmployees={serializeForClient(serializedEmployees) as any}
        availableProjects={serializeForClient(projects)}
        initialCustomFields={serializeForClient(customFieldDefinitions) as any}
        initialCustomValues={serializeForClient(customFieldValues) as any}
      />
    </div>
  );
}
