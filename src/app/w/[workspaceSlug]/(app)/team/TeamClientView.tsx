"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  ShieldCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Search,
  KeyRound,
  Trash2,
  Edit,
  FolderKanban,
  RotateCcw,
  Building,
  Mail,
  Phone,
  Calendar,
  X,
  Shield,
  Briefcase,
  FileSpreadsheet,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Share2,
  Smartphone,
  Tablet,
  Monitor,
  Menu,
  Bell,
  MapPin,
  CheckSquare,
  FileCheck2,
  Receipt,
  Wrench,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  ArrowLeft,
  Info,
  RefreshCw,
  Folder,
  Layers,
  ChevronDown,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";
import BulkMailModal from "@/components/team/BulkMailModal";

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface ProjectAssignment {
  id: string;
  code: string;
  name: string;
  projectRole: string;
}

export interface EmployeeItem {
  id: string;
  membershipId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: string;
  isActive: boolean;
  joinDate: string | null;
  hasFinanceAccess?: boolean;
  projects?: ProjectAssignment[];
}

interface TeamClientViewProps {
  workspaceSlug: string;
  currentUserId: string;
  userRole: string;
  userFullName?: string;
  initialEmployees: EmployeeItem[];
  availableProjects?: ProjectOption[];
}

export default function TeamClientView({
  workspaceSlug,
  userRole,
  userFullName,
  initialEmployees,
  availableProjects = [],
}: TeamClientViewProps) {
  const router = useRouter();

  // Viewport mode switcher
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  // Main list & filter state
  const [employees, setEmployees] = useState<EmployeeItem[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [designationFilter, setDesignationFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals and Drawers
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [detailsEmployee, setDetailsEmployee] = useState<EmployeeItem | null>(null);
  const [expandedProjectsEmployee, setExpandedProjectsEmployee] = useState<EmployeeItem | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<EmployeeItem | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState("StudioPassword2026!");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBulkMailModalOpen, setIsBulkMailModalOpen] = useState<boolean>(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Issued Credentials Dialog State
  const [issuedCredentials, setIssuedCredentials] = useState<{
    fullName: string;
    employeeId: string;
    email: string;
    phone?: string | null;
    password: string;
    title: string;
    description: string;
    whatsappUrl: string;
    gmailUrl: string;
    mailtoUrl: string;
    plainTextMessage: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Add Employee Credential options
  const [addSendCredentials, setAddSendCredentials] = useState<boolean>(true);
  const [addCustomMessage, setAddCustomMessage] = useState<string>(
    "Welcome to 100% DESIGN Studio OS! Please find your official login credentials below. You can log in and review your assigned projects and architectural tasks."
  );
  const [showAddPassword, setShowAddPassword] = useState<boolean>(false);

  // Manage/Reset Password Modal State
  const [resetCustomMessage, setResetCustomMessage] = useState<string>(
    "Hello, your login password for 100% DESIGN Studio OS has been updated by the Administrator. Please find your updated credentials below."
  );
  const [resetNotifyEmployee, setResetNotifyEmployee] = useState<boolean>(true);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Bulk Selection State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Synchronize state dynamically whenever server component re-renders
  useEffect(() => {
    if (initialEmployees) {
      setEmployees(initialEmployees);
    }
  }, [initialEmployees]);

  // Live real-time fetcher
  const fetchFreshEmployees = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/employees?workspaceSlug=${workspaceSlug}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.employees && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      }
    } catch (err) {
      console.error("Live employee sync error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Background polling (every 6s) and window focus sync
  useEffect(() => {
    const handleFocus = () => {
      fetchFreshEmployees();
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(fetchFreshEmployees, 6000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [workspaceSlug]);

  // New Employee Form State
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Architecture");
  const [designation, setDesignation] = useState("Architect");
  const [role, setRole] = useState("EMPLOYEE");
  const [hasFinanceAccess, setHasFinanceAccess] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("StudioPassword2026!");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Edit Employee Form State
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editRole, setEditRole] = useState("EMPLOYEE");
  const [editHasFinanceAccess, setEditHasFinanceAccess] = useState(false);
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Compute next available sequential employee ID
  const computeNextEmployeeId = () => {
    let max = 0;
    employees.forEach((emp) => {
      const m = emp.employeeId?.match(/EMP-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return `EMP-${String(max + 1).padStart(3, "0")}`;
  };

  const openAddEmployeeModal = async () => {
    setModalError(null);
    setError(null);
    const fallbackId = computeNextEmployeeId();
    setEmployeeId(fallbackId);
    setIsAddModalOpen(true);

    try {
      const res = await fetch(`/api/employees/next-id?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.nextId) {
          setEmployeeId(data.nextId);
        }
      }
    } catch {
      // fallbackId already set
    }
  };

  // Filtered & Paginated Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Status filter
      if (statusFilter === "ACTIVE" && !emp.isActive) return false;
      if (statusFilter === "INACTIVE" && emp.isActive) return false;

      // Role filter
      if (roleFilter !== "ALL" && emp.role !== roleFilter) return false;

      // Department filter
      if (departmentFilter !== "ALL" && emp.department !== departmentFilter) return false;

      // Designation filter
      if (designationFilter !== "ALL" && emp.designation !== designationFilter) return false;

      // Project filter
      if (projectFilter !== "ALL") {
        if (!emp.projects || !emp.projects.some((p) => p.code === projectFilter || p.id === projectFilter)) {
          return false;
        }
      }

      // Search keyword
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = emp.fullName.toLowerCase().includes(q);
        const matchesEmail = emp.email.toLowerCase().includes(q);
        const matchesId = emp.employeeId.toLowerCase().includes(q);
        const matchesDept = emp.department?.toLowerCase().includes(q) ?? false;
        const matchesDesig = emp.designation?.toLowerCase().includes(q) ?? false;
        const matchesProject = emp.projects?.some((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) ?? false;
        return matchesName || matchesEmail || matchesId || matchesDept || matchesDesig || matchesProject;
      }
      return true;
    });
  }, [employees, statusFilter, roleFilter, departmentFilter, designationFilter, projectFilter, search]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Bulk Selection Helpers
  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedEmployees.length === 0) return false;
    return paginatedEmployees.every((emp) => selectedEmployeeIds.includes(emp.membershipId));
  }, [paginatedEmployees, selectedEmployeeIds]);

  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedEmployees.map((e) => e.membershipId);
      setSelectedEmployeeIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedEmployees.map((e) => e.membershipId);
      setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectEmployee = (membershipId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(membershipId)
        ? prev.filter((id) => id !== membershipId)
        : [...prev, membershipId]
    );
  };

  const clearSelection = () => {
    setSelectedEmployeeIds([]);
  };

  // Count active bottom sheet filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== "ALL") count++;
    if (departmentFilter !== "ALL") count++;
    if (designationFilter !== "ALL") count++;
    if (projectFilter !== "ALL") count++;
    return count;
  }, [roleFilter, departmentFilter, designationFilter, projectFilter]);

  const handleResetFilters = () => {
    setRoleFilter("ALL");
    setDepartmentFilter("ALL");
    setDesignationFilter("ALL");
    setProjectFilter("ALL");
    setSearch("");
  };

  // Open Edit Modal
  const openEditModal = (emp: EmployeeItem) => {
    setEditModalError(null);
    setEditingEmployee(emp);
    setEditFullName(emp.fullName);
    setEditEmail(emp.email);
    setEditPhone(emp.phone || "");
    setEditDepartment(emp.department || "Architecture");
    setEditDesignation(emp.designation || "Architect");
    setEditRole(emp.role);
    setEditHasFinanceAccess(emp.hasFinanceAccess ?? false);
    setEditProjectIds(emp.projects ? emp.projects.map((p) => p.id) : []);
  };

  // Create Employee Submit
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setModalError(null);
    setError(null);

    const targetEmpId = employeeId.trim().toUpperCase() || computeNextEmployeeId();
    const assignedPwd = temporaryPassword.trim() || "StudioPassword2026!";

    try {
      const res = await fetch(`/api/employees/create?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: targetEmpId,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          department,
          designation,
          role,
          hasFinanceAccess,
          temporaryPassword: assignedPwd,
          projectIds: selectedProjectIds,
          customMessage: addCustomMessage,
          notifyEmployee: addSendCredentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to create employee");
      } else {
        setSuccessMsg(`Created employee ${fullName} (${targetEmpId}) successfully!`);
        setIsAddModalOpen(false);

        // Fetch fresh list
        await fetchFreshEmployees();
        router.refresh();

        // Dispatch Credentials Modal
        const plainMsg = `🏢 100% DESIGN Studio — Official Account Credentials\n\nHello ${fullName},\nYour studio workspace account has been created.\n\n• Login Portal: http://localhost:3000/w/${workspaceSlug}/login\n• Employee ID: ${targetEmpId}\n• Work Email: ${email.trim().toLowerCase()}\n• Initial Password: ${assignedPwd}\n\nNote from Administrator:\n"${addCustomMessage}"\n\nPlease log in and review your assigned projects.`;
        const companyMail = "designadmin08@gmail.com";
        const subject = `[100% DESIGN Studio] Official Credentials for ${fullName} (${targetEmpId})`;
        const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
          companyMail
        )}&view=cm&fs=1&to=${encodeURIComponent(email.trim())}&su=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;
        const waUrl = phone
          ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(plainMsg)}`
          : `https://wa.me/?text=${encodeURIComponent(plainMsg)}`;
        const mailUrl = `mailto:${email.trim()}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;

        setIssuedCredentials({
          fullName,
          employeeId: targetEmpId,
          email: email.trim(),
          phone,
          password: assignedPwd,
          title: "Account Created & Credentials Ready",
          description: addSendCredentials
            ? "Credentials notification has been queued. You can also share directly via WhatsApp, Gmail, or copy below."
            : "Account created successfully. You can share credentials directly via WhatsApp, Gmail, or copy below.",
          whatsappUrl: waUrl,
          gmailUrl,
          mailtoUrl: mailUrl,
          plainTextMessage: plainMsg,
        });

        // Reset inputs
        setFullName("");
        setEmail("");
        setPhone("");
        setSelectedProjectIds([]);
        setTemporaryPassword("StudioPassword2026!");
      }
    } catch {
      setModalError("Network error while creating employee");
    } finally {
      setLoading(false);
    }
  };

  // Edit Employee Submit
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setLoading(true);
    setEditModalError(null);
    setError(null);

    try {
      const res = await fetch(`/api/employees/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: editingEmployee.membershipId,
          fullName: editFullName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim() || undefined,
          department: editDepartment,
          designation: editDesignation,
          role: editRole,
          hasFinanceAccess: editHasFinanceAccess,
          projectIds: editProjectIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditModalError(data.error || "Failed to update employee");
      } else {
        setSuccessMsg(`Updated employee ${editFullName} successfully!`);
        setEditingEmployee(null);
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setEditModalError("Network error while updating employee");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (membershipId: string, currentActive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/toggle-status?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId,
          isActive: !currentActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update status");
      } else {
        setSuccessMsg(`Member status set to ${!currentActive ? "Active" : "Inactive"}.`);
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setError("Network error while updating status");
    } finally {
      setLoading(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (membershipId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete member "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/delete?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove member");
      } else {
        setSuccessMsg(`Permanently removed member ${name}.`);
        setEmployees((prev) => prev.filter((e) => e.membershipId !== membershipId));
        setSelectedEmployeeIds((prev) => prev.filter((id) => id !== membershipId));
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setError("Network error while removing member");
    } finally {
      setLoading(false);
    }
  };

  // Direct Dispatch Dialog Helper
  const openDirectDispatchModal = (emp: EmployeeItem) => {
    const plainMsg = `🏢 100% DESIGN Studio — Welcome & Login Details\n\nHello ${emp.fullName},\nHere are your official login details for 100% DESIGN Studio OS:\n\n• Login Portal: http://localhost:3000/w/${workspaceSlug}/login\n• Employee ID: ${emp.employeeId}\n• Work Email: ${emp.email}\n\nNote: If you need to set or reset your password, please contact the Studio Administrator.\n\nPlease log in to access your assigned architectural projects and tasks.`;
    const companyMail = "designadmin08@gmail.com";
    const subject = `[100% DESIGN Studio] Your Studio OS Login Credentials (${emp.employeeId})`;
    const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
      companyMail
    )}&view=cm&fs=1&to=${encodeURIComponent(emp.email)}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainMsg)}`;
    const waUrl = emp.phone
      ? `https://wa.me/${emp.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(plainMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(plainMsg)}`;
    const mailUrl = `mailto:${emp.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainMsg)}`;

    setIssuedCredentials({
      fullName: emp.fullName,
      employeeId: emp.employeeId,
      email: emp.email,
      phone: emp.phone,
      password: "Password already set (Use Manage Password icon to change)",
      title: `Send Credentials to ${emp.fullName}`,
      description: "Dispatch login credentials directly via Gmail or WhatsApp.",
      whatsappUrl: waUrl,
      gmailUrl,
      mailtoUrl: mailUrl,
      plainTextMessage: plainMsg,
    });
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
              onClick={() => setIsFilterSheetOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Filters Sheet
            </button>

            <button
              type="button"
              onClick={openAddEmployeeModal}
              className="px-2 py-1 bg-[#4865F6] hover:bg-[#3B54DF] text-white rounded-md text-[11px] font-semibold border border-indigo-400 shrink-0"
            >
              + Add Employee
            </button>

            <button
              type="button"
              onClick={() => setDetailsEmployee(employees[0] || null)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Employee Details
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedEmployeeIds.length === 0 && paginatedEmployees[0]) {
                  setSelectedEmployeeIds([paginatedEmployees[0].membershipId]);
                }
                setIsBulkMailModalOpen(true);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Bulk Mail
            </button>

            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Import CSV
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
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-600 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
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
                <Building className="w-3 h-3" />
                <span>STUDIO DIRECTORY & ADMINISTRATION</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Roster</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] leading-snug">
                  Studio Team Members
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Architecture partners, project architects, and studio administrative staff.
                </p>
              </div>

              {/* Primary Add Employee Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openAddEmployeeModal}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Employee</span>
                </button>

                {/* Toolbar Overflow Menu trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
                    className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
                    title="More Studio Actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Overflow dropdown */}
                  {isOverflowMenuOpen && (
                    <div className="absolute right-0 top-11 z-30 w-52 bg-white border border-[#E2E6F0] rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          fetchFreshEmployees();
                          setIsOverflowMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#4865F6]" : "text-slate-400"}`} />
                        <span>{isRefreshing ? "Syncing..." : "Sync Fresh Data"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkMailModalOpen(true);
                          setIsOverflowMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#4865F6]" />
                        <span>Bulk Mail Broadcast</span>
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
                        <span>Import CSV Roster</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MEMBER FILTERS & CONTROLS */}
          <div className="space-y-3 pt-1">
            {/* Status Tabs Segmented Control */}
            <div className="flex items-center gap-1 bg-[#F1F3F9] p-1 rounded-xl border border-[#E2E6F0] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                All ({employees.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ACTIVE");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                Active ({employees.filter((e) => e.isActive).length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("INACTIVE");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center shrink-0 ${
                  statusFilter === "INACTIVE"
                    ? "bg-white text-rose-700 shadow-xs"
                    : "text-slate-500 hover:text-[#0F172A]"
                }`}
              >
                Inactive ({employees.filter((e) => !e.isActive).length})
              </button>
            </div>

            {/* Search Input Field */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, employee ID, email, or designation…"
                className="w-full pl-10 pr-9 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4865F6] focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Button & Result Count */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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

                {/* Bulk Select Trigger Toggle */}
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-[#E2E6F0] rounded-lg bg-white"
                >
                  {isAllCurrentPageSelected ? "Deselect Page" : "Select Page"}
                </button>
              </div>

              <div className="text-[11px] font-medium text-slate-500">
                Showing {paginatedEmployees.length} of {filteredEmployees.length} members
              </div>
            </div>

            {/* Removable Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {roleFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Role: {roleFilter}
                    <button type="button" onClick={() => setRoleFilter("ALL")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {departmentFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Dept: {departmentFilter}
                    <button type="button" onClick={() => setDepartmentFilter("ALL")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {designationFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Desig: {designationFilter}
                    <button type="button" onClick={() => setDesignationFilter("ALL")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {projectFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC]">
                    Project: {projectFilter}
                    <button type="button" onClick={() => setProjectFilter("ALL")}>
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
          {/* MOBILE EMPLOYEE LIST (STACKED CARDS)                 */}
          {/* ==================================================== */}
          <div className="space-y-3 pt-1">
            {paginatedEmployees.length === 0 ? (
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 text-center shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    No studio members match your filters
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {search ? `No team records matching "${search}".` : "Try clearing applied role or department filters."}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 bg-[#4865F6] text-white text-xs font-semibold rounded-xl"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              paginatedEmployees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.membershipId);
                const projectsCount = emp.projects?.length || 0;
                const visibleProjects = emp.projects?.slice(0, 3) || [];
                const hiddenProjectsCount = projectsCount > 3 ? projectsCount - 3 : 0;

                return (
                  <div
                    key={emp.id || emp.membershipId}
                    className={`bg-white border rounded-2xl p-4 shadow-xs transition-all space-y-3 ${
                      isSelected
                        ? "border-[#4865F6] ring-1 ring-[#4865F6]/30 bg-indigo-50/10"
                        : "border-[#E2E6F0] hover:border-[#4865F6]/40"
                    }`}
                  >
                    {/* Card Top: Checkbox, Avatar, Name, Employee ID, Action Menu */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Bulk selection checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectEmployee(emp.membershipId)}
                            className="w-4 h-4 rounded text-[#4865F6] focus:ring-[#4865F6] border-slate-300 cursor-pointer"
                          />
                        </div>

                        {/* Person Avatar Circle */}
                        <div
                          onClick={() => setDetailsEmployee(emp)}
                          className="w-9 h-9 rounded-full bg-[#EBF0FF] text-[#4865F6] font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          {emp.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        {/* Name & ID */}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailsEmployee(emp)}
                            className="text-left font-bold text-sm sm:text-base text-[#0F172A] hover:text-[#4865F6] transition-colors truncate block"
                          >
                            {emp.fullName}
                          </button>
                          <span className="font-mono text-[11px] font-bold text-[#4865F6] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#D5DFFC]">
                            {emp.employeeId}
                          </span>
                        </div>
                      </div>

                      {/* Card Row Actions Menu Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveCardMenuId(activeCardMenuId === emp.membershipId ? null : emp.membershipId)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Context Dropdown */}
                        {activeCardMenuId === emp.membershipId && (
                          <div className="absolute right-0 top-7 z-20 w-48 bg-white border border-[#E2E6F0] rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsEmployee(emp);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#4865F6]" />
                              <span>View Profile</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openEditModal(emp);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Member</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordEmployee(emp);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              <span>Manage Credentials</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openDirectDispatchModal(emp);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Send Login Instructions</span>
                            </button>

                            <div className="h-px bg-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                handleToggleStatus(emp.membershipId, emp.isActive);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                            >
                              <UserX className="w-3.5 h-3.5 text-slate-400" />
                              <span>{emp.isActive ? "Deactivate Account" : "Re-activate Account"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteMember(emp.membershipId, emp.fullName);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Employee</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Role Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          emp.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                        <span>{emp.isActive ? "Active" : "Inactive"}</span>
                      </span>

                      {/* Role */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          emp.role === "ADMIN" || emp.role === "OWNER"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{emp.role}</span>
                      </span>

                      {/* Optional Finance Access Badge */}
                      {emp.hasFinanceAccess && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Receipt className="w-3 h-3" />
                          <span>Finance Ledger Access</span>
                        </span>
                      )}
                    </div>

                    {/* Department & Designation */}
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-[#F8F9FD] p-2 rounded-xl border border-slate-100">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{emp.department || "Studio"}</span>
                      <span>•</span>
                      <span className="text-slate-600">{emp.designation || "Staff"}</span>
                    </div>

                    {/* Contact Information (Email & Phone) */}
                    <div className="space-y-1 text-xs">
                      {/* Email */}
                      <div className="flex items-center justify-between text-slate-600">
                        <a
                          href={`mailto:${emp.email}`}
                          className="flex items-center gap-1.5 text-slate-700 hover:text-[#4865F6] truncate hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{emp.email}</span>
                        </a>
                      </div>

                      {/* Phone & Alternate */}
                      {emp.phone && (
                        <div className="flex items-center justify-between text-slate-600 pt-0.5">
                          <a
                            href={`tel:${emp.phone}`}
                            className="flex items-center gap-1.5 text-slate-700 hover:text-[#4865F6] hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{emp.phone}</span>
                          </a>

                          {emp.phone && (
                            <a
                              href={`https://wa.me/${emp.phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Assigned Project Chips */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>Assigned Projects:</span>
                        {projectsCount > 0 && (
                          <span className="text-[10px] text-slate-400">{projectsCount} total</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {projectsCount === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No project assignments</span>
                        ) : (
                          <>
                            {visibleProjects.map((p) => (
                              <span
                                key={p.id || p.code}
                                className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {p.code}
                              </span>
                            ))}

                            {/* +N more chip trigger */}
                            {hiddenProjectsCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedProjectsEmployee(emp)}
                                className="font-mono text-[10px] font-bold text-[#4865F6] bg-[#F2F4FF] hover:bg-[#E2EAFE] px-2 py-0.5 rounded-md border border-[#D5DFFC] transition-colors cursor-pointer"
                              >
                                +{hiddenProjectsCount} more
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ==================================================== */}
          {/* PAGINATION CONTROLS (Exact screenshot context)       */}
          {/* ==================================================== */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0] text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">
                Showing page {currentPage} of {totalPages}
              </p>
              <p className="text-[11px] text-slate-400">{filteredEmployees.length} total members</p>
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
            href={`/w/${workspaceSlug}/team`}
            className="flex flex-col items-center gap-1 py-1 text-[#4865F6] font-bold"
          >
            <Users className="w-4 h-4 stroke-[2.5]" />
            <span>Team</span>
            <span className="w-1 h-1 rounded-full bg-[#4865F6]"></span>
          </Link>
        </nav>
      </div>

      {/* ==================================================== */}
      {/* STICKY BULK ACTIONS BAR (When members selected)      */}
      {/* ==================================================== */}
      {selectedEmployeeIds.length > 0 && (
        <div className="fixed bottom-14 sm:bottom-6 inset-x-4 max-w-md mx-auto z-40 bg-[#0B122B] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#4865F6] text-white font-bold text-xs flex items-center justify-center">
              {selectedEmployeeIds.length}
            </div>
            <span className="text-xs font-semibold">Members Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setIsBulkMailModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Bulk Mail</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FILTER BOTTOM SHEET MODAL                            */}
      {/* ==================================================== */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4865F6]" />
                <h3 className="font-bold text-sm text-[#0F172A]">Filter Team Members</h3>
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
              {/* Role */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Studio Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">ADMIN / Owner</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Studio Administration">Studio Administration</option>
                  <option value="Architect">Architect</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Interior Design">Interior Design</option>
                </select>
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Designation</label>
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Designations</option>
                  <option value="Owner">Owner</option>
                  <option value="Architect">Architect</option>
                  <option value="Civil">Civil</option>
                  <option value="Interior Designer">Interior Designer</option>
                  <option value="Senior Architect">Senior Architect</option>
                </select>
              </div>

              {/* Project Assignment */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Assigned Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs font-medium text-[#0F172A]"
                >
                  <option value="ALL">All Projects</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
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
                Apply Filters ({filteredEmployees.length} Matches)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EXPANDED PROJECTS LIST MODAL (When tapping +N more)  */}
      {/* ==================================================== */}
      {expandedProjectsEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {expandedProjectsEmployee.fullName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {expandedProjectsEmployee.projects?.length || 0} Assigned Architectural Projects
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedProjectsEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {expandedProjectsEmployee.projects?.map((p) => (
                <div
                  key={p.id || p.code}
                  className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex items-center justify-between"
                >
                  <span className="font-mono font-bold text-[#4865F6] bg-white px-2 py-0.5 rounded border border-[#CEDEFF]">
                    {p.code}
                  </span>
                  <span className="text-slate-700 font-medium truncate max-w-[180px]">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setExpandedProjectsEmployee(null)}
                className="px-4 py-2 bg-[#4865F6] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EMPLOYEE DETAILS DRAWER                              */}
      {/* ==================================================== */}
      {detailsEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setDetailsEmployee(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#4865F6] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Team Roster</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailsEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Profile Card */}
              <div className="flex items-center gap-3.5 p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-[#4865F6] text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {detailsEmployee.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#0F172A] leading-tight">
                    {detailsEmployee.fullName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#4865F6] bg-white px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {detailsEmployee.employeeId}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active Staff</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Department & Role Details */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Position & Clearance
                </h4>
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role:</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {detailsEmployee.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-medium text-slate-900">{detailsEmployee.department || "Architecture"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designation:</span>
                    <span className="font-medium text-slate-900">{detailsEmployee.designation || "Staff"}</span>
                  </div>
                  {detailsEmployee.hasFinanceAccess && (
                    <div className="flex justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Finance Clearance:</span>
                      <span className="font-bold text-emerald-700">Full Ledger Access</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Communication Actions */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-slate-800">{detailsEmployee.email}</span>
                    </div>
                    <a
                      href={`mailto:${detailsEmployee.email}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                    >
                      Email
                    </a>
                  </div>

                  {detailsEmployee.phone && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-slate-800">{detailsEmployee.phone}</span>
                      </div>
                      <a
                        href={`https://wa.me/${detailsEmployee.phone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Assignments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Assigned Projects
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {detailsEmployee.projects?.length || 0} active
                  </span>
                </div>
                <div className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  {!detailsEmployee.projects || detailsEmployee.projects.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">No project assignments</p>
                  ) : (
                    detailsEmployee.projects.map((p) => (
                      <div key={p.id || p.code} className="flex items-center justify-between p-1.5 bg-[#F8F9FD] rounded-lg">
                        <span className="font-mono font-bold text-[#4865F6] text-[11px]">{p.code}</span>
                        <span className="text-slate-700 truncate max-w-[200px] text-[11px]">{p.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const emp = detailsEmployee;
                  setDetailsEmployee(null);
                  openEditModal(emp);
                }}
                className="flex-1 py-2.5 bg-white border border-[#E2E6F0] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl text-center"
              >
                Edit Member
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = detailsEmployee;
                  setDetailsEmployee(null);
                  openDirectDispatchModal(emp);
                }}
                className="flex-1 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl text-center"
              >
                Send Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ADD EMPLOYEE MODAL (Provisional Mobile Specification)*/}
      {/* ==================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase tracking-wider">
                  STUDIO PERSONNEL ONBOARDING
                </span>
                <h3 className="text-base font-bold text-[#0F172A]">Add New Studio Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
                  {modalError}
                </div>
              )}

              {/* Employee ID & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-017"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-xs text-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@100percentdesign.in"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Architect"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Civil / Architect"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#0F172A]"
                  />
                </div>
              </div>

              {/* Finance Ledger Access */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Finance Clearance</p>
                  <p className="text-[10px] text-slate-500">Allow viewing studio project budgets and fee milestones</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasFinanceAccess}
                  onChange={(e) => setHasFinanceAccess(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4865F6]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="p-4 -mx-4 -mb-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {loading ? "Creating..." : "Save & Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT EMPLOYEE MODAL                                  */}
      {/* ==================================================== */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#4865F6] uppercase">UPDATE PROFILE</span>
                <h3 className="font-bold text-sm text-[#0F172A]">Edit Member: {editingEmployee.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-3.5 text-xs">
              {editModalError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl">{editModalError}</div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-bold rounded-xl shadow-xs"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* RESET PASSWORD MODAL                                 */}
      {/* ==================================================== */}
      {resetPasswordEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase">CREDENTIALS MANAGEMENT</span>
                <h3 className="font-bold text-sm text-[#0F172A]">Reset Password: {resetPasswordEmployee.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">New Temporary Password</label>
                <input
                  type="text"
                  value={newTemporaryPassword}
                  onChange={(e) => setNewTemporaryPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordEmployee(null)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await fetch(`/api/employees/reset-password?workspaceSlug=${workspaceSlug}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          membershipId: resetPasswordEmployee.membershipId,
                          temporaryPassword: newTemporaryPassword,
                          customMessage: resetCustomMessage,
                          notifyEmployee: resetNotifyEmployee,
                        }),
                      });
                      setSuccessMsg(`Password updated for ${resetPasswordEmployee.fullName}.`);
                      setResetPasswordEmployee(null);
                      await fetchFreshEmployees();
                    } catch {
                      setError("Failed to reset password");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ISSUED CREDENTIALS DIRECT DISPATCH DIALOG            */}
      {/* ==================================================== */}
      {issuedCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">LOGIN DISPATCH</span>
                <h3 className="font-bold text-sm text-[#0F172A]">{issuedCredentials.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIssuedCredentials(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">{issuedCredentials.description}</p>

              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee ID:</span>
                  <span className="font-bold text-slate-900">{issuedCredentials.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900 truncate">{issuedCredentials.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-bold text-[#4865F6]">{issuedCredentials.password}</span>
                </div>
              </div>

              {/* Quick sharing buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={issuedCredentials.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={issuedCredentials.gmailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 bg-[#EA4335] hover:bg-[#D93025] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send via Gmail</span>
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIssuedCredentials(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* BULK MAIL MODAL INTEGRATION                          */}
      {/* ==================================================== */}
      <BulkMailModal
        isOpen={isBulkMailModalOpen}
        onClose={() => setIsBulkMailModalOpen(false)}
        workspaceSlug={workspaceSlug}
        selectedEmployees={employees.filter((e) => selectedEmployeeIds.includes(e.membershipId))}
        allEmployees={employees}
      />

      {/* ==================================================== */}
      {/* CSV IMPORT/EXPORT MODAL INTEGRATION                  */}
      {/* ==================================================== */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          fetchFreshEmployees();
        }}
        workspaceSlug={workspaceSlug}
        entityType="employees"
        title="Studio Team Roster CSV Import"
      />

      {/* ==================================================== */}
      {/* SLIDE-OUT MOBILE NAVIGATION DRAWER                   */}
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

              {/* HIGHLIGHTED STUDIO TEAM DESTINATION */}
              <Link
                href={`/w/${workspaceSlug}/team`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold bg-[#4865F6] text-white shadow-xs"
              >
                <Users className="w-4 h-4" />
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
                <span className="text-slate-500">Studio Designation:</span>
                <span className="font-medium text-slate-800">Owner & Principal Architect</span>
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
