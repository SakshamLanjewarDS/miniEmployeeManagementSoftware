"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  UserPlus,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  MoreVertical,
  Clock,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react";
import { CsvImportExportModal } from "@/components/csv/CsvImportExportModal";
import BulkMailModal from "@/components/team/BulkMailModal";
import { CustomFieldsManagerModal } from "@/components/custom-fields/CustomFieldsManagerModal";
import { DynamicFormFields } from "@/components/custom-fields/DynamicFormFields";
import { DynamicCardFields } from "@/components/custom-fields/DynamicCardFields";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { SearchableDropdown, SearchableSelect } from "@/components/ui/SearchableDropdown";
import { correctGrammar } from "@/lib/grammar/grammarEngine";
import { EmployeeDocumentVaultView } from "@/components/documents/EmployeeDocumentVaultView";
import { EmployeeLettersView } from "@/components/letters/EmployeeLettersView";

const DEPARTMENT_OPTIONS = [
  { value: "Architecture", label: "Architecture", subLabel: "Design & Masterplanning" },
  { value: "Interior Design", label: "Interior Design", subLabel: "Fitout & FF&E" },
  { value: "Landscape", label: "Landscape Architecture", subLabel: "Site Planning & Ecology" },
  { value: "3D Visualization", label: "3D Visualization & VR", subLabel: "CGI & Renders" },
  { value: "Site Supervision", label: "Site Supervision & MEP", subLabel: "Field Engineering" },
  { value: "Studio Operations", label: "Studio Operations", subLabel: "Admin & Operations" },
];

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
  customFields?: Record<string, any>;
}

interface TeamClientViewProps {
  workspaceSlug: string;
  currentUserId: string;
  userRole: string;
  initialEmployees: EmployeeItem[];
  availableProjects?: ProjectOption[];
  initialCustomFields?: CustomFieldDefinition[];
  initialCustomValues?: Record<string, any>;
}

export default function TeamClientView({
  workspaceSlug,
  currentUserId,
  userRole,
  initialEmployees,
  availableProjects = [],
  initialCustomFields = [],
  initialCustomValues = {},
}: TeamClientViewProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>(initialEmployees);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [customValuesByEmployee, setCustomValuesByEmployee] = useState<Record<string, Record<string, any>>>(initialCustomValues);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  const refreshCustomFields = async () => {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}&entity=TEAM`),
        fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}&entity=TEAM`),
      ]);
      if (fRes.ok) {
        const fData = await fRes.json();
        setCustomFields(fData.fields || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setCustomValuesByEmployee(vData.values || {});
      }
    } catch (e) {
      console.error("Failed to reload team custom fields:", e);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [teamSortBy, setTeamSortBy] = useState<string>("JOIN_DATE_DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<EmployeeItem | null>(null);
  const [profileTab, setProfileTab] = useState<"OVERVIEW" | "PROJECTS" | "ACTIVITY" | "DOCUMENTS" | "LETTERS">("OVERVIEW");
  const [accountManagementOpen, setAccountManagementOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const pageSize = 12;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<EmployeeItem | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState("StudioPassword2026!");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

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

  // Mounting state to prevent browser extension hydration attribute mismatches
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Feedback & Loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk Selection & Announcement State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isBulkMailModalOpen, setIsBulkMailModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronize state dynamically whenever server component re-renders
  React.useEffect(() => {
    if (initialEmployees) {
      setEmployees(initialEmployees);
    }
  }, [initialEmployees]);

  // Live real-time fetcher to synchronize database state dynamically without manual page refresh
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

  // Real-time synchronization on tab focus (user returns to page)
  React.useEffect(() => {
    const handleFocus = () => {
      fetchFreshEmployees();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
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
    setCustomFieldValues({});
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
      if (statusFilter === "ACTIVE" && !emp.isActive) return false;
      if (statusFilter === "INACTIVE" && emp.isActive) return false;
      if (roleFilter !== "ALL" && emp.role !== roleFilter) return false;
      if (departmentFilter !== "ALL" && emp.department !== departmentFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = emp.fullName.toLowerCase().includes(q);
        const matchesEmail = emp.email.toLowerCase().includes(q);
        const matchesId = emp.employeeId.toLowerCase().includes(q);
        const matchesDept = emp.department?.toLowerCase().includes(q) ?? false;
        const matchesDesig = emp.designation?.toLowerCase().includes(q) ?? false;
        return matchesName || matchesEmail || matchesId || matchesDept || matchesDesig;
      }
      return true;
    }).sort((a, b) => {
      switch (teamSortBy) {
        case "JOIN_DATE_DESC":
          return new Date(b.joinDate || 0).getTime() - new Date(a.joinDate || 0).getTime();
        case "JOIN_DATE_ASC":
          return new Date(a.joinDate || 0).getTime() - new Date(b.joinDate || 0).getTime();
        case "ALPHA_NAME_ASC":
          return a.fullName.localeCompare(b.fullName);
        case "ALPHA_NAME_DESC":
          return b.fullName.localeCompare(a.fullName);
        case "ALPHA_EMP_ID_ASC":
          return a.employeeId.localeCompare(b.employeeId);
        case "ALPHA_EMP_ID_DESC":
          return b.employeeId.localeCompare(a.employeeId);
        default:
          return 0;
      }
    });
  }, [employees, statusFilter, roleFilter, search, teamSortBy]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Bulk Selection Helpers (must be after paginatedEmployees is declared)
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

  const selectAllStudioMembers = () => {
    setSelectedEmployeeIds(employees.filter((e) => e.isActive).map((e) => e.membershipId));
  };

  const clearSelection = () => {
    setSelectedEmployeeIds([]);
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
    const empVals = customValuesByEmployee[emp.id] || customValuesByEmployee[emp.membershipId] || (emp as any).customFields || {};
    setCustomFieldValues(empVals);
  };

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

        if (data.employee) {
          setEmployees((prev) => [data.employee, ...prev.filter((e) => e.membershipId !== data.employee.membershipId)]);
        }

        const createdId = data.employee?.id || data.employee?.membershipId || targetEmpId;
        if (Object.keys(customFieldValues).length > 0) {
          try {
            await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "TEAM",
                recordId: createdId,
                values: customFieldValues,
              }),
            });
            setCustomValuesByEmployee((prev) => ({
              ...prev,
              [createdId]: customFieldValues,
            }));
          } catch (err) {
            console.error("Failed to save employee custom fields", err);
          }
        }

        // Show credentials ready dialog with 1-click Gmail, WhatsApp, and Copy
        const plainMsg = `🏢 100% DESIGN Studio — Welcome to the Team!\n\nHello ${fullName},\nYour employee account has been created for 100% DESIGN Studio OS.\n\n• Login Portal: http://localhost:3000/w/${workspaceSlug}/login\n• Employee ID: ${targetEmpId}\n• Work Email: ${email.trim().toLowerCase()}\n• Password: ${assignedPwd}\n\nNote from Administrator:\n"${addCustomMessage}"\n\nPlease log in and check your assigned architectural projects and tasks.`;
        const companyMail = "designadmin08@gmail.com";
        const subject = `[100% DESIGN Studio] Your Studio OS Login Credentials (${targetEmpId})`;
        const waUrl = phone
          ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(plainMsg)}`
          : `https://wa.me/?text=${encodeURIComponent(plainMsg)}`;
        const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
          companyMail
        )}&view=cm&fs=1&to=${encodeURIComponent(email.trim().toLowerCase())}&su=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;
        const mailUrl = `mailto:${email.trim().toLowerCase()}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;

        setIssuedCredentials({
          fullName,
          employeeId: targetEmpId,
          email: email.trim().toLowerCase(),
          phone,
          password: assignedPwd,
          title: "Employee Created & Credentials Issued",
          description: addSendCredentials
            ? "Welcome notification has been dispatched to the Outbox. You can also send directly via Gmail (designadmin08@gmail.com), WhatsApp, or copy below."
            : "Credentials have been generated. You can share them directly via Gmail (designadmin08@gmail.com), WhatsApp, or copy below.",
          whatsappUrl: waUrl,
          gmailUrl,
          mailtoUrl: mailUrl,
          plainTextMessage: plainMsg,
        });

        // Reset form
        setEmployeeId("");
        setFullName("");
        setEmail("");
        setPhone("");
        setSelectedProjectIds([]);
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setModalError("Network error while creating employee");
    } finally {
      setLoading(false);
    }
  };

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
        if (data.employee) {
          setEmployees((prev) =>
            prev.map((e) =>
              e.membershipId === editingEmployee.membershipId ? { ...e, ...data.employee } : e
            )
          );
        } else {
          setEmployees((prev) =>
            prev.map((e) =>
              e.membershipId === editingEmployee.membershipId
                ? {
                    ...e,
                    fullName: editFullName.trim(),
                    email: editEmail.trim().toLowerCase(),
                    phone: editPhone.trim() || null,
                    department: editDepartment,
                    designation: editDesignation,
                    role: editRole,
                    hasFinanceAccess: editHasFinanceAccess,
                  }
                : e
            )
          );
        }

        const targetId = editingEmployee.id || editingEmployee.membershipId;
        if (Object.keys(customFieldValues).length > 0) {
          try {
            await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "TEAM",
                recordId: targetId,
                values: customFieldValues,
              }),
            });
            setCustomValuesByEmployee((prev) => ({
              ...prev,
              [targetId]: customFieldValues,
            }));
          } catch (err) {
            console.error("Failed to save updated employee custom fields", err);
          }
        }

        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setEditModalError("Network error while updating employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (membershipId: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}? Their active sessions will be revoked immediately.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/deactivate?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to deactivate account");
      } else {
        setSuccessMsg(`Deactivated ${name}. All active sessions have been revoked.`);
        // Immediately update state in real time
        setEmployees((prev) =>
          prev.map((e) => (e.membershipId === membershipId ? { ...e, isActive: false } : e))
        );
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setError("Network error while deactivating member");
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (membershipId: string, name: string) => {
    if (!confirm(`Are you sure you want to reactivate ${name}? They will be able to log in with their credentials.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/reactivate?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reactivate account");
      } else {
        setSuccessMsg(`Reactivated ${name} successfully! (Prior revoked sessions remain inactive)`);
        // Immediately update state in real time
        setEmployees((prev) =>
          prev.map((e) => (e.membershipId === membershipId ? { ...e, isActive: true } : e))
        );
        await fetchFreshEmployees();
        router.refresh();
      }
    } catch {
      setError("Network error while reactivating member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (membershipId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently remove ${name}? If this member has historical tasks, drawings, or site visits, permanent removal will be blocked to preserve audit history.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/remove?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove member");
      } else {
        setSuccessMsg(`Permanently removed unreferenced member ${name}.`);
        // Immediately remove from state in real time
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordEmployee) return;

    setLoading(true);
    setResetModalError(null);
    setError(null);

    try {
      const res = await fetch(`/api/employees/reset-password?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: resetPasswordEmployee.membershipId,
          temporaryPassword: newTemporaryPassword,
          customMessage: resetCustomMessage,
          notifyEmployee: resetNotifyEmployee,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetModalError(data.error || "Failed to reset password");
      } else {
        setSuccessMsg(
          `Password updated for ${resetPasswordEmployee.fullName}. All previous active sessions have been revoked immediately.`
        );
        await fetchFreshEmployees();
        router.refresh();

        const target = resetPasswordEmployee;
        const plainMsg = `🔐 100% DESIGN Studio — Password Updated\n\nHello ${target.fullName},\nYour login password for 100% DESIGN Studio OS has been updated by the Administrator.\n\n• Login Portal: http://localhost:3000/w/${workspaceSlug}/login\n• Employee ID: ${target.employeeId}\n• Work Email: ${target.email}\n• Password: ${newTemporaryPassword}\n\nNote from Administrator:\n"${resetCustomMessage}"\n\nPlease log in with your updated credentials.`;
        const waUrl = target.phone
          ? `https://wa.me/${target.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(plainMsg)}`
          : `https://wa.me/?text=${encodeURIComponent(plainMsg)}`;
        const companyMail = "designadmin08@gmail.com";
        const subject = `[100% DESIGN Studio] Your Studio OS Password Has Been Updated`;
        const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
          companyMail
        )}&view=cm&fs=1&to=${encodeURIComponent(target.email)}&su=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;
        const mailUrl = `mailto:${target.email}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainMsg)}`;

        setIssuedCredentials({
          fullName: target.fullName,
          employeeId: target.employeeId,
          email: target.email,
          phone: target.phone,
          password: newTemporaryPassword,
          title: "Password Updated & Credentials Ready",
          description: resetNotifyEmployee
            ? "Password update notification has been queued in the Outbox. You can also share directly via Gmail (designadmin08@gmail.com), WhatsApp, or copy below."
            : "Password has been updated and active sessions revoked. You can share directly via Gmail (designadmin08@gmail.com), WhatsApp, or copy below.",
          whatsappUrl: waUrl,
          gmailUrl,
          mailtoUrl: mailUrl,
          plainTextMessage: plainMsg,
        });

        setResetPasswordEmployee(null);
        setNewTemporaryPassword("StudioPassword2026!");
      }
    } catch {
      setResetModalError("Network error while resetting password");
    } finally {
      setLoading(false);
    }
  };

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
      description: "Dispatch login credentials directly via Gmail (designadmin08@gmail.com) or WhatsApp.",
      whatsappUrl: waUrl,
      gmailUrl,
      mailtoUrl: mailUrl,
      plainTextMessage: plainMsg,
    });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 h-64" />
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 h-64" />
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Breadcrumbs matching reference 28a4d685-5954-4e11-8024-f9712ec61888.png */}
      <div className="space-y-4">
        {/* Desktop Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#696E82]">
          <span>People & HR</span>
          <span>/</span>
          <span className="font-medium text-[#1F1F1F]">Studio Team</span>
        </div>

        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="type-page-title text-[#1F1F1F]">
              Studio team
            </h1>
            <p className="text-xs sm:text-sm text-[#696E82] mt-0.5">
              <span className="hidden sm:inline">People, roles and connections across your studio.</span>
              <span className="sm:hidden">{employees.length} members</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={fetchFreshEmployees}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-white hover:bg-[#F8F9FD] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#5A81FA]" : "text-[#696E82]"}`} />
              <span>Sync</span>
            </button>

            {/* More Options Popover Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
                className="p-2.5 bg-white hover:bg-[#F8F9FD] text-[#696E82] hover:text-[#1F1F1F] rounded-xl border border-[#E2E6F0] shadow-2xs transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="More Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {moreOptionsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E2E6F0] rounded-xl shadow-xl z-30 py-1 text-xs divide-y divide-[#E2E6F0]">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkMailModalOpen(true);
                        setMoreOptionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-[#EA4335]" />
                      <span>Bulk Mail ({selectedEmployeeIds.length})</span>
                    </button>
                    {isPrivileged && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomFieldsModalOpen(true);
                          setMoreOptionsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-[#5A81FA]" />
                        <span>Configure Fields</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isPrivileged && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F8F9FD] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] shadow-2xs transition-all cursor-pointer min-h-[44px]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#5A81FA]" />
                  <span>Import CSV</span>
                </button>

                {userRole === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => router.push(`/w/${workspaceSlug}/hiring`)}
                    className="hidden sm:inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#1456F0] to-[#3B82F6] hover:from-[#0E46D0] hover:to-[#2563EB] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Hiring &amp; Letters</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openAddEmployeeModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add employee</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Tabs pill bar */}
        <div className="flex items-center gap-1 border-b border-[#E2E6F0] pb-2 overflow-x-auto touch-scroll-x">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === "ALL"
                ? "bg-[#5A81FA] text-white shadow-xs"
                : "bg-white text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
            }`}
          >
            All members ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ACTIVE");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === "ACTIVE"
                ? "bg-[#5A81FA] text-white shadow-xs"
                : "bg-white text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              statusFilter === "INACTIVE"
                ? "bg-[#5A81FA] text-white shadow-xs"
                : "bg-white text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
            }`}
          >
            Inactive ({employees.filter((e) => !e.isActive).length})
          </button>
        </div>

        {/* Filter bar: Search, Role, Discipline, Sort, View mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E6F0]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, employee ID or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-[#1F1F1F] focus:outline-hidden focus:ring-1 focus:ring-[#5A81FA]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[130px]">
              <SearchableDropdown
                size="sm"
                value={roleFilter}
                onChange={(val) => {
                  setRoleFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="All roles"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All roles" },
                  { value: "OWNER", label: "Owner / Partner" },
                  { value: "ADMIN", label: "Administrator" },
                  { value: "EMPLOYEE", label: "Employee" },
                ]}
              />
            </div>

            <div className="min-w-[140px]">
              <SearchableDropdown
                size="sm"
                value={departmentFilter}
                onChange={(val) => {
                  setDepartmentFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="All disciplines"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All disciplines" },
                  ...DEPARTMENT_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
                ]}
              />
            </div>

            <div className="min-w-[140px]">
              <SearchableDropdown
                size="sm"
                value={teamSortBy}
                onChange={(val) => {
                  setTeamSortBy(val);
                  setCurrentPage(1);
                }}
                placeholder="Sort"
                searchable={false}
                clearable={false}
                options={[
                  { value: "JOIN_DATE_DESC", label: "Newest first" },
                  { value: "JOIN_DATE_ASC", label: "Oldest first" },
                  { value: "ALPHA_NAME_ASC", label: "Name (A → Z)" },
                  { value: "ALPHA_NAME_DESC", label: "Name (Z → A)" },
                  { value: "ALPHA_EMP_ID_ASC", label: "Employee ID (A → Z)" },
                ]}
              />
            </div>

            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center bg-[#F8F9FD] p-0.5 rounded-xl border border-[#E2E6F0] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "GRID"
                    ? "bg-[#5A81FA] text-white shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Card Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-[#5A81FA] text-white shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Table List View"
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Batch Selection Bar */}
        <div className="flex items-center justify-between text-xs text-[#696E82] px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                paginatedEmployees.length > 0 &&
                paginatedEmployees.every((e) => selectedEmployeeIds.includes(e.membershipId))
              }
              onChange={() => {
                const allCurrentSelected =
                  paginatedEmployees.length > 0 &&
                  paginatedEmployees.every((e) => selectedEmployeeIds.includes(e.membershipId));
                if (allCurrentSelected) {
                  setSelectedEmployeeIds((prev) =>
                    prev.filter((id) => !paginatedEmployees.some((e) => e.membershipId === id))
                  );
                } else {
                  const toAdd = paginatedEmployees
                    .map((e) => e.membershipId)
                    .filter((id) => !selectedEmployeeIds.includes(id));
                  setSelectedEmployeeIds((prev) => [...prev, ...toAdd]);
                }
              }}
              className="w-4 h-4 rounded text-[#5A81FA] border-slate-300 focus:ring-[#5A81FA] cursor-pointer"
            />
            <span className="font-medium text-[#1F1F1F]">Select members</span>
          </label>

          {selectedEmployeeIds.length > 0 && (
            <span className="font-semibold text-[#5A81FA]">
              {selectedEmployeeIds.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Selection Action Banner */}
      {selectedEmployeeIds.length > 0 && (
        <div className="p-3 bg-[#FEF2F2] border border-[#EA4335]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-[#991B1B] font-semibold">
            <span className="w-6 h-6 rounded-full bg-[#EA4335] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {selectedEmployeeIds.length}
            </span>
            <span>
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? "s" : ""} selected for bulk communication
            </span>
            <button
              onClick={selectAllStudioMembers}
              className="text-[#EA4335] hover:underline font-bold text-xs ml-2 cursor-pointer"
            >
              Select All Active ({employees.filter((e) => e.isActive).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkMailModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Compose Bulk Mail</span>
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-[#696E82] hover:text-[#1F1F1F] px-2 py-1 cursor-pointer font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs overflow-hidden">
        {paginatedEmployees.length === 0 ? (
          <div className="p-12 text-center text-[#696E82]">
            <Users className="w-10 h-10 mx-auto text-[#A8B1CE] mb-3" />
            <div className="text-sm font-semibold text-[#1F1F1F]">No studio members found</div>
            <p className="text-xs text-[#696E82] mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : viewMode === "GRID" ? (
          <div className="p-4 sm:p-6">
            {/* Desktop 3-column Cards (hidden on mobile) */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedEmployees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.membershipId);
                const isSelf = emp.membershipId === currentUserId;
                const canManageThisEmployee = isPrivileged && !isSelf;
                const initials = emp.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={emp.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                      !emp.isActive
                        ? "bg-slate-50/70 border-slate-200 opacity-80"
                        : isSelected
                        ? "border-[#5A81FA] ring-2 ring-[#5A81FA]/20"
                        : "border-[#E2E6F0] hover:border-slate-300"
                    }`}
                  >
                    {/* Top Row: Checkbox, Status Pill, Three-dots menu */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      {isPrivileged ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEmployee(emp.membershipId)}
                          className="w-4 h-4 rounded text-[#5A81FA] border-slate-300 focus:ring-[#5A81FA] cursor-pointer"
                        />
                      ) : (
                        <div className="w-4 h-4" />
                      )}

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            emp.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>

                        {/* Popover Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveCardMenuId(
                                activeCardMenuId === emp.membershipId ? null : emp.membershipId
                              )
                            }
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeCardMenuId === emp.membershipId && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E2E6F0] rounded-xl shadow-xl z-20 py-1 text-xs divide-y divide-[#E2E6F0]">
                              <div className="p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProfileEmployee(emp);
                                    setActiveCardMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Dossier</span>
                                </button>
                                {isPrivileged && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openEditModal(emp);
                                        setActiveCardMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-[#5A81FA]" />
                                      <span>Edit Member</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setResetPasswordEmployee(emp);
                                        setActiveCardMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Reset Password</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openDirectDispatchModal(emp);
                                        setActiveCardMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                    >
                                      <Send className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Send Credentials</span>
                                    </button>
                                  </>
                                )}
                              </div>
                              {canManageThisEmployee && (
                                <div className="p-1">
                                  {emp.isActive ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeactivate(emp.membershipId, emp.fullName);
                                        setActiveCardMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Deactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleReactivate(emp.membershipId, emp.fullName);
                                        setActiveCardMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Reactivate</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleRemove(emp.membershipId, emp.fullName);
                                      setActiveCardMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Record</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Avatar & Employee Identity */}
                    <div className="flex items-center gap-3.5 my-2">
                      <div className="w-12 h-12 rounded-full bg-[#EBF0FF] text-[#3562E8] font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="type-card-title text-[#1F1F1F] truncate" title={emp.fullName}>
                          {emp.fullName}
                        </h3>
                        <p className="text-xs text-[#696E82] truncate mt-0.5">
                          {emp.designation || emp.department || "Architect"}
                        </p>
                        <p className="font-mono text-[11px] text-[#696E82] mt-0.5">
                          {emp.employeeId}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="mt-4 pt-3 border-t border-[#E2E6F0] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedProfileEmployee(emp)}
                        className="text-xs font-semibold text-[#5A81FA] hover:text-[#426EE8] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {isPrivileged && (
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-[#5A81FA] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Profile"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Compact Cards List (visible only on mobile) */}
            <div className="sm:hidden divide-y divide-[#E2E6F0] -mx-4">
              {paginatedEmployees.map((emp) => {
                const initials = emp.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedProfileEmployee(emp)}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FD] active:bg-[#F2F4FF] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#EBF0FF] text-[#3562E8] font-bold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1F1F1F] truncate">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-[#696E82] truncate">
                          {emp.designation || emp.department || "Architect"}
                        </div>
                        <div className="font-mono text-[10px] text-[#696E82]">
                          {emp.employeeId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E6F0] bg-[#F8F9FD] text-[#696E82] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[#CEDEFF] text-[#EA4335] focus:ring-[#EA4335] cursor-pointer"
                      title={isAllCurrentPageSelected ? "Deselect current page" : "Select current page"}
                    />
                  </th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role & Access</th>
                  <th className="py-3 px-4">Department & Designation</th>
                  <th className="py-3 px-4">Assigned Projects</th>
                  <th className="py-3 px-4">Status</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6F0]">
                {paginatedEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.membershipId);
                  return (
                    <tr
                      key={emp.membershipId}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]"
                          : "hover:bg-[#FDFBF7]"
                      }`}
                    >
                      <td className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEmployee(emp.membershipId)}
                          className="rounded border-[#CEDEFF] text-[#EA4335] focus:ring-[#EA4335] cursor-pointer"
                        />
                      </td>
                      {/* Employee Profile */}
                      <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1F1F1F]">{emp.fullName}</span>
                          <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                            {emp.employeeId}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#696E82] flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#696E82]" />
                            {emp.email}
                          </span>
                          {emp.phone && (
                            <span className="flex items-center gap-1 text-[#696E82]">
                              <Phone className="w-3 h-3" />
                              {emp.phone}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <DynamicCardFields
                            fields={customFields}
                            values={customValuesByEmployee[emp.id] || customValuesByEmployee[emp.membershipId] || (emp as any).customFields || {}}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Role & Access */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            emp.role === "OWNER"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : emp.role === "ADMIN"
                              ? "bg-purple-50 text-purple-900 border border-purple-200"
                              : emp.role === "PROJECT_MANAGER"
                              ? "bg-blue-50 text-blue-900 border border-blue-200"
                              : "bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF]"
                          }`}
                        >
                          {emp.role.replace("_", " ")}
                        </span>
                        {emp.hasFinanceAccess && (
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Finance Ledger Access</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td className="py-3 px-4 text-[#696E82]">
                      <div className="font-medium text-[#1F1F1F]">{emp.designation || "Architect"}</div>
                      <div className="text-[11px] text-[#696E82]">{emp.department || "Architecture"}</div>
                    </td>

                    {/* Assigned Projects */}
                    <td className="py-3 px-4">
                      {emp.projects && emp.projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.projects.map((proj) => (
                            <span
                              key={proj.id}
                              className="font-mono text-[10px] bg-[#F2F4FF] text-[#1F1F1F] px-1.5 py-0.5 rounded border border-[#E2E6F0]"
                              title={proj.name}
                            >
                              {proj.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#696E82]">No project assignments</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                          emp.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? "bg-emerald-500" : "bg-red-500"}`}
                        ></span>
                        {emp.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    {/* Actions (Admin/Owner only) */}
                    {isPrivileged && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee"
                            className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF] rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setResetModalError(null);
                              setResetPasswordEmployee(emp);
                              setNewTemporaryPassword("StudioPassword2026!");
                              setResetCustomMessage(
                                `Hello ${emp.fullName}, your login credentials for 100% DESIGN Studio OS have been updated by the Administrator. Please find your credentials below.`
                              );
                            }}
                            title="Manage Password & Credentials"
                            className="p-1.5 text-[#696E82] hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openDirectDispatchModal(emp)}
                            title="Direct Send via Gmail (designadmin08@gmail.com) or WhatsApp"
                            className="p-1.5 text-[#696E82] hover:text-[#EA4335] hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {emp.isActive ? (
                            <button
                              onClick={() => handleDeactivate(emp.membershipId, emp.fullName)}
                              title="Deactivate Account & Invalidate Sessions"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(emp.membershipId, emp.fullName)}
                              title="Reactivate Account"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleRemove(emp.membershipId, emp.fullName)}
                            title="Permanently Remove (Unreferenced only)"
                            className="p-1.5 text-[#696E82] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar matching reference design */}
        {filteredEmployees.length > 0 && (
          <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#696E82]">
            <div className="font-medium text-[#696E82]">
              Showing <span className="font-semibold text-[#1F1F1F]">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEmployees.length)}</span> of <span className="font-semibold text-[#1F1F1F]">{filteredEmployees.length}</span> members
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-[#CEDEFF] rounded-lg disabled:opacity-40 hover:bg-[#F2F4FF] text-[#1F1F1F] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-[#5A81FA] text-white"
                            : "text-[#696E82] hover:bg-[#F2F4FF]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-[#CEDEFF] rounded-lg disabled:opacity-40 hover:bg-[#F2F4FF] text-[#1F1F1F] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Focused Employee Profile Drawer (matches reference panel 3) */}
      {selectedProfileEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#F8F9FD] h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Navigation */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-[#E2E6F0] px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedProfileEmployee(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#696E82] hover:text-[#1F1F1F] px-2 py-1 rounded-lg hover:bg-[#F2F4FF] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Team</span>
              </button>
              <div className="font-bold text-xs text-[#1F1F1F] truncate max-w-[180px]">
                {selectedProfileEmployee.fullName}
              </div>
              <div className="flex items-center gap-1">
                {isPrivileged && (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = selectedProfileEmployee;
                      setSelectedProfileEmployee(null);
                      openEditModal(emp);
                    }}
                    className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F2F4FF] transition-colors cursor-pointer"
                    title="Edit profile"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProfileEmployee(null)}
                  className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F2F4FF] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="p-4 space-y-4 flex-1">
              {/* Hero Card */}
              <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 text-center shadow-xs">
                <div className="w-20 h-20 rounded-full bg-[#EBF0FF] text-[#3562E8] font-bold text-2xl mx-auto flex items-center justify-center shadow-inner">
                  {selectedProfileEmployee.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <h2 className="type-section-title text-[#1F1F1F] mt-3">
                  {selectedProfileEmployee.fullName}
                </h2>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      selectedProfileEmployee.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedProfileEmployee.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {selectedProfileEmployee.isActive ? "Active account" : "Deactivated"}
                  </span>
                </div>
                <p className="text-xs text-[#696E82] mt-1.5">
                  {selectedProfileEmployee.designation || selectedProfileEmployee.department || "Architect"} •{" "}
                  <span className="font-mono font-bold text-[#5A81FA]">
                    {selectedProfileEmployee.employeeId}
                  </span>
                </p>

                {isPrivileged && (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = selectedProfileEmployee;
                      setSelectedProfileEmployee(null);
                      openEditModal(emp);
                    }}
                    className="w-full mt-4 py-2 px-4 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit profile</span>
                  </button>
                )}
              </div>

              {/* Sub-tabs: Overview, Projects, Activity, Documents, Letters */}
              <div className="flex border-b border-[#E2E6F0] bg-white rounded-xl px-2 pt-1 shadow-2xs overflow-x-auto">
                {(["OVERVIEW", "PROJECTS", "ACTIVITY", "DOCUMENTS", "LETTERS"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setProfileTab(tab)}
                    className={`flex-1 py-2 px-2 text-xs font-semibold capitalize border-b-2 -mb-px transition-colors cursor-pointer shrink-0 ${
                      profileTab === tab
                        ? "border-[#5A81FA] text-[#5A81FA]"
                        : "border-transparent text-[#696E82] hover:text-[#1F1F1F]"
                    }`}
                  >
                    {tab.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Tab 1: Overview */}
              {profileTab === "OVERVIEW" && (
                <div className="space-y-4">
                  {/* Contact Information */}
                  <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                      Contact information
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-[#F2F4FF]">
                        <span className="text-[#696E82] flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </span>
                        <a
                          href={`mailto:${selectedProfileEmployee.email}`}
                          className="font-medium text-[#5A81FA] hover:underline truncate max-w-[200px]"
                        >
                          {selectedProfileEmployee.email}
                        </a>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#696E82] flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>Phone</span>
                        </span>
                        <span className="font-medium text-[#1F1F1F]">
                          {selectedProfileEmployee.phone || "Not configured"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                      Employment details
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-[#F2F4FF]">
                        <span className="text-[#696E82]">Discipline</span>
                        <span className="font-medium text-[#1F1F1F]">
                          {selectedProfileEmployee.department || "Architecture"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-[#F2F4FF]">
                        <span className="text-[#696E82]">Designation</span>
                        <span className="font-medium text-[#1F1F1F]">
                          {selectedProfileEmployee.designation || "Architect"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-[#F2F4FF]">
                        <span className="text-[#696E82]">Access role</span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F2F4FF] text-[#5A81FA] border border-[#CEDEFF]">
                          {selectedProfileEmployee.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#696E82]">Finance Ledger</span>
                        <span className="font-medium text-[#1F1F1F]">
                          {selectedProfileEmployee.hasFinanceAccess ? "Granted" : "Restricted"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Projects Card */}
                  <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                        Assigned projects
                      </h3>
                      <span className="text-[11px] text-[#696E82]">
                        {selectedProfileEmployee.projects?.length || 0} active
                      </span>
                    </div>
                    {selectedProfileEmployee.projects && selectedProfileEmployee.projects.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProfileEmployee.projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#CEDEFF] mr-1.5">
                                {proj.code}
                              </span>
                              <span className="text-xs font-semibold text-[#1F1F1F] truncate">
                                {proj.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#696E82] py-2 text-center">
                        No active studio projects assigned to this member.
                      </p>
                    )}
                  </div>

                  {/* Account Management Accordion */}
                  {isPrivileged && (
                    <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                      <button
                        type="button"
                        onClick={() => setAccountManagementOpen(!accountManagementOpen)}
                        className="w-full flex items-center justify-between text-left cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                          Access & account actions
                        </span>
                        {accountManagementOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#696E82]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#696E82]" />
                        )}
                      </button>

                      {accountManagementOpen && (
                        <div className="pt-2 space-y-2 border-t border-[#E2E6F0]">
                          <button
                            type="button"
                            onClick={() => openDirectDispatchModal(selectedProfileEmployee)}
                            className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-[#EA4335] text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Direct dispatch pass (Gmail / WhatsApp)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const emp = selectedProfileEmployee;
                              setResetModalError(null);
                              setResetPasswordEmployee(emp);
                              setNewTemporaryPassword("StudioPassword2026!");
                              setResetCustomMessage(
                                `Hello ${emp.fullName}, your login credentials for 100% DESIGN Studio OS have been updated by the Administrator.`
                              );
                            }}
                            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset temporary credentials</span>
                          </button>
                          {selectedProfileEmployee.isActive ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeactivate(
                                  selectedProfileEmployee.membershipId,
                                  selectedProfileEmployee.fullName
                                )
                              }
                              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivate studio member</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleReactivate(
                                  selectedProfileEmployee.membershipId,
                                  selectedProfileEmployee.fullName
                                )
                              }
                              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reactivate studio member</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Projects */}
              {profileTab === "PROJECTS" && (
                <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                    Project assignments
                  </h3>
                  {selectedProfileEmployee.projects && selectedProfileEmployee.projects.length > 0 ? (
                    <div className="divide-y divide-[#E2E6F0]">
                      {selectedProfileEmployee.projects.map((proj) => (
                        <div key={proj.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-xs text-[#1F1F1F]">{proj.name}</div>
                            <div className="font-mono text-[10px] text-[#5A81FA]">{proj.code}</div>
                          </div>
                          <span className="text-[10px] font-medium bg-[#F2F4FF] text-[#5A81FA] px-2 py-0.5 rounded-full border border-[#CEDEFF]">
                            Assigned
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#696E82] py-4 text-center">
                      No studio project assignments recorded.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Activity */}
              {profileTab === "ACTIVITY" && (
                <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                    Recent activity
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#5A81FA] mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium text-[#1F1F1F]">Account active in workspace</p>
                        <p className="text-[11px] text-[#696E82]">Current status: Active</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium text-[#1F1F1F]">Role assigned: {selectedProfileEmployee.role}</p>
                        <p className="text-[11px] text-[#696E82]">Discipline: {selectedProfileEmployee.department || "Architecture"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Documents Vault */}
              {profileTab === "DOCUMENTS" && (
                <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs">
                  {selectedProfileEmployee.role === "OWNER" ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center mx-auto shadow-sm">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1F1F1F]">Studio Partner &amp; Sovereign Owner</h4>
                      <p className="text-xs text-[#696E82] max-w-md mx-auto leading-relaxed">
                        Studio Owners and Partners are exempt from employee onboarding document filing. This account holds sovereign ownership authority over the studio.
                      </p>
                    </div>
                  ) : (
                    <EmployeeDocumentVaultView
                      context={{
                        tenantSlug: workspaceSlug,
                        role: userRole as any,
                        membershipId: currentUserId,
                        employeeId: "",
                      } as any}
                      employeeId={selectedProfileEmployee.employeeId}
                      canManageHR={isPrivileged}
                    />
                  )}
                </div>
              )}

              {/* Tab 5: HR Letters */}
              {profileTab === "LETTERS" && (
                <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs">
                  {selectedProfileEmployee.role === "OWNER" ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center mx-auto shadow-sm">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1F1F1F]">Studio Partner &amp; Sovereign Owner</h4>
                      <p className="text-xs text-[#696E82] max-w-md mx-auto leading-relaxed">
                        Employment offer letters and appointment letters apply only to Admins and Employees. Studio Owners are exempt from employee letters.
                      </p>
                    </div>
                  ) : (
                    <EmployeeLettersView
                      context={{
                        tenantSlug: workspaceSlug,
                        role: userRole as any,
                        membershipId: currentUserId,
                        employeeId: "",
                      } as any}
                      employeeId={selectedProfileEmployee.employeeId}
                      canManageHR={isPrivileged}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-[#1F1F1F]">Add New Studio Employee</h3>
                  <p className="text-xs text-[#696E82]">Create staff identity, role, credentials, and project assignments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span className="font-medium">{modalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError(null)}
                    className="text-red-500 hover:text-red-800 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#1F1F1F]">
                      Employee ID <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/employees/next-id?workspaceSlug=${workspaceSlug}`);
                          if (res.ok) {
                            const data = await res.json();
                            if (data.nextId) {
                              setEmployeeId(data.nextId);
                              return;
                            }
                          }
                        } catch {}
                        setEmployeeId(computeNextEmployeeId());
                      }}
                      className="text-[10px] text-[#5A81FA] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto-suggest ({computeNextEmployeeId()})
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-013"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl uppercase font-mono font-bold text-[#5A81FA] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kavita Rao"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Work Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kavita@100percentdesign.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="add-department"
                  label="Department"
                  required={false}
                  placeholder="Select department..."
                  searchPlaceholder="Search departments..."
                  options={DEPARTMENT_OPTIONS}
                  value={department}
                  onChange={setDepartment}
                  allowOther={true}
                  otherOptionLabel="+ Other Department..."
                />
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Project Architect"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="add-role"
                  label="System Role"
                  required={true}
                  placeholder="Select system role..."
                  searchPlaceholder="Search roles..."
                  options={[
                    { value: "EMPLOYEE", label: "Employee", subLabel: "Tasks, Drawings, Visits" },
                    { value: "ADMIN", label: "Administrator", subLabel: "Operations & Staff" },
                    ...((userRole === "OWNER" || userRole === "ADMIN")
                      ? [{ value: "OWNER", label: "Owner / Boss", subLabel: "Leadership & Governance" }]
                      : []),
                  ]}
                  value={role}
                  onChange={setRole}
                  allowOther={false}
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#1F1F1F]">
                      Initial Password <span className="text-red-600">*</span>
                    </label>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const gen = "Studio#" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";
                          setTemporaryPassword(gen);
                        }}
                        className="text-[#5A81FA] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Generate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemporaryPassword("StudioPassword2026!")}
                        className="text-[#696E82] hover:underline cursor-pointer"
                      >
                        Default
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showAddPassword ? "text" : "password"}
                      required
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      className="w-full p-2.5 pr-9 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Credential Notification Toggle & Custom Message */}
              <div className="bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addSendCreds"
                    checked={addSendCredentials}
                    onChange={(e) => setAddSendCredentials(e.target.checked)}
                    className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <label htmlFor="addSendCreds" className="text-xs text-[#1F1F1F] font-semibold cursor-pointer">
                    Send Login ID & Password notification directly to employee
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#696E82] block">
                      Welcome Note / Custom Message
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const { correctedText } = correctGrammar(addCustomMessage);
                        setAddCustomMessage(correctedText);
                      }}
                      className="text-[10px] text-[#5A81FA] hover:text-[#426EE8] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Auto-correct grammar & spelling (or Ctrl+Shift+G)"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Fix Grammar</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={addCustomMessage}
                    onChange={(e) => setAddCustomMessage(e.target.value)}
                    placeholder="Message from Administrator (Voice dictation supported via Ctrl+Shift+V)..."
                    className="w-full p-2.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Finance Access Toggle */}
              {(userRole === "OWNER" || userRole === "ADMIN") && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="financeAccess"
                    checked={hasFinanceAccess}
                    onChange={(e) => setHasFinanceAccess(e.target.checked)}
                    className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <label htmlFor="financeAccess" className="text-xs text-[#1F1F1F] cursor-pointer">
                    Grant permission to view and manage project budgets & finance ledger
                  </label>
                </div>
              )}

              {/* Project Assignments */}
              {availableProjects.length > 0 && (
                <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                  <SearchableSelect
                    id="add-projects"
                    label="Assign to Projects"
                    required={false}
                    multiSelect={true}
                    placeholder="Select projects to assign..."
                    searchPlaceholder="Search projects by code or name..."
                    options={availableProjects.map((p) => ({
                      value: p.id,
                      label: `${p.code} — ${p.name}`,
                      badge: p.code,
                    }))}
                    values={selectedProjectIds}
                    onMultiChange={setSelectedProjectIds}
                    allowOther={false}
                    helperText="Assigned staff will be granted workspace access to these project deliverables and sheets."
                  />
                </div>
              )}

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={loading}
              />

              <div className="pt-4 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {loading ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Save Employee</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-[#1F1F1F]">Edit Studio Employee</h3>
                  <p className="text-xs text-[#696E82]">
                    Editing details for <span className="font-semibold text-[#5A81FA]">{editingEmployee.employeeId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              {editModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span className="font-medium">{editModalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditModalError(null)}
                    className="text-red-500 hover:text-red-800 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Work Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
                <SearchableSelect
                  id="edit-role"
                  label="System Role"
                  required
                  placeholder="Select system role..."
                  searchPlaceholder="Search role..."
                  options={[
                    { value: "EMPLOYEE", label: "Employee", subLabel: "Core Studio Member" },
                    { value: "ADMIN", label: "Administrator", subLabel: "Operations & Staff" },
                    ...((userRole === "OWNER" || userRole === "ADMIN")
                      ? [{ value: "OWNER", label: "Owner / Boss", subLabel: "Leadership & Governance" }]
                      : []),
                  ]}
                  value={editRole}
                  onChange={setEditRole}
                  allowOther={false}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-department"
                  label="Department"
                  placeholder="Select department..."
                  searchPlaceholder="Search department..."
                  options={DEPARTMENT_OPTIONS}
                  value={editDepartment}
                  onChange={setEditDepartment}
                  allowOther={true}
                />
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Senior Project Architect"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Finance Access Toggle */}
              {(userRole === "OWNER" || userRole === "ADMIN") && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editFinanceAccess"
                    checked={editHasFinanceAccess}
                    onChange={(e) => setEditHasFinanceAccess(e.target.checked)}
                    className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <label htmlFor="editFinanceAccess" className="text-xs text-[#1F1F1F] cursor-pointer">
                    Grant permission to view and manage project budgets & finance ledger
                  </label>
                </div>
              )}

              {/* Project Assignments */}
              {availableProjects.length > 0 && (
                <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                  <SearchableSelect
                    id="edit-projects"
                    label="Assigned Projects"
                    required={false}
                    multiSelect={true}
                    placeholder="Select projects to assign..."
                    searchPlaceholder="Search projects by code or name..."
                    options={availableProjects.map((p) => ({
                      value: p.id,
                      label: `${p.code} — ${p.name}`,
                      badge: p.code,
                    }))}
                    values={editProjectIds}
                    onMultiChange={setEditProjectIds}
                    allowOther={false}
                    helperText="Assigned staff will be granted workspace access to these project deliverables and sheets."
                  />
                </div>
              )}

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={loading}
              />

              <div className="pt-4 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Manage Credentials & Reset Password Modal */}
      {resetPasswordEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="type-card-title text-[#1F1F1F]">Manage Employee Credentials</h3>
                  <p className="text-xs text-[#696E82]">
                    Update password and revoke active sessions for this user
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordEmployee(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span className="font-medium">{resetModalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetModalError(null)}
                    className="text-red-500 hover:text-red-800 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Employee Summary Card */}
              <div className="p-3.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#5A81FA]">
                      {resetPasswordEmployee.employeeId}
                    </span>
                    <span className="font-semibold text-xs text-[#1F1F1F]">
                      {resetPasswordEmployee.fullName}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#696E82] mt-0.5">
                    {resetPasswordEmployee.email} {resetPasswordEmployee.phone ? `• ${resetPasswordEmployee.phone}` : ""}
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white border border-[#E2E6F0] text-[#696E82]">
                  {resetPasswordEmployee.designation || resetPasswordEmployee.role}
                </span>
              </div>

              {/* Invalidation Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Immediate Session Invalidation Notice
                </span>
                <p className="text-[11px] text-amber-900">
                  Setting a new password will terminate all active sessions across all devices for this user.
                </p>
              </div>

              {/* Password Input & Generation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#1F1F1F]">
                    New Password for Employee <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const gen = "Studio#" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";
                        setNewTemporaryPassword(gen);
                      }}
                      className="text-[#5A81FA] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Generate Strong</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTemporaryPassword("StudioPassword2026!")}
                      className="text-[#696E82] hover:underline cursor-pointer"
                    >
                      Studio Default
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newTemporaryPassword}
                    onChange={(e) => setNewTemporaryPassword(e.target.value)}
                    className="w-full p-2.5 pr-9 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Notification & Custom Message */}
              <div className="bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="resetNotify"
                    checked={resetNotifyEmployee}
                    onChange={(e) => setResetNotifyEmployee(e.target.checked)}
                    className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                  />
                  <label htmlFor="resetNotify" className="text-xs text-[#1F1F1F] font-semibold cursor-pointer">
                    Queue official notification email and in-app alert to employee
                  </label>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#696E82] block mb-1">
                    Custom Message from Administrator
                  </label>
                  <textarea
                    rows={2}
                    value={resetCustomMessage}
                    onChange={(e) => setResetCustomMessage(e.target.value)}
                    placeholder="Enter message for employee..."
                    className="w-full p-2.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E6F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordEmployee(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? "Updating..." : "Update Password & Revoke Sessions"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Credentials Issued / Shared Dialog */}
      {issuedCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E2E6F0] flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">{issuedCredentials.title}</h3>
                  <p className="text-xs text-emerald-800">{issuedCredentials.description}</p>
                </div>
              </div>
              <button
                onClick={() => setIssuedCredentials(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Credentials Details Box */}
              <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#696E82]">Employee:</span>
                  <span className="font-semibold text-[#1F1F1F]">{issuedCredentials.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#696E82]">Employee ID:</span>
                  <span className="font-mono font-bold text-[#5A81FA]">{issuedCredentials.employeeId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#696E82]">Work Email:</span>
                  <span className="font-mono text-[#1F1F1F]">{issuedCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E2E6F0]">
                  <span className="text-[#696E82]">Assigned Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#2563EB] bg-[#EEF2FF] px-2 py-0.5 rounded">
                      {issuedCredentials.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(issuedCredentials.password);
                        setCopiedField("password");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="text-xs text-[#5A81FA] hover:underline"
                    >
                      {copiedField === "password" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Sharing Channels */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1F1F1F] block">Direct Share & Dispatch</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={issuedCredentials.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send via WhatsApp</span>
                  </a>

                  <a
                    href={issuedCredentials.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    title="Open directly in Gmail (designadmin08@gmail.com)"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send via Gmail</span>
                  </a>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#696E82] px-1">
                  <span className="flex items-center gap-1">
                    <span>Company Sender:</span>
                    <strong className="text-[#1F1F1F] font-mono">designadmin08@gmail.com</strong>
                  </span>
                  <a
                    href={issuedCredentials.mailtoUrl}
                    className="text-[#5A81FA] hover:underline"
                    title="Or open default desktop mail client (Outlook / Apple Mail)"
                  >
                    Desktop Outlook / Mail &rarr;
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(issuedCredentials.plainTextMessage);
                    setCopiedField("fullMessage");
                    setTimeout(() => setCopiedField(null), 2500);
                  }}
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#1F1F1F] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedField === "fullMessage" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Message Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#5A81FA]" />
                      <span>Copy Full Credential Message</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-[#E2E6F0] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIssuedCredentials(null)}
                  className="bg-[#1F1F1F] hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import/Export Modal */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        workspaceSlug={workspaceSlug}
        defaultType="employees"
        lockedType={true}
        onSuccess={async () => {
          await fetchFreshEmployees();
          router.refresh();
        }}
      />

      {/* Floating Action Bar for Selected Employees */}
      {selectedEmployeeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1F1F1F] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#EA4335] text-white flex items-center justify-center text-[11px] font-bold">
              {selectedEmployeeIds.length}
            </span>
            <span>employee{selectedEmployeeIds.length > 1 ? "s" : ""} selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={() => setIsBulkMailModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Compose Bulk Mail</span>
          </button>

          <button
            onClick={clearSelection}
            className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk Employee Mail & Announcement Modal */}
      <BulkMailModal
        isOpen={isBulkMailModalOpen}
        onClose={() => setIsBulkMailModalOpen(false)}
        workspaceSlug={workspaceSlug}
        allEmployees={employees}
        initiallySelectedIds={selectedEmployeeIds}
        onDispatchSuccess={async () => {
          await fetchFreshEmployees();
          router.refresh();
        }}
      />

      {/* Dynamic Form Fields Manager Modal */}
      <CustomFieldsManagerModal
        isOpen={customFieldsModalOpen}
        onClose={() => setCustomFieldsModalOpen(false)}
        workspaceSlug={workspaceSlug}
        initialEntity="TEAM"
        onFieldsUpdated={refreshCustomFields}
      />
    </div>
  );
}
