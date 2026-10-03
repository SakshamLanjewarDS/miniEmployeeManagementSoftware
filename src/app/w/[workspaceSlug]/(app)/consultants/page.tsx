import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findConsultants } from "@/server/modules/consultants/repository";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
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

  const [consultants, projects] = await Promise.all([
    findConsultants(ctx, {
      search,
      isActive: status === "archived" ? false : status === "active" ? true : undefined,
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, isArchived: false },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <ConsultantsClientView
      initialConsultants={serializeForClient(consultants) as any}
      projects={serializeForClient(projects)}
      workspaceSlug={ctx.tenantSlug}
      userRole={ctx.role}
      userFullName={ctx.fullName}
    />
  );
}
