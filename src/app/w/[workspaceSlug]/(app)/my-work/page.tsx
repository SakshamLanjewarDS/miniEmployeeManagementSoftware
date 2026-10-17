"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Send,
  FileText,
  ShieldAlert,
  ArrowRight,
  ListTodo,
  Users,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  UserPlus,
  StickyNote,
  Sliders,
  ChevronDown,
  Target,
  Bell,
  Sparkles,
} from "lucide-react";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";
import { VisualDrawingAirlock, DrawingAirlockData } from "@/components/drawings/VisualDrawingAirlock";

export default function DailyEmployeeWorkDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  // --- Primary Executive Dual-Lens State ---
  const [primaryLens, setPrimaryLens] = useState<"my-work" | "delegated">("my-work");
  const [activeTab, setActiveTab] = useState<"awaiting-action" | "waiting-others">("awaiting-action");
  const [layoutMode, setLayoutMode] = useState<"LIST" | "GRID">("LIST");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // --- Modal states for quick actions ---
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerReason, setBlockerReason] = useState("");

  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState(3);
  const [extensionReason, setExtensionReason] = useState("");

  // --- Micro-Delegation Modal State ---
  const [redelegateModalOpen, setRedelegateModalOpen] = useState(false);
  const [taskToDelegate, setTaskToDelegate] = useState<any | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [delegationReason, setDelegationReason] = useState("");

  // --- Drawing Airlock Flyout Modal State ---
  const [airlockModalOpen, setAirlockModalOpen] = useState(false);
  const [airlockDrawingData, setAirlockDrawingData] = useState<Partial<DrawingAirlockData> | null>(null);
  const [airlockTaskReference, setAirlockTaskReference] = useState<any | null>(null);

  // --- Pomodoro Focus Sprint State ---
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState<number>(25 * 60);
  const [initialPomodoroSeconds, setInitialPomodoroSeconds] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState<boolean>(false);
  const [pomodoroTaskTitle, setPomodoroTaskTitle] = useState<string>("Executive Design Sprint");
  const [focusProjectId, setFocusProjectId] = useState<string>("");
  const [focusTaskId, setFocusTaskId] = useState<string>("");
  const [isFocusHudExpanded, setIsFocusHudExpanded] = useState(false);

  // --- Quick Notes Scratchpad State ---
  const [scratchpadNote, setScratchpadNote] = useState<string>("");
  const [isScratchpadSaved, setIsScratchpadSaved] = useState<boolean>(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedChecklistTaskId, setExpandedChecklistTaskId] = useState<string | null>(null);

  // Load scratchpad from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`studio_scratchpad_${workspaceSlug}`);
      if (saved) setScratchpadNote(saved);
    } catch {}
  }, [workspaceSlug]);

  const handleSaveScratchpad = (val: string) => {
    setScratchpadNote(val);
    setIsScratchpadSaved(false);
    try {
      localStorage.setItem(`studio_scratchpad_${workspaceSlug}`, val);
      setTimeout(() => setIsScratchpadSaved(true), 500);
    } catch {}
  };

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
      if (json.projects && json.projects.length > 0 && !focusProjectId) {
        setFocusProjectId(json.projects[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWork();
  }, [workspaceSlug]);

  // Real-time SSE Live Bus Integration
  const { isConnected } = useStudioRealtime({
    workspaceSlug,
    autoRefresh: false,
    onEvent: (event) => {
      if (["TASK_UPDATED", "DECISION_UPDATED", "DRAWING_UPDATED", "METRICS_REFRESH"].includes(event.type)) {
        fetchWork();
      }
    },
  });

  // Focus timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning && pomodoroSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomodoroSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroSecondsLeft === 0 && isPomodoroRunning) {
      setIsPomodoroRunning(false);
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + "A".repeat(200));
        audio.play().catch(() => {});
      } catch {}
      setToastMessage({ type: "success", text: "Focus sprint complete! Take a 5-minute break." });
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroSecondsLeft]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

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
  const handleStartWork = async (taskId: string, projectTitle?: string) => {
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

      setFocusTaskId(taskId);
      if (projectTitle) setPomodoroTaskTitle(projectTitle);
      setIsPomodoroRunning(true);

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

  // Micro-Delegation Submit
  const handleExecuteRedelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToDelegate || !selectedAssigneeId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/reassign?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: taskToDelegate.id,
          newAssigneeId: selectedAssigneeId,
          reason: delegationReason.trim() || "Executive studio work re-balancing",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to re-delegate deliverable");
      setRedelegateModalOpen(false);
      setTaskToDelegate(null);
      setSelectedAssigneeId("");
      setDelegationReason("");
      setToastMessage({ type: "success", text: "Deliverable successfully reassigned." });
      fetchWork();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
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

  // Quick Action: Escalate Blocker
  const handleReportBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !blockerReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/status?workspaceSlug=${workspaceSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          status: "BLOCKED",
          blockerReason: blockerReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to flag blocker");
      setBlockerModalOpen(false);
      setBlockerReason("");
      setToastMessage({ type: "success", text: "Blocker escalated to Decision Inbox successfully." });
      fetchWork();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleChecklist = async (taskId: string, itemId: string, currentCompleted: boolean) => {
    setData((prev: any) => {
      if (!prev) return prev;
      const updateItems = (list: any[]) =>
        list.map((t) => {
          if (t.id !== taskId) return t;
          const nextItems = (t.checklistItems || []).map((ci: any) =>
            ci.id === itemId ? { ...ci, isCompleted: !currentCompleted } : ci
          );
          const comp = nextItems.filter((ci: any) => ci.isCompleted).length;
          return {
            ...t,
            checklistItems: nextItems,
            checklistProgress: { total: nextItems.length, completed: comp },
          };
        });

      return {
        ...prev,
        awaitingMyAction: updateItems(prev.awaitingMyAction || []),
        waitingForOthers: updateItems(prev.waitingForOthers || []),
        delegatedTasks: updateItems(prev.delegatedTasks || []),
      };
    });

    try {
      await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, itemId, isCompleted: !currentCompleted }),
      });
    } catch (e: any) {
      console.error("Failed to toggle checklist:", e);
      fetchWork();
    }
  };

  const handleOpenDrawingAirlock = (task: any) => {
    const docRef = task.drawingRef;
    const airlockPayload: Partial<DrawingAirlockData> = {
      documentId: docRef?.documentId || task.id,
      drawingCode: docRef?.drawingCode || `DWG-${task.project?.code || "101"}`,
      drawingTitle: docRef?.drawingTitle || task.title,
      projectCode: task.project?.code || "PRJ-01",
      projectName: task.project?.name || "Main Architectural Project",
      discipline: (docRef?.discipline as any) || "ARCHITECTURAL",
      revisionA: {
        code: docRef?.previousRevision || "R1.0",
        label: "Approved Baseline",
        date: "Previous",
        author: "Studio Lead",
        status: "APPROVED",
      },
      revisionB: {
        code: docRef?.latestRevision || "R2.1",
        label: "Latest Draft for Review",
        date: "Today",
        author: task.assignee?.fullName || "Lead Drafter",
        status: "FOR_REVIEW",
      },
    };
    setAirlockDrawingData(airlockPayload);
    setAirlockTaskReference(task);
    setAirlockModalOpen(true);
  };

  const metrics = data?.metrics;
  const isPrivileged = data?.role === "OWNER" || data?.role === "ADMIN" || data?.role === "PROJECT_MANAGER";

  const filterList = (items: any[]) =>
    items.filter((item: any) => {
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignee?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });

  const awaitingActionItems = filterList(data?.awaitingMyAction || []);
  const waitingOthersItems = filterList(data?.waitingForOthers || []);
  const delegatedItems = filterList(data?.delegatedTasks || []);

  const upcomingLeaves = data?.myLeavesSummary?.upcomingApproved || [];
  const pendingLeaves = data?.myLeavesSummary?.pendingReview || [];
  const timelineEvents = data?.timelineEvents || [];

  const activeDeliverablesList =
    primaryLens === "my-work"
      ? activeTab === "awaiting-action"
        ? awaitingActionItems
        : waitingOthersItems
      : delegatedItems;

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border shadow-sm transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2 ${
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
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#696E82]">{formattedDate}</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B122B] tracking-tight mt-0.5">My work today</h1>
          <p className="text-xs sm:text-sm text-[#696E82] mt-0.5">
            A clear view of your tasks, schedule and notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Live Sync Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live sync</span>
          </div>

          <button
            onClick={fetchWork}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[#696E82] hover:text-[#0B122B] transition-colors cursor-pointer shadow-2xs"
            title="Refresh deliverables"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ================= PRIMARY LENS TOGGLE ================= */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPrimaryLens("my-work")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            primaryLens === "my-work"
              ? "bg-[#3562E8] text-white shadow-xs"
              : "bg-white text-[#696E82] border border-[#E2E6F0] hover:bg-[#F8F9FE] hover:text-[#0B122B]"
          }`}
        >
          <List className="w-4 h-4" />
          <span>My deliverables</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              primaryLens === "my-work" ? "bg-white/20 text-white" : "bg-slate-100 text-[#696E82]"
            }`}
          >
            {metrics?.totalActive ?? 0}
          </span>
        </button>

        {isPrivileged && (
          <button
            onClick={() => setPrimaryLens("delegated")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              primaryLens === "delegated"
                ? "bg-[#3562E8] text-white shadow-xs"
                : "bg-white text-[#696E82] border border-[#E2E6F0] hover:bg-[#F8F9FE] hover:text-[#0B122B]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Delegated watchlist</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                primaryLens === "delegated" ? "bg-white/20 text-white" : "bg-slate-100 text-[#696E82]"
              }`}
            >
              {metrics?.totalDelegated ?? 0}
            </span>
          </button>
        )}
      </div>

      {/* ================= 4 KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryLens === "my-work" ? (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0B122B]">
                <List className="w-4 h-4 text-[#3562E8]" />
                <span>Needs my action</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.awaitingMyAction ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Tasks assigned to you</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Overdue</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.overdue ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Past scheduled deadline</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Due today</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.dueToday ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Before 6:30 PM</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#696E82]">
                <Users className="w-4 h-4 text-[#5A81FA]" />
                <span>Waiting on others</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.waitingForOthers ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">In client review or lead unblocking</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0B122B]">
                <Users className="w-4 h-4 text-[#3562E8]" />
                <span>Active delegated</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.totalDelegated ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Team deliverables under your watch</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Delegated overdue</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.delegatedOverdue ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Team tasks slipping deadline</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Delegated due today</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.delegatedDueToday ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Scheduled for team delivery today</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <ShieldAlert className="w-4 h-4 text-indigo-500" />
                <span>Team blockers</span>
              </div>
              <div className="text-3xl font-extrabold text-[#0B122B] mt-2 font-sans tracking-tight">
                {metrics?.delegatedBlocked ?? 0}
              </div>
              <div className="text-xs text-[#696E82] mt-1">Awaiting leadership intervention</div>
            </div>
          </>
        )}
      </div>

      {/* ================= MAIN SPLIT: LEFT CONTENT (68%) / RIGHT WIDGETS (32%) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Deliverables + Schedule + Focus session) */}
        <div className="lg:col-span-2 space-y-6">
          {/* DELIVERABLES CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Top row: Title + List/Grid switcher */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#0B122B] text-base">
                <List className="w-5 h-5 text-[#3562E8]" />
                <span>{primaryLens === "my-work" ? "My deliverables" : "Delegated watchlist"}</span>
              </div>

              <div className="flex items-center p-1 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
                <button
                  onClick={() => setLayoutMode("LIST")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    layoutMode === "LIST"
                      ? "bg-white text-[#3562E8] shadow-2xs"
                      : "text-[#696E82] hover:text-[#0B122B]"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  onClick={() => setLayoutMode("GRID")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    layoutMode === "GRID"
                      ? "bg-white text-[#3562E8] shadow-2xs"
                      : "text-[#696E82] hover:text-[#0B122B]"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>
            </div>

            {/* Sub-filter row: Needs action vs Waiting pills, Search input, All priorities */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {primaryLens === "my-work" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("awaiting-action")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "awaiting-action"
                        ? "bg-[#3562E8] text-white shadow-2xs"
                        : "bg-[#F8F9FE] text-[#696E82] hover:text-[#0B122B]"
                    }`}
                  >
                    Needs my action ({metrics?.awaitingMyAction ?? 0})
                  </button>
                  <button
                    onClick={() => setActiveTab("waiting-others")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "waiting-others"
                        ? "bg-[#3562E8] text-white shadow-2xs"
                        : "bg-[#F8F9FE] text-[#696E82] hover:text-[#0B122B]"
                    }`}
                  >
                    Waiting ({metrics?.waitingForOthers ?? 0})
                  </button>
                </div>
              ) : (
                <div className="text-xs font-semibold text-[#696E82]">
                  Monitoring all active team assignments
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search deliverables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#3562E8] transition-colors"
                  />
                </div>

                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white text-[#0B122B] font-medium appearance-none focus:outline-none focus:border-[#3562E8] cursor-pointer"
                  >
                    <option value="ALL">All priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#696E82] absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* DELIVERABLES CONTENT (EMPTY OR POPULATED) */}
            {activeDeliverablesList.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-[#0B122B]">No tasks need your action</h3>
                <p className="text-xs text-[#696E82] mt-1 max-w-sm">
                  Your personal queue is clear. You have {metrics?.totalDelegated ?? 0} delegated items to follow.
                </p>
                {isPrivileged && (metrics?.totalDelegated ?? 0) > 0 && (
                  <button
                    onClick={() => setPrimaryLens("delegated")}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span>View delegated watchlist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div
                className={
                  layoutMode === "GRID"
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                    : "space-y-3"
                }
              >
                {activeDeliverablesList.map((task: any) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      task.isOverdue
                        ? "bg-rose-50/20 border-rose-200"
                        : task.isBlocked
                        ? "bg-rose-50/30 border-rose-200"
                        : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#0B122B] truncate">{task.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#3562E8] border border-[#CEDEFF] font-mono">
                            {task.project?.code || "PRJ"}
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
                          {task.isBlocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-700 text-white flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              Blocked
                            </span>
                          )}
                        </div>

                        {task.blockerReason && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <strong>Blocker:</strong> {task.blockerReason}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#696E82]">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#3562E8]" />
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.checklistProgress && task.checklistProgress.total > 0 && (
                            <div className="flex items-center gap-1">
                              <ListTodo className="w-3.5 h-3.5 text-[#3562E8]" />
                              <span>
                                Checklist: {task.checklistProgress.completed}/{task.checklistProgress.total}
                              </span>
                            </div>
                          )}
                          {primaryLens === "delegated" && task.assignee && (
                            <div className="flex items-center gap-1.5 font-medium text-[#0B122B]">
                              <span>Assignee: {task.assignee.fullName}</span>
                            </div>
                          )}
                        </div>

                        {/* Interactive checklist if any */}
                        {task.checklistItems && task.checklistItems.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedChecklistTaskId(expandedChecklistTaskId === task.id ? null : task.id)
                              }
                              className="text-[11px] font-semibold text-[#3562E8] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              <span>
                                {expandedChecklistTaskId === task.id
                                  ? "Hide checklist"
                                  : `Checklist (${task.checklistProgress?.completed}/${task.checklistProgress?.total})`}
                              </span>
                            </button>
                            {expandedChecklistTaskId === task.id && (
                              <div className="mt-2 p-3 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl space-y-2">
                                {task.checklistItems.map((ci: any) => (
                                  <label
                                    key={ci.id}
                                    className="flex items-start gap-2.5 text-xs text-[#0B122B] cursor-pointer select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={ci.isCompleted}
                                      onChange={() => handleToggleChecklist(task.id, ci.id, ci.isCompleted)}
                                      className="w-4 h-4 rounded border-[#E2E6F0] text-[#3562E8] focus:ring-[#3562E8] mt-0.5 cursor-pointer"
                                    />
                                    <span className={ci.isCompleted ? "line-through text-[#696E82]" : "font-medium"}>
                                      {ci.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0">
                        {primaryLens === "my-work" && (
                          <>
                            {task.isAwaitingAck && (
                              <button
                                onClick={() => handleAcknowledge(task.id)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Acknowledge</span>
                              </button>
                            )}

                            {task.status !== "IN_PROGRESS" && !task.isAwaitingAck && (
                              <button
                                onClick={() => handleStartWork(task.id, task.title)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start work</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleSubmitReview(task.id)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit</span>
                            </button>
                          </>
                        )}

                        <div className="flex items-center gap-1">
                          {isPrivileged && (
                            <button
                              onClick={() => {
                                setTaskToDelegate(task);
                                setSelectedAssigneeId("");
                                setDelegationReason("");
                                setRedelegateModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg border border-[#CEDEFF] bg-[#F8F9FE] hover:bg-[#F2F4FF] text-[11px] text-[#2C308D] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Delegate"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Delegate</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setExtensionDays(3);
                              setExtensionReason("");
                              setExtensionModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[11px] text-[#696E82] font-semibold transition-colors cursor-pointer"
                          >
                            Extension
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setBlockerReason("");
                              setBlockerModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-[11px] text-rose-700 font-semibold transition-colors cursor-pointer"
                          >
                            Blocker
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TODAY'S SCHEDULE CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3562E8]" />
                <h2 className="text-base font-bold text-[#0B122B]">Today's schedule</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F8F9FE] text-[#5A81FA] border border-[#CEDEFF]">
                  {timelineEvents.length} events
                </span>
              </div>

              <button
                onClick={() => router.push(`/w/${workspaceSlug}/meetings`)}
                className="text-xs font-bold text-[#3562E8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#F8F9FE] text-[#3562E8] flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#0B122B]">No meetings or site visits today</h4>
                <p className="text-xs text-[#696E82] mt-0.5">Your schedule is open.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {timelineEvents.map((evt: any) => (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      evt.type === "MEETING"
                        ? "bg-indigo-50/40 border-indigo-200"
                        : "bg-emerald-50/40 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-[#0B122B] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#3562E8]" />
                        {evt.time} {evt.endTime ? `– ${evt.endTime}` : ""}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 text-[#0B122B]">
                        {evt.badge}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#0B122B] truncate">{evt.title}</div>
                    {evt.subtitle && <div className="text-[11px] text-[#696E82] truncate mt-0.5">{evt.subtitle}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOCUS SESSION INTEGRATED CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#F8F9FE] text-[#3562E8] flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B122B]">Focus session</h3>
                <p className="text-xs text-[#696E82] mt-0.5">A little space for uninterrupted work.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B122B] font-mono tracking-tight">
                {formatTimer(pomodoroSecondsLeft)}
              </div>

              <button
                type="button"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                className="px-4 py-2.5 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isPomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPomodoroRunning ? "Pause focus" : "Start focus"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPomodoroRunning(false);
                  setPomodoroSecondsLeft(initialPomodoroSeconds);
                }}
                className="p-2.5 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[#696E82] hover:text-[#0B122B] transition-colors cursor-pointer"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Quick notes + My leave) */}
        <div className="space-y-6">
          {/* QUICK NOTES CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#0B122B] text-base">
                <FileText className="w-5 h-5 text-[#3562E8]" />
                <span>Quick notes</span>
              </div>
              <span className="text-[11px] font-semibold text-[#696E82]">Saved on this device</span>
            </div>

            <textarea
              rows={6}
              value={scratchpadNote}
              onChange={(e) => handleSaveScratchpad(e.target.value)}
              placeholder="Capture site notes, ideas or reminders..."
              className="w-full p-3.5 rounded-2xl border border-[#E2E6F0] bg-[#F8F9FE] text-xs text-[#0B122B] placeholder:text-[#696E82]/70 focus:outline-none focus:border-[#3562E8] resize-none transition-colors"
            />

            <div className="text-[11px] text-[#696E82]">Available offline on this device.</div>
          </div>

          {/* MY LEAVE CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-[#0B122B] text-base">
              <Calendar className="w-5 h-5 text-[#3562E8]" />
              <span>My leave</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-[#E2E6F0] bg-[#F8F9FE] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#696E82]">
                  <Calendar className="w-4 h-4 text-[#3562E8]" />
                  <span>Upcoming approved leave</span>
                </div>
                <div className="text-xs font-medium text-[#0B122B] pt-0.5">
                  {upcomingLeaves.length === 0 ? (
                    "None scheduled"
                  ) : (
                    <span>
                      {upcomingLeaves[0].startDate} — {upcomingLeaves[0].endDate} ({upcomingLeaves[0].leaveType})
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#E2E6F0] bg-[#F8F9FE] space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#696E82]">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Pending requests</span>
                </div>
                <div className="text-xs font-medium text-[#0B122B] pt-0.5">
                  {pendingLeaves.length === 0 ? "None" : `${pendingLeaves.length} application(s) under review`}
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/w/${workspaceSlug}/leave/my-leave`)}
              className="w-full py-2.5 rounded-xl border border-[#3562E8] bg-white hover:bg-[#F8F9FE] text-[#3562E8] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage my leave</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: MICRO-DELEGATION ================= */}
      {redelegateModalOpen && taskToDelegate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delegate-modal-title"
            className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 id="delegate-modal-title" className="text-base font-bold text-[#0B122B] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#3562E8]" />
                  <span>Delegate deliverable</span>
                </h3>
                <p className="text-xs text-[#696E82] mt-0.5 truncate max-w-xs">{taskToDelegate.title}</p>
              </div>
              <button
                onClick={() => setRedelegateModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRedelegate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#0B122B] mb-1">
                  Assignee team member
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B]"
                  required
                >
                  <option value="">Select a team member...</option>
                  {(data?.teamMembers || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} {m.designation ? `(${m.designation})` : ""} — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B122B] mb-1">
                  Delegation notes
                </label>
                <textarea
                  rows={3}
                  value={delegationReason}
                  onChange={(e) => setDelegationReason(e.target.value)}
                  placeholder="Detail instructions for the team member..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setRedelegateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedAssigneeId}
                  className="px-5 py-2 rounded-xl bg-[#3562E8] text-white font-bold hover:bg-[#284ebd] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Delegating..." : "Confirm delegation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEADLINE EXTENSION ================= */}
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
                <h3 id="extension-modal-title" className="text-base font-bold text-[#0B122B] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Request deadline extension</span>
                </h3>
                <p className="text-xs text-[#696E82] mt-0.5 truncate max-w-xs">{selectedTask.title}</p>
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
                <label className="block text-xs font-semibold text-[#0B122B] mb-1">
                  Extension days needed
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtensionDays(d)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        extensionDays === d
                          ? "bg-[#3562E8] text-white border-[#3562E8]"
                          : "bg-white text-[#696E82] border-[#E2E6F0] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B122B] mb-1">
                  Reason for extension
                </label>
                <textarea
                  rows={3}
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Explain why the deliverable requires an extension..."
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
                  className="px-5 py-2 rounded-xl bg-[#3562E8] text-white font-bold hover:bg-[#284ebd] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BLOCKER ESCALATION ================= */}
      {blockerModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blocker-modal-title"
            className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 id="blocker-modal-title" className="text-base font-bold text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Escalate task blocker</span>
                </h3>
                <p className="text-xs text-[#696E82] mt-0.5 truncate max-w-xs">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setBlockerModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportBlocker} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                Reporting a blocker immediately moves this deliverable to the <strong>Decision Inbox</strong> and alerts studio leadership.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B122B] mb-1">
                  Blocker description
                </label>
                <textarea
                  rows={3}
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Detail what is blocking this deliverable (e.g., Awaiting client design approval)..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setBlockerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !blockerReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Escalate to leadership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Drawing Airlock Flyout Modal */}
      {airlockModalOpen && airlockDrawingData && (
        <VisualDrawingAirlock
          isOpen={airlockModalOpen}
          onClose={() => setAirlockModalOpen(false)}
          drawingData={airlockDrawingData as DrawingAirlockData}
          onApprove={() => {
            setAirlockModalOpen(false);
            fetchWork();
          }}
          onRequestChanges={() => {
            setAirlockModalOpen(false);
            fetchWork();
          }}
        />
      )}
    </div>
  );
}
