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
  const [
    activeVisit,
    scheduledVisits,
    allVisits,
    sites,
    projects,
    teamMembers,
    availableTasks,
    availableMilestones,
    contractors,
    consultants,
  ] = await Promise.all([
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
        task: { select: { id: true, title: true, priority: true } },
        milestone: { select: { id: true, title: true } },
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
      take: 40,
    }),
    // Available sites
    prisma.site.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: { project: safeProjectSelect },
    }),
    // Available projects for assignment
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, isArchived: false },
      select: { id: true, code: true, name: true, projectType: true },
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
    // Active tasks/deliverables
    prisma.task.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        priority: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Active milestones
    prisma.projectMilestone.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "PENDING",
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        targetDate: true,
      },
      orderBy: { targetDate: "asc" },
    }),
    // Active contractors
    prisma.contractor.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        firmName: true,
        trade: true,
        contact: true,
      },
      orderBy: { name: "asc" },
    }),
    // Active consultants
    prisma.consultant.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        firmName: true,
        discipline: true,
        contact: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <VisitsClientView
      workspaceSlug={ctx.tenantSlug}
      currentMembershipId={ctx.membershipId}
      userRole={ctx.role}
      activeVisit={serializeForClient(activeVisit) as any}
      scheduledVisits={serializeForClient(scheduledVisits) as any}
      allVisits={serializeForClient(allVisits) as any}
      availableSites={serializeForClient(sites) as any}
      availableProjects={serializeForClient(projects) as any}
      teamMembers={serializeForClient(teamMembers) as any}
      availableTasks={serializeForClient(availableTasks) as any}
      availableMilestones={serializeForClient(availableMilestones) as any}
      contractors={serializeForClient(contractors.map((c) => ({ ...c, phone: c.contact }))) as any}
      consultants={serializeForClient(consultants.map((c) => ({ ...c, phone: c.contact }))) as any}
    />
  );
}
