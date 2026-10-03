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
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
          <span>Studio Partner Directory</span>
          <span>•</span>
          <span>External Contractors & Specialist Trades</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">Contractor Directory</h1>
        <p className="text-xs text-[#696E82] mt-0.5">
          {isPrivileged
            ? "Manage general contractors, trade specialists, project assignments, and quotation records."
            : "Studio trade directory: view approved contractors, contact points, and your assigned project links."}
        </p>
      </div>

      <ContractorsClientView
        initialContractors={serializeForClient(contractors) as any}
        projects={serializeForClient(projects)}
        workspaceSlug={ctx.tenantSlug}
        userRole={ctx.role}
        hasFinanceAccess={ctx.hasFinanceAccess || isPrivileged}
      />
    </div>
  );
}
