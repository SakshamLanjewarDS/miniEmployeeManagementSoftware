import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findTasks, getTaskDashboardMetrics } from "@/server/modules/tasks/repository";
import { findProjects } from "@/server/modules/projects/repository";
import { prisma } from "@/server/db/prisma";
import TasksClientView from "./TasksClientView";

interface TasksPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ filter?: string; view?: string; scope?: string }>;
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { workspaceSlug } = await params;
  const { filter = "ALL", view = "list", scope } = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  // Non-privileged employees are strictly limited to their own tasks
  const effectiveScope = isPrivileged ? (scope || "all") : "my";
  const myTasksOnly = effectiveScope === "my" || !isPrivileged;

  // Load all dashboard data in a single parallel batch for maximum speed
  const [metrics, rawTasks, projects, members, upcomingVisit] = await Promise.all([
    getTaskDashboardMetrics(ctx, myTasksOnly),
    findTasks(ctx, {
      myTasksOnly,
      filter: filter as any,
    }),
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        phases: {
          select: {
            id: true,
            phaseName: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.tenantMembership.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        employee: {
          select: {
            employeeId: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: {
        user: {
          fullName: "asc",
        },
      },
    }),
    prisma.siteVisit.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: ctx.membershipId,
        operationalState: { in: ["SCHEDULED", "ACTIVE"] },
      },
      include: {
        site: true,
        project: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { scheduledTime: "asc" },
    }),
  ]);

  // Serialize tasks to plain objects (convert Decimal estimatedHours and Dates to JSON-safe values)
  const serializedTasks = rawTasks.map((t) => ({
    ...t,
    estimatedHours: t.estimatedHours !== null && t.estimatedHours !== undefined ? Number(t.estimatedHours) : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    completionDate: t.completionDate ? t.completionDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    project: {
      id: t.project.id,
      code: t.project.code,
      name: t.project.name,
    },
    phase: t.phase ? { id: t.phase.id, phaseName: t.phase.phaseName } : null,
    checklistItems: t.checklistItems.map((ci) => ({
      id: ci.id,
      title: ci.title,
      isCompleted: ci.isCompleted,
    })),
    comments: t.comments.map((c) => ({
      id: c.id,
      content: c.content,
      authorId: c.authorId,
      createdAt: c.createdAt.toISOString(),
    })),
    activityHistory: (t as any).activityHistory?.map((ah: any) => ({
      id: ah.id,
      actorId: ah.actorId,
      action: ah.action,
      oldValue: ah.oldValue,
      newValue: ah.newValue,
      reason: ah.reason,
      createdAt: ah.createdAt.toISOString(),
    })) || [],
  }));

  return (
    <div className="space-y-4">
      {/* Top Banner: Upcoming Visit Quick Action (desktop only to avoid occupying mobile dashboard) */}
      {upcomingVisit && (
        <div className="hidden md:flex bg-[#F2F4FF] border border-[#CEDEFF] rounded-2xl p-4 flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-[#5A81FA] text-white rounded-xl shrink-0 mt-0.5">
              <span className="font-bold text-xs uppercase tracking-wider">VISIT</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
                  {upcomingVisit.operationalState === "ACTIVE" ? "🟢 Currently Active Visit" : "⏰ Upcoming Scheduled Visit"}
                </span>
                <span className="text-xs text-[#696E82]">•</span>
                <span className="text-xs font-semibold text-[#1F1F1F]">{upcomingVisit.project.code}</span>
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F] mt-0.5">
                {upcomingVisit.purpose}
              </h3>
              <p className="text-xs text-[#696E82] mt-0.5">
                Site: {upcomingVisit.site.name} — {upcomingVisit.site.address}
              </p>
            </div>
          </div>

          <a
            href={`/w/${ctx.tenantSlug}/visits`}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-xs transition-all text-center shrink-0"
          >
            {upcomingVisit.operationalState === "ACTIVE" ? "Go to Active Visit (Check Out) →" : "Check In at Site →"}
          </a>
        </div>
      )}

      {/* Interactive Client Component */}
      <TasksClientView
        initialTasks={serializedTasks as any}
        projects={projects as any}
        members={members as any}
        workspaceSlug={ctx.tenantSlug}
        currentUserId={ctx.userId}
        currentMembershipId={ctx.membershipId}
        userRole={ctx.role}
        activeFilter={filter}
        initialView={view}
        currentScope={effectiveScope}
        metrics={metrics}
        contextUserFullName={ctx.userFullName}
        workspaceTimezone={ctx.timezone}
      />
    </div>
  );
}

