"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sun,
  Moon,
  Check,
  Layers,
  Info,
} from "lucide-react";
import {
  STUDIO_TIME_SLOTS,
  HOURLY_PRESETS,
  ADVANCED_LEAVE_TYPES,
  formatMinutesToTime,
  parseCompositeLeaveReason,
  calculateDateMetrics,
} from "@/lib/leave/form-helpers";

interface EmployeeOption {
  id: string;
  fullName?: string;
  name?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
}

interface AdvancedLeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  workspaceSlug: string;
  mode: "CREATE" | "EDIT" | "ADMIN_CREATE";
  initialRecord?: any;
  employees?: EmployeeOption[];
  currentEmployeeId?: string;
}

export default function AdvancedLeaveFormModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceSlug,
  mode,
  initialRecord,
  employees = [],
  currentEmployeeId,
}: AdvancedLeaveFormModalProps) {
  // Today formatted as YYYY-MM-DD in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Selected employee for ADMIN_CREATE mode
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(
    initialRecord?.employeeId || currentEmployeeId || ""
  );

  // Form State: Full Day, Half Day, Few Hours Leave
  const [durationMode, setDurationMode] = useState<"FULL" | "HALF" | "HOURLY">("FULL");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Half day state
  const [sessionType, setSessionType] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");

  // Hourly state
  const [selectedPresetMins, setSelectedPresetMins] = useState<number>(60);
  const [startMinutes, setStartMinutes] = useState<number>(630); // 10:30 AM
  const [endMinutes, setEndMinutes] = useState<number>(690);     // 11:30 AM
  const [totalMinutes, setTotalMinutes] = useState<number>(60);

  // Category (Casual, Emergency, Sick) and reason
  const [leaveType, setLeaveType] = useState<string>("CASUAL");
  const [reason, setReason] = useState<string>("");

  // Live preview & feedback
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form state whenever modal opens or initialRecord changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (mode === "EDIT" && initialRecord) {
      const parsed = parseCompositeLeaveReason(initialRecord.reason);
      setReason(parsed.reason || initialRecord.reason || "");

      const s = new Date(initialRecord.startDate).toISOString().slice(0, 10);
      const e = new Date(initialRecord.endDate).toISOString().slice(0, 10);
      setStartDate(s);
      setEndDate(e);

      if (initialRecord.isHourly) {
        setDurationMode("HOURLY");
        const sm = initialRecord.startMinutes || 630;
        const tm = initialRecord.totalMinutes || 60;
        setStartMinutes(sm);
        setTotalMinutes(tm);
        setEndMinutes(sm + tm);
        setSelectedPresetMins(tm);
      } else if (initialRecord.isHalfDay) {
        setDurationMode("HALF");
        setSessionType(initialRecord.sessionType === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF");
      } else {
        setDurationMode("FULL");
      }

      const validTypes = ["CASUAL", "EMERGENCY", "SICK"];
      setLeaveType(validTypes.includes(initialRecord.leaveType) ? initialRecord.leaveType : "CASUAL");
      setTargetEmployeeId(initialRecord.employeeId || "");
    } else {
      // New Application defaults
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDurationMode("FULL");
      setSessionType("FIRST_HALF");
      setStartMinutes(630);
      setEndMinutes(690);
      setTotalMinutes(60);
      setSelectedPresetMins(60);
      setLeaveType("CASUAL");
      setReason("");
      if (mode === "ADMIN_CREATE") {
        setTargetEmployeeId(employees[0]?.id || "");
      }
    }
  }, [isOpen, mode, initialRecord, todayStr, employees]);

  // Sync preset minutes to start & end minutes
  const handlePresetSelect = (presetMins: number) => {
    setSelectedPresetMins(presetMins);
    setTotalMinutes(presetMins);
    let newEnd = startMinutes + presetMins;
    if (newEnd > 1110) {
      // If exceeds studio closing (6:30 PM = 1110), shift start backwards
      const newStart = Math.max(630, 1110 - presetMins);
      setStartMinutes(newStart);
      newEnd = newStart + presetMins;
    }
    setEndMinutes(newEnd);
  };

  const handleStartMinutesChange = (newStart: number) => {
    setStartMinutes(newStart);
    let newEnd = newStart + totalMinutes;
    if (newEnd > 1110) {
      newEnd = 1110;
      setTotalMinutes(Math.max(15, newEnd - newStart));
      setSelectedPresetMins(0); // custom
    }
    setEndMinutes(newEnd);
  };

  const handleEndMinutesChange = (newEnd: number) => {
    if (newEnd <= startMinutes) {
      setErrorMessage("End time must be after start time");
      return;
    }
    setEndMinutes(newEnd);
    const diff = newEnd - startMinutes;
    setTotalMinutes(diff);
    const match = HOURLY_PRESETS.find((p) => p.minutes === diff);
    setSelectedPresetMins(match ? match.minutes : 0);
  };

  // Quick Date Range Presets
  const applyDatePreset = (preset: "TODAY" | "TOMORROW" | "NEXT_2_DAYS" | "THIS_FRIDAY" | "NEXT_WEEK") => {
    const d = new Date();
    const fmt = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "TODAY") {
      setStartDate(fmt(d));
      setEndDate(fmt(d));
    } else if (preset === "TOMORROW") {
      const tom = new Date(d);
      tom.setDate(d.getDate() + 1);
      setStartDate(fmt(tom));
      setEndDate(fmt(tom));
    } else if (preset === "NEXT_2_DAYS") {
      const tom = new Date(d);
      tom.setDate(d.getDate() + 1);
      setStartDate(fmt(d));
      setEndDate(fmt(tom));
    } else if (preset === "THIS_FRIDAY") {
      const fri = new Date(d);
      const dayOfWeek = d.getDay(); // 0 Sun, 5 Fri
      const daysUntilFri = (5 - dayOfWeek + 7) % 7 || 7;
      fri.setDate(d.getDate() + daysUntilFri);
      setStartDate(fmt(fri));
      setEndDate(fmt(fri));
    } else if (preset === "NEXT_WEEK") {
      const mon = new Date(d);
      const dayOfWeek = d.getDay();
      const daysUntilMon = (8 - dayOfWeek) % 7 || 7;
      mon.setDate(d.getDate() + daysUntilMon);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setStartDate(fmt(mon));
      setEndDate(fmt(fri));
    }
  };

  // Computed Date Metrics
  const dateMetrics = useMemo(() => {
    return calculateDateMetrics(startDate, durationMode === "FULL" ? endDate : startDate);
  }, [startDate, endDate, durationMode]);

  // Hourly Day Fraction
  const hourlyDayFraction = useMemo(() => {
    return (totalMinutes / 480).toFixed(3);
  }, [totalMinutes]);

  // Real-time Preview API call
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const isHalf = durationMode === "HALF";
        const isHourly = durationMode === "HOURLY";

        const body: any = {
          workspaceSlug,
          employeeId: mode === "ADMIN_CREATE" ? targetEmployeeId : undefined,
          startDate,
          endDate: durationMode === "FULL" ? endDate : startDate,
          leaveType,
          reason,
          isHalfDay: isHalf,
          isHourly,
          sessionType: isHalf ? sessionType : undefined,
          startMinutes: isHourly ? startMinutes : undefined,
          endMinutes: isHourly ? endMinutes : undefined,
          totalMinutes: isHourly ? totalMinutes : undefined,
        };

        const res = await fetch("/api/leave/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const resJson = await res.json();
        if (res.ok && resJson.preview) {
          setPreview(resJson.preview);
        }
      } catch (e) {
        console.error("Preview failed:", e);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    workspaceSlug,
    targetEmployeeId,
    mode,
    startDate,
    endDate,
    durationMode,
    sessionType,
    startMinutes,
    endMinutes,
    totalMinutes,
    leaveType,
    reason,
  ]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === "ADMIN_CREATE" && !targetEmployeeId) {
      setErrorMessage("Please select the employee applying for leave");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("Please provide a reason for absence");
      return;
    }

    if (durationMode === "HOURLY" && endMinutes <= startMinutes) {
      setErrorMessage("Permission end time must be later than start time");
      return;
    }

    if (durationMode === "FULL" && new Date(endDate) < new Date(startDate)) {
      setErrorMessage("End date cannot be earlier than start date");
      return;
    }

    setSubmitting(true);
    try {
      const isHalf = durationMode === "HALF";
      const isHourly = durationMode === "HOURLY";

      const payload: any = {
        workspaceSlug,
        employeeId: mode === "ADMIN_CREATE" ? targetEmployeeId : undefined,
        startDate,
        endDate: durationMode === "FULL" ? endDate : startDate,
        leaveType,
        reason: reason.trim(),
        isHalfDay: isHalf,
        isHourly,
        sessionType: isHalf ? sessionType : "FULL_DAY",
        startMinutes: isHourly ? startMinutes : undefined,
        endMinutes: isHourly ? endMinutes : undefined,
        totalMinutes: isHourly ? totalMinutes : undefined,
      };

      let res: Response;
      if (mode === "EDIT" && initialRecord?.id) {
        res = await fetch(`/api/leave/records/${initialRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/leave/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to submit leave request");
      }

      const successMsg =
        resJson.record?.status === "REJECTED"
          ? "Request submitted: Automatically rejected under the studio 24-hour notice policy."
          : mode === "EDIT"
          ? "Leave application updated successfully."
          : "Leave application submitted successfully for studio review.";

      onSuccess(successMsg);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during submission");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategory = ADVANCED_LEAVE_TYPES.find((lt) => lt.id === leaveType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-[#E2E6F0] shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1456F0] via-[#4870EB] to-[#6366F1] px-4 py-3.5 sm:px-6 sm:py-5 text-white relative shrink-0">
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-2 sm:hidden" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-white/25 text-white backdrop-blur-xs">
              Leave Portal
            </span>
            <span className="text-white/80 text-[11px] sm:text-xs">• 100% Design Studio</span>
          </div>

          <h2 className="text-base sm:text-xl font-bold tracking-tight">
            {mode === "EDIT"
              ? "Edit Leave Application"
              : mode === "ADMIN_CREATE"
              ? "Apply on Behalf of Employee"
              : "Apply for Leave / Permission"}
          </h2>
          <p className="text-white/85 text-[11px] sm:text-xs mt-0.5 hidden sm:block max-w-xl">
            Select duration mode (full day, half day, or few hours), timings, and reason for absence.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-800 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-[11px]">Validation Alert</span>
              <span className="text-[11px]">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs no-scrollbar">
          {/* SECTION 0: TARGET EMPLOYEE (Admin Mode Only) */}
          {mode === "ADMIN_CREATE" && (
            <div className="p-3 sm:p-4 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl space-y-1.5 sm:space-y-2">
              <label className="block text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1456F0]" />
                <span>Applicant Employee *</span>
              </label>
              <select
                required
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#CEDEFF] rounded-xl text-xs font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName || emp.name} ({emp.employeeId || "EMP"}) — {emp.designation || emp.department || "Staff"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SECTION 1: LEAVE DURATION MODE */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#1456F0]" />
              <span>1. Select Duration Mode *</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {/* Full Day Card */}
              <button
                type="button"
                onClick={() => setDurationMode("FULL")}
                className={`p-2.5 sm:p-3.5 rounded-2xl border text-center sm:text-left transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${
                  durationMode === "FULL"
                    ? "bg-[#EEF4FF] border-[#1456F0] shadow-xs ring-1 ring-[#1456F0]"
                    : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                }`}
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <Sun className={`w-4 h-4 mx-auto sm:mx-0 ${durationMode === "FULL" ? "text-[#1456F0]" : "text-[#696E82]"}`} />
                  {durationMode === "FULL" && <CheckCircle2 className="w-3.5 h-3.5 text-[#1456F0] hidden sm:block" />}
                </div>
                <div className="w-full">
                  <div className="font-bold text-[#1F1F1F] text-xs">Full Day</div>
                  <div className="text-[10px] text-[#696E82] hidden sm:block">1 or more days</div>
                  <div className="text-[10px] text-[#1456F0] sm:hidden font-medium">1+ days</div>
                </div>
              </button>

              {/* Half Day Card */}
              <button
                type="button"
                onClick={() => setDurationMode("HALF")}
                className={`p-2.5 sm:p-3.5 rounded-2xl border text-center sm:text-left transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${
                  durationMode === "HALF"
                    ? "bg-[#EEF4FF] border-[#1456F0] shadow-xs ring-1 ring-[#1456F0]"
                    : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                }`}
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <Moon className={`w-4 h-4 mx-auto sm:mx-0 ${durationMode === "HALF" ? "text-[#1456F0]" : "text-[#696E82]"}`} />
                  {durationMode === "HALF" && <CheckCircle2 className="w-3.5 h-3.5 text-[#1456F0] hidden sm:block" />}
                </div>
                <div className="w-full">
                  <div className="font-bold text-[#1F1F1F] text-xs">Half Day</div>
                  <div className="text-[10px] text-[#696E82] hidden sm:block">Morning / Afternoon</div>
                  <div className="text-[10px] text-[#1456F0] sm:hidden font-medium">0.5 day</div>
                </div>
              </button>

              {/* Few Hours Leave Card */}
              <button
                type="button"
                onClick={() => setDurationMode("HOURLY")}
                className={`p-2.5 sm:p-3.5 rounded-2xl border text-center sm:text-left transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${
                  durationMode === "HOURLY"
                    ? "bg-[#EEF4FF] border-[#1456F0] shadow-xs ring-1 ring-[#1456F0]"
                    : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                }`}
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <Clock className={`w-4 h-4 mx-auto sm:mx-0 ${durationMode === "HOURLY" ? "text-[#1456F0]" : "text-[#696E82]"}`} />
                  {durationMode === "HOURLY" && <CheckCircle2 className="w-3.5 h-3.5 text-[#1456F0] hidden sm:block" />}
                </div>
                <div className="w-full">
                  <div className="font-bold text-[#1F1F1F] text-xs">Few Hours</div>
                  <div className="text-[10px] text-[#696E82] hidden sm:block">Short permission</div>
                  <div className="text-[10px] text-[#1456F0] sm:hidden font-medium">Hours</div>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: SCHEDULE & TIMING */}
          <div className="p-3 sm:p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1456F0]" />
                <span>
                  2. {durationMode === "HOURLY" ? "Permission Timing" : durationMode === "HALF" ? "Half-Day Session" : "Dates & Schedule"} *
                </span>
              </label>

              <span className="hidden sm:inline-flex text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white border border-[#CEDEFF] text-[#1456F0]">
                Studio: 10:30 AM – 06:30 PM (8h)
              </span>
            </div>

            {/* CASE A: FULL DAY */}
            {durationMode === "FULL" && (
              <div className="space-y-2.5 sm:space-y-3">
                {/* Date Presets (Horizontal Scroll on Mobile) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-semibold text-[#696E82] shrink-0">Presets:</span>
                  {[
                    { key: "TODAY", label: "Today" },
                    { key: "TOMORROW", label: "Tomorrow" },
                    { key: "NEXT_2_DAYS", label: "2 Days" },
                    { key: "THIS_FRIDAY", label: "Friday" },
                    { key: "NEXT_WEEK", label: "Mon–Fri (5d)" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyDatePreset(p.key as any)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E6F0] text-[10px] font-semibold text-[#1F1F1F] hover:bg-[#EEF4FF] hover:border-[#1456F0] whitespace-nowrap cursor-pointer transition-colors shrink-0"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Start & End Dates Side-by-Side */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 sm:px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold focus:outline-none focus:border-[#1456F0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 sm:px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold focus:outline-none focus:border-[#1456F0]"
                    />
                  </div>
                </div>

                {/* Date Metrics Pill */}
                <div className="flex items-center justify-between p-2 sm:p-2.5 bg-white rounded-xl border border-[#E2E6F0] text-[11px]">
                  <span className="text-[#696E82]">Duration:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#1F1F1F]">
                    <span className="text-emerald-700">{dateMetrics.workingDays} Working Day(s)</span>
                    <span className="text-[#CEDEFF] hidden sm:inline">•</span>
                    <span className="text-[#696E82] hidden sm:inline">({dateMetrics.calendarDays} Cal)</span>
                  </div>
                </div>
              </div>
            )}

            {/* CASE B: HALF DAY */}
            {durationMode === "HALF" && (
              <div className="space-y-2.5 sm:space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold focus:outline-none focus:border-[#1456F0]"
                  />
                </div>

                {/* Session Choice Cards Side-by-Side */}
                <div>
                  <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                    Choose Half-Day Session *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSessionType("FIRST_HALF")}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        sessionType === "FIRST_HALF"
                          ? "bg-[#EEF4FF] border-[#1456F0] ring-1 ring-[#1456F0]"
                          : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#1F1F1F] text-xs flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>First Half</span>
                        </span>
                        {sessionType === "FIRST_HALF" && <Check className="w-3.5 h-3.5 text-[#1456F0]" />}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#696E82] font-mono">10:30 AM – 02:30 PM</div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Deducts 0.5 Day</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionType("SECOND_HALF")}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        sessionType === "SECOND_HALF"
                          ? "bg-[#EEF4FF] border-[#1456F0] ring-1 ring-[#1456F0]"
                          : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#1F1F1F] text-xs flex items-center gap-1">
                          <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Second Half</span>
                        </span>
                        {sessionType === "SECOND_HALF" && <Check className="w-3.5 h-3.5 text-[#1456F0]" />}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#696E82] font-mono">02:30 PM – 06:30 PM</div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Deducts 0.5 Day</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CASE C: FEW HOURS LEAVE */}
            {durationMode === "HOURLY" && (
              <div className="space-y-2.5 sm:space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                    Permission Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold focus:outline-none focus:border-[#1456F0]"
                  />
                </div>

                {/* Quick Hourly Duration Chips (Horizontal Rail) */}
                <div>
                  <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                    Quick Duration:
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {HOURLY_PRESETS.map((preset) => (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() => handlePresetSelect(preset.minutes)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          selectedPresetMins === preset.minutes
                            ? "bg-[#1456F0] text-white border-[#1456F0] shadow-xs"
                            : "bg-white text-[#1F1F1F] border-[#E2E6F0] hover:bg-[#EEF4FF]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start & End Time Dropdowns Side-by-Side */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                      From Time *
                    </label>
                    <select
                      value={startMinutes}
                      onChange={(e) => handleStartMinutesChange(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 sm:px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                    >
                      {STUDIO_TIME_SLOTS.slice(0, -1).map((slot) => (
                        <option key={slot.minutes} value={slot.minutes}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#696E82] mb-1">
                      To Time *
                    </label>
                    <select
                      value={endMinutes}
                      onChange={(e) => handleEndMinutesChange(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 sm:px-3 py-2 bg-white rounded-xl border border-[#CEDEFF] text-xs font-semibold text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                    >
                      {STUDIO_TIME_SLOTS.filter((slot) => slot.minutes > startMinutes).map((slot) => (
                        <option key={slot.minutes} value={slot.minutes}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compact Deduction Banner */}
                <div className="p-2.5 bg-[#EEF4FF] border border-[#CEDEFF] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#696E82] block text-[10px] font-semibold">Total Permission</span>
                    <strong className="text-[#1456F0] font-mono text-xs sm:text-sm">
                      {Math.floor(totalMinutes / 60)}h {totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ""}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[#696E82] block text-[10px] font-semibold">Day Deduction</span>
                    <strong className="text-[#1F1F1F] font-mono text-xs sm:text-sm">
                      {hourlyDayFraction} Day
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: LEAVE CATEGORY (Casual, Emergency, Sick only) */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#1456F0]" />
              <span>3. Leave Category *</span>
            </label>

            {/* 3 Clean Compact Cards Side-by-Side */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {ADVANCED_LEAVE_TYPES.map((lt) => {
                const isSelected = leaveType === lt.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setLeaveType(lt.id)}
                    className={`p-2 sm:p-3 rounded-2xl border text-center sm:text-left transition-all cursor-pointer flex flex-col items-center sm:items-start justify-between ${
                      isSelected
                        ? "bg-[#EEF4FF] border-[#1456F0] ring-1 ring-[#1456F0]"
                        : "bg-white border-[#E2E6F0] hover:bg-[#F8F9FE]"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-1">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#1456F0] bg-[#1456F0]" : "border-[#CEDEFF]"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-[#696E82]">
                        {lt.code}
                      </span>
                    </div>
                    <div className="w-full">
                      <span className="font-bold text-[#1F1F1F] text-xs block truncate">{lt.label}</span>
                      <p className="text-[10px] text-[#696E82] mt-0.5 line-clamp-1 hidden sm:block">{lt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Single-Line Helper for Selected Category */}
            {currentCategory && (
              <p className="text-[11px] text-[#696E82] px-1 flex items-center gap-1">
                <span className="font-semibold text-[#1F1F1F]">{currentCategory.label}:</span>
                <span>{currentCategory.desc}</span>
              </p>
            )}
          </div>

          {/* SECTION 4: REASON FOR ABSENCE */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#1456F0]" />
              <span>4. Reason for Absence *</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for absence..."
              className="w-full px-3 py-2 rounded-xl border border-[#CEDEFF] bg-white text-xs font-normal focus:outline-none focus:border-[#1456F0]"
            />
          </div>

          {/* SECTION 5: LIVE QUOTA SUMMARY */}
          {preview && (
            <div className="p-3 sm:p-4 bg-gradient-to-br from-[#F4F7FF] to-[#E9EEFF] rounded-2xl border border-[#CEDEFF] space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-[#1456F0]">
                <span className="flex items-center gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5" />
                  <span>Provisional Calculation</span>
                </span>
                {previewLoading ? (
                  <span className="text-[10px] text-[#696E82] animate-pulse">Calculating...</span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">Active Quota</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-[#CEDEFF]">
                  <span className="text-[#696E82] text-[10px] block">Duration</span>
                  <strong className="text-xs sm:text-sm font-mono text-[#1F1F1F]">
                    {preview.requestedDays.toFixed(2)}d
                  </strong>
                </div>

                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-[#CEDEFF]">
                  <span className="text-[#696E82] text-[10px] block">Est. Paid</span>
                  <strong className="text-xs sm:text-sm font-mono text-emerald-700">
                    {preview.estimatedPaidDays.toFixed(2)}d
                  </strong>
                </div>

                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-[#CEDEFF]">
                  <span className="text-[#696E82] text-[10px] block">Est. Unpaid (LOP)</span>
                  <strong className="text-xs sm:text-sm font-mono text-rose-600">
                    {preview.estimatedUnpaidLopDays.toFixed(2)}d
                  </strong>
                </div>

                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-[#CEDEFF]">
                  <span className="text-[#696E82] text-[10px] block">Monthly Balance</span>
                  <strong className="text-xs sm:text-sm font-mono text-[#1456F0]">
                    {preview.estimatedRemainingBalance.toFixed(1)}d
                  </strong>
                </div>
              </div>

              {/* Overlap Warnings */}
              {preview.overlapWarnings?.length > 0 && (
                <div className="p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{preview.overlapWarnings.join(" ")}</span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-[#E2E6F0] flex items-center justify-end gap-2.5 z-10 shadow-lg sm:shadow-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              // Trigger form submit
              const form = (e.currentTarget.closest(".flex-col")?.querySelector("form")) as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={submitting}
            className="flex-1 sm:flex-initial px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-[#1456F0] hover:bg-[#0E46CC] text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Submitting...</span>
            ) : (
              <span>
                {mode === "EDIT"
                  ? "Save Changes"
                  : mode === "ADMIN_CREATE"
                  ? "Submit on Behalf"
                  : "Submit Application"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
