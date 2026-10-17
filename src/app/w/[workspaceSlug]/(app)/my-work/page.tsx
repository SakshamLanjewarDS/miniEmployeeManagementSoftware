"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Pause,
  RotateCcw,
  Send,
  HelpCircle,
  FileText,
  ShieldAlert,
  ArrowRight,
  ListTodo,
  Compass,
  MapPin,
  Users,
  Layers,
  LayoutGrid,
  List,
  Flame,
  ShieldCheck,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  Tag,
  ChevronDown,
  Timer,
  Sliders,
  Sparkles,
  Radio,
  Zap,
  Briefcase,
  UserCheck,
  UserPlus,
  StickyNote,
} from "lucide-react";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";
import { VisualDrawingAirlock, DrawingAirlockData } from "@/components/drawings/VisualDrawingAirlock";

export default function DailyEmployeeWorkDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  // --- Primary Executive Dual-Lens State (Phase 1) ---
  const [primaryLens, setPrimaryLens] = useState<"my-work" | "delegated">("my-work");
  const [activeTab, setActiveTab] = useState<"awaiting-action" | "waiting-others">("awaiting-action");
  const [layoutMode, setLayoutMode] = useState<"LIST" | "MATRIX">("LIST");

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

  // --- Phase 1: Micro-Delegation Modal State ---
  const [redelegateModalOpen, setRedelegateModalOpen] = useState(false);
  const [taskToDelegate, setTaskToDelegate] = useState<any | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [delegationReason, setDelegationReason] = useState("");

  // --- Phase 2: Drawing Airlock Flyout Modal State ---
  const [airlockModalOpen, setAirlockModalOpen] = useState(false);
  const [airlockDrawingData, setAirlockDrawingData] = useState<Partial<DrawingAirlockData> | null>(null);
  const [airlockTaskReference, setAirlockTaskReference] = useState<any | null>(null);

  // --- Phase 2: Timeline Visibility State ---
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  // --- Phase 3: Pro Focus Sprint HUD State & Billable Hours ---
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState<number>(25 * 60);
  const [initialPomodoroSeconds, setInitialPomodoroSeconds] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState<boolean>(false);
  const [pomodoroTaskTitle, setPomodoroTaskTitle] = useState<string>("Executive Design Sprint");
  const [focusProjectId, setFocusProjectId] = useState<string>("");
  const [focusTaskId, setFocusTaskId] = useState<string>("");
  const [isFocusHudExpanded, setIsFocusHudExpanded] = useState(false);

  // --- Phase 3: Quick Site Scratchpad State ---
  const [scratchpadNote, setScratchpadNote] = useState<string>("");
  const [isScratchpadSaved, setIsScratchpadSaved] = useState<boolean>(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setTimeout(() => setIsScratchpadSaved(true), 600);
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

  // --- Phase 1: Real-time SSE Live Bus Integration ---
  const { isConnected } = useStudioRealtime({
    workspaceSlug,
    autoRefresh: false,
    onEvent: (event) => {
      if (["TASK_UPDATED", "DECISION_UPDATED", "DRAWING_UPDATED", "METRICS_REFRESH"].includes(event.type)) {
        fetchWork();
      }
    },
  });

  // Keyboard shortcut listener for Focus timer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If focus is inside an input, textarea, or contentEditable, do not trigger spacebar shortcut
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT" ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (e.code === "Space" && !isInput && e.altKey) {
        e.preventDefault();
        setIsPomodoroRunning((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      // Automatically sync to focus dock
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

  // Phase 1: Micro-Delegation Submit
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
      setToastMessage({ type: "success", text: "Deliverable successfully reassigned to team member." });
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

  // Interactive Checklist Toggle with Optimistic UI update
  const [expandedChecklistTaskId, setExpandedChecklistTaskId] = useState<string | null>(null);

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

  // Phase 3: Pomodoro Focus Timer Dock
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

  // Phase 3: Log Billable Focus Time to Project Timesheet
  const handleLogFocusTime = async () => {
    const elapsedSeconds = initialPomodoroSeconds - pomodoroSecondsLeft;
    if (elapsedSeconds < 60) {
      setToastMessage({ type: "error", text: "Sprint must run for at least 1 minute to log billable hours." });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/timer?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: focusTaskId || undefined,
          projectId: focusProjectId || undefined,
          durationSeconds: elapsedSeconds,
          notes: `Sprint Focus: ${pomodoroTaskTitle}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to log sprint hours");

      setToastMessage({
        type: "success",
        text: `Logged ${(elapsedSeconds / 60).toFixed(1)} mins to project billable timesheet!`,
      });
      // Reset timer
      setPomodoroSecondsLeft(initialPomodoroSeconds);
      setIsPomodoroRunning(false);
    } catch (e: any) {
      setToastMessage({ type: "error", text: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 2: Open Drawing Airlock Drawer
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
        label: "Approved Structural Baseline",
        date: "2026-09-28",
        author: "Principal Architect",
        status: "APPROVED",
      },
      revisionB: {
        code: docRef?.latestRevision || "R2.1",
        label: "Revised MEP & Column Conduits",
        date: "Today, 10:30 IST",
        author: task.assignee?.fullName || "Lead Project Drafter",
        status: "FOR_REVIEW",
        changeSummary: "Shifted shear wall opening 350mm north; aligned duct drop with structural girder clearance.",
      },
    };
    setAirlockDrawingData(airlockPayload);
    setAirlockTaskReference(task);
    setAirlockModalOpen(true);
  };

  const metrics = data?.metrics;
  const isPrivileged = data?.role === "OWNER" || data?.role === "ADMIN" || data?.role === "PROJECT_MANAGER";

  // Filter tasks based on search & priority
  const filterList = (items: any[]) =>
    items.filter((item: any) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  const studioBlockers = data?.studioBlockers || [];

  // Phase 3: Eisenhower Quadrants Computation
  const q1UrgentFirefighting = awaitingActionItems.filter((i) => i.isOverdue || i.priority === "URGENT");
  const q2DeepWorkStrategic = awaitingActionItems.filter((i) => !i.isOverdue && (i.priority === "HIGH" || i.isDueToday));
  const q3RapidTriage = awaitingActionItems.filter((i) => !i.isOverdue && i.priority !== "URGENT" && i.priority !== "HIGH" && !i.isDueToday);
  const q4DelegatedWatch = delegatedItems;

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

      {/* ================= EXECUTIVE HEADER & DUAL-LENS COCKPIT ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E2E6F0] shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0B122B] tracking-tight">My Work Today</h1>
            <LiveSyncIndicator isConnected={isConnected} />
            {isPrivileged && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D] border border-[#5A81FA]/30 uppercase tracking-wider">
                Executive Mode
              </span>
            )}
          </div>
          <p className="text-xs text-[#696E82]">
            Daily high-priority deliverables, CAD drawing airlock reviews, and studio delegation queue
          </p>
        </div>

        {/* Dual-Lens Primary Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Phase 1: Executive Dual-Lens Toggle */}
          <div className="flex items-center p-1 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <button
              onClick={() => setPrimaryLens("my-work")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                primaryLens === "my-work"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "text-[#696E82] hover:text-[#0B122B]"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>My Deliverables</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${primaryLens === "my-work" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                {metrics?.totalActive ?? 0}
              </span>
            </button>

            {isPrivileged && (
              <button
                onClick={() => setPrimaryLens("delegated")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  primaryLens === "delegated"
                    ? "bg-[#0B122B] text-white shadow-xs"
                    : "text-[#696E82] hover:text-[#0B122B]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Delegated Watchlist</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${primaryLens === "delegated" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {metrics?.totalDelegated ?? 0}
                </span>
              </button>
            )}
          </div>

          {/* Phase 3: List vs Eisenhower Matrix toggle */}
          {primaryLens === "my-work" && (
            <div className="flex items-center p-1 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
              <button
                onClick={() => setLayoutMode("LIST")}
                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  layoutMode === "LIST" ? "bg-white text-[#3562E8] shadow-2xs font-bold" : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode("MATRIX")}
                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  layoutMode === "MATRIX" ? "bg-white text-[#3562E8] shadow-2xs font-bold" : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
                title="Eisenhower Matrix View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={fetchWork}
            className="px-3 py-1.5 rounded-xl border border-[#E2E6F0] bg-white text-xs font-semibold text-[#1F1F1F] hover:bg-[#F8F9FE] flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#5A81FA]" : "text-[#696E82]"}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= METRICS ROW ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryLens === "my-work" ? (
          <>
            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Awaiting My Action
              </div>
              <div className="text-2xl font-extrabold text-[#3562E8] mt-2 font-mono">
                {metrics?.awaitingMyAction ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Assigned work needing your progress</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Overdue Deliverables
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
                {metrics?.overdue ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Past scheduled studio deadline</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Due Today (EOD)
              </div>
              <div className="text-2xl font-extrabold text-amber-600 mt-2 font-mono">
                {metrics?.dueToday ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Requires release before 18:30 IST</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Waiting for Others
              </div>
              <div className="text-2xl font-extrabold text-slate-700 mt-2 font-mono">
                {metrics?.waitingForOthers ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">In client review or lead unblocking</div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Active Delegated
              </div>
              <div className="text-2xl font-extrabold text-[#0B122B] mt-2 font-mono">
                {metrics?.totalDelegated ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Team deliverables under your watch</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Delegated Overdue
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
                {metrics?.delegatedOverdue ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Team tasks slipping schedule</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Delegated Due Today
              </div>
              <div className="text-2xl font-extrabold text-amber-600 mt-2 font-mono">
                {metrics?.delegatedDueToday ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Scheduled for team delivery today</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                Team Blockers
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-2 font-mono">
                {metrics?.delegatedBlocked ?? 0}
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">Awaiting leadership intervention</div>
            </div>
          </>
        )}
      </div>

      {/* ================= PHASE 2: CHRONOLOGICAL DAY TIMELINE (08:00 - 19:00) ================= */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E6F0]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#3562E8]" />
            <h2 className="text-xs font-bold text-[#0B122B] uppercase tracking-wider">
              Today's Chronological Schedule & Field Timeline
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F8F9FE] text-[#5A81FA] border border-[#CEDEFF] font-mono">
              {timelineEvents.length} Events
            </span>
          </div>

          <button
            onClick={() => setTimelineExpanded(!timelineExpanded)}
            className="text-xs font-semibold text-[#5A81FA] hover:text-[#3562E8] flex items-center gap-1 cursor-pointer"
          >
            <span>{timelineExpanded ? "Collapse Timeline" : "Expand Ribbon"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${timelineExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {timelineExpanded && (
          <div className="pt-4">
            {timelineEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#696E82] bg-[#F8F9FD] rounded-2xl">
                No meetings or scheduled site inspections registered for today.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 touch-scroll-x">
                {timelineEvents.map((evt: any) => (
                  <div
                    key={evt.id}
                    className={`shrink-0 w-64 p-3.5 rounded-2xl border transition-all ${
                      evt.type === "MEETING"
                        ? "bg-indigo-50/40 border-indigo-200"
                        : evt.type === "SITE_VISIT"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-amber-50/40 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono font-bold text-[#0B122B] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5A81FA]" />
                        {evt.time} {evt.endTime ? `– ${evt.endTime}` : ""}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          evt.type === "MEETING"
                            ? "bg-indigo-100 text-indigo-800"
                            : evt.type === "SITE_VISIT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {evt.badge}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#1F1F1F] truncate" title={evt.title}>
                      {evt.title}
                    </div>
                    {evt.subtitle && (
                      <div className="text-[11px] text-[#696E82] truncate mt-0.5">
                        {evt.subtitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MAIN OPERATIONAL GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (65%): Task Cards & Deliverables */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sub-tabs & Search/Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E6F0] shadow-2xs">
            {primaryLens === "my-work" ? (
              <div className="flex items-center gap-1 p-1 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] overflow-x-auto touch-scroll-x">
                <button
                  onClick={() => setActiveTab("awaiting-action")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === "awaiting-action"
                      ? "bg-[#3562E8] text-white shadow-2xs"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  Awaiting My Action ({metrics?.awaitingMyAction ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab("waiting-others")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    activeTab === "waiting-others"
                      ? "bg-slate-800 text-white shadow-2xs"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  Waiting for Others ({metrics?.waitingForOthers ?? 0})
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-[#0B122B] px-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#3562E8]" />
                <span>Active Delegated Tasks Across Studio Teams</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter deliverables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#3562E8] w-full sm:w-44"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#3562E8]"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* ================= PHASE 3: EISENHOWER CRITICAL PATH MATRIX VIEW ================= */}
          {primaryLens === "my-work" && layoutMode === "MATRIX" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quadrant 1: Urgent Firefighting */}
              <div className="p-4 bg-white rounded-3xl border border-rose-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>Q1: Urgent Firefighting</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {q1UrgentFirefighting.length}
                  </span>
                </div>
                {q1UrgentFirefighting.length === 0 ? (
                  <p className="text-[11px] text-[#696E82] py-4 text-center">No overdue or emergency items.</p>
                ) : (
                  <div className="space-y-2">
                    {q1UrgentFirefighting.map((task) => (
                      <div key={task.id} className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/20 text-xs space-y-1">
                        <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] font-mono text-rose-600 font-bold shrink-0">{task.project?.code}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          {task.drawingRef && (
                            <button
                              onClick={() => handleOpenDrawingAirlock(task)}
                              className="text-[10px] text-[#3562E8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Inspect Diff</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleStartWork(task.id, task.title)}
                            className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer hover:bg-rose-700 ml-auto"
                          >
                            Execute Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 2: Deep Work Strategic */}
              <div className="p-4 bg-white rounded-3xl border border-blue-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3562E8]">
                    <Sparkles className="w-4 h-4 text-[#3562E8]" />
                    <span>Q2: Deep Strategic Work</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#3562E8]">
                    {q2DeepWorkStrategic.length}
                  </span>
                </div>
                {q2DeepWorkStrategic.length === 0 ? (
                  <p className="text-[11px] text-[#696E82] py-4 text-center">No strategic deliverables scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {q2DeepWorkStrategic.map((task) => (
                      <div key={task.id} className="p-2.5 rounded-xl border border-[#CEDEFF] bg-blue-50/20 text-xs space-y-1">
                        <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] font-mono text-[#3562E8] font-bold shrink-0">{task.project?.code}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          {task.drawingRef && (
                            <button
                              onClick={() => handleOpenDrawingAirlock(task)}
                              className="text-[10px] text-[#3562E8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Diff v{task.drawingRef.latestRevision}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleStartWork(task.id, task.title)}
                            className="px-2 py-0.5 rounded-lg bg-[#3562E8] text-white text-[10px] font-bold cursor-pointer hover:bg-[#284ebd] ml-auto"
                          >
                            Sprint Focus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 3: Rapid Triage */}
              <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <CheckSquare className="w-4 h-4 text-slate-600" />
                    <span>Q3: Rapid Triage & Sign-offs</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {q3RapidTriage.length}
                  </span>
                </div>
                {q3RapidTriage.length === 0 ? (
                  <p className="text-[11px] text-[#696E82] py-4 text-center">All quick items processed.</p>
                ) : (
                  <div className="space-y-2">
                    {q3RapidTriage.map((task) => (
                      <div key={task.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs space-y-1">
                        <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] font-mono text-slate-500">{task.project?.code}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => handleSubmitReview(task.id)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer hover:bg-emerald-700"
                          >
                            Sign-Off
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quadrant 4: Delegated Watchlist */}
              <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B122B]">
                    <Users className="w-4 h-4 text-[#0B122B]" />
                    <span>Q4: Delegated Watchlist</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-[#0B122B]">
                    {q4DelegatedWatch.length}
                  </span>
                </div>
                {q4DelegatedWatch.length === 0 ? (
                  <p className="text-[11px] text-[#696E82] py-4 text-center">No delegated tasks monitored.</p>
                ) : (
                  <div className="space-y-2">
                    {q4DelegatedWatch.slice(0, 4).map((task) => (
                      <div key={task.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs space-y-1">
                        <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] text-slate-600">{task.assignee?.fullName || "Unassigned"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= STANDARD LIST VIEW RENDER ================= */
            <div className="space-y-3">
              {loading ? (
                <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
                  Loading your daily operational work...
                </div>
              ) : primaryLens === "my-work" ? (
                /* My Deliverables List */
                (activeTab === "awaiting-action" ? awaitingActionItems : waitingOthersItems).length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <div className="font-bold text-[#1F1F1F] text-sm">You are all caught up!</div>
                    <p className="mt-1">No active deliverables currently require your action in this tab.</p>
                  </div>
                ) : (
                  (activeTab === "awaiting-action" ? awaitingActionItems : waitingOthersItems).map((task: any) => (
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
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-[#1F1F1F]">{task.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#3562E8] border border-[#CEDEFF] font-mono">
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

                            {/* Phase 2: Drawing Airlock Trigger Badge */}
                            {task.drawingRef && (
                              <button
                                onClick={() => handleOpenDrawingAirlock(task)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Inspect Drawing Vector Diff"
                              >
                                <Layers className="w-3 h-3 text-emerald-700" />
                                <span>Diff: {task.drawingRef.latestRevision}</span>
                              </button>
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
                                <Calendar className="w-3 h-3 text-[#3562E8]" />
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {task.checklistProgress && task.checklistProgress.total > 0 && (
                              <div className="flex items-center gap-1 font-mono">
                                <ListTodo className="w-3 h-3 text-[#3562E8]" />
                                <span>
                                  Checklist: {task.checklistProgress.completed}/{task.checklistProgress.total}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Expandable Inline Checklist */}
                          {task.checklistItems && task.checklistItems.length > 0 && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setExpandedChecklistTaskId(expandedChecklistTaskId === task.id ? null : task.id)}
                                className="text-[11px] font-semibold text-[#3562E8] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <ListTodo className="w-3.5 h-3.5" />
                                <span>
                                  {expandedChecklistTaskId === task.id
                                    ? "Hide Checklist"
                                    : `View & Update Checklist (${task.checklistProgress?.completed}/${task.checklistProgress?.total})`}
                                </span>
                              </button>

                              {expandedChecklistTaskId === task.id && (
                                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 animate-in fade-in-0 duration-150">
                                  {task.checklistItems.map((ci: any) => (
                                    <label key={ci.id} className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={ci.isCompleted}
                                        onChange={() => handleToggleChecklist(task.id, ci.id, ci.isCompleted)}
                                        className="w-4 h-4 rounded border-slate-300 text-[#3562E8] focus:ring-[#3562E8] mt-0.5 cursor-pointer"
                                      />
                                      <span className={ci.isCompleted ? "line-through text-slate-400" : "font-medium"}>
                                        {ci.title}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Actions for Assignee / Owner */}
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
                              onClick={() => handleStartWork(task.id, task.title)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start Sprint</span>
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

                          <div className="flex items-center gap-1">
                            {/* Phase 1: Micro-Delegation Button */}
                            {isPrivileged && (
                              <button
                                onClick={() => {
                                  setTaskToDelegate(task);
                                  setSelectedAssigneeId("");
                                  setDelegationReason("");
                                  setRedelegateModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-xl border border-[#CEDEFF] bg-[#F8F9FE] hover:bg-[#F2F4FF] text-[10px] text-[#2C308D] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="Delegate deliverable to team member"
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
                              className="px-2 py-1 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[10px] text-[#696E82] font-semibold transition-colors cursor-pointer"
                              title="Request Deadline Extension"
                            >
                              Extension
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setBlockerReason("");
                                setBlockerModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-[10px] text-rose-700 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                              title="Flag Blocker"
                            >
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Blocker</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* ================= PHASE 1: DELEGATED WATCHLIST RENDER ================= */
                delegatedItems.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
                    <Users className="w-8 h-8 text-[#5A81FA] mx-auto mb-2" />
                    <div className="font-bold text-[#1F1F1F] text-sm">No Delegated Deliverables</div>
                    <p className="mt-1">All team deliverables assigned across projects are up-to-date or complete.</p>
                  </div>
                ) : (
                  delegatedItems.map((task: any) => (
                    <div
                      key={task.id}
                      className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs ${
                        task.isOverdue
                          ? "border-rose-300 bg-rose-50/15"
                          : task.isBlocked
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-[#E2E6F0]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-[#1F1F1F]">{task.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#3562E8] border border-[#CEDEFF] font-mono">
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
                            {task.isBlocked && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-700 text-white flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                Blocked
                              </span>
                            )}
                            {task.isWaitingReview && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                In Review
                              </span>
                            )}

                            {task.drawingRef && (
                              <button
                                onClick={() => handleOpenDrawingAirlock(task)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Layers className="w-3 h-3 text-emerald-700" />
                                <span>CAD Diff</span>
                              </button>
                            )}
                          </div>

                          {/* Assignee Badge */}
                          <div className="flex items-center gap-2 text-xs pt-0.5">
                            <div className="w-5 h-5 rounded-full bg-[#0B122B] text-white flex items-center justify-center text-[10px] font-bold">
                              {task.assignee?.fullName?.charAt(0) || "U"}
                            </div>
                            <span className="font-semibold text-[#1F1F1F]">{task.assignee?.fullName || "Unassigned"}</span>
                            {task.assignee?.designation && (
                              <span className="text-[11px] text-[#696E82]">({task.assignee.designation})</span>
                            )}
                          </div>

                          {task.blockerReason && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                              <strong>Team Blocker:</strong> {task.blockerReason}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#696E82]">
                            {task.dueDate && (
                              <div className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-[#3562E8]" />
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {task.checklistProgress && task.checklistProgress.total > 0 && (
                              <div className="flex items-center gap-1 font-mono">
                                <ListTodo className="w-3 h-3 text-[#3562E8]" />
                                <span>
                                  Checklist: {task.checklistProgress.completed}/{task.checklistProgress.total}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delegated Actions for Leadership */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                          <button
                            onClick={() => {
                              setTaskToDelegate(task);
                              setSelectedAssigneeId("");
                              setDelegationReason("");
                              setRedelegateModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-[#CEDEFF] bg-[#F8F9FE] hover:bg-[#F2F4FF] text-[#2C308D] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Re-Route</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN (35%): EXECUTIVE CONTEXT & BLOCKERS ================= */}
        <div className="space-y-5">
          {/* Phase 3: Active Studio Blockers Needing Leadership Action */}
          {studioBlockers.length > 0 && (
            <div className="bg-white rounded-3xl border border-rose-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                <div className="flex items-center gap-2 text-rose-700">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Studio Blocker Clearing</h3>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {studioBlockers.length} Blocked
                </span>
              </div>

              <div className="space-y-2">
                {studioBlockers.map((b: any) => (
                  <div key={b.id} className="p-3 bg-rose-50/40 border border-rose-200/80 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F1F1F] truncate">{b.title}</span>
                      <span className="text-[10px] font-mono text-[#3562E8] font-bold">{b.projectCode}</span>
                    </div>
                    <p className="text-[11px] text-rose-800">{b.blockerReason}</p>
                    <div className="text-[10px] text-[#696E82] flex items-center justify-between pt-1">
                      <span>Owner: {b.assigneeName}</span>
                      <button
                        onClick={() => router.push(`/w/${workspaceSlug}/inbox`)}
                        className="text-[#3562E8] font-bold hover:underline cursor-pointer"
                      >
                        Unblock in Inbox →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Executive Site Scratchpad & Quick Punch-list */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#3562E8]" />
                <h3 className="text-xs font-bold text-[#0B122B] uppercase tracking-wider">Site & Field Scratchpad</h3>
              </div>
              <span className={`text-[10px] font-semibold ${isScratchpadSaved ? "text-emerald-600" : "text-amber-600"}`}>
                {isScratchpadSaved ? "Synced" : "Saving..."}
              </span>
            </div>

            <textarea
              rows={4}
              value={scratchpadNote}
              onChange={(e) => handleSaveScratchpad(e.target.value)}
              placeholder="Jot rapid field notes, MEP coordination memos, or contractor punch-list reminders..."
              className="w-full p-3 rounded-2xl border border-[#E2E6F0] bg-[#F8F9FE] text-xs focus:outline-none focus:border-[#3562E8] resize-none"
            />
            <p className="text-[10px] text-[#696E82]">Notes are automatically cached locally for offline site visits.</p>
          </div>

          {/* Leave & Out of Office Context Card */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3562E8]" />
                <h3 className="text-xs font-bold text-[#0B122B] uppercase tracking-wider">My Leave Context</h3>
              </div>
              <span className="text-[11px] font-bold font-mono text-[#3562E8]">
                {data?.employeeInfo?.fullName || "Leadership"}
              </span>
            </div>

            {/* Upcoming Approved Leaves */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
                Approved Upcoming Absences
              </span>
              {upcomingLeaves.length === 0 ? (
                <div className="p-3 bg-[#F8F9FD] rounded-xl text-[11px] text-[#696E82]">
                  No upcoming approved leaves scheduled.
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

      {/* ================= PHASE 1 MODAL: MICRO-DELEGATION ================= */}
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
                  <span>Delegate Deliverable</span>
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
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Assignee Team Member
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-semibold text-[#1F1F1F]"
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
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Delegation Instructions / Note
                </label>
                <textarea
                  rows={3}
                  value={delegationReason}
                  onChange={(e) => setDelegationReason(e.target.value)}
                  placeholder="Detail instructions for the project lead (e.g., Take over CAD drafting revisions based on redlines attached)..."
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
                  {actionLoading ? "Delegating..." : "Confirm Delegation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PHASE 2 MODAL: DRAWING AIRLOCK VECTOR VIEWER ================= */}
      {airlockModalOpen && airlockDrawingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-700 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Airlock Header */}
            <div className="flex items-center justify-between p-4 bg-[#0B122B] text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#3562E8] text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight">{airlockDrawingData.drawingCode}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-[#CEDEFF]">
                      {airlockDrawingData.projectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{airlockDrawingData.drawingTitle}</p>
                </div>
              </div>

              <button
                onClick={() => setAirlockModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Airlock Interactive Canvas */}
            <div className="flex-1 overflow-hidden p-3 bg-slate-900">
              <VisualDrawingAirlock
                data={airlockDrawingData}
                onApprove={() => {
                  setToastMessage({ type: "success", text: `Drawing ${airlockDrawingData.drawingCode} approved for release!` });
                  setAirlockModalOpen(false);
                }}
                onRequestChanges={(notes) => {
                  setToastMessage({ type: "error", text: `Redlines forwarded to lead architect: "${notes}"` });
                  setAirlockModalOpen(false);
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-[#696E82] truncate max-w-xs">{selectedTask.title}</p>
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
                  className="px-5 py-2 rounded-xl bg-[#3562E8] text-white font-bold hover:bg-[#284ebd] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: FLAG BLOCKER ================= */}
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
                  <span>Escalate Task Blocker</span>
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
                Reporting a blocker immediately moves this deliverable to the <strong>Decision Inbox</strong> and alerts the Principal Architect for resolution.
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Blocker Cause / Missing Information
                </label>
                <textarea
                  rows={3}
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Detail what is blocking this deliverable (e.g., Awaiting MEP duct levels, Client color selection pending)..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:ring-2 focus:ring-rose-500/20"
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
                  {actionLoading ? "Submitting..." : "Escalate to Leadership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PHASE 3: PRO STUDIO FOCUS & BILLABLE HOURS HUD ================= */}
      <div className="fixed bottom-6 right-6 z-40 bg-[#0B122B]/95 backdrop-blur-md text-white rounded-3xl shadow-2xl border border-slate-700 p-3 sm:p-4 animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <div className="font-mono font-bold text-base text-amber-400">
              {formatTimer(pomodoroSecondsLeft)}
            </div>
          </div>

          <div className="hidden sm:block max-w-[140px] truncate text-[11px] text-slate-300 font-medium">
            {pomodoroTaskTitle}
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              type="button"
              onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title={isPomodoroRunning ? "Pause (Alt+Space)" : "Start (Alt+Space)"}
            >
              {isPomodoroRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPomodoroRunning(false);
                setPomodoroSecondsLeft(initialPomodoroSeconds);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsFocusHudExpanded(!isFocusHudExpanded)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Project Allocation Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Project Timesheet Settings */}
        {isFocusHudExpanded && (
          <div className="pt-3 mt-3 border-t border-slate-800 space-y-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Charge Time to Project
              </label>
              <select
                value={focusProjectId}
                onChange={(e) => setFocusProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">No Project Selected</option>
                {(data?.projects || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setInitialPomodoroSeconds(25 * 60);
                  setPomodoroSecondsLeft(25 * 60);
                }}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                  initialPomodoroSeconds === 25 * 60 ? "bg-[#3562E8] text-white" : "bg-white/10 text-slate-300"
                }`}
              >
                25m
              </button>
              <button
                type="button"
                onClick={() => {
                  setInitialPomodoroSeconds(50 * 60);
                  setPomodoroSecondsLeft(50 * 60);
                }}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                  initialPomodoroSeconds === 50 * 60 ? "bg-[#3562E8] text-white" : "bg-white/10 text-slate-300"
                }`}
              >
                50m Deep
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogFocusTime}
              disabled={actionLoading}
              className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Billable Time</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
