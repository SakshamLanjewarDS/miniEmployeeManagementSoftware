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
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
            <span>Field Evidence & Inspections</span>
            <span>•</span>
            <span>Site Geolocation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">
            Site Visits & Geolocation Check-In
          </h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Real-time GPS location tracking & geofenced check-in/out. Movement trail stored for Owner and Admin review.
          </p>
        </div>

        <a
          href={`/api/visits/export?workspaceSlug=${ctx.tenantSlug}`}
          className="px-3.5 py-2 bg-white hover:bg-[#F2F4FF] border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>Export CSV (Audit Protected)</span>
        </a>
      </div>

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
    </div>
  );
}
