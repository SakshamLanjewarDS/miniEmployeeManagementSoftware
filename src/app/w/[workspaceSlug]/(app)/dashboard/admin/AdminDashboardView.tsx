"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  RefreshCw,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { AdminDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";

interface AdminDashboardViewProps {
  data: AdminDashboardData;
  workspaceSlug: string;
  userRole: string;
  userFullName: string;
  timezone: string;
}

export default function AdminDashboardView({
  data,
  workspaceSlug,
  userRole,
  userFullName,
  timezone,
}: AdminDashboardViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E6F0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#5A81FA] uppercase tracking-wider border border-[#CEDEFF]">
              Daily Coordination Dashboard
            </span>
            <span className="text-xs text-[#696E82]">
              Role: <strong>{userRole}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
            Daily Studio Operations — {userFullName}
          </h1>
          <p className="text-xs text-[#696E82]">
            Monitor tasks due today, unassigned items, pending submissions, and site schedules.
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
            href={`/w/${workspaceSlug}/tasks`}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assign Deliverable</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/visits`}
            className="px-3.5 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Schedule Visit</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/team`}
            className="px-3.5 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Manage Team</span>
          </Link>
        </div>
      </div>

      {/* 2. Daily Coordination Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tasks Due Today */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=TODAY`}
          className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-xs hover:border-[#5A81FA] transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1.5">
            <span className="text-xs font-medium">Tasks Due Today</span>
            <Calendar className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-3xl font-bold text-[#1F1F1F] group-hover:text-[#5A81FA] transition-colors">
            {data.dailySummary.tasksDueToday}
          </div>
          <span className="text-[11px] text-[#696E82]">Timezone: {timezone}</span>
        </Link>

        {/* Overdue Work */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=OVERDUE`}
          className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-xs hover:border-red-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1.5">
            <span className="text-xs font-medium">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-3xl font-bold transition-colors ${data.dailySummary.overdueTasks > 0 ? "text-red-600" : "text-[#1F1F1F]"}`}>
            {data.dailySummary.overdueTasks}
          </div>
          <span className="text-[11px] text-red-600 font-medium">Needs immediate follow-up</span>
        </Link>

        {/* Pending Submissions */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
          className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-xs hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1.5">
            <span className="text-xs font-medium">Pending Submissions</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
            {data.dailySummary.pendingSubmissions}
          </div>
          <span className="text-[11px] text-[#696E82]">Ready for checking</span>
        </Link>

        {/* Scheduled Site Visits Today */}
        <Link
          href={`/w/${workspaceSlug}/visits`}
          className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-xs hover:border-[#5A81FA] transition-all group"
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1.5">
            <span className="text-xs font-medium">Site Schedule (Today)</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700 transition-colors">
            {data.dailySummary.scheduledSiteVisitsToday}
          </div>
          <span className="text-[11px] text-[#696E82]">Active / planned surveys</span>
        </Link>
      </div>

      {/* 3. Review Queue & Assignment Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Queue */}
        <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-[#1F1F1F]">
                Review Queue ({data.reviewQueue.length})
              </h2>
            </div>
            <Link
              href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
              className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
            >
              View Full Queue →
            </Link>
          </div>

          {data.reviewQueue.length === 0 ? (
            <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0] space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-[#1F1F1F]">Review queue is clear</p>
              <p className="text-[11px] text-[#696E82]">No submitted work waiting for review decision.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#FAFBFD] hover:bg-white rounded-xl border border-[#E2E6F0] space-y-2 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                          {item.projectCode}
                        </span>
                        <span className="text-xs font-bold text-[#1F1F1F] truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-[#696E82] mt-0.5">
                        Waiting for review: <strong className="text-amber-700">{item.waitingHours}h</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <TaskPriorityBadge priority={item.priority} size="sm" />
                      <Link
                        href={`/w/${workspaceSlug}/tasks?taskId=${item.taskId}`}
                        className="px-2.5 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[11px] font-semibold rounded-lg transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignment Queue */}
        <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#5A81FA]" />
              <h2 className="text-sm font-bold text-[#1F1F1F]">
                Assignment Queue ({data.assignmentQueue.length})
              </h2>
            </div>
            <Link
              href={`/w/${workspaceSlug}/tasks`}
              className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
            >
              Open Deliverables →
            </Link>
          </div>

          {data.assignmentQueue.length === 0 ? (
            <div className="p-8 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0] space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-[#1F1F1F]">No unassigned deliverables</p>
              <p className="text-[11px] text-[#696E82]">All active deliverables have designated team members.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.assignmentQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#FAFBFD] hover:bg-white rounded-xl border border-[#E2E6F0] space-y-1.5 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                          {item.projectCode}
                        </span>
                        <span className="text-xs font-bold text-[#1F1F1F] truncate">{item.title}</span>
                      </div>
                      {item.blockerReason && (
                        <p className="text-[11px] text-red-600 font-medium mt-0.5">
                          Blocker: {item.blockerReason}
                        </p>
                      )}
                    </div>

                    <TaskPriorityBadge priority={item.priority} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#696E82] pt-1 border-t border-[#E2E6F0]/60">
                    <span>{item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleDateString()}` : "No deadline"}</span>
                    <Link
                      href={`/w/${workspaceSlug}/tasks?taskId=${item.id}`}
                      className="text-[#5A81FA] font-semibold hover:underline"
                    >
                      Assign / Reassign →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Team Work Distribution & Today's Site Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Work Distribution (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#5A81FA]" />
              <span>Team Work Distribution by Person & Deadline</span>
            </h2>
            <Link
              href={`/w/${workspaceSlug}/team`}
              className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
            >
              Team Directory →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E6F0] text-[10px] text-[#696E82] uppercase">
                  <th className="pb-2 font-bold">Team Member</th>
                  <th className="pb-2 font-bold">Designation</th>
                  <th className="pb-2 font-bold text-center">Active Deliverables</th>
                  <th className="pb-2 font-bold text-center">Due Today</th>
                  <th className="pb-2 font-bold text-center">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6F0]/60">
                {data.teamDistribution.map((m) => (
                  <tr key={m.memberId} className="hover:bg-[#FAFBFD] transition-colors">
                    <td className="py-2.5 font-semibold text-[#1F1F1F]">
                      {m.fullName}
                      {m.employeeId && (
                        <span className="text-[10px] text-[#5A81FA] font-mono ml-1.5 bg-[#F2F4FF] px-1 py-0.2 rounded border border-[#CEDEFF]">
                          {m.employeeId}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-[11px] text-[#696E82]">{m.designation || "Staff"}</td>
                    <td className="py-2.5 text-center font-bold text-[#1F1F1F]">{m.totalActive}</td>
                    <td className="py-2.5 text-center font-semibold text-[#5A81FA]">{m.dueToday}</td>
                    <td className={`py-2.5 text-center font-bold ${m.overdue > 0 ? "text-red-600" : "text-[#696E82]"}`}>
                      {m.overdue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Site Schedule (1 Col) */}
        <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Today&apos;s Site Visits</span>
            </h2>
            <Link
              href={`/w/${workspaceSlug}/visits`}
              className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
            >
              All Visits →
            </Link>
          </div>

          {data.todaySiteSchedule.length === 0 ? (
            <p className="text-xs text-[#696E82] p-4 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
              No site visits scheduled for today.
            </p>
          ) : (
            <div className="space-y-2">
              {data.todaySiteSchedule.map((v) => (
                <div key={v.id} className="p-2.5 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#5A81FA]">{v.projectCode} • {v.siteName}</span>
                    <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-[#EBF1FF] text-[#5A81FA]">
                      {v.operationalState}
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-[#1F1F1F] truncate">{v.purpose}</p>
                  <span className="text-[10px] text-[#696E82] block">
                    Assigned: {v.inspectorName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Personal Tasks for Admin */}
          <div className="pt-3 border-t border-[#E2E6F0] space-y-2">
            <h3 className="text-xs font-bold text-[#1F1F1F]">My Personal Deliverables</h3>
            {data.myWork.length === 0 ? (
              <p className="text-[11px] text-[#696E82] italic">No tasks assigned to you personally.</p>
            ) : (
              <div className="space-y-1.5">
                {data.myWork.map((t) => (
                  <div key={t.id} className="p-2 bg-[#FAFBFD] rounded-lg border border-[#E2E6F0] flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1F1F1F] truncate">{t.title}</span>
                    <TaskPriorityBadge priority={t.priority} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
