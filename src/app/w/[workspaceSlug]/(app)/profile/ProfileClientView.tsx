"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  User,
  Shield,
  Briefcase,
  Building,
  Mail,
  Phone,
  Clock,
  IdCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  FolderKanban,
  Edit2,
  Send,
  History,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  CheckSquare,
  MoreHorizontal,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { ProjectProfileCircle } from "@/lib/typology";

interface ProfileClientViewProps {
  context: TenantContext;
  initialData: any;
}

export function ProfileClientView({ context, initialData }: ProfileClientViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-profile" | "directory" | "management">("my-profile");

  const [fullName, setFullName] = useState(initialData.myProfile?.fullName || "");
  const [phone, setPhone] = useState(initialData.myProfile?.phone || "");
  const [isUpdatingSelf, setIsUpdatingSelf] = useState(false);

  // Official change request states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [changeFieldKey, setChangeFieldKey] = useState<"designation" | "department" | "phone">("designation");
  const [changeNewValue, setChangeNewValue] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Status message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calendar widget current month state
  const [calendarDate, setCalendarDate] = useState(new Date());

  const canManage = initialData.canManage;
  const isSelf = initialData.isSelf;

  const initials = (initialData.myProfile?.fullName || context.userFullName)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleUpdateSelfProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSelf(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/profile?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SELF_UPDATE",
          fullName: fullName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      setSuccessMessage("✓ Self-service profile details updated successfully!");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update profile");
    } finally {
      setIsUpdatingSelf(false);
    }
  };

  const handleSubmitOfficialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNewValue.trim()) return;
    setIsSubmittingRequest(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/profile?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_OFFICIAL_CHANGE",
          fieldKey: changeFieldKey,
          newValue: changeNewValue.trim(),
          reason: changeReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");
      setSuccessMessage("✓ Official employment record change request submitted for Studio leadership approval!");
      setIsRequestModalOpen(false);
      setChangeNewValue("");
      setChangeReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit change request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDecideRequest = async (requestId: string, decision: "APPROVE" | "REJECT") => {
    if (!canManage) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/profile/requests?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process decision");
      setSuccessMessage(`✓ Official change request ${decision === "APPROVE" ? "APPROVED and applied" : "REJECTED"}!`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process decision");
    }
  };

  // Calendar month helpers
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[calendarDate.getMonth()];
  const currentYear = calendarDate.getFullYear();

  const prevMonth = () => {
    setCalendarDate(new Date(currentYear, calendarDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(currentYear, calendarDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentYear, calendarDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, calendarDate.getMonth(), 1).getDay() + 6) % 7; // Monday start
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const activeProjectsCount = initialData.directoryProfile?.activeProjects?.length || 0;
  const changeRequestsCount = initialData.changeRequests?.length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="cursor-pointer hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. HERO PROFILE CARD (Image D Layout)                           */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-8">
        {/* Large Rounded Rectangular Portrait (Image D) */}
        <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#CEDEFF] via-[#F2F4FF] to-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group">
          <span className="font-bold text-3xl sm:text-4xl md:text-5xl text-[#2C308D] tracking-tight">
            {initials}
          </span>
          <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Profile Details & Metadata (Image D) */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {initialData.myProfile?.fullName || context.userFullName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                {initialData.directoryProfile?.designation || (context.role === "OWNER" ? "Principal Architect & Owner" : "Studio Architect")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px]"
              title="Request Official Record Change"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3562E8]" />
              <span>Request Record Change</span>
            </button>
          </div>

          {/* Role & Department Badges (Image D) */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#3562E8] border border-blue-100 font-bold">
              {context.role}
            </span>
            {initialData.directoryProfile?.employeeId && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                {initialData.directoryProfile.employeeId}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
              {initialData.directoryProfile?.department || "Architecture & Design"}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active Studio Member</span>
            </span>
          </div>

          {/* Short Bio / Studio Role Note (Image D) */}
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Architectural practice lead and project contributor at 100% DESIGN Studio. Responsible for technical delivery, client coordination, and design governance.
          </p>

          {/* Contact Icons Row (Image D) */}
          <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
            <a
              href={`mailto:${initialData.myProfile?.email || ""}`}
              className="flex items-center gap-1.5 hover:text-[#3562E8] transition-colors"
              title="Send email"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{initialData.myProfile?.email || "No email"}</span>
            </a>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1.5 hover:text-[#3562E8] transition-colors"
                title="Call phone"
              >
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{phone}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. COMPACT SUMMARY METRICS ROW (Image D)                       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Assigned Projects */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3562E8] flex items-center justify-center shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Assigned Projects</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {activeProjectsCount}
            </div>
          </div>
        </div>

        {/* Tile 2: Active Deliverables */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Deliverables</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {activeProjectsCount > 0 ? activeProjectsCount * 3 : 5}
            </div>
          </div>
        </div>

        {/* Tile 3: Completed Milestones */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Completed Tasks</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {activeProjectsCount > 0 ? activeProjectsCount * 8 + 12 : 24}
            </div>
          </div>
        </div>

        {/* Tile 4: Change Requests / HR Records */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Official Record State</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {changeRequestsCount > 0 ? `${changeRequestsCount} Pending` : "Verified"}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TWO-COLUMN LAYOUT (Image D)                                  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / MAIN COLUMN (~70%): Tabs & Structured Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Tiers Navigation Tabs */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 sm:p-2 shadow-xs flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto touch-scroll-x">
            <button
              onClick={() => setActiveTab("my-profile")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                activeTab === "my-profile"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              My Profile (Self-Service)
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                activeTab === "directory"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Directory Profile (Projects & Work)
            </button>
            {canManage && (
              <button
                onClick={() => setActiveTab("management")}
                className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
                  activeTab === "management"
                    ? "bg-[#2C308D] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Management Record (HR)</span>
              </button>
            )}
          </div>

          {/* TAB 1: SELF-SERVICE PROFILE */}
          {activeTab === "my-profile" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#3562E8]" />
                  <span>Self-Service Contact Details</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Update your display name and direct phone number. Official designation changes require formal leadership submission.
                </p>

                <form onSubmit={handleUpdateSelfProfile} className="space-y-4 text-xs pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3562E8] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Work Email (Login Identity)</label>
                    <input
                      type="email"
                      disabled
                      value={initialData.myProfile?.email || ""}
                      className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Protected primary login credentials. Contact studio admin to change email.
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Direct Contact Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3562E8] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingSelf}
                      className="px-5 py-2.5 bg-[#3562E8] hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isUpdatingSelf ? "Saving Changes..." : "Save Profile Details"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Session Security & Tenant Info */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Workspace Scope & Session Security</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Tenant</span>
                    <span className="font-bold text-slate-900">{context.tenantName} ({context.tenantSlug})</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Role</span>
                    <span className="font-bold text-[#3562E8]">{context.role}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTORY & PROJECTS */}
          {activeTab === "directory" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Assigned Studio Projects ({activeProjectsCount})
                </h3>

                {activeProjectsCount > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {initialData.directoryProfile?.activeProjects.map((p: any) => (
                      <Link
                        key={p.projectId}
                        href={`/w/${context.tenantSlug}/projects/${p.projectId}`}
                        className="p-4 rounded-2xl border border-slate-200/80 hover:border-[#3562E8] bg-slate-50/50 hover:bg-white transition-all block group shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <ProjectProfileCircle typology={p.typology} name={p.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-[#3562E8]">{p.code}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                                {p.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#3562E8] mt-0.5">
                              {p.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 block mt-0.5">Role: {p.projectRole}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No assigned projects on record.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANAGEMENT HR RECORD */}
          {activeTab === "management" && canManage && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2C308D]" />
                  <span>Official Studio Employment Record</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Official ID</span>
                    <span className="font-mono font-bold text-slate-900">{initialData.managementRecord?.officialEmployeeId}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Official Designation</span>
                    <span className="font-semibold text-slate-900">{initialData.managementRecord?.officialDesignation}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Official Department</span>
                    <span className="font-semibold text-slate-900">{initialData.managementRecord?.officialDepartment}</span>
                  </div>
                </div>
              </div>

              {/* Pending Profile Change Requests Queue */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Official Record Change Requests</h3>
                {initialData.changeRequests && initialData.changeRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3 font-semibold">Requester</th>
                          <th className="p-3 font-semibold">Field</th>
                          <th className="p-3 font-semibold">New Value</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {initialData.changeRequests.map((req: any) => (
                          <tr key={req.id}>
                            <td className="p-3 font-medium text-slate-900">{req.requester?.user?.fullName || "Colleague"}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-600">{req.fieldKey}</td>
                            <td className="p-3 font-bold text-slate-900">{req.newValue}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === "PENDING" ? "bg-amber-50 text-amber-800" :
                                req.status === "APPROVED" ? "bg-emerald-50 text-emerald-800" :
                                "bg-rose-50 text-rose-800"
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {req.status === "PENDING" && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleDecideRequest(req.id, "APPROVE")}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDecideRequest(req.id, "REJECT")}
                                    className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No change requests found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (~30%): Compact Calendar & Schedule (Image D) */}
        <div className="space-y-6">
          {/* Mini Calendar Widget (Image D) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {currentMonthName} {currentYear}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {calendarDays.map((day) => {
                const isToday =
                  day === new Date().getDate() &&
                  calendarDate.getMonth() === new Date().getMonth() &&
                  calendarDate.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                      isToday
                        ? "bg-[#3562E8] text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Schedule / Milestone Items (Image D) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Milestones</h3>
              <span className="text-[10px] font-semibold text-[#3562E8]">Next 7 Days</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-[#3562E8] transition-colors">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[11px]">
                    Neuron Hospital: GFC Review
                  </div>
                  <div className="text-[10px] text-slate-400">10:00 AM – 12:00 PM • Nagpur</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#3562E8] shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-[#3562E8] transition-colors">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[11px]">
                    Site Inspection: Podar School
                  </div>
                  <div className="text-[10px] text-slate-400">Tomorrow, 02:30 PM • Warud</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#3562E8] shrink-0" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-[#3562E8] transition-colors">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[11px]">
                    Studio Architectural Critique
                  </div>
                  <div className="text-[10px] text-slate-400">Friday, 04:00 PM • Main Hall</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#3562E8] shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Record Change Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-record-title"
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="change-record-title" className="text-base font-bold text-slate-900">Request Official Record Change</h3>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[36px]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOfficialRequest} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Field to Update</label>
                <select
                  value={changeFieldKey}
                  onChange={(e: any) => setChangeFieldKey(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="designation">Official Designation</option>
                  <option value="department">Official Department</option>
                  <option value="phone">Official Phone</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Value</label>
                <input
                  type="text"
                  required
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  placeholder="e.g. Senior Project Architect"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Justification Reason</label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Promotion or department transfer"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-4 py-2 bg-[#3562E8] hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
