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
  Activity,
} from "lucide-react";
import { OwnerDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TypologyDot } from "@/lib/typology";
import { MorningBriefingModal } from "@/components/dashboard/MorningBriefingModal";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";
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
  const [reviewTab, setReviewTab] = useState<"ALL" | "LEAVE" | "TASK" | "SITE_VISIT" | "MEETING">("ALL");

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
  });

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
      {/* 1. TOP GREETING & PRIMARY ACTION                               */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="type-metadata text-slate-500 mb-1">
            {todayDateString}
          </div>
          <h1 className="type-page-title text-slate-900">
            Good morning, {userFullName.split(" ")[0]}
          </h1>
          <p className="type-body-compact text-slate-500 mt-1">
            Your studio at a glance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LiveSyncIndicator
            isConnected={isConnected}
            lastEvent={lastEvent}
            onManualRefresh={handleRefresh}
          />
          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white type-button-label rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Assign deliverable</span>
          </Link>
        </div>
      </div>

      {/* Attention Action Banner */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 type-body-compact">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-blue-950 mr-2">
              {pendingDecisionsCount} {pendingDecisionsCount === 1 ? "action needs" : "actions need"} your attention
            </span>
            <span className="text-blue-700 hidden sm:inline">
              Keep project delivery moving forward.
            </span>
          </div>
        </div>
        <Link
          href={`/w/${workspaceSlug}/inbox`}
          className="type-button-label text-[#2563EB] hover:text-blue-800 flex items-center gap-1 shrink-0 whitespace-nowrap"
        >
          <span>Open decision inbox</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ============================================================== */}
      {/* 2. FOUR KPI CARDS                                              */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Active Projects */}
        <Link
          href={`/w/${workspaceSlug}/projects`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#2563EB] transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="type-kpi-label text-slate-500">Active projects</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="type-kpi-value text-slate-900 group-hover:text-[#2563EB] transition-colors">
            {data.studioSummary.activeProjectsCount}
          </div>
          <span className="type-helper text-slate-500 mt-1 block">Live commissions</span>
        </Link>

        {/* KPI 2: Pending Reviews */}
        <Link
          href={`/w/${workspaceSlug}/inbox`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-amber-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="type-kpi-label text-slate-500">Pending reviews</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="type-kpi-value text-slate-900 group-hover:text-amber-600 transition-colors">
            {data.studioSummary.pendingReviewsCount}
          </div>
          <span className="type-helper text-slate-500 mt-1 block">Awaiting leadership sign-off</span>
        </Link>

        {/* KPI 3: Overdue Tasks */}
        <Link
          href={`/w/${workspaceSlug}/tasks?filter=OVERDUE`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="type-kpi-label text-slate-500">Overdue tasks</span>
            <span className={`w-2 h-2 rounded-full ${data.studioSummary.overdueDeliverablesCount > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
          </div>
          <div className={`type-kpi-value transition-colors ${
            data.studioSummary.overdueDeliverablesCount > 0 ? "text-rose-600" : "text-slate-900"
          }`}>
            {data.studioSummary.overdueDeliverablesCount}
          </div>
          <span className="type-helper text-slate-500 mt-1 block">
            {data.studioSummary.overdueDeliverablesCount === 0 ? "Everything on track" : "Requires attention"}
          </span>
        </Link>

        {/* KPI 4: Recorded Collections */}
        <Link
          href={`/w/${workspaceSlug}/finance`}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="type-kpi-label text-slate-500">Recorded collections</span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <div className="type-kpi-value text-slate-900 truncate mt-0.5">
            {formatCurrency(data.studioSummary.totalCollections)}
          </div>
          <span className="type-helper text-slate-500 mt-1 block">
            {data.studioSummary.totalCollections === 0 ? "No collections recorded" : "Incurred revenue"}
          </span>
        </Link>
      </div>

      {/* Mobile-only Assign Deliverable Button */}
      <div className="sm:hidden">
        <Link
          href={`/w/${workspaceSlug}/tasks`}
          className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white type-button-label rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Assign deliverable</span>
        </Link>
      </div>

      {/* ============================================================== */}
      {/* 3. BALANCED TWO-COLUMN GRID                                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN COLUMN (~65%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card A: Ready for your review (Leaves, Tasks, Site Visits, Meetings) */}
          {(() => {
            const leaves = data.readyForReview?.leaves || [];
            const tasks = data.readyForReview?.tasks || data.approvalInbox.map((item) => ({
              id: item.id,
              title: item.title,
              projectCode: item.projectCode,
              projectName: item.projectName,
              requesterName: item.requesterName,
              submittedAt: item.submittedAt,
              priority: "MEDIUM",
              taskId: item.taskId || item.id,
              status: item.status,
            }));
            const siteVisits = data.readyForReview?.siteVisits || [];
            const meetings = data.readyForReview?.meetings || [];
            const totalCount = leaves.length + tasks.length + siteVisits.length + meetings.length;

            return (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="type-card-title text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                      <span>Ready for your review ({totalCount})</span>
                    </h2>
                    <p className="type-helper text-slate-500 mt-0.5">Keep project delivery moving forward.</p>
                  </div>
                  <Link
                    href={`/w/${workspaceSlug}/inbox`}
                    className="type-button-label text-[#2563EB] hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>Open decision inbox</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Sub-Tabs: All, Leave, Task, Site Visit, Meetings */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto touch-scroll-x">
                  <button
                    type="button"
                    onClick={() => setReviewTab("ALL")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                      reviewTab === "ALL"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab("LEAVE")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      reviewTab === "LEAVE"
                        ? "bg-white text-teal-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Leave ({leaves.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab("TASK")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      reviewTab === "TASK"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Task ({tasks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab("SITE_VISIT")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      reviewTab === "SITE_VISIT"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Site Visit ({siteVisits.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab("MEETING")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      reviewTab === "MEETING"
                        ? "bg-white text-purple-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Meetings ({meetings.length})</span>
                  </button>
                </div>

                {/* Content based on selected tab */}
                {reviewTab === "ALL" && (
                  totalCount === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                      <p className="type-minor-heading text-slate-800">Review queue is clear</p>
                      <p className="type-helper text-slate-500">All submissions have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {leaves.slice(0, 2).map((l) => (
                        <div key={`leave-${l.id}`} className="p-3.5 rounded-2xl border border-teal-100 bg-teal-50/30 flex items-center justify-between gap-3 type-body-compact">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="type-minor-heading text-slate-900 truncate">
                                {l.requesterName} • <span className="text-teal-700 font-semibold">{l.leaveType}</span> ({l.daysCount}d)
                              </div>
                              <div className="type-metadata text-slate-500 truncate mt-0.5">
                                {l.startDate} to {l.endDate} • {l.reason}
                              </div>
                            </div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/inbox?tab=all-authorized&type=LEAVE`} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white type-button-label rounded-xl shadow-2xs transition-all shrink-0">
                            Review
                          </Link>
                        </div>
                      ))}

                      {tasks.slice(0, 2).map((t) => (
                        <div key={`task-${t.id}`} className="p-3.5 rounded-2xl border border-blue-100 bg-blue-50/30 flex items-center justify-between gap-3 type-body-compact">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="type-minor-heading text-slate-900 truncate">
                                {t.title}
                              </div>
                              <div className="type-metadata text-slate-500 truncate mt-0.5">
                                {t.requesterName} • <span className="font-mono text-slate-700">{t.projectCode}</span>
                              </div>
                            </div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/tasks?taskId=${t.taskId}`} className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white type-button-label rounded-xl shadow-2xs transition-all shrink-0">
                            Review
                          </Link>
                        </div>
                      ))}

                      {siteVisits.slice(0, 2).map((v) => (
                        <div key={`visit-${v.id}`} className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between gap-3 type-body-compact">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="type-minor-heading text-slate-900 truncate">
                                {v.siteName} • {v.projectCode}
                              </div>
                              <div className="type-metadata text-slate-500 truncate mt-0.5">
                                Inspector: {v.inspectorName} • {v.purpose}
                              </div>
                            </div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/visits`} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white type-button-label rounded-xl shadow-2xs transition-all shrink-0">
                            Review
                          </Link>
                        </div>
                      ))}

                      {meetings.slice(0, 2).map((m) => (
                        <div key={`meet-${m.id}`} className="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/30 flex items-center justify-between gap-3 type-body-compact">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="type-minor-heading text-slate-900 truncate">
                                {m.title}
                              </div>
                              <div className="type-metadata text-slate-500 truncate mt-0.5">
                                {new Date(m.meetingDate).toLocaleDateString()} ({m.startTime} - {m.endTime}) • {m.meetingType}
                              </div>
                            </div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/meetings`} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white type-button-label rounded-xl shadow-2xs transition-all shrink-0">
                            Review
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {reviewTab === "LEAVE" && (
                  leaves.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <p className="type-minor-heading text-slate-800">No pending leave requests</p>
                      <p className="type-helper text-slate-500 mt-1">All employee leave applications have been resolved.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {leaves.map((l) => (
                        <div key={l.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="type-minor-heading text-slate-900 truncate">{l.requesterName} • <span className="text-teal-700">{l.leaveType}</span></div>
                            <div className="type-metadata text-slate-500 truncate mt-0.5">{l.startDate} to {l.endDate} ({l.daysCount} days) • {l.reason}</div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/inbox?tab=all-authorized&type=LEAVE`} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white type-button-label rounded-xl shrink-0">Review</Link>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {reviewTab === "TASK" && (
                  tasks.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <p className="type-minor-heading text-slate-800">No tasks waiting review</p>
                      <p className="type-helper text-slate-500 mt-1">All deliverable submissions are reviewed.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {tasks.map((t) => (
                        <div key={t.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="type-minor-heading text-slate-900 truncate">{t.title}</div>
                            <div className="type-metadata text-slate-500 truncate mt-0.5">{t.requesterName} • <span className="font-mono text-slate-600">{t.projectCode}</span></div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/tasks?taskId=${t.taskId}`} className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white type-button-label rounded-xl shrink-0">Review</Link>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {reviewTab === "SITE_VISIT" && (
                  siteVisits.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <p className="type-minor-heading text-slate-800">No site visits waiting review</p>
                      <p className="type-helper text-slate-500 mt-1">All site inspections are current.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {siteVisits.map((v) => (
                        <div key={v.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="type-minor-heading text-slate-900 truncate">{v.siteName} • {v.projectCode}</div>
                            <div className="type-metadata text-slate-500 truncate mt-0.5">Inspector: {v.inspectorName} • {v.purpose}</div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/visits`} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white type-button-label rounded-xl shrink-0">Review</Link>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {reviewTab === "MEETING" && (
                  meetings.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <p className="type-minor-heading text-slate-800">No meetings pending review</p>
                      <p className="type-helper text-slate-500 mt-1">All meeting minutes have been recorded.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {meetings.map((m) => (
                        <div key={m.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="type-minor-heading text-slate-900 truncate">{m.title}</div>
                            <div className="type-metadata text-slate-500 truncate mt-0.5">{new Date(m.meetingDate).toLocaleDateString()} • {m.meetingType} • {m.isMinutesPublished ? "Minutes published" : "Minutes pending"}</div>
                          </div>
                          <Link href={`/w/${workspaceSlug}/meetings`} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white type-button-label rounded-xl shrink-0">Review</Link>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })()}

          {/* Card B: Project delivery */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="type-card-title text-slate-900">Project delivery</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full type-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>On schedule</span>
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between type-body-compact">
                <span className="font-medium text-slate-800">
                  {data.studioSummary.activeProjectsCount} active projects
                </span>
                <span className="font-medium text-slate-800 tabular-nums">
                  {data.studioSummary.activeProjectsCount > 0
                    ? Math.round(((data.studioSummary.activeProjectsCount - data.studioSummary.overdueDeliverablesCount) / data.studioSummary.activeProjectsCount) * 100)
                    : 100}% on time
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.studioSummary.activeProjectsCount > 0
                      ? Math.max(20, Math.round(((data.studioSummary.activeProjectsCount - data.studioSummary.overdueDeliverablesCount) / data.studioSummary.activeProjectsCount) * 100))
                      : 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card C: Studio team workload */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="type-card-title text-slate-900">Studio team workload</h2>
              </div>
              <Link
                href={`/w/${workspaceSlug}/team`}
                className="type-button-label text-[#2563EB] hover:text-blue-800 flex items-center gap-1"
              >
                <span>View all {data.teamWorkload.length}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left type-table-cell">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 type-form-label">
                    <th className="pb-3 font-medium">Team member</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 text-center font-medium">Active tasks</th>
                    <th className="pb-3 font-medium text-right sm:text-left sm:pl-6">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.teamWorkload.slice(0, 6).map((m) => {
                    const initials = m.fullName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                    // Workload calculation
                    const workloadPct = Math.min(100, (m.activeTasksCount * 20));
                    return (
                      <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 type-badge font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <span className="font-medium text-slate-900 truncate max-w-[140px] sm:max-w-none">
                              {m.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500 font-normal">
                          {m.designation || "Studio Specialist"}
                        </td>
                        <td className="py-3 text-center font-medium text-slate-800 tabular-nums">
                          {m.activeTasksCount}
                        </td>
                        <td className="py-3 sm:pl-6">
                          <div className="flex items-center gap-3 justify-end sm:justify-start">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${workloadPct > 80 ? "bg-rose-500" : workloadPct > 40 ? "bg-blue-600" : "bg-slate-300"}`}
                                style={{ width: `${Math.max(5, workloadPct)}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-600 type-body-compact w-8 text-right tabular-nums">
                              {workloadPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (~35%) */}
        <div className="space-y-6">
          {/* Card 2: Next actions */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
            <h2 className="type-card-title text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
              <span>Next actions</span>
            </h2>

            <div className="space-y-2 type-body-compact">
              <Link
                href={`/w/${workspaceSlug}/inbox`}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-l-4 border-l-rose-500 border border-slate-200/60 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="type-minor-heading text-slate-900">Review task submissions</div>
                  <div className="type-helper text-slate-500">
                    {data.approvalInbox.length || 2} deliverables pending
                  </div>
                </div>
                <span className="type-badge bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
                  High
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/capacity`}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-l-4 border-l-amber-500 border border-slate-200/60 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="type-minor-heading text-slate-900">Verify studio capacity</div>
                  <div className="type-helper text-slate-500">Check team workload matrix</div>
                </div>
                <span className="type-badge bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                  Med
                </span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/finance`}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-l-4 border-l-blue-500 border border-slate-200/60 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="type-minor-heading text-slate-900">Audit incurred expenses</div>
                  <div className="type-helper text-slate-500">Review project contractor costs</div>
                </div>
                <span className="type-badge bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                  Low
                </span>
              </Link>
            </div>
          </div>

          {/* Card 3: Upcoming site visits */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="type-card-title text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <span>Upcoming site visits</span>
              </h2>
              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="type-button-label text-[#2563EB] hover:text-blue-800 flex items-center gap-1"
              >
                <span>View calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.upcomingSiteVisits.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <Calendar className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="type-body-compact text-slate-500 font-medium">No visits scheduled this week.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.upcomingSiteVisits.slice(0, 3).map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 type-body-compact">
                    <div className="flex items-center justify-between type-metadata text-slate-400 font-mono">
                      <span className="font-semibold text-[#2563EB]">{v.projectCode} • {v.siteName}</span>
                      <span>{new Date(v.scheduledTime).toLocaleDateString()}</span>
                    </div>
                    <p className="type-minor-heading text-slate-800 truncate">{v.purpose}</p>
                    <span className="type-helper text-slate-500 block">
                      Inspector: {v.inspectorName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {airlockToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white type-body-compact font-medium rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
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
