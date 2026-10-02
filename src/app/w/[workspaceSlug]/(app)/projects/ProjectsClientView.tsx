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
  projectManagerId?: string | null;
  projectCoordinatorId?: string | null;
  siteCity?: string | null;
  googleMapLocation?: string | null;
  contractorId?: string | null;
  consultantId?: string | null;
  plotArea?: string | null;
  constructionArea?: string | null;
  primaryClient?: { id: string; name: string; company?: string | null } | null;
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

  // Create Project Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    projectType: "Residential Architecture",
    projectManagerId: "",
    projectCoordinatorId: "",
    siteAddress: "",
    siteCity: "",
    googleMapLocation: "",
    contractorId: "",
    consultantId: "",
    plotArea: "",
    constructionArea: "",
    startDate: "",
    targetDate: "",
  });

  // Edit Project Form State
  const [editFormData, setEditFormData] = useState({
    code: "",
    name: "",
    description: "",
    projectType: "",
    projectManagerId: "",
    projectCoordinatorId: "",
    siteAddress: "",
    siteCity: "",
    googleMapLocation: "",
    contractorId: "",
    consultantId: "",
    plotArea: "",
    constructionArea: "",
    currentPhase: "",
    status: "ACTIVE" as ProjectItem["status"],
    startDate: "",
    targetDate: "",
  });

  // Filter projects
  const filteredProjects = initialProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.siteCity || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.projectCoordinator?.user?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.projectManager?.user?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.siteAddress || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesPhase = phaseFilter === "ALL" || p.currentPhase === phaseFilter;

    return matchesSearch && matchesStatus && matchesPhase;
  });

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
          description: formData.description.trim() || undefined,
          projectType: formData.projectType || undefined,
          projectManagerId: formData.projectManagerId || undefined,
          projectCoordinatorId: formData.projectCoordinatorId || undefined,
          siteAddress: formData.siteAddress.trim() || undefined,
          siteCity: formData.siteCity.trim() || undefined,
          googleMapLocation: formData.googleMapLocation.trim() || undefined,
          contractorId: formData.contractorId || undefined,
          consultantId: formData.consultantId || undefined,
          plotArea: formData.plotArea.trim() || undefined,
          constructionArea: formData.constructionArea.trim() || undefined,
          startDate: formData.startDate || undefined,
          targetDate: formData.targetDate || undefined,
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
        description: "",
        projectType: "Residential Architecture",
        projectManagerId: "",
        projectCoordinatorId: "",
        siteAddress: "",
        siteCity: "",
        googleMapLocation: "",
        contractorId: "",
        consultantId: "",
        plotArea: "",
        constructionArea: "",
        startDate: "",
        targetDate: "",
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
      description: project.description || "",
      projectType: project.projectType || "Residential Architecture",
      projectManagerId: project.projectManagerId || "",
      projectCoordinatorId: project.projectCoordinatorId || "",
      siteAddress: project.siteAddress || "",
      siteCity: project.siteCity || "",
      googleMapLocation: project.googleMapLocation || "",
      contractorId: project.contractorId || "",
      consultantId: project.consultantId || "",
      plotArea: project.plotArea || "",
      constructionArea: project.constructionArea || "",
      currentPhase: project.currentPhase || "Brief",
      status: project.status,
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().split("T")[0]
        : "",
      targetDate: project.targetDate
        ? new Date(project.targetDate).toISOString().split("T")[0]
        : "",
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
          description: editFormData.description.trim() || undefined,
          projectType: editFormData.projectType || undefined,
          projectManagerId: editFormData.projectManagerId || null,
          projectCoordinatorId: editFormData.projectCoordinatorId || null,
          siteAddress: editFormData.siteAddress.trim() || undefined,
          siteCity: editFormData.siteCity.trim() || null,
          googleMapLocation: editFormData.googleMapLocation.trim() || null,
          contractorId: editFormData.contractorId || null,
          consultantId: editFormData.consultantId || null,
          plotArea: editFormData.plotArea.trim() || null,
          constructionArea: editFormData.constructionArea.trim() || null,
          currentPhase: editFormData.currentPhase || undefined,
          status: editFormData.status,
          startDate: editFormData.startDate || null,
          targetDate: editFormData.targetDate || null,
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
              onClick={() => setCsvModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F8F9FD] border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
              title="Bulk import projects or export data to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5A81FA]" />
              <span>Import / Export CSV</span>
            </button>

            <button
              type="button"
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
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
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
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <FolderKanban className="w-10 h-10 text-[#A8B1CE] mx-auto" />
          <h3 className="text-base font-bold text-[#1F1F1F]">No projects found</h3>
          <p className="text-xs text-[#696E82] max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL" || phaseFilter !== "ALL"
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
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#E2E6F0] hover:border-[#4B5320]/50 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                {/* Header Top: Code, Typology & Action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#4B5320] bg-[#4B5320]/10 px-2.5 py-1 rounded-md border border-[#4B5320]/20">
                      {p.code}
                    </span>
                    {getStatusBadge(p.status)}
                  </div>

                  {/* Owner/Admin Action Buttons (Edit / Progress / Delete) */}
                  {canManage && (
                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
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

                {/* Title and Typology */}
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-[#696E82] uppercase tracking-wider mb-1">
                    <Building2 className="w-3 h-3 text-[#4B5320]" />
                    <span>{p.projectType || "Architecture"}</span>
                    <span>•</span>
                    <span className="font-mono text-[#D4AF37] font-bold">
                      Phase: {p.currentPhase || "Brief"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight group-hover:text-[#4B5320] transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#696E82] line-clamp-2 mt-1">
                    {p.description || "Architectural scope defined for execution and design coordination."}
                  </p>
                </div>

                {/* Architectural Phase Progress Bar */}
                <div className="pt-2">
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
                <div className="pt-1">
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

                {/* Metadata Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-[#E2E6F0]">
                  <div>
                    <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                      Project Coordinator
                    </span>
                    <span className="font-semibold text-[#1F1F1F] truncate block">
                      {p.projectCoordinator?.user.fullName || p.primaryClient?.name || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                      Project Manager
                    </span>
                    <span className="font-semibold text-[#1F1F1F] truncate block">
                      {p.projectManager?.user.fullName || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[10px] uppercase font-semibold flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-[#4B5320]" />
                      <span>{p.siteCity ? `City: ${p.siteCity}` : "Site Location"}</span>
                    </span>
                    <span className="text-[#696E82] truncate block" title={p.siteAddress || p.siteCity || ""}>
                      {p.siteCity || p.siteAddress || "Site location pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                      Area
                    </span>
                    <span className="font-semibold text-[#4B5320] truncate block">
                      {p.constructionArea || p.plotArea || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-2 border-t border-[#E2E6F0]/60 flex items-center justify-between">
                <span className="text-[10px] text-[#696E82] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {p.targetDate
                      ? `Due ${new Date(p.targetDate).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}`
                      : "Timeline Open"}
                  </span>
                </span>
                <Link
                  href={`/w/${context.tenantSlug}/projects/${p.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B5320] hover:text-[#3d441a] hover:underline cursor-pointer"
                >
                  <span>Open Project Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Typology / Commission Type
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

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Site Location / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Sector 15, Golf Course Extension Road, Gurugram"
                  value={formData.siteAddress}
                  onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Google Map Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=... or Plus Code"
                  value={formData.googleMapLocation}
                  onChange={(e) => setFormData({ ...formData, googleMapLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                />
              </div>

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
                    Total Construction Area
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Commencement / Start Date
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
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:border-[#4B5320] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Architectural Scope & Narrative
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                    Typology / Commission Type
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

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Site Location / Physical Address
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

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Google Map Location
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
                    Total Construction Area
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
                    Target Completion Date
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

              <div>
                <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                  Scope & Architectural Description
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
