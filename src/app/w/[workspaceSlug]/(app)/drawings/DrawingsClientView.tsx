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
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      {/* Top Filter and Search Bar */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drawings by sheet #, title, or project..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action: Register Drawing */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Drawing (R0)</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E6F0] text-xs">
          <span className="text-[#696E82] font-semibold">Filter:</span>

          {/* Project */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA] max-w-[200px]"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          {/* Discipline */}
          <select
            value={selectedDisciplineFilter}
            onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          >
            <option value="ALL">All Disciplines</option>
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          >
            <option value="ALL">All Workflow States</option>
            <option value="DRAFT">Draft Revisions</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved Deliverables</option>
          </select>

          {/* Sort By Filter (Date, Day & Alphabetical Order) */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg px-2 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5A81FA] shrink-0" />
            <select
              value={drawingSortBy}
              onChange={(e) => setDrawingSortBy(e.target.value)}
              className="bg-transparent font-medium text-[#1F1F1F] focus:outline-none cursor-pointer"
              title="Sort drawings by date day or alphabetical order"
            >
              <option value="DATE_DESC">Sort: Date (Newest First)</option>
              <option value="DATE_ASC">Sort: Date (Oldest First)</option>
              <option value="ALPHA_TITLE_ASC">Sort: Title (A → Z)</option>
              <option value="ALPHA_TITLE_DESC">Sort: Title (Z → A)</option>
              <option value="ALPHA_NUMBER_ASC">Sort: Drawing No. (A → Z)</option>
              <option value="ALPHA_NUMBER_DESC">Sort: Drawing No. (Z → A)</option>
            </select>
          </div>

          {(selectedProjectFilter !== "ALL" ||
            selectedDisciplineFilter !== "ALL" ||
            selectedStatusFilter !== "ALL" ||
            searchQuery.trim().length > 0 ||
            drawingSortBy !== "DATE_DESC") && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectFilter("ALL");
                setSelectedDisciplineFilter("ALL");
                setSelectedStatusFilter("ALL");
                setSearchQuery("");
                setDrawingSortBy("DATE_DESC");
              }}
              className="text-[#696E82] hover:text-red-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}

          <div className="text-[11px] text-[#696E82] ml-auto">
            Showing {filteredDrawings.length} of {drawings.length} drawings
          </div>
        </div>
      </div>

      {/* Drawings Cards List */}
      <div className="space-y-3">
        {filteredDrawings.length === 0 ? (
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center text-[#696E82]">
            <FileText className="w-10 h-10 mx-auto text-[#A8B1CE] mb-3" />
            <h3 className="text-sm font-semibold text-[#1F1F1F]">No architectural drawings found</h3>
            <p className="text-xs text-[#696E82] mt-1">
              Upload initial CAD sheets (R0) or change your project/discipline filter.
            </p>
          </div>
        ) : (
          filteredDrawings.map((doc) => {
            const latest = doc.latestVersion;
            const latestApproved = doc.latestApprovedVersion;
            const isUploader = latest?.uploaderId === currentMembershipId;
            const canReview = isPrivileged && !isUploader; // Strictly prevent self-approval!

            return (
              <div
                key={doc.id}
                className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-xs hover:border-[#5A81FA]/40 transition-all space-y-4"
              >
                {/* Top Row: Meta & Project */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                        {doc.project.code}
                      </span>
                      {doc.drawingNumber && (
                        <span className="font-mono text-xs font-bold text-[#1F1F1F] bg-[#F2F4FF] px-2 py-0.5 rounded">
                          {doc.drawingNumber}
                        </span>
                      )}
                      <span className="text-xs font-medium text-[#696E82] bg-[#F2F4FF] px-2 py-0.5 rounded">
                        {doc.discipline}
                      </span>
                      <span className="text-[11px] text-[#696E82]">
                        {doc.documentType}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#1F1F1F] tracking-tight">{doc.title}</h3>
                    <p className="text-xs text-[#696E82]">Project: <strong>{doc.project.name}</strong></p>
                  </div>

                  {/* Dual Revision Badges (Crucial distinction between Latest Revision and Latest Approved Revision) */}
                  <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 text-xs">
                    {/* Latest Revision Badge */}
                    <div className="flex items-center gap-1.5 bg-[#F8F9FD] px-2.5 py-1 rounded-lg border border-[#E2E6F0]">
                      <span className="text-[11px] text-[#696E82]">Latest Revision:</span>
                      <span className="font-mono font-bold text-[#1F1F1F]">
                        {latest ? latest.revision : "None"}
                      </span>
                      {latest && getStatusBadge(latest.approvalState)}
                    </div>

                    {/* Latest Approved Revision Badge */}
                    <div className="flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <span className="text-[11px] text-emerald-800">Latest Approved:</span>
                      {latestApproved ? (
                        <span className="font-mono font-bold text-emerald-900">
                          {latestApproved.revision} ✔
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#696E82] italic">No approved revision yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Latest Revision Context & Action Controls */}
                {latest && (
                  <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#5A81FA]">
                          {latest.revision}
                        </span>
                        <span className="text-[#696E82] font-medium">— {latest.issuePurpose}</span>
                        <span className="text-[#696E82] text-[11px]">
                          (Uploaded {new Date(latest.createdAt).toLocaleDateString()})
                        </span>
                      </div>

                      {/* Client Approval Status for Latest Approved */}
                      {latestApproved?.approvalRequests.some((ar) => ar.isClientApproval && ar.status === "APPROVED") && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <Award className="w-3.5 h-3.5" />
                          <span>Client Approved (Evidence Recorded)</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for this Drawing */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Preview Button */}
                      <button
                        onClick={() => openPreview(latest.fileId, `${doc.title}_${latest.revision}.pdf`)}
                        className="px-2.5 py-1.5 bg-white border border-[#E2E6F0] text-[#1F1F1F] font-semibold rounded-lg hover:bg-[#F2F4FF] cursor-pointer flex items-center gap-1"
                        title="Preview sheet"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#696E82]" />
                        <span>Preview</span>
                      </button>

                      {/* Download Button */}
                      <a
                        href={`/api/storage/files/${latest.fileId}?download=true&workspaceSlug=${workspaceSlug}`}
                        className="px-2.5 py-1.5 bg-white border border-[#E2E6F0] text-[#1F1F1F] font-semibold rounded-lg hover:bg-[#F2F4FF] cursor-pointer flex items-center gap-1"
                        title="Download private file safely"
                      >
                        <Download className="w-3.5 h-3.5 text-[#696E82]" />
                        <span>Download</span>
                      </a>

                      {/* Workflow Step 1: Submit Draft for Review */}
                      {latest.approvalState === "DRAFT" && (isUploader || isPrivileged) && (
                        <>
                          <button
                            onClick={() => handleSubmitForReview(latest.id)}
                            className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Submit Review</span>
                          </button>

                          {doc.versions.length === 1 && (
                            <button
                              onClick={() => handleDeleteDraft(latest.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete unsubmitted draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Workflow Step 2: Withdraw Draft if in review and unreviewed */}
                      {latest.approvalState === "IN_REVIEW" && (isUploader || isPrivileged) && (
                        <button
                          onClick={() => handleWithdrawSubmission(latest.id)}
                          className="px-2.5 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-lg border border-[#E2E6F0] cursor-pointer flex items-center gap-1"
                          title="Withdraw submission back to draft"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Withdraw</span>
                        </button>
                      )}

                      {/* Workflow Step 3: Approve / Request Changes (Privileged Only & NO SELF-APPROVAL!) */}
                      {latest.approvalState === "IN_REVIEW" && isPrivileged && (
                        <>
                          {canReview ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApproveRevision(latest.id)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setChangeRequestVersion(latest)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                <span>Changes</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                              Awaiting another partner approval (Self-approval blocked)
                            </div>
                          )}
                        </>
                      )}

                      {/* Record Client Approval (Owner / Admin only) */}
                      {isPrivileged && latest.approvalState === "APPROVED" && (
                        <button
                          onClick={() => setClientApprovalVersion(latest)}
                          className="px-2.5 py-1.5 bg-[#F2F4FF] hover:bg-[#E7EBD5] text-[#5A81FA] border border-[#CEDEFF] font-semibold rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Record Client Evidence</span>
                        </button>
                      )}

                      {/* Upload Next Revision (R1, R2...) */}
                      <button
                        onClick={() => setUploadRevisionDoc(doc)}
                        className="px-2.5 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#1F1F1F] font-semibold rounded-lg border border-[#E2E6F0] cursor-pointer flex items-center gap-1"
                        title="Upload revised CAD/PDF sheet"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#696E82]" />
                        <span>Upload Revision</span>
                      </button>

                      {/* View Full Revision History Drawer */}
                      <button
                        onClick={() => setDetailDrawerDoc(doc)}
                        className="p-1.5 hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                        title="View revision history & approval log"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Select Project <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Discipline / Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={createDiscipline}
                    onChange={(e) => setCreateDiscipline(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  >
                    {disciplines.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
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
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Document Type</label>
                  <select
                    value={createDocumentType}
                    onChange={(e) => setCreateDocumentType(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  >
                    <option value="Working Drawing">Working Drawing</option>
                    <option value="Concept Sketch">Concept Sketch</option>
                    <option value="3D View">3D View / Render</option>
                    <option value="Permit Approval Sheet">Permit Approval Sheet</option>
                    <option value="Site Documentation">Site Documentation</option>
                  </select>
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
                <label className="block font-semibold text-[#1F1F1F] mb-1">Decision</label>
                <select
                  value={clientStatus}
                  onChange={(e) => setClientStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                >
                  <option value="APPROVED">Client Approved</option>
                  <option value="REJECTED">Client Rejected</option>
                </select>
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
