import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import DirectoryClientView from "./DirectoryClientView";

interface DirectoryPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DirectoryPage({ params }: DirectoryPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const [clients, consultants, contractors] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        projects: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.consultant.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.contractor.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
          <span>Studio Network & External Parties</span>
          <span>•</span>
          <span>Contact Directory</span>
        </div>
        <h1 className="type-page-title text-[#1F1F1F] mt-1">Clients & Partner Directory</h1>
        <p className="text-xs text-[#696E82] mt-0.5">
          Centralized studio phonebook: search and filter clients, specialist engineering consultants, and trade contractors with live contact actions.
        </p>
      </div>

      <DirectoryClientView
        initialClients={serializeForClient(clients) as any}
        initialConsultants={serializeForClient(consultants) as any}
        initialContractors={serializeForClient(contractors) as any}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}

