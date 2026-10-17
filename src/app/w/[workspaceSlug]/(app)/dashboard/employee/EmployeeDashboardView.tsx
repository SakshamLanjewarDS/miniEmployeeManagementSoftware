"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
  Play,
  Pause,
  RotateCcw,
  Send,
  AlertCircle,
  MapPin,
  Bell,
  RefreshCw,
  FolderKanban,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck2,
  Calendar,
  Target,
  Flame,
  Award,
  Zap,
  Compass,
  Download,
  Eye,
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  Radio,
  HardHat,
  Save,
  Mic,
  SlidersHorizontal,
  Square,
  Sun,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { EmployeeDashboardData } from "@/server/modules/dashboard/service";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";

interface EmployeeDashboardViewProps {
  data: EmployeeDashboardData;
  workspaceSlug: string;
  userRole: string;
  userFullName: string;
  membershipId: string;
  timezone: string;
}

// Haversine distance calculator in meters
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
  const [activeTab, setActiveTab] = useState<"MY_DAY" | "QUEUE" | "DRAWINGS" | "VISITS" | "SCRATCHPAD">("MY_DAY");
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "TODAY" | "OVERDUE" | "REVIEW" | "CHANGES">("ALL");

  // Realtime Live SSE Bus Sync
  const { isConnected, lastEvent, forceRefresh } = useStudioRealtime({
    workspaceSlug,
    autoRefresh: true,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    forceRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Focus Mode state
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  // Time Tracker / Pomodoro state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMode, setTimerMode] = useState<"STOPWATCH" | "POMODORO">("STOPWATCH");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [timerNotes, setTimerNotes] = useState("");
  const [isSavingTime, setIsSavingTime] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // GPS Geolocation state for 1-Click Check-In
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutFindings, setCheckOutFindings] = useState("");
  const [checkOutNextActions, setCheckOutNextActions] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Field Scratchpad & Voice Memos state
  const [memoText, setMemoText] = useState("");
  const [savedMemos, setSavedMemos] = useState<Array<{ id: string; text: string; date: string }>>([]);
  const [convertingMemo, setConvertingMemo] = useState<{ id: string; text: string } | null>(null);
  const [convertProjectId, setConvertProjectId] = useState("");
  const [convertTitle, setConvertTitle] = useState("");
  const [convertPriority, setConvertPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [convertDueDate, setConvertDueDate] = useState("");
  const [isConvertingTask, setIsConvertingTask] = useState(false);

  // Review submission modal state
  const [submitModalItem, setSubmitModalItem] = useState<{ id: string; taskId: string; title: string; isChecklistItem: boolean } | null>(null);
  const [submissionComment, setSubmissionComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Blocker report modal state
  const [blockerModalItem, setBlockerModalItem] = useState<{ id: string; taskId: string; title: string; isChecklistItem: boolean } | null>(null);
  const [blockerReason, setBlockerReason] = useState("");
  const [isSubmittingBlocker, setIsSubmittingBlocker] = useState(false);
  const [acknowledgingTaskId, setAcknowledgingTaskId] = useState<string | null>(null);
  const [togglingChecklistId, setTogglingChecklistId] = useState<string | null>(null);

  // Load saved timer and memos from localStorage
  useEffect(() => {
    try {
      const storedTimer = localStorage.getItem("100design_active_timer");
      if (storedTimer) {
        const parsed = JSON.parse(storedTimer);
        setTimerSeconds(parsed.seconds || 0);
        setSelectedProjectId(parsed.projectId || "");
        setSelectedTaskId(parsed.taskId || "");
      }
      const storedMemos = localStorage.getItem("100design_field_memos");
      if (storedMemos) {
        setSavedMemos(JSON.parse(storedMemos));
      }
    } catch {
      // Ignore storage read error
    }
  }, []);

  // Timer tick effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const next = timerMode === "POMODORO" ? Math.max(0, prev - 1) : prev + 1;
          localStorage.setItem(
            "100design_active_timer",
            JSON.stringify({ seconds: next, projectId: selectedProjectId, taskId: selectedTaskId })
          );
          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerMode, selectedProjectId, selectedTaskId]);

  // Request browser geolocation for active site visit
  useEffect(() => {
    if (data.activeSiteInspection && data.activeSiteInspection.siteLatitude && data.activeSiteInspection.siteLongitude) {
      if ("geolocation" in navigator) {
        setIsGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            setUserCoords({ lat: userLat, lng: userLng });

            const dist = calculateHaversineDistance(
              userLat,
              userLng,
              data.activeSiteInspection!.siteLatitude!,
              data.activeSiteInspection!.siteLongitude!
            );
            setGpsDistance(dist);
            setIsGpsLoading(false);
          },
          (err) => {
            console.warn("GPS error:", err);
            setIsGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
  }, [data.activeSiteInspection]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Timer format (HH:MM:SS)
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartTimer = () => {
    if (timerMode === "POMODORO" && timerSeconds === 0) {
      setTimerSeconds(25 * 60); // 25 minutes Pomodoro
    }
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(timerMode === "POMODORO" ? 25 * 60 : 0);
    localStorage.removeItem("100design_active_timer");
  };

  const handleSaveTimer = async () => {
    if (timerSeconds === 0) return;
    setIsSavingTime(true);
    try {
      await fetch(`/api/tasks/timer?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTaskId || undefined,
          projectId: selectedProjectId || undefined,
          durationSeconds: timerSeconds,
          notes: timerNotes.trim() || "Focus session logged",
        }),
      });
      setActionMessage(`Logged ${formatTime(timerSeconds)} of focused work time!`);
      handleResetTimer();
      setTimerNotes("");
      router.refresh();
    } catch {
      setActionMessage("Failed to log time entry.");
    } finally {
      setIsSavingTime(false);
    }
  };

  // 1-Click GPS Check-In handler
  const handleSiteCheckIn = async () => {
    if (!data.activeSiteInspection) return;
    setIsCheckingIn(true);
    try {
      const res = await fetch(`/api/visits/check-in?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: data.activeSiteInspection.id,
          latitude: userCoords?.lat || data.activeSiteInspection.siteLatitude || undefined,
          longitude: userCoords?.lng || data.activeSiteInspection.siteLongitude || undefined,
          accuracyMeters: 15,
          clientCaptureTime: new Date().toISOString(),
          idempotencyKey: `chk-${data.activeSiteInspection.id}-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to check in");
      }

      setActionMessage("✓ Verified GPS Check-In successfully! You are logged on-site.");
      router.refresh();
    } catch (err: any) {
      setActionMessage(`Check-in error: ${err.message}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // 1-Click GPS Check-Out handler
  const handleSiteCheckOut = async () => {
    if (!data.activeSiteInspection) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch(`/api/visits/check-out?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: data.activeSiteInspection.id,
          latitude: userCoords?.lat || data.activeSiteInspection.siteLatitude || undefined,
          longitude: userCoords?.lng || data.activeSiteInspection.siteLongitude || undefined,
          accuracyMeters: 15,
          findings: checkOutFindings.trim() || undefined,
          nextActions: checkOutNextActions.trim() || undefined,
          idempotencyKey: `chkout-${data.activeSiteInspection.id}-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to check out");
      }

      setIsCheckOutModalOpen(false);
      setCheckOutFindings("");
      setCheckOutNextActions("");
      setActionMessage("✓ Site Inspection Report submitted & Checked-Out successfully!");
      router.refresh();
    } catch (err: any) {
      setActionMessage(`Check-out error: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Save memo to scratchpad
  const handleSaveMemo = () => {
    if (!memoText.trim()) return;
    const newMemo = {
      id: `memo-${Date.now()}`,
      text: memoText.trim(),
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [newMemo, ...savedMemos].slice(0, 15);
    setSavedMemos(updated);
    localStorage.setItem("100design_field_memos", JSON.stringify(updated));
    setMemoText("");
    setActionMessage("Note added to scratchpad!");
  };

  const handleDeleteMemo = (id: string) => {
    const updated = savedMemos.filter((m) => m.id !== id);
    setSavedMemos(updated);
    localStorage.setItem("100design_field_memos", JSON.stringify(updated));
  };

  // Convert scratchpad memo into deliverable
  const handleConvertMemoToTask = async () => {
    if (!convertingMemo || !convertProjectId || !convertTitle.trim()) return;
    setIsConvertingTask(true);
    try {
      await fetch(`/api/tasks/create?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: convertProjectId,
          title: convertTitle.trim(),
          description: convertingMemo.text,
          priority: convertPriority,
          dueDate: convertDueDate ? new Date(convertDueDate).toISOString() : undefined,
          assigneeId: membershipId,
        }),
      });
      handleDeleteMemo(convertingMemo.id);
      setConvertingMemo(null);
      setConvertTitle("");
      setActionMessage("✓ Scratchpad memo converted to deliverable task!");
      router.refresh();
    } catch {
      setActionMessage("Failed to convert memo to task.");
    } finally {
      setIsConvertingTask(false);
    }
  };

  // Acknowledge deliverable assignment
  const handleAcknowledgeTask = async (taskId: string, version: number) => {
    setAcknowledgingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/acknowledge?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, version }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to acknowledge assignment");
      }
      setActionMessage("✓ Assignment acknowledged successfully!");
      router.refresh();
    } catch (err: any) {
      setActionMessage(`Acknowledgement error: ${err.message}`);
    } finally {
      setAcknowledgingTaskId(null);
    }
  };

  // Start work (NOT_STARTED -> IN_PROGRESS)
  const handleStartWork = async (item: { id: string; taskId: string; isChecklistItem: boolean }) => {
    try {
      if (item.isChecklistItem) {
        const res = await fetch(`/api/tasks/start?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: item.taskId,
            checklistItemId: item.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to start checklist task");
        }
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
    } catch (err: any) {
      setActionMessage(`Failed to start task: ${err.message || err}`);
    }
  };

  // Toggle checklist item status from focus mode
  const handleToggleFocusChecklist = async (taskId: string, itemId: string, currentStatus: boolean) => {
    setTogglingChecklistId(itemId);
    try {
      const res = await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          itemId,
          isCompleted: !currentStatus,
        }),
      });
      if (res.ok) {
        setActionMessage(!currentStatus ? "Checklist item marked complete!" : "Checklist item marked incomplete.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionMessage(`Failed to update checklist: ${data.error || "Server error"}`);
      }
    } catch {
      setActionMessage("Failed to update checklist item.");
    } finally {
      setTogglingChecklistId(null);
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

  // Mark task or checklist item completed directly
  const handleCompleteTask = async (item: { id: string; taskId: string; isChecklistItem: boolean }) => {
    try {
      if (item.isChecklistItem) {
        const res = await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: item.taskId,
            itemId: item.id,
            status: "COMPLETED",
            isCompleted: true,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to complete checklist item");
        }
      } else {
        const res = await fetch(`/api/tasks/status?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: item.taskId,
            status: "COMPLETED",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to complete deliverable");
        }
      }
      setActionMessage("Task marked as completed successfully!");
      router.refresh();
    } catch (err: any) {
      setActionMessage(`Failed to complete task: ${err.message || err}`);
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

  // Focus mode target item
  const focusItem = data.todayPriorities[focusIndex] || data.workQueue[0];

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

  const pendingPersonalActions =
    data.mySummary.dueTodayCount +
    data.mySummary.overdueCount +
    (data.unacknowledgedAssignments?.length || 0);

  // Active task details for Hero Active Session Card (Image A)
  const currentActiveTask = data.workQueue.find((t) => t.taskId === selectedTaskId) || data.workQueue[0];
  const currentProjectName = (data.projectsList || []).find((p) => p.id === selectedProjectId)?.name || currentActiveTask?.projectName || "100% DESIGN Studio";
  const currentProjectCode = (data.projectsList || []).find((p) => p.id === selectedProjectId)?.code || currentActiveTask?.projectCode || "DS-01";

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
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
            Architect & Designer Workspace. You have{" "}
            <span className="font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {pendingPersonalActions} pending action{pendingPersonalActions !== 1 ? "s" : ""}
            </span>{" "}
            requiring your focus today.
          </p>
        </div>

        {/* Top Right: Live Sync, Sun / Status & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-auto">
          <LiveSyncIndicator
            isConnected={isConnected}
            lastEvent={lastEvent}
            onManualRefresh={handleRefresh}
          />

          {/* Next-Up Focus Cockpit Trigger */}
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isFocusMode
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${isFocusMode ? "text-amber-400" : "text-[#3562E8]"}`} />
            <span>{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
          </button>

          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shadow-xs">
            <Sun className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-2xl border border-slate-200/80 transition-colors cursor-pointer"
            title="Refresh my workspace"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

      {/* ============================================================== */}
      {/* 2. SECTION NAVIGATION PILLS ROW (Image A)                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll-x no-scrollbar text-xs">
        {[
          { key: "MY_DAY", label: "My Day" },
          { key: "QUEUE", label: `Work Queue (${data.workQueue.length})` },
          { key: "DRAWINGS", label: `GFC Drawings (${data.latestApprovedDrawings?.length || 0})` },
          { key: "VISITS", label: `Site Visits (${data.mySiteVisits.length})` },
          { key: "SCRATCHPAD", label: `Field Memos (${savedMemos.length})` },
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
        {/* KPI 1: In Progress */}
        <button
          type="button"
          onClick={() => setFilterTab("PENDING")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all shadow-xs cursor-pointer ${
            filterTab === "PENDING"
              ? "bg-blue-50/60 border-[#3562E8] ring-2 ring-[#3562E8]/20"
              : "bg-white border-slate-200/80 hover:border-[#3562E8]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">In Progress</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data.mySummary.pendingTasksCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Active deliverables</span>
        </button>

        {/* KPI 2: Due Today */}
        <button
          type="button"
          onClick={() => setFilterTab("TODAY")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all shadow-xs cursor-pointer ${
            filterTab === "TODAY"
              ? "bg-blue-50/60 border-[#3562E8] ring-2 ring-[#3562E8]/20"
              : "bg-white border-slate-200/80 hover:border-[#3562E8]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Due Today</span>
            <span className="w-2 h-2 rounded-full bg-[#3562E8]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#3562E8]">
            {data.mySummary.dueTodayCount}
          </div>
          <span className="text-[10px] text-[#3562E8] font-medium mt-1 block">Scheduled for delivery</span>
        </button>

        {/* KPI 3: Overdue */}
        <button
          type="button"
          onClick={() => setFilterTab("OVERDUE")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all shadow-xs cursor-pointer ${
            filterTab === "OVERDUE"
              ? "bg-rose-50/60 border-rose-300 ring-2 ring-rose-400/20"
              : "bg-white border-slate-200/80 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Overdue</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold transition-colors ${
              data.mySummary.overdueCount > 0 ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {data.mySummary.overdueCount}
          </div>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block">Past target deadline</span>
        </button>

        {/* KPI 4: In Review */}
        <button
          type="button"
          onClick={() => setFilterTab("REVIEW")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all shadow-xs cursor-pointer ${
            filterTab === "REVIEW"
              ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-white border-slate-200/80 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Under Review</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">
            {data.mySummary.inReviewCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting lead sign-off</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. PRIMARY HERO CARD: ACTIVE SESSION (Exact Match to Image A!)  */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#3562E8] uppercase tracking-wider font-mono border border-blue-100">
              ACTIVE SESSION
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              isTimerRunning ? "bg-emerald-100 text-emerald-800 animate-pulse" : "bg-slate-100 text-slate-500"
            }`}>
              {isTimerRunning ? "RECORDING" : "IDLE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Time Elapsed</span>
            <div className="flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
              <Clock className={`w-4 h-4 text-[#3562E8] ${isTimerRunning ? "animate-spin" : ""}`} />
              <span>{formatTime(timerSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentActiveTask ? currentActiveTask.title : "Studio Architectural Focus Session"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-[#3562E8]">[{currentProjectCode}]</span>
              <span>{currentProjectName}</span>
              <span>•</span>
              <span className="text-slate-400">{currentActiveTask?.parentTitle || "Architectural Detailing"}</span>
            </div>
          </div>

          {/* Controls: Mode, Start/Pause, Reset, Save */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-50 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setTimerMode("STOPWATCH");
                  handleResetTimer();
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  timerMode === "STOPWATCH" ? "bg-white shadow-xs text-slate-900" : "text-slate-500"
                }`}
              >
                Stopwatch
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerMode("POMODORO");
                  setTimerSeconds(25 * 60);
                }}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  timerMode === "POMODORO" ? "bg-white shadow-xs text-slate-900" : "text-slate-500"
                }`}
              >
                Pomodoro (25m)
              </button>
            </div>

            {!isTimerRunning ? (
              <button
                type="button"
                onClick={handleStartTimer}
                className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Session</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePauseTimer}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetTimer}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {timerSeconds > 0 && !isTimerRunning && (
              <button
                type="button"
                onClick={handleSaveTimer}
                disabled={isSavingTime}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingTime ? "Logging..." : "Log Time"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Estimated Completion Progress Bar (Image A Style) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Estimated Completion</span>
            <span className="font-bold text-slate-800">
              {data.productivityMetrics?.onTimeDeliveryRate || 65}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#3562E8] h-full rounded-full transition-all duration-500"
              style={{
                width: `${data.productivityMetrics?.onTimeDeliveryRate || 65}%`,
              }}
            />
          </div>
        </div>

        {/* Quick Task Switcher Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white cursor-pointer focus:outline-hidden"
          >
            <option value="">Switch Project...</option>
            {(data.projectsList || []).map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white cursor-pointer focus:outline-hidden"
          >
            <option value="">Switch Active Task...</option>
            {data.workQueue.map((wq) => (
              <option key={wq.id} value={wq.taskId}>
                [{wq.projectCode}] {wq.title}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Focus session note..."
            value={timerNotes}
            onChange={(e) => setTimerNotes(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. BALANCED TWO-COLUMN GRID (Image A: 70% Left / 30% Right)     */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN COLUMN (~70%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Site Inspection Console (if scheduled today) */}
          {data.activeSiteInspection && (
            <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 shadow-xs space-y-3 bg-gradient-to-r from-blue-50/20 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#3562E8] text-white flex items-center justify-center shrink-0">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">Active Site Inspection Console</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                          data.activeSiteInspection.operationalState === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 animate-pulse"
                            : "bg-blue-100 text-[#3562E8]"
                        }`}
                      >
                        {data.activeSiteInspection.operationalState}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      <strong>[{data.activeSiteInspection.projectCode}]</strong> {data.activeSiteInspection.siteName} — {data.activeSiteInspection.purpose}
                    </p>
                  </div>
                </div>

                {/* GPS Geofence Pill & Check-In */}
                <div className="flex items-center gap-2">
                  {isGpsLoading ? (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3562E8]" />
                      <span>Locating GPS...</span>
                    </span>
                  ) : gpsDistance !== null ? (
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                        gpsDistance <= data.activeSiteInspection.radiusMeters
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {gpsDistance <= data.activeSiteInspection.radiusMeters
                          ? `Inside Geofence (${Math.round(gpsDistance)}m)`
                          : `Outside Radius (${Math.round(gpsDistance)}m)`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">GPS Ready</span>
                  )}

                  {data.activeSiteInspection.operationalState === "SCHEDULED" ? (
                    <button
                      type="button"
                      onClick={handleSiteCheckIn}
                      disabled={isCheckingIn}
                      className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isCheckingIn ? "Checking In..." : "Check-In Now"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCheckOutModalOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check-Out with Report</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Site Address: {data.activeSiteInspection.siteAddress} • Radius Threshold: {data.activeSiteInspection.radiusMeters}m
              </p>
            </div>
          )}

          {/* Pending Deliverable Acknowledgements Banner */}
          {data.unacknowledgedAssignments && data.unacknowledgedAssignments.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Deliverable Assignments Awaiting Acknowledgement ({data.unacknowledgedAssignments.length})
                  </h3>
                  <p className="text-xs text-amber-800">
                    Acknowledge assigned deliverables before advancing execution.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {data.unacknowledgedAssignments.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-[#3562E8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {task.projectCode}
                        </span>
                        <TaskPriorityBadge priority={task.priority} size="sm" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={task.title}>
                        {task.title}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : "No deadline"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAcknowledgeTask(task.id, task.version)}
                      disabled={acknowledgingTaskId === task.id}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {acknowledgingTaskId === task.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Acknowledge</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus Mode Cockpit */}
          {isFocusMode && focusItem && (
            <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Focus Cockpit: Deliverable {focusIndex + 1} of {Math.max(data.todayPriorities.length, 1)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFocusIndex((prev) => Math.max(0, prev - 1))}
                    disabled={focusIndex === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer rounded-lg border border-slate-200"
                    title="Previous task"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusIndex((prev) => Math.min(data.todayPriorities.length - 1, prev + 1))}
                    disabled={focusIndex >= data.todayPriorities.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer rounded-lg border border-slate-200"
                    title="Next task"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFocusMode(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold ml-2 cursor-pointer"
                  >
                    Close [ESC]
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {focusItem.projectCode}
                  </span>
                  <span className="text-xs text-slate-500">{focusItem.projectName}</span>
                  <TaskPriorityBadge priority={focusItem.priority} size="sm" />
                </div>

                <h3 className="text-lg font-bold text-slate-900">{focusItem.title}</h3>

                {focusItem.description && (
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <strong>Architectural Instructions:</strong> {focusItem.description}
                  </div>
                )}

                {focusItem.checklistItems && focusItem.checklistItems.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-slate-900 block">Milestone Steps & Checklist:</span>
                    <div className="space-y-1">
                      {focusItem.checklistItems.map((ci) => (
                        <button
                          key={ci.id}
                          type="button"
                          disabled={togglingChecklistId === ci.id}
                          onClick={() => handleToggleFocusChecklist(focusItem.taskId || focusItem.id, ci.id, ci.isCompleted)}
                          className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs w-full text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {ci.isCompleted ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3562E8] shrink-0" />
                            )}
                            <span className={`truncate ${ci.isCompleted ? "line-through text-slate-400" : "font-medium text-slate-800"}`}>
                              {ci.title}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ml-2 ${ci.isCompleted ? "text-emerald-700" : "text-amber-700"}`}>
                            {ci.isCompleted ? "Completed" : "Pending"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {focusItem.dueDate ? `Deadline: ${new Date(focusItem.dueDate).toLocaleDateString()}` : "No deadline"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(focusItem.taskId);
                      handleStartTimer();
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-[#3562E8] text-[#3562E8] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Timer for Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSubmitModalItem({
                        id: focusItem.id,
                        taskId: focusItem.taskId,
                        title: focusItem.title,
                        isChecklistItem: false,
                      })
                    }
                    className="px-3.5 py-1.5 bg-[#3562E8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Submit for Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCompleteTask({
                        id: focusItem.id,
                        taskId: focusItem.taskId,
                        isChecklistItem: false,
                      })
                    }
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mark Complete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Assigned Work Queue (Image A Content Table/List) */}
          {(activeTab === "MY_DAY" || activeTab === "QUEUE") && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#3562E8]" />
                  <span>My Assigned Deliverables ({filteredQueue.length})</span>
                </h3>

                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(["ALL", "PENDING", "TODAY", "OVERDUE", "REVIEW", "CHANGES"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterTab(tab)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                        filterTab === tab
                          ? "bg-[#3562E8] text-white"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="p-10 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-900">No deliverables in this category</p>
                  <p className="text-[11px] text-slate-400">You are all caught up on deliverables in this view.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredQueue.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 shadow-2xs group ${
                        item.isOverdue
                          ? "border-rose-200 bg-rose-50/20 hover:bg-white"
                          : item.blockerReason
                          ? "border-amber-200 bg-amber-50/20 hover:bg-white"
                          : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#3562E8]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-bold text-[#3562E8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {item.projectCode}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {item.projectName}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 mt-1 break-words group-hover:text-[#3562E8] transition-colors">
                            {item.title}
                          </h4>
                          {item.parentTitle !== item.title && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Deliverable: {item.parentTitle}
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          <TaskPriorityBadge priority={item.priority} size="sm" />
                        </div>
                      </div>

                      {item.blockerReason && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Revision Requested:</strong> {item.blockerReason}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400">
                          {item.dueDate ? (
                            <span className={item.isOverdue ? "text-rose-600 font-bold" : ""}>
                              Due: {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            "No deadline"
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.status === "NOT_STARTED" && (
                            <button
                              type="button"
                              onClick={() => handleStartWork(item)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-[#3562E8] text-[#3562E8] hover:text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start</span>
                            </button>
                          )}

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
                              className="px-2.5 py-1 bg-[#3562E8] hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit</span>
                            </button>
                          )}

                          {item.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleCompleteTask(item)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              title="Set status to completed directly"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Done</span>
                            </button>
                          )}

                          {item.status === "IN_REVIEW" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Under Review
                            </span>
                          )}

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
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer"
                              title="Report Blocker"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            href={`/w/${workspaceSlug}/tasks?taskId=${item.taskId}`}
                            className="p-1 text-slate-400 hover:text-[#3562E8] rounded-lg hover:bg-blue-50"
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
          )}

          {/* GFC Drawings Register */}
          {(activeTab === "MY_DAY" || activeTab === "DRAWINGS") && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#3562E8]" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Latest Good-for-Construction (GFC) Approved Drawings
                  </h3>
                </div>
                <Link
                  href={`/w/${workspaceSlug}/drawings`}
                  className="text-xs text-[#3562E8] font-bold hover:underline"
                >
                  All Drawings Register →
                </Link>
              </div>

              {(!data.latestApprovedDrawings || data.latestApprovedDrawings.length === 0) ? (
                <p className="text-xs text-slate-400 p-6 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  No approved GFC drawings available yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.latestApprovedDrawings.map((dwg) => (
                    <div
                      key={dwg.id}
                      className="p-3.5 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-[#3562E8] transition-all space-y-2 shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[9px] font-bold text-[#3562E8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {dwg.projectCode} • Rev {dwg.revision}
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                          APPROVED
                        </span>
                      </div>

                      <p className="font-bold text-xs text-slate-900 truncate group-hover:text-[#3562E8] transition-colors">{dwg.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {dwg.discipline} • {dwg.issuePurpose}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400">
                          {new Date(dwg.approvedAt).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/api/storage/file/${dwg.fileId}`}
                          target="_blank"
                          className="text-[10px] font-bold text-[#3562E8] hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <p className="text-xs text-slate-500 font-medium">Architect / Designer</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  ID: ARCH-08
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                  DEPT: Design
                </span>
              </div>
            </div>
          </div>

          {/* Today's Priorities / Upcoming Schedule (Image A Middle Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#3562E8]" />
                <span>Today&apos;s Priorities ({data.todayPriorities.length})</span>
              </h3>
            </div>

            {data.todayPriorities.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                No urgent priority tasks assigned for today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.todayPriorities.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] font-bold text-[#3562E8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {item.projectCode}
                      </span>
                      <TaskPriorityBadge priority={item.priority} size="sm" />
                    </div>
                    <p className="font-bold text-xs text-slate-900 truncate">{item.title}</p>
                    <span className="text-[10px] text-slate-400 block">
                      Status: {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Personal Actions (Image A Lower Right) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Pending Actions</span>
            </h3>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab("TODAY")}
                className="w-full text-left p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between group hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-rose-900 text-xs">Complete Tasks Due Today</div>
                  <div className="text-[10px] text-rose-600">{data.mySummary.dueTodayCount} deliverables deadline today</div>
                </div>
                <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                  HIGH
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("REVIEW")}
                className="w-full text-left p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between group hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-amber-900 text-xs">Awaiting Sign-off</div>
                  <div className="text-[10px] text-amber-600">{data.mySummary.inReviewCount} items in review queue</div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  MED
                </span>
              </button>

              <Link
                href={`/w/${workspaceSlug}/leave`}
                className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-blue-900 text-xs">Leave & Attendance</div>
                  <div className="text-[10px] text-blue-600">Self-service records balance</div>
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
                href={`/w/${workspaceSlug}/leave`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <Calendar className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">Apply Leave</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/visits`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <MapPin className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-emerald-600">Site Check-In</span>
              </Link>

              <button
                type="button"
                onClick={handleStartTimer}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group cursor-pointer"
              >
                <Clock className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">Log Hours</span>
              </button>

              <Link
                href={`/w/${workspaceSlug}/tasks`}
                className="p-3.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
              >
                <CheckSquare className="w-5 h-5 text-slate-500 group-hover:text-[#3562E8] transition-colors" />
                <span className="font-bold text-slate-700 group-hover:text-[#3562E8]">My Tasks</span>
              </Link>
            </div>
          </div>

          {/* Field Scratchpad & Voice Memo */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#3562E8]" />
                <span>Field Scratchpad</span>
              </h3>
              <span className="text-[10px] text-slate-400">{savedMemos.length} saved</span>
            </div>

            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="Jot site measurements, client remarks, specs..."
              rows={3}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-[#3562E8]"
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveMemo}
                disabled={!memoText.trim()}
                className="px-3 py-1.5 bg-[#3562E8] hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>

            {savedMemos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
                {savedMemos.map((m) => (
                  <div key={m.id} className="p-2.5 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <p className="text-[11px] text-slate-800 break-words whitespace-pre-wrap">{m.text}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                      <span>{m.date}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setConvertingMemo(m);
                            setConvertTitle(m.text.slice(0, 40));
                          }}
                          className="text-[#3562E8] hover:underline font-bold cursor-pointer"
                        >
                          Convert
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemo(m.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}
      {/* MODAL: SUBMIT FOR LEADERSHIP REVIEW */}
      {submitModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Submit Deliverable for Review</h3>
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Submitting: <strong className="text-slate-900">{submitModalItem.title}</strong>
            </p>

            <textarea
              value={submissionComment}
              onChange={(e) => setSubmissionComment(e.target.value)}
              placeholder="Add submission notes, revision details, or attached link..."
              rows={3}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#3562E8]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSubmittingReview}
                className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isSubmittingReview ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORT BLOCKER */}
      {blockerModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Report Deliverable Blocker</span>
              </h3>
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Reporting blocker for: <strong className="text-slate-900">{blockerModalItem.title}</strong>
            </p>

            <textarea
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="Describe the blocker (e.g. Awaiting MEP consultant revisions, site dimensions mismatch)..."
              rows={3}
              className="w-full text-xs p-3 rounded-2xl border border-rose-200 bg-rose-50/20 focus:outline-hidden focus:border-rose-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportBlocker}
                disabled={isSubmittingBlocker || !blockerReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isSubmittingBlocker ? "Submitting..." : "Report Blocker"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SITE CHECK-OUT WITH FINDINGS REPORT */}
      {isCheckOutModalOpen && data.activeSiteInspection && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Site Check-Out & Survey Report</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Logging completion for: <strong>[{data.activeSiteInspection.projectCode}] {data.activeSiteInspection.siteName}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  On-Site Findings & Observations:
                </label>
                <textarea
                  value={checkOutFindings}
                  onChange={(e) => setCheckOutFindings(e.target.value)}
                  placeholder="Record masonry progress, slab curing status, contractor workforce count, deviations from GFC drawings..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#3562E8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Next Actions & Instructions for Contractor:
                </label>
                <textarea
                  value={checkOutNextActions}
                  onChange={(e) => setCheckOutNextActions(e.target.value)}
                  placeholder="e.g. Issue revised plumbing sleeve detail, cast lintel beam before brickwork..."
                  rows={2}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#3562E8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCheckOutModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSiteCheckOut}
                disabled={isCheckingOut}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isCheckingOut ? "Submitting..." : "Confirm Check-Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVERT MEMO TO TASK DELIVERABLE */}
      {convertingMemo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Convert Memo to Deliverable</h3>
              <button
                type="button"
                onClick={() => setConvertingMemo(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Select Project:</label>
                <select
                  value={convertProjectId}
                  onChange={(e) => setConvertProjectId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer"
                >
                  <option value="">Select project...</option>
                  {(data.projectsList || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Deliverable Title:</label>
                <input
                  type="text"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Priority:</label>
                  <select
                    value={convertPriority}
                    onChange={(e) => setConvertPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Target Due Date:</label>
                  <input
                    type="date"
                    value={convertDueDate}
                    onChange={(e) => setConvertDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingMemo(null)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertMemoToTask}
                disabled={isConvertingTask || !convertProjectId || !convertTitle.trim()}
                className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isConvertingTask ? "Creating..." : "Create Deliverable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
