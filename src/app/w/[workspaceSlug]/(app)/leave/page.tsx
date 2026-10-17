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
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";

export default function LeaveManagementPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("RECENT");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

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
      if (rec.totalMinutes) {
        if (rec.totalMinutes >= 60) {
          return `${(rec.totalMinutes / 60).toFixed(1).replace(/\.0$/, "")} hours`;
        }
        return `${rec.totalMinutes} min`;
      }
      const hrs = Number(rec.days || 0) * 8;
      return `${hrs.toFixed(1).replace(/\.0$/, "")} hours`;
    }
    if (rec.isHalfDay) {
      return "0.5 day";
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

  // Metrics computation
  const totalPending = useMemo(() => records.filter((r) => r.status === "PENDING").length, [records]);
  const totalApproved = useMemo(() => records.filter((r) => r.status === "APPROVED").length, [records]);
  const totalRejected = useMemo(() => records.filter((r) => r.status === "REJECTED").length, [records]);
  const totalDaysApproved = useMemo(
    () => records.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + (Number(r.days) || 0), 0),
    [records]
  );

  // Filtering & Pagination
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = (rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "").toLowerCase();
      const empId = (rec.employee?.employeeId || "").toLowerCase();
      const reason = (rec.reason || "").toLowerCase();

      const matchesSearch = !q || empName.includes(q) || empId.includes(q) || reason.includes(q);
      const matchesStatus = !statusFilter || rec.status === statusFilter;
      const matchesType = !leaveTypeFilter || rec.leaveType === leaveTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, searchQuery, statusFilter, leaveTypeFilter]);

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
    <div className="space-y-5 pb-24 md:pb-12 text-[#1F1F1F]">
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
            <h1 className="text-2xl md:text-[28px] font-bold text-[#1F1F1F] tracking-tight">
              Staff leave
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#696E82] mt-1">
            <span>Review requests and plan team availability.</span>
            <span className="hidden sm:inline">•</span>
            {/* Live Sheets Indicator Strip matching Reference */}
            <div className="inline-flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sheets connected</span>
              </span>
              <span>
                Last synced:{" "}
                {syncStatus?.lastAttemptAt
                  ? new Date(syncStatus.lastAttemptAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "11:20 AM"}
              </span>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncLoading}
                className="text-[#1456F0] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Sync now</span>
                {syncLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(true)}
                className="p-1 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
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
                {totalPending}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Awaiting leadership action
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
                {totalApproved}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Total approved requests
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
                {totalDaysApproved.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            As reported by leave tracker
          </div>
        </div>

        {/* Card 4: Monthly allowance */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F4F6FB] text-[#1F1F1F] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Monthly allowance</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                2 days
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Per employee • Not remaining balance
          </div>
        </div>
      </div>

      {/* 2. Status Pill Tabs & Sort Bar matching Reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
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

        {/* Scope Dropdown on right */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="text-xs bg-white border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#1F1F1F] font-medium focus:outline-none focus:border-[#1456F0] self-start sm:self-auto"
        >
          <option value="RECENT">All records ⇅</option>
          <option value="OLDEST">Oldest first</option>
          <option value="DURATION">Duration (High to Low)</option>
        </select>
      </div>

      {/* 3. Secondary Filter Strip matching Reference Image */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:border-[#1456F0]"
            />
          </div>

          {/* Leave Type Dropdown */}
          <select
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

          {/* Date Selector Placeholder */}
          <div className="text-xs bg-white border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#696E82] font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#696E82]" />
            <span>Select dates ⇅</span>
          </div>

          <div className="text-xs bg-white border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#1F1F1F] font-medium">
            <span>Sort: Recent requests ⇅</span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="hidden sm:flex items-center bg-[#F4F6FB] p-0.5 rounded-xl border border-[#E2E6F0]">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "table" ? "bg-white text-[#1456F0] shadow-2xs" : "text-[#696E82] hover:text-[#1F1F1F]"
            }`}
            title="Table View"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
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
            {/* Desktop Table View matching Reference Image */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
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

                    return (
                      <tr key={rec.id} className="hover:bg-[#F8F9FE] transition-colors group">
                        {/* Employee */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(empName)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1F1F1F]">
                                {empName}
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

            {/* Mobile Stack Cards matching Reference Image */}
            <div className="md:hidden divide-y divide-[#E2E6F0]">
              {paginatedRecords.map((rec) => {
                const empName = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
                const empId = rec.employee?.employeeId || "EMP-001";
                const role = rec.employee?.designation || rec.employee?.department || "Architect";
                const datesStr = formatDisplayDates(rec.startDate, rec.endDate);
                const durationStr = formatDuration(rec);

                return (
                  <div key={rec.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(empName)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#1F1F1F]">{empName}</div>
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

            {/* Pagination Controls matching Reference */}
            <div className="p-4 border-t border-[#E2E6F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#696E82]">
              <div>
                Showing {(page - 1) * pageSize + 1} –{" "}
                {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length}{" "}
                records
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:bg-[#F8F9FE] disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                        page === i + 1
                          ? "bg-[#1456F0] text-white shadow-2xs"
                          : "border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:bg-[#F8F9FE] disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-sm flex items-center justify-center">
                  {getInitials(selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff")}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    {selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName || "Staff Member"}
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

            {/* Reason Card matching Reference */}
            <div className="p-3.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl space-y-1 text-xs">
              <div className="font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#696E82]" />
                <span>Reason</span>
              </div>
              <p className="text-[#696E82] pl-5 italic">
                {selectedLeave.reason ? `"${selectedLeave.reason}"` : "Going out of station / Personal commitment"}
              </p>
            </div>

            {/* Allowance & Allocation Card matching Reference */}
            <div className="p-4 bg-white border border-[#E2E6F0] rounded-2xl space-y-2.5 text-xs">
              <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1456F0]" />
                <span>Allowance &amp; allocation</span>
              </div>

              <div className="space-y-2 divide-y divide-[#F2F4F8] pt-1">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#696E82]">Monthly policy</span>
                  <div className="text-right">
                    <span className="font-bold text-[#1F1F1F]">2 paid days</span>
                    <span className="text-[11px] text-[#696E82] block">Per employee</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[#696E82]">Remaining balance</span>
                  <div className="text-right">
                    <span className="font-medium text-[#1F1F1F]">Not available in this view</span>
                    <span className="text-[11px] text-[#696E82] block">Prior usage unknown</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[#696E82]">Paid / unpaid split</span>
                  <div className="text-right">
                    <span className="font-medium text-amber-700">Verify before approval</span>
                    <span className="text-[11px] text-[#696E82] block">Not specified</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F2F4F8]">
                <Link
                  href={`/w/${workspaceSlug}/leave/dossier/${selectedLeave.employeeId}`}
                  className="text-xs font-semibold text-[#1456F0] hover:underline inline-flex items-center gap-1"
                >
                  <span>View leave history</span>
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

      {/* Apply on Behalf Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E2E6F0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">Apply Leave on Behalf</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOnBehalf} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Select Employee</label>
                <select
                  required
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-medium"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName || emp.name} ({emp.employeeId || "EMP"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full p-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full p-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Leave Type</label>
                  <select
                    value={createForm.leaveType}
                    onChange={(e) => setCreateForm({ ...createForm, leaveType: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick / Medical</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="LOSS_OF_PAY">Loss of Pay (LOP)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={createForm.days}
                    onChange={(e) => setCreateForm({ ...createForm, days: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Justification for absence..."
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F2F7]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-[#E2E6F0] rounded-xl font-semibold text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1456F0] hover:bg-[#0F47D1] text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Apps Script Modal */}
      {isAppsScriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E6F0] space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#1F1F1F]">Google Sheets Integration</h3>
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
    </div>
  );
}
