"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  CheckCheck,
  Plus,
  LayoutList,
  Columns3,
  Calendar,
  Layers,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  UserPlus,
  X,
  ArrowRightLeft,
  Pencil,
  CheckSquare,
  Square,
  User,
  Users,
  Search,
  Filter,
  Eye,
  Send,
  History,
  FileText,
  AlertTriangle,
  FolderGit2,
  SlidersHorizontal,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { CustomFieldsManagerModal } from "@/components/custom-fields/CustomFieldsManagerModal";
import { DynamicFormFields } from "@/components/custom-fields/DynamicFormFields";
import { DynamicCardFields } from "@/components/custom-fields/DynamicCardFields";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { SearchableSelect, STUDIO_TYPOLOGIES, isTypologyMatch } from "@/components/ui/SearchableSelect";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "BLOCKED" | "CANCELLED";
  dueDate: string | null;
  estimatedHours: any;
  customFields?: Record<string, any>;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
  };
  phaseId?: string | null;
  phase: {
    id: string;
    phaseName: string;
  } | null;
  assigneeId?: string | null;
  assignee: {
    id?: string;
    user: { fullName: string; email: string };
    employee: { employeeId: string; designation: string | null } | null;
  } | null;
  creatorId?: string | null;
  creator?: {
    id: string;
    user: { fullName: string };
  } | null;
  checklistItems: Array<{ id: string; title: string; isCompleted: boolean }>;
  comments: Array<{ id: string; content: string; authorId?: string; createdAt?: string }>;
  activityHistory?: Array<{
    id: string;
    actorId: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    createdAt: string;
  }>;
}

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  projectType?: string | null;
  phases: Array<{ id: string; phaseName: string; sortOrder: number }>;
}

export interface MemberOption {
  id: string;
  role: string;
  user: { fullName: string; email: string };
  employee: { employeeId: string; designation: string | null; department: string | null } | null;
}

export interface TaskDashboardMetrics {
  dueToday: number;
  overdue: number;
  inProgress: number;
  waitingReview: number;
  completed: number;
  total?: number;
}

export interface TasksClientViewProps {
  initialTasks: TaskItem[];
  projects: ProjectOption[];
  members: MemberOption[];
  workspaceSlug: string;
  currentUserId: string;
  currentMembershipId: string;
  userRole: string;
  activeFilter: string;
  initialView: string;
  currentScope?: string;
  metrics?: TaskDashboardMetrics;
  contextUserFullName?: string;
  workspaceTimezone?: string;
  initialCustomFields?: CustomFieldDefinition[];
  initialCustomValues?: Record<string, any>;
}

export default function TasksClientView({
  initialTasks,
  projects,
  members,
  workspaceSlug,
  currentMembershipId,
  userRole,
  activeFilter,
  initialView,
  currentScope = "all",
  metrics,
  contextUserFullName,
  workspaceTimezone = "Asia/Kolkata",
  initialCustomFields = [],
  initialCustomValues = {},
}: TasksClientViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [customValuesByTask, setCustomValuesByTask] = useState<Record<string, Record<string, any>>>(initialCustomValues);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  // Mounting state to prevent browser extension hydration attribute mismatches (e.g. fdprocessedid)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const refreshCustomFields = async () => {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}&entity=TASK`),
        fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}&entity=TASK`),
      ]);
      if (fRes.ok) {
        const fData = await fRes.json();
        setCustomFields(fData.fields || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setCustomValuesByTask(vData.values || {});
      }
    } catch (e) {
      console.error("Failed to reload task custom fields:", e);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const [view, setView] = useState<"list" | "kanban">(initialView === "kanban" ? "kanban" : "list");
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [togglingChecklistId, setTogglingChecklistId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Client Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [selectedDueDateCategory, setSelectedDueDateCategory] = useState<string>(
    ["TODAY", "OVERDUE", "UPCOMING"].includes(activeFilter) ? activeFilter : "ALL"
  );
  const [selectedStatusCategory, setSelectedStatusCategory] = useState<string>(
    ["IN_PROGRESS", "WAITING_REVIEW", "COMPLETED"].includes(activeFilter) ? activeFilter : "ALL"
  );
  const [taskSortBy, setTaskSortBy] = useState<string>("DUE_DATE_ASC");

  // Detail Drawer state
  const [drawerTask, setDrawerTask] = useState<TaskItem | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Workflow Modal states
  const [changeRequestModal, setChangeRequestModal] = useState<{ taskId: string; title: string } | null>(null);
  const [changeComment, setChangeComment] = useState("");
  const [overrideModal, setOverrideModal] = useState<{ taskId: string; title: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Reassign / Delegate Modal state
  const [reassignModal, setReassignModal] = useState<{ task: TaskItem } | null>(null);
  const [reassignTargetMemberId, setReassignTargetMemberId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");
  const [reassigning, setReassigning] = useState<boolean>(false);

  // Edit Task Modal state
  const [editModal, setEditModal] = useState<{ task: TaskItem } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState("");
  const [editPhaseId, setEditPhaseId] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete Task state
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<boolean>(false);

  // Create Task Modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTypology, setTaskTypology] = useState<string>("");
  const [otherTypology, setOtherTypology] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [otherProjectName, setOtherProjectName] = useState<string>("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [otherPhaseName, setOtherPhaseName] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>(
    userRole === "OWNER" || userRole === "ADMIN" ? "" : currentMembershipId
  );
  const [otherAssigneeName, setOtherAssigneeName] = useState<string>("");
  const [taskPriority, setTaskPriority] = useState<string>("MEDIUM");
  const [otherPriorityName, setOtherPriorityName] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Friendly greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Formatted date in workspace timezone
  const formattedTodayDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: workspaceTimezone,
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [workspaceTimezone]);

  // Member map for quick lookup in comments and activity
  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; role: string; empId?: string }>();
    members.forEach((m) => {
      map.set(m.id, {
        name: m.user.fullName,
        role: m.role,
        empId: m.employee?.employeeId,
      });
    });
    return map;
  }, [members]);

  // Filter tasks based on search, project, priority, due-date category, and status category
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchProj = task.project.code.toLowerCase().includes(q) || task.project.name.toLowerCase().includes(q);
        const matchAssignee = task.assignee?.user.fullName.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchProj && !matchAssignee) {
          return false;
        }
      }

      // 2. Project Filter
      if (selectedProjectFilter !== "ALL" && task.projectId !== selectedProjectFilter) {
        return false;
      }

      // 3. Priority Filter
      if (selectedPriorityFilter !== "ALL" && task.priority !== selectedPriorityFilter) {
        return false;
      }

      // 4. Due Date Category Filter
      if (selectedDueDateCategory !== "ALL") {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        const isFinished = task.status === "COMPLETED" || task.status === "CANCELLED";

        if (selectedDueDateCategory === "TODAY") {
          if (isFinished || due < startOfToday || due > endOfToday) return false;
        } else if (selectedDueDateCategory === "OVERDUE") {
          if (isFinished || due >= startOfToday) return false;
        } else if (selectedDueDateCategory === "UPCOMING") {
          if (isFinished || due <= endOfToday) return false;
        }
      }

      // 5. Status Category Filter
      if (selectedStatusCategory !== "ALL") {
        if (selectedStatusCategory === "IN_PROGRESS" && task.status !== "IN_PROGRESS") return false;
        if (selectedStatusCategory === "WAITING_REVIEW" && task.status !== "IN_REVIEW") return false;
        if (selectedStatusCategory === "COMPLETED" && task.status !== "COMPLETED") return false;
        if (selectedStatusCategory === "NOT_STARTED" && task.status !== "NOT_STARTED") return false;
      }

      return true;
    }).sort((a, b) => {
      switch (taskSortBy) {
        case "DUE_DATE_ASC": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case "DUE_DATE_DESC": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        case "CREATED_DESC":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "CREATED_ASC":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "ALPHA_ASC":
          return a.title.localeCompare(b.title);
        case "ALPHA_DESC":
          return b.title.localeCompare(a.title);
        case "PROJ_ALPHA_ASC":
          return a.project.code.localeCompare(b.project.code);
        default:
          return 0;
      }
    });
  }, [
    tasks,
    searchQuery,
    selectedProjectFilter,
    selectedPriorityFilter,
    selectedDueDateCategory,
    selectedStatusCategory,
    taskSortBy,
  ]);

  const handleScopeChange = (newScope: string) => {
    router.push(`/w/${workspaceSlug}/tasks?filter=${activeFilter}&view=${view}&scope=${newScope}`);
  };

  // Metric card click handler: toggle corresponding filter
  const handleMetricCardClick = (type: "TODAY" | "OVERDUE" | "IN_PROGRESS" | "WAITING_REVIEW" | "COMPLETED") => {
    if (type === "TODAY" || type === "OVERDUE") {
      setSelectedDueDateCategory((prev) => (prev === type ? "ALL" : type));
    } else {
      setSelectedStatusCategory((prev) => (prev === type ? "ALL" : type));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedProjectFilter("ALL");
    setSelectedPriorityFilter("ALL");
    setSelectedDueDateCategory("ALL");
    setSelectedStatusCategory("ALL");
    setTaskSortBy("DUE_DATE_ASC");
  };

  // Filter projects for task assign modal by selected architectural typology
  const effectiveTypology = useMemo(() => {
    return taskTypology === "OTHER" ? otherTypology.trim() : taskTypology.trim();
  }, [taskTypology, otherTypology]);

  const filteredProjectsForAssign = useMemo(() => {
    if (!effectiveTypology) return projects;
    return projects.filter((p) => isTypologyMatch(p.projectType, effectiveTypology));
  }, [projects, effectiveTypology]);

  // Find phases for currently selected project in task creation modal
  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const availablePhases = currentProject?.phases || [];

  const handleAddChecklistField = () => {
    setChecklistItems([...checklistItems, ""]);
  };

  const handleUpdateChecklistItem = (index: number, val: string) => {
    const updated = [...checklistItems];
    updated[index] = val;
    setChecklistItems(updated);
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMessage("Please select a project or specify a custom project.");
      return;
    }
    if (selectedProjectId === "OTHER" && !otherProjectName.trim()) {
      setErrorMessage("Please enter a custom project name.");
      return;
    }
    if (!taskTitle.trim()) {
      setErrorMessage("Please enter a deliverable title.");
      return;
    }

    setCreatingTask(true);
    setErrorMessage(null);

    const effectiveTypology = taskTypology === "OTHER" ? (otherTypology.trim() || "Other") : taskTypology.trim();
    const effectiveProjectName = selectedProjectId === "OTHER" ? (otherProjectName.trim() || "Ad-Hoc Project") : null;
    const effectivePhaseName = selectedPhaseId === "OTHER" ? (otherPhaseName.trim() || "Custom Phase") : null;
    const effectiveAssigneeName = taskAssigneeId === "OTHER" ? (otherAssigneeName.trim() || "External Specialist") : null;
    const effectivePriority = taskPriority === "OTHER" ? "HIGH" : (taskPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT");

    // Project ID for DB foreign key
    const actualProjectId = selectedProjectId === "OTHER" ? (projects[0]?.id || "") : selectedProjectId;

    // Build title and description with any custom metadata
    let fullTitle = taskTitle.trim();
    if (effectiveProjectName) {
      fullTitle = `[${effectiveProjectName}] ${fullTitle}`;
    }

    let fullDescription = taskDescription.trim();
    const metaNotes: string[] = [];
    if (effectiveTypology) metaNotes.push(`Typology: ${effectiveTypology}`);
    if (effectiveAssigneeName) metaNotes.push(`Assigned Specialist: ${effectiveAssigneeName}`);
    if (effectivePhaseName) metaNotes.push(`Phase: ${effectivePhaseName}`);
    if (taskPriority === "OTHER" && otherPriorityName.trim()) metaNotes.push(`Priority: ${otherPriorityName.trim()}`);
    if (metaNotes.length > 0) {
      fullDescription = fullDescription
        ? `${fullDescription}\n\n---\n${metaNotes.join(" • ")}`
        : metaNotes.join(" • ");
    }

    const payloadCustomValues: Record<string, any> = {
      ...customFieldValues,
      ...(effectiveTypology ? { typology: effectiveTypology } : {}),
      ...(effectiveProjectName ? { customProject: effectiveProjectName } : {}),
      ...(effectivePhaseName ? { customPhase: effectivePhaseName } : {}),
      ...(effectiveAssigneeName ? { externalAssignee: effectiveAssigneeName } : {}),
      ...(taskPriority === "OTHER" ? { customPriority: otherPriorityName.trim() || "Custom Priority" } : {}),
    };

    try {
      const res = await fetch(`/api/tasks/create?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: actualProjectId,
          phaseId: selectedPhaseId === "OTHER" ? undefined : (selectedPhaseId || undefined),
          title: fullTitle,
          description: fullDescription || undefined,
          assigneeId: taskAssigneeId === "OTHER" ? undefined : (taskAssigneeId || undefined),
          priority: effectivePriority,
          dueDate: taskDueDate || undefined,
          estimatedHours: taskEstimatedHours ? Number(taskEstimatedHours) : undefined,
          checklist: checklistItems.filter((item) => item.trim().length > 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create task");
      } else {
        const assignedMember = members.find((m) => m.id === taskAssigneeId);
        const assigneeName = taskAssigneeId === "OTHER"
          ? (effectiveAssigneeName || "External Specialist")
          : (assignedMember?.user.fullName || "colleague");
        setSuccessMessage(`Deliverable "${taskTitle}" assigned successfully to ${assigneeName}!`);

        if (data.task?.id && Object.keys(payloadCustomValues).length > 0) {
          try {
            await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "TASK",
                recordId: data.task.id,
                values: payloadCustomValues,
              }),
            });
            setCustomValuesByTask((prev) => ({
              ...prev,
              [data.task.id]: payloadCustomValues,
            }));
          } catch (err) {
            console.error("Failed to save task custom fields", err);
          }
        }

        // Reset form
        setTaskTypology("");
        setOtherTypology("");
        setOtherProjectName("");
        setOtherPhaseName("");
        setOtherAssigneeName("");
        setOtherPriorityName("");
        setTaskTitle("");
        setTaskDescription("");
        setTaskDueDate("");
        setTaskEstimatedHours("");
        setChecklistItems([""]);
        setCustomFieldValues({});
        setIsCreateTaskModalOpen(false);

        router.refresh();
      }
    } catch {
      setErrorMessage("Network error while creating task");
    } finally {
      setCreatingTask(false);
    }
  };

  // Workflow Status Transition
  const updateStatus = async (
    taskId: string,
    newStatus: string,
    options: { comment?: string; auditReason?: string } = {}
  ) => {
    setLoadingTaskId(taskId);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tasks/status?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          comment: options.comment,
          auditReason: options.auditReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update task status");
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
        );
        if (drawerTask && drawerTask.id === taskId) {
          setDrawerTask((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch {
      setErrorMessage("Network error updating status");
    } finally {
      setLoadingTaskId(null);
      setChangeRequestModal(null);
      setOverrideModal(null);
      setChangeComment("");
      setOverrideReason("");
    }
  };

  // Kanban Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnColumn = (targetStatus: TaskItem["status"]) => {
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === targetStatus) return;

    const isMyTask = task.assigneeId === currentMembershipId;

    // Rule 1: Moving to COMPLETED
    if (targetStatus === "COMPLETED") {
      if (!isPrivileged) {
        setErrorMessage("Self-approval blocked. Architecture deliverables must be reviewed and approved by an Owner or Admin.");
        return;
      }
      if (task.status !== "IN_REVIEW") {
        // Direct override required
        setOverrideModal({ taskId: task.id, title: task.title });
        return;
      }
      updateStatus(task.id, "COMPLETED");
      return;
    }

    // Rule 2: Reverting from IN_REVIEW to IN_PROGRESS (Change request)
    if (task.status === "IN_REVIEW" && targetStatus === "IN_PROGRESS") {
      setChangeRequestModal({ taskId: task.id, title: task.title });
      return;
    }

    // Rule 3: Moving to IN_PROGRESS
    if (targetStatus === "IN_PROGRESS") {
      if (task.status === "NOT_STARTED") {
        updateStatus(task.id, "IN_PROGRESS");
        return;
      }
    }

    // Rule 4: Submitting to IN_REVIEW
    if (targetStatus === "IN_REVIEW") {
      updateStatus(task.id, "IN_REVIEW");
      return;
    }

    // Default fallback: execute requested transition
    updateStatus(task.id, targetStatus);
  };

  // Open Reassign Modal
  const openReassignModal = (task: TaskItem) => {
    setReassignModal({ task });
    const defaultRecipient = members.find((m) => m.id !== task.assigneeId && m.id !== currentMembershipId);
    setReassignTargetMemberId(defaultRecipient ? defaultRecipient.id : members[0]?.id || "");
    setReassignReason("");
  };

  // Submit Reassign Task
  const handleReassignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal || !reassignTargetMemberId) return;

    setReassigning(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tasks/reassign?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: reassignModal.task.id,
          newAssigneeId: reassignTargetMemberId,
          reason: reassignReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delegate task");
      } else {
        const targetMember = members.find((m) => m.id === reassignTargetMemberId);
        const targetName = targetMember?.user.fullName || "colleague";
        setSuccessMessage(`Deliverable "${reassignModal.task.title}" successfully delegated to ${targetName}!`);

        setTasks((prev) =>
          prev.map((t) =>
            t.id === reassignModal.task.id
              ? {
                  ...t,
                  assigneeId: reassignTargetMemberId,
                  assignee: targetMember
                    ? {
                        id: targetMember.id,
                        user: targetMember.user,
                        employee: targetMember.employee,
                      }
                    : t.assignee,
                }
              : t
          )
        );

        setReassignModal(null);
        setReassignReason("");
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error delegating task");
    } finally {
      setReassigning(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (task: TaskItem) => {
    setEditModal({ task });
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setEditEstimatedHours(task.estimatedHours ? String(task.estimatedHours) : "");
    setEditPhaseId(task.phase?.id || "");
  };

  // Submit Edit Task
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal || !editTitle.trim()) return;

    setEditing(true);
    setErrorMessage(null);

    try {
      // If employee, only send description to comply with field-level restrictions
      const payload: any = {
        taskId: editModal.task.id,
        description: editDescription.trim() || null,
      };

      if (isPrivileged) {
        payload.title = editTitle.trim();
        payload.priority = editPriority;
        payload.dueDate = editDueDate || null;
        payload.estimatedHours = editEstimatedHours ? Number(editEstimatedHours) : null;
        payload.phaseId = editPhaseId || null;
      }

      const res = await fetch(`/api/tasks/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update task");
      } else {
        setSuccessMessage(`Task updated successfully!`);
        const targetPhase = projects.flatMap((p) => p.phases).find((ph) => ph.id === editPhaseId);

        setTasks((prev) =>
          prev.map((t) =>
            t.id === editModal.task.id
              ? {
                  ...t,
                  description: editDescription.trim() || null,
                  ...(isPrivileged
                    ? {
                        title: editTitle.trim(),
                        priority: editPriority,
                        dueDate: editDueDate || null,
                        estimatedHours: editEstimatedHours ? Number(editEstimatedHours) : null,
                        phaseId: editPhaseId || null,
                        phase: targetPhase ? { id: targetPhase.id, phaseName: targetPhase.phaseName } : t.phase,
                      }
                    : {}),
                }
              : t
          )
        );

        if (drawerTask && drawerTask.id === editModal.task.id) {
          setDrawerTask((prev) => (prev ? { ...prev, description: editDescription.trim() || null } : null));
        }

        setEditModal(null);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error updating task");
    } finally {
      setEditing(false);
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    setDeletingTask(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tasks/delete?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete task");
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
        if (drawerTask && drawerTask.id === taskToDelete.id) {
          setDrawerTask(null);
        }
        if (editModal && editModal.task.id === taskToDelete.id) {
          setEditModal(null);
        }
        setSuccessMessage(`Deliverable "${taskToDelete.title}" was permanently deleted.`);
        setTaskToDelete(null);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error while deleting task");
    } finally {
      setDeletingTask(false);
    }
  };

  // Toggle checklist item status directly
  const handleToggleChecklist = async (taskId: string, itemId: string, currentStatus: boolean) => {
    setTogglingChecklistId(itemId);
    try {
      const res = await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          itemId,
          isCompleted: !currentStatus,
        }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  checklistItems: t.checklistItems.map((ci) =>
                    ci.id === itemId ? { ...ci, isCompleted: !currentStatus } : ci
                  ),
                }
              : t
          )
        );
        if (drawerTask && drawerTask.id === taskId) {
          setDrawerTask((prev) =>
            prev
              ? {
                  ...prev,
                  checklistItems: prev.checklistItems.map((ci) =>
                    ci.id === itemId ? { ...ci, isCompleted: !currentStatus } : ci
                  ),
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle checklist item", err);
    } finally {
      setTogglingChecklistId(null);
    }
  };

  // Add Comment from Drawer
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerTask || !newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/comment?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: drawerTask.id,
          content: newCommentText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to post comment");
      } else {
        const addedComment = {
          id: data.comment?.id || `c-${Date.now()}`,
          content: newCommentText.trim(),
          authorId: currentMembershipId,
          createdAt: new Date().toISOString(),
        };

        setTasks((prev) =>
          prev.map((t) =>
            t.id === drawerTask.id
              ? { ...t, comments: [...t.comments, addedComment] }
              : t
          )
        );
        setDrawerTask((prev) =>
          prev ? { ...prev, comments: [...prev.comments, addedComment] } : null
        );
        setNewCommentText("");
      }
    } catch {
      setErrorMessage("Network error posting comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">URGENT</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F2F4FF] text-[#696E82] border border-[#E2E6F0]">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] text-[#696E82] bg-gray-50 border border-gray-200">LOW</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✔ Completed</span>;
      case "IN_REVIEW":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">⏳ In Review</span>;
      case "IN_PROGRESS":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">▶ In Progress</span>;
      case "BLOCKED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">⛔ Blocked</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4FF] text-[#696E82] border border-[#E2E6F0]">Not Started</span>;
    }
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedProjectFilter !== "ALL" ||
    selectedPriorityFilter !== "ALL" ||
    selectedDueDateCategory !== "ALL" ||
    selectedStatusCategory !== "ALL" ||
    taskSortBy !== "DUE_DATE_ASC";

  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse" suppressHydrationWarning>
        {/* Banner Skeleton */}
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-7 w-64 bg-gray-200 rounded" />
            <div className="h-3 w-96 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        </div>
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-[#E2E6F0] bg-white h-24" />
          ))}
        </div>
        {/* Filter bar Skeleton */}
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 h-14" />
        {/* Task List Skeleton */}
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
      {/* 1. ARCHITECTURE STUDIO GREETING & DATE BANNER */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deliverable Command Center</span>
            <span>•</span>
            <span suppressHydrationWarning>{formattedTodayDate}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1F1F1F] mt-1" suppressHydrationWarning>
            {greeting}, {contextUserFullName || "Architect"}
          </h2>
          <p className="text-xs text-[#696E82] mt-0.5">
            {isPrivileged
              ? currentScope === "all"
                ? "Overseeing studio-wide architectural tasks, team deadlines, and deliverables."
                : "Tasks assigned specifically to you."
              : "Your personal workspace queue: review deadlines, update checklists, and submit deliverables."}
          </p>
        </div>

        {/* Executive Scope Switcher for Boss / Partner / Admin */}
        {isPrivileged && (
          <div className="flex items-center gap-1.5 bg-[#F8F9FD] p-1.5 rounded-xl border border-[#E2E6F0] shrink-0">
            <span className="text-xs font-semibold text-[#696E82] px-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span className="hidden sm:inline">Scope:</span>
            </span>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => handleScopeChange("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentScope === "all"
                  ? "bg-[#5A81FA] text-white shadow-2xs"
                  : "text-[#696E82] hover:text-[#1F1F1F]"
              }`}
            >
              All Studio Tasks
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => handleScopeChange("my")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentScope === "my"
                  ? "bg-[#5A81FA] text-white shadow-2xs"
                  : "text-[#696E82] hover:text-[#1F1F1F]"
              }`}
            >
              Assigned to Me
            </button>
          </div>
        )}
      </div>

      {/* 2. SUMMARY METRIC CARDS (5 Interactive Cards) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Due Today */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleMetricCardClick("TODAY")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              selectedDueDateCategory === "TODAY"
                ? "bg-[#F2F4FF] border-[#5A81FA] ring-2 ring-[#5A81FA]/20"
                : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#696E82]">Due Today</span>
              <Calendar className="w-4 h-4 text-[#5A81FA]" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-2">
              {metrics.dueToday}
            </div>
            <p className="text-[11px] text-[#696E82] mt-1">Pending today</p>
          </button>

          {/* Card 2: Overdue */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleMetricCardClick("OVERDUE")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              selectedDueDateCategory === "OVERDUE"
                ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
                : "bg-white border-[#E2E6F0] hover:border-rose-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-rose-900 mt-2">
              {metrics.overdue}
            </div>
            <p className="text-[11px] text-rose-700/80 mt-1">Requires immediate attention</p>
          </button>

          {/* Card 3: In Progress */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleMetricCardClick("IN_PROGRESS")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              selectedStatusCategory === "IN_PROGRESS"
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20"
                : "bg-white border-[#E2E6F0] hover:border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">In Progress</span>
              <Play className="w-4 h-4 text-blue-600 fill-current" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-blue-900 mt-2">
              {metrics.inProgress}
            </div>
            <p className="text-[11px] text-blue-700/80 mt-1">Active studio drafting</p>
          </button>

          {/* Card 4: Waiting for Review */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleMetricCardClick("WAITING_REVIEW")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              selectedStatusCategory === "WAITING_REVIEW"
                ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/20"
                : "bg-white border-[#E2E6F0] hover:border-purple-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Waiting Review</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-purple-900 mt-2">
              {metrics.waitingReview}
            </div>
            <p className="text-[11px] text-purple-700/80 mt-1">Submitted for approval</p>
          </button>

          {/* Card 5: Completed */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handleMetricCardClick("COMPLETED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              selectedStatusCategory === "COMPLETED"
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-[#E2E6F0] hover:border-emerald-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-900 mt-2">
              {metrics.completed}
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-1">Approved deliverables</p>
          </button>
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button suppressHydrationWarning onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
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
          <button suppressHydrationWarning onClick={() => setErrorMessage(null)} className="text-red-600 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MULTI-DIMENSION FILTER BAR (SEARCH, DUE DATE, STATUS, PRIORITY, PROJECT) */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#696E82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              suppressHydrationWarning
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deliverables by title, project code, or description..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
            />
            {searchQuery && (
              <button
                suppressHydrationWarning
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action buttons: Assign Task & View Switcher */}
          <div className="flex items-center gap-2">
            {(userRole === "OWNER" || userRole === "ADMIN") && (
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setCustomFieldsModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Configure dynamic task & deliverable fields without code"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span>Form Fields</span>
              </button>
            )}
            <button
              suppressHydrationWarning
              onClick={() => {
                setCustomFieldValues({});
                setIsCreateTaskModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Deliverable</span>
            </button>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-[#F2F4FF] border border-[#E2E6F0] p-1 rounded-xl shrink-0">
              <button
                suppressHydrationWarning
                onClick={() => setView("list")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  view === "list" ? "bg-white text-[#1F1F1F] font-semibold shadow-2xs" : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                suppressHydrationWarning
                onClick={() => setView("kanban")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  view === "kanban" ? "bg-white text-[#1F1F1F] font-semibold shadow-2xs" : "text-[#696E82] hover:text-[#1F1F1F]"
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Specific Category Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E6F0] text-xs">
          <div className="flex items-center gap-1 text-[#696E82] font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Due Date Category */}
          <select
            suppressHydrationWarning
            value={selectedDueDateCategory}
            onChange={(e) => setSelectedDueDateCategory(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          >
            <option value="ALL">All Due Dates</option>
            <option value="TODAY">Due Today</option>
            <option value="OVERDUE">Overdue Only</option>
            <option value="UPCOMING">Upcoming</option>
          </select>

          {/* Status Category */}
          <select
            suppressHydrationWarning
            value={selectedStatusCategory}
            onChange={(e) => setSelectedStatusCategory(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_REVIEW">Waiting for Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority */}
          <select
            suppressHydrationWarning
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="p-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Project */}
          <select
            suppressHydrationWarning
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

          {/* Sort By Filter (Date, Day, Alphabetical) */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg px-2 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5A81FA] shrink-0" />
            <select
              suppressHydrationWarning
              value={taskSortBy}
              onChange={(e) => setTaskSortBy(e.target.value)}
              className="bg-transparent font-medium text-[#1F1F1F] focus:outline-none cursor-pointer"
              title="Sort tasks by date day or alphabetical order"
            >
              <option value="DUE_DATE_ASC">Sort: Due Date (Closest First)</option>
              <option value="DUE_DATE_DESC">Sort: Due Date (Furthest First)</option>
              <option value="CREATED_DESC">Sort: Date Created (Newest First)</option>
              <option value="CREATED_ASC">Sort: Date Created (Oldest First)</option>
              <option value="ALPHA_ASC">Sort: Alphabetical (A → Z)</option>
              <option value="ALPHA_DESC">Sort: Alphabetical (Z → A)</option>
              <option value="PROJ_ALPHA_ASC">Sort: Project Code (A → Z)</option>
            </select>
          </div>

          {/* Clear Filters */}
          {isFilterActive && (
            <button
              suppressHydrationWarning
              onClick={handleClearFilters}
              className="text-[#696E82] hover:text-red-700 font-semibold text-xs ml-auto flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}

          <div className="text-[11px] text-[#696E82] ml-auto">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>
      </div>

      {/* 4. MAIN VIEW: LIST OR KANBAN */}
      {view === "list" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-[#696E82]">
              <Layers className="w-10 h-10 mx-auto text-[#A8B1CE] mb-3" />
              <div className="text-sm font-semibold text-[#1F1F1F]">No deliverables matching this criteria</div>
              <p className="text-xs text-[#696E82] mt-1 mb-4">
                Try adjusting your search query, status, or due date filters.
              </p>
              {isFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-xl hover:bg-[#F2F4FF] transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E2E6F0]">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
                const isMyTask = task.assigneeId === currentMembershipId;
                const canEditOrReassign = isPrivileged || isMyTask;

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-[#F8F9FD] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    {/* Left: Task Info & Direct Drawer Opener */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                          {task.project.code}
                        </span>
                        {task.phase && (
                          <span className="text-[11px] font-medium text-[#696E82] bg-[#F2F4FF] px-2 py-0.5 rounded">
                            {task.phase.phaseName}
                          </span>
                        )}
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setDrawerTask(task)}
                          className="text-left group cursor-pointer"
                        >
                          <h4 className="text-sm font-bold text-[#1F1F1F] tracking-tight group-hover:text-[#5A81FA] group-hover:underline">
                            {task.title}
                          </h4>
                        </button>
                        {task.description && (
                          <p className="text-xs text-[#696E82] mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        {/* Assignee highlight */}
                        <div className="inline-flex items-center gap-1.5 bg-[#F2F4FF] px-2.5 py-1 rounded-lg border border-[#E2E6F0]">
                          <User className="w-3.5 h-3.5 text-[#5A81FA]" />
                          <span className="text-[11px] text-[#696E82]">Assignee:</span>
                          <span className="font-bold text-[#1F1F1F] text-xs">
                            {task.assignee ? task.assignee.user.fullName : "Unassigned"}
                          </span>
                          {task.assignee?.employee?.employeeId && (
                            <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-white px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                              {task.assignee.employee.employeeId}
                            </span>
                          )}
                          {isMyTask && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>

                        {task.dueDate && (
                          <span
                            className={`flex items-center gap-1 font-medium text-[11px] ${
                              isOverdue ? "text-red-700 font-bold" : "text-[#696E82]"
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span suppressHydrationWarning>
                              Due:{" "}
                              {new Date(task.dueDate).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] text-red-600 bg-red-50 px-1 rounded font-bold">
                                (Overdue)
                              </span>
                            )}
                          </span>
                        )}

                        {task.estimatedHours && (
                          <span className="text-[11px] text-[#696E82]">
                            Est: <strong>{Number(task.estimatedHours)} hrs</strong>
                          </span>
                        )}

                        {task.comments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDrawerTask(task)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#696E82] hover:text-[#1F1F1F]"
                          >
                            <MessageSquare className="w-3 h-3 text-[#696E82]" />
                            <span>{task.comments.length}</span>
                          </button>
                        )}
                      </div>

                      {/* Dynamic Custom Fields */}
                      <DynamicCardFields
                        fields={customFields}
                        values={customValuesByTask[task.id] || (task as any).customFields || {}}
                      />

                      {/* Interactive Checklist Sub-items */}
                      {task.checklistItems.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[11px] font-semibold text-[#696E82] mb-1 flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                            <span>
                              Checklist (
                              {task.checklistItems.filter((i) => i.isCompleted).length}/{task.checklistItems.length})
                            </span>
                          </div>
                          <div className="space-y-1 pl-1">
                            {task.checklistItems.map((item) => (
                              <button
                                key={item.id}
                                disabled={!canEditOrReassign || togglingChecklistId === item.id}
                                onClick={() => handleToggleChecklist(task.id, item.id, item.isCompleted)}
                                className={`flex items-center gap-2 text-xs text-left group transition-colors ${
                                  canEditOrReassign ? "cursor-pointer" : "cursor-default"
                                }`}
                              >
                                {item.isCompleted ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-[#696E82] group-hover:text-[#5A81FA] shrink-0" />
                                )}
                                <span
                                  className={`${
                                    item.isCompleted ? "line-through text-[#696E82]" : "text-[#1F1F1F]"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions & Delegation */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2 shrink-0">
                      {/* Top Row: Details Drawer, Edit & Delegate */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDrawerTask(task)}
                          className="px-2.5 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-lg border border-[#E2E6F0] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Open full deliverable details"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#696E82]" />
                          <span>Details</span>
                        </button>

                        {canEditOrReassign && (
                          <>
                            <button
                              onClick={() => openEditModal(task)}
                              className="px-2.5 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#1F1F1F] text-xs font-semibold rounded-lg border border-[#E2E6F0] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Edit task scope or details"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#696E82]" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => openReassignModal(task)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Delegate deliverable to another team member"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-700" />
                              <span>Delegate</span>
                            </button>
                          </>
                        )}

                        {(isPrivileged || task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId) && (
                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Delete task deliverable"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      {/* Workflow Status Progression Buttons */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {task.status === "NOT_STARTED" && (
                          <button
                            disabled={loadingTaskId === task.id}
                            onClick={() => updateStatus(task.id, "IN_PROGRESS")}
                            className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start Work</span>
                          </button>
                        )}

                        {task.status === "IN_PROGRESS" && (
                          <button
                            disabled={loadingTaskId === task.id}
                            onClick={() => updateStatus(task.id, "IN_REVIEW")}
                            className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Submit for Review</span>
                          </button>
                        )}

                        {task.status === "IN_REVIEW" && (
                          <>
                            {isPrivileged ? (
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={loadingTaskId === task.id}
                                  onClick={() => updateStatus(task.id, "COMPLETED")}
                                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  disabled={loadingTaskId === task.id}
                                  onClick={() => setChangeRequestModal({ taskId: task.id, title: task.title })}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3 text-amber-700" />
                                  <span>Changes</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-[#696E82] bg-[#F2F4FF] px-2.5 py-1 rounded-lg border border-[#E2E6F0]">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                <span>Awaiting Studio Lead Review</span>
                              </div>
                            )}
                          </>
                        )}

                        {task.status === "COMPLETED" && (
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. KANBAN BOARD WITH DRAG AND DROP */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { status: "NOT_STARTED", title: "Not Started", color: "border-gray-300", bg: "bg-gray-50/50" },
            { status: "IN_PROGRESS", title: "In Progress", color: "border-blue-400", bg: "bg-blue-50/30" },
            { status: "IN_REVIEW", title: "In Review", color: "border-purple-400", bg: "bg-purple-50/30" },
            { status: "COMPLETED", title: "Completed", color: "border-emerald-500", bg: "bg-emerald-50/30" },
          ].map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnColumn(col.status as any)}
                className={`bg-white border border-[#E2E6F0] rounded-2xl p-4 flex flex-col min-h-[500px] transition-colors ${col.bg}`}
              >
                <div className={`flex items-center justify-between pb-3 border-b-2 ${col.color} mb-3`}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">{col.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#F2F4FF] text-[#696E82]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {colTasks.map((task) => {
                    const isMyTask = task.assigneeId === currentMembershipId;
                    const canEditOrReassign = isPrivileged || isMyTask;
                    const isOverdue =
                      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="p-3.5 bg-white border border-[#E2E6F0] rounded-xl shadow-2xs space-y-2 hover:border-[#5A81FA] transition-all cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                            {task.project.code}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        <button
                          type="button"
                          onClick={() => setDrawerTask(task)}
                          className="text-left block w-full group/title cursor-pointer"
                        >
                          <h4 className="text-xs font-bold text-[#1F1F1F] line-clamp-2 group-hover/title:text-[#5A81FA] group-hover/title:underline">
                            {task.title}
                          </h4>
                        </button>

                        {/* Assignee pill */}
                        <div className="text-[11px] text-[#696E82] flex items-center justify-between gap-1 bg-[#F2F4FF] px-2 py-1 rounded">
                          <span className="truncate">
                            {task.assignee ? task.assignee.user.fullName : "Unassigned"}
                          </span>
                          {isMyTask && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>

                        {/* Due Date & Checklist count */}
                        <div className="flex items-center justify-between text-[11px] text-[#696E82] pt-1">
                          {task.dueDate ? (
                            <span className={isOverdue ? "text-red-700 font-bold" : ""}>
                              {new Date(task.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <span />
                          )}
                          {task.checklistItems.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px]">
                              <CheckSquare className="w-3 h-3" />
                              {task.checklistItems.filter((c) => c.isCompleted).length}/{task.checklistItems.length}
                            </span>
                          )}
                        </div>

                        {/* Card bottom actions */}
                        <div className="pt-2 border-t border-[#E2E6F0] flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDrawerTask(task)}
                              className="p-1 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF] rounded cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            {canEditOrReassign && (
                              <button
                                onClick={() => openEditModal(task)}
                                className="p-1 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF] rounded cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {(isPrivileged || task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId) && (
                              <button
                                onClick={() => setTaskToDelete(task)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div>
                            {task.status === "NOT_STARTED" && (
                              <button
                                onClick={() => updateStatus(task.id, "IN_PROGRESS")}
                                className="text-[10px] font-semibold text-[#5A81FA] hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <span>Start →</span>
                              </button>
                            )}
                            {task.status === "IN_PROGRESS" && (
                              <button
                                onClick={() => updateStatus(task.id, "IN_REVIEW")}
                                className="text-[10px] font-semibold text-[#5A81FA] hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <span>Submit →</span>
                              </button>
                            )}
                            {task.status === "IN_REVIEW" && isPrivileged && (
                              <button
                                onClick={() => updateStatus(task.id, "COMPLETED")}
                                className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <span>Approve ✔</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="p-6 text-center text-[#696E82] border-2 border-dashed border-[#E2E6F0] rounded-xl text-xs">
                      Drag tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. TASK DETAIL DRAWER (SLIDE OVER)                   */}
      {/* ==================================================== */}
      {drawerTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E6F0] flex items-start justify-between gap-4 bg-[#F8F9FD]">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                    {drawerTask.project.code}
                  </span>
                  {drawerTask.phase && (
                    <span className="text-[11px] font-medium text-[#696E82] bg-[#F2F4FF] px-2 py-0.5 rounded">
                      {drawerTask.phase.phaseName}
                    </span>
                  )}
                  {getPriorityBadge(drawerTask.priority)}
                  {getStatusBadge(drawerTask.status)}
                </div>
                <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight">{drawerTask.title}</h3>
                <p className="text-xs text-[#696E82]">
                  Project: <strong>{drawerTask.project.name}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerTask(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-lg hover:bg-[#F2F4FF] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#1F1F1F]">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                <div>
                  <span className="text-[#696E82] text-[11px] block">Assignee</span>
                  <div className="font-bold text-[#1F1F1F] mt-0.5">
                    {drawerTask.assignee ? drawerTask.assignee.user.fullName : "Unassigned"}
                  </div>
                  {drawerTask.assignee?.employee?.employeeId && (
                    <span className="text-[10px] text-[#5A81FA] font-mono">
                      ID: {drawerTask.assignee.employee.employeeId}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[#696E82] text-[11px] block">Target Due Date</span>
                  <div className="font-bold text-[#1F1F1F] mt-0.5">
                    {drawerTask.dueDate
                      ? new Date(drawerTask.dueDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "No deadline specified"}
                  </div>
                </div>

                <div>
                  <span className="text-[#696E82] text-[11px] block">Estimated Effort</span>
                  <div className="font-medium text-[#1F1F1F] mt-0.5">
                    {drawerTask.estimatedHours ? `${Number(drawerTask.estimatedHours)} Hours` : "Not estimated"}
                  </div>
                </div>

                <div>
                  <span className="text-[#696E82] text-[11px] block">Created By</span>
                  <div className="font-medium text-[#1F1F1F] mt-0.5">
                    {drawerTask.creator?.user?.fullName || "Studio Member"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Deliverable Instructions & Brief</span>
                </h4>
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82] whitespace-pre-line leading-relaxed">
                  {drawerTask.description || "No detailed brief provided for this deliverable."}
                </div>
              </div>

              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Deliverable Checklist</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#696E82]">
                    {drawerTask.checklistItems.filter((i) => i.isCompleted).length} / {drawerTask.checklistItems.length}
                  </span>
                </div>

                {drawerTask.checklistItems.length === 0 ? (
                  <p className="text-xs text-[#696E82] italic">No checklist items defined.</p>
                ) : (
                  <div className="space-y-1.5">
                    {drawerTask.checklistItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleChecklist(drawerTask.id, item.id, item.isCompleted)}
                        className="w-full flex items-center gap-2 p-2 bg-[#F8F9FD] hover:bg-white border border-[#E2E6F0] rounded-xl text-left transition-colors cursor-pointer"
                      >
                        {item.isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#696E82] shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            item.isCompleted ? "line-through text-[#696E82]" : "text-[#1F1F1F] font-medium"
                          }`}
                        >
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments & Collaboration */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Discussion & Deliverable Notes</span>
                </h4>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add an architectural note, file link, or query..."
                    className="flex-1 p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newCommentText.trim()}
                    className="px-3 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>

                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                  {drawerTask.comments.length === 0 ? (
                    <p className="text-xs text-[#696E82] italic">No comments posted yet.</p>
                  ) : (
                    drawerTask.comments.map((comment) => {
                      const authorInfo = comment.authorId ? memberMap.get(comment.authorId) : null;
                      return (
                        <div key={comment.id} className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                          <div className="flex items-center justify-between text-[10px] text-[#696E82] mb-1">
                            <span className="font-semibold text-[#1F1F1F]">
                              {authorInfo?.name || "Studio Member"}{" "}
                              {authorInfo?.empId && `[${authorInfo.empId}]`}
                            </span>
                            {comment.createdAt && (
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#696E82]">{comment.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Activity History */}
              {drawerTask.activityHistory && drawerTask.activityHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Audit & Activity Trail</span>
                  </h4>
                  <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl bg-[#F8F9FD] overflow-hidden">
                    {drawerTask.activityHistory.map((act) => {
                      const actor = memberMap.get(act.actorId);
                      return (
                        <div key={act.id} className="p-2.5 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between text-[#696E82]">
                            <span className="font-semibold text-[#1F1F1F]">{actor?.name || "User"}</span>
                            <span>{new Date(act.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[#696E82]">
                            {act.action}:{" "}
                            {act.oldValue && <span className="line-through mr-1">{act.oldValue}</span>}
                            {act.newValue && <span className="font-semibold text-[#1F1F1F]">→ {act.newValue}</span>}
                          </div>
                          {act.reason && <p className="text-amber-800 italic">Reason: {act.reason}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(isPrivileged || drawerTask.assigneeId === currentMembershipId) && (
                  <button
                    onClick={() => {
                      openEditModal(drawerTask);
                    }}
                    className="px-3 py-1.5 bg-white border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
                  >
                    Edit Task
                  </button>
                )}
                {(isPrivileged || drawerTask.creatorId === currentMembershipId || drawerTask.creator?.id === currentMembershipId) && (
                  <button
                    onClick={() => setTaskToDelete(drawerTask)}
                    className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Delete task deliverable"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete Task</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {drawerTask.status === "NOT_STARTED" && (
                  <button
                    onClick={() => updateStatus(drawerTask.id, "IN_PROGRESS")}
                    className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Start Work →
                  </button>
                )}

                {drawerTask.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => updateStatus(drawerTask.id, "IN_REVIEW")}
                    className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Submit for Review →
                  </button>
                )}

                {drawerTask.status === "IN_REVIEW" && isPrivileged && (
                  <>
                    <button
                      onClick={() => setChangeRequestModal({ taskId: drawerTask.id, title: drawerTask.title })}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => updateStatus(drawerTask.id, "COMPLETED")}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Approve ✔
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. REASSIGN / DELEGATE TASK MODAL                    */}
      {/* ==================================================== */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2 text-blue-900">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Delegate / Reassign Deliverable</h3>
                  <p className="text-xs text-[#696E82]">Handover this task to another studio team member</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="font-semibold text-blue-950 truncate">{reassignModal.task.title}</div>
              <div className="text-[11px] text-blue-800">
                Currently assigned to:{" "}
                <strong>{reassignModal.task.assignee?.user.fullName || "Unassigned"}</strong>
              </div>
            </div>

            <form onSubmit={handleReassignTask} className="space-y-4 text-xs">
              <div>
                <SearchableSelect
                  id="reassign-member"
                  label="Reassign / Delegate To"
                  required={true}
                  placeholder="Select team member to delegate..."
                  searchPlaceholder="Search team members by name or ID..."
                  options={members.map((m) => {
                    const desig = m.employee?.designation ? `(${m.employee.designation})` : `(${m.role})`;
                    const isSelf = m.id === currentMembershipId ? " — (You)" : "";
                    return {
                      value: m.id,
                      label: `${m.user.fullName}${isSelf}`,
                      subLabel: desig,
                      badge: m.employee?.employeeId || undefined,
                    };
                  })}
                  value={reassignTargetMemberId}
                  onChange={setReassignTargetMemberId}
                  allowOther={false}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Handover Reason / Delegation Note
                </label>
                <textarea
                  rows={3}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Due to on-site survey inspection in Alibaug, handing over 3D pergola rendering to Vikram."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setReassignModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || !reassignTargetMemberId}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reassigning ? (
                    <span>Delegating...</span>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Confirm Delegation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. EDIT TASK MODAL (WITH FIELD-LEVEL RESTRICTIONS)   */}
      {/* ==================================================== */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Edit Deliverable</h3>
                  <p className="text-xs text-[#696E82]">
                    {isPrivileged
                      ? "Update task details, schedule, priority, and phase"
                      : "Update deliverable notes and progress"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isPrivileged && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Employee field restrictions active: Task title, schedule, priority, and phase are managed by Studio
                  Leadership. You can update description notes and checklist items.
                </span>
              </div>
            )}

            <form onSubmit={handleEditTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Task Title {isPrivileged && <span className="text-red-600">*</span>}
                </label>
                <input
                  type="text"
                  required={isPrivileged}
                  disabled={!isPrivileged}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                    isPrivileged
                      ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                      : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Description & Architectural Notes
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Material specs, consultant notes, or revisions..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Priority</label>
                  <select
                    disabled={!isPrivileged}
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                      isPrivileged
                        ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                        : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                    }`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Monitored)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Architectural Phase</label>
                  <select
                    disabled={!isPrivileged}
                    value={editPhaseId}
                    onChange={(e) => setEditPhaseId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                      isPrivileged
                        ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                        : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                    }`}
                  >
                    <option value="">General Project Phase</option>
                    {projects
                      .find((p) => p.id === editModal.task.projectId)
                      ?.phases.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.sortOrder}. {ph.phaseName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    disabled={!isPrivileged}
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                      isPrivileged
                        ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                        : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Estimated Effort (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    disabled={!isPrivileged}
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                      isPrivileged
                        ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                        : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0]">
                {(isPrivileged || editModal.task.creatorId === currentMembershipId || editModal.task.creator?.id === currentMembershipId) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const t = editModal.task;
                      setEditModal(null);
                      setTaskToDelete(t);
                    }}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {editing ? <span>Saving...</span> : <span>Save Changes</span>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. CREATE & ASSIGN DELIVERABLE MODAL                 */}
      {/* ==================================================== */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Assign Architectural Deliverable</h3>
                  <p className="text-xs text-[#696E82]">Assign deliverable to a partner, PM, or employee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {/* 1. ARCHITECTURAL TYPOLOGY (AT VERY FIRST!) */}
              <div className="bg-[#FAFBFD] p-3 rounded-xl border border-[#E2E6F0] space-y-1">
                <SearchableSelect
                  id="task-typology"
                  label="Architectural Typology"
                  required={false}
                  placeholder="Select typology (e.g. Commercial, Hospital, Residential)..."
                  searchPlaceholder="Search typology (e.g. Commercial, Hospital, Villa)..."
                  options={[
                    { value: "", label: "All Typologies (Show all projects)" },
                    ...STUDIO_TYPOLOGIES.map((typ) => ({
                      value: typ,
                      label: typ,
                    })),
                  ]}
                  value={taskTypology}
                  onChange={(val) => {
                    setTaskTypology(val);
                    const eff = val === "OTHER" ? otherTypology.trim() : val.trim();
                    if (eff) {
                      const match = projects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === selectedProjectId)) {
                          setSelectedProjectId(match[0].id);
                          setSelectedPhaseId("");
                        }
                      } else {
                        setSelectedProjectId("");
                        setSelectedPhaseId("");
                      }
                    }
                  }}
                  allowOther={true}
                  otherOptionLabel="+ Other Architectural Typology..."
                  otherValue={otherTypology}
                  onOtherValueChange={(val) => {
                    setOtherTypology(val);
                    const eff = val.trim();
                    if (eff) {
                      const match = projects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === selectedProjectId)) {
                          setSelectedProjectId(match[0].id);
                          setSelectedPhaseId("");
                        }
                      }
                    }
                  }}
                  otherInputPlaceholder="Specify custom typology (e.g. Airport, Cultural Pavilion, Data Center)..."
                  helperText={
                    effectiveTypology
                      ? `Showing only ${effectiveTypology} projects below (${filteredProjectsForAssign.length} found).`
                      : "Classifies deliverable requirements and filters projects by architectural typology."
                  }
                />
              </div>

              {/* 2. PROJECT & PHASE SELECTOR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="select-project"
                  label="Select Project"
                  required={true}
                  placeholder={
                    filteredProjectsForAssign.length > 0
                      ? "Select project..."
                      : effectiveTypology
                      ? `No ${effectiveTypology} projects found`
                      : "Select project..."
                  }
                  searchPlaceholder="Search projects by code, title, or typology..."
                  options={filteredProjectsForAssign.map((p) => ({
                    value: p.id,
                    label: `${p.code} — ${p.name}`,
                    subLabel: p.projectType || undefined,
                    badge: p.code,
                  }))}
                  value={selectedProjectId}
                  onChange={(val) => {
                    setSelectedProjectId(val);
                    setSelectedPhaseId("");
                    if (val && val !== "OTHER") {
                      const found = projects.find((p) => p.id === val);
                      if (found?.projectType && !taskTypology) {
                        setTaskTypology(found.projectType);
                      }
                    }
                  }}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Project Reference..."
                  otherValue={otherProjectName}
                  onOtherValueChange={setOtherProjectName}
                  otherInputPlaceholder="Specify custom project code or client reference..."
                />

                <SearchableSelect
                  id="select-phase"
                  label="Architectural Phase"
                  required={false}
                  placeholder="Select phase..."
                  searchPlaceholder="Search phases..."
                  options={[
                    { value: "", label: "General Project Deliverable", subLabel: "Not phase-specific" },
                    ...availablePhases.map((ph) => ({
                      value: ph.id,
                      label: `${ph.sortOrder}. ${ph.phaseName}`,
                    })),
                  ]}
                  value={selectedPhaseId}
                  onChange={setSelectedPhaseId}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Phase..."
                  otherValue={otherPhaseName}
                  onOtherValueChange={setOtherPhaseName}
                  otherInputPlaceholder="Specify custom phase (e.g. Façade Mockup, Commissioning)..."
                />
              </div>

              {/* 3. TASK TITLE */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Deliverable Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Prepare 1:20 Pergola Joinery Detail & Column Junctions"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* 4. DESCRIPTION */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">Architectural Brief & Instructions</label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Specify material specifications, MEP coordination notes, or CAD layering rules..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* 5. ASSIGNEE & PRIORITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="task-assignee"
                  label="Assignee"
                  required={true}
                  placeholder="Select team member..."
                  searchPlaceholder="Search team by name, ID or role..."
                  options={members.map((m) => {
                    const designation = m.employee?.designation ? `${m.employee.designation} (${m.role})` : m.role;
                    return {
                      value: m.id,
                      label: m.user.fullName,
                      subLabel: designation,
                      badge: m.employee?.employeeId || undefined,
                    };
                  })}
                  value={taskAssigneeId}
                  onChange={setTaskAssigneeId}
                  allowOther={true}
                  otherOptionLabel="+ Other / External Specialist or Freelancer..."
                  otherValue={otherAssigneeName}
                  onOtherValueChange={setOtherAssigneeName}
                  otherInputPlaceholder="Specify external specialist or consultant name..."
                />

                <SearchableSelect
                  id="task-priority"
                  label="Priority"
                  required={false}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority level..."
                  options={[
                    { value: "LOW", label: "Low Priority", subLabel: "Routine drafting / non-blocking" },
                    { value: "MEDIUM", label: "Medium", subLabel: "Standard milestone deliverable" },
                    { value: "HIGH", label: "High Priority", subLabel: "Client deadline or review gate" },
                    { value: "URGENT", label: "Urgent (Monitored)", subLabel: "Critical path / Immediate escalation" },
                  ]}
                  value={taskPriority}
                  onChange={setTaskPriority}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Priority Level..."
                  otherValue={otherPriorityName}
                  onOtherValueChange={setOtherPriorityName}
                  otherInputPlaceholder="Specify custom priority descriptor..."
                />
              </div>

              {/* Due Date & Estimated Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Estimated Effort (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* Dynamic Checklist Items */}
              <div className="pt-2 border-t border-[#E2E6F0] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1F1F1F]">Checklist Items / Deliverable Sub-Tasks</label>
                  <button
                    type="button"
                    onClick={handleAddChecklistField}
                    className="text-[11px] font-semibold text-[#5A81FA] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateChecklistItem(idx, e.target.value)}
                      placeholder={`Checklist item ${idx + 1} (e.g. Check waterproofing drop with structural drawings)`}
                      className="flex-1 p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F]"
                    />
                    {checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-[#696E82] hover:text-red-600 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={creatingTask}
              />

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingTask ? (
                    <span>Assigning...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Assign Deliverable</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. CHANGE REQUEST MODAL                             */}
      {/* ==================================================== */}
      {changeRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-[#1F1F1F]">Request Architectural Corrections</h3>
            </div>
            <p className="text-xs text-[#696E82]">
              Reverting <strong className="text-[#1F1F1F]">{changeRequestModal.title}</strong> back to{" "}
              <strong>In Progress</strong>. An architectural correction note is mandatory.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] mb-1">
                Correction Instructions / Notes <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
                placeholder="e.g. Please recalculate structural column offsets and ensure courtyard rainwater drainage aligns with civil drawings."
                className="w-full text-xs p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChangeRequestModal(null)}
                className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!changeComment.trim()}
                onClick={() =>
                  updateStatus(changeRequestModal.taskId, "IN_PROGRESS", { comment: changeComment.trim() })
                }
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                Send Changes to Assignee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. DIRECT OVERRIDE COMPLETION MODAL                 */}
      {/* ==================================================== */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#1F1F1F]">Direct Partner/Admin Completion Override</h3>
            </div>
            <p className="text-xs text-[#696E82]">
              Bypassing normal review workflow for <strong className="text-[#1F1F1F]">{overrideModal.title}</strong>. An
              audited reason is required.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] mb-1">
                Audit Reason <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Partner reviewed directly in on-site client meeting with Arun Singhal"
                className="w-full text-xs p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#696E82] text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!overrideReason.trim()}
                onClick={() =>
                  updateStatus(overrideModal.taskId, "COMPLETED", { auditReason: overrideReason.trim() })
                }
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              >
                Record Audit & Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 12. DELETE TASK CONFIRMATION MODAL                   */}
      {/* ==================================================== */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Delete Task Deliverable</h3>
                <p className="text-xs text-[#696E82]">Permanently remove this task from studio records</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl text-xs space-y-2 text-red-900">
              <p>
                Are you sure you want to delete <strong className="text-red-950 font-bold">&quot;{taskToDelete.title}&quot;</strong>?
              </p>
              <div className="flex items-center gap-2 text-[11px] text-red-800">
                <span className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-red-200">
                  {taskToDelete.project.code}
                </span>
                <span>Assignee: {taskToDelete.assignee?.user.fullName || "Unassigned"}</span>
              </div>
              <p className="text-[11px] text-red-700 pt-1 border-t border-red-200/60">
                All associated checklist sub-tasks, comments, and audit records will be removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingTask}
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTask}
                onClick={handleDeleteTask}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingTask ? <span>Deleting...</span> : <span>Confirm Delete</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Form Fields Manager Modal */}
      <CustomFieldsManagerModal
        isOpen={customFieldsModalOpen}
        onClose={() => setCustomFieldsModalOpen(false)}
        workspaceSlug={workspaceSlug}
        initialEntity="TASK"
        onFieldsUpdated={refreshCustomFields}
      />
    </div>
  );
}
