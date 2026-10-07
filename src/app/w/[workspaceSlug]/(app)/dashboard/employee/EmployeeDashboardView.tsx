"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Send,
  AlertCircle,
  MapPin,
  Bell,
  RefreshCw,
  FolderKanban,
  MessageSquare,
  ArrowRight,
  X,
  FileCheck2,
  Calendar,
} from "lucide-react";
import { EmployeeDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";

interface EmployeeDashboardViewProps {
  data: EmployeeDashboardData;
  workspaceSlug: string;
  userRole: string;
  userFullName: string;
  membershipId: string;
  timezone: string;
}

export default function EmployeeDashboardView({
  data,
  workspaceSlug,
  userRole,
  userFullName,
  membershipId,
  timezone,
}: EmployeeDashboardViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "TODAY" | "OVERDUE" | "REVIEW" | "CHANGES">("ALL");

  // Review submission modal state
  const [submitModalItem, setSubmitModalItem] = useState<{ id: string; taskId: string; title: string; isChecklistItem: boolean } | null>(null);
  const [submissionComment, setSubmissionComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Blocker report modal state
  const [blockerModalItem, setBlockerModalItem] = useState<{ id: string; taskId: string; title: string; isChecklistItem: boolean } | null>(null);
  const [blockerReason, setBlockerReason] = useState("");
  const [isSubmittingBlocker, setIsSubmittingBlocker] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Start work (NOT_STARTED -> IN_PROGRESS)
  const handleStartWork = async (item: { id: string; taskId: string; isChecklistItem: boolean }) => {
    try {
      if (item.isChecklistItem) {
        await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: item.taskId,
            itemId: item.id,
            status: "IN_PROGRESS",
          }),
        });
      } else {
        await fetch(`/api/tasks/status?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: item.taskId,
            status: "IN_PROGRESS",
          }),
        });
      }
      setActionMessage("Task started successfully!");
      router.refresh();
    } catch {
      setActionMessage("Failed to start task.");
    }
  };

  // Submit for review (IN_PROGRESS -> IN_REVIEW)
  const handleSubmitForReview = async () => {
    if (!submitModalItem) return;
    setIsSubmittingReview(true);
    try {
      if (submitModalItem.isChecklistItem) {
        await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: submitModalItem.taskId,
            itemId: submitModalItem.id,
            status: "IN_REVIEW",
            comment: submissionComment.trim() || undefined,
          }),
        });
      } else {
        await fetch(`/api/tasks/status?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: submitModalItem.taskId,
            status: "IN_REVIEW",
            comment: submissionComment.trim() || undefined,
          }),
        });
      }
      setSubmitModalItem(null);
      setSubmissionComment("");
      setActionMessage("Work submitted for leadership review!");
      router.refresh();
    } catch {
      setActionMessage("Failed to submit work.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Report blocker
  const handleReportBlocker = async () => {
    if (!blockerModalItem || !blockerReason.trim()) return;
    setIsSubmittingBlocker(true);
    try {
      if (blockerModalItem.isChecklistItem) {
        await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: blockerModalItem.taskId,
            itemId: blockerModalItem.id,
            blockerReason: blockerReason.trim(),
            comment: `[Blocker Reported] ${blockerReason.trim()}`,
          }),
        });
      } else {
        await fetch(`/api/tasks/comment?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: blockerModalItem.taskId,
            content: `[Blocker Reported] ${blockerReason.trim()}`,
          }),
        });
      }
      setBlockerModalItem(null);
      setBlockerReason("");
      setActionMessage("Blocker reported to project lead.");
      router.refresh();
    } catch {
      setActionMessage("Failed to report blocker.");
    } finally {
      setIsSubmittingBlocker(false);
    }
  };

  // Filtered queue items
  const filteredQueue = data.workQueue.filter((item) => {
    if (filterTab === "PENDING") {
      return item.status === "NOT_STARTED" || item.status === "IN_PROGRESS";
    }
    if (filterTab === "TODAY") {
      return item.isDueToday;
    }
    if (filterTab === "OVERDUE") {
      return item.isOverdue;
    }
    if (filterTab === "REVIEW") {
      return item.status === "IN_REVIEW";
    }
    if (filterTab === "CHANGES") {
      return Boolean(item.blockerReason);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E6F0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#5A81FA] uppercase tracking-wider border border-[#CEDEFF]">
              Employee Workspace
            </span>
            <span className="text-xs text-[#696E82]">
              Studio Timezone: <strong>{timezone}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
            My Workspace — {userFullName}
          </h1>
          <p className="text-xs text-[#696E82]">
            Track your assigned checklist items, submit completed deliverables, and review leader feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#696E82] rounded-xl border border-[#E2E6F0] transition-colors cursor-pointer"
            title="Refresh my workspace"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#5A81FA]" : ""}`} />
          </button>

          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Open Tasks View</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. My Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending */}
        <button
          type="button"
          onClick={() => setFilterTab("PENDING")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterTab === "PENDING"
              ? "bg-[#F2F4FF] border-[#5A81FA] ring-2 ring-[#5A81FA]/20"
              : "bg-white border-[#E2E6F0] hover:border-[#5A81FA]"
          }`}
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-2xl font-bold text-[#1F1F1F]">
            {data.mySummary.pendingTasksCount}
          </div>
          <span className="text-[10px] text-[#696E82]">Active & in-progress</span>
        </button>

        {/* Due Today */}
        <button
          type="button"
          onClick={() => setFilterTab("TODAY")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterTab === "TODAY"
              ? "bg-[#F2F4FF] border-[#5A81FA] ring-2 ring-[#5A81FA]/20"
              : "bg-white border-[#E2E6F0] hover:border-[#5A81FA]"
          }`}
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Due Today</span>
            <Calendar className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-2xl font-bold text-[#1F1F1F]">
            {data.mySummary.dueTodayCount}
          </div>
          <span className="text-[10px] text-[#5A81FA] font-medium">Today&apos;s targets</span>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => setFilterTab("OVERDUE")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterTab === "OVERDUE"
              ? "bg-red-50/50 border-red-300 ring-2 ring-red-400/20"
              : "bg-white border-[#E2E6F0] hover:border-red-300"
          }`}
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold ${data.mySummary.overdueCount > 0 ? "text-red-600" : "text-[#1F1F1F]"}`}>
            {data.mySummary.overdueCount}
          </div>
          <span className="text-[10px] text-red-600 font-medium">Past deadline</span>
        </button>

        {/* In Review */}
        <button
          type="button"
          onClick={() => setFilterTab("REVIEW")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterTab === "REVIEW"
              ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-white border-[#E2E6F0] hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">In Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {data.mySummary.inReviewCount}
          </div>
          <span className="text-[10px] text-[#696E82]">Awaiting approval</span>
        </button>

        {/* Changes Requested */}
        <button
          type="button"
          onClick={() => setFilterTab("CHANGES")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            filterTab === "CHANGES"
              ? "bg-orange-50/50 border-orange-300 ring-2 ring-orange-400/20"
              : "bg-white border-[#E2E6F0] hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Changes Requested</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {data.mySummary.changesRequestedCount}
          </div>
          <span className="text-[10px] text-orange-600 font-medium">Needs correction</span>
        </button>

        {/* Completed Work */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E6F0]">
          <div className="flex items-center justify-between text-[#696E82] mb-1">
            <span className="text-xs font-medium">Completed Work</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {data.mySummary.completedCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Approved by leads</span>
        </div>
      </div>

      {/* 3. Main Work Queue & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): My Work Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E6F0] pb-3">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
                <span>My Assigned Work Queue ({filteredQueue.length})</span>
              </h2>

              <div className="flex flex-wrap items-center gap-1">
                {(["ALL", "PENDING", "TODAY", "OVERDUE", "REVIEW", "CHANGES"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                      filterTab === tab
                        ? "bg-[#5A81FA] text-white"
                        : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
                    }`}
                  >
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-10 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0] space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-[#1F1F1F]">No tasks in this view</p>
                <p className="text-[11px] text-[#696E82]">You are all caught up on deliverables in this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      item.isOverdue
                        ? "border-red-200 bg-red-50/20 hover:bg-white"
                        : item.blockerReason
                        ? "border-orange-200 bg-orange-50/20 hover:bg-white"
                        : "border-[#E2E6F0] bg-[#FAFBFD] hover:bg-white"
                    }`}
                  >
                    {/* Top line: Project code, deliverable parent, priority badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[9px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                            {item.projectCode}
                          </span>
                          <span className="text-[11px] text-[#696E82] truncate">
                            {item.projectName}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs text-[#1F1F1F] mt-1 break-words">
                          {item.title}
                        </h3>
                        {item.parentTitle !== item.title && (
                          <span className="text-[10px] text-[#696E82] block mt-0.5">
                            Deliverable: {item.parentTitle}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <TaskPriorityBadge priority={item.priority} size="sm" />
                      </div>
                    </div>

                    {/* Blocker alert if changes requested */}
                    {item.blockerReason && (
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-800 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Revision Requested:</strong> {item.blockerReason}
                        </div>
                      </div>
                    )}

                    {/* Bottom action row */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E2E6F0]/80">
                      <div className="text-[11px] text-[#696E82]">
                        {item.dueDate ? (
                          <span className={item.isOverdue ? "text-red-600 font-bold" : ""}>
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          "No deadline"
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Start Work button */}
                        {item.status === "NOT_STARTED" && (
                          <button
                            type="button"
                            onClick={() => handleStartWork(item)}
                            className="px-2.5 py-1 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#5A81FA] hover:text-white rounded-lg text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start Work</span>
                          </button>
                        )}

                        {/* Submit for review button */}
                        {(item.status === "IN_PROGRESS" || item.blockerReason) && (
                          <button
                            type="button"
                            onClick={() =>
                              setSubmitModalItem({
                                id: item.id,
                                taskId: item.taskId,
                                title: item.title,
                                isChecklistItem: item.isChecklistItem,
                              })
                            }
                            className="px-2.5 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-lg text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Submit for Review</span>
                          </button>
                        )}

                        {/* In review badge */}
                        {item.status === "IN_REVIEW" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Under Review
                          </span>
                        )}

                        {/* Report blocker */}
                        {item.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() =>
                              setBlockerModalItem({
                                id: item.id,
                                taskId: item.taskId,
                                title: item.title,
                                isChecklistItem: item.isChecklistItem,
                              })
                            }
                            className="p-1 text-[#696E82] hover:text-orange-600 rounded hover:bg-orange-50 cursor-pointer"
                            title="Report Blocker"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View in tasks */}
                        <Link
                          href={`/w/${workspaceSlug}/tasks?taskId=${item.taskId}`}
                          className="p-1 text-[#696E82] hover:text-[#5A81FA] rounded hover:bg-[#F2F4FF]"
                          title="Open full task"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Priorities, Site Visits, Leader Feedback */}
        <div className="space-y-6">
          {/* Today's Priorities */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#5A81FA]" />
              <span>Today&apos;s Priorities ({data.todayPriorities.length})</span>
            </h2>

            {data.todayPriorities.length === 0 ? (
              <p className="text-xs text-[#696E82] p-3 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No urgent priority tasks assigned for today.
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayPriorities.map((item) => (
                  <div key={item.id} className="p-2.5 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1 rounded">
                        {item.projectCode}
                      </span>
                      <TaskPriorityBadge priority={item.priority} size="sm" />
                    </div>
                    <p className="font-semibold text-xs text-[#1F1F1F] truncate">{item.title}</p>
                    <span className="text-[10px] text-[#696E82] block">
                      Status: {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Site Visits */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>My Assigned Site Visits</span>
              </h2>
              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="text-[11px] font-semibold text-[#5A81FA] hover:underline"
              >
                GPS Log →
              </Link>
            </div>

            {data.mySiteVisits.length === 0 ? (
              <p className="text-xs text-[#696E82] p-3 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No site visits assigned to you currently.
              </p>
            ) : (
              <div className="space-y-2">
                {data.mySiteVisits.map((v) => (
                  <div key={v.id} className="p-2.5 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#5A81FA]">{v.projectCode} • {v.siteName}</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                        {v.operationalState}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-[#1F1F1F] truncate">{v.purpose}</p>
                    <span className="text-[10px] text-[#696E82] block">
                      Scheduled: {new Date(v.scheduledTime).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications & Studio Announcements */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#5A81FA]" />
              <span>Studio Notifications</span>
            </h2>

            {data.notifications.length === 0 ? (
              <p className="text-xs text-[#696E82] p-3 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No new notifications.
              </p>
            ) : (
              <div className="space-y-2">
                {data.notifications.map((n) => (
                  <div key={n.id} className="p-2 bg-[#FAFBFD] rounded-lg border border-[#E2E6F0]/60 space-y-0.5 text-xs">
                    <span className="font-bold text-[#1F1F1F] block">{n.title}</span>
                    <p className="text-[11px] text-[#696E82] leading-snug">{n.message}</p>
                    <span className="text-[9px] text-[#696E82] block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Submit for Review */}
      {submitModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
              <h3 className="font-bold text-sm text-[#1F1F1F]">Submit Work for Review</h3>
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Submitting: <strong className="text-[#1F1F1F]">{submitModalItem.title}</strong>
            </p>

            <div>
              <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                Submission Note / Clarification (Optional)
              </label>
              <textarea
                rows={3}
                data-enable-assistant="true"
                value={submissionComment}
                onChange={(e) => setSubmissionComment(e.target.value)}
                placeholder="Mention drawing revisions, completed CAD layers, or site survey notes..."
                className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="px-3 py-1.5 bg-[#F2F4FF] text-[#696E82] rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitForReview}
                className="px-4 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingReview ? "Submitting..." : "Submit to Leadership"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report Blocker */}
      {blockerModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
              <h3 className="font-bold text-sm text-[#1F1F1F] flex items-center gap-1.5 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>Report Blocker or Request Clarification</span>
              </h3>
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Deliverable: <strong className="text-[#1F1F1F]">{blockerModalItem.title}</strong>
            </p>

            <div>
              <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                Blocker Reason / Required Information <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                data-enable-assistant="true"
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Explain what is blocking progress (e.g. awaiting client structural signoff, missing MEP dwg)..."
                className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="px-3 py-1.5 bg-[#F2F4FF] text-[#696E82] rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBlocker || !blockerReason.trim()}
                onClick={handleReportBlocker}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSubmittingBlocker ? "Submitting..." : "Send Blocker Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
