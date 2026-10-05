"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  SlidersHorizontal,
  ArrowUpDown,
  Share2,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";
import { CustomFieldsManagerModal } from "@/components/custom-fields/CustomFieldsManagerModal";
import { DynamicFormFields } from "@/components/custom-fields/DynamicFormFields";
import { DynamicCardFields } from "@/components/custom-fields/DynamicCardFields";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { ContactShareModal, ShareableContact, ClientOption } from "@/components/share/ContactShareModal";

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
  customFields?: Record<string, any>;
}

export interface ContractorsClientViewProps {
  initialContractors: ContractorItem[];
  projects: Array<{ id: string; code: string; name: string }>;
  clients?: ClientOption[];
  workspaceName?: string;
  workspaceSlug: string;
  userRole: string;
  hasFinanceAccess: boolean;
  initialCustomFields?: CustomFieldDefinition[];
  initialCustomValues?: Record<string, any>;
}

export default function ContractorsClientView({
  initialContractors,
  projects,
  clients = [],
  workspaceName = "100% DESIGN Studio",
  workspaceSlug,
  userRole,
  hasFinanceAccess,
  initialCustomFields = [],
  initialCustomValues = {},
}: ContractorsClientViewProps) {
  const router = useRouter();
  const [contractors, setContractors] = useState<ContractorItem[]>(initialContractors);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [customValuesByContractor, setCustomValuesByContractor] = useState<Record<string, Record<string, any>>>(initialCustomValues);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  // Bulk Selection & Client Contact Sharing States
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareContactsList, setShareContactsList] = useState<ShareableContact[]>([]);

  const handleShareSingle = (contractor: ContractorItem) => {
    setShareContactsList([
      {
        id: contractor.id,
        name: contractor.name,
        category: contractor.trade,
        firmName: contractor.firmName,
        contact: contractor.contact,
        email: contractor.email,
        address: contractor.address,
      },
    ]);
    setShareModalOpen(true);
  };

  const handleShareBulk = () => {
    const list = contractors
      .filter((c) => selectedContractorIds.includes(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        category: c.trade,
        firmName: c.firmName,
        contact: c.contact,
        email: c.email,
        address: c.address,
      }));
    if (list.length > 0) {
      setShareContactsList(list);
      setShareModalOpen(true);
    }
  };

  const toggleSelectContractor = (id: string) => {
    setSelectedContractorIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const refreshCustomFields = async () => {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}&entity=CONTRACTOR`),
        fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}&entity=CONTRACTOR`),
      ]);
      if (fRes.ok) {
        const fData = await fRes.json();
        setCustomFields(fData.fields || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setCustomValuesByContractor(vData.values || {});
      }
    } catch (e) {
      console.error("Failed to reload contractor custom fields:", e);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const [isMounted, setIsMounted] = useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchronize state dynamically whenever server component re-renders
  React.useEffect(() => {
    if (initialContractors) {
      setContractors(initialContractors);
    }
  }, [initialContractors]);

  // Live real-time fetcher
  const fetchFreshContractors = async () => {
    try {
      const res = await fetch(`/api/contractors?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.contractors && Array.isArray(data.contractors)) {
          setContractors(data.contractors);
        }
      }
    } catch {
      // silent
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "archived">("active");
  const [selectedTrade, setSelectedTrade] = useState<string>("ALL");
  const [contractorSortBy, setContractorSortBy] = useState<string>("DATE_DESC");

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorItem | null>(null);
  const [projectManageContractor, setProjectManageContractor] = useState<ContractorItem | null>(null);
  const [detailContractor, setDetailContractor] = useState<ContractorItem | null>(null);

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createTrade, setCreateTrade] = useState("Civil / Masonry");
  const [createContact, setCreateContact] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createFirmName, setCreateFirmName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createSelectedProjectIds, setCreateSelectedProjectIds] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editTrade, setEditTrade] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Project Association Form State
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState("");
  const [associationScope, setAssociationScope] = useState("");
  const [submittingAssociation, setSubmittingAssociation] = useState(false);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Unique trades for filter pills
  const availableTrades = useMemo(() => {
    const set = new Set<string>();
    contractors.forEach((c) => {
      if (c.trade) set.add(c.trade);
    });
    return Array.from(set);
  }, [contractors]);

  // Filtered Contractors
  const filteredContractors = useMemo(() => {
    const list = contractors.filter((c) => {
      if (statusTab === "active" && !c.isActive) return false;
      if (statusTab === "archived" && c.isActive) return false;

      if (selectedTrade !== "ALL" && c.trade !== selectedTrade) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchFirm = c.firmName?.toLowerCase().includes(q);
        const matchTrade = c.trade.toLowerCase().includes(q);
        const matchContact = c.contact?.toLowerCase().includes(q);
        const matchProject = c.projects.some(
          (p) => p.project.code.toLowerCase().includes(q) || p.project.name.toLowerCase().includes(q)
        );
        if (!matchName && !matchFirm && !matchTrade && !matchContact && !matchProject) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      switch (contractorSortBy) {
        case "DATE_DESC":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "DATE_ASC":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "ALPHA_NAME_ASC":
          return a.name.localeCompare(b.name);
        case "ALPHA_NAME_DESC":
          return b.name.localeCompare(a.name);
        case "ALPHA_FIRM_ASC":
          return (a.firmName || a.name).localeCompare(b.firmName || b.name);
        case "ALPHA_FIRM_DESC":
          return (b.firmName || b.name).localeCompare(a.firmName || a.name);
        case "TRADE_ASC":
          return a.trade.localeCompare(b.trade);
        default:
          return 0;
      }
    });
  }, [contractors, statusTab, selectedTrade, searchQuery, contractorSortBy]);

  // Open Edit Modal
  const openEditModal = (contractor: ContractorItem) => {
    setEditingContractor(contractor);
    setEditName(contractor.name);
    setEditTrade(contractor.trade);
    setEditContact(contractor.contact || "");
    setEditEmail(contractor.email || "");
    setEditFirmName(contractor.firmName || "");
    setEditAddress(contractor.address || "");
    const vals = customValuesByContractor[contractor.id] || (contractor as any).customFields || {};
    setCustomFieldValues(vals);
  };

  // Create Contractor Submit
  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createTrade.trim()) return;

    setSubmittingCreate(true);
    setErrorMessage(null);

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

        if (data.contractor?.id && Object.keys(customFieldValues).length > 0) {
          try {
            await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "CONTRACTOR",
                recordId: data.contractor.id,
                values: customFieldValues,
              }),
            });
            setCustomValuesByContractor((prev) => ({
              ...prev,
              [data.contractor.id]: customFieldValues,
            }));
          } catch (err) {
            console.error("Failed to save contractor custom fields", err);
          }
        }

        // Reset form
        setCreateName("");
        setCreateContact("");
        setCreateEmail("");
        setCreateFirmName("");
        setCreateAddress("");
        setCreateSelectedProjectIds([]);
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

        if (editingContractor.id && Object.keys(customFieldValues).length > 0) {
          try {
            await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "CONTRACTOR",
                recordId: editingContractor.id,
                values: customFieldValues,
              }),
            });
            setCustomValuesByContractor((prev) => ({
              ...prev,
              [editingContractor.id]: customFieldValues,
            }));
          } catch (err) {
            console.error("Failed to save contractor custom fields", err);
          }
        }

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
        setErrorMessage(data.error || `Failed to ${actionName} contractor`);
      } else {
        setSuccessMessage(`Contractor successfully ${currentStatus ? "archived" : "reactivated"}.`);
        setContractors((prev) =>
          prev.map((c) => (c.id === contractorId ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch {
      setErrorMessage("Network error updating status");
    }
  };

  // Add Project Association
  const handleAddProjectAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectManageContractor || !selectedProjectIdToLink) return;

    setSubmittingAssociation(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/contractors/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: projectManageContractor.id,
          projectId: selectedProjectIdToLink,
          scope: associationScope.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to link project");
      } else {
        setSuccessMessage("Project association added successfully.");
        setSelectedProjectIdToLink("");
        setAssociationScope("");
        setProjectManageContractor(null);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error linking project");
    } finally {
      setSubmittingAssociation(false);
    }
  };

  // Remove Project Association
  const handleRemoveProjectAssociation = async (contractorId: string, projectId: string) => {
    if (!confirm("Are you sure you want to unlink this project?")) return;

    try {
      const res = await fetch(`/api/contractors/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          contractorId,
          projectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to remove project association");
      } else {
        setSuccessMessage("Project association removed.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error removing project link");
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
      {/* Alert Banners */}
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
              placeholder="Search by name, firm, trade, or project..."
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

          {/* Right Action: Add Contractor & CSV (Owner/Admin Only) */}
          <div className="flex items-center gap-2">
            {isPrivileged ? (
              <>
                <button
                  type="button"
                  onClick={() => setCustomFieldsModalOpen(true)}
                  className="px-3.5 py-2 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Configure dynamic form fields for Contractor Directory without code"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Form Fields</span>
                </button>
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-3.5 py-2 bg-white border border-[#CEDEFF] hover:bg-[#F2F4FF] text-[#2C308D] text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#5A81FA]" />
                  <span>Import / Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    setCustomFieldValues({});
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Contractor</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[#696E82] bg-[#F2F4FF] px-3 py-1.5 rounded-xl border border-[#E2E6F0]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span>Employee Directory (Read-Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Tabs and Trade Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E6F0] text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F2F4FF] p-1 rounded-xl">
            <button
              onClick={() => setStatusTab("active")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusTab === "active" ? "bg-white text-[#1F1F1F] shadow-2xs font-semibold" : "text-[#696E82]"
              }`}
            >
              Active Trade Partners
            </button>
            <button
              onClick={() => setStatusTab("archived")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusTab === "archived" ? "bg-white text-[#1F1F1F] shadow-2xs font-semibold" : "text-[#696E82]"
              }`}
            >
              Archived
            </button>
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusTab === "all" ? "bg-white text-[#1F1F1F] shadow-2xs font-semibold" : "text-[#696E82]"
              }`}
            >
              All Records
            </button>
          </div>

          {/* Filter Trade & Sort Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#696E82]">Filter Trade:</span>
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
              >
                <option value="ALL">All Trade Disciplines</option>
                {availableTrades.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F8F9FD] border border-[#E2E6F0] px-2.5 py-1 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#696E82]" />
              <span className="text-xs text-[#696E82] font-medium">Sort:</span>
              <select
                value={contractorSortBy}
                onChange={(e) => setContractorSortBy(e.target.value)}
                className="bg-transparent text-xs text-[#1F1F1F] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="DATE_DESC">Date Created (Newest First)</option>
                <option value="DATE_ASC">Date Created (Oldest First)</option>
                <option value="ALPHA_NAME_ASC">Contact Name (A → Z)</option>
                <option value="ALPHA_NAME_DESC">Contact Name (Z → A)</option>
                <option value="ALPHA_FIRM_ASC">Firm Name (A → Z)</option>
                <option value="ALPHA_FIRM_DESC">Firm Name (Z → A)</option>
                <option value="TRADE_ASC">Trade Discipline (A → Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-[#696E82] hover:text-[#1F1F1F] select-none">
          <input
            type="checkbox"
            checked={
              filteredContractors.length > 0 &&
              filteredContractors.every((c) => selectedContractorIds.includes(c.id))
            }
            onChange={() => {
              if (
                filteredContractors.length > 0 &&
                filteredContractors.every((c) => selectedContractorIds.includes(c.id))
              ) {
                setSelectedContractorIds((prev) =>
                  prev.filter((id) => !filteredContractors.some((c) => c.id === id))
                );
              } else {
                const toAdd = filteredContractors.map((c) => c.id);
                setSelectedContractorIds((prev) => Array.from(new Set([...prev, ...toAdd])));
              }
            }}
            className="rounded text-[#5A81FA] focus:ring-[#5A81FA] cursor-pointer"
          />
          <span>Select all visible ({filteredContractors.length})</span>
        </label>

        {selectedContractorIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2C308D] bg-[#F2F4FF] px-2.5 py-1 rounded-lg border border-[#CEDEFF]">
              {selectedContractorIds.length} selected
            </span>
            <button
              type="button"
              onClick={handleShareBulk}
              className="px-3 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to Client</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedContractorIds([])}
              className="text-[#696E82] hover:text-red-600 font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Contractor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContractors.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center text-[#696E82]">
            <Wrench className="w-10 h-10 mx-auto text-[#A8B1CE] mb-3" />
            <h3 className="text-sm font-semibold text-[#1F1F1F]">No contractors match your criteria</h3>
            <p className="text-xs text-[#696E82] mt-1">Try adjusting your search terms or active status tabs.</p>
          </div>
        ) : (
          filteredContractors.map((contractor) => {
            const isSelected = selectedContractorIds.includes(contractor.id);
            return (
              <div
                key={contractor.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:border-[#5A81FA]/40 ${
                  isSelected
                    ? "border-[#5A81FA] ring-2 ring-[#5A81FA]/20 bg-[#F2F4FF]/20"
                    : contractor.isActive
                    ? "border-[#E2E6F0]"
                    : "border-gray-200 bg-gray-50/50 opacity-80"
                }`}
              >
                <div className="space-y-3">
                  {/* Header with Selection Checkbox */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectContractor(contractor.id)}
                        className="mt-1 w-4 h-4 rounded text-[#5A81FA] border-[#E2E6F0] focus:ring-[#5A81FA] cursor-pointer shrink-0"
                        title="Select contractor to share"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[#1F1F1F] tracking-tight truncate">{contractor.name}</h3>
                        {contractor.firmName && (
                          <div className="text-xs text-[#696E82] font-medium flex items-center gap-1 mt-0.5 truncate">
                            <Building2 className="w-3 h-3 text-[#696E82] shrink-0" />
                            <span className="truncate">{contractor.firmName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF] shrink-0">
                      {contractor.trade}
                    </span>
                  </div>

                {/* Contact Info */}
                <div className="space-y-1 text-xs text-[#696E82] pt-1">
                  {contractor.contact ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#696E82]" />
                      <a href={`tel:${contractor.contact}`} className="hover:text-[#1F1F1F] hover:underline font-mono">
                        {contractor.contact}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#696E82]">
                      <Phone className="w-3.5 h-3.5" />
                      <span>No phone recorded</span>
                    </div>
                  )}

                  {contractor.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#696E82]" />
                      <a href={`mailto:${contractor.email}`} className="hover:text-[#1F1F1F] hover:underline truncate">
                        {contractor.email}
                      </a>
                    </div>
                  )}

                  {contractor.address && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#696E82] line-clamp-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{contractor.address}</span>
                    </div>
                  )}
                </div>

                {/* Dynamic Custom Fields */}
                <DynamicCardFields
                  fields={customFields}
                  values={customValuesByContractor[contractor.id] || (contractor as any).customFields || {}}
                />

                {/* Associated Projects Section */}
                <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#696E82]">
                    <span className="flex items-center gap-1">
                      <FolderGit2 className="w-3 h-3 text-[#5A81FA]" />
                      <span>Associated Projects ({contractor.projects.length})</span>
                    </span>
                    {isPrivileged && (
                      <button
                        onClick={() => setProjectManageContractor(contractor)}
                        className="text-[10px] text-[#5A81FA] hover:underline cursor-pointer font-bold"
                      >
                        + Manage
                      </button>
                    )}
                  </div>

                  {contractor.projects.length === 0 ? (
                    <p className="text-[11px] text-[#696E82] italic">
                      {isPrivileged ? "No project links yet." : "No linked projects accessible to you."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {contractor.projects.map((pc) => (
                        <a
                          key={pc.id}
                          href={`/w/${workspaceSlug}/projects/${pc.projectId}`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#1F1F1F] bg-[#F2F4FF] hover:bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#E2E6F0] transition-colors"
                          title={`${pc.project.name} (Status: ${pc.engagementStatus})`}
                        >
                          <span>{pc.project.code}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-[#696E82]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quotation / Financial Status summary (Strictly restricted to users with finance access) */}
                {hasFinanceAccess && (
                  <div className="pt-2 border-t border-[#E2E6F0] text-[11px] flex items-center justify-between text-[#696E82]">
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-[#5A81FA]" />
                      <span>Commercial Quotations:</span>
                    </span>
                    <span className="font-semibold text-[#1F1F1F]">
                      {contractor.projects.reduce((acc, p) => acc + p.quotations.length, 0)} recorded
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-3 border-t border-[#E2E6F0] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailContractor(contractor)}
                    className="text-xs font-semibold text-[#5A81FA] hover:underline cursor-pointer"
                  >
                    View Details →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareSingle(contractor)}
                    className="px-2.5 py-1 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#2C308D] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#CEDEFF] cursor-pointer shadow-2xs"
                    title="Share contact details with client (WhatsApp / Email)"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#5A81FA] group-hover:text-white" />
                    <span>Share</span>
                  </button>
                </div>

                {isPrivileged && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(contractor)}
                      className="p-1.5 hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                      title="Edit contractor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(contractor.id, contractor.isActive)}
                      className="p-1.5 hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                      title={contractor.isActive ? "Archive contractor" : "Reactivate contractor"}
                    >
                      {contractor.isActive ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* ==================================================== */}
      {/* ADD CONTRACTOR MODAL (OWNER / ADMIN ONLY)            */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Add New Contractor</h3>
                  <p className="text-xs text-[#696E82]">Register external trade partner or contractor firm</p>
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

            <form onSubmit={handleCreateContractor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Contractor Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Trade Discipline <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createTrade}
                    onChange={(e) => setCreateTrade(e.target.value)}
                    placeholder="e.g. Civil / Masonry, Carpentry, Electrical"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={createContact}
                    onChange={(e) => setCreateContact(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="ramesh@patelcivil.com"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Firm / Agency Name</label>
                <input
                  type="text"
                  value={createFirmName}
                  onChange={(e) => setCreateFirmName(e.target.value)}
                  placeholder="e.g. Patel Civil & Infrastructure LLP"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Office / Yard Address</label>
                <textarea
                  rows={2}
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="e.g. Unit 4, MIDC Industrial Area, Turbhe, Navi Mumbai"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Project Assignments */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Associate With Initial Projects (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                  {projects.map((proj) => {
                    const checked = createSelectedProjectIds.includes(proj.id);
                    return (
                      <label key={proj.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateSelectedProjectIds([...createSelectedProjectIds, proj.id]);
                            } else {
                              setCreateSelectedProjectIds(createSelectedProjectIds.filter((id) => id !== proj.id));
                            }
                          }}
                          className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                        />
                        <span className="font-mono font-bold text-[#5A81FA]">{proj.code}</span>
                        <span className="truncate text-[#696E82]">{proj.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={submittingCreate}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingCreate ? <span>Saving...</span> : <span>Register Contractor</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT CONTRACTOR MODAL (OWNER / ADMIN ONLY)           */}
      {/* ==================================================== */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Edit Contractor Details</h3>
                  <p className="text-xs text-[#696E82]">Update contact details or trade categorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContractor(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContractor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Contractor Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Trade Discipline</label>
                  <input
                    type="text"
                    required
                    value={editTrade}
                    onChange={(e) => setEditTrade(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Firm / Agency Name</label>
                <input
                  type="text"
                  value={editFirmName}
                  onChange={(e) => setEditFirmName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Office / Yard Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={submittingEdit}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setEditingContractor(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingEdit ? <span>Saving...</span> : <span>Save Updates</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MANAGE PROJECT ASSOCIATIONS MODAL                    */}
      {/* ==================================================== */}
      {projectManageContractor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Project Links</h3>
                  <p className="text-xs text-[#696E82]">{projectManageContractor.name} ({projectManageContractor.trade})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectManageContractor(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Associated Projects List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1F1F1F]">Currently Associated Projects</label>
              {projectManageContractor.projects.length === 0 ? (
                <p className="text-xs text-[#696E82] italic">No projects linked yet.</p>
              ) : (
                <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                  {projectManageContractor.projects.map((pc) => (
                    <div key={pc.id} className="p-3 flex items-center justify-between gap-3 bg-[#F8F9FD]">
                      <div>
                        <div className="font-bold text-[#1F1F1F] flex items-center gap-2">
                          <span className="font-mono text-[#5A81FA] bg-white px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                            {pc.project.code}
                          </span>
                          <span>{pc.project.name}</span>
                        </div>
                        {pc.scope && <p className="text-[11px] text-[#696E82] mt-0.5">Scope: {pc.scope}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveProjectAssociation(projectManageContractor.id, pc.projectId)}
                        className="text-red-600 hover:text-red-800 text-[11px] font-semibold cursor-pointer shrink-0"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Association Form */}
            <form onSubmit={handleAddProjectAssociation} className="pt-3 border-t border-[#E2E6F0] space-y-3 text-xs">
              <label className="block font-semibold text-[#1F1F1F]">Link Another Project</label>
              <div>
                <select
                  required
                  value={selectedProjectIdToLink}
                  onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                >
                  <option value="">Select a project...</option>
                  {projects
                    .filter((p) => !projectManageContractor.projects.some((link) => link.projectId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={associationScope}
                  onChange={(e) => setAssociationScope(e.target.value)}
                  placeholder="Scope notes (e.g. Masonry for Courtyard and Boundary Wall)"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectManageContractor(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={submittingAssociation || !selectedProjectIdToLink}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingAssociation ? <span>Linking...</span> : <span>Add Association</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CONTRACTOR DETAIL DRAWER                             */}
      {/* ==================================================== */}
      {detailContractor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6F0] flex items-start justify-between gap-4 bg-[#F8F9FD]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                    {detailContractor.trade}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      detailContractor.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {detailContractor.isActive ? "Active Partner" : "Archived"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight mt-1">{detailContractor.name}</h3>
                {detailContractor.firmName && (
                  <p className="text-xs text-[#696E82] font-medium mt-0.5">{detailContractor.firmName}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailContractor(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-lg hover:bg-[#F2F4FF] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#1F1F1F]">
              {/* Contact Information */}
              <div className="space-y-2 p-3.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider text-[11px]">Contact Directory Information</h4>
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#696E82]">Phone:</span>
                    <span className="font-mono font-medium">{detailContractor.contact || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#696E82]">Email:</span>
                    <span className="font-medium truncate">{detailContractor.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#696E82]">Address:</span>
                    <span className="text-right max-w-[240px] text-[#696E82]">{detailContractor.address || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Associated Projects */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Assigned Architecture Projects</span>
                  <span className="text-xs font-mono text-[#696E82]">{detailContractor.projects.length}</span>
                </h4>
                {detailContractor.projects.length === 0 ? (
                  <p className="text-xs text-[#696E82] italic">No projects linked to this trade partner.</p>
                ) : (
                  <div className="space-y-2">
                    {detailContractor.projects.map((pc) => (
                      <div key={pc.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <a
                            href={`/w/${workspaceSlug}/projects/${pc.projectId}`}
                            className="font-bold text-[#1F1F1F] hover:text-[#5A81FA] flex items-center gap-1.5"
                          >
                            <span className="font-mono text-[#5A81FA] bg-white px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                              {pc.project.code}
                            </span>
                            <span>{pc.project.name}</span>
                          </a>
                          <span className="text-[10px] font-semibold text-[#696E82] bg-white px-2 py-0.5 rounded border border-[#E2E6F0]">
                            {pc.engagementStatus}
                          </span>
                        </div>
                        {pc.scope && <p className="text-xs text-[#696E82] pt-1">Scope: {pc.scope}</p>}

                        {/* Quotations for this project (If finance permitted) */}
                        {hasFinanceAccess && pc.quotations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#E2E6F0] space-y-1">
                            <span className="text-[10px] font-semibold text-[#696E82] block">Quotations / Commitments:</span>
                            {pc.quotations.map((q) => (
                              <div key={q.id} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-[#E2E6F0]">
                                <div>
                                  <span className="font-mono font-bold text-[#1F1F1F]">{q.quotationNumber}</span>
                                  <span className="text-[10px] text-[#696E82] ml-1">(Rev {q.revision})</span>
                                </div>
                                <div className="font-mono font-bold text-[#5A81FA]">
                                  {q.currency} {q.amount.toLocaleString("en-IN")}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {detailContractor.contact ? (
                  <a
                    href={`tel:${detailContractor.contact}`}
                    className="px-4 py-2 bg-[#5A81FA] text-white text-xs font-semibold rounded-xl hover:bg-[#426EE8] transition-colors flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {detailContractor.name}</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    const toShare = detailContractor;
                    setDetailContractor(null);
                    handleShareSingle(toShare);
                  }}
                  className="px-3.5 py-2 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#2C308D] hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#CEDEFF] cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Contact</span>
                </button>
              </div>
              {isPrivileged && (
                <button
                  onClick={() => {
                    const toEdit = detailContractor;
                    setDetailContractor(null);
                    openEditModal(toEdit);
                  }}
                  className="px-3 py-2 bg-white border border-[#E2E6F0] text-xs font-semibold text-[#1F1F1F] rounded-xl hover:bg-[#F2F4FF] cursor-pointer"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import/Export Modal */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        workspaceSlug={workspaceSlug}
        defaultType="contractors"
        lockedType={true}
        onSuccess={async () => {
          await fetchFreshContractors();
          router.refresh();
        }}
      />

      {/* Dynamic Form Fields Manager Modal */}
      <CustomFieldsManagerModal
        isOpen={customFieldsModalOpen}
        onClose={() => setCustomFieldsModalOpen(false)}
        workspaceSlug={workspaceSlug}
        initialEntity="CONTRACTOR"
        onFieldsUpdated={refreshCustomFields}
      />

      {/* Floating Bottom Selection Bar (when 1+ contractors selected) */}
      {selectedContractorIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1F1F1F] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#5A81FA] text-white flex items-center justify-center text-xs font-bold">
              {selectedContractorIds.length}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedContractorIds.length === 1
                ? "1 contractor selected"
                : `${selectedContractorIds.length} contractors selected`}
            </span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <button
            type="button"
            onClick={handleShareBulk}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            <span>Share to Client (WhatsApp / Email)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedContractorIds([])}
            className="text-xs text-white/70 hover:text-white cursor-pointer px-2 py-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Contact Share Modal */}
      <ContactShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        contacts={shareContactsList}
        clients={clients}
        projects={projects}
        workspaceName={workspaceName}
        contactTypeLabel="Contractor"
      />
    </div>
  );
}
