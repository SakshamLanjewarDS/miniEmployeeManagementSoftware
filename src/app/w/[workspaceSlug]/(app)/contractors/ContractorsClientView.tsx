"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  FolderGit2,
  ExternalLink,
  Edit2,
  Archive,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Link as LinkIcon,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Tablet,
  Monitor,
  Menu,
  Bell,
  CheckSquare,
  FolderKanban,
  FileCheck2,
  Receipt,
  Users,
  Briefcase,
  Building,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  ArrowLeft,
  Info,
  RefreshCw,
  Folder,
  Trash2,
  Calendar,
  Sparkles,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";

export interface ProjectContractorItem {
  id: string;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
    isArchived: boolean;
    status: string;
  };
  scope: string | null;
  engagementStatus: string;
  createdAt: string;
  quotations: Array<{
    id: string;
    quotationNumber: string;
    revision: number;
    amount: number;
    currency: string;
    status: string;
    submittedDate: string;
    validityDate: string | null;
    notes: string | null;
  }>;
}

export interface ContractorItem {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  firmName: string | null;
  trade: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects: ProjectContractorItem[];
  totalAccessibleProjects: number;
}

export interface ContractorsClientViewProps {
  initialContractors: ContractorItem[];
  projects: Array<{ id: string; code: string; name: string }>;
  workspaceSlug: string;
  userRole: string;
  userFullName?: string;
  hasFinanceAccess: boolean;
}

export default function ContractorsClientView({
  initialContractors,
  projects,
  workspaceSlug,
  userRole,
  userFullName,
  hasFinanceAccess,
}: ContractorsClientViewProps) {
  const router = useRouter();

  // Viewport mode switcher
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  // State mode: Reference directory vs Empty state simulation
  const [dataMode, setDataMode] = useState<"directory" | "empty">("directory");

  // List & Filter States
  const [contractors, setContractors] = useState<ContractorItem[]>(initialContractors);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "archived" | "all">("active");
  const [selectedTrade, setSelectedTrade] = useState<string>("ALL");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [quotationFilter, setQuotationFilter] = useState<"ALL" | "WITH_QUOTES" | "NO_QUOTES">("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Drawers
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorItem | null>(null);
  const [projectManageContractor, setProjectManageContractor] = useState<ContractorItem | null>(null);
  const [detailContractor, setDetailContractor] = useState<ContractorItem | null>(null);
  const [expandedProjectsContractor, setExpandedProjectsContractor] = useState<ContractorItem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form States - Create
  const [createName, setCreateName] = useState("");
  const [createTrade, setCreateTrade] = useState("Civil / Masonry");
  const [createContact, setCreateContact] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createFirmName, setCreateFirmName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createSelectedProjectIds, setCreateSelectedProjectIds] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [formValidationErrors, setFormValidationErrors] = useState<{ [key: string]: string }>({});

  // Form States - Edit
  const [editName, setEditName] = useState("");
  const [editTrade, setEditTrade] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Form States - Project Association
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState("");
  const [associationScope, setAssociationScope] = useState("");
  const [submittingAssociation, setSubmittingAssociation] = useState(false);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Standard architectural trade disciplines
  const standardTrades = [
    "Civil / Masonry",
    "Structural Steel / Fabrication",
    "Electrical",
    "Plumbing / Sanitary",
    "Carpentry / Millwork",
    "HVAC / Mechanical",
    "Painting / Finishing",
    "Glass & Glazing",
    "Flooring & Tiling",
    "Landscape / Hardscape",
  ];

  // Representative realistic sample contractor directory records
  const sampleContractors: ContractorItem[] = useMemo(() => [
    {
      id: "cont-1",
      name: "Rameshwar Patel",
      firmName: "Patel Earthmovers & Civil Foundations",
      trade: "Civil / Masonry",
      contact: "+91 98221 44552",
      email: "patel.civil@earthmovers.co.in",
      address: "Plot 12, Industrial Area, Sector 5, Kolkata",
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      totalAccessibleProjects: 2,
      projects: [
        {
          id: "pc-1",
          projectId: projects[0]?.id || "prj-1",
          project: {
            id: projects[0]?.id || "prj-1",
            code: projects[0]?.code || "HZ-2026",
            name: projects[0]?.name || "Horizon Towers Luxury Residence",
            isArchived: false,
            status: "IN_PROGRESS",
          },
          scope: "PCC excavation, basement retaining walls & RCC superstructure",
          engagementStatus: "COMMISSIONED",
          createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          quotations: [
            {
              id: "q-1",
              quotationNumber: "QT-PATEL-001",
              revision: 1,
              amount: 820000,
              currency: "INR",
              status: "ACCEPTED",
              submittedDate: "2026-09-18",
              validityDate: "2026-12-31",
              notes: "Contractual commitment recorded separately from cash flow",
            },
          ],
        },
        {
          id: "pc-2",
          projectId: projects[1]?.id || "prj-2",
          project: {
            id: projects[1]?.id || "prj-2",
            code: projects[1]?.code || "TEST-PRJ-01",
            name: projects[1]?.name || "Test Site Alpha",
            isArchived: false,
            status: "IN_PROGRESS",
          },
          scope: "Trial pit excavation and soil test stabilization",
          engagementStatus: "COMPLETED",
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          quotations: [],
        },
      ],
    },
    {
      id: "cont-2",
      name: "Sunil Sharma",
      firmName: "Sharma Electricals & Substation Works",
      trade: "Electrical",
      contact: "+91 97110 33221",
      email: "sharma.electricals@gmail.com",
      address: "44 Central Avenue, Kolkata",
      isActive: true,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      totalAccessibleProjects: 1,
      projects: [
        {
          id: "pc-3",
          projectId: projects[0]?.id || "prj-1",
          project: {
            id: projects[0]?.id || "prj-1",
            code: projects[0]?.code || "HZ-2026",
            name: projects[0]?.name || "Horizon Towers Luxury Residence",
            isArchived: false,
            status: "IN_PROGRESS",
          },
          scope: "LT/HT panel installation & riser conduits",
          engagementStatus: "COMMISSIONED",
          createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
          quotations: [
            {
              id: "q-2",
              quotationNumber: "QT-SHARMA-004",
              revision: 0,
              amount: 450000,
              currency: "INR",
              status: "SUBMITTED",
              submittedDate: "2026-09-22",
              validityDate: "2026-11-30",
              notes: "Pending lead partner technical review",
            },
          ],
        },
      ],
    },
    {
      id: "cont-3",
      name: "Deepak Mistry",
      firmName: "Precision Carpentry & Veneer Joinery",
      trade: "Carpentry / Millwork",
      contact: null, // "No phone recorded"
      email: "mistry.woodworks@yahoo.com",
      address: "Timber Market Yard, Tangra",
      isActive: true,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      totalAccessibleProjects: 0,
      projects: [], // "No project links yet", "0 recorded"
    },
    {
      id: "cont-4",
      name: "Mohammed Ansari",
      firmName: "Ansari Plumbing & Firefighting Lines",
      trade: "Plumbing / Sanitary",
      contact: "+91 99882 11009",
      email: "ansari.sanitary@rediffmail.com",
      address: "Ripon Street Trade Center, Kolkata",
      isActive: true,
      createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      totalAccessibleProjects: 1,
      projects: [
        {
          id: "pc-4",
          projectId: projects[1]?.id || "prj-2",
          project: {
            id: projects[1]?.id || "prj-2",
            code: projects[1]?.code || "TEST-PRJ-01",
            name: projects[1]?.name || "Test Site Alpha",
            isArchived: false,
            status: "IN_PROGRESS",
          },
          scope: "Underground drainage and storm water bypass",
          engagementStatus: "COMMISSIONED",
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          quotations: [], // "0 recorded"
        },
      ],
    },
    {
      id: "cont-5",
      name: "Gurpreet Singh",
      firmName: "Singh Metal & Glazing Systems",
      trade: "Structural Steel / Fabrication",
      contact: null, // "No phone recorded"
      email: null,
      address: "Howrah Heavy Works",
      isActive: true,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      totalAccessibleProjects: 0,
      projects: [], // "No project links yet", "0 recorded"
    },
    {
      id: "cont-6",
      name: "Vikramaditya Rao",
      firmName: "Deccan HVAC & VRF Engineering",
      trade: "HVAC / Mechanical",
      contact: "+91 94220 55667",
      email: "rao.deccan@hvacindia.com",
      address: "Salt Lake Sector V, Kolkata",
      isActive: true,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      totalAccessibleProjects: 1,
      projects: [
        {
          id: "pc-5",
          projectId: projects[0]?.id || "prj-1",
          project: {
            id: projects[0]?.id || "prj-1",
            code: projects[0]?.code || "HZ-2026",
            name: projects[0]?.name || "Horizon Towers Luxury Residence",
            isArchived: false,
            status: "IN_PROGRESS",
          },
          scope: "Chiller plant and copper refrigerant riser piping",
          engagementStatus: "COMMISSIONED",
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          quotations: [
            {
              id: "q-3",
              quotationNumber: "QT-DECCAN-VRF",
              revision: 2,
              amount: 1200000,
              currency: "INR",
              status: "ACCEPTED",
              submittedDate: "2026-09-10",
              validityDate: "2026-12-15",
              notes: "Approved for baseline mechanical commissioning",
            },
          ],
        },
      ],
    },
  ], [projects]);

  // Synchronize state dynamically whenever server component re-renders
  useEffect(() => {
    if (initialContractors && initialContractors.length > 0) {
      setContractors(initialContractors);
    } else {
      setContractors(sampleContractors);
    }
  }, [initialContractors, sampleContractors]);

  // Active pool based on data mode
  const activeDataset: ContractorItem[] = useMemo(() => {
    if (dataMode === "empty") return [];
    return contractors;
  }, [dataMode, contractors]);

  // Live real-time fetcher
  const fetchFreshContractors = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/contractors?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.contractors && Array.isArray(data.contractors)) {
          setContractors(data.contractors);
        }
      }
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered Contractors List
  const filteredContractors = useMemo(() => {
    return activeDataset.filter((c) => {
      // Status tab
      if (statusTab === "active" && !c.isActive) return false;
      if (statusTab === "archived" && c.isActive) return false;

      // Trade
      if (selectedTrade !== "ALL" && c.trade !== selectedTrade) return false;

      // Project filter
      if (selectedProjectFilter !== "ALL") {
        const hasProject = c.projects.some(
          (p) => p.project.code === selectedProjectFilter || p.project.id === selectedProjectFilter
        );
        if (!hasProject) return false;
      }

      // Quotation availability filter
      if (quotationFilter === "WITH_QUOTES") {
        const totalQuotes = c.projects.reduce((sum, p) => sum + p.quotations.length, 0);
        if (totalQuotes === 0) return false;
      } else if (quotationFilter === "NO_QUOTES") {
        const totalQuotes = c.projects.reduce((sum, p) => sum + p.quotations.length, 0);
        if (totalQuotes > 0) return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchFirm = c.firmName?.toLowerCase().includes(q) ?? false;
        const matchTrade = c.trade.toLowerCase().includes(q);
        const matchContact = c.contact?.toLowerCase().includes(q) ?? false;
        const matchProject = c.projects.some(
          (p) => p.project.code.toLowerCase().includes(q) || p.project.name.toLowerCase().includes(q)
        );
        if (!matchName && !matchFirm && !matchTrade && !matchContact && !matchProject) return false;
      }

      return true;
    });
  }, [activeDataset, statusTab, selectedTrade, selectedProjectFilter, quotationFilter, searchQuery]);

  const totalPages = Math.ceil(filteredContractors.length / pageSize) || 1;
  const paginatedContractors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContractors.slice(start, start + pageSize);
  }, [filteredContractors, currentPage, pageSize]);

  // Count active bottom sheet filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTrade !== "ALL") count++;
    if (selectedProjectFilter !== "ALL") count++;
    if (quotationFilter !== "ALL") count++;
    return count;
  }, [selectedTrade, selectedProjectFilter, quotationFilter]);

  const handleResetFilters = () => {
    setSelectedTrade("ALL");
    setSelectedProjectFilter("ALL");
    setQuotationFilter("ALL");
    setSearchQuery("");
  };

  // Open Edit Modal
  const openEditModal = (contractor: ContractorItem) => {
    setEditingContractor(contractor);
    setEditName(contractor.name);
    setEditTrade(contractor.trade);
    setEditContact(contractor.contact || "");
    setEditEmail(contractor.email || "");
    setEditFirmName(contractor.firmName || "");
    setEditAddress(contractor.address || "");
  };

  // Create Contractor Submit
  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};
    if (!createName.trim()) errors.name = "Contractor name is required";
    if (!createTrade.trim()) errors.trade = "Please select a trade discipline";

    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      return;
    }

    setSubmittingCreate(true);
    setErrorMessage(null);
    setFormValidationErrors({});

    try {
      const res = await fetch(`/api/contractors?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          trade: createTrade.trim(),
          contact: createContact.trim() || null,
          email: createEmail.trim() || null,
          firmName: createFirmName.trim() || null,
          address: createAddress.trim() || null,
          projectIds: createSelectedProjectIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create contractor");
      } else {
        setSuccessMessage(`Contractor "${createName}" successfully added.`);
        setIsCreateModalOpen(false);
        setCreateName("");
        setCreateContact("");
        setCreateEmail("");
        setCreateFirmName("");
        setCreateAddress("");
        setCreateSelectedProjectIds([]);
        await fetchFreshContractors();
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error creating contractor");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Edit Contractor Submit
  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor || !editName.trim()) return;

    setSubmittingEdit(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/contractors/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: editingContractor.id,
          name: editName.trim(),
          trade: editTrade.trim(),
          contact: editContact.trim() || null,
          email: editEmail.trim() || null,
          firmName: editFirmName.trim() || null,
          address: editAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update contractor");
      } else {
        setSuccessMessage(`Contractor updated successfully.`);
        setContractors((prev) =>
          prev.map((c) =>
            c.id === editingContractor.id
              ? {
                  ...c,
                  name: editName.trim(),
                  trade: editTrade.trim(),
                  contact: editContact.trim() || null,
                  email: editEmail.trim() || null,
                  firmName: editFirmName.trim() || null,
                  address: editAddress.trim() || null,
                }
              : c
          )
        );
        setEditingContractor(null);
      }
    } catch {
      setErrorMessage("Network error updating contractor");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Status (Archive / Reactivate)
  const handleToggleStatus = async (contractorId: string, currentStatus: boolean) => {
    const actionName = currentStatus ? "archive" : "reactivate";
    if (!confirm(`Are you sure you want to ${actionName} this contractor?`)) return;

    try {
      const res = await fetch(`/api/contractors/toggle-status?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          isActive: !currentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update status");
      } else {
        setSuccessMessage(`Contractor ${actionName}d successfully.`);
        setContractors((prev) =>
          prev.map((c) => (c.id === contractorId ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch {
      setErrorMessage("Network error updating status");
    }
  };

  // Delete Contractor
  const handleDeleteContractor = async (contractorId: string, name: string) => {
    if (!confirm(`Permanently remove contractor "${name}" from directory?`)) return;

    try {
      const res = await fetch(
        `/api/contractors/delete?workspaceSlug=${workspaceSlug}&contractorId=${contractorId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete contractor");
      } else {
        setSuccessMessage(`Contractor "${name}" removed from directory.`);
        setContractors((prev) => prev.filter((c) => c.id !== contractorId));
      }
    } catch {
      setErrorMessage("Network error deleting contractor");
    }
  };

  // Link Project to Contractor Submit
  const handleLinkProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectManageContractor || !selectedProjectIdToLink) return;

    setSubmittingAssociation(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/contractors/${projectManageContractor.id}/projects?workspaceSlug=${workspaceSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProjectIdToLink,
            scope: associationScope.trim() || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to link project");
      } else {
        setSuccessMessage(`Project assigned to ${projectManageContractor.name}.`);
        setSelectedProjectIdToLink("");
        setAssociationScope("");
        await fetchFreshContractors();
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error assigning project");
    } finally {
      setSubmittingAssociation(false);
    }
  };

  // Unlink Project from Contractor Submit
  const handleUnlinkProject = async (associationId: string) => {
    if (!projectManageContractor) return;
    if (!confirm("Are you sure you want to remove this project assignment?")) return;

    try {
      const res = await fetch(
        `/api/contractors/${projectManageContractor.id}/projects/${associationId}?workspaceSlug=${workspaceSlug}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to unlink project");
      } else {
        setSuccessMessage("Project association unlinked.");
        await fetchFreshContractors();
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error unlinking project");
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
              onClick={() => setDataMode(dataMode === "directory" ? "empty" : "directory")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                dataMode === "directory"
                  ? "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-indigo-600/90 hover:bg-indigo-500 text-white border-indigo-500"
              }`}
            >
              <span>{dataMode === "directory" ? "Mode: Populated Directory" : "Mode: Empty Directory State"}</span>
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
              + Add Contractor
            </button>

            <button
              type="button"
              onClick={() => setDetailContractor(sampleContractors[0])}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Contractor Details
            </button>

            <button
              type="button"
              onClick={() => setProjectManageContractor(sampleContractors[0])}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Manage Projects
            </button>

            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              CSV Hub
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

          {/* PAGE HEADING */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4865F6] uppercase tracking-wider">
                <Wrench className="w-3 h-3" />
                <span>STUDIO PARTNER DIRECTORY</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Trades Verified</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] leading-snug">
                  Contractor Directory
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Manage general contractors, trades specialists, project assignments, and quotation records.
                </p>
              </div>

              {/* Primary Add Contractor Action & Overflow Menu */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Contractor</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
                    className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
                    title="Directory Operations"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isOverflowMenuOpen && (
                    <div className="absolute right-0 top-11 z-30 w-52 bg-white border border-[#E2E6F0] rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          fetchFreshContractors();
                          setIsOverflowMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#4865F6]" : "text-slate-400"}`} />
                        <span>{isRefreshing ? "Syncing..." : "Sync Contractors"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsCsvModalOpen(true);
                          setIsOverflowMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Import / Export CSV</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="space-y-3 pt-1">
            {/* 1. Full-width Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, firm, trade, or project…"
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

            {/* 2. Compact Status Tabs */}
            <div className="flex items-center gap-1 bg-[#F1F3F9] p-1 rounded-xl border border-[#E2E6F0] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setStatusTab("active");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusTab === "active"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                Active Trade Partners
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusTab("archived");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusTab === "archived"
                    ? "bg-white text-rose-700 shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                Archived
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusTab("all");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusTab === "all"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                All Records
              </button>
            </div>

            {/* 3. Filters Button & Counter */}
            <div className="flex items-center justify-between gap-2">
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
                Showing {paginatedContractors.length} of {filteredContractors.length} contractors
              </div>
            </div>

            {/* Removable Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedTrade !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Trade: {selectedTrade}
                    <button type="button" onClick={() => setSelectedTrade("ALL")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedProjectFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Project: {selectedProjectFilter}
                    <button type="button" onClick={() => setSelectedProjectFilter("ALL")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {quotationFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Quotes: {quotationFilter === "WITH_QUOTES" ? "With Quotes" : "No Quotes"}
                    <button type="button" onClick={() => setQuotationFilter("ALL")}>
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
          </div>

          {/* ==================================================== */}
          {/* CONTRACTOR CARDS LIST                                */}
          {/* Single-column stacked mobile cards                   */}
          {/* ==================================================== */}
          <div className="space-y-3 pt-1">
            {/* Screen 9: Empty Directory State */}
            {activeDataset.length === 0 ? (
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 sm:p-10 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F4F5FB] border border-[#E2E6F0] text-[#4865F6] flex items-center justify-center mx-auto shadow-2xs">
                  <Wrench className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
                    No contractors added yet.
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Add a contractor to manage trades, project links, and quotations.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Contractor</span>
                  </button>
                </div>
              </div>
            ) : filteredContractors.length === 0 ? (
              /* Screen 10: No Search/Filter Matches */
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 text-center shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    No contractors match your search or filters.
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {searchQuery
                      ? `No contractors match keyword "${searchQuery}".`
                      : "Try clearing selected trade or project criteria."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 bg-[#4865F6] text-white text-xs font-semibold rounded-xl"
                  >
                    Clear Filters
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Screen 1: Representative Contractor Cards */
              paginatedContractors.map((c) => {
                const totalQuotes = c.projects.reduce((sum, p) => sum + p.quotations.length, 0);
                const projectsCount = c.projects.length;
                const visibleProjects = c.projects.slice(0, 2);
                const hiddenProjectsCount = projectsCount > 2 ? projectsCount - 2 : 0;

                return (
                  <div
                    key={c.id}
                    className="bg-white border border-[#E2E6F0] hover:border-[#4865F6]/40 rounded-2xl p-4 shadow-xs transition-all space-y-3"
                  >
                    {/* 1. Contractor Name & Trade Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailContractor(c)}
                            className="text-left font-bold text-sm sm:text-base text-[#0F172A] hover:text-[#4865F6] transition-colors truncate block"
                          >
                            {c.name}
                          </button>

                          {/* Light blue role/trade badge */}
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#4865F6] bg-[#F2F4FF] px-2.5 py-0.5 rounded-full border border-[#D5DFFC]">
                            <Wrench className="w-3 h-3" />
                            <span>{c.trade}</span>
                          </span>
                        </div>

                        {/* 2. Firm / Company Name */}
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{c.firmName || "Independent Trade Specialist"}</span>
                        </p>
                      </div>

                      {/* Card Overflow Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveCardMenuId(activeCardMenuId === c.id ? null : c.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeCardMenuId === c.id && (
                          <div className="absolute right-0 top-7 z-20 w-48 bg-white border border-[#E2E6F0] rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailContractor(c);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#4865F6]" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openEditModal(c);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Contractor</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setProjectManageContractor(c);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Manage Projects</span>
                            </button>

                            <div className="h-px bg-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                handleToggleStatus(c.id, c.isActive);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <Archive className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.isActive ? "Archive Partner" : "Re-activate Partner"}</span>
                            </button>

                            {isPrivileged && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteContractor(c.id, c.name);
                                  setActiveCardMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Partner</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Phone / Contact Status */}
                    <div className="text-xs text-slate-600 flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {c.contact ? (
                          <a href={`tel:${c.contact}`} className="text-slate-700 hover:text-[#4865F6] hover:underline font-mono">
                            {c.contact}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No phone recorded</span>
                        )}
                      </div>

                      {c.contact && (
                        <a
                          href={`https://wa.me/${c.contact.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>

                    {/* 4. Assigned Projects Row with Small Manage Link */}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Assigned Projects:</span>
                        <button
                          type="button"
                          onClick={() => setProjectManageContractor(c)}
                          className="text-[11px] text-[#4865F6] hover:underline font-bold"
                        >
                          Manage
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {projectsCount === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No project links yet</span>
                        ) : (
                          <>
                            {visibleProjects.map((p) => (
                              <span
                                key={p.id || p.project.code}
                                className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {p.project.code}
                              </span>
                            ))}

                            {hiddenProjectsCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedProjectsContractor(c)}
                                className="font-mono text-[10px] font-bold text-[#4865F6] bg-[#F2F4FF] hover:bg-[#E2EAFE] px-2 py-0.5 rounded-md border border-[#D5DFFC]"
                              >
                                +{hiddenProjectsCount} more
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 5. Commercial Quotations Row */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px]">Quotations:</span>
                        <span className="font-semibold text-slate-900">
                          {totalQuotes === 0 ? "0 recorded" : `${totalQuotes} recorded`}
                        </span>
                      </div>

                      {/* 6. View Details Button */}
                      <button
                        type="button"
                        onClick={() => setDetailContractor(c)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          {activeDataset.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0] text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">
                  Showing page {currentPage} of {totalPages}
                </p>
                <p className="text-[11px] text-slate-400">{filteredContractors.length} total trade partners</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 bg-white border border-[#E2E6F0] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-white border border-[#E2E6F0] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
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
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Drawings</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/contractors`}
            className="flex flex-col items-center gap-1 py-1 text-[#4865F6] font-bold"
          >
            <Wrench className="w-4 h-4 stroke-[2.5]" />
            <span>Contractors</span>
            <span className="w-1 h-1 rounded-full bg-[#4865F6]"></span>
          </Link>
        </nav>
      </div>

      {/* ==================================================== */}
      {/* SCREEN 2: MOBILE FILTERS BOTTOM SHEET                */}
      {/* ==================================================== */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4865F6]" />
                <h3 className="font-bold text-sm text-[#0F172A]">Filter Trade Partners</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Trade Discipline */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Trade Discipline</label>
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Trade Disciplines</option>
                  {standardTrades.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Assignment */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Project Assignment</label>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quotation Availability */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Quotation Availability</label>
                <select
                  value={quotationFilter}
                  onChange={(e) => setQuotationFilter(e.target.value as any)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Records</option>
                  <option value="WITH_QUOTES">With Commercial Quotations</option>
                  <option value="NO_QUOTES">0 Quotations Recorded</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
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
                Apply Filters ({filteredContractors.length} Matches)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SCREEN 3: EXPANDED PROJECTS LIST MODAL               */}
      {/* ==================================================== */}
      {expandedProjectsContractor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {expandedProjectsContractor.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {expandedProjectsContractor.projects.length} Project Assignments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedProjectsContractor(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {expandedProjectsContractor.projects.map((p) => (
                <div key={p.id} className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#4865F6] bg-white px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {p.project.code}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">{p.engagementStatus}</span>
                  </div>
                  <p className="text-slate-800 font-medium truncate">{p.project.name}</p>
                  {p.scope && <p className="text-[11px] text-slate-500 italic">{p.scope}</p>}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setExpandedProjectsContractor(null)}
                className="px-4 py-2 bg-[#4865F6] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SCREEN 4: CONTRACTOR DETAILS SCREEN / DRAWER         */}
      {/* ==================================================== */}
      {detailContractor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setDetailContractor(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#4865F6] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Directory</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailContractor(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              <div className="p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px] text-[#4865F6] bg-white px-2.5 py-0.5 rounded-full border border-[#D5DFFC]">
                    {detailContractor.trade}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Approved Partner</span>
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#0F172A]">{detailContractor.name}</h3>
                <p className="text-xs text-slate-600">{detailContractor.firmName || "Independent Contractor"}</p>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-slate-800">
                        {detailContractor.contact || "No phone recorded"}
                      </span>
                    </div>
                    {detailContractor.contact && (
                      <a
                        href={`https://wa.me/${detailContractor.contact.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {detailContractor.email && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-slate-800 truncate">{detailContractor.email}</span>
                      </div>
                      <a
                        href={`mailto:${detailContractor.email}`}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold"
                      >
                        Email
                      </a>
                    </div>
                  )}

                  {detailContractor.address && (
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-100 text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{detailContractor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Projects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Assigned Projects
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const c = detailContractor;
                      setDetailContractor(null);
                      setProjectManageContractor(c);
                    }}
                    className="text-[11px] text-[#4865F6] font-bold hover:underline"
                  >
                    + Manage Links
                  </button>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  {detailContractor.projects.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">No project links yet</p>
                  ) : (
                    detailContractor.projects.map((p) => (
                      <div key={p.id} className="p-2 bg-[#F8F9FD] rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#4865F6] text-[11px]">
                            {p.project.code}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.engagementStatus}</span>
                        </div>
                        <p className="text-slate-800 font-medium text-[11px]">{p.project.name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Commercial Quotations */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Commercial Quotations
                </h4>
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  {detailContractor.projects.flatMap((p) => p.quotations).length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">0 quotations recorded</p>
                  ) : (
                    detailContractor.projects
                      .flatMap((p) => p.quotations)
                      .map((q) => (
                        <div key={q.id} className="p-2 bg-[#F8F9FD] rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-mono font-bold text-slate-900 text-xs">{q.quotationNumber}</p>
                            <p className="text-[10px] text-slate-500">Rev {q.revision} • {q.submittedDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-[#0F172A] text-xs">
                              {q.currency} {Number(q.amount).toLocaleString("en-IN")}
                            </p>
                            <span className="text-[10px] font-semibold text-emerald-700">{q.status}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const c = detailContractor;
                  setDetailContractor(null);
                  openEditModal(c);
                }}
                className="flex-1 py-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl text-center"
              >
                Edit Partner
              </button>

              <button
                type="button"
                onClick={() => {
                  const c = detailContractor;
                  setDetailContractor(null);
                  setProjectManageContractor(c);
                }}
                className="flex-1 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl text-center"
              >
                Manage Projects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SCREEN 5: MANAGE PROJECTS SCREEN / MODAL             */}
      {/* ==================================================== */}
      {projectManageContractor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase">PROJECT COMMISSIONS</span>
                <h3 className="font-bold text-sm text-[#0F172A]">
                  Manage Projects: {projectManageContractor.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProjectManageContractor(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Project Associations */}
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700">Currently Linked Projects</label>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {projectManageContractor.projects.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2">No project links yet</p>
                ) : (
                  projectManageContractor.projects.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#4865F6]">{p.project.code}</span>
                        <p className="text-[11px] text-slate-700 truncate max-w-[200px]">{p.project.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlinkProject(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Unlink Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Link New Project Form */}
            <form onSubmit={handleLinkProject} className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Add Project Link</label>
                <select
                  value={selectedProjectIdToLink}
                  onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                >
                  <option value="">Select architectural project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Scope of Work (Optional)</label>
                <input
                  type="text"
                  value={associationScope}
                  onChange={(e) => setAssociationScope(e.target.value)}
                  placeholder="e.g. Turnkey Civil / MEP execution"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProjectManageContractor(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={submittingAssociation || !selectedProjectIdToLink}
                  className="px-4 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingAssociation ? "Linking..." : "Link Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SCREEN 6: ADD CONTRACTOR FORM MODAL                  */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase">TRADE PARTNER REGISTRATION</span>
                <h3 className="text-base font-bold text-[#0F172A]">Register New Contractor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex justify-between">
                  <span>Contractor Name *</span>
                  <span className="text-[10px] text-slate-400">Required</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Rameshwar Patel"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
                {formValidationErrors.name && (
                  <p className="text-[11px] text-rose-600">{formValidationErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Firm / Company Name</label>
                  <input
                    type="text"
                    value={createFirmName}
                    onChange={(e) => setCreateFirmName(e.target.value)}
                    placeholder="e.g. Patel Earthmovers"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Trade Discipline *</label>
                  <select
                    value={createTrade}
                    onChange={(e) => setCreateTrade(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  >
                    {standardTrades.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    value={createContact}
                    onChange={(e) => setCreateContact(e.target.value)}
                    placeholder="+91 98221 44552"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Work Email</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="contractor@tradefirm.com"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Physical Address / Workshop Location</label>
                <input
                  type="text"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="e.g. Industrial Area, Sector 5, Kolkata"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="p-4 -mx-4 -mb-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {submittingCreate ? "Registering..." : "Save Contractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT CONTRACTOR MODAL                                */}
      {/* ==================================================== */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase">UPDATE DETAILS</span>
                <h3 className="font-bold text-sm text-[#0F172A]">Edit Contractor: {editingContractor.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingContractor(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContractor} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Contractor Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Firm Name</label>
                  <input
                    type="text"
                    value={editFirmName}
                    onChange={(e) => setEditFirmName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Trade Discipline</label>
                  <select
                    value={editTrade}
                    onChange={(e) => setEditTrade(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  >
                    {standardTrades.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Work Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContractor(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-bold rounded-xl shadow-xs"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SCREEN 7: CSV IMPORT / EXPORT MODAL                  */}
      {/* ==================================================== */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          fetchFreshContractors();
        }}
        workspaceSlug={workspaceSlug}
        entityType="contractors"
        title="Contractor Trade Directory CSV"
      />

      {/* ==================================================== */}
      {/* SCREEN 8: SLIDE-OUT MOBILE NAVIGATION DRAWER         */}
      {/* ==================================================== */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="bg-white w-72 max-w-[85vw] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
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

              <Link
                href={`/w/${workspaceSlug}/drawings`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-slate-400" />
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

              {/* HIGHLIGHTED CONTRACTORS DESTINATION */}
              <Link
                href={`/w/${workspaceSlug}/contractors`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold bg-[#4865F6] text-white shadow-xs"
              >
                <Wrench className="w-4 h-4" />
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
      {/* USER PROFILE MODAL                                   */}
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
                <span className="text-slate-500">Directory Authority:</span>
                <span className="font-medium text-emerald-700">Contractor & Vendor Management</span>
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
