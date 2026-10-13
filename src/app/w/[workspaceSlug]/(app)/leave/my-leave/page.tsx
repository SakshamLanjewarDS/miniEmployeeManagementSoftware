"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Plus,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";

interface LeavePreviewData {
  requestedDays: number;
  isHourly: boolean;
  isHalfDay: boolean;
  sessionType?: string;
  totalMinutes?: number;
  applicableSchedule: string;
  estimatedPaidDays: number;
  estimatedUnpaidLopDays: number;
  estimatedRemainingBalance: number;
  isShortNotice: boolean;
  isExempt: boolean;
  willAutoReject: boolean;
  rejectionReason?: string;
  overlapWarnings: string[];
}

export default function EmployeeMyLeavePage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Application form state
  const [formData, setFormData] = useState({
    leaveType: "CASUAL",
    mode: "FULL" as "FULL" | "HALF" | "HOURLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    sessionType: "FIRST_HALF" as "FIRST_HALF" | "SECOND_HALF",
    startMinutes: 630, // 10:30
    endMinutes: 690,   // 11:30 (60 mins default)
    totalMinutes: 60,
    reason: "",
    isExemptShortNotice: false,
    exemptionReason: "",
  });

  const [preview, setPreview] = useState<LeavePreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // History search and filter
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;

  const fetchMyLeave = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        year: currentYear.toString(),
        month: currentMonth.toString(),
      });

      const res = await fetch(`/api/leave/my-leave?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load leave records");
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeave();
  }, [workspaceSlug, currentYear, currentMonth]);

  // Dynamic preview fetch whenever form data changes
  useEffect(() => {
    if (!isApplyModalOpen && !isEditModalOpen) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const body: any = {
          workspaceSlug,
          startDate: formData.startDate,
          endDate: formData.mode === "FULL" ? formData.endDate : formData.startDate,
          leaveType: formData.leaveType,
          reason: formData.reason,
          isHalfDay: formData.mode === "HALF",
          isHourly: formData.mode === "HOURLY",
          sessionType: formData.mode === "HALF" ? formData.sessionType : undefined,
          startMinutes: formData.mode === "HOURLY" ? formData.startMinutes : undefined,
          endMinutes: formData.mode === "HOURLY" ? formData.endMinutes : undefined,
          totalMinutes: formData.mode === "HOURLY" ? formData.totalMinutes : undefined,
          isExemptShortNotice: formData.isExemptShortNotice,
          exemptionReason: formData.exemptionReason,
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
  }, [formData, isApplyModalOpen, isEditModalOpen, workspaceSlug]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Submit new application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);
    try {
      const payload: any = {
        workspaceSlug,
        startDate: formData.startDate,
        endDate: formData.mode === "FULL" ? formData.endDate : formData.startDate,
        leaveType: formData.leaveType,
        reason: formData.reason,
        isHalfDay: formData.mode === "HALF",
        isHourly: formData.mode === "HOURLY",
        sessionType: formData.mode === "HALF" ? formData.sessionType : "FULL_DAY",
        startMinutes: formData.mode === "HOURLY" ? formData.startMinutes : undefined,
        endMinutes: formData.mode === "HOURLY" ? formData.endMinutes : undefined,
        totalMinutes: formData.mode === "HOURLY" ? formData.totalMinutes : undefined,
        isExemptShortNotice: formData.isExemptShortNotice,
        exemptionReason: formData.exemptionReason,
      };

      const res = await fetch("/api/leave/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to submit leave application");
      }

      setIsApplyModalOpen(false);
      setActionMessage({
        type: "success",
        text: resJson.record?.status === "REJECTED"
          ? "Request submitted: Automatically rejected under 24-hour notice policy."
          : "Leave application submitted successfully for studio review.",
      });
      fetchMyLeave();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit pending application
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const payload: any = {
        workspaceSlug,
        startDate: formData.startDate,
        endDate: formData.mode === "FULL" ? formData.endDate : formData.startDate,
        leaveType: formData.leaveType,
        reason: formData.reason,
        isHalfDay: formData.mode === "HALF",
        isHourly: formData.mode === "HOURLY",
        sessionType: formData.mode === "HALF" ? formData.sessionType : "FULL_DAY",
        startMinutes: formData.mode === "HOURLY" ? formData.startMinutes : undefined,
        endMinutes: formData.mode === "HOURLY" ? formData.endMinutes : undefined,
        totalMinutes: formData.mode === "HOURLY" ? formData.totalMinutes : undefined,
        isExemptShortNotice: formData.isExemptShortNotice,
        exemptionReason: formData.exemptionReason,
      };

      const res = await fetch(`/api/leave/records/${selectedRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to update pending leave request");
      }

      setIsEditModalOpen(false);
      setActionMessage({ type: "success", text: "Pending leave application updated (version incremented)." });
      fetchMyLeave();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Withdraw pending application
  const handleWithdraw = async (recordId: string) => {
    if (!confirm("Are you sure you want to withdraw this pending leave request? This cannot be undone.")) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/leave/records/${recordId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to withdraw leave request");
      }
      setActionMessage({ type: "success", text: "Leave request withdrawn successfully." });
      fetchMyLeave();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit cancellation request for approved leave
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !cancellationReason.trim()) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/leave/records/${selectedRecord.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          reason: cancellationReason.trim(),
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to request leave cancellation");
      }

      setIsCancelModalOpen(false);
      setCancellationReason("");
      setActionMessage({
        type: "success",
        text: "Cancellation request submitted. The leave remains active until leadership approves.",
      });
      fetchMyLeave();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Populate form for editing
  const openEditModal = (rec: any) => {
    setSelectedRecord(rec);
    const startStr = new Date(rec.startDate).toISOString().split("T")[0];
    const endStr = new Date(rec.endDate).toISOString().split("T")[0];
    let mode: "FULL" | "HALF" | "HOURLY" = "FULL";
    if (rec.isHourly) mode = "HOURLY";
    else if (rec.isHalfDay) mode = "HALF";

    setFormData({
      leaveType: rec.leaveType || "CASUAL",
      mode,
      startDate: startStr,
      endDate: endStr,
      sessionType: rec.sessionType === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF",
      startMinutes: rec.startMinutes || 630,
      endMinutes: rec.endMinutes || 690,
      totalMinutes: rec.totalMinutes || 60,
      reason: rec.reason || "",
      isExemptShortNotice: !!rec.isExemptShortNotice,
      exemptionReason: rec.exemptionReason || "",
    });
    setIsEditModalOpen(true);
  };

  const openCancelModal = (rec: any) => {
    setSelectedRecord(rec);
    setCancellationReason("");
    setIsCancelModalOpen(true);
  };

  const openDetailDrawer = (rec: any) => {
    setSelectedRecord(rec);
    setIsDetailDrawerOpen(true);
  };

  const summary = data?.monthlySummary;
  const history = data?.allHistory || [];

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter((h: any) => {
      const matchesSearch =
        !historySearch ||
        h.reason?.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.leaveType?.toLowerCase().includes(historySearch.toLowerCase());
      const matchesStatus =
        historyStatusFilter === "ALL" || h.status === historyStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [history, historySearch, historyStatusFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / historyPageSize) || 1;

  // Separate pending requests from approved consumption
  const pendingRequests = useMemo(() => {
    return history.filter((h: any) => h.status === "PENDING");
  }, [history]);

  const approvedRequests = useMemo(() => {
    return history.filter((h: any) => h.status === "APPROVED");
  }, [history]);

  // Calendar days generation for current month
  const calendarDays = useMemo(() => {
    const year = currentYear;
    const month = currentMonth;
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sun
    const totalDays = new Date(year, month, 0).getDate();

    const days = [];
    // Padding for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Check if employee has leave on this date
      const leaveOnDay = history.find((h: any) => {
        if (h.status !== "APPROVED" && h.status !== "PENDING") return false;
        const s = new Date(h.startDate).toISOString().split("T")[0];
        const e = new Date(h.endDate).toISOString().split("T")[0];
        return dateStr >= s && dateStr <= e;
      });

      days.push({
        dayNumber: d,
        dateStr,
        isWeekend: isSunday || isSaturday,
        leave: leaveOnDay,
      });
    }

    return days;
  }, [currentYear, currentMonth, history]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Staff Portal</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">My Leave Records</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">My Leave & Quota Summary</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Self-service leave applications, pending edits, whole-request cancellation, and live quota tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Apply Leave Button */}
          <button
            id="btn-apply-leave"
            onClick={() => {
              setSelectedRecord(null);
              setFormData({
                leaveType: "CASUAL",
                mode: "FULL",
                startDate: new Date().toISOString().split("T")[0],
                endDate: new Date().toISOString().split("T")[0],
                sessionType: "FIRST_HALF",
                startMinutes: 630,
                endMinutes: 690,
                totalMinutes: 60,
                reason: "",
                isExemptShortNotice: false,
                exemptionReason: "",
              });
              setIsApplyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#5A81FA] text-white text-xs font-bold shadow-xs hover:bg-[#4870EB] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          {/* Month Selector */}
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#1F1F1F] min-w-[120px] text-center font-mono">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* 4 Policy KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Monthly Quota
          </div>
          <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
            {summary ? Number(summary.monthlyPaidAllowance).toFixed(1) : "2.0"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Standard studio allowance</div>
        </div>

        <div className="p-4 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] shadow-2xs">
          <div className="text-[11px] text-[#2C308D] font-semibold uppercase tracking-wider">
            Paid Days Used
          </div>
          <div className="text-2xl font-extrabold text-[#2C308D] mt-2 font-mono">
            {summary ? Number(summary.paidLeaveDays).toFixed(2) : "0.00"} Days
          </div>
          <div className="text-[11px] text-[#4870EB] mt-0.5">Covered by monthly quota</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Unpaid LOP Days
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
            {summary ? Number(summary.unpaidLopDays).toFixed(2) : "0.00"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Deducted from salary (Loss of Pay)</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Remaining Allowance
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2 font-mono">
            {summary ? Number(summary.remainingPaidAllowance).toFixed(2) : "2.00"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Available for {monthNames[currentMonth - 1]}</div>
        </div>
      </div>

      {/* Grid: Left Column (Pending & Approved Lists) | Right Column (Calendar & Studio Policy) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Pending Requests & Action Required */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-2">
                  <span>Pending Leave Requests</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {pendingRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-[#696E82]">
                  Requests awaiting studio leadership review. You may edit or withdraw your pending submissions.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#696E82]">Loading pending requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#696E82] bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                No pending leave requests. All prior submissions have been reviewed.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E6F0]">
                {pendingRequests.map((req: any) => {
                  const startStr = new Date(req.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const endStr = new Date(req.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={req.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => openDetailDrawer(req)}
                        className="cursor-pointer group flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1F1F1F] font-mono group-hover:text-[#5A81FA] transition-colors">
                            {startStr} {startStr !== endStr ? `— ${endStr}` : ""}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            v{req.version || 1} • Under Review
                          </span>
                        </div>
                        <div className="text-[11px] text-[#696E82] flex items-center gap-2 mt-0.5">
                          <span>{req.leaveType}</span>
                          <span>•</span>
                          <span>
                            {req.isHourly
                              ? `${req.totalMinutes} mins (Hourly)`
                              : req.isHalfDay
                              ? `0.5 Day (${req.sessionType || "Half Day"})`
                              : `${Number(req.days)} Day(s)`}
                          </span>
                        </div>
                        {req.reason && (
                          <div className="text-[11px] text-[#696E82] italic mt-1 line-clamp-1">
                            &ldquo;{req.reason}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Action buttons: Edit & Withdraw */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(req)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F8F9FD] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#5A81FA]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleWithdraw(req.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Withdraw</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Approved Consumption & Whole-Request Cancellation */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-2">
                  <span>Approved Leave Consumption</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {approvedRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-[#696E82]">
                  Active approved leave affecting current monthly quota. You may request cancellation if plans change.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#696E82]">Loading approved records...</div>
            ) : approvedRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#696E82] bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                No approved leave records currently consuming quota.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E6F0]">
                {approvedRequests.map((req: any) => {
                  const startStr = new Date(req.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const endStr = new Date(req.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  const hasPendingCancel = req.cancellationRequests?.some((c: any) => c.status === "PENDING");

                  return (
                    <div
                      key={req.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => openDetailDrawer(req)}
                        className="cursor-pointer group flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1F1F1F] font-mono group-hover:text-[#5A81FA] transition-colors">
                            {startStr} {startStr !== endStr ? `— ${endStr}` : ""}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                          {hasPendingCancel && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Cancellation Requested
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#696E82] flex items-center gap-2 mt-0.5">
                          <span>{req.leaveType}</span>
                          <span>•</span>
                          <span>Total: {Number(req.days)} Day(s)</span>
                        </div>
                      </div>

                      {/* Request Cancellation Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasPendingCancel ? (
                          <span className="text-[11px] text-amber-700 italic">Cancellation pending review</span>
                        ) : (
                          <button
                            onClick={() => openCancelModal(req)}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request Cancellation</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Personal Leave Calendar & Studio Holidays */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Personal Leave Calendar</h3>
                <p className="text-xs text-[#696E82]">
                  {monthNames[currentMonth - 1]} {currentYear}
                </p>
              </div>
              <CalendarDays className="w-4 h-4 text-[#5A81FA]" />
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="font-bold text-[#696E82] py-1 text-[11px]">
                  {d}
                </div>
              ))}
              {calendarDays.map((item, idx) => {
                if (!item.dayNumber) {
                  return <div key={`empty-${idx}`} className="h-9" />;
                }

                let bgClass = "bg-white hover:bg-[#F8F9FE] text-[#1F1F1F]";
                let badge = null;

                if (item.leave) {
                  if (item.leave.status === "APPROVED") {
                    bgClass = "bg-emerald-100 text-emerald-900 font-bold border border-emerald-300";
                    badge = "L";
                  } else if (item.leave.status === "PENDING") {
                    bgClass = "bg-amber-100 text-amber-900 font-bold border border-amber-300";
                    badge = "?";
                  }
                } else if (item.isWeekend) {
                  bgClass = "bg-[#F8F9FD] text-[#696E82]";
                }

                return (
                  <div
                    key={`day-${item.dayNumber}`}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs relative transition-colors ${bgClass}`}
                    title={
                      item.leave
                        ? `${item.leave.leaveType} (${item.leave.status})`
                        : item.isWeekend
                        ? "Non-working weekend"
                        : "Working day"
                    }
                  >
                    <span>{item.dayNumber}</span>
                    {badge && (
                      <span className="text-[8px] font-black leading-none uppercase">
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#E2E6F0] flex items-center justify-between text-[11px] text-[#696E82]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Approved Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E2E6F0]" />
                <span>Weekend</span>
              </div>
            </div>
          </div>

          {/* Studio Policy Information Card */}
          <div className="bg-[#F8F9FE] rounded-3xl border border-[#CEDEFF] p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#2C308D]">
              <ShieldAlert className="w-4 h-4 text-[#5A81FA]" />
              <span>Studio Leave Policy Rules</span>
            </div>
            <ul className="space-y-1.5 text-[#4870EB] text-[11px]">
              <li>• Default 2 eligible paid days per calendar month.</li>
              <li>• Working schedule: 10:30–18:30 IST (8 hrs / day).</li>
              <li>• Half-day = 0.5 day; 60 mins hourly = 0.125 day.</li>
              <li>• Ordinary requests require &ge; 24h notice prior to session start.</li>
              <li>• Sick & Emergency leaves bypass short-notice rejections.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Historical Records Archive (Searchable, Filterable, Paginated) */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1F1F1F]">
              All-Time Leave History ({filteredHistory.length} records)
            </h3>
            <p className="text-xs text-[#696E82]">
              Search and filter your complete personal leave history
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search reason or type..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={historyStatusFilter}
              onChange={(e) => {
                setHistoryStatusFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {paginatedHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#696E82] bg-[#F8F9FD] rounded-2xl">
            No matching leave records found.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {paginatedHistory.map((h: any) => (
              <div
                key={h.id}
                onClick={() => openDetailDrawer(h)}
                className="py-3 flex items-center justify-between text-xs hover:bg-[#F8F9FE] px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-mono font-semibold text-[#1F1F1F]">
                    {new Date(h.startDate).toLocaleDateString()} — {new Date(h.endDate).toLocaleDateString()}
                  </span>
                  <span className="text-[#696E82] ml-2 font-mono">
                    ({Number(h.days)} Day(s), {h.leaveType})
                  </span>
                  {h.reason && (
                    <span className="text-[#696E82] ml-2 italic text-[11px] truncate max-w-xs inline-block align-bottom">
                      &ldquo;{h.reason}&rdquo;
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : h.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : h.status === "REJECTED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {h.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalHistoryPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E6F0] text-xs text-[#696E82]">
            <span>
              Page {historyPage} of {totalHistoryPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-[#E2E6F0] disabled:opacity-50 hover:bg-[#F8F9FD]"
              >
                Previous
              </button>
              <button
                disabled={historyPage === totalHistoryPages}
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-[#E2E6F0] disabled:opacity-50 hover:bg-[#F8F9FD]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: APPLY LEAVE ================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Apply For Studio Leave</h3>
                <p className="text-xs text-[#696E82]">
                  Dynamic preview with 24-hour notice validation and provisional quota split
                </p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-5 space-y-4 text-xs">
              {/* Mode Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Duration Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["FULL", "HALF", "HOURLY"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, mode: m })}
                      className={`py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        formData.mode === m
                          ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                          : "bg-white text-[#1F1F1F] border-[#E2E6F0] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      {m === "FULL" ? "Full Day" : m === "HALF" ? "Half Day" : "Hourly"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                    Leave Type
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium focus:outline-none focus:border-[#5A81FA]"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave (Exempt Notice)</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="MATERNITY">Maternity / Paternity</option>
                    <option value="LOSS_OF_PAY">Loss of Pay (Unpaid)</option>
                  </select>
                </div>

                {formData.mode === "HALF" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                      Half-Day Session
                    </label>
                    <select
                      value={formData.sessionType}
                      onChange={(e) => setFormData({ ...formData, sessionType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium focus:outline-none focus:border-[#5A81FA]"
                    >
                      <option value="FIRST_HALF">First Half (10:30–14:30)</option>
                      <option value="SECOND_HALF">Second Half (14:30–18:30)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                    required
                  />
                </div>

                {formData.mode === "FULL" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Hourly Mode Controls */}
              {formData.mode === "HOURLY" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F9FE] rounded-2xl border border-[#CEDEFF]">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#696E82] mb-1">
                      Duration in Minutes
                    </label>
                    <input
                      type="number"
                      step="15"
                      min="15"
                      max="480"
                      value={formData.totalMinutes}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10) || 60;
                        setFormData({
                          ...formData,
                          totalMinutes: mins,
                          endMinutes: formData.startMinutes + mins,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-[#696E82] mb-1">
                      Equivalent Days
                    </span>
                    <span className="inline-block py-1.5 font-bold font-mono text-[#2C308D]">
                      {(formData.totalMinutes / 480).toFixed(3)} Day(s) (8-hr day)
                    </span>
                  </div>
                </div>
              )}

              {/* Exemption Checkbox for Short Notice */}
              <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isExemptShortNotice}
                    onChange={(e) => setFormData({ ...formData, isExemptShortNotice: e.target.checked })}
                    className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <span className="text-[11px] font-semibold text-[#1F1F1F]">
                    Emergency / Unforeseen Exemption from 24h Notice Requirement
                  </span>
                </label>
                {formData.isExemptShortNotice && (
                  <input
                    type="text"
                    placeholder="Provide exemption justification (e.g., sudden illness, hospital visit)..."
                    value={formData.exemptionReason}
                    onChange={(e) => setFormData({ ...formData, exemptionReason: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                  />
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="State your reason for requesting leave..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                  required
                />
              </div>

              {/* DYNAMIC REAL-TIME PREVIEW PANEL */}
              {preview && (
                <div className="p-3.5 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#2C308D]">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>Provisional Calculation Preview</span>
                    </span>
                    <span className="text-[10px] font-normal italic text-[#696E82]">
                      Subject to leadership approval
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#696E82]">Duration: </span>
                      <strong className="text-[#1F1F1F] font-mono">
                        {preview.requestedDays.toFixed(2)} Day(s)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#696E82]">Schedule: </span>
                      <strong className="text-[#1F1F1F] font-mono">10:30–18:30 IST</strong>
                    </div>
                    <div>
                      <span className="text-[#696E82]">Provisional Paid: </span>
                      <strong className="text-emerald-700 font-mono">
                        {preview.estimatedPaidDays.toFixed(2)} Day(s)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#696E82]">Provisional LOP: </span>
                      <strong className="text-rose-700 font-mono">
                        {preview.estimatedUnpaidLopDays.toFixed(2)} Day(s)
                      </strong>
                    </div>
                  </div>

                  {/* Notice policy status */}
                  {preview.willAutoReject ? (
                    <div className="p-2 bg-rose-100 text-rose-800 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Notice alert: {preview.rejectionReason}</span>
                    </div>
                  ) : preview.isShortNotice && preview.isExempt ? (
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Short-notice exemption applied (requires leadership review).</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Notice policy: Compliant (&ge;24h notice).</span>
                    </div>
                  )}

                  {/* Overlap warnings */}
                  {preview.overlapWarnings?.length > 0 && (
                    <div className="p-2 bg-amber-50 text-amber-800 rounded-xl text-[11px]">
                      {preview.overlapWarnings.join(" ")}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#5A81FA] text-white font-bold hover:bg-[#4870EB] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PENDING LEAVE ================= */}
      {isEditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Edit Pending Application</h3>
                <p className="text-xs text-[#696E82]">
                  Modifying a pending request revalidates policy and increments request version
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              {/* Leave Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                    Leave Type
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium focus:outline-none focus:border-[#5A81FA]"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="MATERNITY">Maternity / Paternity</option>
                    <option value="LOSS_OF_PAY">Loss of Pay (Unpaid)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                    required
                  />
                </div>
              </div>

              {formData.mode === "FULL" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                    required
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                  required
                />
              </div>

              {/* Dynamic Preview */}
              {preview && (
                <div className="p-3 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] text-[11px] space-y-1 text-[#2C308D]">
                  <span className="font-bold">Updated Provisional Split: </span>
                  <span>{preview.requestedDays.toFixed(2)} Day(s)</span> •{" "}
                  <span>{preview.estimatedPaidDays.toFixed(2)} Paid</span> •{" "}
                  <span>{preview.estimatedUnpaidLopDays.toFixed(2)} Unpaid LOP</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#5A81FA] text-white font-bold hover:bg-[#4870EB] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REQUEST CANCELLATION ================= */}
      {isCancelModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Request Leave Cancellation</h3>
                <p className="text-xs text-[#696E82]">
                  Approved leave remains active and consumes quota until leadership approves
                </p>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] space-y-1">
                <div className="font-bold text-[#1F1F1F]">
                  {new Date(selectedRecord.startDate).toLocaleDateString()} —{" "}
                  {new Date(selectedRecord.endDate).toLocaleDateString()}
                </div>
                <div className="text-[11px] text-[#696E82]">
                  {Number(selectedRecord.days)} Day(s) • {selectedRecord.leaveType}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#696E82] uppercase mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Explain why you are requesting to cancel this approved leave..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:outline-none focus:border-[#5A81FA]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !cancellationReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit Cancellation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DRAWER: DETAILS & TIMELINE ================= */}
      {isDetailDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Leave Record Details</h3>
                <p className="text-xs text-[#696E82]">Record ID: {selectedRecord.id}</p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-1 rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Pill & Key Fields */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                <span className="font-semibold text-[#696E82]">Current Status</span>
                <span className="font-bold text-[#1F1F1F] font-mono">{selectedRecord.status}</span>
              </div>

              <div className="space-y-2 text-[#1F1F1F]">
                <div>
                  <span className="text-[#696E82] block text-[11px]">Dates</span>
                  <span className="font-bold font-mono">
                    {new Date(selectedRecord.startDate).toLocaleDateString()} —{" "}
                    {new Date(selectedRecord.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-[#696E82] block text-[11px]">Type & Duration</span>
                  <span className="font-semibold">
                    {selectedRecord.leaveType} • {Number(selectedRecord.days)} Day(s)
                  </span>
                </div>

                <div>
                  <span className="text-[#696E82] block text-[11px]">Reason</span>
                  <p className="italic text-[#696E82] mt-0.5">&ldquo;{selectedRecord.reason || "None"}&rdquo;</p>
                </div>

                {selectedRecord.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
                    <span className="font-bold block text-[11px]">Rejection Reason</span>
                    <span>{selectedRecord.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="pt-4 border-t border-[#E2E6F0] space-y-3">
              <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                Activity Timeline
              </h4>
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E6F0] text-xs">
                <div className="flex items-start gap-3 pl-6 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5A81FA] absolute left-1 top-1" />
                  <div>
                    <span className="font-bold text-[#1F1F1F]">Application Submitted</span>
                    <span className="block text-[11px] text-[#696E82]">
                      {new Date(selectedRecord.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedRecord.reviewedAt && (
                  <div className="flex items-start gap-3 pl-6 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute left-1 top-1" />
                    <div>
                      <span className="font-bold text-[#1F1F1F]">
                        Reviewed ({selectedRecord.status})
                      </span>
                      <span className="block text-[11px] text-[#696E82]">
                        {new Date(selectedRecord.reviewedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {selectedRecord.cancelledAt && (
                  <div className="flex items-start gap-3 pl-6 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-500 absolute left-1 top-1" />
                    <div>
                      <span className="font-bold text-[#1F1F1F]">Cancelled</span>
                      <span className="block text-[11px] text-[#696E82]">
                        {new Date(selectedRecord.cancelledAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E6F0]">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl border border-[#E2E6F0] text-[#1F1F1F] font-bold hover:bg-[#F8F9FE] text-xs cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
