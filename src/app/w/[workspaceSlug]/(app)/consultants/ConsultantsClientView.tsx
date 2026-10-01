"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
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
  Link as LinkIcon,
  ShieldCheck,
  Compass,
  FileSpreadsheet,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";

export interface ProjectConsultantItem {
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
}

export interface ConsultantItem {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  firmName: string | null;
  firmAddress: string | null;
  discipline: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects: ProjectConsultantItem[];
  totalAccessibleProjects: number;
}

export interface ConsultantsClientViewProps {
  initialConsultants: ConsultantItem[];
  projects: Array<{ id: string; code: string; name: string }>;
  workspaceSlug: string;
  userRole: string;
}

export default function ConsultantsClientView({
  initialConsultants,
  projects,
  workspaceSlug,
  userRole,
}: ConsultantsClientViewProps) {
  const router = useRouter();
  const [consultants, setConsultants] = useState<ConsultantItem[]>(initialConsultants);

  // Synchronize state dynamically whenever server component re-renders
  React.useEffect(() => {
    if (initialConsultants) {
      setConsultants(initialConsultants);
    }
  }, [initialConsultants]);

  // Live real-time fetcher
  const fetchFreshConsultants = async () => {
    try {
      const res = await fetch(`/api/consultants?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.consultants && Array.isArray(data.consultants)) {
          setConsultants(data.consultants);
        }
      }
    } catch {
      // silent
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "archived">("active");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("ALL");

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantItem | null>(null);
  const [projectManageConsultant, setProjectManageConsultant] = useState<ConsultantItem | null>(null);
  const [detailConsultant, setDetailConsultant] = useState<ConsultantItem | null>(null);

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createDiscipline, setCreateDiscipline] = useState("Structural");
  const [createContact, setCreateContact] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createFirmName, setCreateFirmName] = useState("");
  const [createFirmAddress, setCreateFirmAddress] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createSelectedProjectIds, setCreateSelectedProjectIds] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editDiscipline, setEditDiscipline] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [editFirmAddress, setEditFirmAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Project Association Form State
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = useState("");
  const [associationScope, setAssociationScope] = useState("");
  const [submittingAssociation, setSubmittingAssociation] = useState(false);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Unique disciplines
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    consultants.forEach((c) => {
      if (c.discipline) set.add(c.discipline);
    });
    return Array.from(set);
  }, [consultants]);

  // Filtered Consultants
  const filteredConsultants = useMemo(() => {
    return consultants.filter((c) => {
      if (statusTab === "active" && !c.isActive) return false;
      if (statusTab === "archived" && c.isActive) return false;

      if (selectedDiscipline !== "ALL" && c.discipline !== selectedDiscipline) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchFirm = c.firmName?.toLowerCase().includes(q);
        const matchDiscipline = c.discipline.toLowerCase().includes(q);
        const matchContact = c.contact?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchProject = c.projects.some(
          (p) => p.project.code.toLowerCase().includes(q) || p.project.name.toLowerCase().includes(q)
        );
        if (!matchName && !matchFirm && !matchDiscipline && !matchContact && !matchEmail && !matchProject) return false;
      }

      return true;
    });
  }, [consultants, statusTab, selectedDiscipline, searchQuery]);

  // Open Edit Modal
  const openEditModal = (consultant: ConsultantItem) => {
    setEditingConsultant(consultant);
    setEditName(consultant.name);
    setEditDiscipline(consultant.discipline);
    setEditContact(consultant.contact || "");
    setEditEmail(consultant.email || "");
    setEditFirmName(consultant.firmName || "");
    setEditFirmAddress(consultant.firmAddress || "");
    setEditNotes(consultant.notes || "");
  };

  // Create Consultant Submit
  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createDiscipline.trim()) return;

    setSubmittingCreate(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          discipline: createDiscipline.trim(),
          contact: createContact.trim() || null,
          email: createEmail.trim() || null,
          firmName: createFirmName.trim() || null,
          firmAddress: createFirmAddress.trim() || null,
          notes: createNotes.trim() || null,
          projectIds: createSelectedProjectIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create consultant");
      } else {
        setSuccessMessage(`Consultant "${createName}" successfully registered.`);
        setIsCreateModalOpen(false);
        // Reset form
        setCreateName("");
        setCreateContact("");
        setCreateEmail("");
        setCreateFirmName("");
        setCreateFirmAddress("");
        setCreateNotes("");
        setCreateSelectedProjectIds([]);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error creating consultant");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Edit Consultant Submit
  const handleEditConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultant || !editName.trim()) return;

    setSubmittingEdit(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: editingConsultant.id,
          name: editName.trim(),
          discipline: editDiscipline.trim(),
          contact: editContact.trim() || null,
          email: editEmail.trim() || null,
          firmName: editFirmName.trim() || null,
          firmAddress: editFirmAddress.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update consultant");
      } else {
        setSuccessMessage(`Consultant details updated successfully.`);
        setConsultants((prev) =>
          prev.map((c) =>
            c.id === editingConsultant.id
              ? {
                  ...c,
                  name: editName.trim(),
                  discipline: editDiscipline.trim(),
                  contact: editContact.trim() || null,
                  email: editEmail.trim() || null,
                  firmName: editFirmName.trim() || null,
                  firmAddress: editFirmAddress.trim() || null,
                  notes: editNotes.trim() || null,
                }
              : c
          )
        );
        setEditingConsultant(null);
      }
    } catch {
      setErrorMessage("Network error updating consultant");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (consultantId: string, currentStatus: boolean) => {
    const actionName = currentStatus ? "archive" : "reactivate";
    if (!confirm(`Are you sure you want to ${actionName} this consultant?`)) return;

    try {
      const res = await fetch(`/api/consultants/toggle-status?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId,
          isActive: !currentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || `Failed to ${actionName} consultant`);
      } else {
        setSuccessMessage(`Consultant successfully ${currentStatus ? "archived" : "reactivated"}.`);
        setConsultants((prev) =>
          prev.map((c) => (c.id === consultantId ? { ...c, isActive: !currentStatus } : c))
        );
      }
    } catch {
      setErrorMessage("Network error updating status");
    }
  };

  // Add Project Association
  const handleAddProjectAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectManageConsultant || !selectedProjectIdToLink) return;

    setSubmittingAssociation(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/consultants/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: projectManageConsultant.id,
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
        setProjectManageConsultant(null);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error linking project");
    } finally {
      setSubmittingAssociation(false);
    }
  };

  // Remove Project Association
  const handleRemoveProjectAssociation = async (consultantId: string, projectId: string) => {
    if (!confirm("Are you sure you want to unlink this project?")) return;

    try {
      const res = await fetch(`/api/consultants/project-link?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          consultantId,
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
              placeholder="Search by name, firm, discipline, or project..."
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

          {/* Right Action: Add Consultant & CSV (Owner/Admin Only) */}
          <div className="flex items-center gap-2">
            {isPrivileged ? (
              <>
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-3.5 py-2 bg-white border border-[#CEDEFF] hover:bg-[#F2F4FF] text-[#2C308D] text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#5A81FA]" />
                  <span>Import / Export CSV</span>
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Consultant</span>
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

        {/* Status Tabs and Discipline Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E6F0] text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F2F4FF] p-1 rounded-xl">
            <button
              onClick={() => setStatusTab("active")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusTab === "active" ? "bg-white text-[#1F1F1F] shadow-2xs font-semibold" : "text-[#696E82]"
              }`}
            >
              Active Specialists
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

          {/* Discipline Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#696E82]">Filter Discipline:</span>
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
            >
              <option value="ALL">All Disciplines</option>
              {availableDisciplines.map((disc) => (
                <option key={disc} value={disc}>
                  {disc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Consultant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConsultants.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E2E6F0] rounded-2xl p-12 text-center text-[#696E82]">
            <Briefcase className="w-10 h-10 mx-auto text-[#A8B1CE] mb-3" />
            <h3 className="text-sm font-semibold text-[#1F1F1F]">No consultants match your criteria</h3>
            <p className="text-xs text-[#696E82] mt-1">Try adjusting your search terms or active status tabs.</p>
          </div>
        ) : (
          filteredConsultants.map((consultant) => (
            <div
              key={consultant.id}
              className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:border-[#5A81FA]/40 ${
                consultant.isActive ? "border-[#E2E6F0]" : "border-gray-200 bg-gray-50/50 opacity-80"
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F] tracking-tight">{consultant.name}</h3>
                    {consultant.firmName && (
                      <div className="text-xs text-[#696E82] font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#696E82]" />
                        <span>{consultant.firmName}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF] shrink-0">
                    {consultant.discipline}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-xs text-[#696E82] pt-1">
                  {consultant.contact ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#696E82]" />
                      <a href={`tel:${consultant.contact}`} className="hover:text-[#1F1F1F] hover:underline font-mono">
                        {consultant.contact}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#696E82]">
                      <Phone className="w-3.5 h-3.5" />
                      <span>No phone recorded</span>
                    </div>
                  )}

                  {consultant.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#696E82]" />
                      <a href={`mailto:${consultant.email}`} className="hover:text-[#1F1F1F] hover:underline truncate">
                        {consultant.email}
                      </a>
                    </div>
                  )}

                  {consultant.firmAddress && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#696E82] line-clamp-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{consultant.firmAddress}</span>
                    </div>
                  )}
                </div>

                {/* Associated Projects */}
                <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#696E82]">
                    <span className="flex items-center gap-1">
                      <FolderGit2 className="w-3 h-3 text-[#5A81FA]" />
                      <span>Engaged Projects ({consultant.projects.length})</span>
                    </span>
                    {isPrivileged && (
                      <button
                        onClick={() => setProjectManageConsultant(consultant)}
                        className="text-[10px] text-[#5A81FA] hover:underline cursor-pointer font-bold"
                      >
                        + Manage
                      </button>
                    )}
                  </div>

                  {consultant.projects.length === 0 ? (
                    <p className="text-[11px] text-[#696E82] italic">
                      {isPrivileged ? "No project links yet." : "No linked projects accessible to you."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {consultant.projects.map((pc) => (
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
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-3 border-t border-[#E2E6F0] flex items-center justify-between gap-2">
                <button
                  onClick={() => setDetailConsultant(consultant)}
                  className="text-xs font-semibold text-[#5A81FA] hover:underline cursor-pointer"
                >
                  View Details →
                </button>

                {isPrivileged && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(consultant)}
                      className="p-1.5 hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                      title="Edit consultant"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(consultant.id, consultant.isActive)}
                      className="p-1.5 hover:bg-[#F2F4FF] text-[#696E82] hover:text-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                      title={consultant.isActive ? "Archive consultant" : "Reactivate consultant"}
                    >
                      {consultant.isActive ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================================================== */}
      {/* ADD CONSULTANT MODAL (OWNER / ADMIN ONLY)            */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Register Consultant</h3>
                  <p className="text-xs text-[#696E82]">Add structural, MEP, or specialist engineering firm</p>
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

            <form onSubmit={handleCreateConsultant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Consultant Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Dr. K. N. Varma"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Engineering Discipline <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createDiscipline}
                    onChange={(e) => setCreateDiscipline(e.target.value)}
                    placeholder="e.g. Structural, MEP, Landscape, Lighting"
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
                    placeholder="+91 98111 22334"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="varma@structeng.com"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Firm / Consultancy Name</label>
                <input
                  type="text"
                  value={createFirmName}
                  onChange={(e) => setCreateFirmName(e.target.value)}
                  placeholder="e.g. Varma Structural Consultants"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Firm Address</label>
                <textarea
                  rows={2}
                  value={createFirmAddress}
                  onChange={(e) => setCreateFirmAddress(e.target.value)}
                  placeholder="e.g. 502, Nariman Point Commercial Complex, Mumbai"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Technical Notes / Specializations</label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Specialized in post-tensioned slabs and coastal RCC durability"
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
                  {submittingCreate ? <span>Saving...</span> : <span>Register Consultant</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT CONSULTANT MODAL (OWNER / ADMIN ONLY)           */}
      {/* ==================================================== */}
      {editingConsultant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Edit Consultant Details</h3>
                  <p className="text-xs text-[#696E82]">Update engineering firm info or specialization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingConsultant(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditConsultant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Consultant Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Discipline</label>
                  <input
                    type="text"
                    required
                    value={editDiscipline}
                    onChange={(e) => setEditDiscipline(e.target.value)}
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
                <label className="block font-semibold text-[#1F1F1F] mb-1">Firm Address</label>
                <textarea
                  rows={2}
                  value={editFirmAddress}
                  onChange={(e) => setEditFirmAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setEditingConsultant(null)}
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
      {projectManageConsultant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Consultant Project Links</h3>
                  <p className="text-xs text-[#696E82]">{projectManageConsultant.name} ({projectManageConsultant.discipline})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectManageConsultant(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Associated Projects */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1F1F1F]">Currently Engaged Projects</label>
              {projectManageConsultant.projects.length === 0 ? (
                <p className="text-xs text-[#696E82] italic">No projects linked yet.</p>
              ) : (
                <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                  {projectManageConsultant.projects.map((pc) => (
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
                        onClick={() => handleRemoveProjectAssociation(projectManageConsultant.id, pc.projectId)}
                        className="text-red-600 hover:text-red-800 text-[11px] font-semibold cursor-pointer shrink-0"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Association */}
            <form onSubmit={handleAddProjectAssociation} className="pt-3 border-t border-[#E2E6F0] space-y-3 text-xs">
              <label className="block font-semibold text-[#1F1F1F]">Engage on Another Project</label>
              <div>
                <select
                  required
                  value={selectedProjectIdToLink}
                  onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                >
                  <option value="">Select a project...</option>
                  {projects
                    .filter((p) => !projectManageConsultant.projects.some((link) => link.projectId === p.id))
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
                  placeholder="Scope notes (e.g. Structural design & peer review for foundation raft)"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectManageConsultant(null)}
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
      {/* CONSULTANT DETAIL DRAWER                             */}
      {/* ==================================================== */}
      {detailConsultant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6F0] flex items-start justify-between gap-4 bg-[#F8F9FD]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                    {detailConsultant.discipline}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      detailConsultant.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {detailConsultant.isActive ? "Active Specialist" : "Archived"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight mt-1">{detailConsultant.name}</h3>
                {detailConsultant.firmName && (
                  <p className="text-xs text-[#696E82] font-medium mt-0.5">{detailConsultant.firmName}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailConsultant(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-lg hover:bg-[#F2F4FF] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#1F1F1F]">
              {/* Contact Information */}
              <div className="space-y-2 p-3.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider text-[11px]">Engineering Contact Information</h4>
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#696E82]">Phone:</span>
                    <span className="font-mono font-medium">{detailConsultant.contact || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#696E82]">Email:</span>
                    <span className="font-medium truncate">{detailConsultant.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#696E82]">Firm Address:</span>
                    <span className="text-right max-w-[240px] text-[#696E82]">{detailConsultant.firmAddress || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {detailConsultant.notes && (
                <div>
                  <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider text-[11px] mb-1">Specialization & Notes</h4>
                  <p className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82] whitespace-pre-line">
                    {detailConsultant.notes}
                  </p>
                </div>
              )}

              {/* Associated Projects */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Engaged Architecture Projects</span>
                  <span className="text-xs font-mono text-[#696E82]">{detailConsultant.projects.length}</span>
                </h4>
                {detailConsultant.projects.length === 0 ? (
                  <p className="text-xs text-[#696E82] italic">No projects linked to this consultant.</p>
                ) : (
                  <div className="space-y-2">
                    {detailConsultant.projects.map((pc) => (
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
              {detailConsultant.contact ? (
                <a
                  href={`tel:${detailConsultant.contact}`}
                  className="px-4 py-2 bg-[#5A81FA] text-white text-xs font-semibold rounded-xl hover:bg-[#426EE8] transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {detailConsultant.name}</span>
                </a>
              ) : (
                <div />
              )}
              {isPrivileged && (
                <button
                  onClick={() => {
                    const toEdit = detailConsultant;
                    setDetailConsultant(null);
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
        defaultType="consultants"
        lockedType={true}
        onSuccess={async () => {
          await fetchFreshConsultants();
          router.refresh();
        }}
      />
    </div>
  );
}
