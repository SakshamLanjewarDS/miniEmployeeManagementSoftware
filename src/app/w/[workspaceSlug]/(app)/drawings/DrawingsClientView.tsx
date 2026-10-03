"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  RotateCcw,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  SlidersHorizontal,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  FileCheck2,
  Menu,
  Bell,
  User,
  Smartphone,
  Tablet,
  Monitor,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileDown,
  FolderKanban,
  Receipt,
  Users,
  Wrench,
  Briefcase,
  MapPin,
  Calendar,
  ArrowLeft,
  MoreVertical,
  RefreshCw,
  FileSpreadsheet,
  LogOut,
  Compass,
  AlertTriangle,
  Folder,
} from "lucide-react";

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

  // Mode: Empty state (matching reference screenshot) vs. Illustrative Populated state
  const [viewMode, setViewMode] = useState<"reference-empty" | "populated-example">("reference-empty");
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals and Drawers
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailDrawerDoc, setDetailDrawerDoc] = useState<DrawingItem | null>(null);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [isCadViewerOpen, setIsCadViewerOpen] = useState(false);
  const [viewerScale, setViewerScale] = useState(1);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  // Secondary Workflows
  const [uploadRevisionDoc, setUploadRevisionDoc] = useState<DrawingItem | null>(null);
  const [changeRequestVersion, setChangeRequestVersion] = useState<DrawingVersionItem | null>(null);
  const [clientApprovalVersion, setClientApprovalVersion] = useState<DrawingVersionItem | null>(null);

  // Form states
  const [createProjectId, setCreateProjectId] = useState<string>(projects[0]?.id || "prj-1");
  const [createTitle, setCreateTitle] = useState("");
  const [createDrawingNumber, setCreateDrawingNumber] = useState("");
  const [createDiscipline, setCreateDiscipline] = useState("Architectural");
  const [createDocumentType, setCreateDocumentType] = useState("Working Drawing");
  const [createIssuePurpose, setCreateIssuePurpose] = useState("For Initial Review");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [formValidationErrors, setFormValidationErrors] = useState<{ [key: string]: string }>({});

  // Revision Form State
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

  // Pre-configured Disciplines from Studio Scope
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

  // Illustrative sample architectural drawings for populated state proposal
  const samplePopulatedDrawings: DrawingItem[] = useMemo(() => [
    {
      id: "doc-sample-1",
      projectId: projects[0]?.id || "prj-1",
      project: {
        id: projects[0]?.id || "prj-1",
        code: projects[0]?.code || "HZ-2026",
        name: projects[0]?.name || "Horizon Towers Luxury Residence",
      },
      taskId: "task-101",
      title: "Ground Floor General Arrangement Plan",
      drawingNumber: "A-101",
      discipline: "Architectural",
      documentType: "Working Drawing",
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      totalRevisions: 2,
      latestVersion: {
        id: "ver-1-r1",
        documentId: "doc-sample-1",
        revision: "R1",
        fileId: "file-r1-pdf",
        uploaderId: currentMembershipId,
        issuePurpose: "Incorporated structural grid offsets & revised stair cores",
        approvalState: "IN_REVIEW",
        supersededById: null,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        approvalRequests: [
          {
            id: "appr-1",
            status: "PENDING",
            requesterId: currentMembershipId,
            reviewerId: null,
            comment: "Submitted for Studio Lead Partner sign-off",
            isClientApproval: false,
            clientApprovalEvidence: null,
            clientApprovalReceivedDate: null,
            decidedAt: null,
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
        ],
      },
      latestApprovedVersion: {
        id: "ver-1-r0",
        documentId: "doc-sample-1",
        revision: "R0",
        fileId: "file-r0-pdf",
        uploaderId: currentMembershipId,
        issuePurpose: "Initial concept design & baseline arrangement",
        approvalState: "APPROVED",
        supersededById: "ver-1-r1",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        approvalRequests: [
          {
            id: "appr-0",
            status: "APPROVED",
            requesterId: currentMembershipId,
            reviewerId: "admin-1",
            comment: "Approved by Saksham Lanjewar (Studio Principal)",
            isClientApproval: true,
            clientApprovalEvidence: "Client Sign-off Email dated 28 Sept 2026",
            clientApprovalReceivedDate: "2026-09-28",
            decidedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
      },
      versions: [
        {
          id: "ver-1-r1",
          documentId: "doc-sample-1",
          revision: "R1",
          fileId: "file-r1-pdf",
          uploaderId: currentMembershipId,
          issuePurpose: "Incorporated structural grid offsets & revised stair cores",
          approvalState: "IN_REVIEW",
          supersededById: null,
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          approvalRequests: [],
        },
        {
          id: "ver-1-r0",
          documentId: "doc-sample-1",
          revision: "R0",
          fileId: "file-r0-pdf",
          uploaderId: currentMembershipId,
          issuePurpose: "Initial concept design & baseline arrangement",
          approvalState: "APPROVED",
          supersededById: "ver-1-r1",
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          approvalRequests: [],
        },
      ],
    },
    {
      id: "doc-sample-2",
      projectId: projects[0]?.id || "prj-1",
      project: {
        id: projects[0]?.id || "prj-1",
        code: projects[0]?.code || "HZ-2026",
        name: projects[0]?.name || "Horizon Towers Luxury Residence",
      },
      taskId: "task-102",
      title: "Column Schedule & Foundation Footing Details",
      drawingNumber: "S-201",
      discipline: "Structural",
      documentType: "Working Drawing",
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      totalRevisions: 1,
      latestVersion: {
        id: "ver-2-r0",
        documentId: "doc-sample-2",
        revision: "R0",
        fileId: "file-s201-pdf",
        uploaderId: "emp-struct",
        issuePurpose: "Issued for Good For Construction (GFC) excavation",
        approvalState: "APPROVED",
        supersededById: null,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        approvalRequests: [],
      },
      latestApprovedVersion: {
        id: "ver-2-r0",
        documentId: "doc-sample-2",
        revision: "R0",
        fileId: "file-s201-pdf",
        uploaderId: "emp-struct",
        issuePurpose: "Issued for Good For Construction (GFC) excavation",
        approvalState: "APPROVED",
        supersededById: null,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        approvalRequests: [],
      },
      versions: [
        {
          id: "ver-2-r0",
          documentId: "doc-sample-2",
          revision: "R0",
          fileId: "file-s201-pdf",
          uploaderId: "emp-struct",
          issuePurpose: "Issued for Good For Construction (GFC) excavation",
          approvalState: "APPROVED",
          supersededById: null,
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          approvalRequests: [],
        },
      ],
    },
    {
      id: "doc-sample-3",
      projectId: projects[1]?.id || "prj-2",
      project: {
        id: projects[1]?.id || "prj-2",
        code: projects[1]?.code || "TEST-PRJ-01",
        name: projects[1]?.name || "Test Site Alpha",
      },
      taskId: null,
      title: "HVAC Ducting & Chilled Water Riser Schematics",
      drawingNumber: "M-301",
      discipline: "MEP",
      documentType: "Schematic",
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      totalRevisions: 1,
      latestVersion: {
        id: "ver-3-r0",
        documentId: "doc-sample-3",
        revision: "R0",
        fileId: "file-m301-pdf",
        uploaderId: currentMembershipId,
        issuePurpose: "Preliminary MEP coordination draft",
        approvalState: "DRAFT",
        supersededById: null,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        approvalRequests: [],
      },
      latestApprovedVersion: null,
      versions: [
        {
          id: "ver-3-r0",
          documentId: "doc-sample-3",
          revision: "R0",
          fileId: "file-m301-pdf",
          uploaderId: currentMembershipId,
          issuePurpose: "Preliminary MEP coordination draft",
          approvalState: "DRAFT",
          supersededById: null,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          approvalRequests: [],
        },
      ],
    },
    {
      id: "doc-sample-4",
      projectId: projects[1]?.id || "prj-2",
      project: {
        id: projects[1]?.id || "prj-2",
        code: projects[1]?.code || "TEST-PRJ-01",
        name: projects[1]?.name || "Test Site Alpha",
      },
      taskId: null,
      title: "Executive Suite Millwork & Joinery Details",
      drawingNumber: "ID-405",
      discipline: "Interior",
      documentType: "Working Drawing",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      totalRevisions: 3,
      latestVersion: {
        id: "ver-4-r2",
        documentId: "doc-sample-4",
        revision: "R2",
        fileId: "file-id405-pdf",
        uploaderId: currentMembershipId,
        issuePurpose: "Client-approved joinery spec with veneer revisions",
        approvalState: "APPROVED",
        supersededById: null,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        approvalRequests: [],
      },
      latestApprovedVersion: {
        id: "ver-4-r2",
        documentId: "doc-sample-4",
        revision: "R2",
        fileId: "file-id405-pdf",
        uploaderId: currentMembershipId,
        issuePurpose: "Client-approved joinery spec with veneer revisions",
        approvalState: "APPROVED",
        supersededById: null,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        approvalRequests: [],
      },
      versions: [
        {
          id: "ver-4-r2",
          documentId: "doc-sample-4",
          revision: "R2",
          fileId: "file-id405-pdf",
          uploaderId: currentMembershipId,
          issuePurpose: "Client-approved joinery spec with veneer revisions",
          approvalState: "APPROVED",
          supersededById: null,
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          approvalRequests: [],
        },
      ],
    },
  ], [projects, currentMembershipId]);

  // Source pool based on toggle
  const activeDataset: DrawingItem[] = useMemo(() => {
    if (viewMode === "reference-empty") {
      return initialDrawings; // Matches the reference screenshot with 0 drawings
    }
    return samplePopulatedDrawings;
  }, [viewMode, initialDrawings, samplePopulatedDrawings]);

  // Filtered dataset
  const filteredDrawings = useMemo(() => {
    return activeDataset.filter((doc) => {
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
    });
  }, [activeDataset, selectedProjectFilter, selectedDisciplineFilter, selectedStatusFilter, searchQuery]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProjectFilter !== "ALL") count++;
    if (selectedDisciplineFilter !== "ALL") count++;
    if (selectedStatusFilter !== "ALL") count++;
    return count;
  }, [selectedProjectFilter, selectedDisciplineFilter, selectedStatusFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedProjectFilter("ALL");
    setSelectedDisciplineFilter("ALL");
    setSelectedStatusFilter("ALL");
    setSearchQuery("");
  };

  // Upload file helper
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

  // Register Drawing Submit
  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!createProjectId) errors.project = "Please select an architectural project";
    if (!createTitle.trim()) errors.title = "Drawing title is required";
    if (!createFile && viewMode !== "populated-example") errors.file = "Please attach a drawing file (PDF/DWG/CAD)";

    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      return;
    }

    setSubmittingCreate(true);
    setErrorMessage(null);
    setFormValidationErrors({});

    try {
      let fileId = "provisional-storage-id";
      if (createFile) {
        fileId = await uploadFileToStorage(createFile);
      }

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
        setSuccessMessage(`Drawing "${createTitle}" registered with atomic revision R0.`);
        setIsCreateModalOpen(false);
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

  // Upload New Revision Submit (R1, R2...)
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

  // Approve Revision
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

  // Helper for Status Pills
  const getStatusBadge = (state: string) => {
    switch (state) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>Approved</span>
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span>Superseded</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
            <span>Draft (R0)</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-[#F8F9FD] min-h-screen text-[#0F172A] font-sans antialiased pb-24 md:pb-12">
      {/* ==================================================== */}
      {/* TOP EXECUTIVE DESIGN TOOLBAR                         */}
      {/* Viewport switcher & interactive mode triggers        */}
      {/* ==================================================== */}
      <aside aria-label="Executive Design Controls" className="sticky top-0 z-40 bg-[#0B122B] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewportMode("mobile")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "mobile"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone 390px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("tablet")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "tablet"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet 768px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "desktop"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Auto</span>
            </button>
          </div>

          {/* Quick Mockup State Triggers */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "reference-empty" ? "populated-example" : "reference-empty")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                viewMode === "reference-empty"
                  ? "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-indigo-600/90 hover:bg-indigo-500 text-white border-indigo-500"
              }`}
            >
              <span>{viewMode === "reference-empty" ? "Mode: 0 Drawings (Screenshot)" : "Mode: Populated Example"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Filters Sheet
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-2 py-1 bg-[#4865F6] hover:bg-[#3B54DF] text-white rounded-md text-[11px] font-semibold border border-indigo-400 shrink-0"
            >
              + Register (R0)
            </button>

            <button
              type="button"
              onClick={() => {
                setDetailDrawerDoc(samplePopulatedDrawings[0]);
                setActiveRevisionId(samplePopulatedDrawings[0].latestVersion?.id || null);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Details / Revisions
            </button>

            <button
              type="button"
              onClick={() => setIsCadViewerOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              CAD Viewer
            </button>

            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Nav Drawer
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* RESPONSIVE CONTAINER WRAPPER                         */}
      {/* Adapts to 390px, 768px, or Desktop Auto             */}
      {/* ==================================================== */}
      <div
        className={`mx-auto transition-all duration-300 ${
          viewportMode === "mobile"
            ? "max-w-[420px] bg-white border-x border-[#E2E6F0] shadow-xl my-0 sm:my-4 rounded-none sm:rounded-3xl overflow-hidden"
            : viewportMode === "tablet"
            ? "max-w-[768px] bg-white border-x border-[#E2E6F0] shadow-xl my-0 sm:my-4 rounded-none sm:rounded-3xl overflow-hidden"
            : "max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
        }`}
      >
        {/* ==================================================== */}
        {/* 1. COMPACT APPLICATION HEADER                        */}
        {/* ==================================================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E6F0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0B122B] text-white flex items-center justify-center font-black text-xs tracking-tight shadow-xs">
                100%
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-sm text-[#0F172A] tracking-tight">100% DESIGN Studio</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtle Site Check-in action (non-competing) */}
            <Link
              href={`/w/${workspaceSlug}/visits`}
              title="Site Visits & GPS Check-In"
              className="w-8 h-8 rounded-lg bg-[#F8F9FD] border border-[#E2E6F0] text-slate-600 hover:text-[#4865F6] flex items-center justify-center transition-colors"
            >
              <MapPin className="w-4 h-4" />
            </Link>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative w-8 h-8 rounded-lg bg-[#F8F9FD] border border-[#E2E6F0] text-slate-600 hover:text-[#0F172A] flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {/* Profile Avatar */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-[#4865F6] text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer"
            >
              SL
            </button>
          </div>
        </header>

        {/* ==================================================== */}
        {/* MAIN BODY AREA                                       */}
        {/* ==================================================== */}
        <main className="p-4 sm:p-5 space-y-4">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 2. PAGE HEADING & SHORT DESCRIPTION */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4865F6] uppercase tracking-wider">
                <Folder className="w-3 h-3" />
                <span>STUDIO BLUEPRINT ARCHIVE</span>
                <span>•</span>
                <span>REVISION CONTROL</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>R0-R(n) Guarded</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] leading-snug">
              Drawing & Blueprint Library
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Architectural drawings, revisions, and approval records.
            </p>
          </div>

          {/* 3. PRIMARY ACTION: REGISTER DRAWING (R0) */}
          <div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full py-3 px-4 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Register Drawing (R0)</span>
            </button>
          </div>

          {/* 4. SEARCH FIELD */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sheet #, title, or project…"
              className="w-full pl-10 pr-9 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 5. FILTER CONTROL & RESULT COUNT */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? "bg-[#4865F6] text-white border-[#4865F6] shadow-2xs"
                  : "bg-white text-slate-700 border-[#E2E6F0] hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#4865F6] font-bold text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="text-[11px] font-medium text-slate-500">
              Showing {filteredDrawings.length} of {activeDataset.length} drawings
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedProjectFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                  Project: {projects.find((p) => p.id === selectedProjectFilter)?.code || selectedProjectFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedProjectFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDisciplineFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                  Discipline: {selectedDisciplineFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedDisciplineFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedStatusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                  Status: {selectedStatusFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter("ALL")}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-rose-600 hover:underline px-1.5 py-0.5"
              >
                Clear All
              </button>
            </div>
          )}

          {/* ==================================================== */}
          {/* 6. DRAWING RESULTS OR EMPTY STATE                    */}
          {/* ==================================================== */}
          <div className="space-y-3 pt-2">
            {/* SCREEN 1: Primary Mockup matching reference screenshot (0 drawings in library) */}
            {activeDataset.length === 0 ? (
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 sm:p-10 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F4F5FB] border border-[#E2E6F0] text-[#4865F6] flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-8 h-8 stroke-[1.5]" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                    No architectural drawings found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Register your first drawing to start tracking revisions and approvals.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Register Drawing (R0)</span>
                  </button>
                </div>
              </div>
            ) : filteredDrawings.length === 0 ? (
              /* SCREEN 3: No Matching Results State */
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 text-center shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    No drawings match your filters
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {searchQuery
                      ? `We couldn't find any architectural sheets matching "${searchQuery}".`
                      : "No drawings match your selected filter criteria."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 bg-[#4865F6] text-white text-xs font-semibold rounded-xl"
                  >
                    Clear Filters
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* SCREEN 4: Populated Drawing Library — Proposed Supporting State */
              <div className="space-y-3">
                {/* Proposed Badge notice */}
                <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold">Proposed Populated Specification</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-mono">Illustrative</span>
                </div>

                {filteredDrawings.map((doc) => {
                  const latest = doc.latestVersion;
                  const latestApproved = doc.latestApprovedVersion;

                  return (
                    <div
                      key={doc.id}
                      className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-xs hover:border-[#4865F6]/40 transition-all space-y-3"
                    >
                      {/* Top Row: Sheet Number, Discipline & Quick Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {doc.drawingNumber && (
                            <span className="font-mono text-xs font-black text-[#4865F6] bg-[#F2F4FF] px-2 py-0.5 rounded-md border border-[#D5DFFC]">
                              {doc.drawingNumber}
                            </span>
                          )}
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {doc.project.code}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {doc.discipline}
                          </span>
                        </div>

                        {/* Overflow Menu trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Quick Dropdown Menu */}
                          {activeMenuDocId === doc.id && (
                            <div className="absolute right-0 top-7 z-20 w-44 bg-white border border-[#E2E6F0] rounded-xl shadow-lg py-1 text-xs animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailDrawerDoc(doc);
                                  setActiveRevisionId(latest?.id || null);
                                  setActiveMenuDocId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#4865F6]" />
                                <span>Inspect Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setIsCadViewerOpen(true);
                                  setActiveMenuDocId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                              >
                                <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View Blueprint</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setUploadRevisionDoc(doc);
                                  setActiveMenuDocId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                              >
                                <Upload className="w-3.5 h-3.5 text-purple-600" />
                                <span>Upload Revision (R{doc.totalRevisions})</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              <a
                                href={`/api/storage/${latest?.fileId}/download`}
                                download
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>Download File</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Project Name */}
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailDrawerDoc(doc);
                            setActiveRevisionId(latest?.id || null);
                          }}
                          className="text-left font-bold text-sm sm:text-base text-[#0F172A] hover:text-[#4865F6] transition-colors leading-snug"
                        >
                          {doc.title}
                        </button>
                        <p className="text-[11px] text-slate-500 truncate">
                          Project: <strong className="text-slate-700">{doc.project.name}</strong>
                        </p>
                      </div>

                      {/* Dual Revision Badges (Crucial distinction between Latest Revision and Latest Approved) */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        {/* Latest Revision Box */}
                        <div className="p-2 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Latest Version
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900">
                              {latest ? latest.revision : "None"}
                            </span>
                            {latest && getStatusBadge(latest.approvalState)}
                          </div>
                        </div>

                        {/* Latest Approved Revision Box */}
                        <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                            Approved Baseline
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-950">
                              {latestApproved ? `${latestApproved.revision} ✔` : "None"}
                            </span>
                            <span className="text-[10px] font-medium text-emerald-700">
                              {latestApproved ? "Sign-off" : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="text-[11px] text-slate-400">
                          {doc.totalRevisions} {doc.totalRevisions === 1 ? "revision" : "revisions"} logged
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCadViewerOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDetailDrawerDoc(doc);
                              setActiveRevisionId(latest?.id || null);
                            }}
                            className="px-3 py-1 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ==================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR                         */}
        {/* ==================================================== */}
        <nav aria-label="Mobile Navigation" className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2E6F0] px-4 py-2 flex items-center justify-around text-[10px] text-slate-500 md:hidden">
          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tasks</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <FolderKanban className="w-4 h-4" />
            <span>Projects</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/visits`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <MapPin className="w-4 h-4" />
            <span>Site Visits</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/drawings`}
            className="flex flex-col items-center gap-1 py-1 text-[#4865F6] font-bold"
          >
            <FileCheck2 className="w-4 h-4 stroke-[2.5]" />
            <span>Drawings</span>
            <span className="w-1 h-1 rounded-full bg-[#4865F6]"></span>
          </Link>

          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* ==================================================== */}
      {/* 2. FILTER BOTTOM SHEET MODAL                         */}
      {/* ==================================================== */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4865F6]" />
                <h3 className="font-bold text-sm text-[#0F172A]">Filter Drawings & Blueprints</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Project Filter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Project Scope</label>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                >
                  <option value="ALL">All Projects ({projects.length})</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discipline Filter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Discipline</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDisciplineFilter("ALL")}
                    className={`p-2 rounded-xl border text-left font-medium transition-all ${
                      selectedDisciplineFilter === "ALL"
                        ? "bg-[#4865F6] text-white border-[#4865F6]"
                        : "bg-[#F8F9FD] text-slate-700 border-[#E2E6F0]"
                    }`}
                  >
                    All Disciplines
                  </button>
                  {disciplines.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDisciplineFilter(d)}
                      className={`p-2 rounded-xl border text-left font-medium transition-all truncate ${
                        selectedDisciplineFilter === d
                          ? "bg-[#4865F6] text-white border-[#4865F6]"
                          : "bg-[#F8F9FD] text-slate-700 border-[#E2E6F0]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow State Filter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Workflow State</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                >
                  <option value="ALL">All Workflow States</option>
                  <option value="DRAFT">Draft Revisions (Working)</option>
                  <option value="IN_REVIEW">In Review (Pending Partner Sign-off)</option>
                  <option value="APPROVED">Approved Deliverables (GFC)</option>
                  <option value="SUPERSEDED">Superseded Historic Versions</option>
                </select>
              </div>
            </div>

            {/* Sheet Footer Sticky Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl sm:rounded-b-2xl flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl shadow-xs text-center"
              >
                Apply Filters ({filteredDrawings.length} Matches)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. REGISTER DRAWING (R0) FORM SCREEN/SHEET           */}
      {/* Marked clearly as provisional mobile field layout    */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4865F6] uppercase tracking-wider">
                  <span>ATOMIC REVISION R0</span>
                  <span>•</span>
                  <span>PROVISIONAL LAYOUT</span>
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Register Architectural Drawing</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDrawing} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Provisional Notice */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
                <strong>Provisional Form Specification:</strong> Uploading registers initial baseline <strong>Revision R0</strong>. Internal partner review or client sign-off is logged in subsequent revision gates.
              </div>

              {/* Project Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Assigned Architectural Project *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Required</span>
                </label>
                <select
                  value={createProjectId}
                  onChange={(e) => setCreateProjectId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
                {formValidationErrors.project && (
                  <p className="text-[11px] text-rose-600">{formValidationErrors.project}</p>
                )}
              </div>

              {/* Sheet Number & Discipline Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Sheet / Drawing #</label>
                  <input
                    type="text"
                    value={createDrawingNumber}
                    onChange={(e) => setCreateDrawingNumber(e.target.value)}
                    placeholder="e.g. A-101, S-201"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-mono font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Discipline</label>
                  <select
                    value={createDiscipline}
                    onChange={(e) => setCreateDiscipline(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                  >
                    {disciplines.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drawing Title */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Drawing Title *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Required</span>
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Ground Floor General Arrangement Plan"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
                {formValidationErrors.title && (
                  <p className="text-[11px] text-rose-600">{formValidationErrors.title}</p>
                )}
              </div>

              {/* Document Type & Purpose */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Document Type</label>
                  <select
                    value={createDocumentType}
                    onChange={(e) => setCreateDocumentType(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                  >
                    <option value="Working Drawing">Working Drawing</option>
                    <option value="Tender Drawing">Tender Drawing</option>
                    <option value="Schematic">Schematic</option>
                    <option value="Concept Blueprint">Concept Blueprint</option>
                    <option value="Good for Construction (GFC)">Good for Construction (GFC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Issue Purpose</label>
                  <input
                    type="text"
                    value={createIssuePurpose}
                    onChange={(e) => setCreateIssuePurpose(e.target.value)}
                    placeholder="e.g. For Initial Review"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                  />
                </div>
              </div>

              {/* Prominent Browse Files Control (Mobile Friendly, No Drag & Drop required) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Attach Architectural Sheet File</span>
                  <span className="text-[10px] text-slate-400 font-mono">PDF, DWG, DXF, PNG</span>
                </label>

                <div className="border-2 border-dashed border-[#CEDEFF] rounded-2xl p-4 bg-[#F8F9FD] text-center space-y-2">
                  <input
                    type="file"
                    id="file-input-mobile"
                    onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {createFile ? (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate text-xs">{createFile.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(createFile.size / 1024 / 1024).toFixed(2)} MB • Ready for audit upload
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateFile(null)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="w-10 h-10 rounded-full bg-[#EBF0FF] text-[#4865F6] flex items-center justify-center mx-auto mb-1.5">
                        <Upload className="w-5 h-5" />
                      </div>
                      <label
                        htmlFor="file-input-mobile"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#E2E6F0] hover:border-[#4865F6] text-[#4865F6] font-bold text-xs rounded-xl shadow-2xs cursor-pointer transition-all"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Browse Files on Device</span>
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Single-tap selection supported for field tablets</p>
                    </div>
                  )}
                </div>
                {formValidationErrors.file && (
                  <p className="text-[11px] text-rose-600">{formValidationErrors.file}</p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 -mx-4 -mb-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 rounded-b-3xl sm:rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Storing...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Register Drawing (R0)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. DRAWING DETAILS & REVISION HISTORY DRAWER         */}
      {/* ==================================================== */}
      {detailDrawerDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDetailDrawerDoc(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#4865F6] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Library</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailDrawerDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Document Header */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {detailDrawerDoc.drawingNumber && (
                    <span className="font-mono text-xs font-black text-[#4865F6] bg-[#F2F4FF] px-2.5 py-0.5 rounded-md border border-[#D5DFFC]">
                      {detailDrawerDoc.drawingNumber}
                    </span>
                  )}
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {detailDrawerDoc.project.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    {detailDrawerDoc.discipline}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  {detailDrawerDoc.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Project: <strong className="text-slate-800">{detailDrawerDoc.project.name}</strong>
                </p>
              </div>

              {/* Revision Tabs */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Revision to Inspect
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {detailDrawerDoc.versions.map((ver) => (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => setActiveRevisionId(ver.id)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        activeRevisionId === ver.id
                          ? "bg-[#4865F6] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{ver.revision}</span>
                      {ver.approvalState === "APPROVED" && <span>✔</span>}
                      {ver.approvalState === "IN_REVIEW" && <span>⏳</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Container Simulation */}
              <div className="border border-[#E2E6F0] rounded-2xl overflow-hidden bg-slate-900 text-white p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4865F6]" />
                    <span className="font-mono font-bold">CAD Sheet Preview</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCadViewerOpen(true)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Fullscreen</span>
                  </button>
                </div>

                {/* Blueprint graphic preview */}
                <div
                  onClick={() => setIsCadViewerOpen(true)}
                  className="h-44 bg-[#091B33] rounded-xl border border-blue-900/50 flex flex-col items-center justify-center p-3 relative cursor-pointer group"
                >
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                  <Compass className="w-10 h-10 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-mono font-semibold text-cyan-200 text-center">
                    {detailDrawerDoc.drawingNumber || "A-101"} • REV {detailDrawerDoc.latestVersion?.revision || "R0"}
                  </p>
                  <p className="text-[10px] text-slate-400">Tap to inspect vector floorplan & dimensions</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Format: PDF / High-Res Vector</span>
                  <a
                    href={`/api/storage/${detailDrawerDoc.latestVersion?.fileId}/download`}
                    download
                    className="text-[#4865F6] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </a>
                </div>
              </div>

              {/* Revision History Timeline */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#4865F6]" />
                  <span>Revision Audit Trail</span>
                </h3>

                <div className="space-y-2.5">
                  {detailDrawerDoc.versions.map((ver, idx) => (
                    <div
                      key={ver.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {ver.revision}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {getStatusBadge(ver.approvalState)}
                      </div>

                      <p className="text-xs text-slate-700 leading-snug">
                        {ver.issuePurpose || "Issued for review"}
                      </p>

                      {/* Approval Evidence */}
                      {ver.approvalRequests.length > 0 && ver.approvalRequests[0].isClientApproval && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-0.5 mt-1">
                          <div className="font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Client Approval Verified</span>
                          </div>
                          <p className="text-[10px] text-emerald-800">
                            {ver.approvalRequests[0].clientApprovalEvidence}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Sticky Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadRevisionDoc(detailDrawerDoc);
                  setDetailDrawerDoc(null);
                }}
                className="flex-1 py-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-2xs text-center flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Rev R{detailDrawerDoc.totalRevisions}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCadViewerOpen(true)}
                className="flex-1 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl shadow-xs text-center flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Blueprint</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. FULLSCREEN CAD / BLUEPRINT VIEWER MODAL           */}
      {/* ==================================================== */}
      {isCadViewerOpen && (
        <div className="fixed inset-0 z-50 bg-[#060D1E] text-white flex flex-col">
          {/* Top Bar */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4865F6] flex items-center justify-center font-mono font-bold text-xs">
                CAD
              </div>
              <div>
                <p className="text-xs font-bold">Ground Floor Arrangement Plan</p>
                <p className="text-[10px] text-slate-400 font-mono">Sheet A-101 • Rev R1</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewerScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewerScale(1)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-mono text-[10px]"
              >
                {(viewerScale * 100).toFixed(0)}%
              </button>
              <button
                type="button"
                onClick={() => setViewerScale((s) => Math.min(2.5, s + 0.2))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCadViewerOpen(false)}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Blueprint Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
            <div
              style={{ transform: `scale(${viewerScale})`, transformOrigin: "center center" }}
              className="w-[360px] sm:w-[600px] h-[480px] sm:h-[650px] bg-[#0A192F] border-2 border-blue-500/40 rounded-xl relative shadow-2xl transition-transform duration-100 flex flex-col justify-between p-4"
            >
              {/* Architectural Grid pattern */}
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              {/* Title block */}
              <div className="relative z-10 flex justify-between border-b border-blue-400/40 pb-2">
                <div>
                  <h4 className="font-bold text-xs text-blue-200">100% DESIGN STUDIO</h4>
                  <p className="text-[10px] text-blue-400">ARCHITECTURAL DESIGN PRACTICE • KOLKATA</p>
                </div>
                <div className="text-right font-mono text-[10px] text-blue-300">
                  <p>SCALE: 1:100</p>
                  <p>DATE: 03-OCT-2026</p>
                </div>
              </div>

              {/* Blueprint Layout Drawing SVG Simulation */}
              <div className="relative z-10 flex-1 flex items-center justify-center my-4">
                <svg className="w-full h-full max-h-[360px]" viewBox="0 0 400 300" fill="none" stroke="#38bdf8" strokeWidth="1.5">
                  {/* Outer Wall Boundary */}
                  <rect x="30" y="30" width="340" height="240" stroke="#38bdf8" strokeWidth="2.5" />
                  {/* Rooms layout */}
                  <line x1="160" y1="30" x2="160" y2="270" stroke="#38bdf8" strokeDasharray="3 3" />
                  <line x1="30" y1="150" x2="370" y2="150" stroke="#38bdf8" />
                  <line x1="260" y1="150" x2="260" y2="270" stroke="#38bdf8" />
                  
                  {/* Structural Columns */}
                  <rect x="25" y="25" width="10" height="10" fill="#38bdf8" />
                  <rect x="155" y="25" width="10" height="10" fill="#38bdf8" />
                  <rect x="365" y="25" width="10" height="10" fill="#38bdf8" />
                  <rect x="25" y="145" width="10" height="10" fill="#38bdf8" />
                  <rect x="155" y="145" width="10" height="10" fill="#38bdf8" />
                  <rect x="255" y="145" width="10" height="10" fill="#38bdf8" />
                  <rect x="365" y="145" width="10" height="10" fill="#38bdf8" />

                  {/* Room Text Labels */}
                  <text x="50" y="80" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">LIVING ROOM</text>
                  <text x="50" y="95" fill="#60a5fa" fontSize="8" fontFamily="monospace">6500 x 4200 mm</text>

                  <text x="200" y="80" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">MASTER BEDROOM</text>
                  <text x="200" y="95" fill="#60a5fa" fontSize="8" fontFamily="monospace">4800 x 4000 mm</text>

                  <text x="50" y="200" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">KITCHEN & DINING</text>
                  <text x="180" y="200" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">LOBBY</text>
                  <text x="280" y="200" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">BALCONY</text>
                </svg>
              </div>

              {/* Title Block Stamp */}
              <div className="relative z-10 border border-blue-400/50 p-2 bg-blue-950/60 rounded flex items-center justify-between text-[10px]">
                <div>
                  <span className="text-slate-400">PROJECT:</span> <strong>HORIZON TOWERS LUXURY RESIDENCE</strong>
                </div>
                <div className="font-mono text-cyan-300">
                  SHEET: <strong>A-101 (REV R1)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. NAVIGATION DRAWER (Slide-out menu)                */}
      {/* Contains all 9 destinations with Drawings highlighted*/}
      {/* ==================================================== */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="bg-white w-72 max-w-[85vw] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Top */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B122B] text-white flex items-center justify-center font-black text-xs">
                  100%
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">100% DESIGN Studio</h3>
                  <p className="text-[10px] text-slate-500">Architectural Operations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation items (All 9 preserved) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              <Link
                href={`/w/${workspaceSlug}/tasks`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-slate-400" />
                <span>Studio Tasks</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/projects`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-slate-400" />
                <span>Projects</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/visits`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Site Visits & GPS</span>
              </Link>

              {/* HIGHLIGHTED DRAWINGS & APPROVALS DESTINATION */}
              <Link
                href={`/w/${workspaceSlug}/drawings`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold bg-[#4865F6] text-white shadow-xs"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Drawings & Approvals</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/finance`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Receipt className="w-4 h-4 text-slate-400" />
                <span>Project Finance</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/team`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Studio Team</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/contractors`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Wrench className="w-4 h-4 text-slate-400" />
                <span>Contractors</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/consultants`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>Consultants</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/directory`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Building className="w-4 h-4 text-slate-400" />
                <span>Clients & Directory</span>
              </Link>
            </div>

            {/* Install App & Account Footer */}
            <div className="p-3 border-t border-[#E2E6F0] bg-slate-50 space-y-2">
              <button
                type="button"
                onClick={() => alert("PWA Installation prompt ready for offline field work.")}
                className="w-full py-2 bg-white border border-[#E2E6F0] rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#4865F6]" />
                <span>Install Mobile PWA</span>
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#4865F6] text-white font-bold text-[10px] flex items-center justify-center">
                    SL
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{userFullName || "Saksham Lanjewar"}</p>
                    <p className="text-[10px] text-slate-500 font-mono">EMP-001 • {userRole}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = `/w/${workspaceSlug}/login`;
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. UPLOAD REVISION MODAL                             */}
      {/* ==================================================== */}
      {uploadRevisionDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase">ATOMIC REVISION CONTROL</span>
                <h3 className="font-bold text-sm text-[#0F172A]">Upload New Revision: {uploadRevisionDoc.drawingNumber || uploadRevisionDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadRevisionDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadRevision} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Issue Purpose / Revision Notes</label>
                <input
                  type="text"
                  value={revisionIssuePurpose}
                  onChange={(e) => setRevisionIssuePurpose(e.target.value)}
                  placeholder="e.g. Incorporated structural offsets & stair core updates"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Attach Revised Sheet (PDF/DWG)</label>
                <input
                  type="file"
                  onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadRevisionDoc(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRevision}
                  className="px-5 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-bold rounded-xl shadow-xs"
                >
                  {submittingRevision ? "Uploading..." : "Publish Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. REQUEST CHANGES MODAL                            */}
      {/* ==================================================== */}
      {changeRequestVersion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#0F172A]">Request Architectural Changes</h3>
              <button
                type="button"
                onClick={() => setChangeRequestVersion(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestChanges} className="space-y-3 text-xs">
              <p className="text-slate-500">
                Provide markup or correction notes for <strong>{changeRequestVersion.revision}</strong>. This reverts the drawing to Draft state for the author to reissue.
              </p>

              <textarea
                rows={3}
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
                placeholder="Describe required dimensional corrections or coordination conflicts..."
                className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChangeRequestVersion(null)}
                  className="px-3 py-1.5 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChanges}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  {submittingChanges ? "Submitting..." : "Send Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. RECORD CLIENT APPROVAL MODAL                     */}
      {/* ==================================================== */}
      {clientApprovalVersion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#0F172A]">Record Client Sign-Off</h3>
              <button
                type="button"
                onClick={() => setClientApprovalVersion(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordClientApproval} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Client Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientStatus("APPROVED")}
                    className={`py-2 rounded-xl font-bold border text-center ${
                      clientStatus === "APPROVED"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Client Approved ✔
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientStatus("REJECTED")}
                    className={`py-2 rounded-xl font-bold border text-center ${
                      clientStatus === "REJECTED"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Client Rejected
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Approval Evidence / Email Stamp *</label>
                <textarea
                  rows={2}
                  value={clientEvidenceText}
                  onChange={(e) => setClientEvidenceText(e.target.value)}
                  placeholder="e.g. Formal client sign-off email from John Doe, Project Director"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Received Date</label>
                <input
                  type="date"
                  value={clientReceivedDate}
                  onChange={(e) => setClientReceivedDate(e.target.value)}
                  className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClientApprovalVersion(null)}
                  className="px-3 py-1.5 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClientApproval}
                  className="px-4 py-1.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-bold rounded-xl"
                >
                  {submittingClientApproval ? "Recording..." : "Save Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 12. USER PROFILE MODAL                               */}
      {/* ==================================================== */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#4865F6] text-white font-bold text-sm flex items-center justify-center">
                  SL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{userFullName || "Saksham Lanjewar"}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-mono font-bold text-[#4865F6]">EMP-001</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-700 uppercase">{userRole || "ADMIN / OWNER"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Workspace:</span>
                <span className="font-semibold text-slate-800">100% DESIGN Studio</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">designsaksham1@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Design Role:</span>
                <span className="font-medium text-slate-800">Principal Architect & Founder</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = `/w/${workspaceSlug}/login`;
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
