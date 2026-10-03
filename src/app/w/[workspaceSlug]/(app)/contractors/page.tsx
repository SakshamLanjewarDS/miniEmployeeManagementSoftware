import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findContractors } from "@/server/modules/contractors/repository";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import ContractorsClientView from "./ContractorsClientView";

interface ContractorsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string; trade?: string }>;
}

export default async function ContractorsPage({ params, searchParams }: ContractorsPageProps) {
  const { workspaceSlug } = await params;
  const { search, status, trade } = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";

  const [contractors, projects] = await Promise.all([
    findContractors(ctx, {
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
    <ContractorsClientView
      initialContractors={serializeForClient(contractors) as any}
      projects={serializeForClient(projects)}
      workspaceSlug={ctx.tenantSlug}
      userRole={ctx.role}
      userFullName={ctx.userFullName}
      hasFinanceAccess={ctx.hasFinanceAccess || isPrivileged}
    />
  );
}
