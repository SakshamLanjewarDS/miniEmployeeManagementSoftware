import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findDrawings } from "@/server/modules/drawings/repository";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import DrawingsClientView from "./DrawingsClientView";

interface DrawingsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ projectId?: string; discipline?: string; search?: string }>;
}

export default async function DrawingsPage({ params, searchParams }: DrawingsPageProps) {
  const { workspaceSlug } = await params;
  const { projectId, discipline, search } = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";

  // Fetch drawings accessible to current user
  const [drawings, projects] = await Promise.all([
    findDrawings(ctx, { projectId, discipline, search }),
    isPrivileged
      ? prisma.project.findMany({
          where: { tenantId: ctx.tenantId, isArchived: false },
          select: { id: true, code: true, name: true },
          orderBy: { code: "asc" },
        })
      : prisma.project.findMany({
          where: {
            tenantId: ctx.tenantId,
            isArchived: false,
            members: { some: { membershipId: ctx.membershipId } },
          },
          select: { id: true, code: true, name: true },
          orderBy: { code: "asc" },
        }),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">
          {isPrivileged ? "Company Drawing & Blueprint Library" : "My Project Drawings & Submissions"}
        </h1>
        <p className="text-xs text-[#696E82] mt-0.5">
          {isPrivileged
            ? `Tenant-wide architectural documentation, revision labeling (R0, R1...), and client approval evidence.`
            : `Architectural deliverables and sheets for assigned projects. Upload revisions and track approvals.`}
        </p>
      </div>

      <DrawingsClientView
        initialDrawings={serializeForClient(drawings) as any}
        projects={serializeForClient(projects)}
        workspaceSlug={ctx.tenantSlug}
        currentMembershipId={ctx.membershipId}
        userRole={ctx.role}
        userFullName={ctx.userFullName}
      />
    </div>
  );
}
