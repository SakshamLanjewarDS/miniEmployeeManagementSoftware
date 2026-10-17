"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck2,
  Search,
  Plus,
  Download,
  Eye,
  RotateCcw,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  History,
  X,
  Building,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  Award,
  FolderGit2,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { SearchableDropdown, SearchableSelect } from "@/components/ui/SearchableDropdown";
import { MobileFilterDrawer } from "@/components/ui/MobileFilterDrawer";

export interface ApprovalRequestItem {
  id: string;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  requesterId: string;
  reviewerId: string | null;
  comment: string | null;
  isClientApproval: boolean;
  clientApprovalEvidence: string | null;
  clientApprovalReceivedDate: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface DrawingVersionItem {
  id: string;
  documentId: string;
  revision: string; // R0, R1, R2
  fileId: string;
  uploaderId: string;
  issuePurpose: string;
  approvalState: "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  supersededById: string | null;
  createdAt: string;
  updatedAt: string;
  approvalRequests: ApprovalRequestItem[];
}

export interface DrawingItem {
  id: string;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
  };
  taskId: string | null;
  task?: { id: string; title: string } | null;
  title: string;
  drawingNumber: string | null;
  discipline: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
  versions: DrawingVersionItem[];
  latestVersion: DrawingVersionItem | null;
  latestApprovedVersion: DrawingVersionItem | null;
  totalRevisions: number;
}

export interface DrawingsClientViewProps {
  initialDrawings: DrawingItem[];
  projects: Array<{ id: string; code: string; name: string }>;
  workspaceSlug: string;
  currentMembershipId: string;
  userRole: string;
  userFullName: string;
}

export default function DrawingsClientView({
  initialDrawings,
  projects,
  workspaceSlug,
  currentMembershipId,
  userRole,
  userFullName,
}: DrawingsClientViewProps) {
  const router = useRouter();
  const [drawings, setDrawings] = useState<DrawingItem[]>(initialDrawings);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [drawingSortBy, setDrawingSortBy] = useState<string>("DATE_DESC");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProjectFilter !== "ALL") count++;
    if (selectedDisciplineFilter !== "ALL") count++;
    if (selectedStatusFilter !== "ALL") count++;
    if (searchQuery.trim().length > 0) count++;
    if (drawingSortBy !== "DATE_DESC") count++;
    return count;
  }, [selectedProjectFilter, selectedDisciplineFilter, selectedStatusFilter, searchQuery, drawingSortBy]);

  const handleClearFilters = () => {
    setSelectedProjectFilter("ALL");
    setSelectedDisciplineFilter("ALL");
    setSelectedStatusFilter("ALL");
    setSearchQuery("");
    setDrawingSortBy("DATE_DESC");
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Register selection & Detail states
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>(initialDrawings[0]?.id || "");
  const [mobileDetailDoc, setMobileDetailDoc] = useState<DrawingItem | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"history" | "evidence">("history");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDetailMoreOpen, setIsDetailMoreOpen] = useState<boolean>(false);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploadRevisionDoc, setUploadRevisionDoc] = useState<DrawingItem | null>(null);
  const [changeRequestVersion, setChangeRequestVersion] = useState<DrawingVersionItem | null>(null);
  const [clientApprovalVersion, setClientApprovalVersion] = useState<DrawingVersionItem | null>(null);
  const [detailDrawerDoc, setDetailDrawerDoc] = useState<DrawingItem | null>(null);
  const [previewFile, setPreviewFile] = useState<{ fileId: string; fileName: string; isPdf: boolean; isImage: boolean } | null>(null);

  // Create Form State
  const [createProjectId, setCreateProjectId] = useState<string>(projects[0]?.id || "");
  const [createTitle, setCreateTitle] = useState("");
  const [createDrawingNumber, setCreateDrawingNumber] = useState("");
  const [createDiscipline, setCreateDiscipline] = useState("Architectural");
  const [createDocumentType, setCreateDocumentType] = useState("Working Drawing");
  const [createIssuePurpose, setCreateIssuePurpose] = useState("For Initial Review");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // New Revision Form State
  const [revisionIssuePurpose, setRevisionIssuePurpose] = useState("For Construction Reissue");
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [submittingRevision, setSubmittingRevision] = useState(false);

  // Change Request Form State
  const [changeComment, setChangeComment] = useState("");
  const [submittingChanges, setSubmittingChanges] = useState(false);

  // Client Approval Form State
  const [clientStatus, setClientStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [clientEvidenceText, setClientEvidenceText] = useState("");
  const [clientReceivedDate, setClientReceivedDate] = useState("");
  const [submittingClientApproval, setSubmittingClientApproval] = useState(false);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Unique disciplines for filter pills
  const disciplines = [
    "Architectural",
    "Structural",
    "MEP",
    "Interior",
    "Landscape",
    "Working Drawing",
    "Site Documentation",
    "3D View",
  ];

  // Filtered drawings
  const filteredDrawings = useMemo(() => {
    return drawings.filter((doc) => {
      if (selectedProjectFilter !== "ALL" && doc.projectId !== selectedProjectFilter) {
        return false;
      }
      if (selectedDisciplineFilter !== "ALL" && doc.discipline !== selectedDisciplineFilter) {
        return false;
      }
      if (selectedStatusFilter !== "ALL") {
        const state = doc.latestVersion?.approvalState;
        if (selectedStatusFilter !== state) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNum = doc.drawingNumber?.toLowerCase().includes(q);
        const matchDisc = doc.discipline.toLowerCase().includes(q);
        const matchProj = doc.project.code.toLowerCase().includes(q) || doc.project.name.toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchDisc && !matchProj) return false;
      }
      return true;
    }).sort((a, b) => {
      switch (drawingSortBy) {
        case "DATE_DESC":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "DATE_ASC":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "ALPHA_TITLE_ASC":
          return a.title.localeCompare(b.title);
        case "ALPHA_TITLE_DESC":
          return b.title.localeCompare(a.title);
        case "ALPHA_NUMBER_ASC":
          return (a.drawingNumber || "").localeCompare(b.drawingNumber || "");
        case "ALPHA_NUMBER_DESC":
          return (b.drawingNumber || "").localeCompare(a.drawingNumber || "");
        default:
          return 0;
      }
    });
  }, [drawings, selectedProjectFilter, selectedDisciplineFilter, selectedStatusFilter, searchQuery, drawingSortBy]);

  // Handle File Upload Helper
  const uploadFileToStorage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/storage/upload?workspaceSlug=${workspaceSlug}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "File upload failed");
    }
    return data.file.id;
  };

  // Create Drawing Submit
  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProjectId || !createTitle.trim() || !createFile) {
      setErrorMessage("Please select a project, provide a title, and attach a drawing sheet.");
      return;
    }

    setSubmittingCreate(true);
    setErrorMessage(null);

    try {
      // 1. Upload file into private storage
      const fileId = await uploadFileToStorage(createFile);

      // 2. Create drawing record and initial revision R0
      const res = await fetch(`/api/drawings?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: createProjectId,
          title: createTitle.trim(),
          drawingNumber: createDrawingNumber.trim() || undefined,
          discipline: createDiscipline,
          documentType: createDocumentType,
          issuePurpose: createIssuePurpose.trim() || undefined,
          fileId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to register drawing");
      } else {
        setSuccessMessage(`Drawing "${createTitle}" registered with revision R0.`);
        setIsCreateModalOpen(false);
        // Reset form
        setCreateTitle("");
        setCreateDrawingNumber("");
        setCreateFile(null);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error registering drawing");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Upload New Revision Submit ($R_{n+1}$)
  const handleUploadRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadRevisionDoc || !revisionFile) {
      setErrorMessage("Please select a revised sheet file to upload.");
      return;
    }

    setSubmittingRevision(true);
    setErrorMessage(null);

    try {
      const fileId = await uploadFileToStorage(revisionFile);

      const res = await fetch(`/api/drawings/revisions?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: uploadRevisionDoc.id,
          fileId,
          issuePurpose: revisionIssuePurpose.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to upload revision");
      } else {
        setSuccessMessage(`New revision ${data.version.revision} uploaded for "${uploadRevisionDoc.title}".`);
        setUploadRevisionDoc(null);
        setRevisionFile(null);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error uploading revision");
    } finally {
      setSubmittingRevision(false);
    }
  };

  // Submit Draft for Review
  const handleSubmitForReview = async (versionId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/drawings/revisions/${versionId}/submit?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Submitted for lead partner review" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit revision for review");
      } else {
        setSuccessMessage("Drawing revision successfully submitted for review.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error submitting revision");
    }
  };

  // Withdraw Submission
  const handleWithdrawSubmission = async (versionId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/drawings/revisions/${versionId}/withdraw?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to withdraw submission");
      } else {
        setSuccessMessage("Submission withdrawn. Revision returned to Draft state.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error withdrawing submission");
    }
  };

  // Approve Revision (Enforces no self-approval on server)
  const handleApproveRevision = async (versionId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/drawings/revisions/${versionId}/review?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED", comment: "Approved by studio partner" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to approve revision");
      } else {
        setSuccessMessage("Drawing revision internally approved.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error approving revision");
    }
  };

  // Request Changes Submit
  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRequestVersion || !changeComment.trim()) return;

    setSubmittingChanges(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/drawings/revisions/${changeRequestVersion.id}/review?workspaceSlug=${workspaceSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: "CHANGES_REQUESTED",
            comment: changeComment.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to record changes requested");
      } else {
        setSuccessMessage("Correction comment sent. Revision reverted to Draft.");
        setChangeRequestVersion(null);
        setChangeComment("");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error requesting changes");
    } finally {
      setSubmittingChanges(false);
    }
  };

  // Record Client Approval Submit
  const handleRecordClientApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientApprovalVersion || !clientEvidenceText.trim()) return;

    setSubmittingClientApproval(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/drawings/revisions/${clientApprovalVersion.id}/client-approval?workspaceSlug=${workspaceSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: clientStatus,
            evidenceText: clientEvidenceText.trim(),
            receivedDate: clientReceivedDate || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to record client approval");
      } else {
        setSuccessMessage(`Client ${clientStatus.toLowerCase()} recorded with evidence.`);
        setClientApprovalVersion(null);
        setClientEvidenceText("");
        setClientReceivedDate("");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error recording client approval");
    } finally {
      setSubmittingClientApproval(false);
    }
  };

  // Delete Unsubmitted Draft
  const handleDeleteDraft = async (versionId: string) => {
    if (!confirm("Are you sure you want to delete this unsubmitted draft? This action cannot be undone.")) return;

    try {
      const res = await fetch(
        `/api/drawings/revisions/${versionId}/delete-draft?workspaceSlug=${workspaceSlug}`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete draft revision");
      } else {
        setSuccessMessage("Draft revision deleted.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error deleting draft");
    }
  };

  // Open Preview Modal
  const openPreview = (fileId: string, fileName: string) => {
    const ext = fileName.toLowerCase();
    const isPdf = ext.endsWith(".pdf");
    const isImage = ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png") || ext.endsWith(".webp");
    setPreviewFile({ fileId, fileName, isPdf, isImage });
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "APPROVED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✔ Approved</span>;
      case "IN_REVIEW":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">⏳ In Review</span>;
      case "SUPERSEDED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Superseded</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4FF] text-[#696E82] border border-[#E2E6F0]">Draft</span>;
    }
  };

  const inReviewCount = drawings.filter((d) => d.latestVersion?.approvalState === "IN_REVIEW").length;
  const draftsCount = drawings.filter((d) => d.latestVersion?.approvalState === "DRAFT").length;
  const approvedCount = drawings.filter((d) => d.latestVersion?.approvalState === "APPROVED").length;

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredDrawings.length / pageSize));
  const paginatedDrawings = filteredDrawings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId) || filteredDrawings[0] || drawings[0] || null;

  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse" suppressHydrationWarning>
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 h-20" />
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 h-14" />
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 space-y-4">
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#696E82] mb-1">
            <span>Projects & Delivery</span>
            <span>/</span>
            <span className="text-[#1F1F1F] font-semibold">Drawings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F1F1F]">
            Drawings & approvals
          </h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Find the right revision. Keep every approval traceable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register drawing</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#696E82]">
        <span className="font-bold text-[#1F1F1F]">{drawings.length} drawings</span>
        <span>|</span>
        <span>Revision-controlled library</span>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E6F0] pb-2 overflow-x-auto touch-scroll-x scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedStatusFilter === "ALL"
              ? "bg-[#5A81FA] text-white shadow-2xs"
              : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
          }`}
        >
          All drawings
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedStatusFilter("IN_REVIEW");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedStatusFilter === "IN_REVIEW"
              ? "bg-[#5A81FA] text-white shadow-2xs"
              : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
          }`}
        >
          In review ({inReviewCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedStatusFilter("DRAFT");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedStatusFilter === "DRAFT"
              ? "bg-[#5A81FA] text-white shadow-2xs"
              : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
          }`}
        >
          Drafts ({draftsCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedStatusFilter("APPROVED");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedStatusFilter === "APPROVED"
              ? "bg-[#5A81FA] text-white shadow-2xs"
              : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
          }`}
        >
          Approved ({approvedCount})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search title, sheet code or project..."
              className="w-full pl-9 pr-7 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Project dropdown */}
            <div className="min-w-[150px]">
              <SearchableDropdown
                size="sm"
                optionType="project"
                value={selectedProjectFilter}
                onChange={(v) => {
                  setSelectedProjectFilter(v);
                  setCurrentPage(1);
                }}
                placeholder="All projects"
                searchPlaceholder="Search projects..."
                clearable={false}
                options={[
                  { value: "ALL", label: "All projects" },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                    projectCode: p.code,
                  })),
                ]}
              />
            </div>

            {/* Discipline dropdown */}
            <div className="min-w-[140px]">
              <SearchableDropdown
                size="sm"
                value={selectedDisciplineFilter}
                onChange={(v) => {
                  setSelectedDisciplineFilter(v);
                  setCurrentPage(1);
                }}
                placeholder="All disciplines"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All disciplines" },
                  ...disciplines.map((d) => ({
                    value: d,
                    label: d,
                  })),
                ]}
              />
            </div>

            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F8F9FD] cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#5A81FA] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="min-w-[150px]">
              <SearchableDropdown
                size="sm"
                value={drawingSortBy}
                onChange={setDrawingSortBy}
                placeholder="Sort: Newest first"
                searchable={false}
                clearable={false}
                options={[
                  { value: "DATE_DESC", label: "Sort: Newest first" },
                  { value: "DATE_ASC", label: "Sort: Oldest first" },
                  { value: "ALPHA_TITLE_ASC", label: "Sort: Title (A → Z)" },
                  { value: "ALPHA_TITLE_DESC", label: "Sort: Title (Z → A)" },
                  { value: "ALPHA_NUMBER_ASC", label: "Sort: Sheet # (A → Z)" },
                  { value: "ALPHA_NUMBER_DESC", label: "Sort: Sheet # (Z → A)" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* If Mobile Detail is active on mobile screens: show focused detail view */}
      {mobileDetailDoc ? (
        <div className="lg:hidden space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileDetailDoc(null)}
              className="text-xs font-bold text-[#5A81FA] hover:underline flex items-center gap-1.5 cursor-pointer py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Drawings</span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDetailMoreOpen(!isDetailMoreOpen)}
                className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] rounded-lg cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isDetailMoreOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 bg-white border border-[#E2E6F0] rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setIsDetailMoreOpen(false)}
                >
                  {mobileDetailDoc.latestVersion && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailMoreOpen(false);
                        openPreview(mobileDetailDoc.latestVersion!.fileId, `${mobileDetailDoc.title}_${mobileDetailDoc.latestVersion!.revision}.pdf`);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F8F9FD] flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#696E82]" />
                      <span>Preview sheet</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailMoreOpen(false);
                      setDetailDrawerDoc(mobileDetailDoc);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F8F9FD] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <History className="w-3.5 h-3.5 text-[#696E82]" />
                    <span>View audit history</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#1F1F1F] tracking-tight">{mobileDetailDoc.title}</h2>
              <p className="text-xs text-[#696E82] mt-0.5">
                Project: {mobileDetailDoc.project.name} • {mobileDetailDoc.discipline} • {mobileDetailDoc.documentType}
              </p>
            </div>

            {/* Comparison boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[#696E82] uppercase block">Latest revision</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold font-mono text-[#1F1F1F]">{mobileDetailDoc.latestVersion?.revision || "—"}</span>
                  {mobileDetailDoc.latestVersion && getStatusBadge(mobileDetailDoc.latestVersion.approvalState)}
                </div>
                <span className="text-[10px] text-[#696E82] block truncate">
                  {mobileDetailDoc.latestVersion ? `Updated ${new Date(mobileDetailDoc.latestVersion.updatedAt || mobileDetailDoc.latestVersion.createdAt).toLocaleDateString()}` : "No revisions"}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Approved revision</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold font-mono text-emerald-900">{mobileDetailDoc.latestApprovedVersion?.revision || "—"}</span>
                  {mobileDetailDoc.latestApprovedVersion ? getStatusBadge("APPROVED") : <span className="text-[10px] text-gray-500 italic">None</span>}
                </div>
                <span className="text-[10px] text-emerald-700 block truncate">
                  {mobileDetailDoc.latestApprovedVersion ? `Approved ${new Date(mobileDetailDoc.latestApprovedVersion.updatedAt || mobileDetailDoc.latestApprovedVersion.createdAt).toLocaleDateString()}` : "No approved revision"}
                </span>
              </div>
            </div>

            {/* Alert banner if unapproved */}
            {mobileDetailDoc.latestVersion?.approvalState !== "APPROVED" && (
              <div className="bg-[#FFF8E6] border border-[#FFE082] rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {mobileDetailDoc.latestApprovedVersion
                    ? `${mobileDetailDoc.latestVersion?.revision || "Latest"} is not approved. Use ${mobileDetailDoc.latestApprovedVersion.revision} as the approved revision.`
                    : `${mobileDetailDoc.latestVersion?.revision || "Latest"} is not approved. Construction holds apply.`}
                </span>
              </div>
            )}

            {/* Preview Box Placeholder */}
            <div className="p-6 bg-[#F8F9FD] border border-dashed border-[#E2E6F0] rounded-xl text-center space-y-2">
              <FileText className="w-10 h-10 mx-auto text-[#A8B1CE]" />
              <p className="text-xs text-[#696E82]">No preview available. Open the file to view the drawing.</p>
              {mobileDetailDoc.latestVersion && (
                <button
                  type="button"
                  onClick={() => openPreview(mobileDetailDoc.latestVersion!.fileId, `${mobileDetailDoc.title}_${mobileDetailDoc.latestVersion!.revision}.pdf`)}
                  className="px-3.5 py-1.5 bg-white border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open preview</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#5A81FA]" />
                </button>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-4 border-b border-[#E2E6F0] pb-2 text-xs">
              <button
                type="button"
                onClick={() => setDetailSubTab("history")}
                className={`font-semibold pb-1 cursor-pointer transition-colors ${
                  detailSubTab === "history" ? "text-[#5A81FA] border-b-2 border-[#5A81FA]" : "text-[#696E82]"
                }`}
              >
                Revision history
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab("evidence")}
                className={`font-semibold pb-1 cursor-pointer transition-colors ${
                  detailSubTab === "evidence" ? "text-[#5A81FA] border-b-2 border-[#5A81FA]" : "text-[#696E82]"
                }`}
              >
                Evidence
              </button>
            </div>

            {/* Tab content */}
            {detailSubTab === "history" ? (
              <div className="space-y-4">
                {mobileDetailDoc.versions.map((ver, idx) => (
                  <div key={ver.id} className="relative pl-6 pb-2 text-xs space-y-1">
                    {idx < mobileDetailDoc.versions.length - 1 && (
                      <div className="absolute left-2.5 top-3 bottom-0 w-0.5 bg-[#E2E6F0]" />
                    )}
                    <div className={`absolute left-1 top-1.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                      ver.approvalState === "APPROVED" ? "bg-emerald-500" : ver.approvalState === "IN_REVIEW" ? "bg-purple-600" : "bg-slate-400"
                    }`} />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1F1F1F]">{ver.revision}</span>
                        {getStatusBadge(ver.approvalState)}
                      </div>
                      <span className="text-[11px] text-[#696E82]">{new Date(ver.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[#696E82] text-xs">{ver.issuePurpose}</p>
                    {ver.approvalRequests?.some((ar) => ar.isClientApproval && ar.status === "APPROVED") && (
                      <button
                        type="button"
                        onClick={() => setDetailSubTab("evidence")}
                        className="text-[11px] text-[#5A81FA] hover:underline font-semibold block"
                      >
                        Client approval evidence recorded. View evidence →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {mobileDetailDoc.versions.flatMap(v => v.approvalRequests).length > 0 ? (
                  mobileDetailDoc.versions.flatMap(v => v.approvalRequests).map(req => (
                    <div key={req.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{req.isClientApproval ? "Client Approval Evidence" : "Review Approval"}</span>
                        <span className="font-mono text-[10px]">{req.status}</span>
                      </div>
                      {req.comment && <p className="text-[#696E82]">{req.comment}</p>}
                      {req.clientApprovalEvidence && <p className="text-[#1F1F1F] font-medium">Evidence: {req.clientApprovalEvidence}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#696E82] italic">No evidence recorded yet.</p>
                )}
              </div>
            )}

            {/* Mobile Actions Footer */}
            <div className="pt-3 border-t border-[#E2E6F0] space-y-2">
              {mobileDetailDoc.latestVersion?.approvalState === "IN_REVIEW" && (
                (isPrivileged && mobileDetailDoc.latestVersion.uploaderId !== currentMembershipId) ? (
                  <button
                    type="button"
                    onClick={() => handleApproveRevision(mobileDetailDoc.latestVersion!.id)}
                    className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Review {mobileDetailDoc.latestVersion.revision}
                  </button>
                ) : (
                  <div className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-800 text-center text-xs rounded-xl font-semibold">
                    Awaiting Partner Approval (Self-approval blocked)
                  </div>
                )
              )}
              {mobileDetailDoc.latestVersion?.approvalState === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => handleSubmitForReview(mobileDetailDoc.latestVersion!.id)}
                  className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Submit {mobileDetailDoc.latestVersion.revision} for Review
                </button>
              )}
              {mobileDetailDoc.latestVersion?.approvalState === "APPROVED" && isPrivileged && (
                <button
                  type="button"
                  onClick={() => setClientApprovalVersion(mobileDetailDoc.latestVersion!)}
                  className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Record Client Approval Evidence
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUploadRevisionDoc(mobileDetailDoc)}
                  className="flex-1 py-2 bg-[#F8F9FD] border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#696E82]" />
                  <span>Upload revision</span>
                </button>
                {mobileDetailDoc.latestVersion && (
                  <a
                    href={`/api/storage/files/${mobileDetailDoc.latestVersion.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                    className="flex-1 py-2 bg-[#F8F9FD] border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#696E82]" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular desktop split layout + mobile card list */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Register Table on desktop / Cards on mobile */}
          <div className="lg:col-span-7 space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FD] text-[#696E82] border-b border-[#E2E6F0]">
                  <tr>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Drawing</th>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Latest</th>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Approved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]/60">
                  {paginatedDrawings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-[#696E82]">
                        No drawings match current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedDrawings.map((doc) => {
                      const isSelected = selectedDrawing?.id === doc.id;
                      const latest = doc.latestVersion;
                      const latestApproved = doc.latestApprovedVersion;

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDrawingId(doc.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#F2F4FF]/70 font-semibold"
                              : "hover:bg-[#F8F9FD]"
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-[#1F1F1F] text-xs">{doc.title}</div>
                            <div className="text-[11px] text-[#696E82] mt-0.5">
                              Project: {doc.project.name} | {doc.discipline}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#1F1F1F]">
                                {latest ? latest.revision : "—"}
                              </span>
                              {latest && getStatusBadge(latest.approvalState)}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {latestApproved ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-900">
                                  {latestApproved.revision}
                                </span>
                                {getStatusBadge("APPROVED")}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#696E82] italic">
                                — No approved revision
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Desktop Pagination */}
              <div className="p-3.5 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between text-xs text-[#696E82]">
                <span>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, filteredDrawings.length)} –{" "}
                  {Math.min(currentPage * pageSize, filteredDrawings.length)} of {filteredDrawings.length}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F2F4FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    &lt; Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-[#5A81FA] text-white"
                          : "bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F2F4FF]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F2F4FF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Cards View (< lg) */}
            <div className="lg:hidden space-y-3">
              {paginatedDrawings.map((doc) => {
                const latest = doc.latestVersion;
                const latestApproved = doc.latestApprovedVersion;

                return (
                  <div
                    key={doc.id}
                    className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#1F1F1F]">{doc.title}</h3>
                        <p className="text-xs text-[#696E82]">
                          Project: {doc.project.name} • {doc.discipline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileDetailDoc(doc)}
                        className="text-[#696E82] hover:text-[#1F1F1F] p-1"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E2E6F0]/60">
                      <div>
                        <span className="text-[10px] text-[#696E82] uppercase block font-semibold">Latest</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono font-bold text-[#1F1F1F]">{latest ? latest.revision : "—"}</span>
                          {latest && getStatusBadge(latest.approvalState)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#696E82] uppercase block font-semibold">Approved</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {latestApproved ? (
                            <>
                              <span className="font-mono font-bold text-emerald-900">{latestApproved.revision}</span>
                              {getStatusBadge("APPROVED")}
                            </>
                          ) : (
                            <span className="text-[11px] text-[#696E82] italic">— None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileDetailDoc(doc)}
                      className="w-full mt-2 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#5A81FA] text-xs font-bold rounded-xl border border-[#E2E6F0] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>View drawing →</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Desktop Drawing Details Panel */}
          {selectedDrawing && (
            <div className="hidden lg:block lg:col-span-5 bg-white border border-[#E2E6F0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
                <h3 className="text-sm font-bold text-[#1F1F1F]">Drawing details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedDrawingId("")}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
                  title="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#1F1F1F] tracking-tight">{selectedDrawing.title}</h2>
                <p className="text-xs text-[#696E82] mt-0.5">
                  Project: {selectedDrawing.project.name} • {selectedDrawing.discipline} • {selectedDrawing.documentType}
                </p>
              </div>

              {/* Comparison boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#696E82] uppercase block">Latest revision</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold font-mono text-[#1F1F1F]">{selectedDrawing.latestVersion?.revision || "—"}</span>
                    {selectedDrawing.latestVersion && getStatusBadge(selectedDrawing.latestVersion.approvalState)}
                  </div>
                  <span className="text-[10px] text-[#696E82] block truncate">
                    {selectedDrawing.latestVersion ? `Updated ${new Date(selectedDrawing.latestVersion.updatedAt || selectedDrawing.latestVersion.createdAt).toLocaleDateString()}` : "No revisions"}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Approved revision</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-900">{selectedDrawing.latestApprovedVersion?.revision || "—"}</span>
                    {selectedDrawing.latestApprovedVersion ? getStatusBadge("APPROVED") : <span className="text-[10px] text-gray-500 italic">None</span>}
                  </div>
                  <span className="text-[10px] text-emerald-700 block truncate">
                    {selectedDrawing.latestApprovedVersion ? `Approved ${new Date(selectedDrawing.latestApprovedVersion.updatedAt || selectedDrawing.latestApprovedVersion.createdAt).toLocaleDateString()}` : "No approved revision"}
                  </span>
                </div>
              </div>

              {/* Alert banner if unapproved */}
              {selectedDrawing.latestVersion?.approvalState !== "APPROVED" && (
                <div className="bg-[#FFF8E6] border border-[#FFE082] rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {selectedDrawing.latestApprovedVersion
                      ? `${selectedDrawing.latestVersion?.revision || "Latest"} is not approved. Use ${selectedDrawing.latestApprovedVersion.revision} as the approved revision.`
                      : `${selectedDrawing.latestVersion?.revision || "Latest"} is not approved. Construction holds apply.`}
                  </span>
                </div>
              )}

              {/* Sub-tabs */}
              <div className="flex items-center gap-4 border-b border-[#E2E6F0] pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDetailSubTab("history")}
                  className={`font-semibold pb-1 cursor-pointer transition-colors ${
                    detailSubTab === "history" ? "text-[#5A81FA] border-b-2 border-[#5A81FA]" : "text-[#696E82]"
                  }`}
                >
                  Revision history
                </button>
                <button
                  type="button"
                  onClick={() => setDetailSubTab("evidence")}
                  className={`font-semibold pb-1 cursor-pointer transition-colors ${
                    detailSubTab === "evidence" ? "text-[#5A81FA] border-b-2 border-[#5A81FA]" : "text-[#696E82]"
                  }`}
                >
                  Evidence
                </button>
              </div>

              {/* Tab content */}
              {detailSubTab === "history" ? (
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {selectedDrawing.versions.map((ver, idx) => (
                    <div key={ver.id} className="relative pl-6 pb-2 text-xs space-y-1">
                      {idx < selectedDrawing.versions.length - 1 && (
                        <div className="absolute left-2.5 top-3 bottom-0 w-0.5 bg-[#E2E6F0]" />
                      )}
                      <div className={`absolute left-1 top-1.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        ver.approvalState === "APPROVED" ? "bg-emerald-500" : ver.approvalState === "IN_REVIEW" ? "bg-purple-600" : "bg-slate-400"
                      }`} />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1F1F1F]">{ver.revision}</span>
                          {getStatusBadge(ver.approvalState)}
                        </div>
                        <span className="text-[11px] text-[#696E82]">{new Date(ver.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#696E82] text-xs">{ver.issuePurpose}</p>
                      {ver.approvalRequests?.some((ar) => ar.isClientApproval && ar.status === "APPROVED") && (
                        <button
                          type="button"
                          onClick={() => setDetailSubTab("evidence")}
                          className="text-[11px] text-[#5A81FA] hover:underline font-semibold block"
                        >
                          Client approval evidence recorded. View evidence →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                  {selectedDrawing.versions.flatMap(v => v.approvalRequests).length > 0 ? (
                    selectedDrawing.versions.flatMap(v => v.approvalRequests).map(req => (
                      <div key={req.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{req.isClientApproval ? "Client Approval Evidence" : "Review Approval"}</span>
                          <span className="font-mono text-[10px]">{req.status}</span>
                        </div>
                        {req.comment && <p className="text-[#696E82]">{req.comment}</p>}
                        {req.clientApprovalEvidence && <p className="text-[#1F1F1F] font-medium">Evidence: {req.clientApprovalEvidence}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#696E82] italic">No evidence recorded yet.</p>
                  )}
                </div>
              )}

              {/* Action Footer */}
              <div className="pt-3 border-t border-[#E2E6F0] space-y-2">
                {selectedDrawing.latestVersion?.approvalState === "IN_REVIEW" && (
                  (isPrivileged && selectedDrawing.latestVersion.uploaderId !== currentMembershipId) ? (
                    <button
                      type="button"
                      onClick={() => handleApproveRevision(selectedDrawing.latestVersion!.id)}
                      className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Review {selectedDrawing.latestVersion.revision}
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-800 text-center text-xs rounded-xl font-semibold">
                      Awaiting Partner Approval (Self-approval blocked)
                    </div>
                  )
                )}
                {selectedDrawing.latestVersion?.approvalState === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => handleSubmitForReview(selectedDrawing.latestVersion!.id)}
                    className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Submit {selectedDrawing.latestVersion.revision} for Review
                  </button>
                )}
                {selectedDrawing.latestVersion?.approvalState === "APPROVED" && isPrivileged && (
                  <button
                    type="button"
                    onClick={() => setClientApprovalVersion(selectedDrawing.latestVersion!)}
                    className="w-full py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Record Client Approval Evidence
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadRevisionDoc(selectedDrawing)}
                    className="flex-1 py-2 bg-[#F8F9FD] border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#696E82]" />
                    <span>Upload revision</span>
                  </button>
                  {selectedDrawing.latestVersion && (
                    <a
                      href={`/api/storage/files/${selectedDrawing.latestVersion.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                      className="flex-1 py-2 bg-[#F8F9FD] border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#696E82]" />
                      <span>Download</span>
                    </a>
                  )}
                  {selectedDrawing.latestVersion && (
                    <button
                      type="button"
                      onClick={() => openPreview(selectedDrawing.latestVersion!.fileId, `${selectedDrawing.title}_${selectedDrawing.latestVersion!.revision}.pdf`)}
                      className="p-2 bg-[#F8F9FD] border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-xl cursor-pointer"
                      title="Preview sheet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. REGISTER NEW DRAWING MODAL (R0)                   */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Register Drawing Sheet</h3>
                  <p className="text-xs text-[#696E82]">Upload initial revision (R0) to project archive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrawing} className="space-y-4 text-xs">
              {/* Project & Discipline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableDropdown
                    id="create-drawing-project"
                    label="Select Project"
                    required
                    optionType="project"
                    value={createProjectId}
                    onChange={setCreateProjectId}
                    placeholder="Select project..."
                    searchPlaceholder="Search projects..."
                    options={projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                      projectCode: p.code,
                    }))}
                  />
                </div>

                <div>
                  <SearchableDropdown
                    id="create-drawing-discipline"
                    label="Discipline / Category"
                    required
                    value={createDiscipline}
                    onChange={setCreateDiscipline}
                    placeholder="Select category..."
                    options={disciplines.map((d) => ({
                      value: d,
                      label: d,
                    }))}
                  />
                </div>
              </div>

              {/* Drawing Title & Sheet Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Drawing Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Ground Floor Masonry Layout"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Drawing Sheet Number</label>
                  <input
                    type="text"
                    value={createDrawingNumber}
                    onChange={(e) => setCreateDrawingNumber(e.target.value)}
                    placeholder="e.g. 100D-ALB-AR-001"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Document Type & Issue Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableDropdown
                    id="create-doc-type"
                    label="Document Type"
                    value={createDocumentType}
                    onChange={setCreateDocumentType}
                    placeholder="Select document type..."
                    searchable={false}
                    options={[
                      { value: "Working Drawing", label: "Working Drawing" },
                      { value: "Concept Sketch", label: "Concept Sketch" },
                      { value: "3D View", label: "3D View / Render" },
                      { value: "Permit Approval Sheet", label: "Permit Approval Sheet" },
                      { value: "Site Documentation", label: "Site Documentation" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Issue Purpose</label>
                  <input
                    type="text"
                    value={createIssuePurpose}
                    onChange={(e) => setCreateIssuePurpose(e.target.value)}
                    placeholder="e.g. For Initial Review"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* File Attachment */}
              <div className="p-4 border-2 border-dashed border-[#E2E6F0] rounded-xl bg-[#F8F9FD] space-y-2 text-center">
                <Upload className="w-6 h-6 mx-auto text-[#5A81FA]" />
                <div className="font-semibold text-[#1F1F1F]">Select Drawing Sheet File (R0)</div>
                <p className="text-[11px] text-[#696E82]">Supported formats: PDF, DWG, DXF, JPG, PNG (Max 25MB)</p>
                <input
                  type="file"
                  required
                  accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                  className="block mx-auto text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#5A81FA] file:text-white hover:file:bg-[#426EE8] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate || !createFile}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingCreate ? <span>Uploading Sheet...</span> : <span>Register Sheet (R0)</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. UPLOAD NEW REVISION MODAL (R1, R2...)             */}
      {/* ==================================================== */}
      {uploadRevisionDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Upload New Revision</h3>
                  <p className="text-xs text-[#696E82] truncate">{uploadRevisionDoc.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadRevisionDoc(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F2F4FF] border border-[#CEDEFF] rounded-xl text-xs text-[#1F1F1F] space-y-1">
              <div className="font-semibold text-[#5A81FA]">
                Revision Control Guarantee
              </div>
              <p className="text-[11px] text-[#696E82]">
                The new revision will be allocated atomically (e.g. R{uploadRevisionDoc.totalRevisions}) and starts in Draft. It never inherits previous approvals.
              </p>
            </div>

            <form onSubmit={handleUploadRevision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Issue Purpose / Reason</label>
                <input
                  type="text"
                  required
                  value={revisionIssuePurpose}
                  onChange={(e) => setRevisionIssuePurpose(e.target.value)}
                  placeholder="e.g. Revised column joinery for structural engineer feedback"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-[#E2E6F0] rounded-xl bg-[#F8F9FD] space-y-2 text-center">
                <Upload className="w-6 h-6 mx-auto text-[#5A81FA]" />
                <div className="font-semibold text-[#1F1F1F]">Attach Revised Sheet File</div>
                <input
                  type="file"
                  required
                  accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                  className="block mx-auto text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#5A81FA] file:text-white hover:file:bg-[#426EE8] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setUploadRevisionDoc(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRevision || !revisionFile}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingRevision ? <span>Uploading...</span> : <span>Allocate & Upload Revision</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. REQUEST ARCHITECTURAL CORRECTIONS MODAL           */}
      {/* ==================================================== */}
      {changeRequestVersion && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-[#1F1F1F]">Request Drawing Corrections</h3>
            </div>
            <p className="text-xs text-[#696E82]">
              Reverting revision <strong className="text-[#1F1F1F]">{changeRequestVersion.revision}</strong> back to{" "}
              <strong>Draft</strong>. Architectural correction instructions are mandatory.
            </p>

            <form onSubmit={handleRequestChanges} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Correction Instructions <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={changeComment}
                  onChange={(e) => setChangeComment(e.target.value)}
                  placeholder="e.g. Dimensions on Grid Line 3 do not match structural foundation raft drawing. Recalculate beam clearance."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setChangeRequestVersion(null)}
                  className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChanges || !changeComment.trim()}
                  className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {submittingChanges ? <span>Sending...</span> : <span>Send Changes to Drafter</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. RECORD CLIENT APPROVAL EVIDENCE MODAL             */}
      {/* ==================================================== */}
      {clientApprovalVersion && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-[#5A81FA]">
              <Award className="w-5 h-5 text-[#5A81FA]" />
              <h3 className="text-base font-bold text-[#1F1F1F]">Record Client Approval Evidence</h3>
            </div>
            <p className="text-xs text-[#696E82]">
              Recording formal client approval for exact revision{" "}
              <strong className="text-[#1F1F1F]">{clientApprovalVersion.revision}</strong>.
            </p>

            <form onSubmit={handleRecordClientApproval} className="space-y-4 text-xs">
              <div>
                <SearchableDropdown
                  id="client-approval-decision"
                  label="Decision"
                  value={clientStatus}
                  onChange={(val) => setClientStatus(val as any)}
                  searchable={false}
                  clearable={false}
                  options={[
                    { value: "APPROVED", label: "Client Approved", subLabel: "Formally signed off" },
                    { value: "REJECTED", label: "Client Rejected", subLabel: "Revision required" },
                  ]}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Evidence Reference / Note <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={clientEvidenceText}
                  onChange={(e) => setClientEvidenceText(e.target.value)}
                  placeholder="e.g. Email confirmation received from Arun Singhal on 28 Sep 2026; physical signed blueprint filed in studio archives."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Received Date</label>
                <input
                  type="date"
                  value={clientReceivedDate}
                  onChange={(e) => setClientReceivedDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setClientApprovalVersion(null)}
                  className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClientApproval || !clientEvidenceText.trim()}
                  className="px-4 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {submittingClientApproval ? <span>Saving...</span> : <span>Save Client Evidence</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. REVISION HISTORY & AUDIT DRAWER                   */}
      {/* ==================================================== */}
      {detailDrawerDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6F0] flex items-start justify-between gap-4 bg-[#F8F9FD]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                    {detailDrawerDoc.project.code}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1F1F1F] bg-[#F2F4FF] px-2 py-0.5 rounded">
                    {detailDrawerDoc.drawingNumber || "DWG"}
                  </span>
                  <span className="text-xs font-medium text-[#696E82] bg-[#F2F4FF] px-2 py-0.5 rounded">
                    {detailDrawerDoc.discipline}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight mt-1">{detailDrawerDoc.title}</h3>
                <p className="text-xs text-[#696E82]">Project: <strong>{detailDrawerDoc.project.name}</strong></p>
              </div>

              <button
                type="button"
                onClick={() => setDetailDrawerDoc(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-lg hover:bg-[#F2F4FF] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Revisions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-[#1F1F1F]">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#696E82]">
                Complete Revision History ({detailDrawerDoc.versions.length} revisions)
              </h4>

              <div className="space-y-3">
                {detailDrawerDoc.versions.map((ver, idx) => (
                  <div key={ver.id} className="p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#5A81FA] bg-white px-2 py-0.5 rounded border border-[#CEDEFF]">
                          {ver.revision}
                        </span>
                        <span className="font-semibold text-[#1F1F1F]">{ver.issuePurpose}</span>
                      </div>
                      {getStatusBadge(ver.approvalState)}
                    </div>

                    <div className="text-[11px] text-[#696E82] flex items-center justify-between">
                      <span>Issued: {new Date(ver.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPreview(ver.fileId, `${detailDrawerDoc.title}_${ver.revision}`)}
                          className="text-[#5A81FA] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <a
                          href={`/api/storage/files/${ver.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                          className="text-[#5A81FA] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>

                    {/* Review Decisions & Client Approval Logs */}
                    {ver.approvalRequests.length > 0 && (
                      <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">
                          Review Decisions & Approvals
                        </span>
                        {ver.approvalRequests.map((req) => (
                          <div
                            key={req.id}
                            className={`p-2 rounded-lg border text-[11px] ${
                              req.isClientApproval
                                ? "bg-amber-50/60 border-amber-200"
                                : req.status === "APPROVED"
                                ? "bg-emerald-50/60 border-emerald-200"
                                : req.status === "CHANGES_REQUESTED"
                                ? "bg-rose-50/60 border-rose-200"
                                : "bg-white border-[#E2E6F0]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>
                                {req.isClientApproval ? "🏆 Client Approval Evidence" : "Studio Internal Review"}
                              </span>
                              <span className="font-mono text-[10px]">{req.status}</span>
                            </div>
                            {req.comment && <p className="text-[#696E82] mt-0.5">{req.comment}</p>}
                            {req.clientApprovalEvidence && (
                              <p className="text-[#1F1F1F] font-medium mt-1">
                                Evidence: {req.clientApprovalEvidence}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex justify-end">
              <button
                type="button"
                onClick={() => setDetailDrawerDoc(null)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. SHEET PREVIEW MODAL                               */}
      {/* ==================================================== */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between bg-[#F8F9FD]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F] truncate">{previewFile.fileName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/storage/files/${previewFile.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                  className="px-3 py-1.5 bg-[#5A81FA] text-white text-xs font-semibold rounded-lg hover:bg-[#426EE8] flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#1F1F1F] overflow-hidden flex items-center justify-center p-2">
              {previewFile.isPdf ? (
                <iframe
                  src={`/api/storage/files/${previewFile.fileId}?workspaceSlug=${workspaceSlug}`}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Sheet Preview"
                />
              ) : previewFile.isImage ? (
                <img
                  src={`/api/storage/files/${previewFile.fileId}?workspaceSlug=${workspaceSlug}`}
                  alt={previewFile.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-white space-y-3 p-8">
                  <FileText className="w-12 h-12 mx-auto text-[#696E82]" />
                  <h4 className="text-sm font-semibold">CAD File Format ({previewFile.fileName.split(".").pop()?.toUpperCase()})</h4>
                  <p className="text-xs text-[#696E82] max-w-sm">
                    Direct CAD geometry editing/previewing requires AutoCAD/Revit desktop integration. Download the authorized DWG/DXF file to view on your workstation.
                  </p>
                  <a
                    href={`/api/storage/files/${previewFile.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A81FA] text-white text-xs font-semibold rounded-xl hover:bg-[#426EE8]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CAD Sheet</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
