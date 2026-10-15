"use client";

import React, { useState, useEffect, useTransition } from "react";
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
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";
import { MobileFilterDrawer } from "@/components/ui/MobileFilterDrawer";

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
  const [isMobileLeaveFilterOpen, setIsMobileLeaveFilterOpen] = useState(false);

  const activeLeaveFilterCount = (statusFilter ? 1 : 0) + (leaveTypeFilter ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  const handleResetLeaveFilters = () => {
    setStatusFilter("");
    setLeaveTypeFilter("");
    setSearchQuery("");
  };

  // Modals & Actions
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Google Sheets Live 24/7 Sync State
  const [syncStatus, setSyncStatus] = useState<any | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(
    "https://script.google.com/macros/s/AKfycbw28LoETUSD3jbnDIxMZqBSPoggKLw_iHen4cFkUMm6Ayq6VukjcPwij5YoJRPRS198RA/exec"
  );
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaveMessage, setWebhookSaveMessage] = useState<string | null>(null);

  const formatLocalDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const s = typeof dateVal === "string" ? dateVal : dateVal.toISOString();
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[m - 1]} ${d}`;
  };

  const formatDuration = (rec: any) => {
    if (!rec) return "";
    if (rec.isHourly) {
      if (rec.totalMinutes) {
        if (rec.totalMinutes >= 60) {
          return `${(rec.totalMinutes / 60).toFixed(1).replace(/\.0$/, "")} Hr(s)`;
        }
        return `${rec.totalMinutes} min`;
      }
      const hrs = Number(rec.days || 0) * 8;
      return `${hrs.toFixed(1).replace(/\.0$/, "")} Hr(s)`;
    }
    if (rec.isHalfDay) {
      return "0.5 Day";
    }
    return `${Number(rec.days)} Day(s)`;
  };

  // Create on behalf modal state
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

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&syncType=LEAVE_SHEET`);
      const data = await res.json();
      if (res.ok && data.leaveSheet) {
        setSyncStatus(data.leaveSheet);
        if (data.leaveSheet.webhookUrl) {
          setWebhookUrlInput(data.leaveSheet.webhookUrl);
        }
      }
    } catch {
      // background silent
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
          action: "CONFIGURE_WEBHOOK",
          webhookUrl: webhookUrlInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save webhook URL");
      setWebhookSaveMessage(data.message || "Webhook connected successfully!");
      fetchSyncStatus();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google-sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          syncType: "LEAVE_SHEET",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      const imported = data.leaveResult?.importedCount || 0;
      const updated = data.leaveResult?.updatedCount || 0;
      const skippedTombstones = data.leaveResult?.skippedTombstonesCount || 0;
      const preserved = data.leaveResult?.preservedLocalDecisionsCount || 0;

      setActionSuccess(
        `Live sync complete! ${imported} new, ${updated} updated. 🛡️ Tombstone Shield: ${skippedTombstones} deleted items skipped, ${preserved} local decisions preserved.`
      );
      fetchLeaves();
      fetchSyncStatus();
      broadcastRealtimeEvent("LEAVE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteLeave = async (id: string, empName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the leave request for ${empName}?\n\n🛡️ Tombstone Shield is active: this record will be permanently marked so re-syncing the Google Sheet will NEVER resurrect it!`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave/records/${id}?workspaceSlug=${workspaceSlug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete leave request");

      setActionSuccess(`Leave record deleted and tombstoned. It will never resurrect on Google Sheet re-sync.`);
      setIsReviewOpen(false);
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

  // Initial load
  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
    fetchSyncStatus();
  }, [workspaceSlug, statusFilter, leaveTypeFilter]);

  // Real-time dynamic updates: visible 20s polling + tab focus revalidation + cross-tab live events
  useRealtimeSubscription(
    ["LEAVE_UPDATED"],
    () => {
      // Background re-sync with Google Sheet if auto sync enabled, and fetch latest records
      fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&auto=true&syncType=LEAVE_SHEET`)
        .then((r) => r.json())
        .then((d) => {
          if (d.leaveSheet) setSyncStatus(d.leaveSheet);
        })
        .catch(() => {});
      fetchLeaves(true);
      fetchSyncStatus();
    },
    { intervalMs: 20000 }
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeaves();
  };

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

      setActionSuccess("Leave approved! Staff notification email enqueued in outbox.");
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
          days: createForm.isHalfDay ? 0.5 : Number(createForm.days),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create leave");

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
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics summary
  const totalApproved = records.filter((r) => r.status === "APPROVED").length;
  const totalPending = records.filter((r) => r.status === "PENDING").length;
  const totalDaysApproved = records
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + Number(r.days), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Studio Operations</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Staff Leaves & Attendance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight">Studio Leave Management</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Policy: 2.0 eligible paid days/month • Chronological consumption • Unpaid Loss of Pay (LOP)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            href={`/w/${workspaceSlug}/leave/calendar`}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all flex-1 sm:flex-initial"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Team Absence Calendar</span>
          </Link>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all flex-1 sm:flex-initial cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply on Behalf</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🟢 Live Google Sheet Synchronization Bar (24/7 Connected) */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-indigo-500/10 rounded-2xl border border-emerald-500/20 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {syncStatus?.isWebhookConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  2-WAY LIVE WRITE-BACK ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  READ-ONLY (CONNECT 2-WAY WEBHOOK)
                </span>
              )}
              <span className="text-xs font-bold text-[#1F1F1F]">Google Sheets Leave Tracker</span>
              <a
                href="https://docs.google.com/spreadsheets/d/1xw3788TL51yjHzjRZYp2A1Pp9NpoB8pXYzNDvdrCR1U/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="text-[#5A81FA] hover:text-[#4870EB] inline-flex items-center gap-0.5 text-[11px] font-medium"
              >
                <span>Open Live Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#696E82] mt-0.5 flex flex-wrap items-center gap-2">
              <span>Auto-syncs Form Responses</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tombstone Protection Active (Deleted records will never resurrect)
              </span>
              {syncStatus?.lastAttemptAt && (
                <>
                  <span>•</span>
                  <span>Last synced: {new Date(syncStatus.lastAttemptAt).toLocaleTimeString()}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsAppsScriptModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <Code className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Two-Way Script</span>
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleManualSync}
            disabled={syncLoading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
            <span>{syncLoading ? "Syncing..." : "Sync Live Sheet"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">{totalPending}</div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Awaiting leadership action</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
            <span>Approved Requests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">{totalApproved}</div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Total approved requests</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
            <span>Approved Days</span>
            <Calendar className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
            {totalDaysApproved.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Cumulative staff days absent</div>
        </div>

        <div className="p-4 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#2C308D] font-semibold uppercase tracking-wider">
            <span>Monthly Policy</span>
            <Building className="w-4 h-4 text-[#5A81FA]" />
          </div>
          <div className="text-2xl font-extrabold text-[#2C308D] mt-2 font-mono">2.0 Days</div>
          <div className="text-[11px] text-[#4870EB] mt-0.5">Paid quota / employee / mo</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box & Mobile Filter Button */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696E82]" />
              <input
                type="text"
                suppressHydrationWarning
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by staff name, ID, or reason..."
                className="w-full pl-9 pr-7 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] text-[#1F1F1F]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsMobileLeaveFilterOpen(true)}
              className={`sm:hidden px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 border cursor-pointer ${
                activeLeaveFilterCount > 0
                  ? "bg-blue-50 border-[#3562E8] text-[#3562E8] font-bold shadow-xs"
                  : "bg-white border-[#E2E6F0] text-slate-700 hover:bg-[#F8F9FD]"
              }`}
              title="Open all filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#3562E8]" />
              <span>Filters</span>
              {activeLeaveFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#3562E8] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {activeLeaveFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Selects (hidden on mobile, visible on sm and up) */}
          <div className="hidden sm:flex items-center gap-2">
            <select
              suppressHydrationWarning
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              suppressHydrationWarning
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Leave Types</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick / Medical</option>
              <option value="ANNUAL">Annual Leave</option>
              <option value="MATERNITY">Maternity</option>
              <option value="LOSS_OF_PAY">Loss of Pay (Unpaid)</option>
            </select>

            {activeLeaveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetLeaveFilters}
                className="text-xs text-[#696E82] hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View: 1-Tap Quick Filter Carousel */}
        <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              statusFilter === ""
                ? "bg-[#3562E8] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "PENDING" ? "" : "PENDING"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "APPROVED" ? "" : "APPROVED"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
              statusFilter === "APPROVED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "REJECTED" ? "" : "REJECTED"))}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
              statusFilter === "REJECTED"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Rejected</span>
          </button>
        </div>
      </div>

      {/* Mobile Filter Drawer for Leave */}
      <MobileFilterDrawer
        isOpen={isMobileLeaveFilterOpen}
        onClose={() => setIsMobileLeaveFilterOpen(false)}
        title="Filter Leave Applications"
        activeCount={activeLeaveFilterCount}
        onReset={handleResetLeaveFilters}
        resultCount={records.length}
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Approval Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3562E8]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Leave Category
            </label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3562E8]"
            >
              <option value="">All Leave Types</option>
              <option value="CASUAL">Casual Leave (Paid)</option>
              <option value="SICK">Sick / Medical (Paid)</option>
              <option value="ANNUAL">Annual Leave (Paid)</option>
              <option value="MATERNITY">Maternity</option>
              <option value="LOSS_OF_PAY">Loss of Pay (Unpaid LOP)</option>
            </select>
          </div>
        </div>
      </MobileFilterDrawer>

      {/* Leave Table (Zero Horizontal Scroll Design) */}
      <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#696E82]">Loading studio leave records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-[#696E82] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#1F1F1F]">No leave records found</h3>
            <p className="text-xs text-[#696E82] mt-0.5">No leave applications match the selected filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {records.map((rec) => {
              const empName = rec.employeeNameRaw || rec.employee?.membership?.user?.fullName || "Staff Member";
              const empId = rec.employee?.employeeId || "EMP";
              const dept = rec.employee?.department || "Studio";
              const startStr = formatLocalDate(rec.startDate);
              const endStr = formatLocalDate(rec.endDate);
              const durationStr = formatDuration(rec);
              const appliedTime = new Date(rec.submittedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={rec.id}
                  className="p-3.5 hover:bg-[#F8F9FE] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Employee Info */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-8 h-8 rounded-full bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0">
                      {empName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/w/${workspaceSlug}/leave/dossier/${rec.employeeId}`}
                        className="font-bold text-[#1F1F1F] hover:text-[#5A81FA] transition-colors flex items-center gap-1"
                      >
                        <span>{empName}</span>
                        <ChevronRight className="w-3 h-3 text-[#696E82]" />
                      </Link>
                      <div className="text-[11px] text-[#696E82] font-mono mt-0.5">
                        <span>{empId}</span> • <span>{dept}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Date Range & Duration */}
                  <div className="min-w-[180px]">
                    <div className="font-semibold text-[#1F1F1F] font-mono">
                      {startStr} {startStr !== endStr ? `— ${endStr}` : ""}
                    </div>
                    <div className="text-[11px] text-[#696E82] flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-[#5A81FA]">{durationStr}</span>
                      <span>•</span>
                      <span>{rec.leaveType}</span>
                      {rec.isShortNotice && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Short Notice
                        </span>
                      )}
                      {rec.supportingFileId && (
                        <a
                          href={rec.supportingFileId}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#5A81FA] hover:underline flex items-center gap-0.5"
                          title="View Certificate / Attachment"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Doc</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Reason snippet */}
                  <div className="flex-1 max-w-[260px] text-[11px] text-[#696E82] truncate">
                    {rec.reason ? `"${rec.reason}"` : <span className="italic">No justification provided</span>}
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0 flex items-center gap-2">
                    {rec.status === "APPROVED" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Approved</span>
                      </span>
                    )}
                    {rec.status === "PENDING" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Under Review</span>
                      </span>
                    )}
                    {rec.status === "REJECTED" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                    {rec.status === "CANCELLED" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        Cancelled
                      </span>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedLeave(rec);
                          setIsReviewOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#5A81FA] hover:bg-[#4870EB] text-white rounded-lg transition-colors cursor-pointer"
                        title="Review or Update Decision"
                      >
                        {rec.status === "PENDING" ? "Review" : "Update"}
                      </button>

                      <button
                        onClick={() => handleDeleteLeave(rec.id, empName)}
                        disabled={actionLoading}
                        className="p-1.5 text-[#696E82] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete record (Tombstone Shield prevents resurrection on Google Sheet re-sync)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Review Modal */}
      {isReviewOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Review Leave Request</h3>
                <p className="text-xs text-[#696E82]">100% DESIGN Studio Executive Approval</p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-1 rounded-lg text-[#696E82] hover:bg-[#F8F9FE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#F8F9FD] p-3.5 rounded-2xl border border-[#E2E6F0]">
              <div className="flex items-center justify-between">
                <span className="text-[#696E82]">Applicant:</span>
                <span className="font-bold text-[#1F1F1F]">
                  {selectedLeave.employeeNameRaw || selectedLeave.employee?.membership?.user?.fullName} (
                  {selectedLeave.employee?.employeeId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#696E82]">Duration:</span>
                <span className="font-mono font-bold text-[#5A81FA]">
                  {formatDuration(selectedLeave)} ({selectedLeave.leaveType})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#696E82]">Dates:</span>
                <span className="font-mono text-[#1F1F1F]">
                  {formatLocalDate(selectedLeave.startDate)}
                  {selectedLeave.startDate !== selectedLeave.endDate
                    ? ` to ${formatLocalDate(selectedLeave.endDate)}`
                    : ""}
                </span>
              </div>
              <div>
                <span className="text-[#696E82] block mb-1">Reason:</span>
                <div className="p-2 bg-white rounded-lg text-[#1F1F1F] italic border border-[#E2E6F0]">
                  {selectedLeave.reason || "None specified"}
                </div>
              </div>
              {selectedLeave.isShortNotice && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Submitted less than 24 hours prior to leave start date.</span>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Leadership Review Notes (Optional):
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Approved, tasks covered by Rohan"
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Rejection Justification (Required if rejecting):
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Critical client presentation milestone on Friday"
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteLeave(selectedLeave.id, selectedLeave.employeeNameRaw || "Employee")}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                title="Tombstone Shield prevents resurrection on sync"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleReject(selectedLeave.id)}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApprove(selectedLeave.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply on behalf modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOnBehalf}
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Apply Leave on Behalf</h3>
                <p className="text-xs text-[#696E82]">Record staff leave request directly</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-[#696E82] hover:bg-[#F8F9FE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Select Employee *</label>
                <select
                  required
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.membership?.user?.fullName || emp.name} ({emp.employeeId}) • {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Leave Type *</label>
                  <select
                    value={createForm.leaveType}
                    onChange={(e) => setCreateForm({ ...createForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick / Medical</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="MATERNITY">Maternity</option>
                    <option value="LOSS_OF_PAY">Loss of Pay (Unpaid)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    step="0.125"
                    min="0.125"
                    value={createForm.days}
                    onChange={(e) => setCreateForm({ ...createForm, days: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Reason / Justification</label>
                <textarea
                  rows={2}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Reason for leave application..."
                  className="w-full px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-[#F8F9FE] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Google Apps Script 2-Way Sync Setup Modal */}
      {isAppsScriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-[#E2E6F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Google Sheets 2-Way Webhook Setup</h3>
                  <p className="text-xs text-[#696E82]">Real-time cell write-back when you Approve, Reject, or Delete</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(false)}
                className="p-1 rounded-lg text-[#696E82] hover:bg-[#F8F9FE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guarantees Box */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero-Resurrection Guarantee (Tombstone Shield)</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                In this app, once you delete a record or review a leave, it is permanently protected in the database.
                Even when re-syncing the live CSV 24/7, deleted items will <strong>NEVER</strong> resurrect, and your approvals will never revert to Pending!
              </p>
            </div>

            {/* Webhook Connection Form */}
            <form onSubmit={handleSaveWebhook} className="p-4 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <span>Google Apps Script Web App URL:</span>
                  {syncStatus?.isWebhookConnected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Not Connected Yet
                    </span>
                  )}
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="px-4 py-2 text-xs font-semibold bg-[#5A81FA] hover:bg-[#4870EB] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {savingWebhook ? "Connecting..." : "Save & Connect"}
                </button>
              </div>
              {webhookSaveMessage && (
                <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{webhookSaveMessage}</span>
                </div>
              )}
            </form>

            {/* 3 Step Setup Guide */}
            <div className="space-y-3 text-xs text-[#1F1F1F]">
              <h4 className="font-bold text-xs text-[#1F1F1F] uppercase tracking-wider">
                How to enable instant cell write-back in your Google Sheet (3 Minutes):
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-[#4A4E69]">
                <li>
                  Open your Google Sheet:{" "}
                  <a
                    href="https://docs.google.com/spreadsheets/d/1xw3788TL51yjHzjRZYp2A1Pp9NpoB8pXYzNDvdrCR1U/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#5A81FA] underline font-medium"
                  >
                    Staff Leave Spreadsheet ↗
                  </a>
                </li>
                <li>In Google Sheets top menu, click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Delete any code in <code>Code.gs</code>, and paste the script below.</li>
                <li>Click <strong>Deploy &gt; New deployment</strong>, select type: <strong>Web app</strong>, set <em>Execute as</em>: <strong>Me</strong>, and <em>Who has access</em>: <strong>Anyone</strong>.</li>
                <li>Copy the generated Web App URL and paste it in the box above, then click <strong>Save & Connect</strong>!</li>
              </ol>
            </div>

            {/* Script Code Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1F1F1F]">Google Apps Script Code (Code.gs):</span>
                <button
                  type="button"
                  onClick={() => {
                    const scriptCode = `function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var targetEmail = (contents.employeeEmail || "").toLowerCase().trim();
    var targetStatus = contents.status || (action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : action === "CANCEL" ? "Cancelled" : "[DELETED]");
    var processedBy = contents.processedBy || "Studio Leadership";
    var actionDate = new Date().toLocaleString();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var matchedRow = -1;

    // 1. Try matching by email AND start date if provided
    if (contents.startDate) {
      var targetDateStr = (contents.startDate || "").toString().trim();
      for (var r = data.length - 1; r >= 1; r--) {
        var row = data[r];
        var rowEmail = (row[8] || "").toString().toLowerCase().trim();
        var rowFromDate = (row[5] || "").toString().trim();
        var rowHourlyDate = (row[10] || "").toString().trim();

        if (targetEmail && rowEmail === targetEmail) {
          if (rowFromDate.indexOf(targetDateStr) !== -1 || rowHourlyDate.indexOf(targetDateStr) !== -1) {
            matchedRow = r + 1;
            break;
          }
        }
      }
    }

    // 2. Fallback: Search latest application for this email
    if (matchedRow === -1) {
      for (var r = data.length - 1; r >= 1; r--) {
        var row = data[r];
        var rowEmail = (row[8] || "").toString().toLowerCase().trim();
        if (targetEmail && rowEmail === targetEmail) {
          matchedRow = r + 1;
          break;
        }
      }
    }

    if (matchedRow > 0) {
      if (action === "DELETE") {
        sheet.getRange(matchedRow, 14).setValue("[DELETED IN STUDIO]");
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate);
        sheet.getRange(matchedRow, 1, 1, sheet.getLastColumn()).setFontLine("line-through");
      } else if (action === "CANCEL") {
        sheet.getRange(matchedRow, 14).setValue("Cancelled");
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate);
      } else {
        sheet.getRange(matchedRow, 14).setValue(targetStatus);
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate);
        if (contents.rejectionReason) {
          sheet.getRange(matchedRow, 14).setNote("Reason: " + contents.rejectionReason);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, row: matchedRow, action: action })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "No match for " + targetEmail })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "HEALTHY", message: "Studio OS 2-Way Live Webhook Active" })).setMimeType(ContentService.MimeType.JSON);
}`;
                    navigator.clipboard.writeText(scriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F8F9FE] hover:bg-[#EEF1FB] text-[#5A81FA] border border-[#CEDEFF] flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript ? "✓ Copied to Clipboard!" : "Copy Script Code"}</span>
                </button>
              </div>

              <pre className="p-3 bg-[#1E2235] text-[#A5B4FC] text-[11px] rounded-xl font-mono overflow-x-auto max-h-48">
{`function doPost(e) {
  var contents = JSON.parse(e.postData.contents);
  var action = contents.action;
  var targetEmail = (contents.employeeEmail || "").toLowerCase().trim();
  var targetStatus = contents.status || (action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "[DELETED]");
  var processedBy = contents.processedBy || "Studio Leadership";
  var actionDate = new Date().toLocaleString();

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  for (var r = data.length - 1; r >= 1; r--) {
    if (data[r][8] && data[r][8].toString().toLowerCase().trim() === targetEmail) {
      var row = r + 1;
      if (action === "DELETE") {
        sheet.getRange(row, 14).setValue("[DELETED IN STUDIO]");
        sheet.getRange(row, 1, 1, sheet.getLastColumn()).setFontLine("line-through");
      } else {
        sheet.getRange(row, 14).setValue(targetStatus);
        sheet.getRange(row, 15).setValue(processedBy);
        sheet.getRange(row, 16).setValue(actionDate);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, row: row })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}`}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsAppsScriptModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#5A81FA] text-white hover:bg-[#4870EB] rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
