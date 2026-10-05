import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findConsultants } from "@/server/modules/consultants/repository";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import {
  getCustomFieldDefinitions,
  getCustomFieldValues,
} from "@/server/modules/custom-fields/repository";
import ConsultantsClientView from "./ConsultantsClientView";

interface ConsultantsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string; discipline?: string }>;
}

export default async function ConsultantsPage({ params, searchParams }: ConsultantsPageProps) {
  const { workspaceSlug } = await params;
  const { search, status, discipline } = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";

  const [consultants, projects, customFieldDefinitions, customFieldValues, clients] = await Promise.all([
    findConsultants(ctx, {
      search,
      isActive: status === "archived" ? false : status === "active" ? true : undefined,
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, isArchived: false },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    getCustomFieldDefinitions(ctx, "CONSULTANT"),
    getCustomFieldValues(ctx, "CONSULTANT"),
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, contact: true, email: true, company: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedConsultants = consultants.map((c) => ({
    ...c,
    customFields: customFieldValues[c.id] || {},
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
          <span>Engineering & Specialist Network</span>
          <span>•</span>
          <span>Professional Consultant Directory</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">Consultant Directory</h1>
        <p className="text-xs text-[#696E82] mt-0.5">
          {isPrivileged
            ? "Manage engineering, structural, MEP, landscape, and specialist consultants across studio projects."
            : "Consultant directory: access engineering contacts, disciplines, and assigned project associations."}
        </p>
      </div>

      <ConsultantsClientView
        initialConsultants={serializeForClient(serializedConsultants) as any}
        projects={serializeForClient(projects)}
        clients={serializeForClient(clients)}
        workspaceName={ctx.tenantName}
        workspaceSlug={ctx.tenantSlug}
        userRole={ctx.role}
        initialCustomFields={serializeForClient(customFieldDefinitions) as any}
        initialCustomValues={serializeForClient(customFieldValues) as any}
      />
    </div>
  );
}
