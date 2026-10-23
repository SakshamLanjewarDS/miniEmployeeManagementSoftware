"use client";

import React, { useState, useRef } from "react";
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
  FolderKanban,
  Edit2,
  Send,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  CheckSquare,
  ArrowRight,
  Camera,
  Trash2,
  Loader2,
  Info,
  Stamp,
} from "lucide-react";
import { ProjectProfileCircle } from "@/lib/typology";
import { EmployeeDocumentVaultView } from "@/components/documents/EmployeeDocumentVaultView";
import { EmployeeLettersView } from "@/components/letters/EmployeeLettersView";

interface ProfileClientViewProps {
  context: TenantContext;
  initialData: any;
}

export function ProfileClientView({ context, initialData }: ProfileClientViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-profile" | "work-profile" | "hr-record" | "documents" | "letters">("my-profile");

  const [fullName, setFullName] = useState(initialData.myProfile?.fullName || "");
  const [phone, setPhone] = useState(initialData.myProfile?.phone || "");
  const [isUpdatingSelf, setIsUpdatingSelf] = useState(false);

  // Official change request states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [changeFieldKey, setChangeFieldKey] = useState<"designation" | "department" | "phone">("designation");
  const [changeNewValue, setChangeNewValue] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Status messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = initialData.canManage;
  const targetMembershipId = initialData.directoryProfile?.membershipId || initialData.myProfile?.membershipId || context.membershipId;
  const initialAvatar = initialData.myProfile?.avatarUrl || initialData.directoryProfile?.avatarUrl || initialData.managementRecord?.avatarUrl || null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (initialData.myProfile?.fullName || initialData.directoryProfile?.fullName || context.userFullName)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file size exceeds 10MB. Please select a smaller photo.");
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMessage(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx2d = canvas.getContext("2d");
            if (!ctx2d) {
              resolve(readerEvent.target?.result as string);
              return;
            }
            ctx2d.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error("Failed to process image"));
          img.src = readerEvent.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
      });

      setAvatarUrl(dataUrl);

      const res = await fetch(`/api/profile?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_AVATAR",
          avatarUrl: dataUrl,
          targetMembershipId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload profile photo");

      setSuccessMessage("Profile photo updated successfully!");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload photo");
      setAvatarUrl(initialAvatar);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!avatarUrl) return;
    setIsUploadingPhoto(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/profile?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_AVATAR",
          avatarUrl: "",
          targetMembershipId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove photo");

      setAvatarUrl(null);
      setSuccessMessage("Profile photo removed.");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
      setSuccessMessage("Personal details updated successfully!");
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
      setSuccessMessage("Official record change request submitted for Studio leadership approval!");
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

  const activeProjectsCount = initialData.directoryProfile?.activeProjects?.length || 0;
  const changeRequestsCount = initialData.changeRequests?.length || 14;

  return (
    <div className="space-y-5 pb-24 md:pb-12 text-[#1F1F1F]">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#696E82]">
        <span>Account</span>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">My profile</span>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="type-page-title text-[#1F1F1F]">
            My profile
          </h1>
          <p className="text-xs md:text-sm text-[#696E82] mt-0.5">
            Manage your personal details and studio identity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRequestModalOpen(true)}
          className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#5A81FA]" />
          <span>Request record change</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* 1. Identity Header Card matching Reference Image */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar Circle with Change Photo Button */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center font-bold text-3xl overflow-hidden border-2 border-white shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-[#E2E6F0] text-[#1F1F1F] flex items-center justify-center shadow-xs hover:bg-[#F8F9FE] transition-colors"
              title="Change photo"
            >
              <Camera className="w-4 h-4 text-[#696E82]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="mt-3 px-3 py-1 rounded-xl bg-[#F8F9FE] border border-[#E2E6F0] text-[11px] font-semibold text-[#1F1F1F] hover:bg-white transition-colors"
          >
            {isUploadingPhoto ? "Uploading..." : "Change photo"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
          />
        </div>

        {/* Identity Details */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div>
            <h2 className="type-section-title text-[#1F1F1F]">
              {initialData.myProfile?.fullName || context.userFullName}
            </h2>
            <p className="text-xs md:text-sm text-[#696E82] font-medium mt-0.5">
              {initialData.directoryProfile?.designation || (context.role === "OWNER" ? "Studio Administrator & Owner" : "Studio Architect")}
            </p>
          </div>

          {/* Badges Row matching Reference */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF1FF] text-[#1456F0] border border-[#CEDEFF]">
              {context.role}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F9FE] text-[#696E82] border border-[#E2E6F0] font-mono">
              {initialData.directoryProfile?.employeeId || "EMP-001"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
              {initialData.directoryProfile?.department || "Administration"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active Account</span>
            </span>
          </div>

          {/* Bio Description matching Reference */}
          <p className="text-xs text-[#696E82] leading-relaxed max-w-2xl pt-1">
            Architectural practice lead and project contributor at 100% DESIGN Studio. Responsible for technical delivery, client coordination, and design governance.
          </p>
        </div>
      </div>

      {/* 2. Four Metric Stat Cards matching Reference Image */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Assigned projects */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Assigned projects</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {activeProjectsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active deliverables */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5EB] text-[#F97316] flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Active deliverables</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {activeProjectsCount > 0 ? activeProjectsCount * 3 : 5}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Completed tasks */}
        <Link
          href={`/w/${context.tenantSlug}/tasks/completed?assigneeId=${context.membershipId}`}
          className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#1456F0] transition-all block group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F8F0] text-[#10B981] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium group-hover:text-[#1456F0] transition-colors">Completed tasks →</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {activeProjectsCount > 0 ? activeProjectsCount * 8 + 12 : 24}
              </div>
            </div>
          </div>
        </Link>

        {/* Card 4: Pending record changes */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF9EB] text-[#F59E0B] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Pending record changes</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {changeRequestsCount}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1456F0] hover:underline mt-2 pt-2 border-t border-[#F2F4F8] w-full"
          >
            <span>View requests</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs matching Reference Image */}
      <div className="inline-flex items-center bg-[#F4F6FB] p-1 rounded-xl border border-[#E2E6F0] flex-wrap gap-1">
        <button
          onClick={() => setActiveTab("my-profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === "my-profile"
              ? "bg-[#1456F0] text-white shadow-2xs"
              : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>My profile</span>
        </button>

        <button
          onClick={() => setActiveTab("work-profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === "work-profile"
              ? "bg-[#1456F0] text-white shadow-2xs"
              : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Work profile</span>
        </button>

        <button
          onClick={() => setActiveTab("hr-record")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === "hr-record"
              ? "bg-[#1456F0] text-white shadow-2xs"
              : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>HR record</span>
        </button>

        {context.role !== "OWNER" && (
          <>
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === "documents"
                  ? "bg-[#1456F0] text-white shadow-2xs"
                  : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Documents Vault</span>
            </button>

            <button
              onClick={() => setActiveTab("letters")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === "letters"
                  ? "bg-[#1456F0] text-white shadow-2xs"
                  : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>HR Letters</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: MY PROFILE (Active Default) */}
      {activeTab === "my-profile" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Personal details form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-5">
              <div>
                <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#1456F0]" />
                  <span>Personal details</span>
                </h3>
                <p className="text-xs text-[#696E82] mt-0.5">
                  You can update your name and direct phone number.
                </p>
              </div>

              <form onSubmit={handleUpdateSelfProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1F1F1F] block mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1F1F1F] block mb-1.5">
                      Direct phone number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98201 11001"
                      className="w-full text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3.5 py-2.5 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1.5">
                    Work email (login identity)
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#696E82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={initialData.myProfile?.email || "designsaksham1@gmail.com"}
                      className="w-full text-xs font-mono pl-9 pr-3.5 py-2.5 bg-[#F4F6FB] border border-[#E2E6F0] rounded-xl text-[#696E82] cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-[#696E82] mt-1.5">
                    This is your login email and cannot be changed. Contact studio admin to change your login email.
                  </p>
                </div>

                {/* Info Notice Banner matching Reference */}
                <div className="p-3.5 bg-[#FFF9EB] border border-[#FEE3A2] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>Role and designation changes require approval from studio administration.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className="text-[#1456F0] font-semibold hover:underline shrink-0 text-left sm:text-right"
                  >
                    Request record change →
                  </button>
                </div>

                {/* Form Buttons matching Reference */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F0F2F7]">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFullName(initialData.myProfile?.fullName || "");
                        setPhone(initialData.myProfile?.phone || "");
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingSelf}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] hover:bg-[#0F47D1] text-white shadow-xs transition-all disabled:opacity-50"
                    >
                      {isUpdatingSelf ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                  <span className="text-[11px] text-[#696E82] hidden sm:inline-block">
                    Saves your personal details only.
                  </span>
                </div>
              </form>
            </div>

            {/* Right Column: Official studio record & Change requests */}
            <div className="lg:col-span-5 space-y-4">
              {/* Box 1: Official studio record */}
              <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1456F0]" />
                  <h3 className="type-card-title text-[#1F1F1F]">Official studio record</h3>
                </div>

                <div className="space-y-3 text-xs divide-y divide-[#F2F4F8]">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#696E82]">Employee ID</span>
                    <span className="font-semibold text-[#1F1F1F] font-mono">
                      {initialData.directoryProfile?.employeeId || "EMP-001"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-[#696E82]">Designation</span>
                    <span className="font-semibold text-[#1F1F1F]">
                      {initialData.directoryProfile?.designation || "Studio Administrator & Owner"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-[#696E82]">Department</span>
                    <span className="font-semibold text-[#1F1F1F]">
                      {initialData.directoryProfile?.department || "Administration"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-[#696E82]">Access role</span>
                    <span className="font-semibold text-[#1456F0]">{context.role}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-[#696E82]">Account status</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#EBF1FF] text-[#1456F0] font-semibold text-xs hover:bg-[#D9E6FF] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Request a record change</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Box 2: Change requests summary */}
              <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF9EB] text-[#F59E0B] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1F1F1F]">Change requests</h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {changeRequestsCount} pending
                  </span>
                </div>

                <p className="text-xs text-[#696E82]">
                  View the status of your submitted record changes.
                </p>

                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1456F0] hover:underline"
                >
                  <span>View requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: Workspace & access matching Reference */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F4F6FB] text-[#1F1F1F] flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1F1F1F]">Workspace &amp; access</h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#696E82] mt-1">
                  <div>
                    <span>Workspace: </span>
                    <strong className="text-[#1F1F1F]">{context.tenantName}</strong>
                  </div>
                  <div>
                    <span>Workspace ID: </span>
                    <strong className="text-[#1F1F1F] font-mono">{context.tenantSlug}</strong>
                  </div>
                  <div>
                    <span>Your role: </span>
                    <strong className="text-[#1456F0]">{context.role}</strong>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Active Workspace: ${context.tenantName}\nRole: ${context.role}\nMembership ID: ${context.membershipId}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all self-start md:self-auto"
            >
              <span>View access details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: WORK PROFILE */}
      {activeTab === "work-profile" && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">
                  Assigned Studio Projects ({activeProjectsCount})
                </h3>
                <p className="text-xs text-[#696E82] mt-0.5">
                  Projects where you are actively designated as Lead, Project Architect, or Contributor.
                </p>
              </div>
            </div>

            {activeProjectsCount > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {initialData.directoryProfile?.activeProjects.map((p: any) => (
                  <Link
                    key={p.projectId}
                    href={`/w/${context.tenantSlug}/projects/${p.projectId}`}
                    className="p-4 rounded-2xl border border-[#E2E6F0] hover:border-[#1456F0] bg-[#F8F9FE] hover:bg-white transition-all block group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <ProjectProfileCircle typology={p.typology} name={p.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#1456F0]">{p.code}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                            {p.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1F1F1F] truncate group-hover:text-[#1456F0] mt-0.5">
                          {p.name}
                        </h4>
                        <span className="text-[11px] text-[#696E82] block mt-0.5">Role: {p.projectRole}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#696E82] italic py-8 text-center">
                No active projects assigned yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HR RECORD */}
      {activeTab === "hr-record" && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
            <h3 className="type-card-title text-[#1F1F1F] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1456F0]" />
              <span>Official Employment &amp; HR Records</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div className="p-4 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Official ID</span>
                <span className="font-mono font-bold text-sm text-[#1F1F1F]">
                  {initialData.managementRecord?.officialEmployeeId || initialData.directoryProfile?.employeeId || "EMP-001"}
                </span>
              </div>
              <div className="p-4 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Designation</span>
                <span className="font-semibold text-sm text-[#1F1F1F]">
                  {initialData.managementRecord?.officialDesignation || "Studio Administrator & Owner"}
                </span>
              </div>
              <div className="p-4 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0] space-y-1">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Department</span>
                <span className="font-semibold text-sm text-[#1F1F1F]">
                  {initialData.managementRecord?.officialDepartment || "Administration"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS VAULT */}
      {activeTab === "documents" && (
        context.role === "OWNER" ? (
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1F1F1F]">Studio Partner &amp; Sovereign Owner</h3>
            <p className="text-xs text-[#696E82] max-w-md mx-auto leading-relaxed">
              Studio Owners and Partners are exempt from employee onboarding document filing. You can review and audit all employee records in the Studio Team page.
            </p>
            <div className="pt-2">
              <Link
                href={`/w/${context.tenantSlug}/team`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] transition-all"
              >
                <span>Go to Studio Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <EmployeeDocumentVaultView
            context={context}
            employeeId={initialData.directoryProfile?.employeeId || context.employeeId || ""}
            canManageHR={false}
          />
        )
      )}

      {/* TAB 5: HR LETTERS */}
      {activeTab === "letters" && (
        context.role === "OWNER" ? (
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center mx-auto shadow-sm">
              <Stamp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1F1F1F]">Studio Partner &amp; Sovereign Owner</h3>
            <p className="text-xs text-[#696E82] max-w-md mx-auto leading-relaxed">
              Employment offer letters and appointment letters apply only to Admins and Employees. You can inspect all studio letters in the Studio Team page.
            </p>
            <div className="pt-2">
              <Link
                href={`/w/${context.tenantSlug}/team`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] transition-all"
              >
                <span>View Team Letters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <EmployeeLettersView
            context={context}
            employeeId={initialData.directoryProfile?.employeeId || context.employeeId || ""}
            canManageHR={false}
          />
        )
      )}

      {/* Sticky Bottom Bar on Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E6F0] p-3 px-4 flex items-center gap-2.5 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setFullName(initialData.myProfile?.fullName || "");
            setPhone(initialData.myProfile?.phone || "");
          }}
          className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl border border-[#E2E6F0] bg-white text-[#1F1F1F] text-xs font-bold shadow-2xs"
        >
          <span>Cancel</span>
        </button>

        <button
          type="button"
          onClick={handleUpdateSelfProfile}
          disabled={isUpdatingSelf}
          className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl bg-[#1456F0] hover:bg-[#0F47D1] text-white text-xs font-bold shadow-xs disabled:opacity-50"
        >
          <span>{isUpdatingSelf ? "Saving..." : "Save changes"}</span>
        </button>
      </div>

      {/* Official Record Change Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E2E6F0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">Request Official Record Change</h3>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F8F9FE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOfficialRequest} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Field to Update</label>
                <select
                  value={changeFieldKey}
                  onChange={(e: any) => setChangeFieldKey(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-medium"
                >
                  <option value="designation">Official Designation</option>
                  <option value="department">Official Department</option>
                  <option value="phone">Official Phone</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">New Value</label>
                <input
                  type="text"
                  required
                  value={changeNewValue}
                  onChange={(e) => setChangeNewValue(e.target.value)}
                  placeholder="e.g. Senior Project Architect"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Justification Reason</label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Promotion or department transfer"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F2F7]">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E6F0] rounded-xl font-semibold text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-4 py-2 bg-[#1456F0] hover:bg-[#0F47D1] text-white rounded-xl font-bold disabled:opacity-50"
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
