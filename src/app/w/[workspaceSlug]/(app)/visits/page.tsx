import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import VisitsClientView from "./VisitsClientView";

interface VisitsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function VisitsPage({ params }: VisitsPageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  // Safe project selection to avoid unnecessary Decimal and large fields
  const safeProjectSelect = {
    select: {
      id: true,
      code: true,
      name: true,
    },
  };

  // 1. Execute all queries concurrently with Promise.all for maximum performance
  const [activeVisit, scheduledVisits, allVisits, sites, projects, teamMembers] = await Promise.all([
    // Active visit
    prisma.siteVisit.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: "ACTIVE",
      },
      include: {
        site: true,
        project: safeProjectSelect,
        events: {
          orderBy: { serverReceiptTime: "desc" },
        },
      },
    }),
    // Scheduled visits
    prisma.siteVisit.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: "SCHEDULED",
      },
      include: {
        site: true,
        project: safeProjectSelect,
      },
      orderBy: { scheduledTime: "asc" },
    }),
    // Recent visit feed for review
    prisma.siteVisit.findMany({
      where: {
        tenantId: ctx.tenantId,
      },
      include: {
        site: true,
        project: safeProjectSelect,
        employee: {
          include: {
            user: true,
            employee: true,
          },
        },
        events: {
          orderBy: { serverReceiptTime: "asc" },
        },
      },
      orderBy: { scheduledTime: "desc" },
      take: 25,
    }),
    // Available sites
    prisma.site.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: { project: safeProjectSelect },
    }),
    // Available projects for assignment
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, isArchived: false },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    // Active team members for assignment
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: {
        user: { select: { fullName: true, email: true } },
        employee: { select: { employeeId: true, designation: true } },
      },
      orderBy: { role: "asc" },
    }),
  ]);

  return (
    <VisitsClientView
      workspaceSlug={ctx.tenantSlug}
      currentMembershipId={ctx.membershipId}
      userRole={ctx.role}
      contextUserFullName={ctx.userFullName}
      activeVisit={serializeForClient(activeVisit) as any}
      scheduledVisits={serializeForClient(scheduledVisits) as any}
      allVisits={serializeForClient(allVisits) as any}
      availableSites={serializeForClient(sites) as any}
      availableProjects={serializeForClient(projects) as any}
      teamMembers={serializeForClient(teamMembers) as any}
    />
  );
}
