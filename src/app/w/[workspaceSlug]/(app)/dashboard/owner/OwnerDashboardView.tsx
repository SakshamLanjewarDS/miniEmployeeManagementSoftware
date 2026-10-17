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
  Sun,
  Inbox,
  ExternalLink,
  ChevronRight,
  Briefcase,
  X,
} from "lucide-react";
import { OwnerDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TypologyDot } from "@/lib/typology";
import { MorningBriefingModal } from "@/components/dashboard/MorningBriefingModal";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";
import { StudioHealthIndexCard } from "@/components/dashboard/StudioHealthIndexCard";
import { VisualDrawingAirlock } from "@/components/drawings/VisualDrawingAirlock";

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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ATTENTION" | "FINANCE" | "TEAM">("OVERVIEW");

  // Realtime Studio SSE Bus
  const { isConnected, lastEvent, forceRefresh } = useStudioRealtime({
    workspaceSlug,
    autoRefresh: true,
  });

  // Visual Drawing Airlock State
  const [reviewingItem, setReviewingItem] = useState<{
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    requesterName: string;
    type: string;
    taskId?: string;
  } | null>(null);
  const [isSubmittingAirlock, setIsSubmittingAirlock] = useState(false);
  const [airlockToast, setAirlockToast] = useState<string | null>(null);

  const handleAirlockDecision = async (
    action: "APPROVE" | "REQUEST_CHANGES" | "REJECT",
    notes?: string
  ) => {
    if (!reviewingItem) return;
    setIsSubmittingAirlock(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          type: reviewingItem.type === "DRAWING" ? "DRAWING_REVISION" : "DELIVERABLE_SUBMISSION",
          id: reviewingItem.id,
          action: action === "APPROVE" ? "APPROVE" : action === "REQUEST_CHANGES" ? "REQUEST_CHANGES" : "REJECT",
          feedback: notes || (action === "APPROVE" ? "Approved & stamped in Visual Airlock" : "Corrections needed"),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to process decision in airlock");
      }

      setAirlockToast(
        action === "APPROVE"
          ? `✓ Approved & stamped "${reviewingItem.title}" for GFC release`
          : `Changes requested on "${reviewingItem.title}"`
      );
      setReviewingItem(null);
      forceRefresh();
      setTimeout(() => setAirlockToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to process review");
    } finally {
      setIsSubmittingAirlock(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    forceRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
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

  const pendingDecisionsCount = data.studioSummary.pendingReviewsCount + data.approvalInbox.length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <MorningBriefingModal workspaceSlug={workspaceSlug} role={userRole} />

      {/* ============================================================== */}
      {/* 1. TOP GREETING PANEL (Image A)                                 */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {todayDateString}
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Good Morning, {userFullName.split(" ")[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Here is a summary of your workspace for today. You have{" "}
            <span className="font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {pendingDecisionsCount} pending action{pendingDecisionsCount !== 1 ? "s" : ""}
            </span>{" "}
            requiring your attention.
          </p>
        </div>

        {/* Top Right: Live Sync, Sun / Status & Refresh Action */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <LiveSyncIndicator
            isConnected={isConnected}
            lastEvent={lastEvent}
            onManualRefresh={handleRefresh}
          />

          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shadow-xs">
            <Sun className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-2xl border border-slate-200/80 transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. STUDIO HEALTH INDEX (SHI) TELEMETRY RADAR                    */}
      {/* ============================================================== */}
      {data.studioHealthIndex && (
        <StudioHealthIndexCard shi={data.studioHealthIndex} />
      )}

      {/* ============================================================== */}
      {/* 2. SECTION NAVIGATION PILLS ROW (Image A)                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll-x no-scrollbar text-xs">
        {[
          { key: "OVERVIEW", label: "Studio Overview" },
          { key: "ATTENTION", label: `Attention (${data.projectsAttention.length})` },
          { key: "FINANCE", label: "Financial Ledger" },
          { key: "TEAM", label: `Architectural Team (${data.teamWorkload.length})` },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Active Projects */}
        <Link
          href={`/w/${workspaceSlug}/projects`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#3562E8] transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Active Projects</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-[#3562E8] transition-colors">
            {data.studioSummary.activeProjectsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Live commissions</span>
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
          <div className={`text-2xl sm:text-3xl font-bold transition-colors ${
            data.studioSummary.overdueDeliverablesCount > 0 ? "text-rose-600" : "text-slate-900"
          }`}>
            {data.studioSummary.overdueDeliverablesCount}
          </div>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block">Exceeded target deadline</span>
        </Link>

        {/* KPI 3: Pending Reviews */}
        <Link
          href={`/w/${workspaceSlug}/inbox`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Pending Reviews</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
            {data.studioSummary.pendingReviewsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting leadership sign-off</span>
        </Link>

        {/* KPI 4: Collections */}
        <Link
          href={`/w/${workspaceSlug}/finance`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Recorded Collections</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 truncate mt-0.5">
            {formatCurrency(data.studioSummary.totalCollections)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Incurred studio revenue</span>
        </Link>
      </div>

      {/* ============================================================== */}
      {/* 4. PRIMARY HERO CARD (Image A)                                  */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3562E8] animate-pulse" />
            <span className="text-[11px] font-bold text-[#3562E8] uppercase tracking-wider font-mono">
              EXECUTIVE FOCUS & STUDIO BOTTLENECKS
            </span>
          </div>

          <Link
            href={`/w/${workspaceSlug}/inbox`}
            className="text-xs font-bold text-[#3562E8] hover:underline flex items-center gap-1"
          >
            <span>Open Unified Decision Inbox</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {data.projectsAttention.length > 0
                ? `${data.projectsAttention.length} Projects Require Architectural Attention`
                : "All Studio Projects Operating on Delivery Target"}
            </h2>
            <p className="text-xs text-slate-500">
              {data.approvalInbox.length} deliverable submissions & revisions currently in review queue.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full md:w-auto">
            <Link
              href={`/w/${workspaceSlug}/tasks`}
              className="flex-1 sm:flex-initial text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Assign Deliverable
            </Link>
            <Link
              href={`/w/${workspaceSlug}/inbox`}
              className="flex-1 sm:flex-initial text-center justify-center px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Review Inbox ({data.approvalInbox.length})</span>
            </Link>
          </div>
        </div>

        {/* Delivery Health Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Overall Studio Delivery Velocity</span>
            <span className="font-bold text-slate-800">
              {data.studioSummary.activeProjectsCount > 0
                ? Math.round(((data.studioSummary.activeProjectsCount - data.studioSummary.overdueDeliverablesCount) / data.studioSummary.activeProjectsCount) * 100)
                : 100}% on schedule
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#3562E8] h-full rounded-full transition-all duration-500"
              style={{
                width: `${data.studioSummary.activeProjectsCount > 0
                  ? Math.max(20, Math.round(((data.studioSummary.activeProjectsCount - data.studioSummary.overdueDeliverablesCount) / data.studioSummary.activeProjectsCount) * 100))
                  : 100}%`
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
          {/* Projects Requiring Attention Cards Grid */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Projects Requiring Attention</h3>
              </div>
              <span className="text-xs text-slate-400">
                {data.projectsAttention.length} projects flagged
              </span>
            </div>

            {data.projectsAttention.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-900">All active projects on schedule</p>
                <p className="text-[11px] text-slate-400">No unresolved blockers or delayed deliverables detected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.projectsAttention.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-[#3562E8] transition-all space-y-3 shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {proj.code}
                          </span>
                          {proj.projectType && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <TypologyDot typology={proj.projectType} />
                              <span className="truncate">{proj.projectType}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 truncate mt-1 group-hover:text-[#3562E8] transition-colors">
                          {proj.name}
                        </h4>
                      </div>

                      <Link
                        href={`/w/${workspaceSlug}/projects/${proj.id}`}
                        className="p-1.5 text-slate-400 hover:text-[#3562E8] hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Delayed Tasks</span>
                        <span className="font-bold text-rose-600">{proj.delayedCount} overdue</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lead Architect</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {proj.leadArchitect || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approval Submissions (Image A Lower Section) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3562E8]" />
                <span>Pending Approvals & Deliverables ({data.approvalInbox.length})</span>
              </h3>
              <Link
                href={`/w/${workspaceSlug}/inbox`}
                className="text-xs font-bold text-[#3562E8] hover:underline"
              >
                Open Unified Inbox →
              </Link>
            </div>

            {data.approvalInbox.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                No deliverables or drawing revisions awaiting sign-off.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.approvalInbox.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-[#3562E8] bg-blue-50 px-1.5 py-0.5 rounded">
                          {item.projectCode}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Submitted by <strong className="text-slate-700">{item.requesterName}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewingItem(item)}
                      className="px-3.5 py-1.5 bg-[#3562E8] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review in Airlock</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Architectural Team Workload Table (Image A Bottom Table) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#3562E8]" />
                <span>Studio Team Workload</span>
              </h3>
              <Link
                href={`/w/${workspaceSlug}/team`}
                className="text-xs font-bold text-[#3562E8] hover:underline"
              >
                Manage Team →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold">
                    <th className="pb-2.5">Architect</th>
                    <th className="pb-2.5">Designation</th>
                    <th className="pb-2.5 text-center">Active Tasks</th>
                    <th className="pb-2.5 text-center">Overdue</th>
                    <th className="pb-2.5 text-center">Due Today</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.teamWorkload.map((m) => (
                    <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">
                        {m.fullName}
                        {m.employeeId && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5 font-normal">
                            ({m.employeeId})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-500">{m.designation || m.role}</td>
                      <td className="py-2.5 text-center font-bold text-slate-800">{m.activeTasksCount}</td>
                      <td className={`py-2.5 text-center font-bold ${m.overdueTasksCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {m.overdueTasksCount}
                      </td>
                      <td className="py-2.5 text-center font-bold text-[#3562E8]">{m.upcomingDeadlinesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
              <p className="text-xs text-slate-500 font-medium">Principal Architect & Owner</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  ID: OWNER-01
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  DEPT: Executive
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming Events / Site Visits Timeline (Image A Middle Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Site Visits</h3>
              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="text-[11px] font-bold text-[#3562E8] hover:underline"
              >
                All Sites →
              </Link>
            </div>

            {data.upcomingSiteVisits.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                No site visits scheduled for this week.
              </p>
            ) : (
              <div className="space-y-3">
                {data.upcomingSiteVisits.slice(0, 3).map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="font-bold text-[#3562E8]">{v.projectCode} • {v.siteName}</span>
                      <span>{new Date(v.scheduledTime).toLocaleDateString()}</span>
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

          {/* Executive Pending Actions (Image A Lower Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Pending Actions</span>
            </h3>

            <div className="space-y-2 text-xs">
              <Link
                href={`/w/${workspaceSlug}/inbox`}
                className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between group hover:bg-rose-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-rose-900 text-xs">Review Task Submissions</div>
                  <div className="text-[10px] text-rose-600">{data.approvalInbox.length} deliverables pending</div>
                </div>
                <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                  HIGH
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/capacity`}
                className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between group hover:bg-amber-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-amber-900 text-xs">Verify Studio Capacity</div>
                  <div className="text-[10px] text-amber-600">Check team workload matrix</div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  MED
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/finance`}
                className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-blue-900 text-xs">Audit Incurred Expenses</div>
                  <div className="text-[10px] text-blue-600">Review project contractor costs</div>
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
                href={`/w/${workspaceSlug}/projects`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <FolderKanban className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">New Project</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/inbox`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <Inbox className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">Decision Inbox</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/finance`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <Receipt className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">View Ledger</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {airlockToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{airlockToast}</span>
        </div>
      )}

      {/* VISUAL DRAWING AIRLOCK MODAL DRAWER */}
      {reviewingItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => !isSubmittingAirlock && setReviewingItem(null)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setReviewingItem(null)}
              disabled={isSubmittingAirlock}
              className="absolute top-4 right-4 z-40 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Visual Drawing Airlock Component */}
            <VisualDrawingAirlock
              data={{
                drawingCode: reviewingItem.projectCode ? `${reviewingItem.projectCode}-GFC-302` : "100D-ARC-GFC-302",
                drawingTitle: reviewingItem.title,
                projectCode: reviewingItem.projectCode,
                projectName: reviewingItem.projectName,
                discipline: reviewingItem.type === "DRAWING" ? "ARCHITECTURAL" : "INTERIOR_DETAIL",
                revisionB: {
                  code: "Rev 03",
                  label: "Submitted for Executive Sign-Off",
                  date: "Today",
                  author: reviewingItem.requesterName,
                  status: "PENDING_APPROVAL",
                  changeSummary: `Submitted by ${reviewingItem.requesterName} for architectural review: "${reviewingItem.title}". Verify dimension clearances and coordinate with MEP risers before issuing GFC seal.`,
                },
              }}
              onApprove={(notes) => handleAirlockDecision("APPROVE", notes)}
              onRequestChanges={(notes) => handleAirlockDecision("REQUEST_CHANGES", notes)}
              onReject={(notes) => handleAirlockDecision("REJECT", notes)}
              isSubmitting={isSubmittingAirlock}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Temporary pencil icon import helper
function Pencil(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}
