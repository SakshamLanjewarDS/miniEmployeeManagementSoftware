"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  ArrowRight,
  User,
  Calendar,
  IndianRupee,
  Layers,
  MapPin,
  Pencil,
  Trash2,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Briefcase,
  Clock,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  SlidersHorizontal,
  ExternalLink,
  HardHat,
  UserCheck,
  Compass,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  projectType?: string | null;
  siteAddress?: string | null;
  currentPhase?: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  budget?: number | null;
  currency: string;
  startDate?: string | Date | null;
  targetDate?: string | Date | null;
  primaryClientId?: string | null;
  projectArchitectId?: string | null;
  projectManagerId?: string | null;
  projectCoordinatorId?: string | null;
  siteCity?: string | null;
  googleMapLocation?: string | null;
  contractorId?: string | null;
  consultantId?: string | null;
  plotArea?: string | null;
  constructionArea?: string | null;
  primaryClient?: { id: string; name: string; company?: string | null } | null;
  projectArchitect?: { user: { fullName: string } } | null;
  projectManager?: { user: { fullName: string } } | null;
  projectCoordinator?: { user: { fullName: string } } | null;
  contractor?: { id: string; name: string; firmName?: string | null; trade?: string | null } | null;
  consultant?: { id: string; name: string; firmName?: string | null; discipline?: string | null } | null;
  taskProgress: {
    percentage: number;
    label: string;
    completedCount: number;
    totalCount: number;
  };
  phaseProgress?: {
    percentage: number;
    completedCount: number;
    totalCount: number;
    currentPhase: string;
    label: string;
  };
  _count?: {
    tasks: number;
    documents: number;
    siteVisits: number;
    members: number;
  };
}

interface ProjectsClientViewProps {
  context: TenantContext;
  initialProjects: ProjectItem[];
  clients: { id: string; name: string; company?: string | null }[];
  members: {
    id: string;
    user: { id: string; fullName: string; email: string };
    employee?: { employeeId?: string | null; designation?: string | null } | null;
  }[];
  contractors?: { id: string; name: string; firmName?: string | null; trade?: string | null }[];
  consultants?: { id: string; name: string; firmName?: string | null; discipline?: string | null }[];
}

const PROJECT_TYPOLOGIES = [
  "Residential Architecture",
  "Luxury Villa & Penthouse",
  "Commercial & Corporate Office",
  "Hospitality & Boutique Resort",
  "Interior Architecture & Fitout",
  "High-Rise Residential",
  "Retail & Showroom",
  "Landscape & Urban Design",
  "Institutional & Cultural",
];

const ARCHITECTURAL_PHASES = [
  "Brief",
  "Site Survey",
  "Concept",
  "Space Planning",
  "Detailed Design",
  "3D Visualization",
  "Working Drawings",
  "BOQ & Tendering",
  "Approvals & Sanctioning",
  "Execution",
  "Handover",
];

export function ProjectsClientView({
  context,
  initialProjects,
  clients,
  members,
  contractors = [],
  consultants = [],
}: ProjectsClientViewProps) {
  const router = useRouter();

  // Role Permissions: Owner and Admin have full manipulation rights; Employee is read-only
  const canManage = context.role === "OWNER" || context.role === "ADMIN";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [typologyFilter, setTypologyFilter] = useState<string>("ALL");
  const [architectFilter, setArchitectFilter] = useState<string>("ALL");
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [coordinatorFilter, setCoordinatorFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [contractorFilter, setContractorFilter] = useState<string>("ALL");
  const [consultantFilter, setConsultantFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");

  // Selection & Bulk Delete states
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal states
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null);
  const [progressProject, setProgressProject] = useState<ProjectItem | null>(null);
  const [selectedPhaseForProgress, setSelectedPhaseForProgress] = useState<string>("Brief");
  const [selectedStatusForProgress, setSelectedStatusForProgress] = useState<ProjectItem["status"]>("ACTIVE");

  // Form submission loading & messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Distinct cities from initialProjects
  const availableCities = Array.from(
    new Set(
      initialProjects
        .map((p) => p.siteCity?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0))
    )
  ).sort();

  // Active filters count
  const activeFiltersCount = [
    statusFilter !== "ALL",
    phaseFilter !== "ALL",
    typologyFilter !== "ALL",
    architectFilter !== "ALL",
    managerFilter !== "ALL",
    coordinatorFilter !== "ALL",
    cityFilter !== "ALL",
    contractorFilter !== "ALL",
    consultantFilter !== "ALL",
    clientFilter !== "ALL",
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPhaseFilter("ALL");
    setTypologyFilter("ALL");
    setArchitectFilter("ALL");
    setManagerFilter("ALL");
    setCoordinatorFilter("ALL");
    setCityFilter("ALL");
    setContractorFilter("ALL");
    setConsultantFilter("ALL");
    setClientFilter("ALL");
  };

  // Create Project Form State (Supports all 18 fields)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    primaryClientId: "",
    projectType: "Residential Architecture",
    projectArchitectId: "",
    projectManagerId: "",
    projectCoordinatorId: "",
    contractorId: "",
    consultantId: "",
    siteAddress: "",
    siteCity: "",
    googleMapLocation: "",
    startDate: "",
    targetDate: "",
    plotArea: "",
    constructionArea: "",
    budget: "",
    currency: "INR",
    description: "",
  });

  // Edit Project Form State (Supports all 18 fields + phase & status)
  const [editFormData, setEditFormData] = useState({
    code: "",
    name: "",
    primaryClientId: "",
    projectType: "",
    projectArchitectId: "",
    projectManagerId: "",
    projectCoordinatorId: "",
    contractorId: "",
    consultantId: "",
    siteAddress: "",
    siteCity: "",
    googleMapLocation: "",
    startDate: "",
    targetDate: "",
    plotArea: "",
    constructionArea: "",
    budget: "",
    currency: "INR",
    currentPhase: "",
    status: "ACTIVE" as ProjectItem["status"],
    description: "",
  });

  // Filter projects with advanced multi-facet filtering
  const filteredProjects = initialProjects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.siteCity || "").toLowerCase().includes(q) ||
      (p.siteAddress || "").toLowerCase().includes(q) ||
      (p.projectCoordinator?.user?.fullName || "").toLowerCase().includes(q) ||
      (p.projectManager?.user?.fullName || "").toLowerCase().includes(q) ||
      (p.projectArchitect?.user?.fullName || "").toLowerCase().includes(q) ||
      (p.primaryClient?.name || "").toLowerCase().includes(q) ||
      (p.contractor?.firmName || p.contractor?.name || "").toLowerCase().includes(q) ||
      (p.consultant?.firmName || p.consultant?.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesPhase = phaseFilter === "ALL" || p.currentPhase === phaseFilter;
    const matchesTypology = typologyFilter === "ALL" || p.projectType === typologyFilter;
    const matchesArchitect = architectFilter === "ALL" || p.projectArchitectId === architectFilter;
    const matchesManager = managerFilter === "ALL" || p.projectManagerId === managerFilter;
    const matchesCoordinator = coordinatorFilter === "ALL" || p.projectCoordinatorId === coordinatorFilter;
    const matchesCity = cityFilter === "ALL" || (p.siteCity || "").toLowerCase() === cityFilter.toLowerCase();
    const matchesContractor = contractorFilter === "ALL" || p.contractorId === contractorFilter;
    const matchesConsultant = consultantFilter === "ALL" || p.consultantId === consultantFilter;
    const matchesClient = clientFilter === "ALL" || p.primaryClientId === clientFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPhase &&
      matchesTypology &&
      matchesArchitect &&
      matchesManager &&
      matchesCoordinator &&
      matchesCity &&
      matchesContractor &&
      matchesConsultant &&
      matchesClient
    );
  });

  const handleToggleSelect = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredProjects.length > 0 &&
    filteredProjects.every((p) => selectedProjectIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!canManage || selectedProjectIds.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects?workspaceSlug=${context.tenantSlug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: selectedProjectIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete selected projects");
      }

      setSuccessMessage(`Successfully deleted ${selectedProjectIds.length} project(s)!`);
      setSelectedProjectIds([]);
      setIsBulkDeleteModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during bulk deletion");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    if (!formData.code.trim() || !formData.name.trim()) {
      setErrorMessage("Project Code and Name are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          primaryClientId: formData.primaryClientId || undefined,
          projectType: formData.projectType || undefined,
          projectArchitectId: formData.projectArchitectId || undefined,
          projectManagerId: formData.projectManagerId || undefined,
          projectCoordinatorId: formData.projectCoordinatorId || undefined,
          contractorId: formData.contractorId || undefined,
          consultantId: formData.consultantId || undefined,
          siteAddress: formData.siteAddress.trim() || undefined,
          siteCity: formData.siteCity.trim() || undefined,
          googleMapLocation: formData.googleMapLocation.trim() || undefined,
          startDate: formData.startDate || undefined,
          targetDate: formData.targetDate || undefined,
          plotArea: formData.plotArea.trim() || undefined,
          constructionArea: formData.constructionArea.trim() || undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          currency: formData.currency || "INR",
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setSuccessMessage(`Project "${formData.name}" created with default architectural phases!`);
      setIsCreateModalOpen(false);
      setFormData({
        code: "",
        name: "",
        primaryClientId: "",
        projectType: "Residential Architecture",
        projectArchitectId: "",
        projectManagerId: "",
        projectCoordinatorId: "",
        contractorId: "",
        consultantId: "",
        siteAddress: "",
        siteCity: "",
        googleMapLocation: "",
        startDate: "",
        targetDate: "",
        plotArea: "",
        constructionArea: "",
        budget: "",
        currency: "INR",
        description: "",
      });

      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal with Pre-populated data
  const handleOpenEdit = (project: ProjectItem) => {
    setEditingProject(project);
    setErrorMessage(null);
    setEditFormData({
      code: project.code,
      name: project.name,
      primaryClientId: project.primaryClientId || "",
      projectType: project.projectType || "Residential Architecture",
      projectArchitectId: project.projectArchitectId || "",
      projectManagerId: project.projectManagerId || "",
      projectCoordinatorId: project.projectCoordinatorId || "",
      contractorId: project.contractorId || "",
      consultantId: project.consultantId || "",
      siteAddress: project.siteAddress || "",
      siteCity: project.siteCity || "",
      googleMapLocation: project.googleMapLocation || "",
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().split("T")[0]
        : "",
      targetDate: project.targetDate
        ? new Date(project.targetDate).toISOString().split("T")[0]
        : "",
      plotArea: project.plotArea || "",
      constructionArea: project.constructionArea || "",
      budget: project.budget !== null && project.budget !== undefined ? String(project.budget) : "",
      currency: project.currency || "INR",
      currentPhase: project.currentPhase || "Brief",
      status: project.status,
      description: project.description || "",
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !editingProject) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects?workspaceSlug=${context.tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: editingProject.id,
          code: editFormData.code.trim(),
          name: editFormData.name.trim(),
          primaryClientId: editFormData.primaryClientId || null,
          projectType: editFormData.projectType || undefined,
          projectArchitectId: editFormData.projectArchitectId || null,
          projectManagerId: editFormData.projectManagerId || null,
          projectCoordinatorId: editFormData.projectCoordinatorId || null,
          contractorId: editFormData.contractorId || null,
          consultantId: editFormData.consultantId || null,
          siteAddress: editFormData.siteAddress.trim() || undefined,
          siteCity: editFormData.siteCity.trim() || null,
          googleMapLocation: editFormData.googleMapLocation.trim() || null,
          startDate: editFormData.startDate || null,
          targetDate: editFormData.targetDate || null,
          plotArea: editFormData.plotArea.trim() || null,
          constructionArea: editFormData.constructionArea.trim() || null,
          budget: editFormData.budget ? parseFloat(editFormData.budget) : null,
          currency: editFormData.currency || "INR",
          currentPhase: editFormData.currentPhase || undefined,
          status: editFormData.status,
          description: editFormData.description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update project");
      }

      setSuccessMessage(`Project "${editFormData.name}" updated successfully!`);
      setEditingProject(null);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Progress Manipulation Modal
  const handleOpenProgressModal = (project: ProjectItem) => {
    setProgressProject(project);
    setSelectedPhaseForProgress(project.currentPhase || project.phaseProgress?.currentPhase || "Brief");
    setSelectedStatusForProgress(project.status);
    setErrorMessage(null);
  };

  // Handle Progress Manipulation Submit
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !progressProject) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects?workspaceSlug=${context.tenantSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: progressProject.id,
          targetPhaseName: selectedPhaseForProgress,
          status: selectedStatusForProgress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update project progress");
      }

      setSuccessMessage(
        `Project "${progressProject.name}" progress successfully advanced to "${selectedPhaseForProgress}"!`
      );
      setProgressProject(null);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Project
  const handleDeleteConfirm = async () => {
    if (!canManage || !deletingProject) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/projects?workspaceSlug=${context.tenantSlug}&projectId=${deletingProject.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project");
      }

      setSuccessMessage(`Project "${deletingProject.name}" was deleted.`);
      setDeletingProject(null);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ProjectItem["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4B5320]/15 text-[#4B5320] border border-[#4B5320]/30">
            Active Commission
          </span>
        );
      case "PLANNING":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Planning / Concept
          </span>
        );
      case "ON_HOLD":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            On Hold
          </span>
        );
      case "COMPLETED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#4B5320] uppercase tracking-wider">
            <span>Architectural Portfolio</span>
            <span>•</span>
            <span>Commissions & Sites</span>
            <span>•</span>
            {canManage ? (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#4B5320]/10 text-[#4B5320] font-semibold border border-[#4B5320]/20">
                <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                {context.role === "OWNER" ? "Owner Authority" : "Admin Authority"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-100 text-[#696E82] font-semibold border border-gray-200">
                <Lock className="w-3 h-3 text-gray-500" />
                Read-Only Mode (Employee)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">
            Studio Projects & Phases
          </h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Architectural projects from Concept & Space Planning to Working Drawings and On-Site Execution
          </p>
        </div>

        {/* Action Header Button: ONLY for Owner and Admin */}
        {canManage ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setCsvModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F8F9FD] border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
              title="Bulk import projects or export data to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5A81FA]" />
              <span>Import / Export CSV</span>
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setErrorMessage(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Create New Project</span>
            </button>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[11px] text-[#696E82] italic">
              Projects managed by Studio Partners & Admins
            </span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-3" suppressHydrationWarning>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder="Search by project name, code (e.g. PRJ-001), client, or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#4B5320] focus:ring-1 focus:ring-[#4B5320] transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-[#696E82] shrink-0">Status:</span>
            <select
              suppressHydrationWarning
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
            >
              <option value="ALL">All Statuses ({initialProjects.length})</option>
              <option value="ACTIVE">Active</option>
              <option value="PLANNING">Planning</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-[#696E82] shrink-0">Phase:</span>
            <select
              suppressHydrationWarning
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
            >
              <option value="ALL">All Phases</option>
              {ARCHITECTURAL_PHASES.map((ph) => (
                <option key={ph} value={ph}>
                  {ph}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              isAdvancedFilterOpen || activeFiltersCount > 0
                ? "bg-[#4B5320] text-white border-[#4B5320] shadow-2xs"
                : "bg-[#F8F9FD] text-[#1F1F1F] border-[#E2E6F0] hover:bg-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D4AF37] text-[#1F1F1F]">
                {activeFiltersCount}
              </span>
            )}
            {isAdvancedFilterOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Quick Reset Button if active filters */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filter Panel */}
        {isAdvancedFilterOpen && (
          <div className="pt-3 border-t border-[#E2E6F0] animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-[#4B5320] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Multi-Facet Studio Filters</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Typology */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Typology
                </label>
                <select
                  value={typologyFilter}
                  onChange={(e) => setTypologyFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Typologies</option>
                  {PROJECT_TYPOLOGIES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Architect */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Architect
                </label>
                <select
                  value={architectFilter}
                  onChange={(e) => setArchitectFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Architects</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.fullName} {m.employee?.designation ? `(${m.employee.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Manager
                </label>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Managers</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Coordinator */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Coordinator
                </label>
                <select
                  value={coordinatorFilter}
                  onChange={(e) => setCoordinatorFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Coordinators</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Site City */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Site City
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Cities</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Contractor
                </label>
                <select
                  value={contractorFilter}
                  onChange={(e) => setContractorFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Contractors</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firmName || c.name} {c.trade ? `(${c.trade})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultant */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Consultant
                </label>
                <select
                  value={consultantFilter}
                  onChange={(e) => setConsultantFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Consultants</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firmName || c.name} {c.discipline ? `(${c.discipline})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Client
                </label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1F1F] focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="ALL">All Clients</option>
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name} {cl.company ? `(${cl.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips / Pills */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t border-[#E2E6F0]/60 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#696E82] mr-1">Active:</span>
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {phaseFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Phase: {phaseFilter}
                <button onClick={() => setPhaseFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {typologyFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Typology: {typologyFilter}
                <button onClick={() => setTypologyFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {cityFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                City: {cityFilter}
                <button onClick={() => setCityFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {architectFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Architect: {members.find((m) => m.id === architectFilter)?.user.fullName || "Selected"}
                <button onClick={() => setArchitectFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {managerFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Manager: {members.find((m) => m.id === managerFilter)?.user.fullName || "Selected"}
                <button onClick={() => setManagerFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {coordinatorFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Coordinator: {members.find((m) => m.id === coordinatorFilter)?.user.fullName || "Selected"}
                <button onClick={() => setCoordinatorFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {contractorFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Contractor: {contractors.find((c) => c.id === contractorFilter)?.firmName || contractors.find((c) => c.id === contractorFilter)?.name || "Selected"}
                <button onClick={() => setContractorFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {consultantFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Consultant: {consultants.find((c) => c.id === consultantFilter)?.firmName || consultants.find((c) => c.id === consultantFilter)?.name || "Selected"}
                <button onClick={() => setConsultantFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4B5320]/10 text-[#4B5320] border border-[#4B5320]/20 text-[11px] font-medium">
                Client: {clients.find((cl) => cl.id === clientFilter)?.name || "Selected"}
                <button onClick={() => setClientFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action & Selection Toolbar */}
      {filteredProjects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F1F1F] hover:text-[#4B5320] cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#4B5320]" />
              ) : (
                <Square className="w-4 h-4 text-[#696E82]" />
              )}
              <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
            </button>
            <span className="text-xs text-[#696E82]">
              Showing <span className="font-bold text-[#1F1F1F]">{filteredProjects.length}</span>{" "}
              {filteredProjects.length === 1 ? "project" : "projects"}
              {selectedProjectIds.length > 0 && (
                <span className="ml-1 text-[#4B5320] font-bold">
                  ({selectedProjectIds.length} selected)
                </span>
              )}
            </span>
          </div>

          {canManage && selectedProjectIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedProjectIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProjectIds([])}
                className="text-xs text-[#696E82] hover:text-[#1F1F1F] px-2 py-1 cursor-pointer font-medium"
              >
                Cancel Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <FolderKanban className="w-10 h-10 text-[#A8B1CE] mx-auto" />
          <h3 className="text-base font-bold text-[#1F1F1F]">No projects found</h3>
          <p className="text-xs text-[#696E82] max-w-sm mx-auto">
            {searchQuery || activeFiltersCount > 0
              ? "Try adjusting your search query or filter selection."
              : "No architectural projects have been created in this studio yet."}
          </p>
          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4B5320] text-white text-xs font-bold shadow-xs hover:bg-[#3d441a] transition-all cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((p) => {
            const isSelected = selectedProjectIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative ${
                  isSelected
                    ? "border-[#4B5320] ring-2 ring-[#4B5320]/25 bg-[#4B5320]/[0.02]"
                    : "border-[#E2E6F0] hover:border-[#4B5320]/50"
                }`}
              >
                <div className="space-y-4">
                  {/* Header Top: Select Checkbox, Code, Typology & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(p.id);
                        }}
                        className="text-[#4B5320] hover:text-[#3d441a] transition-colors cursor-pointer p-0.5"
                        title={isSelected ? "Deselect project" : "Select project"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#4B5320]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#A8B1CE] hover:text-[#4B5320]" />
                        )}
                      </button>

                      {/* 1. Project Code */}
                      <span className="font-mono text-xs font-bold text-[#4B5320] bg-[#4B5320]/10 px-2.5 py-1 rounded-md border border-[#4B5320]/20">
                        {p.code}
                      </span>

                      {/* 4. Typology Badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#696E82] bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                        <Building2 className="w-3 h-3 text-[#4B5320]" />
                        <span>{p.projectType || "Architecture"}</span>
                      </span>

                      {getStatusBadge(p.status)}
                    </div>

                    {/* Owner/Admin Action Buttons (Edit / Progress / Delete) */}
                    {canManage && (
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProgressModal(p)}
                          className="px-2 py-1 rounded-lg border border-[#4B5320]/30 bg-[#4B5320]/10 text-[#4B5320] hover:bg-[#4B5320] hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Manipulate Project Progress & Phases"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:text-[#4B5320] hover:border-[#4B5320] hover:bg-[#4B5320]/5 transition-colors cursor-pointer shadow-2xs"
                          title="Edit Project Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProject(p)}
                          className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Project Name */}
                  <div>
                    <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight group-hover:text-[#4B5320] transition-colors">
                      {p.name}
                    </h3>
                    {/* 18. Brief / Project Brief */}
                    {p.description ? (
                      <div className="mt-1.5 p-2 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0]/80 text-xs text-[#696E82] flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#4B5320] shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{p.description}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#696E82] italic mt-1">
                        No project brief provided.
                      </p>
                    )}
                  </div>

                  {/* Phase Progress Bar */}
                  <div className="pt-1">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#696E82] font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#4B5320]" />
                        <span>Phase Progress</span>
                        <span className="font-semibold text-[#1F1F1F]">({p.currentPhase || "Brief"})</span>
                      </span>
                      <span className="font-bold text-[#4B5320]">
                        {p.phaseProgress?.percentage ??
                          Math.round(
                            ((ARCHITECTURAL_PHASES.indexOf(p.currentPhase || "Brief") + 1) /
                              ARCHITECTURAL_PHASES.length) *
                              100
                          )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-[#F2F4FF] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4B5320] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            p.phaseProgress?.percentage ??
                            Math.round(
                              ((ARCHITECTURAL_PHASES.indexOf(p.currentPhase || "Brief") + 1) /
                                ARCHITECTURAL_PHASES.length) *
                                100
                            )
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-[#696E82] mt-1 flex justify-between">
                      <span>
                        Phase {ARCHITECTURAL_PHASES.indexOf(p.currentPhase || "Brief") + 1} of{" "}
                        {ARCHITECTURAL_PHASES.length} • {p.currentPhase || "Brief"}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenProgressModal(p)}
                          className="text-[10px] font-bold text-[#4B5320] hover:underline cursor-pointer"
                        >
                          Adjust Phase →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Completion Progress Bar */}
                  <div className="pt-0.5">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#696E82] font-medium flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>Task Deliverables</span>
                      </span>
                      <span className="font-bold text-[#1F1F1F]">{p.taskProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-[#F2F4FF] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#5A81FA] h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.taskProgress.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#696E82] mt-1 flex justify-between">
                      <span>
                        {p.taskProgress.completedCount} of {p.taskProgress.totalCount} tasks completed
                      </span>
                      {p._count?.siteVisits !== undefined && (
                        <span>{p._count.siteVisits} Site Visits</span>
                      )}
                    </div>
                  </div>

                  {/* Team & Leadership Grid (Client, Architect, Manager, Coordinator, Contractor, Consultant) */}
                  <div className="pt-3 border-t border-[#E2E6F0] space-y-2">
                    <span className="text-[10px] font-bold text-[#4B5320] uppercase tracking-wider block">
                      Team & Stakeholders
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* 3. Client Name */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Client Name
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.primaryClient?.name || "Direct / Private"}>
                          {p.primaryClient?.name || "Direct / Private"}
                        </span>
                      </div>

                      {/* 5. Project Architect */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Project Architect
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.projectArchitect?.user.fullName || "Unassigned"}>
                          {p.projectArchitect?.user.fullName || "Unassigned"}
                        </span>
                      </div>

                      {/* 6. Project Manager */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Project Manager
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.projectManager?.user.fullName || "Unassigned"}>
                          {p.projectManager?.user.fullName || "Unassigned"}
                        </span>
                      </div>

                      {/* 7. Project Coordinator */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Coordinator
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.projectCoordinator?.user.fullName || "Unassigned"}>
                          {p.projectCoordinator?.user.fullName || "Unassigned"}
                        </span>
                      </div>

                      {/* 8. Project Contractor */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Contractor
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.contractor?.firmName || p.contractor?.name || "Unassigned"}>
                          {p.contractor?.firmName || p.contractor?.name || "Unassigned"}
                        </span>
                      </div>

                      {/* 9. Project Consultant */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Consultant
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block" title={p.consultant?.firmName || p.consultant?.name || "Unassigned"}>
                          {p.consultant?.firmName || p.consultant?.name || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Site, Spatial & Financial Grid (10, 11, 12, 15, 16, 17) */}
                  <div className="pt-3 border-t border-[#E2E6F0] space-y-2">
                    <span className="text-[10px] font-bold text-[#4B5320] uppercase tracking-wider block">
                      Site & Specifications
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* 10 & 11. Site Address & City */}
                      <div className="sm:col-span-2">
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#4B5320]" />
                          <span>Site Address & City</span>
                        </span>
                        <span className="text-[#1F1F1F] font-medium truncate block" title={`${p.siteAddress || ""} ${p.siteCity ? `(${p.siteCity})` : ""}`}>
                          {p.siteAddress ? `${p.siteAddress}${p.siteCity ? `, ${p.siteCity}` : ""}` : p.siteCity || "Site pending"}
                        </span>
                      </div>

                      {/* 12. Google Map Location */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Map Location
                        </span>
                        {p.googleMapLocation ? (
                          <a
                            href={
                              p.googleMapLocation.startsWith("http://") || p.googleMapLocation.startsWith("https://")
                                ? p.googleMapLocation
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.googleMapLocation)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#4B5320] hover:text-[#3d441a] font-semibold hover:underline"
                            title={p.googleMapLocation}
                          >
                            <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                            <span className="truncate max-w-[100px]">View Map</span>
                          </a>
                        ) : (
                          <span className="text-[#A8B1CE] italic">Not set</span>
                        )}
                      </div>

                      {/* 15. Plot Area */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Plot Area
                        </span>
                        <span className="font-semibold text-[#1F1F1F] truncate block">
                          {p.plotArea || "—"}
                        </span>
                      </div>

                      {/* 16. Total Construction Area */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Total Construction
                        </span>
                        <span className="font-semibold text-[#4B5320] truncate block">
                          {p.constructionArea || "—"}
                        </span>
                      </div>

                      {/* 17. Budget */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Budget
                        </span>
                        <span className="font-bold text-[#1F1F1F] truncate block">
                          {p.budget ? `${p.currency || "₹"} ${Number(p.budget).toLocaleString("en-IN")}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer: 13. Start Date, 14. End Date, Open Project Dashboard */}
                <div className="pt-3 border-t border-[#E2E6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-[#696E82]">
                    <span className="flex items-center gap-1" title="Start Date">
                      <Calendar className="w-3 h-3 text-[#4B5320]" />
                      <span>Start: {p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1" title="End Date">
                      <Clock className="w-3 h-3 text-[#5A81FA]" />
                      <span>End: {p.targetDate ? new Date(p.targetDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                    </span>
                  </div>

                  <Link
                    href={`/w/${context.tenantSlug}/projects/${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B5320] hover:text-[#3d441a] hover:underline cursor-pointer ml-auto sm:ml-0"
                  >
                    <span>Open Project Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREATE PROJECT (Owner & Admin Only)                   */}
      {/* ============================================================== */}
      {isCreateModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4B5320] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">
                    Commission New Architectural Project
                  </h3>
                  <p className="text-[11px] text-[#696E82]">
                    Sets up project code, typology, manager, coordinator, site, and default 11 design phases
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Project Code & Project Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HZ-2026, PRJ-101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none uppercase font-mono font-bold"
                  />
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">
                    Unique identifier used across drawings & site visits
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Horizon Towers Luxury Residence"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Row 2: Client Name & Typology */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Client Name
                  </label>
                  <select
                    value={formData.primaryClientId}
                    onChange={(e) => setFormData({ ...formData, primaryClientId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Primary Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Typology
                  </label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    {PROJECT_TYPOLOGIES.map((typ) => (
                      <option key={typ} value={typ}>
                        {typ}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Project Architect & Project Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Architect
                  </label>
                  <select
                    value={formData.projectArchitectId}
                    onChange={(e) =>
                      setFormData({ ...formData, projectArchitectId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Architect...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Manager
                  </label>
                  <select
                    value={formData.projectManagerId}
                    onChange={(e) =>
                      setFormData({ ...formData, projectManagerId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Manager...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Project Coordinator & Site City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Coordinator
                  </label>
                  <select
                    value={formData.projectCoordinatorId}
                    onChange={(e) =>
                      setFormData({ ...formData, projectCoordinatorId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Coordinator...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Site City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram, Delhi, Mumbai"
                    value={formData.siteCity}
                    onChange={(e) => setFormData({ ...formData, siteCity: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Project Contractor & Project Consultant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Contractor
                  </label>
                  <select
                    value={formData.contractorId}
                    onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Contractor / Vendor...</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.firmName ? `(${c.firmName})` : ""} {c.trade ? `• ${c.trade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Consultant
                  </label>
                  <select
                    value={formData.consultantId}
                    onChange={(e) => setFormData({ ...formData, consultantId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Consultant...</option>
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.firmName ? `(${c.firmName})` : ""} {c.discipline ? `• ${c.discipline}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Site Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Sector 15, Golf Course Extension Road, Gurugram"
                  value={formData.siteAddress}
                  onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Row 7: Google map location */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Google map location
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=... or Plus Code"
                  value={formData.googleMapLocation}
                  onChange={(e) => setFormData({ ...formData, googleMapLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Row 8: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 9: Plot Area & Total Construction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Plot Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000 sq.ft / 555 sq.yd"
                    value={formData.plotArea}
                    onChange={(e) => setFormData({ ...formData, plotArea: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Total Construction
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12,500 sq.ft"
                    value={formData.constructionArea}
                    onChange={(e) => setFormData({ ...formData, constructionArea: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 10: Budget */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Budget
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-24 px-2 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 11: Brief / Project Brief */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Brief / Project Brief
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the architectural program, client objectives, site parameters, and deliverable expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-xs font-semibold text-[#696E82] hover:bg-[#F2F4FF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Project..." : "Commission Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PROJECT (Owner & Admin Only)                     */}
      {/* ============================================================== */}
      {editingProject && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4B5320] text-white flex items-center justify-center shadow-xs">
                  <Pencil className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">
                    Modify Project: {editingProject.name}
                  </h3>
                  <p className="text-[11px] text-[#696E82]">
                    Update project details, current phase, status, and assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as ProjectItem["status"],
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (In Progress)</option>
                    <option value="PLANNING">PLANNING (Concept / Pre-design)</option>
                    <option value="ON_HOLD">ON_HOLD (Paused)</option>
                    <option value="COMPLETED">COMPLETED (Handed Over)</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Current Architectural Phase
                  </label>
                  <select
                    value={editFormData.currentPhase}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, currentPhase: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold"
                  >
                    {ARCHITECTURAL_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Client Name & Typology */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Client Name
                  </label>
                  <select
                    value={editFormData.primaryClientId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, primaryClientId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Primary Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Typology
                  </label>
                  <select
                    value={editFormData.projectType}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, projectType: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    {PROJECT_TYPOLOGIES.map((typ) => (
                      <option key={typ} value={typ}>
                        {typ}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Project Architect & Project Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Architect
                  </label>
                  <select
                    value={editFormData.projectArchitectId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, projectArchitectId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Architect...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Manager
                  </label>
                  <select
                    value={editFormData.projectManagerId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, projectManagerId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Manager...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Project Coordinator & Site City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Coordinator
                  </label>
                  <select
                    value={editFormData.projectCoordinatorId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, projectCoordinatorId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Project Coordinator...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.fullName} ({m.employee?.designation || "Studio Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Site City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram, Delhi, Mumbai"
                    value={editFormData.siteCity}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, siteCity: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 6: Project Contractor & Project Consultant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Contractor
                  </label>
                  <select
                    value={editFormData.contractorId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, contractorId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Contractor / Vendor...</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.firmName ? `(${c.firmName})` : ""} {c.trade ? `• ${c.trade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Project Consultant
                  </label>
                  <select
                    value={editFormData.consultantId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, consultantId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  >
                    <option value="">Select Consultant...</option>
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.firmName ? `(${c.firmName})` : ""} {c.discipline ? `• ${c.discipline}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 7: Site Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Sector 15, Golf Course Extension Road, Gurugram"
                  value={editFormData.siteAddress}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, siteAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Row 8: Google map location */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Google map location
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=... or Plus Code"
                  value={editFormData.googleMapLocation}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, googleMapLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Row 9: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.targetDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, targetDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 10: Plot Area & Total Construction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Plot Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000 sq.ft / 555 sq.yd"
                    value={editFormData.plotArea}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, plotArea: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Total Construction
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12,500 sq.ft"
                    value={editFormData.constructionArea}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, constructionArea: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 11: Budget */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Budget
                </label>
                <div className="flex gap-2">
                  <select
                    value={editFormData.currency}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                    className="w-24 px-2 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000000"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 12: Brief / Project Brief */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Brief / Project Brief
                </label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-xs font-semibold text-[#696E82] hover:bg-[#F2F4FF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION (Owner & Admin Only)              */}
      {/* ============================================================== */}
      {deletingProject && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Delete Project?</h3>
              <p className="text-xs text-[#696E82] mt-1 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-[#1F1F1F]">
                  "{deletingProject.name}" ({deletingProject.code})
                </strong>
                ? This action will permanently remove this project and its related phases,
                checklists, and data from MySQL.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-xs font-semibold text-[#696E82] hover:bg-[#F2F4FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3B: BULK DELETE CONFIRMATION (Owner & Admin Only)        */}
      {/* ============================================================== */}
      {isBulkDeleteModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#1F1F1F]">
                Delete {selectedProjectIds.length} Selected Project(s)?
              </h3>
              <p className="text-xs text-[#696E82] mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete these{" "}
                <strong className="text-rose-600 font-bold">{selectedProjectIds.length}</strong>{" "}
                project(s)? This will remove all their phases, tasks, checklists, and linked records from the database.
                This action is <span className="font-semibold text-rose-700">irreversible</span>.
              </p>
            </div>

            {/* List of projects to delete */}
            <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0] space-y-1.5">
              <span className="text-[10px] font-bold text-[#696E82] uppercase block mb-1">
                Selected Projects for Deletion:
              </span>
              {initialProjects
                .filter((p) => selectedProjectIds.includes(p.id))
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white border border-[#E2E6F0]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] font-bold text-[#4B5320] bg-[#4B5320]/10 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span className="font-medium text-[#1F1F1F] truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-[#696E82] shrink-0 ml-2">
                      {p.projectType || "Architecture"}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-xs font-semibold text-[#696E82] hover:bg-[#F2F4FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : `Confirm Delete (${selectedProjectIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: MANIPULATE PROGRESS & PHASES (Owner & Admin Only)     */}
      {/* ============================================================== */}
      {progressProject && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4B5320] text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">
                    Manipulate Project Progress: {progressProject.name}
                  </h3>
                  <p className="text-[11px] text-[#696E82]">
                    Code: <span className="font-mono font-bold text-[#4B5320]">{progressProject.code}</span> • Advance phases, mark milestones completed, or set progress
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProgressProject(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleProgressSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Live Progress Preview Banner */}
              <div className="p-4 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Selected Phase:</span>
                    <span className="text-[#4B5320] font-bold">{selectedPhaseForProgress}</span>
                  </span>
                  <span className="text-sm font-bold text-[#4B5320]">
                    {Math.round(
                      ((ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress) + 1) /
                        ARCHITECTURAL_PHASES.length) *
                        100
                    )}
                    % Complete
                  </span>
                </div>

                <div className="w-full bg-[#E2E6F0] h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4B5320] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        ((ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress) + 1) /
                          ARCHITECTURAL_PHASES.length) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#696E82]">
                  <span>
                    Phase {ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress) + 1} of{" "}
                    {ARCHITECTURAL_PHASES.length}
                  </span>
                  <span>
                    Previous phases marked Completed • Future phases marked Pending
                  </span>
                </div>
              </div>

              {/* Quick Phase Advancement Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const currIdx = ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress);
                    if (currIdx < ARCHITECTURAL_PHASES.length - 1) {
                      setSelectedPhaseForProgress(ARCHITECTURAL_PHASES[currIdx + 1]);
                    }
                  }}
                  disabled={
                    ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress) >=
                    ARCHITECTURAL_PHASES.length - 1
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#4B5320] hover:bg-[#3d441a] text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <span>Advance to Next Phase</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseForProgress("Handover");
                    setSelectedStatusForProgress("COMPLETED");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark All 100% Completed</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseForProgress("Brief");
                    setSelectedStatusForProgress("PLANNING");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E6F0] bg-white hover:bg-gray-50 text-[#696E82] text-[11px] font-medium transition-colors cursor-pointer ml-auto"
                >
                  Reset to Brief
                </button>
              </div>

              {/* Interactive 11-Phase Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#1F1F1F]">
                  Click on Any Architectural Phase to Set Progress:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ARCHITECTURAL_PHASES.map((ph, idx) => {
                    const isSelected = selectedPhaseForProgress === ph;
                    const selectedIdx = ARCHITECTURAL_PHASES.indexOf(selectedPhaseForProgress);
                    const isPrior = idx < selectedIdx;

                    return (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => setSelectedPhaseForProgress(ph)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-[#4B5320] bg-[#4B5320]/15 ring-2 ring-[#4B5320] shadow-xs"
                            : isPrior
                            ? "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 text-[#1F1F1F]"
                            : "border-[#E2E6F0] bg-[#F8F9FD] hover:bg-white text-[#696E82]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#4B5320] text-white"
                                : isPrior
                                ? "bg-emerald-600 text-white"
                                : "bg-[#E2E6F0] text-[#696E82]"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              isSelected
                                ? "font-bold text-[#1F1F1F]"
                                : isPrior
                                ? "font-semibold text-emerald-900"
                                : "font-medium"
                            }`}
                          >
                            {ph}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#4B5320] px-1.5 py-0.5 rounded bg-white border border-[#4B5320]/30 shrink-0">
                            Current
                          </span>
                        ) : isPrior ? (
                          <span className="text-[9px] font-semibold text-emerald-700 px-1 py-0.5 rounded bg-emerald-100 shrink-0">
                            Completed ✓
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#696E82] shrink-0">
                            Pending
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Update Option */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Project Commission Status
                </label>
                <select
                  value={selectedStatusForProgress}
                  onChange={(e) =>
                    setSelectedStatusForProgress(e.target.value as ProjectItem["status"])
                  }
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none font-semibold text-xs"
                >
                  <option value="ACTIVE">ACTIVE (In Progress)</option>
                  <option value="PLANNING">PLANNING (Brief & Concept)</option>
                  <option value="ON_HOLD">ON_HOLD (Paused)</option>
                  <option value="COMPLETED">COMPLETED (Handover Complete)</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProgressProject(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-xs font-semibold text-[#696E82] hover:bg-[#F2F4FF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Updating Progress..." : "Save Progress & Phases"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import / Export Modal */}
      <CsvImportExportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        workspaceSlug={context.tenantSlug}
        defaultType="projects"
        lockedType={true}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
