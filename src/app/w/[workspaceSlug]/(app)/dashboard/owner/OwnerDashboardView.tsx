"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Users,
  MapPin,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Calendar,
  Building,
} from "lucide-react";
import { OwnerDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TypologyDot } from "@/lib/typology";

interface OwnerDashboardViewProps {
  data: OwnerDashboardData;
  workspaceSlug: string;
  userRole: string;
  userFullName: string;
  timezone: string;
}

export default function OwnerDashboardView({
  data,
  workspaceSlug,
  userRole,
  userFullName,
  timezone,
}: OwnerDashboardViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E6F0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#5A81FA] uppercase tracking-wider border border-[#CEDEFF]">
              Studio Leadership Dashboard
            </span>
            <span className="text-xs text-[#696E82]">
              Role: <strong>{userRole}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
            Welcome back, {userFullName}
          </h1>
          <p className="text-xs text-[#696E82]">
            High-level studio operations, delivery bottlenecks, approvals, and financial health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#696E82] rounded-xl border border-[#E2E6F0] transition-colors cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#5A81FA]" : ""}`} />
          </button>

          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="px-3.5 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Create Project</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assign Deliverable</span>
          </Link>
        </div>
      </div>

      {/* 2. Studio Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Projects */}
        <Link
          href={`/w/${workspaceSlug}/projects`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-[#5A81FA] transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-2xl font-bold text-[#1F1F1F] group-hover:text-[#5A81FA] transition-colors">
            {data.studioSummary.activeProjectsCount}
          </div>
          <span className="text-[10px] text-[#696E82]">Under execution</span>
        </Link>

        {/* Overdue Deliverables */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=OVERDUE`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-red-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold transition-colors ${data.studioSummary.overdueDeliverablesCount > 0 ? "text-red-600" : "text-[#1F1F1F]"}`}>
            {data.studioSummary.overdueDeliverablesCount}
          </div>
          <span className="text-[10px] text-red-600 font-medium">Exceeded target deadline</span>
        </Link>

        {/* Pending Reviews */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
            {data.studioSummary.pendingReviewsCount}
          </div>
          <span className="text-[10px] text-[#696E82]">Awaiting signoff</span>
        </Link>

        {/* Total Collections */}
        <Link
          href={`/w/${workspaceSlug}/finance`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Collections</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 truncate">
            {formatCurrency(data.studioSummary.totalCollections)}
          </div>
          <span className="text-[10px] text-[#696E82]">Recorded fee payments</span>
        </Link>

        {/* Approved Expenses */}
        <Link
          href={`/w/${workspaceSlug}/finance`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-[#5A81FA] transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Expenses</span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] truncate">
            {formatCurrency(data.studioSummary.approvedExpenses)}
          </div>
          <span className="text-[10px] text-[#696E82]">Approved site/studio</span>
        </Link>

        {/* Outstanding Fees */}
        <Link
          href={`/w/${workspaceSlug}/finance`}
          className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs hover:border-orange-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Outstanding</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-lg font-bold text-orange-700 truncate">
            {formatCurrency(data.studioSummary.outstandingFees)}
          </div>
          <span className="text-[10px] text-[#696E82]">Uncollected fee bills</span>
        </Link>
      </div>

      {/* 3. Projects Requiring Immediate Attention */}
      <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-[#1F1F1F]">Projects Requiring Attention</h2>
          </div>
          <span className="text-xs text-[#696E82]">
            {data.projectsAttention.length} projects with delayed milestones or blockers
          </span>
        </div>

        {data.projectsAttention.length === 0 ? (
          <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0] space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-[#1F1F1F]">All active projects on schedule</p>
            <p className="text-[11px] text-[#696E82]">No unresolved blockers or delayed deliverables detected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.projectsAttention.map((proj) => (
              <div
                key={proj.id}
                className="p-3.5 bg-[#FAFBFD] hover:bg-white rounded-xl border border-[#E2E6F0] hover:border-[#5A81FA] transition-all space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                        {proj.code}
                      </span>
                      {proj.projectType && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#696E82]">
                          <TypologyDot typology={proj.projectType} />
                          <span className="truncate">{proj.projectType}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-[#1F1F1F] truncate mt-0.5">{proj.name}</h3>
                  </div>

                  <Link
                    href={`/w/${workspaceSlug}/projects/${proj.id}`}
                    className="p-1 text-[#696E82] hover:text-[#5A81FA] hover:bg-[#F2F4FF] rounded transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#E2E6F0]/80">
                  <div>
                    <span className="text-[#696E82] block text-[10px]">Delayed Tasks</span>
                    <span className="font-bold text-red-600">{proj.delayedCount} overdue</span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[10px]">Lead Architect</span>
                    <span className="font-semibold text-[#1F1F1F] truncate block">
                      {proj.leadArchitect || "Unassigned"}
                    </span>
                  </div>
                </div>

                {proj.nextDeadline && (
                  <div className="text-[10px] text-[#696E82] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#5A81FA]" />
                    <span>Next deadline: {new Date(proj.nextDeadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Two-Column Detailed Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Financial & Approval Inbox */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Breakdown */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#5A81FA]" />
                <span>Financial Overview & Cashflow Health</span>
              </h2>
              <Link
                href={`/w/${workspaceSlug}/finance`}
                className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
              >
                View Full Studio Ledger →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">Recorded Collections</span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrency(data.financialOverview.recordedCollections)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">Approved Expenses</span>
                <span className="text-lg font-bold text-[#1F1F1F]">
                  {formatCurrency(data.financialOverview.approvedExpenses)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#696E82] block">Outstanding Milestone Fees</span>
                <span className="text-lg font-bold text-orange-700">
                  {formatCurrency(data.financialOverview.outstandingFees)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[#696E82] italic">
              Note: {data.financialOverview.disclaimer}
            </p>
          </div>

          {/* Approval Inbox */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#5A81FA]" />
                <span>Approval Inbox ({data.approvalInbox.length})</span>
              </h2>
              <Link
                href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
                className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
              >
                Open Review Queue →
              </Link>
            </div>

            {data.approvalInbox.length === 0 ? (
              <p className="text-xs text-[#696E82] p-4 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No pending deliverables or drawing revisions awaiting review.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E6F0]">
                {data.approvalInbox.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1 rounded">
                          {item.projectCode}
                        </span>
                        <span className="font-bold text-[#1F1F1F] truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-[#696E82]">
                        Submitted by <strong>{item.requesterName}</strong> • {new Date(item.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <Link
                      href={item.taskId ? `/w/${workspaceSlug}/tasks?taskId=${item.taskId}` : `/w/${workspaceSlug}/tasks`}
                      className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Workload */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#5A81FA]" />
              <span>Architectural Team Workload & Active Deliverables</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E6F0] text-[10px] text-[#696E82] uppercase">
                    <th className="pb-2 font-bold">Team Member</th>
                    <th className="pb-2 font-bold">Role</th>
                    <th className="pb-2 font-bold text-center">Active Tasks</th>
                    <th className="pb-2 font-bold text-center">Overdue</th>
                    <th className="pb-2 font-bold text-center">Due Today</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]/60">
                  {data.teamWorkload.map((m) => (
                    <tr key={m.memberId} className="hover:bg-[#FAFBFD] transition-colors">
                      <td className="py-2 font-semibold text-[#1F1F1F]">
                        {m.fullName}
                        {m.employeeId && (
                          <span className="text-[10px] text-[#696E82] font-mono ml-1.5">
                            ({m.employeeId})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-[11px] text-[#696E82]">{m.designation || m.role}</td>
                      <td className="py-2 text-center font-bold text-[#1F1F1F]">{m.activeTasksCount}</td>
                      <td className={`py-2 text-center font-bold ${m.overdueTasksCount > 0 ? "text-red-600" : "text-[#696E82]"}`}>
                        {m.overdueTasksCount}
                      </td>
                      <td className="py-2 text-center font-semibold text-[#5A81FA]">{m.upcomingDeadlinesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): My Work, Upcoming Site Visits, Activity */}
        <div className="space-y-6">
          {/* My Personal Deliverables */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
                <span>My Assigned Work</span>
              </h2>
              <span className="text-xs text-[#696E82] font-semibold">{data.myWork.length}</span>
            </div>

            {data.myWork.length === 0 ? (
              <p className="text-xs text-[#696E82] p-3 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No deliverables currently assigned personally to you.
              </p>
            ) : (
              <div className="space-y-2">
                {data.myWork.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 bg-[#FAFBFD] hover:bg-white rounded-xl border border-[#E2E6F0] space-y-1 transition-all"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1 rounded">
                        {task.projectCode}
                      </span>
                      <TaskPriorityBadge priority={task.priority} size="sm" />
                    </div>
                    <p className="font-bold text-xs text-[#1F1F1F] truncate">{task.title}</p>
                    {task.dueDate && (
                      <span className="text-[10px] text-[#696E82] block">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Site Visits */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#5A81FA]" />
                <span>Upcoming Site Visits</span>
              </h2>
              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
              >
                All Sites →
              </Link>
            </div>

            {data.upcomingSiteVisits.length === 0 ? (
              <p className="text-xs text-[#696E82] p-3 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No site visits scheduled for this week.
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcomingSiteVisits.map((v) => (
                  <div key={v.id} className="p-2.5 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#696E82]">
                      <span className="font-bold text-[#5A81FA]">{v.projectCode} • {v.siteName}</span>
                      <span>{new Date(v.scheduledTime).toLocaleDateString()}</span>
                    </div>
                    <p className="font-semibold text-xs text-[#1F1F1F] truncate">{v.purpose}</p>
                    <span className="text-[10px] text-[#696E82] block">
                      Inspector: {v.inspectorName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Studio Activity */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#5A81FA]" />
              <span>Audit Trail & Activity</span>
            </h2>

            <div className="space-y-2 text-xs">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="p-2 bg-[#FAFBFD] rounded-lg border border-[#E2E6F0]/60 space-y-0.5">
                  <p className="text-[11px] text-[#1F1F1F] font-medium leading-snug">
                    {act.safeChangeSummary}
                  </p>
                  <span className="text-[9px] text-[#696E82] block">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
