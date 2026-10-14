"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Check,
  X,
  Play,
  RotateCcw,
  Send,
  HelpCircle,
  FileText,
  ShieldAlert,
  ArrowRight,
  ListTodo,
} from "lucide-react";

export default function DailyEmployeeWorkDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [activeTab, setActiveTab] = useState<"awaiting-action" | "waiting-others">("awaiting-action");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Modal states for quick actions
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerReason, setBlockerReason] = useState("");

  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState(3);
  const [extensionReason, setExtensionReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchWork = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ workspaceSlug });
      const res = await fetch(`/api/tasks/my-work?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load work dashboard");
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWork();
  }, [workspaceSlug]);

  // Quick Action: Acknowledge assignment
  const handleAcknowledge = async (taskId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/acknowledge?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to acknowledge");
      setToastMessage({ type: "success", text: "Assignment acknowledged successfully." });
      fetchWork();
    } catch (e: any) {
      setToastMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Start work
  const handleStartWork = async (taskId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/start?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start work");
      setToastMessage({ type: "success", text: "Deliverable status updated to IN PROGRESS." });
      fetchWork();
    } catch (e: any) {
      setToastMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Submit for review
  const handleSubmitReview = async (taskId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/submit?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          submissionNotes: "Completed work submitted for studio leadership review.",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit deliverable");
      setToastMessage({ type: "success", text: "Work submitted for review and moved to Pending Decision." });
      fetchWork();
    } catch (e: any) {
      setToastMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Request deadline extension
  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !extensionReason.trim()) return;
    setActionLoading(true);
    try {
      const newDue = new Date();
      newDue.setDate(newDue.getDate() + extensionDays);

      const res = await fetch(`/api/tasks/extension?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          proposedDueDate: newDue.toISOString(),
          reason: extensionReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request extension");

      setExtensionModalOpen(false);
      setExtensionReason("");
      setToastMessage({ type: "success", text: "Deadline extension request submitted to Decision Inbox." });
      fetchWork();
    } catch (e: any) {
      setToastMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const metrics = data?.metrics;
  const awaitingActionItems = (data?.awaitingMyAction || []).filter((item: any) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.project?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const waitingOthersItems = (data?.waitingForOthers || []).filter((item: any) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.project?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const upcomingLeaves = data?.myLeavesSummary?.upcomingApproved || [];
  const pendingLeaves = data?.myLeavesSummary?.pendingReview || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">My Work Today</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Active deliverables, urgent priorities, and daily operations queue
          </p>
        </div>

        <button
          onClick={fetchWork}
          className="px-3.5 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-semibold text-[#1F1F1F] hover:bg-[#F8F9FE] flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#5A81FA]" : "text-[#696E82]"}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Awaiting My Action
          </div>
          <div className="text-2xl font-extrabold text-[#5A81FA] mt-2 font-mono">
            {metrics?.awaitingMyAction ?? 0}
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Assigned work needing your progress</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Overdue Work
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
            {metrics?.overdue ?? 0}
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Past scheduled deadline</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Due Today
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2 font-mono">
            {metrics?.dueToday ?? 0}
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Requires delivery before 18:30 IST</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Waiting for Others
          </div>
          <div className="text-2xl font-extrabold text-slate-700 mt-2 font-mono">
            {metrics?.waitingForOthers ?? 0}
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">In review or leadership unblocking</div>
        </div>
      </div>

      {/* Main Grid: Left Column (Tasks & Actions) | Right Column (Leave Context & Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="flex items-center gap-1 p-1 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] overflow-x-auto touch-scroll-x">
              <button
                onClick={() => setActiveTab("awaiting-action")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                  activeTab === "awaiting-action"
                    ? "bg-[#5A81FA] text-white shadow-2xs"
                    : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
              >
                Awaiting My Action ({metrics?.awaitingMyAction ?? 0})
              </button>
              <button
                onClick={() => setActiveTab("waiting-others")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                  activeTab === "waiting-others"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
              >
                Waiting for Others ({metrics?.waitingForOthers ?? 0})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA] w-full sm:w-44"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Task List Render */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
              Loading your daily operational work...
            </div>
          ) : activeTab === "awaiting-action" ? (
            awaitingActionItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="font-bold text-[#1F1F1F] text-sm">You are all caught up!</div>
                <p className="mt-1">No active deliverables currently require your action.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {awaitingActionItems.map((task: any) => (
                  <div
                    key={task.id}
                    className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs ${
                      task.isOverdue
                        ? "border-rose-300 bg-rose-50/15"
                        : task.isDueToday
                        ? "border-amber-300"
                        : "border-[#E2E6F0]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-[#1F1F1F]">{task.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#5A81FA] border border-[#CEDEFF] font-mono">
                            {task.project?.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === "URGENT"
                                ? "bg-rose-100 text-rose-800"
                                : task.priority === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {task.priority}
                          </span>

                          {task.isOverdue && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                              Overdue
                            </span>
                          )}
                          {task.isDueToday && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                              Due Today
                            </span>
                          )}
                          {task.isAwaitingAck && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Awaiting Ack
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-[#696E82] line-clamp-2">{task.description}</p>
                        )}

                        {task.isCorrectionsRequested && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <strong>Leadership Correction Note:</strong> {task.reviewFeedback || "Please address feedback and re-submit."}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#696E82]">
                          {task.dueDate && (
                            <div className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-[#5A81FA]" />
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.checklistProgress && task.checklistProgress.total > 0 && (
                            <div className="flex items-center gap-1 font-mono">
                              <ListTodo className="w-3 h-3 text-[#5A81FA]" />
                              <span>
                                Checklist: {task.checklistProgress.completed}/{task.checklistProgress.total}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions for Employee */}
                      <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
                        {task.isAwaitingAck && (
                          <button
                            onClick={() => handleAcknowledge(task.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Acknowledge</span>
                          </button>
                        )}

                        {task.status !== "IN_PROGRESS" && !task.isAwaitingAck && (
                          <button
                            onClick={() => handleStartWork(task.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-[#5A81FA] hover:bg-[#4870EB] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start Work</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSubmitReview(task.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit Review</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setExtensionDays(3);
                            setExtensionReason("");
                            setExtensionModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[11px] text-[#696E82] font-semibold transition-colors cursor-pointer"
                        >
                          Request Extension
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Waiting for Others Render */
            waitingOthersItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
                No deliverables currently waiting for external review or leadership action.
              </div>
            ) : (
              <div className="space-y-3">
                {waitingOthersItems.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1F1F1F]">{task.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#5A81FA] border border-[#CEDEFF] font-mono">
                          {task.project?.code}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {task.isWaitingReview ? "Under Leadership Review" : "Blocked on Leadership"}
                      </span>
                    </div>

                    {task.blockerReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        <strong>Blocker Note:</strong> {task.blockerReason}
                      </div>
                    )}

                    <div className="text-[11px] text-[#696E82] flex items-center justify-between pt-1">
                      <span>Status: {task.status}</span>
                      <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Unscheduled"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Right Column: Personal Leave Context & Quota */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">My Leave & Absence Context</h3>
                <p className="text-xs text-[#696E82]">Integrated personal availability</p>
              </div>
              <Calendar className="w-4 h-4 text-[#5A81FA]" />
            </div>

            {/* Upcoming Approved Leaves */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
                Upcoming Approved Absence
              </span>
              {upcomingLeaves.length === 0 ? (
                <div className="p-3 bg-[#F8F9FD] rounded-xl text-[11px] text-[#696E82]">
                  No upcoming approved leave scheduled.
                </div>
              ) : (
                upcomingLeaves.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-0.5"
                  >
                    <div className="font-bold font-mono">
                      {l.startDate} — {l.endDate}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      {l.days} Day(s) • {l.leaveType}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pending Leave Applications */}
            <div className="space-y-2 pt-2 border-t border-[#E2E6F0]">
              <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
                Pending Leave Applications
              </span>
              {pendingLeaves.length === 0 ? (
                <div className="p-3 bg-[#F8F9FD] rounded-xl text-[11px] text-[#696E82]">
                  No leave requests currently under review.
                </div>
              ) : (
                pendingLeaves.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-0.5"
                  >
                    <div className="font-bold font-mono">
                      {l.startDate} — {l.endDate}
                    </div>
                    <div className="text-[11px] text-amber-700">
                      {l.days} Day(s) • {l.leaveType} (v{l.version})
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E6F0]">
              <button
                onClick={() => router.push(`/w/${workspaceSlug}/leave/my-leave`)}
                className="w-full py-2 rounded-xl bg-[#F8F9FE] hover:bg-[#F2F4FF] border border-[#CEDEFF] text-[#2C308D] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Manage My Leave & Quota</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: REQUEST EXTENSION ================= */}
      {extensionModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="extension-modal-title"
            className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 id="extension-modal-title" className="text-base font-bold text-[#1F1F1F]">Request Deadline Extension</h3>
                <p className="text-xs text-[#696E82]">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setExtensionModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestExtension} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Extension Days Requested
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Reason for Extension
                </label>
                <textarea
                  rows={3}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Explain why an extension is necessary..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !extensionReason.trim()}
                  className="px-5 py-2 rounded-xl bg-[#5A81FA] text-white font-bold hover:bg-[#4870EB] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
