"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ArrowUpDown,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { CustomFieldsManagerModal } from "@/components/custom-fields/CustomFieldsManagerModal";
import { DynamicFormFields } from "@/components/custom-fields/DynamicFormFields";
import { DynamicCardFields } from "@/components/custom-fields/DynamicCardFields";
import { SearchableDropdown, SearchableSelect } from "@/components/ui/SearchableDropdown";
import {
  getAllTypologies,
  ProjectProfileCircle,
  TypologyBadge,
  TypologyDot,
  isTypologyMatch,
} from "@/lib/typology";

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  projectType?: string | null;
  siteAddress?: string | null;
  currentPhase?: string | null;
  status: "DRAFT" | "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
  budget?: number | null;
  currency: string;
  startDate?: string | Date | null;
  targetDate?: string | Date | null;
  createdAt?: string | Date | null;
  primaryClientId?: string | null;
  projectArchitectId?: string | null;
  projectManagerId?: string | null;
  projectCoordinatorId?: string | null;
  siteCity?: string | null;
  googleMapLocation?: string | null;
  contractorId?: string | null;
  consultantId?: string | null;
  contractorIds?: string[];
  consultantIds?: string[];
  contractors?: Array<{ contractor: { id: string; name: string; firmName?: string | null; trade?: string | null } }>;
  consultants?: Array<{ consultant: { id: string; name: string; firmName?: string | null; discipline?: string | null } }>;
  plotArea?: string | null;
  constructionArea?: string | null;
  customFields?: Record<string, any> | null;
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
  initialCustomFields?: CustomFieldDefinition[];
  initialCustomValues?: Record<string, any>;
}

const PROJECT_TYPOLOGIES = [
  "Residential Architecture",
  "Luxury Villa & Penthouse",
  "Commercial & Corporate Office",
  "Healthcare & Hospital",
  "Hospitality & Boutique Resort",
  "Interior Architecture & Fitout",
  "High-Rise Residential",
  "Retail & Showroom",
  "Landscape & Urban Design",
  "Institutional & Cultural",
  "Industrial & Warehousing",
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
  initialCustomFields = [],
  initialCustomValues = {},
}: ProjectsClientViewProps) {
  const router = useRouter();

  // Role Permissions: Owner and Admin have full manipulation rights; Employee is read-only
  const canManage = context.role === "OWNER" || context.role === "ADMIN";

  const dynamicTypologies = useMemo(() => {
    return getAllTypologies(initialProjects);
  }, [initialProjects]);

  // Dynamic Custom Fields State (Configurable without code changes)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [customValues, setCustomValues] = useState<Record<string, any>>(initialCustomValues);
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  const refreshCustomFields = async () => {
    try {
      const res = await fetch(`/api/custom-fields?workspaceSlug=${context.tenantSlug}&entity=PROJECT`);
      if (res.ok) {
        const data = await res.json();
        setCustomFields(data.fields || []);
        setCustomValues(data.values || {});
      }
    } catch {
      // silent
    }
  };

  // Mounting state to eliminate browser extension attribute mismatches during hydration
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [projectSortBy, setProjectSortBy] = useState<string>("CREATED_DESC");

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
  const [createValidationErrors, setCreateValidationErrors] = useState<string[]>([]);
  const [activatingProjectId, setActivatingProjectId] = useState<string | null>(null);

  const handleQuickActivate = async (project: ProjectItem) => {
    if (!canManage) return;
    setActivatingProjectId(project.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/lifecycle?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACTIVATE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.validationErrors && data.validationErrors.length > 0) {
          throw new Error(`Activation requirements: ${data.validationErrors.join(" ")}`);
        }
        throw new Error(data.error || "Failed to activate project");
      }
      setSuccessMessage(`✓ Project "${project.name}" (${project.code}) is now ACTIVE!`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to activate project");
    } finally {
      setActivatingProjectId(null);
    }
  };

  // Distinct cities from initialProjects (memoized)
  const availableCities = useMemo(() => {
    return Array.from(
      new Set(
        initialProjects
          .map((p) => p.siteCity?.trim())
          .filter((c): c is string => Boolean(c && c.length > 0))
      )
    ).sort();
  }, [initialProjects]);

  // Active filters count (memoized)
  const activeFiltersCount = useMemo(() => {
    return [
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
      projectSortBy !== "CREATED_DESC",
    ].filter(Boolean).length;
  }, [
    statusFilter,
    phaseFilter,
    typologyFilter,
    architectFilter,
    managerFilter,
    coordinatorFilter,
    cityFilter,
    contractorFilter,
    consultantFilter,
    clientFilter,
    projectSortBy,
  ]);

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
    setProjectSortBy("CREATED_DESC");
  };

  // Create Project Form State (Supports all 18 fields + Dynamic Custom Fields)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    primaryClientId: "",
    projectType: "Residential Architecture",
    projectArchitectId: "",
    projectManagerId: "",
    projectCoordinatorId: "",
    contractorId: "",
    contractorIds: [] as string[],
    consultantId: "",
    consultantIds: [] as string[],
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
    customValues: {} as Record<string, any>,
  });

  // Edit Project Form State (Supports all 18 fields + phase & status + Dynamic Custom Fields)
  const [editFormData, setEditFormData] = useState({
    code: "",
    name: "",
    primaryClientId: "",
    projectType: "",
    projectArchitectId: "",
    projectManagerId: "",
    projectCoordinatorId: "",
    contractorId: "",
    contractorIds: [] as string[],
    consultantId: "",
    consultantIds: [] as string[],
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
    customValues: {} as Record<string, any>,
  });

  // Filter projects with advanced multi-facet filtering (memoized for instantaneous UI response)
  const filteredProjects = useMemo(() => {
    return initialProjects.filter((p) => {
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
      const matchesTypology = typologyFilter === "ALL" || isTypologyMatch(p.projectType, typologyFilter);
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
    }).sort((a, b) => {
      switch (projectSortBy) {
        case "CREATED_DESC":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "CREATED_ASC":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "TARGET_DATE_ASC": {
          if (!a.targetDate && !b.targetDate) return 0;
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        }
        case "TARGET_DATE_DESC": {
          if (!a.targetDate && !b.targetDate) return 0;
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime();
        }
        case "ALPHA_NAME_ASC":
          return a.name.localeCompare(b.name);
        case "ALPHA_NAME_DESC":
          return b.name.localeCompare(a.name);
        case "ALPHA_CODE_ASC":
          return a.code.localeCompare(b.code);
        case "ALPHA_CODE_DESC":
          return b.code.localeCompare(a.code);
        default:
          return 0;
      }
    });
  }, [
    initialProjects,
    searchQuery,
    statusFilter,
    phaseFilter,
    typologyFilter,
    architectFilter,
    managerFilter,
    coordinatorFilter,
    cityFilter,
    contractorFilter,
    consultantFilter,
    clientFilter,
    projectSortBy,
  ]);

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

  // Handle Create Project (Draft or Active Commission)
  const handleCreateSubmit = async (e: React.FormEvent, targetStatus: "DRAFT" | "ACTIVE" = "ACTIVE") => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canManage) return;

    if (targetStatus === "ACTIVE" && (!formData.code.trim() || !formData.name.trim())) {
      setErrorMessage("Project Code and Name are required for activation.");
      return;
    }
    if (targetStatus === "DRAFT" && !formData.code.trim() && !formData.name.trim()) {
      setErrorMessage("Draft project requires at least a Project Code or Name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setCreateValidationErrors([]);

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
          contractorIds: formData.contractorIds.length > 0 ? formData.contractorIds : undefined,
          consultantId: formData.consultantId || undefined,
          consultantIds: formData.consultantIds.length > 0 ? formData.consultantIds : undefined,
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
          brief: formData.description.trim() || undefined,
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.validationErrors && Array.isArray(data.validationErrors)) {
          setCreateValidationErrors(data.validationErrors);
        }
        throw new Error(data.error || "Failed to create project");
      }

      // Save custom dynamic fields values if supplied
      if (data.project && formData.customValues && Object.keys(formData.customValues).length > 0) {
        try {
          await fetch(`/api/custom-fields/values?workspaceSlug=${context.tenantSlug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "PROJECT",
              recordId: data.project.id,
              values: formData.customValues,
            }),
          });
          setCustomValues((prev) => ({
            ...prev,
            [data.project.id]: formData.customValues,
          }));
        } catch (err) {
          console.error("Failed to persist custom field values:", err);
        }
      }

      setSuccessMessage(
        targetStatus === "DRAFT"
          ? `✓ Project "${formData.name || formData.code}" saved as Draft!`
          : `✓ Project "${formData.name}" commissioned & activated into operational portfolio!`
      );
      setIsCreateModalOpen(false);
      setCreateValidationErrors([]);
      setFormData({
        code: "",
        name: "",
        primaryClientId: "",
        projectType: "Residential Architecture",
        projectArchitectId: "",
        projectManagerId: "",
        projectCoordinatorId: "",
        contractorId: "",
        contractorIds: [],
        consultantId: "",
        consultantIds: [],
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
        customValues: {},
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal with Pre-populated data
  const handleOpenEdit = (project: ProjectItem) => {
    const existingContractorIds = project.contractors?.map((c) => c.contractor.id) || (project.contractorId ? [project.contractorId] : []);
    const existingConsultantIds = project.consultants?.map((c) => c.consultant.id) || (project.consultantId ? [project.consultantId] : []);

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
      contractorIds: existingContractorIds,
      consultantId: project.consultantId || "",
      consultantIds: existingConsultantIds,
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
      customValues: customValues[project.id] || project.customFields || {},
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
          contractorIds: editFormData.contractorIds,
          consultantId: editFormData.consultantId || null,
          consultantIds: editFormData.consultantIds,
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

      // Save updated custom dynamic field values
      if (editFormData.customValues) {
        try {
          await fetch(`/api/custom-fields/values?workspaceSlug=${context.tenantSlug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "PROJECT",
              recordId: editingProject.id,
              values: editFormData.customValues,
            }),
          });
          setCustomValues((prev) => ({
            ...prev,
            [editingProject.id]: editFormData.customValues,
          }));
        } catch (err) {
          console.error("Failed to update custom field values:", err);
        }
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
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF]">
            Active Commission
          </span>
        );
      case "DRAFT":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Draft Setup
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
      case "CANCELLED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
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

  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse" suppressHydrationWarning>
        <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-7 w-64 bg-gray-200 rounded" />
            <div className="h-3 w-96 bg-gray-100 rounded" />
          </div>
          <div className="h-9 w-40 bg-gray-200 rounded-xl" />
        </div>
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 h-14" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 h-72" />
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 h-72" />
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 text-xs font-bold text-[#5A81FA] uppercase tracking-wider">
            <span>Architectural Portfolio</span>
            <span>•</span>
            <span>Commissions & Sites</span>
            <span>•</span>
            {canManage ? (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#F2F4FF] text-[#5A81FA] font-semibold border border-[#CEDEFF]">
                <ShieldCheck className="w-3 h-3 text-[#5A81FA]" />
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
              onClick={() => setCustomFieldsModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F8F9FD] border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
              title="Add or remove form fields without writing code"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#5A81FA]" />
              <span>Form Fields</span>
            </button>

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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
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
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] focus:ring-1 focus:ring-[#5A81FA] transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-[145px] w-full md:w-auto">
            <SearchableDropdown
              size="sm"
              optionType="status"
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
              searchable={false}
              clearable={false}
              options={[
                { value: "ALL", label: `All Statuses (${initialProjects.length})` },
                { value: "ACTIVE", label: "Active" },
                { value: "DRAFT", label: "Draft Setup" },
                { value: "PLANNING", label: "Planning" },
                { value: "ON_HOLD", label: "On Hold" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
          </div>

          {/* Phase Filter */}
          <div className="min-w-[155px] w-full md:w-auto">
            <SearchableDropdown
              size="sm"
              optionType="phase"
              value={phaseFilter}
              onChange={setPhaseFilter}
              placeholder="All Phases"
              searchPlaceholder="Search phases..."
              clearable={false}
              options={[
                { value: "ALL", label: "All Phases" },
                ...ARCHITECTURAL_PHASES.map((ph) => ({ value: ph, label: ph })),
              ]}
            />
          </div>

          {/* Sort By Filter (Date, Day & Alphabetical Order) */}
          <div className="min-w-[200px] w-full md:w-auto">
            <SearchableDropdown
              size="sm"
              value={projectSortBy}
              onChange={setProjectSortBy}
              placeholder="Sort projects..."
              searchable={false}
              clearable={false}
              options={[
                { value: "CREATED_DESC", label: "Sort: Date (Newest First)" },
                { value: "CREATED_ASC", label: "Sort: Date (Oldest First)" },
                { value: "TARGET_DATE_ASC", label: "Sort: Target Date (Earliest Day)" },
                { value: "TARGET_DATE_DESC", label: "Sort: Target Date (Latest Day)" },
                { value: "ALPHA_NAME_ASC", label: "Sort: Name (A → Z)" },
                { value: "ALPHA_NAME_DESC", label: "Sort: Name (Z → A)" },
                { value: "ALPHA_CODE_ASC", label: "Sort: Code (A → Z)" },
                { value: "ALPHA_CODE_DESC", label: "Sort: Code (Z → A)" },
              ]}
            />
          </div>

          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              isAdvancedFilterOpen || activeFiltersCount > 0
                ? "bg-[#5A81FA] text-white border-[#5A81FA] shadow-2xs"
                : "bg-[#F8F9FD] text-[#1F1F1F] border-[#E2E6F0] hover:bg-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D]">
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
            <div className="text-[11px] font-bold text-[#5A81FA] uppercase tracking-wider mb-2.5 flex items-center justify-between">
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
                <SearchableDropdown
                  size="sm"
                  value={typologyFilter}
                  onChange={setTypologyFilter}
                  placeholder="All Typologies"
                  searchPlaceholder="Search typology..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Typologies" },
                    ...dynamicTypologies.map((t) => ({
                      value: t,
                      label: t,
                      icon: <TypologyDot typology={t} />,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Project Architect */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Architect
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="employee"
                  value={architectFilter}
                  onChange={setArchitectFilter}
                  placeholder="All Architects"
                  searchPlaceholder="Search architects..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Architects" },
                    ...members.map((m) => ({
                      value: m.id,
                      label: m.user.fullName,
                      employeeId: m.employee?.employeeId || undefined,
                      designation: m.employee?.designation || "Architect",
                      type: "employee" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Project Manager */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Architecture 2
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="employee"
                  value={managerFilter}
                  onChange={setManagerFilter}
                  placeholder="All Project Architecture 2"
                  searchPlaceholder="Search team..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Project Architecture 2" },
                    ...members.map((m) => ({
                      value: m.id,
                      label: m.user.fullName,
                      employeeId: m.employee?.employeeId || undefined,
                      designation: m.employee?.designation || "Project Architecture 2",
                      type: "employee" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Project Coordinator */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Project Coordinator
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="employee"
                  value={coordinatorFilter}
                  onChange={setCoordinatorFilter}
                  placeholder="All Coordinators"
                  searchPlaceholder="Search coordinators..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Coordinators" },
                    ...members.map((m) => ({
                      value: m.id,
                      label: m.user.fullName,
                      employeeId: m.employee?.employeeId || undefined,
                      designation: m.employee?.designation || "Coordinator",
                      type: "employee" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Site City */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Site City
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="location"
                  value={cityFilter}
                  onChange={setCityFilter}
                  placeholder="All Cities"
                  searchPlaceholder="Search cities..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Cities" },
                    ...availableCities.map((city) => ({
                      value: city,
                      label: city,
                      type: "location" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Contractor
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="contractor"
                  value={contractorFilter}
                  onChange={setContractorFilter}
                  placeholder="All Contractors"
                  searchPlaceholder="Search contractors..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Contractors" },
                    ...contractors.map((c) => ({
                      value: c.id,
                      label: c.firmName || c.name,
                      badge: c.trade || undefined,
                      type: "contractor" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Consultant */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Consultant
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="consultant"
                  value={consultantFilter}
                  onChange={setConsultantFilter}
                  placeholder="All Consultants"
                  searchPlaceholder="Search consultants..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Consultants" },
                    ...consultants.map((c) => ({
                      value: c.id,
                      label: c.firmName || c.name,
                      badge: c.discipline || undefined,
                      type: "consultant" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-[10px] font-bold text-[#696E82] uppercase mb-1">
                  Client
                </label>
                <SearchableDropdown
                  size="sm"
                  optionType="client"
                  value={clientFilter}
                  onChange={setClientFilter}
                  placeholder="All Clients"
                  searchPlaceholder="Search clients..."
                  clearable={false}
                  options={[
                    { value: "ALL", label: "All Clients" },
                    ...clients.map((cl) => ({
                      value: cl.id,
                      label: cl.name,
                      badge: cl.company || undefined,
                      type: "client" as const,
                    })),
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips / Pills */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t border-[#E2E6F0]/60 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#696E82] mr-1">Active:</span>
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {phaseFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Phase: {phaseFilter}
                <button onClick={() => setPhaseFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {typologyFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Typology: {typologyFilter}
                <button onClick={() => setTypologyFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {cityFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                City: {cityFilter}
                <button onClick={() => setCityFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {architectFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Architect: {members.find((m) => m.id === architectFilter)?.user.fullName || "Selected"}
                <button onClick={() => setArchitectFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {managerFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Manager: {members.find((m) => m.id === managerFilter)?.user.fullName || "Selected"}
                <button onClick={() => setManagerFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {coordinatorFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Coordinator: {members.find((m) => m.id === coordinatorFilter)?.user.fullName || "Selected"}
                <button onClick={() => setCoordinatorFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {contractorFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Contractor: {contractors.find((c) => c.id === contractorFilter)?.firmName || contractors.find((c) => c.id === contractorFilter)?.name || "Selected"}
                <button onClick={() => setContractorFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {consultantFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
                Consultant: {consultants.find((c) => c.id === consultantFilter)?.firmName || consultants.find((c) => c.id === consultantFilter)?.name || "Selected"}
                <button onClick={() => setConsultantFilter("ALL")} className="hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF] text-[11px] font-medium">
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
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F1F1F] hover:text-[#5A81FA] cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
              ) : (
                <Square className="w-4 h-4 text-[#696E82]" />
              )}
              <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
            </button>
            <span className="text-xs text-[#696E82]">
              Showing <span className="font-bold text-[#1F1F1F]">{filteredProjects.length}</span>{" "}
              {filteredProjects.length === 1 ? "project" : "projects"}
              {selectedProjectIds.length > 0 && (
                <span className="ml-1 text-[#5A81FA] font-bold">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A81FA] text-white text-xs font-bold shadow-xs hover:bg-[#426EE8] transition-all cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4 text-white" />
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
                    ? "border-[#5A81FA] ring-2 ring-[#5A81FA]/25 bg-[#F2F4FF]/30"
                    : "border-[#E2E6F0] hover:border-[#5A81FA]/50"
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
                        className="text-[#5A81FA] hover:text-[#426EE8] transition-colors cursor-pointer p-0.5"
                        title={isSelected ? "Deselect project" : "Select project"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#A8B1CE] hover:text-[#5A81FA]" />
                        )}
                      </button>

                      {/* 1. Project Code */}
                      <span className="font-mono text-xs font-bold text-[#2C308D] bg-[#F2F4FF] px-2.5 py-1 rounded-md border border-[#CEDEFF]">
                        {p.code}
                      </span>

                      {/* 4. Typology Badge */}
                      <TypologyBadge typology={p.projectType} size="sm" />

                      {getStatusBadge(p.status)}
                    </div>

                    {/* Owner/Admin Action Buttons (Edit / Progress / Delete) */}
                    {canManage && (
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                        {p.status === "DRAFT" && (
                          <button
                            type="button"
                            disabled={activatingProjectId === p.id}
                            onClick={() => handleQuickActivate(p)}
                            className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Activate Project into Operational Workflow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                            <span>{activatingProjectId === p.id ? "Activating..." : "Activate"}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenProgressModal(p)}
                          className="px-2 py-1 rounded-lg border border-[#CEDEFF] bg-[#F2F4FF] text-[#2C308D] hover:bg-[#5A81FA] hover:text-white transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Manipulate Project Progress & Phases"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-[#5A81FA] group-hover:text-white" />
                          <span>Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:text-[#5A81FA] hover:border-[#5A81FA] hover:bg-[#F2F4FF] transition-colors cursor-pointer shadow-2xs"
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
                    <div className="flex items-center gap-2.5">
                      <ProjectProfileCircle typology={p.projectType} name={p.name} size="md" />
                      <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight group-hover:text-[#5A81FA] transition-colors">
                        {p.name}
                      </h3>
                    </div>
                    {/* 18. Brief / Project Brief */}
                    {p.description ? (
                      <div className="mt-1.5 p-2 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0]/80 text-xs text-[#696E82] flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#5A81FA] shrink-0 mt-0.5" />
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
                        <Layers className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>Phase Progress</span>
                        <span className="font-semibold text-[#1F1F1F]">({p.currentPhase || "Brief"})</span>
                      </span>
                      <span className="font-bold text-[#5A81FA]">
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
                        className="bg-[#5A81FA] h-full rounded-full transition-all duration-500"
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
                          className="text-[10px] font-bold text-[#5A81FA] hover:underline cursor-pointer"
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
                    <span className="text-[10px] font-bold text-[#5A81FA] uppercase tracking-wider block">
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

                      {/* 6. Project Architecture 2 */}
                      <div>
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold">
                          Project Architecture 2
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
                    <span className="text-[10px] font-bold text-[#5A81FA] uppercase tracking-wider block">
                      Site & Specifications
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* 10 & 11. Site Address & City */}
                      <div className="sm:col-span-2">
                        <span className="text-[#696E82] block text-[10px] uppercase font-semibold flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#5A81FA]" />
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
                            className="inline-flex items-center gap-1 text-[#5A81FA] hover:text-[#426EE8] font-semibold hover:underline"
                            title={p.googleMapLocation}
                          >
                            <ExternalLink className="w-3 h-3 text-[#5A81FA]" />
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
                        <span className="font-semibold text-[#5A81FA] truncate block">
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

                  {/* Dynamic Custom Fields configured by Admin without code changes */}
                  <DynamicCardFields
                    fields={customFields}
                    values={customValues[p.id] || p.customFields}
                  />
                </div>

                {/* Bottom Card Footer: 13. Start Date, 14. End Date, Open Project Dashboard */}
                <div className="pt-3 border-t border-[#E2E6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-[#696E82]">
                    <span className="flex items-center gap-1" title="Start Date">
                      <Calendar className="w-3 h-3 text-[#5A81FA]" />
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A81FA] hover:text-[#426EE8] hover:underline cursor-pointer ml-auto sm:ml-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    Commission New Architectural Project
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    Sets up project code, typology, manager, coordinator, site, and default 11 design phases
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createValidationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Activation Requirements Incomplete</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  The project could not be directly activated. You may click &quot;Save as Draft&quot; below to finish setup later, or satisfy the requirements below:
                </p>
                <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-amber-800">
                  {createValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Row 1: Project Code & Project Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Project Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HZ-2026, PRJ-101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] uppercase font-mono font-bold"
                  />
                  <span className="text-[10px] text-[#696E82] mt-0.5 block">
                    Unique identifier used across drawings & site visits
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Project Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Horizon Towers Luxury Residence"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] font-semibold"
                  />
                </div>
              </div>

              {/* Row 2: Client Name & Typology */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="create-client"
                  label="Client Name"
                  placeholder="Select Primary Client..."
                  searchPlaceholder="Search client..."
                  options={clients.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.company ? ` (${c.company})` : ""}`,
                    subLabel: c.company || undefined,
                  }))}
                  value={formData.primaryClientId}
                  onChange={(val) => setFormData({ ...formData, primaryClientId: val })}
                  allowOther={false}
                />

                <SearchableSelect
                  id="create-typology"
                  label="Typology"
                  placeholder="Select Typology..."
                  searchPlaceholder="Search typology..."
                  options={dynamicTypologies.map((typ) => ({
                    value: typ,
                    label: typ,
                    icon: <TypologyDot typology={typ} />,
                  }))}
                  value={formData.projectType}
                  onChange={(val) => setFormData({ ...formData, projectType: val })}
                  allowOther={false}
                />
              </div>

              {/* Row 3: Project Architect & Project Architecture 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="create-architect"
                  label="Project Architect"
                  placeholder="Select Project Architect..."
                  searchPlaceholder="Search architect..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={formData.projectArchitectId}
                  onChange={(val) => setFormData({ ...formData, projectArchitectId: val })}
                  allowOther={false}
                />

                <SearchableSelect
                  id="create-manager"
                  label="Project Architecture 2"
                  placeholder="Select Project Architecture 2..."
                  searchPlaceholder="Search project architecture 2..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={formData.projectManagerId}
                  onChange={(val) => setFormData({ ...formData, projectManagerId: val })}
                  allowOther={false}
                />
              </div>

              {/* Row 4: Project Coordinator & Site City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="create-coordinator"
                  label="Project Coordinator"
                  placeholder="Select Project Coordinator..."
                  searchPlaceholder="Search coordinator..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={formData.projectCoordinatorId}
                  onChange={(val) => setFormData({ ...formData, projectCoordinatorId: val })}
                  allowOther={false}
                />

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Site City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram, Delhi, Mumbai"
                    value={formData.siteCity}
                    onChange={(e) => setFormData({ ...formData, siteCity: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 5: Project Contractors & Project Consultants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="create-contractor"
                  label="Project Contractors"
                  placeholder="Select Contractor(s) / Vendor(s)..."
                  searchPlaceholder="Search contractors..."
                  multiSelect={true}
                  values={formData.contractorIds}
                  onMultiChange={(vals) => setFormData({ ...formData, contractorIds: vals, contractorId: vals[0] || "" })}
                  options={contractors.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.firmName ? ` (${c.firmName})` : ""}`,
                    subLabel: c.trade || c.firmName || undefined,
                  }))}
                  allowOther={false}
                />

                <SearchableSelect
                  id="create-consultant"
                  label="Project Consultants"
                  placeholder="Select Consultant(s)..."
                  searchPlaceholder="Search consultants..."
                  multiSelect={true}
                  values={formData.consultantIds}
                  onMultiChange={(vals) => setFormData({ ...formData, consultantIds: vals, consultantId: vals[0] || "" })}
                  options={consultants.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.firmName ? ` (${c.firmName})` : ""}`,
                    subLabel: c.discipline || c.firmName || undefined,
                  }))}
                  allowOther={false}
                />
              </div>

              {/* Row 6: Site Address */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Sector 15, Golf Course Extension Road, Gurugram"
                  value={formData.siteAddress}
                  onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Row 7: Google map location */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Google map location
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=... or Plus Code"
                  value={formData.googleMapLocation}
                  onChange={(e) => setFormData({ ...formData, googleMapLocation: e.target.value })}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Row 8: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 9: Plot Area & Total Construction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Plot Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000 sq.ft / 555 sq.yd"
                    value={formData.plotArea}
                    onChange={(e) => setFormData({ ...formData, plotArea: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Total Construction
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12,500 sq.ft"
                    value={formData.constructionArea}
                    onChange={(e) => setFormData({ ...formData, constructionArea: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 10: Budget */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Budget
                </label>
                <div className="flex gap-2 items-center">
                  <div className="w-28 shrink-0">
                    <SearchableDropdown
                      size="sm"
                      searchable={false}
                      clearable={false}
                      value={formData.currency}
                      onChange={(val) => setFormData({ ...formData, currency: val })}
                      options={[
                        { value: "INR", label: "INR (₹)" },
                        { value: "USD", label: "USD ($)" },
                        { value: "EUR", label: "EUR (€)" },
                        { value: "AED", label: "AED" },
                        { value: "GBP", label: "GBP (£)" },
                      ]}
                    />
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="flex-1 p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] font-mono"
                  />
                </div>
              </div>

              {/* Row 11: Brief / Project Brief */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Brief / Project Brief
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the architectural program, client objectives, site parameters, and deliverable expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Dynamic Custom Fields configured in Admin UI */}
              <DynamicFormFields
                fields={customFields}
                values={formData.customValues || {}}
                onChange={(key, val) =>
                  setFormData((prev) => ({
                    ...prev,
                    customValues: { ...(prev.customValues || {}), [key]: val },
                  }))
                }
              />

              {/* Form Buttons */}
              <div className="pt-4 border-t border-[#E2E6F0] flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleCreateSubmit(e, "DRAFT")}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  title="Save incomplete setup as draft. Operational deliverables cannot be assigned until activated."
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleCreateSubmit(e, "ACTIVE")}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  title="Validate all architectural parameters and activate into operational portfolio"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? "Activating..." : "Commission & Activate"}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    Modify Project: {editingProject.name}
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    Update project details, current phase, status, and assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Project Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Project Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-status"
                  label="Status"
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                  options={[
                    { value: "ACTIVE", label: "ACTIVE", subLabel: "In Progress" },
                    { value: "PLANNING", label: "PLANNING", subLabel: "Concept / Pre-design" },
                    { value: "ON_HOLD", label: "ON_HOLD", subLabel: "Paused" },
                    { value: "COMPLETED", label: "COMPLETED", subLabel: "Handed Over" },
                    { value: "ARCHIVED", label: "ARCHIVED" },
                  ]}
                  value={editFormData.status}
                  onChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      status: val as ProjectItem["status"],
                    })
                  }
                  allowOther={false}
                />

                <SearchableSelect
                  id="edit-phase"
                  label="Current Architectural Phase"
                  placeholder="Select phase..."
                  searchPlaceholder="Search phase..."
                  options={ARCHITECTURAL_PHASES.map((ph) => ({
                    value: ph,
                    label: ph,
                  }))}
                  value={editFormData.currentPhase}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, currentPhase: val })
                  }
                  allowOther={false}
                />
              </div>

              {/* Row 3: Client Name & Typology */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-client"
                  label="Client Name"
                  placeholder="Select Primary Client..."
                  searchPlaceholder="Search client..."
                  options={clients.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.company ? ` (${c.company})` : ""}`,
                    subLabel: c.company || undefined,
                  }))}
                  value={editFormData.primaryClientId}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, primaryClientId: val })
                  }
                  allowOther={false}
                />

                <SearchableSelect
                  id="edit-typology"
                  label="Typology"
                  placeholder="Select Typology..."
                  searchPlaceholder="Search typology..."
                  options={dynamicTypologies.map((typ) => ({
                    value: typ,
                    label: typ,
                    icon: <TypologyDot typology={typ} />,
                  }))}
                  value={editFormData.projectType}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, projectType: val })
                  }
                  allowOther={false}
                />
              </div>

              {/* Row 4: Project Architect & Project Architecture 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-architect"
                  label="Project Architect"
                  placeholder="Select Project Architect..."
                  searchPlaceholder="Search architect..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={editFormData.projectArchitectId}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, projectArchitectId: val })
                  }
                  allowOther={false}
                />

                <SearchableSelect
                  id="edit-manager"
                  label="Project Architecture 2"
                  placeholder="Select Project Architecture 2..."
                  searchPlaceholder="Search project architecture 2..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={editFormData.projectManagerId}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, projectManagerId: val })
                  }
                  allowOther={false}
                />
              </div>

              {/* Row 5: Project Coordinator & Site City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-coordinator"
                  label="Project Coordinator"
                  placeholder="Select Project Coordinator..."
                  searchPlaceholder="Search coordinator..."
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.user.fullName,
                    subLabel: m.employee?.designation || "Studio Staff",
                  }))}
                  value={editFormData.projectCoordinatorId}
                  onChange={(val) =>
                    setEditFormData({ ...editFormData, projectCoordinatorId: val })
                  }
                  allowOther={false}
                />

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Site City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram, Delhi, Mumbai"
                    value={editFormData.siteCity}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, siteCity: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 6: Project Contractors & Project Consultants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-contractor"
                  label="Project Contractors"
                  placeholder="Select Contractor(s) / Vendor(s)..."
                  searchPlaceholder="Search contractors..."
                  multiSelect={true}
                  values={editFormData.contractorIds}
                  onMultiChange={(vals) =>
                    setEditFormData({ ...editFormData, contractorIds: vals, contractorId: vals[0] || "" })
                  }
                  options={contractors.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.firmName ? ` (${c.firmName})` : ""}`,
                    subLabel: c.trade || c.firmName || undefined,
                  }))}
                  allowOther={false}
                />

                <SearchableSelect
                  id="edit-consultant"
                  label="Project Consultants"
                  placeholder="Select Consultant(s)..."
                  searchPlaceholder="Search consultants..."
                  multiSelect={true}
                  values={editFormData.consultantIds}
                  onMultiChange={(vals) =>
                    setEditFormData({ ...editFormData, consultantIds: vals, consultantId: vals[0] || "" })
                  }
                  options={consultants.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.firmName ? ` (${c.firmName})` : ""}`,
                    subLabel: c.discipline || c.firmName || undefined,
                  }))}
                  allowOther={false}
                />
              </div>

              {/* Row 7: Site Address */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Site Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Sector 15, Golf Course Extension Road, Gurugram"
                  value={editFormData.siteAddress}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, siteAddress: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Row 8: Google map location */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Google map location
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=... or Plus Code"
                  value={editFormData.googleMapLocation}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, googleMapLocation: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Row 9: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, startDate: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.targetDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, targetDate: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 10: Plot Area & Total Construction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Plot Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000 sq.ft / 555 sq.yd"
                    value={editFormData.plotArea}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, plotArea: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Total Construction
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12,500 sq.ft"
                    value={editFormData.constructionArea}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, constructionArea: e.target.value })
                    }
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Row 11: Budget */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Budget
                </label>
                <div className="flex gap-2 items-center">
                  <div className="w-28 shrink-0">
                    <SearchableDropdown
                      size="sm"
                      searchable={false}
                      clearable={false}
                      value={editFormData.currency}
                      onChange={(val) => setEditFormData({ ...editFormData, currency: val })}
                      options={[
                        { value: "INR", label: "INR (₹)" },
                        { value: "USD", label: "USD ($)" },
                        { value: "EUR", label: "EUR (€)" },
                        { value: "AED", label: "AED" },
                        { value: "GBP", label: "GBP (£)" },
                      ]}
                    />
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000000"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                    className="flex-1 p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] font-mono"
                  />
                </div>
              </div>

              {/* Row 12: Brief / Project Brief */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Brief / Project Brief
                </label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Dynamic Custom Fields configured in Admin UI */}
              <DynamicFormFields
                fields={customFields}
                values={editFormData.customValues || {}}
                onChange={(key, val) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    customValues: { ...(prev.customValues || {}), [key]: val },
                  }))
                }
              />

              {/* Form Buttons */}
              <div className="pt-4 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
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
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
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
                      <span className="font-mono text-[11px] font-bold text-[#5A81FA] bg-[#5A81FA]/10 px-1.5 py-0.5 rounded">
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
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    Manipulate Project Progress: {progressProject.name}
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    Code: <span className="font-mono font-bold text-[#5A81FA]">{progressProject.code}</span> • Advance phases, mark milestones completed, or set progress
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProgressProject(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
              {/* Live Progress Preview Banner */}
              <div className="p-4 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5A81FA]" />
                    <span>Selected Phase:</span>
                    <span className="text-[#5A81FA] font-bold">{selectedPhaseForProgress}</span>
                  </span>
                  <span className="text-sm font-bold text-[#5A81FA]">
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
                    className="bg-[#5A81FA] h-full rounded-full transition-all duration-300"
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
                  className="px-3 py-1.5 rounded-xl bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
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
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
                  className="px-3 py-1.5 rounded-xl bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] text-[11px] font-semibold transition-colors cursor-pointer ml-auto"
                >
                  Reset to Brief
                </button>
              </div>

              {/* Interactive 11-Phase Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#1F1F1F] block">
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
                            ? "border-[#5A81FA] bg-[#F2F4FF] ring-2 ring-[#5A81FA] shadow-xs"
                            : isPrior
                            ? "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 text-[#1F1F1F]"
                            : "border-[#E2E6F0] bg-[#F8F9FD] hover:bg-white text-[#696E82]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#5A81FA] text-white"
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
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A81FA] px-1.5 py-0.5 rounded bg-white border border-[#5A81FA]/30 shrink-0">
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
              <SearchableSelect
                id="progress-status"
                label="Project Commission Status"
                placeholder="Select status..."
                searchPlaceholder="Search status..."
                options={[
                  { value: "ACTIVE", label: "ACTIVE", subLabel: "In Progress" },
                  { value: "PLANNING", label: "PLANNING", subLabel: "Brief & Concept" },
                  { value: "ON_HOLD", label: "ON_HOLD", subLabel: "Paused" },
                  { value: "COMPLETED", label: "COMPLETED", subLabel: "Handover Complete" },
                ]}
                value={selectedStatusForProgress}
                onChange={(val) =>
                  setSelectedStatusForProgress(val as ProjectItem["status"])
                }
                allowOther={false}
              />

              {/* Form Buttons */}
              <div className="pt-4 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProgressProject(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{isSubmitting ? "Updating Progress..." : "Save Progress & Phases"}</span>
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

      {/* Admin Custom Fields Manager Modal (Zero-Code Dynamic Schema Builder) */}
      <CustomFieldsManagerModal
        isOpen={customFieldsModalOpen}
        onClose={() => setCustomFieldsModalOpen(false)}
        workspaceSlug={context.tenantSlug}
        initialEntity="PROJECT"
        onFieldsUpdated={refreshCustomFields}
      />
    </div>
  );
}
