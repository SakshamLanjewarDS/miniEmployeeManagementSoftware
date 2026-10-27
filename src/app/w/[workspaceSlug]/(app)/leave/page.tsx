"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  User,
  Users,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Building,
  Mail,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  Code,
  Copy,
  SlidersHorizontal,
  Settings,
  MoreVertical,
  Info,
  Edit3,
  BarChart3,
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";
import AdvancedLeaveFormModal from "@/components/leave/AdvancedLeaveFormModal";
import { parseCompositeLeaveReason, formatMinutesToTime } from "@/lib/leave/form-helpers";
import { AdvancedPagination } from "@/components/ui/AdvancedPagination";

export default function LeaveManagementPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [selectedStatsEmployee, setSelectedStatsEmployee] = useState<{
    id: string;
    employeeId: string;
    name: string;
    role: string;
    department?: string;
    email?: string;
  } | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("RECENT");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Review Drawer / Modal
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Options popover state
  const [activeMenuRecordId, setActiveMenuRecordId] = useState<string | null>(null);

  // Google Sheets Live Sync State
  const [syncStatus, setSyncStatus] = useState<any | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(
    "https://script.google.com/macros/s/AKfycbw28LoETUSD3jbnDIxMZqBSPoggKLw_iHen4cFkUMm6Ayq6VukjcPwij5YoJRPRS198RA/exec"
  );
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaveMessage, setWebhookSaveMessage] = useState<string | null>(null);

  // Apply on behalf modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
    leaveType: "CASUAL",
    reason: "",
    isHalfDay: false,
    days: 1.0,
  });

  const formatLocalDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const s = typeof dateVal === "string" ? dateVal : dateVal.toISOString();
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[m - 1]} ${d}, ${y}`;
  };

  const formatDisplayDates = (startDateVal: any, endDateVal: any) => {
    if (!startDateVal) return "";
    const s = typeof startDateVal === "string" ? startDateVal : startDateVal.toISOString();
    const e = typeof endDateVal === "string" ? endDateVal : endDateVal.toISOString();
    const [sy, sm, sd] = s.slice(0, 10).split("-").map(Number);
    const [ey, em, ed] = e.slice(0, 10).split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (s.slice(0, 10) === e.slice(0, 10)) {
      return `${months[sm - 1]} ${sd}, ${sy}`;
    }
    if (sm === em && sy === ey) {
      return `${months[sm - 1]} ${sd} – ${ed}, ${sy}`;
    }
    return `${months[sm - 1]} ${sd} – ${months[em - 1]} ${ed}, ${ey}`;
  };

  const formatDuration = (rec: any) => {
    if (!rec) return "";
    if (rec.isHourly) {
      const times = rec.startMinutes
        ? ` (${formatMinutesToTime(rec.startMinutes)} – ${formatMinutesToTime(rec.endMinutes || rec.startMinutes + (rec.totalMinutes || 60))})`
        : "";
      if (rec.totalMinutes) {
        if (rec.totalMinutes >= 60) {
          return `${(rec.totalMinutes / 60).toFixed(1).replace(/\.0$/, "")} hrs${times}`;
        }
        return `${rec.totalMinutes} min${times}`;
      }
      const hrs = Number(rec.days || 0) * 8;
      return `${hrs.toFixed(1).replace(/\.0$/, "")} hrs${times}`;
    }
    if (rec.isHalfDay) {
      const session = rec.sessionType === "SECOND_HALF" ? " (Afternoon)" : " (Morning)";
      return `0.5 day${session}`;
    }
    const daysNum = Number(rec.days);
    return `${daysNum} ${daysNum === 1 ? "day" : "days"}`;
  };

  const fetchSyncStatus = async (triggerAuto = false) => {
    try {
      const res = await fetch(
        `/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&syncType=LEAVE_SHEET${
          triggerAuto ? "&auto=true" : ""
        }`
      );
      const data = await res.json();
      if (res.ok && data.leaveSheet) {
        setSyncStatus(data.leaveSheet);
        if (data.leaveSheet.webhookUrl) {
          setWebhookUrlInput(data.leaveSheet.webhookUrl);
        }
        if (triggerAuto) {
          fetchLeaves(true);
        }
      }
    } catch {
      // background silent
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&syncType=LEAVE_SHEET`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manual sync failed");

      setActionSuccess(`Synchronized ${data.inserted || 0} new leave records from Google Sheet.`);
      fetchLeaves(true);
      fetchSyncStatus();
      broadcastRealtimeEvent("LEAVE_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setWebhookSaveMessage(null);
    try {
      const res = await fetch("/api/integrations/google-sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          syncType: "LEAVE_SHEET",
          webhookUrl: webhookUrlInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save webhook");

      setWebhookSaveMessage("Webhook URL saved successfully!");
      fetchSyncStatus();
    } catch (err: any) {
      setWebhookSaveMessage(`Error: ${err.message}`);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleDeleteLeave = async (id: string, empName: string) => {
    if (!confirm(`Delete leave record for ${empName}? This will tombstone the record so it will never resurrect on Google Sheet re-sync.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave/records/${id}?workspaceSlug=${workspaceSlug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete leave request");

      setActionSuccess(`Leave record deleted and tombstoned.`);
      setIsReviewOpen(false);
      setActiveMenuRecordId(null);
      fetchLeaves();
      fetchSyncStatus();
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchLeaves = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        workspaceSlug,
        pageSize: "200",
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(leaveTypeFilter ? { leaveType: leaveTypeFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });

      const res = await fetch(`/api/leave/records?${queryParams.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          router.push(`/w/${workspaceSlug}/leave/my-leave`);
          return;
        }
        throw new Error(data.error || "Failed to load leave records");
      }
      setRecords(data.records || []);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees?workspaceSlug=${workspaceSlug}&limit=100`);
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || data.data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
    fetchSyncStatus(true);
  }, [workspaceSlug, statusFilter, leaveTypeFilter]);

  useRealtimeSubscription(
    ["LEAVE_UPDATED"],
    () => {
      fetchLeaves(true);
      fetchSyncStatus();
    },
    { intervalMs: 20000 }
  );

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/leave/records/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, reviewNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      setActionSuccess("Leave approved! Staff notification email enqueued.");
      setIsReviewOpen(false);
      setReviewNotes("");
      fetchLeaves();
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/leave/records/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");

      setActionSuccess("Leave rejected. Staff notification email enqueued.");
      setIsReviewOpen(false);
      setRejectionReason("");
      fetchLeaves();
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOnBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          employeeId: createForm.employeeId,
          startDate: createForm.startDate,
          endDate: createForm.endDate || createForm.startDate,
          leaveType: createForm.leaveType,
          reason: createForm.reason,
          isHalfDay: createForm.isHalfDay,
          days: createForm.days,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create leave application");

      setActionSuccess("Leave application submitted on behalf of staff member!");
      setIsCreateOpen(false);
      setCreateForm({
        employeeId: "",
        startDate: "",
        endDate: "",
        leaveType: "CASUAL",
        reason: "",
        isHalfDay: false,
        days: 1.0,
      });
      fetchLeaves();
      broadcastRealtimeEvent("LEAVE_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Unique employees for selection & stats lookup
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, { id: string; employeeId: string; name: string; role: string; department?: string; email?: string }>();

    // Seed from employees
    employees.forEach((emp) => {
      const id = emp.id;
      const name = emp.name || emp.user?.fullName || emp.membership?.user?.fullName || "Staff Member";
      const employeeId = emp.employeeId || "EMP";
      const role = emp.designation || emp.department || "Staff";
      const email = emp.email || emp.user?.email || emp.membership?.user?.email || "";
      map.set(id, { id, employeeId, name, role, department: emp.department, email });
    });

    // Seed from records
    records.forEach((rec) => {
      const id = rec.employeeId || rec.employee?.id || rec.employeeNameRaw;
      if (!id) return;
      if (!map.has(id)) {
        const name = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
        const employeeId = rec.employee?.employeeId || rec.employeeId || "EMP";
        const role = rec.employee?.designation || rec.employee?.department || "Architect";
        const email = rec.employee?.membership?.user?.email || "";
        map.set(id, { id, employeeId, name, role, department: rec.employee?.department, email });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records, employees]);

  // Helper to compute deep leave stats for any given employee
  const getEmployeeLeaveStats = (empIdentifier: any) => {
    if (!empIdentifier) return null;

    let targetId = "";
    let targetCode = "";
    let targetName = "";

    if (typeof empIdentifier === "object") {
      targetId = empIdentifier.id || empIdentifier.employee?.id || "";
      targetCode = empIdentifier.employeeId || empIdentifier.employee?.employeeId || "";
      targetName = empIdentifier.name || empIdentifier.fullName || empIdentifier.employeeNameRaw || "";
    } else {
      targetId = String(empIdentifier);
      targetCode = String(empIdentifier);
      targetName = String(empIdentifier);
    }

    const empRecords = records.filter((r) => {
      const rId = r.employeeId || r.employee?.id || "";
      const rCode = r.employee?.employeeId || r.employeeId || "";
      const rName = r.employeeNameRaw || r.employee?.membership?.user?.fullName || "";

      if (targetId && (rId === targetId || r.employeeId === targetId)) return true;
      if (targetCode && (rCode === targetCode || r.employee?.employeeId === targetCode)) return true;
      if (
        targetName &&
        (rName.toLowerCase() === targetName.toLowerCase() ||
          (r.employeeNameRaw && r.employeeNameRaw.toLowerCase() === targetName.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });

    const pending = empRecords.filter((r) => r.status === "PENDING").length;
    const approved = empRecords.filter((r) => r.status === "APPROVED").length;
    const rejected = empRecords.filter((r) => r.status === "REJECTED").length;

    const approvedDays = empRecords
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    const pendingDays = empRecords
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const thisYearApprovedDays = empRecords
      .filter((r) => {
        if (r.status !== "APPROVED" || !r.startDate) return false;
        return new Date(r.startDate).getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    const thisMonthApprovedDays = empRecords
      .filter((r) => {
        if (r.status !== "APPROVED" || !r.startDate) return false;
        const d = new Date(r.startDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    const monthlyAllowance = 2.0;
    const annualAllowance = 24.0;

    const lopDays = empRecords
      .filter((r) => r.status === "APPROVED" && (r.leaveType === "LOSS_OF_PAY" || r.isPaidEligible === false))
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);
    const paidDays = Math.max(0, approvedDays - lopDays);

    const remainingMonthly = Math.max(0, monthlyAllowance - thisMonthApprovedDays);
    const remainingAnnual = Math.max(0, annualAllowance - thisYearApprovedDays);

    const casualDays = empRecords
      .filter((r) => r.status === "APPROVED" && r.leaveType === "CASUAL")
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);
    const sickDays = empRecords
      .filter((r) => r.status === "APPROVED" && r.leaveType === "SICK")
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);
    const annualDays = empRecords
      .filter((r) => r.status === "APPROVED" && r.leaveType === "ANNUAL")
      .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

    return {
      totalRecords: empRecords.length,
      pending,
      approved,
      rejected,
      approvedDays,
      pendingDays,
      thisYearApprovedDays,
      thisMonthApprovedDays,
      monthlyAllowance,
      annualAllowance,
      paidDays,
      lopDays,
      remainingMonthly,
      remainingAnnual,
      casualDays,
      sickDays,
      annualDays,
      history: empRecords,
    };
  };

  const isEmployeeFiltered = employeeFilter !== "ALL";
  const activeEmployee = useMemo(() => {
    if (!isEmployeeFiltered) return null;
    return uniqueEmployees.find((e) => e.id === employeeFilter || e.employeeId === employeeFilter || e.name === employeeFilter) || null;
  }, [isEmployeeFiltered, employeeFilter, uniqueEmployees]);

  const activeEmployeeStats = useMemo(() => {
    if (!activeEmployee) return null;
    return getEmployeeLeaveStats(activeEmployee);
  }, [activeEmployee, records]);

  // Real-time leave stats for the active stats modal
  const currentModalStats = useMemo(() => {
    if (!selectedStatsEmployee) return null;
    return getEmployeeLeaveStats(selectedStatsEmployee);
  }, [selectedStatsEmployee, records]);

  // Real-time leave stats for the employee being reviewed in the drawer
  const reviewEmpStats = useMemo(() => {
    if (!selectedLeave) return null;
    return getEmployeeLeaveStats(selectedLeave.employee || selectedLeave.employeeId || selectedLeave.employeeNameRaw);
  }, [selectedLeave, records]);

  // Studio-wide metrics computation
  const totalPending = useMemo(() => records.filter((r) => r.status === "PENDING").length, [records]);
  const totalApproved = useMemo(() => records.filter((r) => r.status === "APPROVED").length, [records]);
  const totalRejected = useMemo(() => records.filter((r) => r.status === "REJECTED").length, [records]);
  const totalDaysApproved = useMemo(
    () => records.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + (Number(r.days) || 0), 0),
    [records]
  );

  // Dynamic metrics shown on KPI cards
  const displayedPending = isEmployeeFiltered && activeEmployeeStats ? activeEmployeeStats.pending : totalPending;
  const displayedApproved = isEmployeeFiltered && activeEmployeeStats ? activeEmployeeStats.approved : totalApproved;
  const displayedRejected = isEmployeeFiltered && activeEmployeeStats ? activeEmployeeStats.rejected : totalRejected;
  const displayedDaysApproved = isEmployeeFiltered && activeEmployeeStats ? activeEmployeeStats.approvedDays : totalDaysApproved;

  // Filtering & Pagination
  const filteredRecords = useMemo(() => {
    const list = records.filter((rec) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = (rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "").toLowerCase();
      const empId = (rec.employee?.employeeId || "").toLowerCase();
      const reason = (rec.reason || "").toLowerCase();

      const matchesSearch = !q || empName.includes(q) || empId.includes(q) || reason.includes(q);
      const matchesStatus = !statusFilter || rec.status === statusFilter;
      const matchesType = !leaveTypeFilter || rec.leaveType === leaveTypeFilter;
      const matchesEmployee =
        employeeFilter === "ALL" ||
        rec.employeeId === employeeFilter ||
        rec.employee?.id === employeeFilter ||
        rec.employee?.employeeId === employeeFilter ||
        rec.employeeNameRaw === employeeFilter;

      if (!matchesSearch || !matchesStatus || !matchesType || !matchesEmployee) return false;

      if (dateFilter && dateFilter !== "ALL" && rec.startDate) {
        const start = new Date(rec.startDate);
        const now = new Date();
        if (dateFilter === "THIS_MONTH") {
          if (start.getFullYear() !== now.getFullYear() || start.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (dateFilter === "NEXT_MONTH") {
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          if (start.getFullYear() !== nextMonth.getFullYear() || start.getMonth() !== nextMonth.getMonth()) {
            return false;
          }
        } else if (dateFilter === "LAST_30_DAYS") {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (start < thirtyDaysAgo || start > now) {
            return false;
          }
        } else if (dateFilter === "THIS_YEAR") {
          if (start.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortOrder === "OLDEST") {
        return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      }
      if (sortOrder === "DURATION") {
        return (Number(b.days) || 0) - (Number(a.days) || 0);
      }
      if (sortOrder === "NAME_ASC") {
        const nameA = a.employeeNameRaw || a.employee?.membership?.user?.fullName || "";
        const nameB = b.employeeNameRaw || b.employee?.membership?.user?.fullName || "";
        return nameA.localeCompare(nameB);
      }
      // Default: RECENT (newest start date first)
      return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
    });

    return list;
  }, [records, searchQuery, statusFilter, leaveTypeFilter, employeeFilter, dateFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const getInitials = (name: string) => {
    if (!name) return "SL";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5 pb-24 md:pb-12 text-[#1F1F1F]" suppressHydrationWarning>
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#696E82]">
        <span>People &amp; HR</span>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">Staff Leaves</span>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="type-page-title text-[#1F1F1F]">
              Staff leave
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#696E82] mt-1" suppressHydrationWarning>
            <span>Review requests and plan team availability.</span>
            <span className="hidden sm:inline">•</span>
            {/* Live Sheets Indicator Strip matching Reference */}
            <div className="inline-flex items-center gap-2" suppressHydrationWarning>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sheets connected</span>
              </span>
              <span suppressHydrationWarning>
                Last synced:{" "}
                {mounted && syncStatus?.lastAttemptAt
                  ? new Date(syncStatus.lastAttemptAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "11:20 AM"}
              </span>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncLoading}
                suppressHydrationWarning
                className="text-[#1456F0] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Sync now</span>
                {syncLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(true)}
                suppressHydrationWarning
                className="p-1 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE] cursor-pointer"
                title="Sheets settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/w/${workspaceSlug}/leave/calendar`}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Team calendar</span>
          </Link>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] hover:bg-[#0F47D1] text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply on behalf</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* Active Employee Stats Banner */}
      {isEmployeeFiltered && activeEmployee && (
        <div className="p-3.5 bg-[#F0F4FF] border border-[#CEDEFF] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1456F0] text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {getInitials(activeEmployee.name)}
            </div>
            <div>
              <div className="font-bold text-[#1F1F1F] flex items-center gap-2">
                <span>Employee Leave Profile: {activeEmployee.name}</span>
                <span className="text-[10px] font-semibold text-[#1456F0] bg-white px-2 py-0.5 rounded-full border border-[#CEDEFF]">
                  {activeEmployee.employeeId}
                </span>
              </div>
              <div className="text-[11px] text-[#696E82] mt-0.5">
                <span>{activeEmployee.role}</span>
                {activeEmployee.department && <span> • {activeEmployee.department}</span>}
                {activeEmployeeStats && (
                  <span className="font-semibold text-emerald-700 ml-2">
                    • {activeEmployeeStats.remainingAnnual.toFixed(1)} days balance left
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatsEmployee(activeEmployee)}
              className="px-3 py-1.5 bg-white border border-[#CEDEFF] hover:bg-[#1456F0] hover:text-white text-[#1456F0] font-semibold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Full Leave Stats &amp; Breakdown</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmployeeFilter("ALL");
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FE] text-[#696E82] hover:text-[#1F1F1F] font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Clear Filter ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Four KPI Summary Cards matching Reference Image */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Pending review */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF9EB] text-[#F59E0B] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Pending review</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {displayedPending}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            {isEmployeeFiltered && activeEmployee ? `${activeEmployee.name}'s pending requests` : "Awaiting leadership action"}
          </div>
        </div>

        {/* Card 2: Approved requests */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F8F0] text-[#10B981] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Approved requests</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {displayedApproved}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            {isEmployeeFiltered && activeEmployee ? `${activeEmployee.name}'s approved requests` : "Total approved requests"}
          </div>
        </div>

        {/* Card 3: Approved day-equivalents */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium flex items-center gap-1">
                <span>Approved day-equivalents</span>
                <Info className="w-3 h-3 text-[#696E82]" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {displayedDaysApproved.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            {isEmployeeFiltered && activeEmployee ? `${activeEmployee.name}'s total days taken` : "As reported by leave tracker"}
          </div>
        </div>

        {/* Card 4: Monthly allowance / Remaining balance */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F4F6FB] text-[#1F1F1F] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">
                {isEmployeeFiltered ? "Remaining leave balance" : "Monthly allowance"}
              </div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {isEmployeeFiltered && activeEmployeeStats ? `${activeEmployeeStats.remainingAnnual.toFixed(1)} days` : "2 days"}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            {isEmployeeFiltered && activeEmployeeStats
              ? `Annual balance • ${activeEmployeeStats.remainingMonthly.toFixed(1)} days left this month`
              : "Per employee • Not remaining balance"}
          </div>
        </div>
      </div>

      {/* 2. Status Pill Tabs & Sort Bar matching Reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === ""
                ? "bg-[#1456F0] text-white shadow-2xs"
                : "bg-white border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F]"
            }`}
          >
            All ({records.length})
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setStatusFilter("PENDING");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "PENDING"
                ? "bg-[#1456F0] text-white shadow-2xs"
                : "bg-white border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F]"
            }`}
          >
            Pending ({totalPending})
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setStatusFilter("APPROVED");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "APPROVED"
                ? "bg-[#1456F0] text-white shadow-2xs"
                : "bg-white border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F]"
            }`}
          >
            Approved ({totalApproved})
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setStatusFilter("REJECTED");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "REJECTED"
                ? "bg-[#1456F0] text-white shadow-2xs"
                : "bg-white border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F]"
            }`}
          >
            Rejected ({totalRejected})
          </button>
        </div>
      </div>

      {/* 3. Secondary Filter Strip matching Reference Image */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:border-[#1456F0]"
            />
          </div>

          {/* Employee / Staff Filter Dropdown */}
          <select
            suppressHydrationWarning
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by staff employee"
            className={`text-xs border rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-[#1456F0] cursor-pointer transition-colors ${
              employeeFilter !== "ALL"
                ? "bg-[#EBF1FF] border-[#CEDEFF] text-[#1456F0] font-bold shadow-2xs"
                : "bg-white border-[#E2E6F0] text-[#1F1F1F]"
            }`}
          >
            <option value="ALL">All staff members ▾</option>
            {uniqueEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.employeeId})
              </option>
            ))}
          </select>

          {/* Leave Type Dropdown */}
          <select
            suppressHydrationWarning
            value={leaveTypeFilter}
            onChange={(e) => {
              setLeaveTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-white border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#1F1F1F] font-medium focus:outline-none focus:border-[#1456F0]"
          >
            <option value="">All leave types ▾</option>
            <option value="CASUAL">Casual</option>
            <option value="SICK">Sick</option>
            <option value="ANNUAL">Annual</option>
            <option value="LOSS_OF_PAY">Loss of Pay</option>
          </select>

          {/* Date Selector */}
          <div className="relative">
            <select
              suppressHydrationWarning
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by date range"
              className="text-xs bg-white border border-[#E2E6F0] rounded-xl pl-8 pr-3 py-1.5 text-[#1F1F1F] font-medium focus:outline-none focus:border-[#1456F0] cursor-pointer"
            >
              <option value="ALL">All dates ⇅</option>
              <option value="THIS_MONTH">This month</option>
              <option value="NEXT_MONTH">Next month</option>
              <option value="LAST_30_DAYS">Past 30 days</option>
              <option value="THIS_YEAR">This year</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <select
            suppressHydrationWarning
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            aria-label="Sort leave requests"
            className="text-xs bg-white border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#1F1F1F] font-medium focus:outline-none focus:border-[#1456F0] cursor-pointer"
          >
            <option value="RECENT">Sort: Recent requests ⇅</option>
            <option value="OLDEST">Sort: Oldest first ⇅</option>
            <option value="DURATION">Sort: Duration (High to Low) ⇅</option>
            <option value="NAME_ASC">Sort: Staff Name (A → Z) ⇅</option>
          </select>

          {/* Reset Filters Button */}
          {(statusFilter || leaveTypeFilter || employeeFilter !== "ALL" || dateFilter !== "ALL" || searchQuery || sortOrder !== "RECENT") && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setStatusFilter("");
                setLeaveTypeFilter("");
                setEmployeeFilter("ALL");
                setDateFilter("ALL");
                setSearchQuery("");
                setSortOrder("RECENT");
                setPage(1);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="hidden sm:flex items-center bg-[#F4F6FB] p-0.5 rounded-xl border border-[#E2E6F0]">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "table" ? "bg-white text-[#1456F0] shadow-2xs" : "text-[#696E82] hover:text-[#1F1F1F]"
            }`}
            title="Table View"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "grid" ? "bg-white text-[#1456F0] shadow-2xs" : "text-[#696E82] hover:text-[#1F1F1F]"
            }`}
            title="Grid View"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Leave Records Table (Desktop) & Cards (Mobile) matching Reference */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#696E82] flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#1456F0] border-t-transparent rounded-full animate-spin" />
            <span>Loading staff leave records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#696E82] space-y-2">
            <p>No leave applications match your search and filter criteria.</p>
            {(searchQuery || statusFilter || leaveTypeFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("");
                  setLeaveTypeFilter("");
                }}
                className="text-xs text-[#1456F0] font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop View: Table or Grid */}
            {viewMode === "table" ? (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left type-table-cell">
                  <thead>
                    <tr className="border-b border-[#E2E6F0] text-[#696E82] font-semibold bg-[#FAFBFF]">
                      <th className="py-3.5 px-5">Employee</th>
                      <th className="py-3.5 px-4">Dates</th>
                      <th className="py-3.5 px-4">Duration &amp; type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F7]">
                    {paginatedRecords.map((rec) => {
                      const empName = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
                      const empId = rec.employee?.employeeId || "EMP-001";
                      const role = rec.employee?.designation || rec.employee?.department || "Architect";
                      const datesStr = formatDisplayDates(rec.startDate, rec.endDate);
                      const durationStr = formatDuration(rec);
                      const empData = {
                        id: rec.employee?.id || rec.employeeId || rec.id,
                        employeeId: empId,
                        name: empName,
                        role: role,
                        department: rec.employee?.department,
                        email: rec.employee?.membership?.user?.email || rec.employee?.email,
                      };

                      return (
                        <tr key={rec.id} className="hover:bg-[#F8F9FE] transition-colors group">
                          {/* Employee - Clickable to open Employee Leave Stats Modal */}
                          <td
                            className="py-3.5 px-5 cursor-pointer group/emp hover:bg-[#F0F4FF] transition-colors"
                            onClick={() => setSelectedStatsEmployee(empData)}
                            title={`Click to view leave statistics for ${empName}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#EBF1FF] text-[#1456F0] group-hover/emp:bg-[#1456F0] group-hover/emp:text-white font-bold text-xs flex items-center justify-center shrink-0 transition-all shadow-2xs">
                                {getInitials(empName)}
                              </div>
                              <div>
                                <div className="font-semibold text-[#1F1F1F] group-hover/emp:text-[#1456F0] flex items-center gap-1.5 transition-colors">
                                  <span>{empName}</span>
                                  <span className="text-[10px] font-medium text-[#1456F0] bg-[#EBF1FF] px-1.5 py-0.2 rounded-md opacity-0 group-hover/emp:opacity-100 transition-opacity">
                                    Stats ↗
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#696E82] mt-0.5">
                                  <span>{empId}</span>
                                  <span className="mx-1">•</span>
                                  <span>{role}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="py-3.5 px-4 font-medium text-[#1F1F1F]">
                            {datesStr}
                          </td>

                          {/* Duration & type */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1F1F1F]">{durationStr}</div>
                            <div className="text-[11px] text-[#696E82] capitalize">
                              {rec.leaveType?.toLowerCase().replace(/_/g, " ")}
                            </div>
                          </td>

                          {/* Status Badge matching Reference */}
                          <td className="py-3.5 px-4">
                            {rec.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                            {rec.status === "APPROVED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            )}
                            {rec.status === "REJECTED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                <X className="w-3 h-3 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {rec.status === "CANCELLED" && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                                Cancelled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedLeave(rec);
                                  setIsReviewOpen(true);
                                }}
                                className="text-xs font-semibold text-[#1456F0] hover:text-[#0F47D1] transition-colors"
                              >
                                {rec.status === "PENDING" ? "Review" : "View details"}
                              </button>

                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuRecordId(activeMenuRecordId === rec.id ? null : rec.id)}
                                  className="p-1 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuRecordId === rec.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-[#E2E6F0] shadow-lg z-30 p-1 text-left">
                                    <button
                                      onClick={() => {
                                        setSelectedLeave(rec);
                                        setIsReviewOpen(true);
                                        setActiveMenuRecordId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#1F1F1F] hover:bg-[#F8F9FE] rounded-lg"
                                    >
                                      Review details
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedStatsEmployee(empData);
                                        setActiveMenuRecordId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#1456F0] hover:bg-[#EBF1FF] rounded-lg font-medium"
                                    >
                                      Employee stats
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLeave(rec.id, empName)}
                                      className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                                    >
                                      Delete / Tombstone
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Desktop Grid View */
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {paginatedRecords.map((rec) => {
                  const empName = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
                  const empId = rec.employee?.employeeId || "EMP-001";
                  const role = rec.employee?.designation || rec.employee?.department || "Architect";
                  const datesStr = formatDisplayDates(rec.startDate, rec.endDate);
                  const durationStr = formatDuration(rec);
                  const empData = {
                    id: rec.employee?.id || rec.employeeId || rec.id,
                    employeeId: empId,
                    name: empName,
                    role: role,
                    department: rec.employee?.department,
                    email: rec.employee?.membership?.user?.email || rec.employee?.email,
                  };

                  return (
                    <div
                      key={rec.id}
                      className="p-4 bg-white border border-[#E2E6F0] hover:border-[#CEDEFF] rounded-2xl shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Employee Header - Clickable for stats */}
                        <div
                          className="flex items-center justify-between cursor-pointer group/card p-1 -m-1 rounded-xl hover:bg-[#F0F4FF] transition-colors"
                          onClick={() => setSelectedStatsEmployee(empData)}
                          title={`Click to view leave stats for ${empName}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-[#EBF1FF] text-[#1456F0] group-hover/card:bg-[#1456F0] group-hover/card:text-white font-bold text-xs flex items-center justify-center shrink-0 transition-all shadow-2xs">
                              {getInitials(empName)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#1F1F1F] group-hover/card:text-[#1456F0] flex items-center gap-1 transition-colors">
                                <span>{empName}</span>
                                <span className="text-[9px] font-semibold text-[#1456F0] bg-[#EBF1FF] px-1.5 py-0.2 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  Stats ↗
                                </span>
                              </div>
                              <div className="text-[11px] text-[#696E82]">
                                <span>{empId}</span> • <span>{role}</span>
                              </div>
                            </div>
                          </div>

                          {rec.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          )}
                          {rec.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}
                          {rec.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              <X className="w-2.5 h-2.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {rec.status === "CANCELLED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Dates & Duration */}
                        <div className="p-2.5 bg-[#F8F9FE] rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 text-[#1F1F1F] font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-[#1456F0]" />
                            <span>{datesStr}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#696E82]">
                            <span className="font-bold text-[#1F1F1F]">{durationStr}</span>
                            <span className="capitalize">{rec.leaveType?.toLowerCase().replace(/_/g, " ")}</span>
                          </div>
                        </div>

                        {rec.reason && (
                          <p className="text-[11px] text-[#696E82] line-clamp-2 italic pl-1">
                            "{rec.reason}"
                          </p>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-[#F0F2F7] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStatsEmployee(empData)}
                          className="text-[11px] font-semibold text-[#1456F0] hover:underline cursor-pointer"
                        >
                          Leave stats ↗
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeave(rec);
                            setIsReviewOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8F9FE] hover:bg-[#1456F0] hover:text-white border border-[#E2E6F0] text-[#1F1F1F] transition-all cursor-pointer"
                        >
                          {rec.status === "PENDING" ? "Review" : "Details"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Stack Cards matching Reference Image */}
            <div className="md:hidden divide-y divide-[#E2E6F0]">
              {paginatedRecords.map((rec) => {
                const empName = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
                const empId = rec.employee?.employeeId || "EMP-001";
                const role = rec.employee?.designation || rec.employee?.department || "Architect";
                const datesStr = formatDisplayDates(rec.startDate, rec.endDate);
                const durationStr = formatDuration(rec);
                const empData = {
                  id: rec.employee?.id || rec.employeeId || rec.id,
                  employeeId: empId,
                  name: empName,
                  role: role,
                  department: rec.employee?.department,
                  email: rec.employee?.membership?.user?.email || rec.employee?.email,
                };

                return (
                  <div key={rec.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Clickable Employee for Stats on Mobile */}
                      <div
                        className="flex items-center gap-3 cursor-pointer group/mob p-1 -m-1 rounded-xl hover:bg-[#F0F4FF] transition-colors"
                        onClick={() => setSelectedStatsEmployee(empData)}
                        title={`Click to view leave statistics for ${empName}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EBF1FF] text-[#1456F0] group-hover/mob:bg-[#1456F0] group-hover/mob:text-white font-bold text-xs flex items-center justify-center shrink-0 transition-colors">
                          {getInitials(empName)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#1F1F1F] group-hover/mob:text-[#1456F0] flex items-center gap-1.5 transition-colors">
                            <span>{empName}</span>
                            <span className="text-[10px] font-medium text-[#1456F0] bg-[#EBF1FF] px-1.5 py-0.2 rounded-md">
                              Stats ↗
                            </span>
                          </div>
                          <div className="text-xs text-[#696E82]">
                            <span>{empId}</span>
                            <span className="mx-1">•</span>
                            <span>{role}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Pill */}
                      {rec.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      )}
                      {rec.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      )}
                      {rec.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <X className="w-3 h-3 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-[#696E82] pt-1 border-t border-[#F2F4F8]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#696E82]" />
                        <span className="font-medium text-[#1F1F1F]">{datesStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#696E82]" />
                        <span>
                          {durationStr} • {rec.leaveType?.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setSelectedLeave(rec);
                          setIsReviewOpen(true);
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                          rec.status === "PENDING"
                            ? "bg-[#1456F0] text-white shadow-xs"
                            : "bg-[#F8F9FE] border border-[#E2E6F0] text-[#1F1F1F]"
                        }`}
                      >
                        {rec.status === "PENDING" ? "Review request" : "View details"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advanced Pagination Controls */}
            <AdvancedPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredRecords.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[8, 16, 24, 48]}
              itemName="leave records"
            />
          </>
        )}
      </div>

      {/* Review Drawer / Modal matching Reference Image Panel 3 */}
      {isReviewOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#E2E6F0] space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="text-xs text-[#696E82] hover:text-[#1F1F1F] flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Staff leave</span>
              </button>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Header */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer group/revEmp p-1 -m-1 rounded-xl hover:bg-[#F0F4FF] transition-colors"
                onClick={() => {
                  setSelectedStatsEmployee({
                    id: selectedLeave.employee?.id || selectedLeave.employeeId,
                    employeeId: selectedLeave.employee?.employeeId || selectedLeave.employeeId || "EMP-001",
                    name: selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff Member",
                    role: selectedLeave.employee?.designation || selectedLeave.employee?.department || "Architect",
                    department: selectedLeave.employee?.department,
                    email: selectedLeave.employee?.membership?.user?.email,
                  });
                }}
                title="Click to view full employee leave statistics"
              >
                <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] group-hover/revEmp:bg-[#1456F0] group-hover/revEmp:text-white font-bold text-sm flex items-center justify-center transition-all shadow-2xs">
                  {getInitials(selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff")}
                </div>
                <div>
                  <h3 className="type-card-title text-[#1F1F1F] group-hover/revEmp:text-[#1456F0] flex items-center gap-1.5 transition-colors">
                    <span>{selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff Member"}</span>
                    <span className="text-[10px] font-medium text-[#1456F0] bg-[#EBF1FF] px-1.5 py-0.2 rounded-md">
                      Stats ↗
                    </span>
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    {selectedLeave.employee?.employeeId || "EMP-001"} • {selectedLeave.employee?.designation || selectedLeave.employee?.department || "Architect"}
                  </p>
                </div>
              </div>

              {selectedLeave.status === "PENDING" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Pending</span>
                </span>
              )}
              {selectedLeave.status === "APPROVED" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Approved</span>
                </span>
              )}
              {selectedLeave.status === "REJECTED" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <X className="w-3 h-3 text-rose-600" />
                  <span>Rejected</span>
                </span>
              )}
            </div>

            {/* Leave Title & Dates */}
            <div className="space-y-1.5 pt-1">
              <h4 className="text-lg font-bold text-[#1F1F1F] capitalize">
                {selectedLeave.leaveType?.toLowerCase().replace(/_/g, " ")} leave
              </h4>
              <div className="flex items-center gap-4 text-xs text-[#696E82]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1456F0]" />
                  <span>{formatDisplayDates(selectedLeave.startDate, selectedLeave.endDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1456F0]" />
                  <span>{formatDuration(selectedLeave)}</span>
                </div>
              </div>
            </div>

            {/* Reason Card with Parsed Google Form Fields */}
            {(() => {
              const meta = parseCompositeLeaveReason(selectedLeave.reason);
              return (
                <div className="p-3.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl space-y-2 text-xs">
                  <div className="font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#696E82]" />
                    <span>Reason for Absence</span>
                  </div>
                  <p className="text-[#1F1F1F] pl-5 italic">
                    &ldquo;{meta.reason || selectedLeave.reason || "Going out of station / Personal commitment"}&rdquo;
                  </p>

                  {meta.coveringColleague && (
                    <div className="pl-5 pt-1.5 border-t border-[#E2E6F0] space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-[#696E82] block">
                        Covering Colleague (Delegated Responsibilities)
                      </span>
                      <span className="font-semibold text-[#1456F0]">{meta.coveringColleague}</span>
                      {meta.handoverNotes && (
                        <p className="text-[11px] text-[#4B5565] mt-0.5">{meta.handoverNotes}</p>
                      )}
                    </div>
                  )}

                  {meta.emergencyContact && (
                    <div className="pl-5 pt-1.5 border-t border-[#E2E6F0] flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#696E82]">Emergency Reachable Phone:</span>
                      <span className="font-mono font-bold text-[#1F1F1F]">{meta.emergencyContact}</span>
                    </div>
                  )}

                  {(meta.supportingDocUrl || meta.supportingDocName || selectedLeave.supportingFileId) && (
                    <div className="pl-5 pt-1.5 border-t border-[#E2E6F0] flex items-center justify-between">
                      <span className="text-emerald-800 font-semibold text-[11px]">
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
                </div>
              );
            })()}

            {/* Allowance & Allocation Card with Real Employee Stats */}
            <div className="p-4 bg-white border border-[#E2E6F0] rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1456F0]" />
                  <span>Allowance &amp; allocation</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatsEmployee({
                      id: selectedLeave.employee?.id || selectedLeave.employeeId,
                      employeeId: selectedLeave.employee?.employeeId || selectedLeave.employeeId || "EMP-001",
                      name: selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff Member",
                      role: selectedLeave.employee?.designation || selectedLeave.employee?.department || "Architect",
                      department: selectedLeave.employee?.department,
                      email: selectedLeave.employee?.membership?.user?.email,
                    });
                  }}
                  className="text-[11px] font-semibold text-[#1456F0] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>View stats ↗</span>
                </button>
              </div>

              <div className="space-y-2 divide-y divide-[#F2F4F8] pt-1">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#696E82]">Monthly policy</span>
                  <div className="text-right">
                    <span className="font-bold text-[#1F1F1F]">2.0 paid days</span>
                    <span className="text-[11px] text-[#696E82] block">
                      {reviewEmpStats ? `${reviewEmpStats.remainingMonthly.toFixed(1)} days left this month` : "Per employee"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[#696E82]">Remaining balance</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700">
                      {reviewEmpStats ? `${reviewEmpStats.remainingAnnual.toFixed(1)} annual days left` : "24.0 days/year"}
                    </span>
                    <span className="text-[11px] text-[#696E82] block">
                      {reviewEmpStats ? `${reviewEmpStats.thisYearApprovedDays.toFixed(1)} used of 24.0 this year` : "Annual quota"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[#696E82]">Paid / unpaid split</span>
                  <div className="text-right">
                    <span className="font-semibold text-[#1F1F1F]">
                      {reviewEmpStats ? `${reviewEmpStats.paidDays.toFixed(1)} paid days taken` : "Calculated on approval"}
                    </span>
                    <span className="text-[11px] text-rose-600 block">
                      {reviewEmpStats && reviewEmpStats.lopDays > 0 ? `${reviewEmpStats.lopDays.toFixed(1)} Loss of Pay (LOP)` : "0 Loss of Pay"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F2F4F8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatsEmployee({
                      id: selectedLeave.employee?.id || selectedLeave.employeeId,
                      employeeId: selectedLeave.employee?.employeeId || selectedLeave.employeeId || "EMP-001",
                      name: selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff Member",
                      role: selectedLeave.employee?.designation || selectedLeave.employee?.department || "Architect",
                      department: selectedLeave.employee?.department,
                      email: selectedLeave.employee?.membership?.user?.email,
                    });
                  }}
                  className="text-xs font-semibold text-[#1456F0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Complete leave stats</span>
                </button>

                <Link
                  href={`/w/${workspaceSlug}/leave/dossier/${selectedLeave.employeeId || selectedLeave.employee?.id}`}
                  className="text-xs font-semibold text-[#696E82] hover:text-[#1F1F1F] inline-flex items-center gap-1"
                >
                  <span>Dossier</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Review Note Section matching Reference */}
            {selectedLeave.status === "PENDING" && (
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#696E82]" />
                  <span>Review note</span>
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add a review note..."
                  className="w-full text-xs p-3 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#1456F0] resize-none"
                />
              </div>
            )}

            {/* Warning Banner */}
            <div className="p-3 bg-[#FFF9EB] border border-[#FEE3A2] rounded-xl text-xs text-[#92400E] flex items-center gap-2">
              <Info className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>Review balance before confirming.</span>
            </div>

            {/* Bottom Actions matching Reference */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-[#F0F2F7]">
              {selectedLeave.status === "PENDING" ? (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReject(selectedLeave.id)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApprove(selectedLeave.id)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1456F0] hover:bg-[#0F47D1] text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1456F0] text-white font-bold text-xs"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADVANCED GOOGLE FORM APPLY ON BEHALF ================= */}
      <AdvancedLeaveFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(msg) => {
          setActionSuccess(msg || "Leave application submitted on behalf of staff member!");
          fetchLeaves();
          broadcastRealtimeEvent("LEAVE_UPDATED");
          broadcastRealtimeEvent("NOTIFICATION_UPDATED");
        }}
        workspaceSlug={workspaceSlug}
        mode="ADMIN_CREATE"
        employees={employees}
      />

      {/* Google Apps Script Modal */}
      {isAppsScriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E6F0] space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="type-card-title text-[#1F1F1F]">Google Sheets Integration</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#696E82]">
              <p>
                Connect your Studio Leave Google Sheet for automated 2-way real-time synchronization.
              </p>

              <form onSubmit={handleSaveWebhook} className="space-y-2 pt-1">
                <label className="font-semibold text-[#1F1F1F] block">Google Apps Script Webhook URL</label>
                <input
                  type="url"
                  required
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-mono"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                {webhookSaveMessage && (
                  <p className="text-[11px] text-emerald-700 font-semibold">{webhookSaveMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="w-full py-2 px-3 rounded-xl bg-[#1456F0] text-white font-semibold text-xs hover:bg-[#0F47D1]"
                >
                  {savingWebhook ? "Saving..." : "Save Webhook URL"}
                </button>
              </form>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#F0F2F7]">
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(false)}
                className="px-4 py-2 border border-[#E2E6F0] rounded-xl font-semibold text-[#1F1F1F] hover:bg-[#F8F9FE]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Leave Statistics Modal */}
      {selectedStatsEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-[#E2E6F0] space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-[#1F1F1F]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#F0F2F7] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1456F0] to-[#3B82F6] text-white font-bold text-base flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  {getInitials(selectedStatsEmployee.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight">
                      {selectedStatsEmployee.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#1456F0] bg-[#EBF1FF] px-2.5 py-0.5 rounded-full border border-[#CEDEFF]">
                      {selectedStatsEmployee.employeeId}
                    </span>
                  </div>
                  <p className="text-xs text-[#696E82] mt-0.5">
                    <span>{selectedStatsEmployee.role}</span>
                    {selectedStatsEmployee.department && <span> • {selectedStatsEmployee.department}</span>}
                    {selectedStatsEmployee.email && <span> • {selectedStatsEmployee.email}</span>}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStatsEmployee(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE] transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Allowance & Balance Card */}
            {currentModalStats && (
              <div className="p-4 bg-gradient-to-br from-[#FAFBFF] to-[#F0F4FF] border border-[#CEDEFF] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1456F0]" />
                    <span className="font-bold text-xs text-[#1F1F1F]">Annual Leave Balance &amp; Quota</span>
                  </div>
                  <span className="text-xs font-semibold text-[#1456F0] bg-white px-2.5 py-1 rounded-full border border-[#CEDEFF] shadow-2xs">
                    {currentModalStats.remainingAnnual.toFixed(1)} days balance left
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-[#696E82]">
                    <span>{currentModalStats.thisYearApprovedDays.toFixed(1)} days used this year</span>
                    <span>Quota: {currentModalStats.annualAllowance.toFixed(1)} days/year</span>
                  </div>
                  <div className="w-full bg-[#E2E6F0] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentModalStats.thisYearApprovedDays > currentModalStats.annualAllowance
                          ? "bg-rose-500"
                          : currentModalStats.thisYearApprovedDays / currentModalStats.annualAllowance > 0.8
                          ? "bg-amber-500"
                          : "bg-[#1456F0]"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (currentModalStats.thisYearApprovedDays / (currentModalStats.annualAllowance || 24)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#CEDEFF]/50 text-xs">
                  <div>
                    <span className="text-[#696E82] text-[11px] block">Monthly Policy</span>
                    <span className="font-semibold text-[#1F1F1F]">{currentModalStats.monthlyAllowance.toFixed(1)} days/mo</span>
                  </div>
                  <div>
                    <span className="text-[#696E82] text-[11px] block">Used This Month</span>
                    <span className="font-semibold text-[#1F1F1F]">{currentModalStats.thisMonthApprovedDays.toFixed(1)} days</span>
                  </div>
                  <div>
                    <span className="text-[#696E82] text-[11px] block">This Month Balance</span>
                    <span className="font-semibold text-emerald-700">{currentModalStats.remainingMonthly.toFixed(1)} days left</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Key Stat Cards */}
            {currentModalStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-medium text-[#696E82] block">Approved Days</span>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {currentModalStats.approvedDays.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">
                    {currentModalStats.approved} {currentModalStats.approved === 1 ? "request" : "requests"}
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-medium text-[#696E82] block">Pending Days</span>
                  <div className="text-xl font-bold text-amber-600 mt-0.5">
                    {currentModalStats.pendingDays.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">
                    {currentModalStats.pending} awaiting review
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-medium text-[#696E82] block">Paid Leave</span>
                  <div className="text-xl font-bold text-[#1456F0] mt-0.5">
                    {currentModalStats.paidDays.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">Eligible days</span>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-medium text-[#696E82] block">Loss of Pay (LOP)</span>
                  <div className="text-xl font-bold text-rose-600 mt-0.5">
                    {currentModalStats.lopDays.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">Unpaid / exceeded</span>
                </div>
              </div>
            )}

            {/* Leave Type Breakdown Pills */}
            {currentModalStats && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#1F1F1F]">Approved Breakdown by Type</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl flex items-center justify-between">
                    <span className="text-[#696E82]">Casual</span>
                    <span className="font-bold text-[#1F1F1F]">{currentModalStats.casualDays.toFixed(1)} d</span>
                  </div>
                  <div className="p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl flex items-center justify-between">
                    <span className="text-[#696E82]">Sick</span>
                    <span className="font-bold text-[#1F1F1F]">{currentModalStats.sickDays.toFixed(1)} d</span>
                  </div>
                  <div className="p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl flex items-center justify-between">
                    <span className="text-[#696E82]">Annual</span>
                    <span className="font-bold text-[#1F1F1F]">{currentModalStats.annualDays.toFixed(1)} d</span>
                  </div>
                  <div className="p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl flex items-center justify-between">
                    <span className="text-[#696E82]">Loss of Pay</span>
                    <span className="font-bold text-rose-600">{currentModalStats.lopDays.toFixed(1)} d</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Applications History for this employee */}
            <div className="space-y-2 pt-2 border-t border-[#F0F2F7]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1F1F]">
                  Leave History ({currentModalStats?.history?.length || 0})
                </span>
                <span className="text-[11px] text-[#696E82]">
                  {currentModalStats?.history?.length === 0 ? "No records" : "All logged requests"}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {!currentModalStats || currentModalStats.history.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#696E82] bg-[#F8F9FE] rounded-2xl border border-dashed border-[#E2E6F0]">
                    No leave requests found on file for this staff member.
                  </div>
                ) : (
                  currentModalStats.history.map((rec: any) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-[#FAFBFF] border border-[#E2E6F0] hover:border-[#CEDEFF] rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#1F1F1F] flex items-center gap-2">
                          <span className="capitalize">{rec.leaveType?.toLowerCase().replace(/_/g, " ")} leave</span>
                          <span className="text-[11px] text-[#696E82]">• {formatDuration(rec)}</span>
                        </div>
                        <div className="text-[11px] text-[#696E82]">
                          <span>{formatDisplayDates(rec.startDate, rec.endDate)}</span>
                          {rec.reason && <span className="italic ml-2">"{rec.reason}"</span>}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {rec.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {rec.status === "APPROVED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Approved
                          </span>
                        )}
                        {rec.status === "REJECTED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Rejected
                          </span>
                        )}
                        {rec.status === "CANCELLED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#F0F2F7]">
              <button
                type="button"
                onClick={() => {
                  setEmployeeFilter(selectedStatsEmployee.id || selectedStatsEmployee.name);
                  setSelectedStatsEmployee(null);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#EBF1FF] hover:bg-[#1456F0] text-[#1456F0] hover:text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Table by {selectedStatsEmployee.name.split(" ")[0]}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Link
                  href={`/w/${workspaceSlug}/leave/dossier/${selectedStatsEmployee.id || selectedStatsEmployee.employeeId}`}
                  className="w-full sm:w-auto px-3.5 py-2 border border-[#E2E6F0] hover:bg-[#F8F9FE] text-[#1F1F1F] font-semibold rounded-xl text-xs inline-flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Full Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#696E82]" />
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedStatsEmployee(null)}
                  className="w-full sm:w-auto px-5 py-2 bg-[#1456F0] hover:bg-[#0F47D1] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
