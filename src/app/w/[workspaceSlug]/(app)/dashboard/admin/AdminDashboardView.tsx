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
  Sun,
  ChevronRight,
  ArrowUpRight,
  Briefcase,
  ShieldCheck,
  Pencil,
  FileText,
  Inbox,
} from "lucide-react";
import { AdminDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { MorningBriefingModal } from "@/components/dashboard/MorningBriefingModal";

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
  const [activeTab, setActiveTab] = useState<"OPERATIONS" | "REVIEWS" | "ASSIGNMENTS" | "TEAM">("OPERATIONS");

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const todayDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  const userInitials = userFullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pendingOperationalActions =
    data.dailySummary.overdueTasks +
    data.dailySummary.pendingSubmissions +
    data.assignmentQueue.length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <MorningBriefingModal workspaceSlug={workspaceSlug} role={userRole} />

      {/* ============================================================== */}
      {/* 1. TOP GREETING PANEL (Image A)                                 */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {todayDateString}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Good Morning, {userFullName.split(" ")[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daily Studio Operations Coordinator. You have{" "}
            <span className="font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {pendingOperationalActions} pending action{pendingOperationalActions !== 1 ? "s" : ""}
            </span>{" "}
            requiring administrative coordination.
          </p>
        </div>

        {/* Top Right: Sun / Status & Refresh Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shadow-xs">
            <Sun className="w-6 h-6 animate-spin-slow" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-2xl border border-slate-200/80 transition-colors cursor-pointer"
            title="Refresh operational metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SECTION NAVIGATION PILLS ROW (Image A)                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { key: "OPERATIONS", label: "Studio Operations" },
          { key: "REVIEWS", label: `Review Queue (${data.reviewQueue.length})` },
          { key: "ASSIGNMENTS", label: `Assignment Queue (${data.assignmentQueue.length})` },
          { key: "TEAM", label: `Team Workload (${data.teamDistribution.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[#3562E8] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 3. FOUR KPI CARDS (Image A)                                     */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tasks Due Today */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=TODAY`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#3562E8] transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Tasks Due Today</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-[#3562E8] transition-colors">
            {data.dailySummary.tasksDueToday}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Scheduled for delivery today</span>
        </Link>

        {/* KPI 2: Overdue Tasks */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=OVERDUE`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Overdue Tasks</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold transition-colors ${
              data.dailySummary.overdueTasks > 0 ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {data.dailySummary.overdueTasks}
          </div>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block">Requires prompt follow-up</span>
        </Link>

        {/* KPI 3: Pending Submissions */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Pending Submissions</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
            {data.dailySummary.pendingSubmissions}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Ready for review decision</span>
        </Link>

        {/* KPI 4: Scheduled Site Visits */}
        <Link
          href={`/w/${workspaceSlug}/visits`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Site Schedule (Today)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 transition-colors">
            {data.dailySummary.scheduledSiteVisitsToday}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Active & planned surveys</span>
        </Link>
      </div>

      {/* ============================================================== */}
      {/* 4. PRIMARY HERO CARD (Image A)                                  */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3562E8] animate-pulse" />
            <span className="text-[11px] font-bold text-[#3562E8] uppercase tracking-wider font-mono">
              STUDIO OPERATIONAL CADENCE & DAILY DISPATCH
            </span>
          </div>

          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="text-xs font-bold text-[#3562E8] hover:underline flex items-center gap-1"
          >
            <span>Open Tasks Dispatcher</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {data.dailySummary.tasksDueToday} Deliverables Due Today • {data.assignmentQueue.length} Unassigned Items
            </h2>
            <p className="text-xs text-slate-500">
              Coordinating operational progress across studio teams and on-site architectural inspectors.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/w/${workspaceSlug}/visits`}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Schedule Visit</span>
            </Link>

            <Link
              href={`/w/${workspaceSlug}/tasks`}
              className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Assign Deliverable</span>
            </Link>
          </div>
        </div>

        {/* Operational Completion Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Daily Tasks Clearance Rate</span>
            <span className="font-bold text-slate-800">
              {data.dailySummary.tasksDueToday > 0
                ? Math.round(
                    ((data.dailySummary.tasksDueToday - data.dailySummary.overdueTasks) /
                      data.dailySummary.tasksDueToday) *
                      100
                  )
                : 100}
              % on time
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#3562E8] h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  data.dailySummary.tasksDueToday > 0
                    ? Math.max(
                        20,
                        Math.round(
                          ((data.dailySummary.tasksDueToday - data.dailySummary.overdueTasks) /
                            data.dailySummary.tasksDueToday) *
                            100
                        )
                      )
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. BALANCED TWO-COLUMN GRID (Image A: 70% Left / 30% Right)     */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN COLUMN (~70%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Queue Card Section */}
          {(activeTab === "OPERATIONS" || activeTab === "REVIEWS") && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Review Queue ({data.reviewQueue.length})
                  </h3>
                </div>
                <Link
                  href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
                  className="text-xs font-bold text-[#3562E8] hover:underline"
                >
                  View Full Queue →
                </Link>
              </div>

              {data.reviewQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-900">Review queue is clear</p>
                  <p className="text-[11px] text-slate-400">No submitted work waiting for review decision.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.reviewQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-[#3562E8] transition-all space-y-3 shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {item.projectCode}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 truncate mt-1 group-hover:text-[#3562E8] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Waiting: <strong className="text-amber-700 font-semibold">{item.waitingHours}h</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <TaskPriorityBadge priority={item.priority} size="sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">Submissions audit</span>
                        <Link
                          href={`/w/${workspaceSlug}/tasks?taskId=${item.taskId}`}
                          className="px-3 py-1 bg-[#3562E8] hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Review Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignment Queue Section */}
          {(activeTab === "OPERATIONS" || activeTab === "ASSIGNMENTS") && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#3562E8]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Assignment Queue ({data.assignmentQueue.length})
                  </h3>
                </div>
                <Link
                  href={`/w/${workspaceSlug}/tasks`}
                  className="text-xs font-bold text-[#3562E8] hover:underline"
                >
                  Open Deliverables →
                </Link>
              </div>

              {data.assignmentQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-900">No unassigned deliverables</p>
                  <p className="text-[11px] text-slate-400">
                    All active deliverables have designated team members.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.assignmentQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-[#3562E8] transition-all space-y-2.5 shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {item.projectCode}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 truncate mt-1">
                            {item.title}
                          </h4>
                          {item.blockerReason && (
                            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                              Blocker: {item.blockerReason}
                            </p>
                          )}
                        </div>

                        <TaskPriorityBadge priority={item.priority} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>
                          {item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleDateString()}` : "No deadline"}
                        </span>
                        <Link
                          href={`/w/${workspaceSlug}/tasks?taskId=${item.id}`}
                          className="text-[#3562E8] font-bold hover:underline"
                        >
                          Assign →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Work Distribution Table */}
          {(activeTab === "OPERATIONS" || activeTab === "TEAM") && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3562E8]" />
                  <h3 className="text-sm font-bold text-slate-900">Team Work Distribution & Deadlines</h3>
                </div>
                <Link
                  href={`/w/${workspaceSlug}/team`}
                  className="text-xs font-bold text-[#3562E8] hover:underline"
                >
                  Manage Team Directory →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      <th className="pb-3 font-bold">Team Member</th>
                      <th className="pb-3 font-bold">Designation</th>
                      <th className="pb-3 font-bold text-center">Active Deliverables</th>
                      <th className="pb-3 font-bold text-center">Due Today</th>
                      <th className="pb-3 font-bold text-center">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.teamDistribution.map((m) => (
                      <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-semibold text-slate-900">
                          {m.fullName}
                          {m.employeeId && (
                            <span className="text-[10px] text-[#3562E8] font-mono ml-2 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {m.employeeId}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-[11px] text-slate-500">{m.designation || "Architect"}</td>
                        <td className="py-3 text-center font-bold text-slate-900">{m.totalActive}</td>
                        <td className="py-3 text-center font-semibold text-[#3562E8]">{m.dueToday}</td>
                        <td
                          className={`py-3 text-center font-bold ${
                            m.overdue > 0 ? "text-rose-600" : "text-slate-400"
                          }`}
                        >
                          {m.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (~30%, ~300px) (Image A Treatment) */}
        <div className="space-y-6">
          {/* User Profile Widget (Image A Top Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-center space-y-3 relative group">
            <Link
              href={`/w/${workspaceSlug}/profile`}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-[#3562E8] rounded-xl hover:bg-slate-100 transition-colors"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </Link>

            {/* Circular Portrait with Ring Indicator */}
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#CEDEFF] to-[#F2F4FF] text-[#2C308D] font-bold text-xl flex items-center justify-center ring-4 ring-slate-100 shadow-xs">
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">{userFullName}</h3>
              <p className="text-xs text-slate-500 font-medium">Studio Operations Manager</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  ID: ADMIN-01
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  DEPT: Operations
                </span>
              </div>
            </div>
          </div>

          {/* Today's Site Visits Timeline (Image A Middle Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Today&apos;s Site Visits</span>
              </h3>
              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="text-[11px] font-bold text-[#3562E8] hover:underline"
              >
                All Visits →
              </Link>
            </div>

            {data.todaySiteSchedule.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                No site visits scheduled for today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.todaySiteSchedule.map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#3562E8]">{v.projectCode} • {v.siteName}</span>
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-blue-50 text-[#3562E8] border border-blue-100">
                        {v.operationalState}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 truncate">{v.purpose}</p>
                    <span className="text-[10px] text-slate-500 block">
                      Inspector: {v.inspectorName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Administrative Pending Actions (Image A Lower Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Pending Operational Actions</span>
            </h3>

            <div className="space-y-2 text-xs">
              <Link
                href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
                className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between group hover:bg-amber-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-amber-900 text-xs">Deliverable Reviews</div>
                  <div className="text-[10px] text-amber-600">{data.dailySummary.pendingSubmissions} items waiting check</div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  HIGH
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/tasks?filter=OVERDUE`}
                className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between group hover:bg-rose-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-rose-900 text-xs">Delayed Tasks Follow-up</div>
                  <div className="text-[10px] text-rose-600">{data.dailySummary.overdueTasks} tasks overdue</div>
                </div>
                <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                  MED
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/team`}
                className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-blue-900 text-xs">Team Capacity Check</div>
                  <div className="text-[10px] text-blue-600">{data.teamDistribution.length} members tracked</div>
                </div>
                <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  LOW
                </span>
              </Link>
            </div>
          </div>

          {/* Quick Actions 2x2 Grid (Image A Bottom Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                href={`/w/${workspaceSlug}/tasks`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <CheckSquare className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">Assign Task</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <MapPin className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-emerald-600">Site Schedule</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/team`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <Users className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">Team Directory</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/tasks?filter=WAITING_REVIEW`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <Clock className="w-5 h-5 text-slate-500 group-hover:text-amber-600 transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-amber-600">Review Queue</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
