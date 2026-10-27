"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Star,
  Phone,
  Mail,
  Globe,
  Calendar,
  Building,
  User,
  X,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  Code,
  Copy,
  Trash2,
  Edit3,
  RefreshCw,
  ArrowUpDown,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";
import MobileFilterDrawer from "@/components/ui/MobileFilterDrawer";
import { AdvancedPagination, usePagination } from "@/components/ui/AdvancedPagination";

export default function VendorManagementPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [contactFilter, setContactFilter] = useState<string>("ALL");
  const [meetingFilter, setMeetingFilter] = useState<string>("ALL");
  const [vendorSortBy, setVendorSortBy] = useState<string>("NEWEST");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Quick Meeting Modal & Logging state
  const [meetingModalVendor, setMeetingModalVendor] = useState<any | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    status: "DONE" as "DONE" | "PENDING" | "NONE",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    hasSample: false,
    hasCatalog: false,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active filter count for mobile badge
  const mobileActiveFilterCount =
    (industryFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (ratingFilter !== "ALL" ? 1 : 0) +
    (contactFilter !== "ALL" ? 1 : 0) +
    (meetingFilter !== "ALL" ? 1 : 0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    designation: "Sales Lead",
    industryType: "Marble & Granite",
    phoneNumber: "",
    email: "",
    websiteUrl: "",
    status: "ACTIVE",
    purposeOfVisit: "",
    notes: "",
    rating: 4,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Google Sheets Live 24/7 Sync State
  const [syncStatus, setSyncStatus] = useState<any | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Edit Vendor State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    companyName: "",
    designation: "",
    industryType: "Marble & Granite",
    phoneNumber: "",
    email: "",
    websiteUrl: "",
    status: "ACTIVE",
    purposeOfVisit: "",
    notes: "",
    rating: 4,
  });

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&syncType=VENDOR_SHEET`);
      const data = await res.json();
      if (res.ok && data.vendorSheet) {
        setSyncStatus(data.vendorSheet);
      }
    } catch {
      // background silent
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
          syncType: "VENDOR_SHEET",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      const imported = data.vendorResult?.importedCount || 0;
      const updated = data.vendorResult?.updatedCount || 0;
      const skippedTombstones = data.vendorResult?.skippedTombstonesCount || 0;

      setActionSuccess(
        `Live sync complete! ${imported} new, ${updated} updated. 🛡️ Tombstone Shield: ${skippedTombstones} deleted vendors skipped (never resurrected).`
      );
      fetchVendors();
      fetchSyncStatus();
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete vendor "${name}"?\n\n🛡️ Tombstone Shield is active: this vendor will be permanently marked so re-syncing the Google Sheet will NEVER resurrect them!`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/vendors/${id}?workspaceSlug=${workspaceSlug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete vendor");

      setActionSuccess(`Vendor "${name}" deleted with tombstone protection (never resurrected on sync).`);
      fetchVendors();
      fetchSyncStatus();
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (v: any) => {
    setEditingVendorId(v.id);
    setEditForm({
      name: v.name || "",
      companyName: v.companyName || "",
      designation: v.designation || "",
      industryType: v.industryType || "Marble & Granite",
      phoneNumber: v.phoneNumber || "",
      email: v.email || "",
      websiteUrl: v.websiteUrl || "",
      status: v.status || "ACTIVE",
      purposeOfVisit: v.purposeOfVisit || "",
      notes: v.notes || "",
      rating: v.rating || 4,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendorId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/vendors/${editingVendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vendor");

      setIsEditOpen(false);
      setActionSuccess(`Vendor "${editForm.companyName || editForm.name}" updated successfully.`);
      fetchVendors();
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchVendors = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(industryFilter ? { industryType: industryFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/vendors?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");

      setVendors(data.vendors || []);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load and filter synchronization
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
      fetchSyncStatus();
    }, 250);
    return () => clearTimeout(timer);
  }, [workspaceSlug, industryFilter, statusFilter, searchQuery]);

  // Format form fill date from Google Sheet timestamp or database created date
  const formatFormDate = (raw?: string | null, fallback?: string | Date) => {
    if (raw && typeof raw === "string" && raw.trim()) {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return raw;
    }
    if (fallback) {
      const parsed = new Date(fallback);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    return "N/A";
  };

  // Quick 1-click meeting status toggle: Done or Pending
  const handleQuickMeetingStatus = async (vendor: any, newStatus: "DONE" | "PENDING") => {
    try {
      const existingHistory = (vendor.visitHistoryJson as Record<string, any>) || {};
      const updatedHistory = {
        ...existingHistory,
        meetingStatus: newStatus,
        meetingCompletedAt: newStatus === "DONE" ? new Date().toISOString() : existingHistory.meetingCompletedAt,
      };

      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          visitHistoryJson: updatedHistory,
        }),
      });
      if (!res.ok) throw new Error("Failed to update meeting status");

      setVendors((prev) =>
        prev.map((item) =>
          item.id === vendor.id ? { ...item, visitHistoryJson: updatedHistory } : item
        )
      );
      setActionSuccess(`Meeting status for "${vendor.companyName || vendor.name}" marked as ${newStatus}.`);
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      alert(err.message || "Failed to update meeting status");
    }
  };

  const openMeetingModal = (vendor: any) => {
    const history = (vendor.visitHistoryJson as Record<string, any>) || {};
    setMeetingModalVendor(vendor);
    setMeetingForm({
      status: (history.meetingStatus as any) || "DONE",
      date: history.meetingDate || new Date().toISOString().split("T")[0],
      notes: history.meetingNotes || "",
      hasSample: Boolean(history.hasSample),
      hasCatalog: Boolean(history.hasCatalog),
    });
  };

  const handleSaveMeetingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingModalVendor) return;

    setActionLoading(true);
    try {
      const existingHistory = (meetingModalVendor.visitHistoryJson as Record<string, any>) || {};
      const updatedHistory = {
        ...existingHistory,
        meetingStatus: meetingForm.status,
        meetingDate: meetingForm.date,
        meetingNotes: meetingForm.notes,
        hasSample: meetingForm.hasSample,
        hasCatalog: meetingForm.hasCatalog,
        meetingCompletedAt:
          meetingForm.status === "DONE"
            ? existingHistory.meetingCompletedAt || new Date().toISOString()
            : undefined,
      };

      const res = await fetch(`/api/vendors/${meetingModalVendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          visitHistoryJson: updatedHistory,
        }),
      });
      if (!res.ok) throw new Error("Failed to save meeting details");

      setVendors((prev) =>
        prev.map((item) =>
          item.id === meetingModalVendor.id ? { ...item, visitHistoryJson: updatedHistory } : item
        )
      );
      setMeetingModalVendor(null);
      setActionSuccess(`Meeting details saved for "${meetingModalVendor.companyName || meetingModalVendor.name}".`);
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      alert(err.message || "Failed to save meeting details");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Memoized advanced filtering and sorting
  const filteredVendors = React.useMemo(() => {
    let list = vendors.filter((v) => {
      if (ratingFilter !== "ALL") {
        const minRating = parseInt(ratingFilter, 10);
        if ((v.rating || 0) < minRating) return false;
      }
      if (contactFilter === "HAS_PHONE") {
        if (!v.phoneNumber || v.phoneNumber.trim() === "") return false;
      } else if (contactFilter === "HAS_WEBSITE") {
        if (!v.websiteUrl || v.websiteUrl.trim() === "") return false;
      } else if (contactFilter === "HAS_EMAIL") {
        if (!v.email || v.email.trim() === "") return false;
      }

      // Meeting status filter
      if (meetingFilter === "DONE") {
        const mStatus = v.visitHistoryJson?.meetingStatus;
        if (mStatus !== "DONE") return false;
      } else if (meetingFilter === "PENDING") {
        const mStatus = v.visitHistoryJson?.meetingStatus;
        if (mStatus !== "PENDING") return false;
      } else if (meetingFilter === "NONE") {
        const mStatus = v.visitHistoryJson?.meetingStatus;
        if (mStatus && mStatus !== "NONE") return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      switch (vendorSortBy) {
        case "RATING_DESC":
          return (b.rating || 0) - (a.rating || 0);
        case "RATING_ASC":
          return (a.rating || 0) - (b.rating || 0);
        case "NAME_ASC":
          return (a.name || "").localeCompare(b.name || "");
        case "COMPANY_ASC":
          return (a.companyName || a.name || "").localeCompare(b.companyName || b.name || "");
        case "NEWEST":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [vendors, ratingFilter, contactFilter, meetingFilter, vendorSortBy]);

  const { paginatedItems: paginatedVendors, paginationProps: vendorPaginationProps } = usePagination(
    filteredVendors,
    { initialPageSize: 12, itemName: "vendors" }
  );

  // Real-time dynamic updates: visible polling + tab focus revalidation + cross-tab live events
  useRealtimeSubscription(
    ["VENDOR_UPDATED"],
    () => {
      fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&auto=true&syncType=VENDOR_SHEET`)
        .then((r) => r.json())
        .then((d) => {
          if (d.vendorSheet) setSyncStatus(d.vendorSheet);
        })
        .catch(() => {});
      fetchVendors(true);
      fetchSyncStatus();
    },
    { intervalMs: 20000 }
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add vendor");

      setIsAddOpen(false);
      setActionSuccess(`Vendor "${form.companyName || form.name}" added to studio CRM.`);
      setForm({
        name: "",
        companyName: "",
        designation: "Sales Lead",
        industryType: "Marble & Granite",
        phoneNumber: "",
        email: "",
        websiteUrl: "",
        status: "ACTIVE",
        purposeOfVisit: "",
        notes: "",
        rating: 4,
      });
      fetchVendors();
      broadcastRealtimeEvent("VENDOR_UPDATED");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Studio Directory</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Vendors & Visitors</span>
          </div>
          <h1 className="type-page-title text-[#1F1F1F]">Vendor & Visitor CRM</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Architectural procurement • Visitor tracking • Confidential notes & quality ratings
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all w-full md:w-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vendor / Visitor</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {error}
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
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE 24/7 CONNECTED
              </span>
              <span className="text-xs font-bold text-[#1F1F1F]">Google Sheets Vendor Directory</span>
              <a
                href="https://docs.google.com/spreadsheets/d/1lOYNw1fk9xjSL61SZuox2gB1VRwW3ldQR460h5Ds9J8/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="text-[#5A81FA] hover:text-[#4870EB] inline-flex items-center gap-0.5 text-[11px] font-medium"
              >
                <span>Open Live Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#696E82] mt-0.5 flex flex-wrap items-center gap-2">
              <span>Auto-syncs Vendor Form & CRM Entries</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tombstone Protection Active (Deleted vendors will never resurrect)
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
            onClick={() => setIsAppsScriptModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <Code className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Two-Way Script</span>
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncLoading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
            <span>{syncLoading ? "Syncing..." : "Sync Live Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696E82]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchVendors()}
              placeholder="Search vendor, materials, notes..."
              className="w-full pl-9 pr-8 py-2 sm:py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] text-[#1F1F1F]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="sm:hidden relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-semibold text-[#1F1F1F] active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Open filter sidebar"
          >
            <Filter className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Filters</span>
            {mobileActiveFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#5A81FA] text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                {mobileActiveFilterCount}
              </span>
            )}
          </button>

          {/* Desktop Filter Dropdowns */}
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              aria-label="Filter by industry category"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Marble & Granite">Marble & Granite</option>
              <option value="Carpentry & Veneers">Carpentry & Veneers</option>
              <option value="Glass & Aluminium">Glass & Aluminium</option>
              <option value="Architectural Lighting">Lighting</option>
              <option value="HVAC & Automation">HVAC & Automation</option>
              <option value="Sanitaryware & Tiles">Sanitaryware</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by relationship status"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PARTNERED">Partnered</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              aria-label="Filter by rating"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 Stars (★★★★★)</option>
              <option value="4">4+ Stars (★★★★☆)</option>
              <option value="3">3+ Stars (★★★☆☆)</option>
            </select>

            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              aria-label="Filter by contact channel"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              <option value="HAS_PHONE">Has Phone</option>
              <option value="HAS_WEBSITE">Has Website</option>
              <option value="HAS_EMAIL">Has Email</option>
            </select>

            <select
              value={meetingFilter}
              onChange={(e) => setMeetingFilter(e.target.value)}
              aria-label="Filter by meeting status"
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] font-medium focus:outline-none focus:border-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Meetings</option>
              <option value="DONE">✓ Meeting Done</option>
              <option value="PENDING">⏳ Meeting Pending</option>
              <option value="NONE">○ No Meeting Yet</option>
            </select>

            <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82]">
              <ArrowUpDown className="w-3 h-3 text-[#5A81FA]" />
              <select
                value={vendorSortBy}
                onChange={(e) => setVendorSortBy(e.target.value)}
                aria-label="Sort vendors by"
                className="bg-transparent border-none text-[#1F1F1F] font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="NEWEST">Date Added (Newest)</option>
                <option value="RATING_DESC">Rating (High → Low)</option>
                <option value="RATING_ASC">Rating (Low → High)</option>
                <option value="COMPANY_ASC">Company Name (A → Z)</option>
                <option value="NAME_ASC">Contact Person (A → Z)</option>
              </select>
            </div>

            {(industryFilter || statusFilter || ratingFilter !== "ALL" || contactFilter !== "ALL" || meetingFilter !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setIndustryFilter("");
                  setStatusFilter("");
                  setRatingFilter("ALL");
                  setContactFilter("ALL");
                  setMeetingFilter("ALL");
                  setVendorSortBy("NEWEST");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {(industryFilter || statusFilter || ratingFilter !== "ALL" || contactFilter !== "ALL" || meetingFilter !== "ALL" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E2E6F0] text-xs">
            <span className="text-[#696E82] text-[11px] font-medium mr-1">Active Filters:</span>
            {industryFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F4FF] text-[#2C308D] border border-[#CEDEFF] text-[11px] font-semibold">
                Category: {industryFilter}
                <button type="button" onClick={() => setIndustryFilter("")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter("")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {meetingFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold">
                Meeting: {meetingFilter === "DONE" ? "Done" : meetingFilter === "PENDING" ? "Pending" : "Not Scheduled"}
                <button type="button" onClick={() => setMeetingFilter("ALL")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {ratingFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                Rating: {ratingFilter}★ & above
                <button type="button" onClick={() => setRatingFilter("ALL")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {contactFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
                Channel: {contactFilter.replace("HAS_", "")}
                <button type="button" onClick={() => setContactFilter("ALL")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold">
                Search: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery("")} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="ml-auto text-[#696E82] text-[11px] font-medium">
              Showing <strong className="text-[#1F1F1F]">{filteredVendors.length}</strong> of {vendors.length} vendors
            </span>
          </div>
        )}

        {/* Mobile Horizontal Quick Status Carousel (1-tap access) */}
        <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none pb-0.5 pt-0.5">
          {[
            { id: "", label: "All" },
            { id: "ACTIVE", label: "Active" },
            { id: "PARTNERED", label: "Partnered" },
            { id: "FOLLOW_UP", label: "Follow Up" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
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

      {/* Mobile Filter Drawer / Bottom Sheet */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Vendor Filters"
        activeCount={mobileActiveFilterCount}
        onReset={() => {
          setIndustryFilter("");
          setStatusFilter("");
          setRatingFilter("ALL");
          setContactFilter("ALL");
          setVendorSortBy("NEWEST");
        }}
        resultsCount={filteredVendors.length}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Material & Trade Category</label>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Categories</option>
              <option value="Marble & Granite">Marble & Granite</option>
              <option value="Carpentry & Veneers">Carpentry & Veneers</option>
              <option value="Glass & Aluminium">Glass & Aluminium</option>
              <option value="Architectural Lighting">Architectural Lighting</option>
              <option value="HVAC & Automation">HVAC & Automation</option>
              <option value="Sanitaryware & Tiles">Sanitaryware & Tiles</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Engagement Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PARTNERED">Partnered</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Minimum Quality Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 Stars (★★★★★)</option>
              <option value="4">4+ Stars (★★★★☆)</option>
              <option value="3">3+ Stars (★★★☆☆)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Contact Channel Available</label>
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="ALL">All Contacts</option>
              <option value="HAS_PHONE">Has Phone Number</option>
              <option value="HAS_WEBSITE">Has Website / Catalog</option>
              <option value="HAS_EMAIL">Has Email Address</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Sort Results By</label>
            <select
              value={vendorSortBy}
              onChange={(e) => setVendorSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="NEWEST">Date Added (Newest First)</option>
              <option value="RATING_DESC">Rating (High → Low)</option>
              <option value="RATING_ASC">Rating (Low → High)</option>
              <option value="COMPANY_ASC">Company Name (A → Z)</option>
              <option value="NAME_ASC">Contact Person (A → Z)</option>
            </select>
          </div>
        </div>
      </MobileFilterDrawer>

      {/* Vendors Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          Loading studio vendor records...
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          No vendor records match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedVendors.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 text-xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="type-card-title text-[#1F1F1F]">{v.companyName || v.name}</h3>
                    <div className="text-[11px] text-[#696E82] flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-[#1F1F1F]">{v.name}</span>
                      {v.designation && <span>({v.designation})</span>}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      v.status === "PARTNERED"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : v.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : v.status === "FOLLOW_UP"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#F2F4FF] text-[#2C308D]">
                    {v.industryType || "General"}
                  </span>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: v.rating || 3 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Live Spreadsheet Form Fill Date */}
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>Form Filled:</span>
                    <span className="font-bold">
                      {formatFormDate(v.visitHistoryJson?.formFilledAt, v.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Contact Snippets with Direct Actions */}
                <div className="space-y-1.5 text-[11px] text-[#696E82] pt-1">
                  {v.phoneNumber && (
                    <div className="flex items-center justify-between gap-1 bg-[#F8F9FD] px-2 py-1.5 rounded-xl border border-[#E2E6F0]/80">
                      <div className="flex items-center gap-1.5 font-mono text-[#1F1F1F]">
                        <Phone className="w-3 h-3 text-[#5A81FA] shrink-0" />
                        <span className="truncate">{v.phoneNumber}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${v.phoneNumber}`}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white border border-[#E2E6F0] rounded-md text-[#5A81FA] hover:bg-[#F2F4FF] transition-colors"
                          title="Call vendor"
                        >
                          Call
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(v.phoneNumber, `phone-${v.id}`)}
                          className="p-1 text-[#696E82] hover:text-[#1F1F1F] rounded cursor-pointer"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {copiedField === `phone-${v.id}` && (
                          <span className="text-[9px] text-emerald-600 font-bold">Copied!</span>
                        )}
                      </div>
                    </div>
                  )}
                  {v.email && (
                    <div className="flex items-center justify-between gap-1 bg-[#F8F9FD] px-2 py-1.5 rounded-xl border border-[#E2E6F0]/80">
                      <div className="flex items-center gap-1.5 font-mono text-[#1F1F1F] truncate">
                        <Mail className="w-3 h-3 text-[#5A81FA] shrink-0" />
                        <span className="truncate">{v.email}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`mailto:${v.email}`}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white border border-[#E2E6F0] rounded-md text-[#5A81FA] hover:bg-[#F2F4FF] transition-colors"
                          title="Send email"
                        >
                          Email
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(v.email, `email-${v.id}`)}
                          className="p-1 text-[#696E82] hover:text-[#1F1F1F] rounded cursor-pointer"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {copiedField === `email-${v.id}` && (
                          <span className="text-[9px] text-emerald-600 font-bold">Copied!</span>
                        )}
                      </div>
                    </div>
                  )}
                  {v.websiteUrl && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Globe className="w-3 h-3 text-[#5A81FA] shrink-0" />
                      <a
                        href={v.websiteUrl.startsWith("http") ? v.websiteUrl : `https://${v.websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5A81FA] hover:underline truncate"
                      >
                        {v.websiteUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* Meeting Operations & Categorization Panel */}
                <div className="p-3 bg-gradient-to-b from-[#F8F9FD] to-white rounded-2xl border border-[#E2E6F0] space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-[#696E82] uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#5A81FA]" />
                      <span>Meeting Status</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        v.visitHistoryJson?.meetingStatus === "DONE"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : v.visitHistoryJson?.meetingStatus === "PENDING"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {v.visitHistoryJson?.meetingStatus === "DONE"
                        ? "✓ Done"
                        : v.visitHistoryJson?.meetingStatus === "PENDING"
                        ? "⏳ Pending"
                        : "○ Not Scheduled"}
                    </span>
                  </div>

                  {/* 1-Click Operations: Done & Pending */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickMeetingStatus(v, "DONE")}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        v.visitHistoryJson?.meetingStatus === "DONE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                          : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                      }`}
                      title="Mark meeting as Completed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickMeetingStatus(v, "PENDING")}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        v.visitHistoryJson?.meetingStatus === "PENDING"
                          ? "bg-amber-500 text-white border-amber-500 shadow-2xs font-bold"
                          : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                      }`}
                      title="Mark meeting as Pending"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openMeetingModal(v)}
                      className="p-1.5 bg-white border border-[#E2E6F0] hover:border-[#5A81FA] text-[#696E82] hover:text-[#5A81FA] rounded-xl text-xs transition-colors cursor-pointer"
                      title="Log meeting notes & collateral"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Meeting Notes / Collateral Snippet */}
                  {(v.visitHistoryJson?.meetingNotes ||
                    v.visitHistoryJson?.hasSample ||
                    v.visitHistoryJson?.hasCatalog ||
                    v.visitHistoryJson?.meetingDate) && (
                    <div className="text-[11px] text-[#696E82] pt-2 border-t border-[#E2E6F0] space-y-1">
                      {v.visitHistoryJson?.meetingDate && (
                        <div className="text-[10px] text-[#5A81FA] font-medium flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>Date: {v.visitHistoryJson.meetingDate}</span>
                        </div>
                      )}
                      {v.visitHistoryJson?.meetingNotes && (
                        <p className="line-clamp-2 text-[#1F1F1F] italic text-[11px]">
                          &ldquo;{v.visitHistoryJson.meetingNotes}&rdquo;
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {v.visitHistoryJson?.hasSample && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                            Sample Given
                          </span>
                        )}
                        {v.visitHistoryJson?.hasCatalog && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                            Catalog Received
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Private Leadership Notes */}
                {(v.notes || v.purposeOfVisit) && (
                  <div className="p-2.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-[11px] space-y-1">
                    <div className="text-[10px] font-bold text-[#696E82] uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-[#5A81FA]" />
                      <span>Confidential Notes</span>
                    </div>
                    {v.purposeOfVisit && <div>Visit: {v.purposeOfVisit}</div>}
                    {v.notes && <div className="text-[#1F1F1F] italic">&ldquo;{v.notes}&rdquo;</div>}
                  </div>
                )}

                {/* Card Action Buttons (Edit & Delete) */}
                <div className="pt-2 border-t border-[#E2E6F0] flex items-center justify-between">
                  <span className="text-[10px] text-[#696E82] font-mono">
                    {v.sourceSystem === "GOOGLE_SHEETS" ? "Synced Google Sheet" : "Manual CRM Entry"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 text-[#696E82] hover:text-[#5A81FA] hover:bg-[#F8F9FE] rounded-lg transition-colors cursor-pointer"
                      title="Edit vendor details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(v.id, v.companyName || v.name)}
                      disabled={actionLoading}
                      className="p-1.5 text-[#696E82] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete vendor (Protected by Tombstone Shield: will never resurrect on sync)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredVendors.length > 0 && (
        <div className="pt-2">
          <AdvancedPagination
            {...vendorPaginationProps}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="type-card-title text-[#1F1F1F]">Add Vendor / Visitor Record</h3>
                <p className="text-xs text-[#696E82]">Studio architectural CRM onboarding</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-[#696E82] hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Company / Agency *</label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Classic Marble Co."
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Industry / Category</label>
                  <select
                    value={form.industryType}
                    onChange={(e) => setForm({ ...form, industryType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  >
                    <option value="Marble & Granite">Marble & Granite</option>
                    <option value="Carpentry & Joinery">Carpentry & Joinery</option>
                    <option value="Glass & Aluminium">Glass & Aluminium</option>
                    <option value="Architectural Lighting">Architectural Lighting</option>
                    <option value="HVAC & Automation">HVAC & Automation</option>
                    <option value="Sanitaryware & Tiles">Sanitaryware & Tiles</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Relationship Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PARTNERED">Partnered</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Business Phone</label>
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    placeholder="+91 98200 XXXXX"
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Business Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@company.in"
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Private Leadership Notes (Confidential)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Pricing tiers, lead times, quality assessment..."
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50"
              >
                {actionLoading ? "Adding..." : "Add to Directory"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Edit Vendor Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="type-card-title text-[#1F1F1F]">Edit Vendor Record</h3>
                <p className="text-xs text-[#696E82]">Update contact details, category, or notes</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-[#696E82] hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Company / Brand *</label>
                  <input
                    type="text"
                    required
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Category / Trade</label>
                  <input
                    type="text"
                    value={editForm.industryType}
                    onChange={(e) => setEditForm({ ...editForm, industryType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  >
                    <option value="ACTIVE">Active Vendor</option>
                    <option value="PARTNERED">Preferred Partner</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Business Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Private Leadership Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
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
                  <p className="text-xs text-[#696E82]">Real-time cell write-back when you Add, Update, or Delete vendors</p>
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
                When you delete a vendor in this project, they are permanently tombstoned in the database.
                Even when re-syncing the live CSV 24/7, deleted vendors will <strong>NEVER</strong> resurrect!
              </p>
            </div>

            {/* 3 Step Setup */}
            <div className="space-y-3 text-xs text-[#1F1F1F]">
              <h4 className="font-bold text-xs text-[#1F1F1F] uppercase tracking-wider">
                How to enable instant cell write-back in your Google Sheet (3 Minutes):
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-[#4A4E69]">
                <li>
                  Open your Google Sheet:{" "}
                  <a
                    href="https://docs.google.com/spreadsheets/d/1lOYNw1fk9xjSL61SZuox2gB1VRwW3ldQR460h5Ds9J8/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#5A81FA] underline font-medium"
                  >
                    Vendor Directory Spreadsheet ↗
                  </a>
                </li>
                <li>In Google Sheets top menu, click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Delete any code in the editor, and paste the script below.</li>
                <li>Click <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>, set <em>Execute as</em>: <strong>Me</strong>, and <em>Who has access</em>: <strong>Anyone</strong>.</li>
                <li>Copy the Web App URL generated by Google and save it in your project's <code>.env</code> as <code>GOOGLE_SHEETS_VENDOR_WEBHOOK_URL</code>!</li>
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
    var targetEmail = (contents.email || "").toLowerCase().trim();
    var targetCompany = (contents.companyName || "").toLowerCase().trim();
    var targetName = (contents.name || "").toLowerCase().trim();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (action === "CREATE") {
      sheet.appendRow([
        new Date().toLocaleString(),
        contents.email || "",
        contents.name || "",
        contents.companyName || "",
        "Studio CRM Entry",
        contents.phoneNumber || "",
        "Partner / Representative",
        contents.industryType || "General"
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, row: sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
    }

    var matchedRow = -1;
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var rowEmail = (row[1] || "").toString().toLowerCase().trim();
      var rowCompany = (row[3] || "").toString().toLowerCase().trim();
      var rowName = (row[2] || "").toString().toLowerCase().trim();

      if ((targetEmail && rowEmail === targetEmail) || (targetCompany && rowCompany === targetCompany) || (targetName && rowName === targetName)) {
        matchedRow = r + 1;
        break;
      }
    }

    if (matchedRow > 0) {
      if (action === "DELETE") {
        sheet.getRange(matchedRow, 1, 1, sheet.getLastColumn()).setFontLine("line-through");
        sheet.getRange(matchedRow, 3).setValue("[DELETED IN STUDIO] " + data[matchedRow - 1][2]);
      } else if (action === "UPDATE") {
        if (contents.name) sheet.getRange(matchedRow, 3).setValue(contents.name);
        if (contents.companyName) sheet.getRange(matchedRow, 4).setValue(contents.companyName);
        if (contents.phoneNumber) sheet.getRange(matchedRow, 6).setValue(contents.phoneNumber);
        if (contents.industryType) sheet.getRange(matchedRow, 8).setValue(contents.industryType);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, row: matchedRow })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Vendor row not found" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  if (action === "CREATE") {
    sheet.appendRow([new Date().toLocaleString(), contents.email || "", contents.name || "", contents.companyName || "", "Studio CRM", contents.phoneNumber || "", "Representative", contents.industryType || ""]);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }
  for (var r = 1; r < data.length; r++) {
    if (data[r][1] === contents.email || data[r][3] === contents.companyName) {
      var row = r + 1;
      if (action === "DELETE") {
        sheet.getRange(row, 1, 1, sheet.getLastColumn()).setFontLine("line-through");
      } else if (action === "UPDATE") {
        if (contents.name) sheet.getRange(row, 3).setValue(contents.name);
        if (contents.phoneNumber) sheet.getRange(row, 6).setValue(contents.phoneNumber);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
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

      {/* Meeting Details / Outcome Log Modal */}
      {meetingModalVendor && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="type-card-title text-[#1F1F1F]">Log Vendor Meeting & Outcomes</h3>
                <p className="text-xs text-[#696E82]">
                  {meetingModalVendor.companyName || meetingModalVendor.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMeetingModalVendor(null)}
                className="p-1 rounded-lg text-[#696E82] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingDetails} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Meeting Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMeetingForm({ ...meetingForm, status: "DONE" })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      meetingForm.status === "DONE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                        : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Meeting Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingForm({ ...meetingForm, status: "PENDING" })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      meetingForm.status === "PENDING"
                        ? "bg-amber-500 text-white border-amber-500 shadow-2xs font-bold"
                        : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Meeting Pending</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Discussion Points & Meeting Notes</label>
                <textarea
                  rows={3}
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  placeholder="Discussed pricing, finish samples, catalogs, warranty, project specifications..."
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder-[#696E82]"
                />
              </div>

              <div className="pt-2 border-t border-[#E2E6F0] space-y-2">
                <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
                  Studio Collateral Received
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={meetingForm.hasSample}
                      onChange={(e) => setMeetingForm({ ...meetingForm, hasSample: e.target.checked })}
                      className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                    />
                    <span className="font-medium text-[#1F1F1F]">Physical Samples</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={meetingForm.hasCatalog}
                      onChange={(e) => setMeetingForm({ ...meetingForm, hasCatalog: e.target.checked })}
                      className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
                    />
                    <span className="font-medium text-[#1F1F1F]">Catalog / Brochure</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setMeetingModalVendor(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Meeting Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Vendors & Visitors"
        activeCount={mobileActiveFilterCount}
        onReset={() => {
          setIndustryFilter("");
          setStatusFilter("");
          setRatingFilter("ALL");
          setContactFilter("ALL");
          setMeetingFilter("ALL");
          setVendorSortBy("NEWEST");
        }}
        resultCount={vendors.length}
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Category / Industry
            </label>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              aria-label="Filter by industry category"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Marble & Granite">Marble & Granite</option>
              <option value="Carpentry & Veneers">Carpentry & Veneers</option>
              <option value="Glass & Aluminium">Glass & Aluminium</option>
              <option value="Architectural Lighting">Lighting</option>
              <option value="HVAC & Automation">HVAC & Automation</option>
              <option value="Sanitaryware & Tiles">Sanitaryware</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Meeting Status
            </label>
            <select
              value={meetingFilter}
              onChange={(e) => setMeetingFilter(e.target.value)}
              aria-label="Filter by meeting status"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] cursor-pointer"
            >
              <option value="ALL">All Meeting Statuses</option>
              <option value="DONE">✓ Meeting Done</option>
              <option value="PENDING">⏳ Meeting Pending</option>
              <option value="NONE">○ No Meeting Yet</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Relationship Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by relationship status"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PARTNERED">Partnered</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </MobileFilterDrawer>
    </div>
  );
}
