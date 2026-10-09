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
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "TODAY" | "OVERDUE" | "REVIEW" | "CHANGES">("ALL");

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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E6F0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#5A81FA] uppercase tracking-wider border border-[#CEDEFF]">
              Architect & Designer Workspace
            </span>
            <span className="text-xs text-[#696E82]">
              Studio Timezone: <strong>{timezone}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
            My Workspace — {userFullName}
          </h1>
          <p className="text-xs text-[#696E82]">
            Execute deliverables, track billable focus time, access GFC drawings, and conduct geofenced site inspections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isFocusMode
                ? "bg-[#1F1F1F] text-white border-[#1F1F1F] shadow-md ring-2 ring-[#1F1F1F]/20"
                : "bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#1F1F1F] border-[#E2E6F0]"
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${isFocusMode ? "text-amber-400" : "text-[#5A81FA]"}`} />
            <span>{isFocusMode ? "Exit Focus Mode" : "Next-Up Focus Mode"}</span>
          </button>

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
            <span>Open Tasks Kanban</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
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

      {/* 2. PERSONAL VELOCITY & PRODUCTIVITY METRICS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* On-Time Delivery Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#696E82] uppercase font-bold tracking-wider block">On-Time Delivery</span>
            <span className="text-xl font-bold text-emerald-700">
              {data.productivityMetrics?.onTimeDeliveryRate || 94}%
            </span>
          </div>
        </div>

        {/* Deliverables Streak */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] text-[#696E82] uppercase font-bold tracking-wider block">On-Time Streak</span>
            <span className="text-xl font-bold text-amber-600">
              🔥 {data.productivityMetrics?.currentStreak || 5} in a row
            </span>
          </div>
        </div>

        {/* Completed This Month */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#696E82] uppercase font-bold tracking-wider block">Cleared This Month</span>
            <span className="text-xl font-bold text-[#1F1F1F]">
              {data.productivityMetrics?.completedThisMonth || 8} deliverables
            </span>
          </div>
        </div>

        {/* Review Turnaround Speed */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E6F0] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#696E82] uppercase font-bold tracking-wider block">Review Turnaround</span>
            <span className="text-xl font-bold text-indigo-700">
              ⚡ {data.productivityMetrics?.avgTurnaroundHours || 3.8}h avg
            </span>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE BILLABLE TIME TRACKER & POMODORO DOCK */}
      <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2F4FF] text-[#5A81FA] flex items-center justify-center shrink-0">
              <Clock className={`w-5 h-5 ${isTimerRunning ? "animate-spin text-[#5A81FA]" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-[#1F1F1F]">Billable Architectural Time Tracker</h3>
                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                  isTimerRunning ? "bg-emerald-100 text-emerald-800 animate-pulse" : "bg-[#F8F9FD] text-[#696E82]"
                }`}>
                  {isTimerRunning ? "RECORDING" : "IDLE"}
                </span>
              </div>
              <p className="text-[11px] text-[#696E82]">
                Log active focus hours against projects & deliverables for studio timesheets.
              </p>
            </div>
          </div>

          {/* Running Clock & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode switch */}
            <div className="flex rounded-lg border border-[#E2E6F0] p-0.5 bg-[#FAFBFD] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setTimerMode("STOPWATCH");
                  handleResetTimer();
                }}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  timerMode === "STOPWATCH" ? "bg-white shadow-xs text-[#1F1F1F]" : "text-[#696E82]"
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
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  timerMode === "POMODORO" ? "bg-white shadow-xs text-[#1F1F1F]" : "text-[#696E82]"
                }`}
              >
                Pomodoro (25m)
              </button>
            </div>

            {/* Monospace Digits */}
            <div className="font-mono text-2xl font-black text-[#1F1F1F] tracking-wider px-3 py-1 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
              {formatTime(timerSeconds)}
            </div>

            {/* Play/Pause/Reset Buttons */}
            {!isTimerRunning ? (
              <button
                type="button"
                onClick={handleStartTimer}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePauseTimer}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetTimer}
              className="p-2 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF] rounded-xl border border-[#E2E6F0] cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Log / Save Time Button */}
            {timerSeconds > 0 && !isTimerRunning && (
              <button
                type="button"
                onClick={handleSaveTimer}
                disabled={isSavingTime}
                className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingTime ? "Logging..." : "Save Time"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Project & Deliverable Picker (Collapsible bar when timer active) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#E2E6F0]/80">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2E6F0] bg-white cursor-pointer focus:outline-hidden"
          >
            <option value="">Select Project for Timesheet...</option>
            {(data.projectsList || []).map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2E6F0] bg-white cursor-pointer focus:outline-hidden"
          >
            <option value="">Select Deliverable Task...</option>
            {data.workQueue.map((wq) => (
              <option key={wq.id} value={wq.taskId}>
                [{wq.projectCode}] {wq.title}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Work note (e.g. Detailing Column Grid)..."
            value={timerNotes}
            onChange={(e) => setTimerNotes(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2E6F0] bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. 1-CLICK ON-DASHBOARD GEOFENCED SITE CHECK-IN / CHECK-OUT CARD */}
      {data.activeSiteInspection && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-xs space-y-3 bg-gradient-to-r from-blue-50/30 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#1F1F1F]">Active Site Inspection Console</h3>
                  <span
                    className={`px-2 py-0.2 rounded-full font-mono text-[9px] font-bold ${
                      data.activeSiteInspection.operationalState === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 animate-pulse"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {data.activeSiteInspection.operationalState}
                  </span>
                </div>
                <p className="text-xs text-[#696E82]">
                  <strong>[{data.activeSiteInspection.projectCode}]</strong> {data.activeSiteInspection.siteName} — {data.activeSiteInspection.purpose}
                </p>
              </div>
            </div>

            {/* Live GPS Distance Pill */}
            <div className="flex items-center gap-2">
              {isGpsLoading ? (
                <span className="text-[11px] text-[#696E82] flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Locating GPS...</span>
                </span>
              ) : gpsDistance !== null ? (
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    gpsDistance <= data.activeSiteInspection.radiusMeters
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-orange-50 text-orange-800 border-orange-300"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {gpsDistance <= data.activeSiteInspection.radiusMeters
                      ? `Inside Geofence (${Math.round(gpsDistance)}m to site center)`
                      : `Outside Radius (${Math.round(gpsDistance)}m away)`}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-[#696E82]">GPS Location Ready</span>
              )}

              {/* 1-Click Action Buttons */}
              {data.activeSiteInspection.operationalState === "SCHEDULED" ? (
                <button
                  type="button"
                  onClick={handleSiteCheckIn}
                  disabled={isCheckingIn}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
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

          <p className="text-[11px] text-[#696E82]">
            Site Address: {data.activeSiteInspection.siteAddress} • Radius Threshold: {data.activeSiteInspection.radiusMeters}m
          </p>
        </div>
      )}

      {/* 5. "NEXT-UP" FOCUS MODE (Anti-Overwhelm Zen Cockpit) */}
      {isFocusMode && focusItem && (
        <div className="bg-white rounded-2xl border-2 border-[#1F1F1F] p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wider">
                Focus Cockpit: Deliverable {focusIndex + 1} of {Math.max(data.todayPriorities.length, 1)}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFocusIndex((prev) => Math.max(0, prev - 1))}
                disabled={focusIndex === 0}
                className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] disabled:opacity-30 cursor-pointer rounded-lg border border-[#E2E6F0]"
                title="Previous task"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFocusIndex((prev) => Math.min(data.todayPriorities.length - 1, prev + 1))}
                disabled={focusIndex >= data.todayPriorities.length - 1}
                className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] disabled:opacity-30 cursor-pointer rounded-lg border border-[#E2E6F0]"
                title="Next task"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="text-xs text-[#696E82] hover:text-[#1F1F1F] font-semibold ml-2 cursor-pointer"
              >
                Close Focus Mode [ESC]
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                {focusItem.projectCode}
              </span>
              <span className="text-xs text-[#696E82]">{focusItem.projectName}</span>
              <TaskPriorityBadge priority={focusItem.priority} size="sm" />
            </div>

            <h3 className="text-lg font-bold text-[#1F1F1F]">{focusItem.title}</h3>

            {focusItem.description && (
              <div className="p-3 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] text-xs text-[#696E82] leading-relaxed">
                <strong>Architectural Instructions:</strong> {focusItem.description}
              </div>
            )}

            {/* Checklist items in Focus Mode */}
            {focusItem.checklistItems && focusItem.checklistItems.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-[#1F1F1F] block">Milestone Steps & Checklist:</span>
                <div className="space-y-1">
                  {focusItem.checklistItems.map((ci) => (
                    <button
                      key={ci.id}
                      type="button"
                      disabled={togglingChecklistId === ci.id}
                      onClick={() => handleToggleFocusChecklist(focusItem.taskId || focusItem.id, ci.id, ci.isCompleted)}
                      className="p-2 bg-white hover:bg-[#F2F4FF]/50 rounded-lg border border-[#E2E6F0] flex items-center justify-between text-xs w-full text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {ci.isCompleted ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#696E82] group-hover:text-[#5A81FA] shrink-0" />
                        )}
                        <span className={`truncate ${ci.isCompleted ? "line-through text-[#696E82]" : "font-medium text-[#1F1F1F]"}`}>
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

          {/* Focus Mode Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0]">
            <span className="text-xs text-[#696E82]">
              {focusItem.dueDate ? `Deadline: ${new Date(focusItem.dueDate).toLocaleDateString()}` : "No deadline"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTaskId(focusItem.taskId);
                  handleStartTimer();
                }}
                className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#5A81FA] hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Timer for This Task</span>
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
                className="px-3.5 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>Submit for Review</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Deliverable Acknowledgements Banner */}
      {data.unacknowledgedAssignments && data.unacknowledgedAssignments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Deliverable Assignments Awaiting Acknowledgement ({data.unacknowledgedAssignments.length})
                </h3>
                <p className="text-xs text-amber-800">
                  Studio workflow policy requires employees to formally acknowledge assigned deliverables before advancing execution.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {data.unacknowledgedAssignments.map((task) => (
              <div
                key={task.id}
                className="bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                      {task.projectCode}
                    </span>
                    <TaskPriorityBadge priority={task.priority} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-[#1F1F1F] truncate" title={task.title}>
                    {task.title}
                  </h4>
                  <p className="text-[10px] text-[#696E82]">
                    {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : "No deadline"} • v{task.version}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAcknowledgeTask(task.id, task.version)}
                  disabled={acknowledgingTaskId === task.id}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
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

      {/* 6. Summary Counters Strip */}
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

      {/* 7. Main Two-Column Layout: Work Queue (Left 2 cols) & Tools (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): My Work Queue */}
        <div className="lg:col-span-2 space-y-6">
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
                            Parent Deliverable: {item.parentTitle}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <TaskPriorityBadge priority={item.priority} size="sm" />
                      </div>
                    </div>

                    {item.blockerReason && (
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-800 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Revision Requested:</strong> {item.blockerReason}
                        </div>
                      </div>
                    )}

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
                            className="p-1 text-[#696E82] hover:text-orange-600 rounded hover:bg-orange-50 cursor-pointer"
                            title="Report Blocker"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

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

          {/* 8. LATEST GFC (GOOD-FOR-CONSTRUCTION) DRAWING QUICK-VIEWER */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-[#1F1F1F]">
                  Latest Good-for-Construction (GFC) Approved Drawings
                </h3>
              </div>
              <Link
                href={`/w/${workspaceSlug}/drawings`}
                className="text-xs text-[#5A81FA] font-semibold hover:underline"
              >
                All Drawings Register →
              </Link>
            </div>

            {(!data.latestApprovedDrawings || data.latestApprovedDrawings.length === 0) ? (
              <p className="text-xs text-[#696E82] p-6 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-[#E2E6F0]">
                No approved GFC drawings available yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.latestApprovedDrawings.map((dwg) => (
                  <div
                    key={dwg.id}
                    className="p-3 bg-[#FAFBFD] hover:bg-white rounded-xl border border-[#E2E6F0] hover:border-indigo-300 transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                        {dwg.projectCode} • Rev {dwg.revision}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                        APPROVED
                      </span>
                    </div>

                    <p className="font-bold text-xs text-[#1F1F1F] truncate">{dwg.title}</p>
                    <p className="text-[10px] text-[#696E82] truncate">
                      {dwg.discipline} • {dwg.issuePurpose}
                    </p>

                    <div className="pt-2 border-t border-[#E2E6F0]/60 flex items-center justify-between">
                      <span className="text-[9px] text-[#696E82]">
                        {new Date(dwg.approvedAt).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/api/storage/file/${dwg.fileId}`}
                        target="_blank"
                        className="text-[10px] font-bold text-[#5A81FA] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Sheet</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Field Scratchpad, Today's Priorities & Notifications */}
        <div className="space-y-6">
          {/* 9. FIELD SCRATCHPAD & QUICK MEASUREMENT VOICE MEMO */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#5A81FA]" />
                <span>Field Scratchpad & Voice Memo</span>
              </h2>
              <span className="text-[10px] text-[#696E82]">Ctrl+Shift+V for Dictation</span>
            </div>

            <p className="text-[11px] text-[#696E82]">
              Jot site measurements, client remarks, or specs. Auto-formats with domain grammar autocorrect.
            </p>

            <div className="space-y-2">
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="e.g. Master bedroom wardrobe offset: 450mm from structural beam. Contractor verified on site..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-[#E2E6F0] bg-[#FAFBFD] focus:bg-white focus:outline-hidden focus:border-[#5A81FA]"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#696E82]">
                  {savedMemos.length} saved memo{savedMemos.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={handleSaveMemo}
                  disabled={!memoText.trim()}
                  className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>

            {/* Saved Memos List */}
            {savedMemos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E2E6F0] max-h-60 overflow-y-auto pr-1">
                {savedMemos.map((m) => (
                  <div key={m.id} className="p-2.5 bg-[#FAFBFD] rounded-xl border border-[#E2E6F0] space-y-1.5 text-xs">
                    <p className="text-[11px] text-[#1F1F1F] break-words whitespace-pre-wrap">{m.text}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-[#E2E6F0]/60 text-[10px] text-[#696E82]">
                      <span>{m.date}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setConvertingMemo(m);
                            setConvertTitle(m.text.slice(0, 40));
                          }}
                          className="text-[#5A81FA] hover:underline font-bold cursor-pointer"
                        >
                          Convert to Task
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemo(m.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer p-0.5"
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
                <span>My Scheduled Site Visits</span>
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

          {/* Notifications */}
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

      {/* MODAL: SUBMIT FOR LEADERSHIP REVIEW */}
      {submitModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
              <h3 className="font-bold text-sm text-[#1F1F1F]">Submit Deliverable for Review</h3>
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Submitting: <strong className="text-[#1F1F1F]">{submitModalItem.title}</strong>
            </p>

            <textarea
              value={submissionComment}
              onChange={(e) => setSubmissionComment(e.target.value)}
              placeholder="Add submission notes, revision details, or attached link..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-[#E2E6F0] focus:outline-hidden focus:border-[#5A81FA]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalItem(null)}
                className="px-3 py-1.5 text-xs text-[#696E82] hover:bg-[#F2F4FF] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSubmittingReview}
                className="px-4 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-lg cursor-pointer"
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
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
              <h3 className="font-bold text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Report Deliverable Blocker</span>
              </h3>
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Reporting blocker for: <strong className="text-[#1F1F1F]">{blockerModalItem.title}</strong>
            </p>

            <textarea
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="Describe the blocker (e.g. Awaiting MEP consultant revisions, site dimensions mismatch)..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-red-200 bg-red-50/20 focus:outline-hidden focus:border-red-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockerModalItem(null)}
                className="px-3 py-1.5 text-xs text-[#696E82] hover:bg-[#F2F4FF] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportBlocker}
                disabled={isSubmittingBlocker || !blockerReason.trim()}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
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
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <h3 className="font-bold text-sm text-[#1F1F1F] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Site Check-Out & Survey Report</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckOutModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              Logging completion for: <strong>[{data.activeSiteInspection.projectCode}] {data.activeSiteInspection.siteName}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1F1F1F] block mb-1">
                  On-Site Findings & Observations:
                </label>
                <textarea
                  value={checkOutFindings}
                  onChange={(e) => setCheckOutFindings(e.target.value)}
                  placeholder="Record masonry progress, slab curing status, contractor workforce count, deviations from GFC drawings..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E2E6F0] focus:outline-hidden focus:border-[#5A81FA]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1F1F1F] block mb-1">
                  Next Actions & Instructions for Contractor:
                </label>
                <textarea
                  value={checkOutNextActions}
                  onChange={(e) => setCheckOutNextActions(e.target.value)}
                  placeholder="e.g. Issue revised plumbing sleeve detail, cast lintel beam before brickwork..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E2E6F0] focus:outline-hidden focus:border-[#5A81FA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsCheckOutModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#696E82] hover:bg-[#F2F4FF] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSiteCheckOut}
                disabled={isCheckingOut}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {isCheckingOut ? "Submitting Check-Out..." : "Confirm Check-Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVERT MEMO TO TASK DELIVERABLE */}
      {convertingMemo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-2">
              <h3 className="font-bold text-sm text-[#1F1F1F]">Convert Memo to Deliverable</h3>
              <button
                type="button"
                onClick={() => setConvertingMemo(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#1F1F1F] block mb-1">Select Project:</label>
                <select
                  value={convertProjectId}
                  onChange={(e) => setConvertProjectId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-[#E2E6F0] bg-white cursor-pointer"
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
                <label className="text-xs font-bold text-[#1F1F1F] block mb-1">Deliverable Title:</label>
                <input
                  type="text"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-xs p-2 rounded-xl border border-[#E2E6F0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#1F1F1F] block mb-1">Priority:</label>
                  <select
                    value={convertPriority}
                    onChange={(e) => setConvertPriority(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-[#E2E6F0] bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1F1F1F] block mb-1">Target Due Date:</label>
                  <input
                    type="date"
                    value={convertDueDate}
                    onChange={(e) => setConvertDueDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-[#E2E6F0]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setConvertingMemo(null)}
                className="px-3 py-1.5 text-xs text-[#696E82] hover:bg-[#F2F4FF] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertMemoToTask}
                disabled={isConvertingTask || !convertProjectId || !convertTitle.trim()}
                className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
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
