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
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Sparkles,
  ShieldCheck,
  Clock3,
  Flame,
  CalendarRange,
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";
import AdvancedLeaveFormModal from "@/components/leave/AdvancedLeaveFormModal";
import { parseCompositeLeaveReason, formatMinutesToTime } from "@/lib/leave/form-helpers";

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

  // Active view tab: "analytics" (Advance Leave Analytics) vs "calendar" (Calendar & Applications)
  const [activeTab, setActiveTab] = useState<"analytics" | "calendar">("analytics");

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [colleagues, setColleagues] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/employees?workspaceSlug=${workspaceSlug}&limit=100`)
      .then((res) => res.json())
      .then((json) => {
        if (json.employees || json.data) {
          setColleagues(json.employees || json.data || []);
        }
      })
      .catch(() => {});
  }, [workspaceSlug]);

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

  const formatLocalDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const s = typeof dateVal === "string" ? dateVal : dateVal.toISOString();
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[m - 1]} ${d}`;
  };

  // History search and filter
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;

  const fetchMyLeave = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeave();
  }, [workspaceSlug, currentYear, currentMonth]);

  // Real-time dynamic updates: visible polling + tab focus revalidation + cross-tab live events
  useRealtimeSubscription(["LEAVE_UPDATED"], () => fetchMyLeave(true), { intervalMs: 20000 });

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
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
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
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
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
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
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
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
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

  // Comprehensive Advance Analytics Engine
  const analytics = useMemo(() => {
    const currentYearLeaves = history.filter((h: any) => {
      const s = new Date(h.startDate);
      return s.getFullYear() === currentYear;
    });

    const approvedLeaves = currentYearLeaves.filter((h: any) => h.status === "APPROVED");
    const allowance = summary?.monthlyPaidAllowance ? Number(summary.monthlyPaidAllowance) : 2.0;

    // 1. Month-wise stats for currentYear (Jan - Dec)
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = monthNamesShort.map((mName, idx) => {
      const mNum = idx + 1;
      const mLeaves = approvedLeaves.filter((h: any) => {
        const d = new Date(h.startDate);
        return d.getMonth() + 1 === mNum;
      });

      const totalDays = mLeaves.reduce((sum: number, h: any) => sum + (Number(h.days) || 0), 0);
      const paidDays = Math.min(allowance, totalDays);
      const unpaidLopDays = Math.max(0, totalDays - allowance);

      return {
        monthNumber: mNum,
        monthName: mName,
        totalDays: Number(totalDays.toFixed(2)),
        paidDays: Number(paidDays.toFixed(2)),
        unpaidLopDays: Number(unpaidLopDays.toFixed(2)),
        requestCount: mLeaves.length,
        isCurrent: mNum === currentMonth,
      };
    });

    const maxMonthDays = Math.max(3, ...monthlyData.map((m) => m.totalDays));

    // 2. YTD Totals for active year
    const ytdTotalDays = monthlyData.reduce((sum, m) => sum + m.totalDays, 0);
    const ytdPaidDays = monthlyData.reduce((sum, m) => sum + m.paidDays, 0);
    const ytdUnpaidLopDays = monthlyData.reduce((sum, m) => sum + m.unpaidLopDays, 0);

    // 3. Typology breakdown for currentYear approved
    let casualDays = 0;
    let sickDays = 0;
    let emergencyDays = 0;
    let annualDays = 0;
    let hourlyDays = 0;
    let halfDays = 0;
    let totalHourlyMinutes = 0;
    let hourlyRequestsCount = 0;
    let emergencyRequestsCount = 0;
    let sickRequestsCount = 0;
    let casualRequestsCount = 0;

    approvedLeaves.forEach((h: any) => {
      const d = Number(h.days) || 0;
      const type = (h.leaveType || "").toUpperCase();

      if (h.isHourly) {
        hourlyDays += d;
        totalHourlyMinutes += h.totalMinutes || (d * 480);
        hourlyRequestsCount++;
      } else if (h.isHalfDay) {
        halfDays += d;
      }

      if (type.includes("SICK") || type.includes("MEDICAL")) {
        sickDays += d;
        sickRequestsCount++;
      } else if (type.includes("EMERGENCY")) {
        emergencyDays += d;
        emergencyRequestsCount++;
      } else if (type.includes("ANNUAL") || type.includes("PRIVILEGE")) {
        annualDays += d;
      } else {
        casualDays += d;
        casualRequestsCount++;
      }
    });

    // 4. Day of Week Breakdown
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    let mondayFridayCount = 0;
    let totalDayHits = 0;

    approvedLeaves.forEach((h: any) => {
      const s = new Date(h.startDate);
      const day = s.getDay();
      dayOfWeekCounts[day] += (Number(h.days) || 1);
      totalDayHits += (Number(h.days) || 1);
      if (day === 1 || day === 5) {
        mondayFridayCount += (Number(h.days) || 1);
      }
    });

    const maxDayHit = Math.max(1, ...dayOfWeekCounts);
    const weekendAdjacentPercent = totalDayHits > 0 ? Math.round((mondayFridayCount / totalDayHits) * 100) : 0;

    // 5. 24-Hour Notice Policy Compliance
    let compliantCount = 0;
    let shortNoticeCount = 0;
    currentYearLeaves.forEach((h: any) => {
      if (h.submittedAt && h.startDate) {
        const subTime = new Date(h.submittedAt).getTime();
        const startTime = new Date(h.startDate).getTime();
        const diffHours = (startTime - subTime) / (1000 * 60 * 60);
        if (diffHours >= 24) {
          compliantCount++;
        } else {
          shortNoticeCount++;
        }
      }
    });
    const totalSubmissions = compliantCount + shortNoticeCount;
    const complianceRate = totalSubmissions > 0 ? Math.round((compliantCount / totalSubmissions) * 100) : 100;

    // 6. Approval Rates
    const totalDecided = currentYearLeaves.filter((h: any) => h.status === "APPROVED" || h.status === "REJECTED").length;
    const totalApprovedCount = approvedLeaves.length;
    const approvalRate = totalDecided > 0 ? Math.round((totalApprovedCount / totalDecided) * 100) : 100;

    // 7. Upcoming Approved Absences
    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingLeaves = history.filter((h: any) => {
      if (h.status !== "APPROVED") return false;
      const endStr = new Date(h.endDate).toISOString().split("T")[0];
      return endStr >= todayStr;
    });

    const totalCategorizedDays = casualDays + sickDays + emergencyDays + annualDays || 1;

    return {
      monthlyData,
      maxMonthDays,
      ytdTotalDays: Number(ytdTotalDays.toFixed(2)),
      ytdPaidDays: Number(ytdPaidDays.toFixed(2)),
      ytdUnpaidLopDays: Number(ytdUnpaidLopDays.toFixed(2)),
      totalApprovedInYear: approvedLeaves.length,
      annualQuotaAccrued: currentMonth * allowance,
      annualQuotaTotal: 12 * allowance,
      casualDays: Number(casualDays.toFixed(2)),
      casualPercent: Math.round((casualDays / totalCategorizedDays) * 100),
      casualRequestsCount,
      sickDays: Number(sickDays.toFixed(2)),
      sickPercent: Math.round((sickDays / totalCategorizedDays) * 100),
      sickRequestsCount,
      emergencyDays: Number(emergencyDays.toFixed(2)),
      emergencyPercent: Math.round((emergencyDays / totalCategorizedDays) * 100),
      emergencyRequestsCount,
      annualDays: Number(annualDays.toFixed(2)),
      hourlyDays: Number(hourlyDays.toFixed(2)),
      hourlyDaysEquivalent: (totalHourlyMinutes / 480).toFixed(2),
      halfDays: Number(halfDays.toFixed(2)),
      totalHourlyHours: (totalHourlyMinutes / 60).toFixed(1),
      hourlyRequestsCount,
      dayOfWeekCounts,
      daysOfWeek,
      maxDayHit,
      weekendAdjacentPercent,
      complianceRate,
      approvalRate,
      upcomingLeaves,
      totalApplications: currentYearLeaves.length,
    };
  }, [history, currentYear, currentMonth, summary]);

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
          <div className="flex items-center gap-2 type-helper text-[#4B5565] mb-1">
            <span>Staff Portal</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">My Leave Records</span>
          </div>
          <h1 className="type-page-title text-[#1F1F1F]">My Leave & Quota Summary</h1>
          <p className="type-helper text-[#4B5565] mt-0.5">
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

      {/* View Switcher: Advance Analytics vs Calendar & Requests */}
      <div className="flex items-center gap-2 p-1.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "bg-[#5A81FA] text-white shadow-xs"
              : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Advance Leave Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "calendar"
              ? "bg-[#5A81FA] text-white shadow-xs"
              : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Monthly Calendar & Requests</span>
        </button>
      </div>

      {/* ADVANCE ANALYTICS TAB CONTENT */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* 4 Annual KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                  Total Absences (YTD)
                </div>
                <Activity className="w-4 h-4 text-[#5A81FA]" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
                {analytics.ytdTotalDays} <span className="text-sm font-normal text-[#696E82]">Days</span>
              </div>
              <div className="text-[11px] text-[#696E82] mt-1 flex items-center justify-between">
                <span>{analytics.totalApprovedInYear} approved in {currentYear}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F2F4FF] text-[#2C308D]">
                  {analytics.totalApplications} applied
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                  Paid vs Unpaid (LOP)
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono flex items-baseline gap-1.5">
                <span className="text-[#5A81FA]">{analytics.ytdPaidDays}d</span>
                <span className="type-helper text-[#4B5565]">paid /</span>
                <span className="text-rose-600">{analytics.ytdUnpaidLopDays}d</span>
                <span className="type-helper text-[#4B5565]">LOP</span>
              </div>
              {/* Mini visual bar */}
              <div className="w-full bg-[#E2E6F0] h-1.5 rounded-full overflow-hidden mt-2 flex">
                <div
                  className="bg-[#5A81FA] h-full"
                  style={{
                    width: `${analytics.ytdTotalDays > 0 ? (analytics.ytdPaidDays / analytics.ytdTotalDays) * 100 : 100}%`,
                  }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{
                    width: `${analytics.ytdTotalDays > 0 ? (analytics.ytdUnpaidLopDays / analytics.ytdTotalDays) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-[#696E82] mt-1">
                LOP results in monthly salary deduction
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                  Emergency & Sick
                </div>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
                {analytics.emergencyDays + analytics.sickDays} <span className="text-sm font-normal text-[#696E82]">Days</span>
              </div>
              <div className="text-[11px] text-[#696E82] mt-1 flex items-center justify-between">
                <span>{analytics.emergencyRequestsCount} Emergency · {analytics.sickRequestsCount} Medical</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Exempt
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
                  Hourly & Half-Days
                </div>
                <Clock3 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
                {analytics.totalHourlyHours} <span className="text-sm font-normal text-[#696E82]">Hrs</span>
              </div>
              <div className="text-[11px] text-[#696E82] mt-1 flex items-center justify-between">
                <span>{analytics.hourlyRequestsCount} permissions ({analytics.hourlyDaysEquivalent}d eq)</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                  {analytics.halfDays} Half-Days
                </span>
              </div>
            </div>
          </div>

          {/* 12-Month Interactive Stacked Bar Chart & Trajectory */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6F0] pb-4">
              <div>
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#5A81FA]" />
                  <span>Month-Wise Leave Trajectory ({currentYear})</span>
                </h3>
                <p className="type-helper text-[#4B5565] mt-0.5">
                  Click any month bar to inspect or change the active calendar month. Stacked comparison of Paid Quota vs Loss of Pay (LOP).
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#5A81FA]" />
                  <span className="text-[#696E82] font-medium">Paid Quota</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500" />
                  <span className="text-[#696E82] font-medium">Unpaid LOP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-[#5A81FA] bg-white" />
                  <span className="text-[#696E82] font-medium">Current Month</span>
                </div>
              </div>
            </div>

            {/* Interactive 12-Month Bar Grid */}
            <div className="pt-4">
              <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-56 pb-2 border-b border-[#E2E6F0]">
                {analytics.monthlyData.map((m) => {
                  const maxVal = Math.max(analytics.maxMonthDays, 3);
                  const paidHeightPct = (m.paidDays / maxVal) * 100;
                  const lopHeightPct = (m.unpaidLopDays / maxVal) * 100;

                  return (
                    <div
                      key={`month-bar-${m.monthNumber}`}
                      onClick={() => setCurrentMonth(m.monthNumber)}
                      className={`group flex flex-col items-center justify-end h-full cursor-pointer relative transition-all rounded-xl p-1 ${
                        m.isCurrent
                          ? "bg-[#F2F4FF] ring-2 ring-[#5A81FA]"
                          : "hover:bg-[#F8F9FE]"
                      }`}
                    >
                      {/* Floating tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 z-20 pointer-events-none bg-[#1F1F1F] text-white text-[10px] p-2 rounded-xl shadow-lg whitespace-nowrap text-center">
                        <div className="font-bold">{m.monthName} {currentYear}</div>
                        <div className="text-emerald-300">Paid: {m.paidDays}d</div>
                        <div className="text-rose-300">LOP: {m.unpaidLopDays}d</div>
                        <div className="text-gray-300 text-[9px] border-t border-gray-700 mt-0.5 pt-0.5">
                          Total: {m.totalDays}d ({m.requestCount} leaves)
                        </div>
                      </div>

                      {/* Bar Value at top */}
                      <span className="text-[10px] font-mono font-bold text-[#1F1F1F] mb-1">
                        {m.totalDays > 0 ? m.totalDays : "-"}
                      </span>

                      {/* Stacked Vertical Bar */}
                      <div className="w-full max-w-[32px] bg-[#E2E6F0]/40 rounded-t-lg flex flex-col justify-end overflow-hidden h-40">
                        {/* LOP portion on top (Rose) */}
                        {m.unpaidLopDays > 0 && (
                          <div
                            className="w-full bg-rose-500 transition-all group-hover:opacity-90"
                            style={{ height: `${lopHeightPct}%` }}
                            title={`LOP: ${m.unpaidLopDays} days`}
                          />
                        )}
                        {/* Paid portion at bottom (Blue) */}
                        {m.paidDays > 0 && (
                          <div
                            className="w-full bg-[#5A81FA] transition-all group-hover:opacity-90"
                            style={{ height: `${paidHeightPct}%` }}
                            title={`Paid: ${m.paidDays} days`}
                          />
                        )}
                      </div>

                      {/* Month Label */}
                      <span
                        className={`text-[11px] font-semibold mt-2 ${
                          m.isCurrent ? "text-[#5A81FA] font-bold" : "text-[#696E82]"
                        }`}
                      >
                        {m.monthName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Annual Summary Metrics Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div className="p-3 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0]">
                  <div className="text-[11px] text-[#696E82] font-medium">Annual Quota Progress</div>
                  <div className="type-card-title text-[#1F1F1F] mt-1 font-mono">
                    {analytics.ytdPaidDays} / {analytics.annualQuotaTotal} Paid Days ({Math.round((analytics.ytdPaidDays / (analytics.annualQuotaTotal || 1)) * 100)}%)
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Accrued to date: {analytics.annualQuotaAccrued} eligible days
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0]">
                  <div className="text-[11px] text-[#696E82] font-medium">Average Monthly Leaves</div>
                  <div className="type-card-title text-[#1F1F1F] mt-1 font-mono">
                    {(analytics.ytdTotalDays / Math.max(1, currentMonth)).toFixed(2)} Days / Month
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Standard studio target &le; 2.0 days / month
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0]">
                  <div className="text-[11px] text-[#696E82] font-medium">Approval Consistency</div>
                  <div className="text-base font-bold text-emerald-600 mt-1 font-mono">
                    {analytics.approvalRate}% Approval Rate
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    {analytics.totalApprovedInYear} approved out of {analytics.totalApplications} applied
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deep-Dive 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category / Typology Breakdown Card */}
            <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#5A81FA]" />
                  <span>Leave Typology & Category Share ({currentYear})</span>
                </h3>
                <span className="text-[11px] text-[#696E82] font-mono">
                  {analytics.ytdTotalDays} Days Total
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {/* Casual Leaves */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Casual Leave (CL)
                    </span>
                    <span className="font-mono text-[#696E82]">
                      {analytics.casualDays}d ({analytics.casualPercent}%) · {analytics.casualRequestsCount} req
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${analytics.casualPercent}%` }}
                    />
                  </div>
                </div>

                {/* Sick / Medical Leaves */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Sick / Medical Leave (SL)
                    </span>
                    <span className="font-mono text-[#696E82]">
                      {analytics.sickDays}d ({analytics.sickPercent}%) · {analytics.sickRequestsCount} req
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${analytics.sickPercent}%` }}
                    />
                  </div>
                </div>

                {/* Emergency Leaves */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Emergency Leave (EL)
                    </span>
                    <span className="font-mono text-[#696E82]">
                      {analytics.emergencyDays}d ({analytics.emergencyPercent}%) · {analytics.emergencyRequestsCount} req
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${analytics.emergencyPercent}%` }}
                    />
                  </div>
                </div>

                {/* Hourly Permissions */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      Hourly Permissions
                    </span>
                    <span className="font-mono text-[#696E82]">
                      {analytics.totalHourlyHours} hrs ({analytics.hourlyDaysEquivalent}d eq) · {analytics.hourlyRequestsCount} req
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (Number(analytics.hourlyDaysEquivalent) / (analytics.ytdTotalDays || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Half-Day Leaves */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      Half-Day Sessions
                    </span>
                    <span className="font-mono text-[#696E82]">
                      {analytics.halfDays} Days (0.5 day/session)
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-400 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (analytics.halfDays / (analytics.ytdTotalDays || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 mt-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Studio Rule:</strong> Emergency and Sick leaves automatically bypass the 24-hour advance notice requirement.
                </span>
              </div>
            </div>

            {/* Pattern & Compliance Insights Card */}
            <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span>Work Habits & Pattern Analysis</span>
                </h3>
                <span className="text-[11px] text-[#696E82]">
                  Day-of-Week Distribution
                </span>
              </div>

              {/* Day of week distribution */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#1F1F1F]">Day-of-Week Leave Hits:</div>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {analytics.daysOfWeek.map((dayName, idx) => {
                    const count = analytics.dayOfWeekCounts[idx];
                    const heightPct = Math.max(12, (count / analytics.maxDayHit) * 100);
                    const isMonOrFri = idx === 1 || idx === 5;
                    return (
                      <div key={dayName} className="flex flex-col items-center">
                        <div className="h-20 w-full flex items-end justify-center">
                          <div
                            className={`w-full max-w-[24px] rounded-t-md transition-all ${
                              isMonOrFri ? "bg-[#5A81FA]" : "bg-[#CEDEFF]"
                            }`}
                            style={{ height: `${count > 0 ? heightPct : 10}%` }}
                            title={`${dayName}: ${count} leave days`}
                          />
                        </div>
                        <span className={`text-[10px] mt-1 font-semibold ${isMonOrFri ? "text-[#5A81FA]" : "text-[#696E82]"}`}>
                          {dayName}
                        </span>
                        <span className="text-[10px] font-mono text-[#1F1F1F] font-bold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2 Pattern Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0]">
                  <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">
                    Weekend Adjacency
                  </div>
                  <div className="text-lg font-extrabold text-[#1F1F1F] mt-1 font-mono">
                    {analytics.weekendAdjacentPercent}%
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Leaves taken on Mon / Fri
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0]">
                  <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">
                    24h Notice Compliance
                  </div>
                  <div className="text-lg font-extrabold text-emerald-600 mt-1 font-mono">
                    {analytics.complianceRate}%
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Applied &ge; 24h in advance
                  </div>
                </div>
              </div>

              {/* Upcoming Absences Section */}
              <div className="pt-2 border-t border-[#E2E6F0]">
                <div className="text-xs font-bold text-[#1F1F1F] mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-[#5A81FA]" />
                    Upcoming Scheduled Absences
                  </span>
                  <span className="text-[11px] text-[#696E82]">
                    {analytics.upcomingLeaves.length} scheduled
                  </span>
                </div>

                {analytics.upcomingLeaves.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-[#F8F9FE] text-center type-helper text-[#4B5565]">
                    No future absences scheduled. You are all set!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {analytics.upcomingLeaves.map((up: any) => (
                      <div
                        key={up.id}
                        className="p-2.5 rounded-xl border border-[#CEDEFF] bg-[#F2F4FF] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#2C308D]">
                            {up.leaveType} ({up.days} {Number(up.days) === 1 ? "Day" : "Days"})
                          </div>
                          <div className="text-[11px] text-[#4870EB] mt-0.5">
                            {formatLocalDate(up.startDate)} – {formatLocalDate(up.endDate)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Approved
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY CALENDAR & REQUESTS TAB CONTENT */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
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
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <span>Pending Leave Requests</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {pendingRequests.length}
                  </span>
                </h3>
                <p className="type-helper text-[#4B5565]">
                  Requests awaiting studio leadership review. You may edit or withdraw your pending submissions.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center type-helper text-[#4B5565]">Loading pending requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-6 text-center type-helper text-[#4B5565] bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                No pending leave requests. All prior submissions have been reviewed.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E6F0]">
                {pendingRequests.map((req: any) => {
                  const startStr = formatLocalDate(req.startDate);
                  const endStr = formatLocalDate(req.endDate);

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
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <span>Approved Leave Consumption</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {approvedRequests.length}
                  </span>
                </h3>
                <p className="type-helper text-[#4B5565]">
                  Active approved leave affecting current monthly quota. You may request cancellation if plans change.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center type-helper text-[#4B5565]">Loading approved records...</div>
            ) : approvedRequests.length === 0 ? (
              <div className="p-6 text-center type-helper text-[#4B5565] bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                No approved leave records currently consuming quota.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E6F0]">
                {approvedRequests.map((req: any) => {
                  const startStr = formatLocalDate(req.startDate);
                  const endStr = formatLocalDate(req.endDate);

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
                <h3 className="type-card-title text-[#1F1F1F]">Personal Leave Calendar</h3>
                <p className="type-helper text-[#4B5565]">
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
        </div>
      )}

      {/* Historical Records Archive (Searchable, Filterable, Paginated) */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6F0] pb-3">
          <div>
            <h3 className="type-card-title text-[#1F1F1F]">
              All-Time Leave History ({filteredHistory.length} records)
            </h3>
            <p className="type-helper text-[#4B5565]">
              Search and filter your complete personal leave history
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reason or type..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full sm:w-48 pl-8 pr-3 py-2 sm:py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
              />
            </div>

            {/* Desktop Status Filter Dropdown */}
            <select
              value={historyStatusFilter}
              onChange={(e) => {
                setHistoryStatusFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="hidden sm:block px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Mobile 1-Tap Status Carousel */}
            <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none pb-0.5 pt-1">
              {[
                { id: "ALL", label: "All" },
                { id: "PENDING", label: "Pending" },
                { id: "APPROVED", label: "Approved" },
                { id: "REJECTED", label: "Rejected" },
                { id: "CANCELLED", label: "Cancelled" },
              ].map((pill) => {
                const active = historyStatusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setHistoryStatusFilter(pill.id);
                      setHistoryPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? "bg-[#5A81FA] text-white shadow-xs"
                        : "bg-[#F8F9FD] text-[#696E82] border border-[#E2E6F0] hover:bg-slate-100"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {paginatedHistory.length === 0 ? (
          <div className="p-8 text-center type-helper text-[#4B5565] bg-[#F8F9FD] rounded-2xl">
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
                    {formatLocalDate(h.startDate)} {formatLocalDate(h.startDate) !== formatLocalDate(h.endDate) ? `— ${formatLocalDate(h.endDate)}` : ""}
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
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E6F0] type-helper text-[#4B5565]">
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

      {/* ================= MODAL: ADVANCED GOOGLE FORM APPLY LEAVE ================= */}
      <AdvancedLeaveFormModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={(msg) => {
          setActionMessage({
            type: "success",
            text: msg || "Leave application submitted successfully for studio review.",
          });
          fetchMyLeave();
          broadcastRealtimeEvent("LEAVE_UPDATED");
          broadcastRealtimeEvent("NOTIFICATION_UPDATED");
        }}
        workspaceSlug={workspaceSlug}
        mode="CREATE"
        employees={colleagues}
      />

      {/* ================= MODAL: ADVANCED GOOGLE FORM EDIT PENDING LEAVE ================= */}
      <AdvancedLeaveFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(msg) => {
          setActionMessage({
            type: "success",
            text: msg || "Pending leave application updated successfully.",
          });
          fetchMyLeave();
          broadcastRealtimeEvent("LEAVE_UPDATED");
          broadcastRealtimeEvent("NOTIFICATION_UPDATED");
        }}
        workspaceSlug={workspaceSlug}
        mode="EDIT"
        initialRecord={selectedRecord}
        employees={colleagues}
      />

      {/* ================= MODAL: REQUEST CANCELLATION ================= */}
      {isCancelModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6F0]">
              <div>
                <h3 className="type-card-title text-[#1F1F1F]">Request Leave Cancellation</h3>
                <p className="type-helper text-[#4B5565]">
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
                  {formatLocalDate(selectedRecord.startDate)}
                  {formatLocalDate(selectedRecord.startDate) !== formatLocalDate(selectedRecord.endDate) ? ` — ${formatLocalDate(selectedRecord.endDate)}` : ""}
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
                <h3 className="type-card-title text-[#1F1F1F]">Leave Record Details</h3>
                <p className="type-helper text-[#4B5565]">Record ID: {selectedRecord.id}</p>
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
                {(() => {
                  const meta = parseCompositeLeaveReason(selectedRecord.reason);
                  return (
                    <>
                      <div>
                        <span className="text-[#696E82] block text-[11px]">Dates</span>
                        <span className="font-bold font-mono">
                          {formatLocalDate(selectedRecord.startDate)}
                          {formatLocalDate(selectedRecord.startDate) !== formatLocalDate(selectedRecord.endDate) ? ` — ${formatLocalDate(selectedRecord.endDate)}` : ""}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#696E82] block text-[11px]">Type & Duration</span>
                        <span className="font-semibold text-[#1F1F1F]">
                          {selectedRecord.isHourly
                            ? `Few Hours Permission (${formatMinutesToTime(selectedRecord.startMinutes || 630)} – ${formatMinutesToTime(selectedRecord.endMinutes || 690)}, ${selectedRecord.totalMinutes || 60}m) • ${Number(selectedRecord.days)} Day(s)`
                            : selectedRecord.isHalfDay
                            ? `Half Day (${selectedRecord.sessionType === "SECOND_HALF" ? "Afternoon 14:30–18:30" : "Morning 10:30–14:30"}) • 0.5 Day`
                            : `${selectedRecord.leaveType} • ${Number(selectedRecord.days)} Day(s)`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#696E82] block text-[11px]">Primary Reason</span>
                        <p className="italic text-[#1F1F1F] mt-0.5">&ldquo;{meta.reason || selectedRecord.reason || "None stated"}&rdquo;</p>
                      </div>

                      {meta.coveringColleague && (
                        <div className="p-2.5 bg-[#F8F9FE] border border-[#CEDEFF] rounded-xl">
                          <span className="text-[#696E82] block text-[10px] uppercase font-bold">Covering Colleague (Handover)</span>
                          <span className="font-semibold text-[#1456F0]">{meta.coveringColleague}</span>
                          {meta.handoverNotes && (
                            <p className="text-[11px] text-[#4B5565] mt-0.5">{meta.handoverNotes}</p>
                          )}
                        </div>
                      )}

                      {meta.emergencyContact && (
                        <div className="p-2.5 bg-[#F8F9FE] border border-[#CEDEFF] rounded-xl flex items-center justify-between">
                          <span className="text-[#696E82] text-[11px]">Emergency Contact:</span>
                          <span className="font-bold font-mono text-[#1F1F1F]">{meta.emergencyContact}</span>
                        </div>
                      )}

                      {(meta.supportingDocUrl || meta.supportingDocName || selectedRecord.supportingFileId) && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                          <span className="text-emerald-900 text-[11px] font-semibold">
                            Attachment: {meta.supportingDocName || "Document Attached"}
                          </span>
                          {meta.supportingDocUrl && (
                            <a
                              href={meta.supportingDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1456F0] font-bold underline text-[11px]"
                            >
                              View Link ↗
                            </a>
                          )}
                        </div>
                      )}

                      {selectedRecord.rejectionReason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
                          <span className="font-bold block text-[11px]">Rejection Reason</span>
                          <span>{selectedRecord.rejectionReason}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
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
