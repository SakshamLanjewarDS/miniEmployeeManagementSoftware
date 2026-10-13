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
} from "lucide-react";

export default function VendorManagementPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchSyncStatus();

    // 24/7 background live sync polling (every 60 seconds)
    const interval = setInterval(() => {
      fetch(`/api/integrations/google-sheets/sync?workspaceSlug=${workspaceSlug}&auto=true&syncType=VENDOR_SHEET`)
        .then((r) => r.json())
        .then((d) => {
          if (d.vendorSheet) setSyncStatus(d.vendorSheet);
        })
        .catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [workspaceSlug, industryFilter, statusFilter]);

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
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Vendor & Visitor CRM</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Architectural procurement • Visitor tracking • Confidential notes & quality ratings
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all"
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
          <button onClick={() => setActionSuccess(null)}>✕</button>
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAppsScriptModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Two-Way Script</span>
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncLoading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
            <span>{syncLoading ? "Syncing..." : "Sync Live Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696E82]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVendors()}
            placeholder="Search by vendor, company, materials, or private notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] text-[#1F1F1F]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
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
            className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PARTNERED">Partnered</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          Loading studio vendor records...
        </div>
      ) : vendors.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          No vendor records match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 text-xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#1F1F1F] text-sm">{v.companyName || v.name}</h3>
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

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#F2F4FF] text-[#2C308D]">
                    {v.industryType || "General"}
                  </span>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: v.rating || 3 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Contact Snippets */}
                <div className="space-y-1 text-[11px] text-[#696E82] pt-1">
                  {v.phoneNumber && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3 h-3 text-[#5A81FA]" />
                      <span>{v.phoneNumber}</span>
                    </div>
                  )}
                  {v.email && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Mail className="w-3 h-3 text-[#5A81FA]" />
                      <span>{v.email}</span>
                    </div>
                  )}
                  {v.websiteUrl && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-[#5A81FA]" />
                      <a
                        href={v.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5A81FA] hover:underline truncate max-w-[200px]"
                      >
                        {v.websiteUrl}
                      </a>
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

      {/* Add Vendor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Add Vendor / Visitor Record</h3>
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
                <h3 className="text-base font-bold text-[#1F1F1F]">Edit Vendor Record</h3>
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
    </div>
  );
}
