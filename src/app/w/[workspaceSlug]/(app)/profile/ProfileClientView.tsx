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
  X,
  Calendar,
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#696E82]">
        <Link href={`/w/${context.tenantSlug}/dashboard/employee`} className="hover:text-[#1F1F1F]">
          Workspace
        </Link>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">User Profile & Identity</span>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
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
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="cursor-pointer hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Profile Identity Banner */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5A81FA] to-[#2C308D] text-white font-bold text-xl flex items-center justify-center shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#1F1F1F]">{initialData.myProfile?.fullName}</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#2C308D] border border-[#CEDEFF]">
                  {initialData.myProfile?.role}
                </span>
                {initialData.directoryProfile?.employeeId && (
                  <span className="font-mono text-xs font-bold text-[#696E82] bg-[#F8F9FD] px-2 py-0.5 rounded border border-[#E2E6F0]">
                    {initialData.directoryProfile.employeeId}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#696E82] mt-0.5">
                {initialData.directoryProfile?.designation || "Studio Staff"} • {initialData.directoryProfile?.department || "Architecture"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#2C308D] text-xs font-bold border border-[#CEDEFF] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span>Request Record Change</span>
            </button>
          </div>
        </div>

        {/* Profile Tiers Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-[#E2E6F0] pt-3 text-xs">
          <button
            onClick={() => setActiveTab("my-profile")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === "my-profile"
                ? "bg-[#5A81FA] text-white shadow-2xs"
                : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
            }`}
          >
            My Profile (Self-Service)
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === "directory"
                ? "bg-[#5A81FA] text-white shadow-2xs"
                : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
            }`}
          >
            Directory Profile (Colleague-Facing)
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("management")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === "management"
                  ? "bg-[#2C308D] text-white shadow-2xs"
                  : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
              }`}
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Management Record (HR/Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TIER 1: MY PROFILE (SELF-SERVICE)                              */}
      {/* ============================================================== */}
      {activeTab === "my-profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editable Personal Details */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#5A81FA]" />
              <span>Self-Service Profile Details</span>
            </h3>
            <p className="text-xs text-[#696E82]">
              You can update your display name and direct work phone number here without management approval.
            </p>

            <form onSubmit={handleUpdateSelfProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Work Email (Login ID)</label>
                <input
                  type="email"
                  disabled
                  value={initialData.myProfile?.email}
                  className="w-full p-2.5 bg-gray-100 border border-[#E2E6F0] rounded-xl text-xs text-[#696E82] cursor-not-allowed"
                />
                <span className="text-[10px] text-[#696E82] mt-0.5 block">
                  Global login identity is secure and cannot be changed arbitrarily.
                </span>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Direct Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingSelf}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isUpdatingSelf ? "Saving..." : "Save Self-Service Changes"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Account Security & Workspace Scope */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Workspace Scope & Session Security</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Current Practice Workspace</span>
                <span className="font-semibold text-[#1F1F1F]">{context.tenantName} ({context.tenantSlug})</span>
              </div>

              <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Tenant Role</span>
                <span className="font-semibold text-[#2C308D]">{context.role}</span>
              </div>

              <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Session Encryption</span>
                <span className="text-emerald-700 font-medium">Active JWT with HttpOnly cookie isolation</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Data Protection Policy</span>
                </span>
                <p className="text-[11px]">
                  User credentials, tokens, and personal recovery secrets are strictly shielded and never exposed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TIER 2: DIRECTORY PROFILE (COLLEAGUE-FACING)                   */}
      {/* ============================================================== */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Colleague Directory Card</h3>
                <p className="text-xs text-[#696E82]">Information visible to studio colleagues (private records excluded)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Designation</span>
                <span className="font-semibold text-[#1F1F1F]">{initialData.directoryProfile?.designation}</span>
              </div>
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Department</span>
                <span className="font-semibold text-[#1F1F1F]">{initialData.directoryProfile?.department}</span>
              </div>
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Work Contact</span>
                <span className="font-semibold text-[#1F1F1F]">{initialData.directoryProfile?.email}</span>
              </div>
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Assigned Architectural Projects ({initialData.directoryProfile?.activeProjects?.length || 0})</h3>
            {initialData.directoryProfile?.activeProjects && initialData.directoryProfile.activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialData.directoryProfile.activeProjects.map((p: any) => (
                  <Link
                    key={p.projectId}
                    href={`/w/${context.tenantSlug}/projects/${p.projectId}`}
                    className="p-4 rounded-xl border border-[#E2E6F0] hover:border-[#5A81FA] bg-[#F8F9FD] hover:bg-white transition-all block group"
                  >
                    <div className="flex items-center gap-3">
                      <ProjectProfileCircle typology={p.typology} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#5A81FA]">{p.code}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                            {p.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1F1F1F] truncate group-hover:text-[#5A81FA]">
                          {p.name}
                        </h4>
                        <span className="text-[11px] text-[#696E82] block mt-0.5">Role: {p.projectRole}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#696E82] italic">No active project assignments.</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TIER 3: MANAGEMENT RECORD (OWNER & ADMIN ONLY)                 */}
      {/* ============================================================== */}
      {activeTab === "management" && canManage && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#2C308D]" />
              <span>Official Studio Employment Record</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Official Employee ID</span>
                <span className="font-mono font-bold text-[#1F1F1F]">{initialData.managementRecord?.officialEmployeeId}</span>
              </div>
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Official Designation</span>
                <span className="font-semibold text-[#1F1F1F]">{initialData.managementRecord?.officialDesignation}</span>
              </div>
              <div className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0]">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Official Department</span>
                <span className="font-semibold text-[#1F1F1F]">{initialData.managementRecord?.officialDepartment}</span>
              </div>
            </div>
          </div>

          {/* Pending Profile Change Requests Queue */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Official Record Change Requests</h3>
            {initialData.changeRequests && initialData.changeRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                    <tr>
                      <th className="p-3">Requester</th>
                      <th className="p-3">Field</th>
                      <th className="p-3">Old Value → New Value</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6F0]">
                    {initialData.changeRequests.map((req: any) => (
                      <tr key={req.id} className="hover:bg-[#F8F9FD]">
                        <td className="p-3 font-semibold text-[#1F1F1F]">
                          {req.requester?.user?.fullName || "Staff Member"}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#5A81FA]">{req.fieldKey}</td>
                        <td className="p-3 text-[11px]">
                          <span className="line-through text-[#696E82]">{req.oldValue || "None"}</span> →{" "}
                          <strong className="text-[#1F1F1F]">{req.newValue}</strong>
                        </td>
                        <td className="p-3 text-[11px] text-[#696E82]">{req.reason || "—"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800"
                                : req.status === "REJECTED"
                                ? "bg-rose-50 text-rose-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {req.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDecideRequest(req.id, "APPROVE")}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDecideRequest(req.id, "REJECT")}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
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
              <p className="text-xs text-[#696E82] italic">No pending official change requests.</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUBMIT OFFICIAL RECORD CHANGE REQUEST                   */}
      {/* ============================================================== */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#5A81FA]" />
                <span>Request Official Record Change</span>
              </h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitOfficialRequest} className="space-y-3 text-xs">
              <p className="text-[#696E82]">
                Official employment fields (Designation, Department, etc.) require review and approval from Studio Owners or Admins.
              </p>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Field to Update</label>
                <select
                  value={changeFieldKey}
                  onChange={(e) => setChangeFieldKey(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                >
                  <option value="designation">Designation (e.g. Senior Architect)</option>
                  <option value="department">Department (e.g. Landscape / Interiors)</option>
                  <option value="phone">Official Work Phone</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">New Requested Value <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  placeholder="e.g. Senior Project Architect"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Justification Reason</label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Promotion confirmed by studio boss, department transfer, etc."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest || !changeNewValue.trim()}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
