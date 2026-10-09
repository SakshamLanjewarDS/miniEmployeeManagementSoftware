"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  MapPin,
  FileCheck2,
  Receipt,
  Users,
  Building,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  UserX,
  FileText,
  Layers,
  Calendar,
  IndianRupee,
  Lock,
  History,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  X,
  Compass,
} from "lucide-react";
import { ProjectProfileCircle, TypologyBadge } from "@/lib/typology";

interface ProjectDetailClientViewProps {
  context: TenantContext;
  project: any;
  allWorkspaceMembers: Array<{
    id: string;
    user: { id: string; fullName: string; email: string };
    employee?: { designation?: string | null; department?: string | null } | null;
  }>;
}

export function ProjectDetailClientView({
  context,
  project,
  allWorkspaceMembers,
}: ProjectDetailClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const canManage = context.role === "OWNER" || context.role === "ADMIN";
  const hasFinance = canManage || context.hasFinanceAccess;

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");

  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeReason, setResumeReason] = useState("");
  const [scheduleAdjustmentDays, setScheduleAdjustmentDays] = useState("0");

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionEvaluation, setCompletionEvaluation] = useState<any | null>(null);
  const [isEvaluatingCompletion, setIsEvaluatingCompletion] = useState(false);
  const [completionExceptions, setCompletionExceptions] = useState<string[]>([]);
  const [exceptionReasonInput, setExceptionReasonInput] = useState("");

  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDisposition, setCancelDisposition] = useState("CANCEL_OPEN_TASKS");

  // Scope change modal
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [changeTitle, setChangeTitle] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [changeScope, setChangeScope] = useState("");
  const [changeDays, setChangeDays] = useState("0");
  const [changeFee, setChangeFee] = useState("0");

  // Milestone modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestonePhaseId, setMilestonePhaseId] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneClientSignoff, setMilestoneClientSignoff] = useState(false);

  // Phase completion modal
  const [completingPhase, setCompletingPhase] = useState<any | null>(null);
  const [phaseExceptionReason, setPhaseExceptionReason] = useState("");

  // Member management modal
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Team Member");

  // Member removal safeguard modal
  const [removingMember, setRemovingMember] = useState<any | null>(null);
  const [reassignmentMemberId, setReassignmentMemberId] = useState("");
  const [removalConflicts, setRemovalConflicts] = useState<{
    openTasks?: any[];
    pendingReviews?: any[];
  } | null>(null);

  // Tabs definition
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "scope", label: "Scope & Brief" },
    { key: "phases", label: `Phases & Milestones (${project.phases.length})` },
    { key: "tasks", label: `Tasks (${project.tasks.length})` },
    { key: "drawings", label: `Drawings & Files (${project.documents.length})` },
    { key: "team", label: `Team & Contacts (${project.members.length})` },
    { key: "visits", label: `Site Visits (${project.sites?.reduce((acc: number, s: any) => acc + (s.visits?.length || 0), 0) || 0})` },
    ...(hasFinance ? [{ key: "finance", label: "Finance & Fees" }] : []),
    { key: "activity", label: `Activity (${project.auditEvents?.length || 0})` },
  ];

  // ============================================================================
  // LIFECYCLE HANDLERS
  // ============================================================================

  const handleActivateProject = async () => {
    if (!canManage) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACTIVATE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.validationErrors) {
          throw new Error(`Activation rules not satisfied: ${data.validationErrors.join(" ")}`);
        }
        throw new Error(data.error || "Failed to activate project");
      }
      setSuccessMessage("✓ Project activated successfully into active portfolio!");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to activate project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHoldProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !holdReason.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "HOLD", reason: holdReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to put project on hold");
      setSuccessMessage("✓ Project has been placed on hold. Operational assignments are paused.");
      setIsHoldModalOpen(false);
      setHoldReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to hold project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESUME",
          resumeReason: resumeReason.trim() || undefined,
          scheduleAdjustmentDays: parseInt(scheduleAdjustmentDays) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume project");
      setSuccessMessage("✓ Project resumed! Operational assignments and checklist work are active.");
      setIsResumeModalOpen(false);
      setResumeReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resume project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCompletionModal = async () => {
    setIsCompletionModalOpen(true);
    setIsEvaluatingCompletion(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EVALUATE_CHECKLIST" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate completion checklist");
      setCompletionEvaluation(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to evaluate handover checklist");
    } finally {
      setIsEvaluatingCompletion(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!canManage) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPLETE",
          permittedExceptions: completionExceptions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete project");
      setSuccessMessage("✓ Project successfully closed and completed with verified handover checklist!");
      setIsCompletionModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !reopenReason.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REOPEN", reason: reopenReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen project");
      setSuccessMessage("✓ Project has been reopened with audit justification!");
      setIsReopenModalOpen(false);
      setReopenReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reopen project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !cancelReason.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          reason: cancelReason.trim(),
          dispositionOfWork: cancelDisposition,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel project");
      setSuccessMessage("✓ Project marked as CANCELLED with documented disposition.");
      setIsCancelModalOpen(false);
      setCancelReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // SCOPE CHANGE REQUEST HANDLERS
  // ============================================================================

  const handleCreateScopeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTitle.trim() || !changeReason.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/changes?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: changeTitle.trim(),
          reason: changeReason.trim(),
          affectedScope: changeScope.trim() || undefined,
          scheduleImpactDays: parseInt(changeDays) || 0,
          feeImpactAmount: parseFloat(changeFee) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit scope change request");
      setSuccessMessage("✓ Scope change request submitted for leadership review!");
      setIsChangeRequestModalOpen(false);
      setChangeTitle("");
      setChangeReason("");
      setChangeScope("");
      setChangeDays("0");
      setChangeFee("0");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create scope change");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecideScopeChange = async (requestId: string, decision: "APPROVE" | "REJECT", notes?: string) => {
    if (!canManage) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/changes?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision, decisionNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decide scope change");
      setSuccessMessage(`✓ Scope change request ${decision === "APPROVE" ? "APPROVED and applied" : "REJECTED"}!`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // DELIVERY MILESTONE & PHASE HANDLERS
  // ============================================================================

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !milestoneTitle.trim() || !milestoneDate) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/milestones?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim() || undefined,
          phaseId: milestonePhaseId || undefined,
          targetDate: milestoneDate,
          isClientSignoffRequired: milestoneClientSignoff,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create delivery milestone");
      setSuccessMessage("✓ Delivery milestone registered!");
      setIsMilestoneModalOpen(false);
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneDate("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create milestone");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAchieveMilestone = async (milestoneId: string, isClientSignoff: boolean) => {
    if (!canManage) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/milestones?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, action: "ACHIEVE", isClientSignoff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update milestone");
      setSuccessMessage("✓ Milestone achieved!");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update milestone");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !completingPhase) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/phases?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: completingPhase.id,
          action: "COMPLETE",
          exceptionReason: phaseExceptionReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.unapprovedDeliverables) {
          throw new Error(
            `Phase deliverables incomplete (${data.unapprovedDeliverables.length} open/unapproved tasks). Provide an authorized exception reason to complete this phase.`
          );
        }
        throw new Error(data.error || "Failed to complete phase");
      }
      setSuccessMessage(`✓ Architectural phase "${completingPhase.phaseName}" completed!`);
      setCompletingPhase(null);
      setPhaseExceptionReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete phase");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // TEAM MEMBERSHIP SAFEGUARD HANDLERS
  // ============================================================================

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !selectedNewMemberId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/members?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: selectedNewMemberId,
          projectRole: newMemberRole.trim() || "Project Team Member",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member to project");
      setSuccessMessage("✓ Team member assigned to project!");
      setIsAddMemberModalOpen(false);
      setSelectedNewMemberId("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!canManage || !removingMember) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/members?workspaceSlug=${context.tenantSlug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: removingMember.membershipId,
          reassignToMembershipId: reassignmentMemberId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.hasResponsibilities) {
          setRemovalConflicts({
            openTasks: data.openTasks,
            pendingReviews: data.pendingReviews,
          });
          return;
        }
        throw new Error(data.error || "Failed to remove member");
      }
      setSuccessMessage("✓ Member access revoked and responsibilities safely resolved.");
      setRemovingMember(null);
      setRemovalConflicts(null);
      setReassignmentMemberId("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#696E82]">
        <Link href={`/w/${context.tenantSlug}/projects`} className="hover:text-[#1F1F1F] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="font-mono font-bold text-[#5A81FA]">{project.code}</span>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">{project.name}</span>
      </div>

      {/* Global Action Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
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
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
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
      {/* HOLD BANNER (DISPLAYED WHEN ON HOLD)                          */}
      {/* ============================================================== */}
      {project.status === "ON_HOLD" && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>PROJECT IS CURRENTLY ON HOLD</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                  OPERATIONAL TASKS PAUSED
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                <strong>Reason:</strong> {project.holdReason || "Administrative hold applied."}
              </p>
              <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-3">
                <span>Held by: <strong>Studio Leadership</strong></span>
                {project.heldAt && (
                  <span>Since: {new Date(project.heldAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setIsResumeModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Resume Project</span>
            </button>
          )}
        </div>
      )}

      {/* DRAFT SETUP BANNER */}
      {project.status === "DRAFT" && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900">
              <strong>Draft Project Setup:</strong> Operational task assignments are locked until this project passes activation validation.
            </div>
          </div>
          {canManage && (
            <button
              onClick={handleActivateProject}
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Activating..." : "Validate & Activate"}</span>
            </button>
          )}
        </div>
      )}

      {/* COMPLETED BANNER */}
      {project.status === "COMPLETED" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-900">
              <strong>Architectural Handover Complete:</strong> This project is officially closed. Financial settlements remain independent.
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setIsReopenModalOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Project</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PROJECT HEADER CARD                                           */}
      {/* ============================================================== */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-1 rounded border border-[#CEDEFF]">
                {project.code}
              </span>
              <TypologyBadge typology={project.projectType} size="sm" />
              <span className="text-xs font-semibold text-[#696E82] bg-[#F8F9FD] px-2.5 py-1 rounded border border-[#E2E6F0]">
                Phase: {project.currentPhase || "Brief"}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                  project.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : project.status === "ON_HOLD"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : project.status === "DRAFT"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : project.status === "COMPLETED"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {project.status}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <ProjectProfileCircle typology={project.projectType} name={project.name} size="lg" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">{project.name}</h1>
                <p className="text-xs text-[#696E82] line-clamp-1">{project.brief || project.description || "Architectural project commission."}</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Lifecycle Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-4 bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0] shrink-0 text-xs">
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Deliverables</span>
                <span className="text-sm font-bold text-[#1F1F1F]">{project.taskProgress?.percentage || 0}%</span>
              </div>
              <div className="border-l border-[#E2E6F0] pl-3">
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Phases</span>
                <span className="text-sm font-bold text-[#5A81FA]">{project.phaseProgress?.completedCount || 0}/{project.phases?.length || 11}</span>
              </div>
              {hasFinance && project.budget && (
                <div className="border-l border-[#E2E6F0] pl-3">
                  <span className="text-[10px] text-[#696E82] uppercase font-bold block">Budget</span>
                  <span className="text-sm font-bold text-[#1F1F1F]">
                    {project.currency} {Number(project.budget).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Management Lifecycle Actions Toolbar */}
            {canManage && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {project.status === "ACTIVE" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsHoldModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Place project on temporary hold"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hold</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCompletionModal}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Evaluate handover checklist and close project"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Close</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsChangeRequestModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#CEDEFF] bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#2C308D] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Request formal scope or schedule change"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Scope Change</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-[#E2E6F0] pt-3 scrollbar-none">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/w/${context.tenantSlug}/projects/${project.id}?tab=${t.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                currentTab === t.key
                  ? "bg-[#5A81FA] text-white font-semibold shadow-2xs"
                  : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB CONTENT SECTIONS                                           */}
      {/* ============================================================== */}

      {/* 1. OVERVIEW TAB */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Leadership Card */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#5A81FA]" />
                <span>Accountable Leadership</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-[#696E82] block">Project Architect</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectArchitect?.user.fullName || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#696E82] block">Project Architecture 2</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectManager?.user.fullName || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#696E82] block">Project Coordinator</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectCoordinator?.user.fullName || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Site */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#5A81FA]" />
                <span>Client & Site</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-[#696E82] block">Primary Client</span>
                  <span className="font-semibold text-[#1F1F1F]">{project.primaryClient?.name || "Private Client"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#696E82] block">Site Location</span>
                  <span className="text-[#1F1F1F]">{project.siteAddress || "No address provided"}{project.siteCity ? `, ${project.siteCity}` : ""}</span>
                </div>
                {project.googleMapLocation && (
                  <div>
                    <a
                      href={project.googleMapLocation.startsWith("http") ? project.googleMapLocation : `https://maps.google.com/?q=${encodeURIComponent(project.googleMapLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5A81FA] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Next Milestone & Issues */}
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#5A81FA]" />
                <span>Next Delivery Milestone</span>
              </h3>
              {project.milestones && project.milestones.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {project.milestones.find((m: any) => m.status === "PENDING") ? (
                    (() => {
                      const nextM = project.milestones.find((m: any) => m.status === "PENDING");
                      return (
                        <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                          <span className="text-[10px] text-[#5A81FA] font-bold block uppercase">
                            Due: {new Date(nextM.targetDate).toLocaleDateString()}
                          </span>
                          <span className="font-bold text-[#1F1F1F] block">{nextM.title}</span>
                          {nextM.isClientSignoffRequired && (
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              Client Signoff Mandatory
                            </span>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-emerald-700 italic">All delivery milestones achieved!</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#696E82] italic">No delivery milestones configured yet.</p>
              )}
            </div>
          </div>

          {/* Phases Progress Sequence */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">11-Phase Architectural Sequence</h3>
                <p className="text-xs text-[#696E82]">
                  {project.phaseProgress?.label || "11 standard architectural milestones"}
                </p>
              </div>
              <Link
                href={`/w/${context.tenantSlug}/projects/${project.id}?tab=phases`}
                className="text-xs text-[#5A81FA] hover:underline font-bold"
              >
                View Detailed Phases →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {project.phases?.map((ph: any) => {
                const isDone = ph.status === "COMPLETED";
                const isCurrent = ph.status === "IN_PROGRESS";
                return (
                  <div
                    key={ph.id}
                    className={`p-3 rounded-xl border text-center space-y-1 ${
                      isDone
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : isCurrent
                        ? "bg-[#F2F4FF] border-[#5A81FA] ring-1 ring-[#5A81FA] text-[#1F1F1F] font-bold"
                        : "bg-[#F8F9FD] border-[#E2E6F0] text-[#696E82]"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-[#696E82]">{ph.sortOrder}.</div>
                    <div className="text-xs font-semibold truncate" title={ph.phaseName}>
                      {ph.phaseName}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">
                      {isDone ? "✓ Completed" : isCurrent ? "⚡ Active" : ph.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. SCOPE & BRIEF TAB */}
      {currentTab === "scope" && (
        <div className="space-y-6">
          {/* Versioned Brief Card */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Architectural Brief & Instructions</h3>
                <p className="text-xs text-[#696E82]">Baseline client objectives, program, and scope boundaries</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setIsChangeRequestModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#5A81FA] text-white text-xs font-bold hover:bg-[#426EE8] cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Request Scope Change</span>
                </button>
              )}
            </div>

            <div className="prose text-xs text-[#1F1F1F] bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0]">
              <p className="whitespace-pre-wrap leading-relaxed">
                {project.brief || project.description || "No architectural brief specified."}
              </p>
            </div>

            {project.acceptanceCriteria && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#696E82] uppercase tracking-wider block">
                  Acceptance Criteria
                </span>
                <p className="text-xs text-[#1F1F1F] bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0]">
                  {project.acceptanceCriteria}
                </p>
              </div>
            )}
          </div>

          {/* Scope Change Requests Table */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Scope & Schedule Change Requests</h3>
            {project.changeRequests && project.changeRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                    <tr>
                      <th className="p-3">Title & Reason</th>
                      <th className="p-3">Schedule Impact</th>
                      <th className="p-3">Fee Impact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Requester</th>
                      {canManage && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6F0]">
                    {project.changeRequests.map((cr: any) => (
                      <tr key={cr.id} className="hover:bg-[#F8F9FD]">
                        <td className="p-3">
                          <strong className="text-[#1F1F1F] block">{cr.title}</strong>
                          <span className="text-[#696E82] text-[11px]">{cr.reason}</span>
                          {cr.decisionNotes && (
                            <span className="text-[10px] text-[#5A81FA] block mt-0.5">Note: {cr.decisionNotes}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold">
                          {cr.scheduleImpactDays > 0 ? `+${cr.scheduleImpactDays} days` : "No impact"}
                        </td>
                        <td className="p-3 font-mono font-semibold">
                          {cr.feeImpactAmount ? `${project.currency} ${Number(cr.feeImpactAmount).toLocaleString("en-IN")}` : "No fee impact"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cr.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : cr.status === "REJECTED"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {cr.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-[#696E82]">
                          {cr.requester?.user.fullName || "Studio Staff"}
                        </td>
                        {canManage && (
                          <td className="p-3 text-right">
                            {cr.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDecideScopeChange(cr.id, "APPROVE")}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDecideScopeChange(cr.id, "REJECT")}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#696E82] italic">No scope change requests registered for this project.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. PHASES & MILESTONES TAB */}
      {currentTab === "phases" && (
        <div className="space-y-6">
          {/* Delivery Milestones Card */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Delivery Milestones</h3>
                <p className="text-xs text-[#696E82]">Key architectural delivery deadlines (separate from billing fee milestones)</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#5A81FA] text-white text-xs font-bold hover:bg-[#426EE8] cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Delivery Milestone</span>
                </button>
              )}
            </div>

            {project.milestones && project.milestones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.milestones.map((m: any) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition-all ${
                      m.status === "ACHIEVED"
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-white border-[#E2E6F0]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#5A81FA] uppercase block">
                          Target: {new Date(m.targetDate).toLocaleDateString()}
                        </span>
                        <h4 className="text-xs font-bold text-[#1F1F1F]">{m.title}</h4>
                        {m.description && <p className="text-[11px] text-[#696E82] mt-0.5">{m.description}</p>}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === "ACHIEVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E2E6F0] flex items-center justify-between text-[11px]">
                      {m.isClientSignoffRequired && (
                        <span className="text-blue-700 font-medium">
                          {m.clientSignedOffAt ? "✓ Client Signed Off" : "Requires Client Signoff"}
                        </span>
                      )}
                      {canManage && m.status === "PENDING" && (
                        <button
                          onClick={() => handleAchieveMilestone(m.id, m.isClientSignoffRequired)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer ml-auto"
                        >
                          Mark Achieved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#696E82] italic">No delivery milestones defined.</p>
            )}
          </div>

          {/* Granular Phase Progression Table */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Architectural Phases Sequence & Completion Gates</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Phase Name</th>
                    <th className="p-3">Planned Dates</th>
                    <th className="p-3">Actual Dates</th>
                    <th className="p-3">Status</th>
                    {canManage && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]">
                  {project.phases?.map((ph: any) => (
                    <tr key={ph.id} className="hover:bg-[#F8F9FD]">
                      <td className="p-3 font-mono font-bold text-[#696E82]">{ph.sortOrder}</td>
                      <td className="p-3 font-semibold text-[#1F1F1F]">{ph.phaseName}</td>
                      <td className="p-3 text-[11px] text-[#696E82]">
                        {ph.plannedStartDate ? new Date(ph.plannedStartDate).toLocaleDateString() : "—"} →{" "}
                        {ph.plannedEndDate ? new Date(ph.plannedEndDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 text-[11px] text-[#696E82]">
                        {ph.actualStartDate ? new Date(ph.actualStartDate).toLocaleDateString() : "—"} →{" "}
                        {ph.actualEndDate ? new Date(ph.actualEndDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ph.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : ph.status === "IN_PROGRESS"
                              ? "bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF]"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ph.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="p-3 text-right">
                          {ph.status !== "COMPLETED" && (
                            <button
                              onClick={() => setCompletingPhase(ph)}
                              className="px-2.5 py-1 rounded bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Complete Phase
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. TASKS TAB */}
      {currentTab === "tasks" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Operational Tasks & Deliverables ({project.tasks.length})</h3>
              <p className="text-xs text-[#696E82]">Deliverables assigned to employees with four-eyes verification</p>
            </div>
            {canManage && project.status !== "ON_HOLD" && project.status !== "DRAFT" && (
              <Link
                href={`/w/${context.tenantSlug}/tasks?projectId=${project.id}`}
                className="px-3 py-1.5 rounded-xl bg-[#5A81FA] text-white text-xs font-bold hover:bg-[#426EE8] cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Deliverable</span>
              </Link>
            )}
          </div>

          {project.tasks && project.tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                  <tr>
                    <th className="p-3">Deliverable</th>
                    <th className="p-3">Phase</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]">
                  {project.tasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#F8F9FD]">
                      <td className="p-3 font-semibold text-[#1F1F1F]">
                        <Link href={`/w/${context.tenantSlug}/tasks?taskId=${t.id}`} className="hover:text-[#5A81FA]">
                          {t.title}
                        </Link>
                      </td>
                      <td className="p-3 text-[11px] text-[#696E82]">{t.phase?.phaseName || "General"}</td>
                      <td className="p-3 text-[11px] font-medium text-[#1F1F1F]">
                        {t.assignee?.user.fullName || "Unassigned"}
                      </td>
                      <td className="p-3 text-[11px] text-[#696E82]">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F2F4FF] text-[#2C308D]">
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800"
                              : t.status === "IN_REVIEW"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#696E82] italic">No deliverables assigned for this project.</p>
          )}
        </div>
      )}

      {/* 5. DRAWINGS TAB */}
      {currentTab === "drawings" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Architectural Drawings & Documents ({project.documents.length})</h3>
              <p className="text-xs text-[#696E82]">Working drawings, CAD/BIM revisions, and structural submissions</p>
            </div>
          </div>
          {project.documents && project.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.documents.map((d: any) => (
                <div key={d.id} className="p-4 rounded-xl border border-[#E2E6F0] bg-[#F8F9FD] space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#5A81FA] block">{d.documentNumber || "DWG"}</span>
                      <h4 className="text-xs font-bold text-[#1F1F1F]">{d.title}</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#E2E6F0] text-[#1F1F1F]">
                      {d.category || "General"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#696E82] pt-2 border-t border-[#E2E6F0]">
                    <span>Revisions: {d.versions?.length || 1}</span>
                    <span className="text-[#5A81FA] font-semibold">{d.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#696E82] italic">No architectural drawings uploaded for this project.</p>
          )}
        </div>
      )}

      {/* 6. TEAM & CONTACTS TAB */}
      {currentTab === "team" && (
        <div className="space-y-6">
          {/* Studio Project Members Table */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Assigned Studio Members ({project.members.length})</h3>
                <p className="text-xs text-[#696E82]">Staff authorized for deliverable assignments and site visits on this project</p>
              </div>
              {canManage && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#5A81FA] text-white text-xs font-bold hover:bg-[#426EE8] cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Team Member</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Work Designation</th>
                    <th className="p-3">Project Role</th>
                    {canManage && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]">
                  {project.members.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[#F8F9FD]">
                      <td className="p-3 font-semibold text-[#1F1F1F]">
                        {m.membership?.user.fullName}
                      </td>
                      <td className="p-3 text-[11px] text-[#696E82]">
                        {m.membership?.employee?.designation || "Studio Staff"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F2F4FF] text-[#5A81FA]">
                          {m.projectRole}
                        </span>
                      </td>
                      {canManage && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setRemovingMember(m);
                              setRemovalConflicts(null);
                            }}
                            className="p-1 rounded text-[#696E82] hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Remove member access (with responsibility checks)"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contractors & Consultants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#1F1F1F]">Commissioned Contractors ({project.contractors.length})</h3>
              {project.contractors.map((c: any) => (
                <div key={c.id} className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-xs">
                  <span className="font-bold text-[#1F1F1F] block">{c.contractor?.name}</span>
                  <span className="text-[#696E82] text-[11px]">{c.contractor?.trade || "Contractor"}</span>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#1F1F1F]">Commissioned Consultants ({project.consultants.length})</h3>
              {project.consultants.map((c: any) => (
                <div key={c.id} className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-xs">
                  <span className="font-bold text-[#1F1F1F] block">{c.consultant?.name}</span>
                  <span className="text-[#696E82] text-[11px]">{c.consultant?.discipline || "Consultant"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SITE VISITS TAB */}
      {currentTab === "visits" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F1F]">Project Site Visits & Radar</h3>
          <div className="space-y-3">
            {project.sites?.flatMap((s: any) => s.visits || []).length > 0 ? (
              project.sites?.flatMap((s: any) => s.visits || []).map((v: any) => (
                <div key={v.id} className="p-3.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1F1F1F] block">{v.purpose}</span>
                    <span className="text-[#696E82] text-[11px]">
                      By {v.employee?.user.fullName} • {new Date(v.scheduledTime).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                    {v.operationalState}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#696E82] italic">No site visits recorded for this project.</p>
            )}
          </div>
        </div>
      )}

      {/* 8. FINANCE & FEES TAB */}
      {currentTab === "finance" && hasFinance && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs text-xs space-y-1">
              <span className="text-[10px] text-[#696E82] uppercase font-bold">Total Budget</span>
              <span className="text-xl font-bold text-[#1F1F1F]">
                {project.currency} {Number(project.budget || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs text-xs space-y-1">
              <span className="text-[10px] text-[#696E82] uppercase font-bold">Fee Milestones</span>
              <span className="text-xl font-bold text-[#5A81FA]">
                {project.feeMilestones?.length || 0} Invoices
              </span>
            </div>
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs text-xs space-y-1">
              <span className="text-[10px] text-[#696E82] uppercase font-bold">Recorded Expenses</span>
              <span className="text-xl font-bold text-rose-600">
                {project.expenses?.length || 0} Vouchers
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Fee Billing Milestones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                  <tr>
                    <th className="p-3">Milestone Name</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]">
                  {project.feeMilestones?.map((fm: any) => (
                    <tr key={fm.id}>
                      <td className="p-3 font-semibold text-[#1F1F1F]">{fm.name}</td>
                      <td className="p-3 font-mono font-bold">
                        {project.currency} {Number(fm.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          {fm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. ACTIVITY TAB */}
      {currentTab === "activity" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#5A81FA]" />
            <span>Project Governance & Audit Trail</span>
          </h3>
          {project.auditEvents && project.auditEvents.length > 0 ? (
            <div className="space-y-3">
              {project.auditEvents.map((ev: any) => (
                <div key={ev.id} className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-[#F2F4FF] text-[#5A81FA] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1F1F1F]">{ev.safeChangeSummary}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#696E82] mt-0.5">
                      <span className="font-mono text-[#5A81FA]">{ev.action}</span>
                      <span>{new Date(ev.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#696E82] italic">No audit events recorded for this project.</p>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HOLD PROJECT                                            */}
      {/* ============================================================== */}
      {isHoldModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <span>Place Project On Hold</span>
              </h3>
              <button onClick={() => setIsHoldModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleHoldProject} className="space-y-4 text-xs">
              <p className="text-[#696E82]">
                Placing this project on hold will pause operational task assignments and checklist work starts. A documented reason is strictly required.
              </p>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Hold Justification Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Awaiting client municipal sanction drawings, or payments milestone delay..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsHoldModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !holdReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Confirm Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESUME PROJECT                                          */}
      {/* ============================================================== */}
      {isResumeModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                <span>Resume Project Operations</span>
              </h3>
              <button onClick={() => setIsResumeModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResumeProject} className="space-y-4 text-xs">
              <p className="text-[#696E82]">
                Resuming the project re-enables deliverable checklist work and assignment. Original baselines are preserved.
              </p>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Resume Reason / Notes</label>
                <input
                  type="text"
                  value={resumeReason}
                  onChange={(e) => setResumeReason(e.target.value)}
                  placeholder="e.g. Sanction approved, client clear to proceed"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Schedule Adjustment (Days)</label>
                <input
                  type="number"
                  value={scheduleAdjustmentDays}
                  onChange={(e) => setScheduleAdjustmentDays(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsResumeModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Resume Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HANDOVER & COMPLETION CHECKLIST                         */}
      {/* ============================================================== */}
      {isCompletionModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Handover & Closure Verification</span>
              </h3>
              <button onClick={() => setIsCompletionModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEvaluatingCompletion ? (
              <div className="py-8 text-center text-xs text-[#696E82]">
                Evaluating deliverables, approved drawings, and unresolved blockers...
              </div>
            ) : completionEvaluation ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                  <div className="flex justify-between font-bold text-[#1F1F1F]">
                    <span>Verification Summary</span>
                    <span className={completionEvaluation.canCompleteWithoutExceptions ? "text-emerald-700" : "text-amber-700"}>
                      {completionEvaluation.canCompleteWithoutExceptions ? "✓ All Gates Cleared" : "Exceptions Required"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#696E82] grid grid-cols-2 gap-2 pt-1">
                    <div>Open Deliverables: <strong>{completionEvaluation.openTasksCount}</strong></div>
                    <div>Active Blockers: <strong>{completionEvaluation.activeBlockersCount}</strong></div>
                    <div>Unapproved Drawings: <strong>{completionEvaluation.unapprovedDrawingsCount}</strong></div>
                    <div>Pending Milestones: <strong>{completionEvaluation.pendingMilestonesCount}</strong></div>
                  </div>
                </div>

                {!completionEvaluation.canCompleteWithoutExceptions && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-2 text-amber-900">
                    <span className="font-bold block">Management Exceptions Required</span>
                    <p className="text-[11px]">
                      Because open deliverables or items remain, you must document explicit leadership exceptions to close this project:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={exceptionReasonInput}
                        onChange={(e) => setExceptionReasonInput(e.target.value)}
                        placeholder="e.g. Post-handover minor touchup permitted by client"
                        className="flex-1 p-2 bg-white border border-amber-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (exceptionReasonInput.trim()) {
                            setCompletionExceptions([...completionExceptions, exceptionReasonInput.trim()]);
                            setExceptionReasonInput("");
                          }
                        }}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs"
                      >
                        Add
                      </button>
                    </div>
                    {completionExceptions.length > 0 && (
                      <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                        {completionExceptions.map((ex, i) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                  <button
                    type="button"
                    onClick={() => setIsCompletionModalOpen(false)}
                    className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteProject}
                    disabled={isSubmitting || (!completionEvaluation.canCompleteWithoutExceptions && completionExceptions.length === 0)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Completing..." : "Confirm Closure"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REOPEN PROJECT                                          */}
      {/* ============================================================== */}
      {isReopenModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#5A81FA]" />
                <span>Reopen Completed Project</span>
              </h3>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReopenProject} className="space-y-4 text-xs">
              <p className="text-[#696E82]">
                Reopening a closed project requires a specific justification reason for audit compliance.
              </p>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Reopen Justification <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Scope extension commissioned by client; addition of terrace garden..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reopenReason.trim()}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SCOPE CHANGE REQUEST                                    */}
      {/* ============================================================== */}
      {isChangeRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#5A81FA]" />
                <span>Request Scope Change</span>
              </h3>
              <button onClick={() => setIsChangeRequestModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateScopeChange} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Change Title <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={changeTitle}
                  onChange={(e) => setChangeTitle(e.target.value)}
                  placeholder="e.g. Add Basement Home Theatre Program"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Reason / Justification <span className="text-red-600">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Client requested modification post concept signoff..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Schedule Impact (Days)</label>
                  <input
                    type="number"
                    value={changeDays}
                    onChange={(e) => setChangeDays(e.target.value)}
                    className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Fee Impact ({project.currency})</label>
                  <input
                    type="number"
                    value={changeFee}
                    onChange={(e) => setChangeFee(e.target.value)}
                    className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !changeTitle.trim() || !changeReason.trim()}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD DELIVERY MILESTONE                                  */}
      {/* ============================================================== */}
      {isMilestoneModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#5A81FA]" />
                <span>Add Delivery Milestone</span>
              </h3>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Milestone Title <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Concept Presentation & Model Signoff"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Target Date <span className="text-red-600">*</span></label>
                <input
                  type="date"
                  required
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="clientSignoff"
                  checked={milestoneClientSignoff}
                  onChange={(e) => setMilestoneClientSignoff(e.target.checked)}
                  className="rounded text-[#5A81FA]"
                />
                <label htmlFor="clientSignoff" className="text-xs font-semibold text-[#1F1F1F]">
                  Mandatory Client Signoff Required for Achievement
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !milestoneTitle.trim() || !milestoneDate}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: COMPLETE PHASE GATE                                     */}
      {/* ============================================================== */}
      {completingPhase && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">
                Complete Phase: {completingPhase.phaseName}
              </h3>
              <button onClick={() => setCompletingPhase(null)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCompletePhase} className="space-y-3 text-xs">
              <p className="text-[#696E82]">
                Validating deliverables and delivery milestones for this phase. If any items remain unapproved, provide an authorized exception reason below:
              </p>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Authorized Exception Reason (if required)
                </label>
                <input
                  type="text"
                  value={phaseExceptionReason}
                  onChange={(e) => setPhaseExceptionReason(e.target.value)}
                  placeholder="e.g. Sanction permit fast-tracked by municipal authority"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setCompletingPhase(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Verify & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD TEAM MEMBER                                         */}
      {/* ============================================================== */}
      {isAddMemberModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#5A81FA]" />
                <span>Assign Team Member to Project</span>
              </h3>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Select Studio Colleague</label>
                <select
                  required
                  value={selectedNewMemberId}
                  onChange={(e) => setSelectedNewMemberId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                >
                  <option value="">Choose team member...</option>
                  {allWorkspaceMembers
                    .filter((wm) => !project.members?.some((pm: any) => pm.membershipId === wm.id))
                    .map((wm) => (
                      <option key={wm.id} value={wm.id}>
                        {wm.user.fullName} ({wm.employee?.designation || "Staff"})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Project Responsibility / Role</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="e.g. Lead Interior Architect, Site Supervisor..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedNewMemberId}
                  className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MEMBER REMOVAL CONFLICT SAFEGUARD                      */}
      {/* ============================================================== */}
      {removingMember && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-600" />
                <span>Remove Project Access: {removingMember.membership?.user.fullName}</span>
              </h3>
              <button onClick={() => setRemovingMember(null)} className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {removalConflicts ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Member Has Active Responsibilities!</span>
                  </span>
                  <p className="text-[11px]">
                    This member has {removalConflicts.openTasks?.length || 0} open task deliverables or pending reviews. You must designate a replacement team member to inherit these items:
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">
                    Reassign Responsibilities To <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={reassignmentMemberId}
                    onChange={(e) => setReassignmentMemberId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  >
                    <option value="">Select replacement member...</option>
                    {project.members
                      .filter((pm: any) => pm.membershipId !== removingMember.membershipId)
                      .map((pm: any) => (
                        <option key={pm.membershipId} value={pm.membershipId}>
                          {pm.membership?.user.fullName} ({pm.projectRole})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#696E82]">
                Removing this member revokes future access to this project. All past contributions, audit trails, and submission history remain intact.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isSubmitting || (Boolean(removalConflicts) && !reassignmentMemberId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
