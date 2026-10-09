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
  LayoutGrid,
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
import { SearchableDropdown, SearchableSelect } from "@/components/ui/SearchableDropdown";
import { TaskGrid } from "@/components/tasks/TaskGrid";
import { sanitizeTaskDescription } from "@/components/tasks/task-utils";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import {
  getAllTypologies,
  ProjectProfileCircle,
  TypologyBadge,
  TypologyDot,
  isTypologyMatch,
} from "@/lib/typology";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status:
    | "NOT_STARTED"
    | "TODO"
    | "STARTED"
    | "ONGOING"
    | "IN_PROGRESS"
    | "CHECKING"
    | "IN_REVIEW"
    | "COMPLETED"
    | "BLOCKED"
    | "CANCELLED";
  version?: number;
  acceptanceCriteria?: string | null;
  reviewerId?: string | null;
  reviewer?: {
    id: string;
    user: { fullName: string };
  } | null;
  assignments?: Array<{
    id: string;
    membershipId: string;
    acknowledgedAt: string | null;
    acknowledgedVersion: number | null;
    isCompleted: boolean;
    completedAt: string | null;
    memberName: string;
  }>;
  submissions?: Array<{
    id: string;
    version: number;
    summary: string;
    checklistTaskIds: string[];
    criteriaSnapshot: any;
    evidenceFiles: any;
    evidenceLinks: any;
    status: string;
    reviewFeedback?: string | null;
    decidedAt?: string | null;
    createdAt: string;
    submitterName: string;
    reviewerName?: string | null;
  }>;
  extensionRequests?: Array<{
    id: string;
    checklistItemId: string;
    itemTitle: string;
    requesterName: string;
    currentDueDate: string | null;
    proposedDueDate: string | null;
    reason: string;
    status: string;
    decisionReason?: string | null;
    decidedAt?: string | null;
    createdAt: string;
  }>;
  clarifications?: Array<{
    id: string;
    checklistItemId?: string | null;
    question: string;
    attachments?: any;
    authorName: string;
    createdAt: string;
    answers?: Array<{
      id: string;
      authorName: string;
      message: string;
      createdAt: string;
    }>;
  }>;
  createdAt?: string | null;
  dueDate: string | null;
  estimatedHours: any;
  customFields?: Record<string, any>;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
    projectType?: string | null;
  };
  phaseId?: string | null;
  phase: {
    id: string;
    phaseName: string;
  } | null;
  assigneeId?: string | null;
  assignedMemberIds?: string[] | null;
  assignee: {
    id?: string;
    user: { fullName: string; email: string };
    employee: { employeeId: string; designation: string | null; department?: string | null } | null;
  } | null;
  creatorId?: string | null;
  creator?: {
    id: string;
    user: { fullName: string };
  } | null;
  checklistItems: Array<{
    id: string;
    title: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    isCompleted: boolean;
    sortOrder?: number;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    isBlocked?: boolean;
    blockerReason?: string | null;
    blockerDetails?: any;
    prerequisiteItemId?: string | null;
    prerequisiteItem?: {
      id: string;
      title: string;
      status: string;
      isCompleted: boolean;
    } | null;
    assignedMemberId?: string | null;
    assignedMember?: any;
  }>;
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

  // Reactively sync initialTasks prop with local tasks state
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

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
  const [view, setView] = useState<"grid" | "list" | "kanban">(
    initialView === "kanban" ? "kanban" : initialView === "list" ? "list" : "grid"
  );
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [togglingChecklistId, setTogglingChecklistId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypologyFilter, setSelectedTypologyFilter] = useState<string>("ALL");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("ALL");
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

  // End-to-End Workflow States
  const [taskAcceptanceCriteria, setTaskAcceptanceCriteria] = useState("");
  const [taskReviewerId, setTaskReviewerId] = useState("");

  const [blockerModal, setBlockerModal] = useState<{
    taskId: string;
    checklistItemId?: string;
    title: string;
    isResolving?: boolean;
    existingReason?: string;
  } | null>(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState("");
  const [blockerCategory, setBlockerCategory] = useState<string>("INTERNAL");
  const [blockerSeverity, setBlockerSeverity] = useState<string>("MEDIUM");
  const [submittingBlocker, setSubmittingBlocker] = useState(false);

  const [extensionModal, setExtensionModal] = useState<{
    taskId: string;
    checklistItemId?: string;
    title: string;
    currentDueDate?: string | null;
  } | null>(null);
  const [extensionProposedDate, setExtensionProposedDate] = useState("");
  const [extensionReasonInput, setExtensionReasonInput] = useState("");
  const [submittingExtension, setSubmittingExtension] = useState(false);

  const [submissionModal, setSubmissionModal] = useState<{
    task: TaskItem;
  } | null>(null);
  const [submissionSummary, setSubmissionSummary] = useState("");
  const [submissionSelectedItems, setSubmissionSelectedItems] = useState<string[]>([]);
  const [submissionEvidenceLinks, setSubmissionEvidenceLinks] = useState("");
  const [submittingSnapshot, setSubmittingSnapshot] = useState(false);

  const [reviewDecisionModal, setReviewDecisionModal] = useState<{
    submissionId: string;
    taskId: string;
    action: "APPROVE" | "REQUEST_CHANGES";
  } | null>(null);
  const [reviewFeedbackInput, setReviewFeedbackInput] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [reopenModal, setReopenModal] = useState<{
    taskId: string;
    checklistItemId: string;
    title: string;
  } | null>(null);
  const [reopenReasonInput, setReopenReasonInput] = useState("");
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationUrgency, setClarificationUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [clarificationItemId, setClarificationItemId] = useState("");
  const [submittingClarification, setSubmittingClarification] = useState(false);
  const [replyModal, setReplyModal] = useState<{
    clarificationId: string;
    question: string;
    taskId: string;
  } | null>(null);
  const [replyMessageInput, setReplyMessageInput] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Reassign / Delegate Modal state
  const [reassignModal, setReassignModal] = useState<{ task: TaskItem } | null>(null);
  const [reassignTargetMemberId, setReassignTargetMemberId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");
  const [reassigning, setReassigning] = useState<boolean>(false);

  // Edit Task Modal state (Full-fidelity matching assign modal)
  const [editModal, setEditModal] = useState<{ task: TaskItem } | null>(null);
  const [editTypology, setEditTypology] = useState<string>("");
  const [editOtherTypology, setEditOtherTypology] = useState<string>("");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editOtherProjectName, setEditOtherProjectName] = useState<string>("");
  const [editPhaseId, setEditPhaseId] = useState<string>("");
  const [editOtherPhaseName, setEditOtherPhaseName] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editOtherAssigneeName, setEditOtherAssigneeName] = useState<string>("");
  const [editPriority, setEditPriority] = useState<string>("MEDIUM");
  const [editOtherPriorityName, setEditOtherPriorityName] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState("");
  const [editChecklistItems, setEditChecklistItems] = useState<string[]>([""]);
  const [editCustomFieldValues, setEditCustomFieldValues] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);

  // Delete Task state
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<boolean>(false);

  // Create Task Modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>(
    userRole === "OWNER" || userRole === "ADMIN" ? [] : [currentMembershipId]
  );
  const [taskPriority, setTaskPriority] = useState<string>("MEDIUM");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  
  // Independent Employee Checklist Sections State
  const [employeeChecklists, setEmployeeChecklists] = useState<Record<string, Array<{
    id: string;
    title: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: string;
  }>>>({});
  const [expandedEmployeeSections, setExpandedEmployeeSections] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState<{ memberId: string; memberName: string } | null>(null);

  // Initialize/sync employee checklist state when taskAssigneeIds change
  const handleAssigneesChange = (newAssigneeIds: string[]) => {
    // Check if any existing member was removed and has checklist content
    const removedMemberId = taskAssigneeIds.find((id) => !newAssigneeIds.includes(id));
    if (removedMemberId) {
      const existingItems = employeeChecklists[removedMemberId] || [];
      const hasContent = existingItems.some((item) => item.title.trim().length > 0);
      if (hasContent) {
        const memberObj = members.find((m) => m.id === removedMemberId);
        setPendingMemberRemoval({
          memberId: removedMemberId,
          memberName: memberObj?.user.fullName || "this team member",
        });
        return; // Pause removal until confirmed
      }
    }

    // Update assignees
    setTaskAssigneeIds(newAssigneeIds);
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.assignees;
      return copy;
    });

    // Ensure new members have at least one checklist item
    setEmployeeChecklists((prev) => {
      const updated = { ...prev };
      newAssigneeIds.forEach((id) => {
        if (!updated[id] || updated[id].length === 0) {
          updated[id] = [
            {
              id: `chk-${id}-${Date.now()}`,
              title: "",
              priority: (taskPriority as any) || "MEDIUM",
              dueDate: "",
            },
          ];
        }
      });
      return updated;
    });

    // Expand new sections
    setExpandedEmployeeSections((prev) => {
      const updated = { ...prev };
      newAssigneeIds.forEach((id) => {
        if (updated[id] === undefined) {
          updated[id] = true;
        }
      });
      return updated;
    });
  };

  const confirmDiscardMember = () => {
    if (!pendingMemberRemoval) return;
    const { memberId } = pendingMemberRemoval;
    setTaskAssigneeIds((prev) => prev.filter((id) => id !== memberId));
    setEmployeeChecklists((prev) => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });
    setPendingMemberRemoval(null);
  };

  const cancelDiscardMember = () => {
    setPendingMemberRemoval(null);
  };

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

  // Multi-Assignee Resolution Helper
  const getTaskAssignees = (task: TaskItem): MemberOption[] => {
    const list: MemberOption[] = [];
    const seenIds = new Set<string>();

    if (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0) {
      members
        .filter((m) => task.assignedMemberIds!.includes(m.id))
        .forEach((m) => {
          list.push(m);
          seenIds.add(m.id);
        });
    }

    if (task.assigneeId && !seenIds.has(task.assigneeId)) {
      const primary = members.find((m) => m.id === task.assigneeId);
      if (primary) {
        list.push(primary);
        seenIds.add(primary.id);
      }
    }

    if (task.assignee && !seenIds.has(task.assignee.id || task.assigneeId || "")) {
      const id = task.assignee.id || task.assigneeId || "";
      if (id) seenIds.add(id);
      list.push({
        id,
        role: "",
        user: task.assignee.user,
        employee: task.assignee.employee
          ? {
              employeeId: task.assignee.employee.employeeId,
              designation: task.assignee.employee.designation,
              department: task.assignee.employee.department ?? null,
            }
          : null,
      });
    }

    return list;
  };

  // Filter tasks based on search, project, priority, employee, due-date category, and status category
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
        const assignees = getTaskAssignees(task);
        const matchAssignee = assignees.some(
          (a) =>
            a.user.fullName.toLowerCase().includes(q) ||
            (a.employee?.employeeId && a.employee.employeeId.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchDesc && !matchProj && !matchAssignee) {
          return false;
        }
      }

      // 2. Project Filter
      if (selectedProjectFilter !== "ALL" && task.projectId !== selectedProjectFilter) {
        return false;
      }

      // 2.5 Architectural Typology Filter
      if (selectedTypologyFilter !== "ALL") {
        if (!isTypologyMatch(task.project.projectType, selectedTypologyFilter)) {
          return false;
        }
      }

      // 2.7 Employee / Assignee Filter
      if (selectedAssigneeFilter !== "ALL") {
        const assignees = getTaskAssignees(task);
        if (selectedAssigneeFilter === "UNASSIGNED") {
          if (assignees.length > 0 || task.assigneeId || (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0)) return false;
        } else {
          const inAssignedList = Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(selectedAssigneeFilter);
          const hasMember = inAssignedList || assignees.some(
            (a) => a.id === selectedAssigneeFilter || (task.assigneeId && task.assigneeId === selectedAssigneeFilter)
          );
          if (!hasMember) return false;
        }
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
        if (selectedStatusCategory === "NOT_STARTED" || selectedStatusCategory === "TODO") {
          if (task.status !== "NOT_STARTED" && task.status !== "TODO") return false;
        } else if (selectedStatusCategory === "STARTED") {
          if (task.status !== "STARTED") return false;
        } else if (selectedStatusCategory === "ONGOING") {
          if (task.status !== "ONGOING" && task.status !== "IN_PROGRESS") return false;
        } else if (selectedStatusCategory === "IN_PROGRESS") {
          if (task.status !== "IN_PROGRESS" && task.status !== "ONGOING" && task.status !== "STARTED") return false;
        } else if (selectedStatusCategory === "CHECKING" || selectedStatusCategory === "WAITING_REVIEW") {
          if (task.status !== "CHECKING" && task.status !== "IN_REVIEW") return false;
        } else if (selectedStatusCategory === "COMPLETED") {
          if (task.status !== "COMPLETED") return false;
        } else if (task.status !== selectedStatusCategory) {
          return false;
        }
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
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "CREATED_ASC":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
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
    selectedTypologyFilter,
    selectedProjectFilter,
    selectedAssigneeFilter,
    selectedPriorityFilter,
    selectedDueDateCategory,
    selectedStatusCategory,
    taskSortBy,
    members,
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
    setSelectedTypologyFilter("ALL");
    setSelectedProjectFilter("ALL");
    setSelectedAssigneeFilter("ALL");
    setSelectedPriorityFilter("ALL");
    setSelectedDueDateCategory("ALL");
    setSelectedStatusCategory("ALL");
    setTaskSortBy("DUE_DATE_ASC");
  };

  const isTaskAssignedToMe = (task: TaskItem): boolean => {
    if (task.assigneeId === currentMembershipId) return true;
    if (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(currentMembershipId)) return true;
    if (Array.isArray((task as any).assignments) && (task as any).assignments.some((a: any) => a.membershipId === currentMembershipId)) return true;
    if (Array.isArray(task.checklistItems) && task.checklistItems.some((ci) => ci.assignedMemberId === currentMembershipId)) return true;
    return false;
  };

  const canEditTask = (task: TaskItem): boolean => {
    const isMyTask = isTaskAssignedToMe(task);
    const isCreator = task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId;
    return isPrivileged || isMyTask || isCreator;
  };

  const canDeleteTask = (task: TaskItem): boolean => {
    const isCreator = task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId;
    return isPrivileged || isCreator;
  };

  // Dynamic Typologies extracted from projects + studio standards
  const dynamicTypologies = useMemo(() => {
    return getAllTypologies(projects);
  }, [projects]);

  // Find phases for currently selected project in task creation modal
  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const availablePhases = currentProject?.phases || [];

  // Edit Modal Typology, Project, and Phase helpers
  const effectiveEditTypology = useMemo(() => {
    return editTypology === "OTHER" ? editOtherTypology.trim() : editTypology.trim();
  }, [editTypology, editOtherTypology]);

  const filteredProjectsForEdit = useMemo(() => {
    if (!effectiveEditTypology) return projects;
    return projects.filter((p) => isTypologyMatch(p.projectType, effectiveEditTypology));
  }, [projects, effectiveEditTypology]);

  const currentEditProject = projects.find((p) => p.id === editProjectId);
  const availableEditPhases = currentEditProject?.phases || [];

  const handleAddEditChecklistField = () => {
    setEditChecklistItems([...editChecklistItems, ""]);
  };

  const handleUpdateEditChecklistItem = (index: number, val: string) => {
    const updated = [...editChecklistItems];
    updated[index] = val;
    setEditChecklistItems(updated);
  };

  const handleRemoveEditChecklistItem = (index: number) => {
    setEditChecklistItems(editChecklistItems.filter((_, i) => i !== index));
  };

  const handleEditCustomFieldChange = (key: string, value: any) => {
    setEditCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddEmployeeTask = (memberId: string) => {
    setEmployeeChecklists((prev) => ({
      ...prev,
      [memberId]: [
        ...(prev[memberId] || []),
        {
          id: `chk-${memberId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: "",
          priority: (taskPriority as any) || "MEDIUM",
          dueDate: "",
        },
      ],
    }));
  };

  const handleUpdateEmployeeTask = (
    memberId: string,
    rowId: string,
    updates: Partial<{ title: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate: string }>
  ) => {
    setEmployeeChecklists((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map((row) =>
        row.id === rowId ? { ...row, ...updates } : row
      ),
    }));
    // Clear specific field errors
    setFormErrors((prev) => {
      const copy = { ...prev };
      if (updates.title !== undefined) delete copy[`chk-text-${rowId}`];
      if (updates.dueDate !== undefined) delete copy[`chk-date-${rowId}`];
      return copy;
    });
  };

  const handleRemoveEmployeeTask = (memberId: string, rowId: string) => {
    setEmployeeChecklists((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((row) => row.id !== rowId),
    }));
  };

  // Create Deliverable - Validated against Studio Business & Security Rules
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // 1. Project Validation
    if (!selectedProjectId) {
      errors.project = "Please select an active architectural project.";
    }

    const targetProj = projects.find((p) => p.id === selectedProjectId);
    if (targetProj && (!targetProj.projectType || !targetProj.projectType.trim())) {
      errors.project = `Project "${targetProj.name}" has no architectural topology configured. Set a typology in Projects first.`;
    }

    // 2. Architectural Brief & Instructions
    if (!taskDescription.trim()) {
      errors.description = "Architectural Brief & Instructions are required.";
    } else if (taskDescription.trim().length < 5) {
      errors.description = "Brief must be at least 5 characters long.";
    }

    // 3. Assignees Validation
    if (taskAssigneeIds.length === 0) {
      errors.assignees = "At least one eligible employee must be assigned.";
    }

    // 4. Employee Checklist Validation (Every employee must have >= 1 task with text & due date)
    let firstErrorElementId: string | null = null;
    taskAssigneeIds.forEach((empId) => {
      const rows = employeeChecklists[empId] || [];
      if (rows.length === 0) {
        errors[`emp-${empId}`] = "At least one checklist task is required for this employee.";
        setExpandedEmployeeSections((prev) => ({ ...prev, [empId]: true }));
        if (!firstErrorElementId) firstErrorElementId = `emp-section-${empId}`;
      } else {
        rows.forEach((row) => {
          if (!row.title.trim()) {
            errors[`chk-text-${row.id}`] = "Task description is required.";
            setExpandedEmployeeSections((prev) => ({ ...prev, [empId]: true }));
            if (!firstErrorElementId) firstErrorElementId = `chk-text-${row.id}`;
          }
          if (!row.dueDate) {
            errors[`chk-date-${row.id}`] = "Due date is required.";
            setExpandedEmployeeSections((prev) => ({ ...prev, [empId]: true }));
            if (!firstErrorElementId) firstErrorElementId = `chk-date-${row.id}`;
          }
        });
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMessage("Please complete all required fields and checklist tasks.");
      if (firstErrorElementId) {
        const el = document.getElementById(firstErrorElementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      return;
    }

    setFormErrors({});
    setErrorMessage(null);
    setCreatingTask(true);

    // Derive parent due date from latest checklist item deadline
    let latestChecklistDate: Date | null = null;
    const flatChecklistItems = taskAssigneeIds.flatMap((empId) =>
      (employeeChecklists[empId] || []).map((row, idx) => {
        if (row.dueDate) {
          const d = new Date(row.dueDate);
          if (!isNaN(d.getTime())) {
            if (!latestChecklistDate || d > latestChecklistDate) {
              latestChecklistDate = d;
            }
          }
        }
        return {
          title: row.title.trim(),
          assignedMemberId: empId,
          priority: row.priority || taskPriority || "MEDIUM",
          dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
          sortOrder: idx + 1,
        };
      })
    );

    const derivedDueDateIso = latestChecklistDate ? (latestChecklistDate as Date).toISOString() : null;
    const targetPhase = projects.flatMap((p) => p.phases).find((ph) => ph.id === selectedPhaseId);
    const primaryAssigneeId = taskAssigneeIds[0];
    const targetAssignee = members.find((m) => m.id === primaryAssigneeId);

    const generatedTitle = targetProj
      ? `${targetProj.code} — Deliverable`
      : "Architectural Deliverable";

    const assignedNames = members
      .filter((m) => taskAssigneeIds.includes(m.id))
      .map((m) => m.user.fullName)
      .join(", ");

    try {
      const res = await fetch(`/api/tasks/create?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          phaseId: selectedPhaseId || undefined,
          description: taskDescription.trim(),
          priority: taskPriority,
          assigneeIds: taskAssigneeIds,
          reviewerId: taskReviewerId || undefined,
          acceptanceCriteria: taskAcceptanceCriteria.trim() || undefined,
          checklistItems: flatChecklistItems,
          estimatedHours: taskEstimatedHours ? Number(taskEstimatedHours) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.task?.id) {
        setErrorMessage(data.error || "Failed to create deliverable");
        setCreatingTask(false);
        return;
      }

      // Add real task returned by server
      const createdTask: TaskItem = {
        ...data.task,
        project: targetProj
          ? { id: targetProj.id, code: targetProj.code, name: targetProj.name, projectType: targetProj.projectType ?? null }
          : { id: selectedProjectId, code: "PROJ", name: "Project", projectType: null },
        phase: targetPhase ? { id: targetPhase.id, phaseName: targetPhase.phaseName } : null,
        assignee: targetAssignee
          ? { id: targetAssignee.id, user: targetAssignee.user, employee: targetAssignee.employee }
          : null,
        creator: {
          id: currentMembershipId,
          user: { fullName: contextUserFullName || "You" },
        },
        checklistItems: flatChecklistItems.map((item, idx) => ({
          id: `chk-created-${idx}`,
          title: item.title,
          isCompleted: false,
        })),
        comments: [],
        activityHistory: [],
      };

      setTasks((prev) => [createdTask, ...prev]);
      setSuccessMessage(`Deliverable "${createdTask.title}" assigned successfully to ${assignedNames}!`);
      setIsCreateTaskModalOpen(false);

      // Reset form
      setTaskDescription("");
      setTaskAcceptanceCriteria("");
      setTaskReviewerId("");
      setTaskEstimatedHours("");
      setTaskAssigneeIds(userRole === "OWNER" || userRole === "ADMIN" ? [] : [currentMembershipId]);
      setEmployeeChecklists({});
      setFormErrors({});
    } catch (err: any) {
      setErrorMessage("Network error while creating deliverable. Please try again.");
    } finally {
      setCreatingTask(false);
    }
  };

  // Workflow Status Transition - Instant Optimistic UI Update (< 5ms response)
  const updateStatus = async (
    taskId: string,
    newStatus: string,
    options: { comment?: string; auditReason?: string } = {}
  ) => {
    const previousTask = tasks.find((t) => t.id === taskId);
    const previousStatus = previousTask?.status;
    if (!previousStatus || previousStatus === newStatus) return;

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
    );
    if (drawerTask && drawerTask.id === taskId) {
      setDrawerTask((prev) => (prev ? { ...prev, status: newStatus as any } : null));
    }
    setChangeRequestModal(null);
    setOverrideModal(null);
    setChangeComment("");
    setOverrideReason("");
    setErrorMessage(null);

    // 2. BACKGROUND SERVER SYNC
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

      if (!res.ok) {
        const data = await res.json();
        // Rollback
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
        );
        if (drawerTask && drawerTask.id === taskId) {
          setDrawerTask((prev) => (prev ? { ...prev, status: previousStatus } : null));
        }
        setErrorMessage(data.error || "Failed to update task status");
      }
    } catch {
      // Rollback on network error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
      );
      if (drawerTask && drawerTask.id === taskId) {
        setDrawerTask((prev) => (prev ? { ...prev, status: previousStatus } : null));
      }
      setErrorMessage("Network error updating status. Reverted.");
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

    updateStatus(task.id, targetStatus);
  };

  // Open Reassign Modal
  const openReassignModal = (task: TaskItem) => {
    setReassignModal({ task });
    const defaultRecipient = members.find((m) => m.id !== task.assigneeId && m.id !== currentMembershipId);
    setReassignTargetMemberId(defaultRecipient ? defaultRecipient.id : members[0]?.id || "");
    setReassignReason("");
  };

  // Submit Reassign Task - Instant Optimistic UI Update (< 5ms response)
  const handleReassignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal || !reassignTargetMemberId) return;

    const taskId = reassignModal.task.id;
    const previousAssigneeId = reassignModal.task.assigneeId;
    const previousAssignee = reassignModal.task.assignee;
    const previousAssignedMemberIds = reassignModal.task.assignedMemberIds;
    const targetMember = members.find((m) => m.id === reassignTargetMemberId);
    const targetName = targetMember?.user.fullName || "colleague";
    const modalTask = reassignModal.task;

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assigneeId: reassignTargetMemberId,
              assignedMemberIds: [reassignTargetMemberId],
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

    if (drawerTask && drawerTask.id === taskId) {
      setDrawerTask((prev) =>
        prev
          ? {
              ...prev,
              assigneeId: reassignTargetMemberId,
              assignedMemberIds: [reassignTargetMemberId],
              assignee: targetMember
                ? {
                    id: targetMember.id,
                    user: targetMember.user,
                    employee: targetMember.employee,
                  }
                : prev.assignee,
            }
          : null
      );
    }

    setSuccessMessage(`Deliverable "${modalTask.title}" successfully delegated to ${targetName}!`);
    setReassignModal(null);
    const reasonToSend = reassignReason.trim();
    setReassignReason("");

    // 2. BACKGROUND SERVER SYNC
    try {
      const res = await fetch(`/api/tasks/reassign?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          newAssigneeId: reassignTargetMemberId,
          reason: reasonToSend || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  assigneeId: previousAssigneeId,
                  assignee: previousAssignee,
                  assignedMemberIds: previousAssignedMemberIds,
                }
              : t
          )
        );
        setErrorMessage(data.error || "Failed to delegate task");
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                assigneeId: previousAssigneeId,
                assignee: previousAssignee,
                assignedMemberIds: previousAssignedMemberIds,
              }
            : t
        )
      );
      setErrorMessage("Network error delegating task. Reverted.");
    }
  };

  // Open Edit Modal (full-fidelity with all fields)
  const openEditModal = (task: TaskItem) => {
    setEditModal({ task });
    const existingCustom = customValuesByTask[task.id] || (task as any).customFields || {};

    // 1. Typology
    const typ = existingCustom.typology || task.project?.projectType || "";
    setEditTypology(typ);
    setEditOtherTypology("");

    // 2. Project & Phase
    setEditProjectId(task.projectId || task.project?.id || "");
    setEditOtherProjectName(existingCustom.customProject || "");
    setEditPhaseId(task.phaseId || task.phase?.id || "");
    setEditOtherPhaseName(existingCustom.customPhase || "");

    // 3. Title & Description
    setEditTitle(task.title);
    setEditDescription(sanitizeTaskDescription(task.description));

    // 4. Assignees (Multi-select)
    const initialAssigneeIds = Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0
      ? task.assignedMemberIds
      : (task.assigneeId ? [task.assigneeId] : []);
    setEditAssigneeIds(initialAssigneeIds);
    setEditOtherAssigneeName(existingCustom.externalAssignee || "");

    // 5. Priority
    setEditPriority(task.priority);
    setEditOtherPriorityName(existingCustom.customPriority || "");

    // 6. Schedule & Effort
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setEditEstimatedHours(task.estimatedHours ? String(task.estimatedHours) : "");

    // 7. Checklist
    if (task.checklistItems && task.checklistItems.length > 0) {
      setEditChecklistItems(task.checklistItems.map((ci) => ci.title));
    } else {
      setEditChecklistItems([""]);
    }

    // 8. Custom fields
    setEditCustomFieldValues(existingCustom);
  };

  // Submit Edit Task - Instant Optimistic UI Update (< 5ms response)
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal || !editTitle.trim()) return;

    const taskId = editModal.task.id;
    const previousTask = tasks.find((t) => t.id === taskId);
    const isCreator = editModal.task.creatorId === currentMembershipId || editModal.task.creator?.id === currentMembershipId;
    const canEditFull = isPrivileged || isCreator;

    const targetProj = projects.find((p) => p.id === editProjectId);
    const targetPhase = projects.flatMap((p) => p.phases).find((ph) => ph.id === editPhaseId);
    const targetAssignee = members.find((m) => m.id === editAssigneeIds[0]);

    const payloadCustomValues: Record<string, any> = {
      ...editCustomFieldValues,
      ...(editTypology ? { typology: editTypology === "OTHER" ? editOtherTypology.trim() : editTypology.trim() } : {}),
      ...(editOtherProjectName ? { customProject: editOtherProjectName.trim() } : {}),
      ...(editOtherPhaseName ? { customPhase: editOtherPhaseName.trim() } : {}),
      ...(editOtherAssigneeName ? { externalAssignee: editOtherAssigneeName.trim() } : {}),
      ...(editPriority === "OTHER" && editOtherPriorityName ? { customPriority: editOtherPriorityName.trim() } : {}),
    };

    const updatedChecklist = editChecklistItems
      .filter((item) => item.trim().length > 0)
      .map((item, idx) => ({
        id: editModal.task.checklistItems?.[idx]?.id || `chk-${idx}`,
        title: item.trim(),
        isCompleted: editModal.task.checklistItems?.[idx]?.isCompleted || false,
      }));

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: editTitle.trim(),
              description: editDescription.trim() || null,
              estimatedHours: editEstimatedHours ? Number(editEstimatedHours) : null,
              checklistItems: updatedChecklist,
              customFields: payloadCustomValues,
              ...(canEditFull
                ? {
                    priority: (editPriority === "OTHER" ? "MEDIUM" : editPriority) as any,
                    dueDate: editDueDate || null,
                    projectId: editProjectId || t.projectId,
                    project: targetProj
                      ? { id: targetProj.id, code: targetProj.code, name: targetProj.name, projectType: targetProj.projectType }
                      : t.project,
                    phaseId: editPhaseId || null,
                    phase: targetPhase ? { id: targetPhase.id, phaseName: targetPhase.phaseName } : null,
                    assignedMemberIds: editAssigneeIds,
                    assigneeId: editAssigneeIds[0] || null,
                    assignee: targetAssignee
                      ? { id: targetAssignee.id, user: targetAssignee.user, employee: targetAssignee.employee }
                      : t.assignee,
                  }
                : {}),
            }
          : t
      )
    );

    if (drawerTask && drawerTask.id === taskId) {
      setDrawerTask((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              description: editDescription.trim() || null,
              estimatedHours: editEstimatedHours ? Number(editEstimatedHours) : null,
              checklistItems: updatedChecklist,
              customFields: payloadCustomValues,
              ...(canEditFull
                ? {
                    priority: (editPriority === "OTHER" ? "MEDIUM" : editPriority) as any,
                    dueDate: editDueDate || null,
                    assignedMemberIds: editAssigneeIds,
                    assigneeId: editAssigneeIds[0] || null,
                    assignee: targetAssignee
                      ? { id: targetAssignee.id, user: targetAssignee.user, employee: targetAssignee.employee }
                      : prev.assignee,
                  }
                : {}),
            }
          : null
      );
    }

    setCustomValuesByTask((prev) => ({
      ...prev,
      [taskId]: payloadCustomValues,
    }));

    setSuccessMessage(`Deliverable "${editTitle}" updated successfully!`);
    setEditModal(null);

    // 2. BACKGROUND SERVER SYNC
    const payload: any = {
      taskId,
      description: editDescription.trim() || null,
      estimatedHours: editEstimatedHours ? Number(editEstimatedHours) : null,
      checklist: editChecklistItems.filter((item) => item.trim().length > 0),
    };
    if (canEditFull) {
      payload.title = editTitle.trim();
      payload.priority = editPriority === "OTHER" ? "MEDIUM" : editPriority;
      payload.dueDate = editDueDate || null;
      payload.projectId = editProjectId === "OTHER" ? undefined : (editProjectId || undefined);
      payload.phaseId = editPhaseId === "OTHER" ? null : (editPhaseId || null);
      payload.assigneeIds = editAssigneeIds;
    }

    try {
      const res = await fetch(`/api/tasks/update?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (previousTask) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? previousTask : t)));
        }
        setErrorMessage(data.error || "Failed to update task");
        return;
      }

      if (Object.keys(payloadCustomValues).length > 0) {
        await fetch(`/api/custom-fields/values?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: "TASK",
            recordId: taskId,
            values: payloadCustomValues,
          }),
        });
      }
    } catch {
      if (previousTask) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? previousTask : t)));
      }
      setErrorMessage("Network error updating task. Reverted.");
    }
  };

  // Delete Task Handler - Instant Optimistic UI Update (< 5ms response)
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    const targetId = taskToDelete.id;
    const deletedTask = taskToDelete;

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) => prev.filter((t) => t.id !== targetId));
    if (drawerTask && drawerTask.id === targetId) {
      setDrawerTask(null);
    }
    if (editModal && editModal.task.id === targetId) {
      setEditModal(null);
    }
    setSuccessMessage(`Deliverable "${deletedTask.title}" was permanently deleted.`);
    setTaskToDelete(null);

    // 2. BACKGROUND SERVER SYNC
    try {
      const res = await fetch(`/api/tasks/delete?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: targetId }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Rollback
        setTasks((prev) => [deletedTask, ...prev]);
        setErrorMessage(data.error || "Failed to delete task");
      }
    } catch {
      setTasks((prev) => [deletedTask, ...prev]);
      setErrorMessage("Network error while deleting task. Restored.");
    }
  };

  // Toggle checklist item status directly - Instant Optimistic UI Update (< 5ms response)
  const handleToggleChecklist = async (taskId: string, itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTogglingChecklistId(itemId);

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklistItems: t.checklistItems.map((ci) =>
                ci.id === itemId
                  ? {
                      ...ci,
                      isCompleted: newStatus,
                      status: newStatus ? "COMPLETED" : "IN_PROGRESS",
                    }
                  : ci
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
                ci.id === itemId
                  ? {
                      ...ci,
                      isCompleted: newStatus,
                      status: newStatus ? "COMPLETED" : "IN_PROGRESS",
                    }
                  : ci
              ),
            }
          : null
      );
    }

    // 2. BACKGROUND SERVER SYNC
    try {
      const res = await fetch(`/api/tasks/checklist?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          itemId,
          isCompleted: newStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Checklist toggle failed on server:", errorData);
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  checklistItems: t.checklistItems.map((ci) =>
                    ci.id === itemId
                      ? {
                          ...ci,
                          isCompleted: currentStatus,
                          status: currentStatus ? "COMPLETED" : "IN_PROGRESS",
                        }
                      : ci
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
                    ci.id === itemId
                      ? {
                          ...ci,
                          isCompleted: currentStatus,
                          status: currentStatus ? "COMPLETED" : "IN_PROGRESS",
                        }
                      : ci
                  ),
                }
              : null
          );
        }
      } else {
        const data = await res.json();
        if (data?.item) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    checklistItems: t.checklistItems.map((ci) =>
                      ci.id === itemId
                        ? {
                            ...ci,
                            isCompleted: data.item.isCompleted,
                            status: data.item.status || (data.item.isCompleted ? "COMPLETED" : "IN_PROGRESS"),
                          }
                        : ci
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
                      ci.id === itemId
                        ? {
                            ...ci,
                            isCompleted: data.item.isCompleted,
                            status: data.item.status || (data.item.isCompleted ? "COMPLETED" : "IN_PROGRESS"),
                          }
                        : ci
                    ),
                  }
                : null
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to toggle checklist item", err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                checklistItems: t.checklistItems.map((ci) =>
                  ci.id === itemId
                    ? {
                        ...ci,
                        isCompleted: currentStatus,
                        status: currentStatus ? "COMPLETED" : "IN_PROGRESS",
                      }
                    : ci
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
                  ci.id === itemId
                    ? {
                        ...ci,
                        isCompleted: currentStatus,
                        status: currentStatus ? "COMPLETED" : "IN_PROGRESS",
                      }
                    : ci
                ),
              }
            : null
        );
      }
    } finally {
      setTogglingChecklistId(null);
    }
  };

  // Add Comment from Drawer - Instant Optimistic UI Update (< 5ms response)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerTask || !newCommentText.trim()) return;

    const contentText = newCommentText.trim();
    const tempCommentId = `comment-opt-${Date.now()}`;
    const optimisticComment = {
      id: tempCommentId,
      content: contentText,
      authorId: currentMembershipId,
      createdAt: new Date().toISOString(),
    };

    // 1. INSTANT MILLISECOND UI UPDATE
    setTasks((prev) =>
      prev.map((t) =>
        t.id === drawerTask.id
          ? { ...t, comments: [...t.comments, optimisticComment] }
          : t
      )
    );
    setDrawerTask((prev) =>
      prev ? { ...prev, comments: [...prev.comments, optimisticComment] } : null
    );
    setNewCommentText("");

    // 2. BACKGROUND SERVER SYNC
    try {
      const res = await fetch(`/api/tasks/comment?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: drawerTask.id,
          content: contentText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === drawerTask.id
              ? { ...t, comments: t.comments.filter((c) => c.id !== tempCommentId) }
              : t
          )
        );
        setDrawerTask((prev) =>
          prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== tempCommentId) } : null
        );
        setErrorMessage(data.error || "Failed to post comment");
      } else if (data.comment?.id) {
        // Update temp comment ID to real ID
        setTasks((prev) =>
          prev.map((t) =>
            t.id === drawerTask.id
              ? {
                  ...t,
                  comments: t.comments.map((c) =>
                    c.id === tempCommentId ? { ...c, id: data.comment.id } : c
                  ),
                }
              : t
          )
        );
        setDrawerTask((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((c) =>
                  c.id === tempCommentId ? { ...c, id: data.comment.id } : c
                ),
              }
            : null
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === drawerTask.id
            ? { ...t, comments: t.comments.filter((c) => c.id !== tempCommentId) }
            : t
        )
      );
      setDrawerTask((prev) =>
        prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== tempCommentId) } : null
      );
      setErrorMessage("Network error posting comment");
    }
  };

  // 1. Acknowledge Deliverable Assignment
  const handleAcknowledgeAssignment = async (taskId: string, version?: number) => {
    try {
      const res = await fetch(`/api/tasks/acknowledge?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, version }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to acknowledge assignment");
      }
      setSuccessMessage("✓ Deliverable assignment acknowledged successfully!");
      // Update local state
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updatedAssignments = (t.assignments || []).map((a) =>
            a.membershipId === currentMembershipId
              ? { ...a, acknowledgedAt: new Date().toISOString(), acknowledgedVersion: version || 1 }
              : a
          );
          return { ...t, assignments: updatedAssignments };
        })
      );
      setDrawerTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        const updatedAssignments = (prev.assignments || []).map((a) =>
          a.membershipId === currentMembershipId
            ? { ...a, acknowledgedAt: new Date().toISOString(), acknowledgedVersion: version || 1 }
            : a
        );
        return { ...prev, assignments: updatedAssignments };
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // 2. Start Checklist Work
  const handleStartChecklistItem = async (taskId: string, checklistItemId: string) => {
    try {
      const res = await fetch(`/api/tasks/start?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, checklistItemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start checklist task");
      }
      setSuccessMessage("✓ Work started on checklist task!");
      // Update local state
      const updateChecklist = (items: TaskItem["checklistItems"]) =>
        items.map((i) =>
          i.id === checklistItemId
            ? { ...i, status: "IN_PROGRESS", startedAt: new Date().toISOString() }
            : i
        );

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: t.status === "NOT_STARTED" ? "IN_PROGRESS" : t.status,
                checklistItems: updateChecklist(t.checklistItems),
              }
            : t
        )
      );
      setDrawerTask((prev) =>
        prev && prev.id === taskId
          ? {
              ...prev,
              status: prev.status === "NOT_STARTED" ? "IN_PROGRESS" : prev.status,
              checklistItems: updateChecklist(prev.checklistItems),
            }
          : prev
      );
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // 3. Raise or Resolve Blocker
  const handleRaiseOrResolveBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerModal) return;
    setSubmittingBlocker(true);
    try {
      if (blockerModal.isResolving) {
        const res = await fetch(`/api/tasks/blocker?workspaceSlug=${workspaceSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: blockerModal.taskId,
            checklistItemId: blockerModal.checklistItemId,
            resolutionNotes: blockerReasonInput.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to resolve blocker");
        setSuccessMessage("✓ Blocker resolved successfully!");
      } else {
        const res = await fetch(`/api/tasks/blocker?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: blockerModal.taskId,
            checklistItemId: blockerModal.checklistItemId,
            reason: blockerReasonInput.trim(),
            category: blockerCategory,
            severity: blockerSeverity,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to raise blocker");
        setSuccessMessage("⚠️ Blocker raised and logged with leadership!");
      }

      setBlockerModal(null);
      setBlockerReasonInput("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingBlocker(false);
    }
  };

  // 4. Request Deadline Extension
  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionModal || !extensionProposedDate || !extensionReasonInput.trim()) return;
    setSubmittingExtension(true);
    try {
      const res = await fetch(`/api/tasks/extension?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: extensionModal.taskId,
          checklistItemId: extensionModal.checklistItemId,
          proposedDueDate: extensionProposedDate,
          reason: extensionReasonInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request extension");
      setSuccessMessage("✓ Extension request submitted for leadership review!");
      setExtensionModal(null);
      setExtensionProposedDate("");
      setExtensionReasonInput("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingExtension(false);
    }
  };

  // 5. Decide Deadline Extension (Admin / Reviewer)
  const handleDecideExtension = async (requestId: string, decision: "APPROVE" | "REJECT", decisionReason?: string) => {
    try {
      const res = await fetch(`/api/tasks/extension?workspaceSlug=${workspaceSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          decision,
          decisionReason: decisionReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process extension");
      setSuccessMessage(`✓ Extension request ${decision.toLowerCase()}d!`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // 6. Submit Tasks for Review (Versioned Snapshot)
  const handleSubmitVersionedSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionModal || !submissionSummary.trim()) return;
    setSubmittingSnapshot(true);
    try {
      const rawLinks = submissionEvidenceLinks
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await fetch(`/api/tasks/submit?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: submissionModal.task.id,
          checklistTaskIds: submissionSelectedItems,
          summary: submissionSummary.trim(),
          evidenceLinks: rawLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit deliverable");
      setSuccessMessage(`✓ Version snapshot (v${data.submission?.version || 1}) submitted for review!`);
      setSubmissionModal(null);
      setSubmissionSummary("");
      setSubmissionSelectedItems([]);
      setSubmissionEvidenceLinks("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingSnapshot(false);
    }
  };

  // 7. Review Decision (Four-Eyes Enforcement)
  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDecisionModal) return;
    if (reviewDecisionModal.action === "REQUEST_CHANGES" && !reviewFeedbackInput.trim()) {
      setErrorMessage("Please provide specific feedback explaining the requested changes.");
      return;
    }
    setSubmittingDecision(true);
    try {
      const res = await fetch(`/api/tasks/review?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: reviewDecisionModal.submissionId,
          decision: reviewDecisionModal.action,
          feedback: reviewFeedbackInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record review decision");
      setSuccessMessage(
        reviewDecisionModal.action === "APPROVE"
          ? "✓ Deliverable submission approved and verified!"
          : "⚠️ Revisions requested. Submitter has been notified to make corrections."
      );
      setReviewDecisionModal(null);
      setReviewFeedbackInput("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingDecision(false);
    }
  };

  // 8. Reopen Completed Task
  const handleReopenItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModal || !reopenReasonInput.trim()) return;
    setSubmittingReopen(true);
    try {
      const res = await fetch(`/api/tasks/reopen?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: reopenModal.taskId,
          checklistItemId: reopenModal.checklistItemId,
          reason: reopenReasonInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen task");
      setSuccessMessage("✓ Task reopened and moved back to In Progress!");
      setReopenModal(null);
      setReopenReasonInput("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingReopen(false);
    }
  };

  // 9. Ask Clarification
  const handleAskClarification = async (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (!clarificationQuestion.trim()) return;
    setSubmittingClarification(true);
    try {
      const res = await fetch(`/api/tasks/clarifications?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          checklistItemId: clarificationItemId || undefined,
          question: clarificationQuestion.trim(),
          urgency: clarificationUrgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post question");
      setSuccessMessage("✓ Clarification question posted to deliverable thread!");
      setClarificationQuestion("");
      setClarificationItemId("");
      setClarificationUrgency("NORMAL");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingClarification(false);
    }
  };

  // 10. Reply to Clarification
  const handleReplyClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModal || !replyMessageInput.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/tasks/clarifications?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clarificationId: replyModal.clarificationId,
          reply: replyMessageInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post reply");
      setSuccessMessage("✓ Reply posted to clarification thread!");
      setReplyModal(null);
      setReplyMessageInput("");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingReply(false);
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✔ Completed
          </span>
        );
      case "CHECKING":
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            🔍 Checking
          </span>
        );
      case "ONGOING":
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            ⚡ Ongoing
          </span>
        );
      case "STARTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            ▶ Started
          </span>
        );
      case "TODO":
      case "NOT_STARTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4FF] text-[#696E82] border border-[#E2E6F0]">
            📋 Todo
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            ⛔ Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F4FF] text-[#696E82] border border-[#E2E6F0]">
            {s}
          </span>
        );
    }
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedTypologyFilter !== "ALL" ||
    selectedProjectFilter !== "ALL" ||
    selectedAssigneeFilter !== "ALL" ||
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

            {/* View Switcher: Grid, List, Kanban */}
            <div className="flex items-center gap-1 bg-[#F3F5FF] border border-[#DFE5F2] p-1 rounded-xl shrink-0">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setView("grid")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  view === "grid"
                    ? "bg-white text-[#111B35] font-semibold shadow-2xs border border-[#DFE5F2]/60"
                    : "text-[#52617C] hover:text-[#111B35]"
                }`}
                title="Grid view (3 cards per desktop row)"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#5878FF]" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setView("list")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  view === "list"
                    ? "bg-white text-[#111B35] font-semibold shadow-2xs border border-[#DFE5F2]/60"
                    : "text-[#52617C] hover:text-[#111B35]"
                }`}
                title="List view"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setView("kanban")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  view === "kanban"
                    ? "bg-white text-[#111B35] font-semibold shadow-2xs border border-[#DFE5F2]/60"
                    : "text-[#52617C] hover:text-[#111B35]"
                }`}
                title="Kanban view"
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
            <Filter className="w-3.5 h-3.5 text-[#5878FF]" />
            <span>Filters:</span>
          </div>

          {/* Due Date Category */}
          <div className="min-w-[130px]">
            <SearchableDropdown
              size="sm"
              value={selectedDueDateCategory}
              onChange={setSelectedDueDateCategory}
              placeholder="All Due Dates"
              searchable={false}
              clearable={false}
              options={[
                { value: "ALL", label: "All Due Dates" },
                { value: "TODAY", label: "Due Today", icon: <Clock className="w-3.5 h-3.5 text-[#5878FF]" /> },
                { value: "OVERDUE", label: "Overdue Only", icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> },
                { value: "UPCOMING", label: "Upcoming", icon: <Calendar className="w-3.5 h-3.5 text-indigo-500" /> },
              ]}
            />
          </div>

          {/* Status Category */}
          <div className="min-w-[130px]">
            <SearchableDropdown
              size="sm"
              optionType="status"
              value={selectedStatusCategory}
              onChange={setSelectedStatusCategory}
              placeholder="All Statuses"
              searchable={false}
              clearable={false}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "NOT_STARTED", label: "📋 Todo", subLabel: "Pending work" },
                { value: "STARTED", label: "▶ Started", subLabel: "Commenced" },
                { value: "ONGOING", label: "⚡ Ongoing", subLabel: "In progress" },
                { value: "CHECKING", label: "🔍 Checking", subLabel: "Waiting review" },
                { value: "COMPLETED", label: "✔ Completed", subLabel: "Done & approved" },
              ]}
            />
          </div>

          {/* Priority */}
          <div className="min-w-[130px]">
            <SearchableDropdown
              size="sm"
              optionType="priority"
              value={selectedPriorityFilter}
              onChange={setSelectedPriorityFilter}
              placeholder="All Priorities"
              searchable={false}
              clearable={false}
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "URGENT", label: "Urgent", subLabel: "Critical path" },
                { value: "HIGH", label: "High Priority", subLabel: "Strict deadline" },
                { value: "MEDIUM", label: "Medium", subLabel: "Standard deliverable" },
                { value: "LOW", label: "Low", subLabel: "Routine drafting" },
              ]}
            />
          </div>

          {/* Typology Filter */}
          <div className="min-w-[150px]">
            <SearchableDropdown
              size="sm"
              value={selectedTypologyFilter}
              onChange={setSelectedTypologyFilter}
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
            />
          </div>

          {/* Project */}
          <div className="min-w-[170px]">
            <SearchableDropdown
              size="sm"
              optionType="project"
              value={selectedProjectFilter}
              onChange={setSelectedProjectFilter}
              placeholder="All Projects"
              searchPlaceholder="Search projects..."
              clearable={false}
              options={[
                { value: "ALL", label: "All Projects" },
                ...projects
                  .filter((p) => selectedTypologyFilter === "ALL" || isTypologyMatch(p.projectType, selectedTypologyFilter))
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                    projectCode: p.code,
                    subLabel: p.projectType || undefined,
                    icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                  })),
              ]}
            />
          </div>

          {/* Employee Filter */}
          <div className="min-w-[180px]">
            <SearchableDropdown
              size="sm"
              optionType="employee"
              value={selectedAssigneeFilter}
              onChange={setSelectedAssigneeFilter}
              placeholder="All Employees"
              searchPlaceholder="Search employees..."
              clearable={false}
              options={[
                { value: "ALL", label: "All Employees", icon: <Users className="w-3.5 h-3.5 text-[#5878FF]" /> },
                { value: "UNASSIGNED", label: "Unassigned Tasks", subLabel: "No assignee attached" },
                ...members.map((m) => ({
                  value: m.id,
                  label: m.user.fullName,
                  employeeId: m.employee?.employeeId,
                  subLabel: m.employee?.designation ? `${m.employee.designation} (${m.role})` : m.role,
                  category: "employee" as const,
                })),
              ]}
            />
          </div>

          {/* Sort By Filter (Date, Day, Alphabetical) */}
          <div className="min-w-[180px]">
            <SearchableDropdown
              size="sm"
              value={taskSortBy}
              onChange={setTaskSortBy}
              placeholder="Sort By"
              searchable={false}
              clearable={false}
              options={[
                { value: "DUE_DATE_ASC", label: "Sort: Due Date (Closest First)" },
                { value: "DUE_DATE_DESC", label: "Sort: Due Date (Furthest First)" },
                { value: "CREATED_DESC", label: "Sort: Date Created (Newest First)" },
                { value: "CREATED_ASC", label: "Sort: Date Created (Oldest First)" },
                { value: "ALPHA_ASC", label: "Sort: Alphabetical (A → Z)" },
                { value: "ALPHA_DESC", label: "Sort: Alphabetical (Z → A)" },
                { value: "PROJ_ALPHA_ASC", label: "Sort: Project Code (A → Z)" },
              ]}
            />
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

      {/* 4. MAIN VIEW: GRID, LIST OR KANBAN */}
      {view === "grid" && (
        <TaskGrid
          tasks={filteredTasks}
          isFilterActive={isFilterActive}
          canAssignDeliverable={isPrivileged || true}
          currentMembershipId={currentMembershipId}
          isPrivileged={isPrivileged}
          workspaceTimezone={workspaceTimezone}
          customFields={customFields}
          customValuesByTask={customValuesByTask}
          loadingTaskId={loadingTaskId}
          onOpenCreateTask={() => {
            setCustomFieldValues({});
            setIsCreateTaskModalOpen(true);
          }}
          onClearFilters={handleClearFilters}
          onUpdateStatus={updateStatus}
          onOpenDetails={(task) => setDrawerTask(task)}
          onEdit={(task) => openEditModal(task)}
          onDelegate={(task) => openReassignModal(task)}
          onDelete={(task) => setTaskToDelete(task)}
          onRequestChanges={(task) => setChangeRequestModal({ taskId: task.id, title: task.title })}
          onToggleChecklist={handleToggleChecklist}
          getTaskAssignees={getTaskAssignees}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
        />
      )}

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
                const isMyTask = isTaskAssignedToMe(task);
                const isCreator = task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId;
                const canEditOrReassign = isPrivileged || isMyTask || isCreator;
                const assignees = getTaskAssignees(task);

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-[#F8F9FD] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    {/* Left: Task Info & Direct Drawer Opener */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <ProjectProfileCircle typology={task.project.projectType} name={task.project.name} size="xs" />
                          <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                            {task.project.code}
                          </span>
                          <span className="text-xs font-semibold text-[#1F1F1F]">
                            {task.project.name}
                          </span>
                        </div>
                        {task.project.projectType && (
                          <TypologyBadge typology={task.project.projectType} size="xs" />
                        )}
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
                        {sanitizeTaskDescription(task.description) && (
                          <p className="text-xs text-[#696E82] mt-0.5 line-clamp-2">{sanitizeTaskDescription(task.description)}</p>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        {/* Assignees highlight */}
                        <div className="inline-flex items-center gap-1.5 bg-[#F2F4FF] px-2.5 py-1 rounded-lg border border-[#E2E6F0] flex-wrap">
                          <Users className="w-3.5 h-3.5 text-[#5A81FA] shrink-0" />
                          <span className="text-[11px] text-[#696E82]">Assignees:</span>
                          {assignees.length > 0 ? (
                            assignees.map((assignee, idx) => {
                              const isMe = assignee.id === currentMembershipId;
                              return (
                                <span key={assignee.id || idx} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F1F1F]">
                                  <span>{assignee.user.fullName}</span>
                                  {assignee.employee?.employeeId && (
                                    <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-white px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                                      {assignee.employee.employeeId}
                                    </span>
                                  )}
                                  {isMe && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 rounded">
                                      YOU
                                    </span>
                                  )}
                                  {idx < assignees.length - 1 && <span className="text-[#A0AEC0] mr-1">,</span>}
                                </span>
                              );
                            })
                          ) : (
                            <span className="font-semibold text-[#696E82] text-xs">Unassigned</span>
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
                            {task.checklistItems.map((item) => {
                              const isItemAssignee = item.assignedMemberId === currentMembershipId;
                              const canToggle = Boolean((canEditOrReassign || isItemAssignee) && togglingChecklistId !== item.id);
                              return (
                                <button
                                  key={item.id}
                                  disabled={!canToggle}
                                  onClick={() => handleToggleChecklist(task.id, item.id, item.isCompleted)}
                                  className={`flex items-center gap-2 text-xs text-left group transition-colors ${
                                    canToggle ? "cursor-pointer" : "cursor-default"
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
                              );
                            })}
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

                      {/* Workflow Status Quick Selector (5 Statuses) */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[#696E82] font-semibold hidden sm:inline">Status:</span>
                        <div className="w-[140px]">
                          <SearchableDropdown
                            size="sm"
                            optionType="status"
                            disabled={loadingTaskId === task.id}
                            value={
                              task.status === "NOT_STARTED" ? "TODO" :
                              task.status === "IN_PROGRESS" ? "ONGOING" :
                              task.status === "IN_REVIEW" ? "CHECKING" :
                              task.status
                            }
                            onChange={(val) => updateStatus(task.id, val)}
                            searchable={false}
                            clearable={false}
                            options={[
                              { value: "TODO", label: "📋 Todo", subLabel: "Pending work" },
                              { value: "STARTED", label: "▶ Started", subLabel: "Commenced" },
                              { value: "ONGOING", label: "⚡ Ongoing", subLabel: "In progress" },
                              { value: "CHECKING", label: "🔍 Checking", subLabel: "Waiting review" },
                              { value: "COMPLETED", label: "✔ Completed", subLabel: "Done & approved" },
                            ]}
                          />
                        </div>

                        {isPrivileged && (task.status === "IN_REVIEW" || task.status === "CHECKING") && (
                          <button
                            disabled={loadingTaskId === task.id}
                            onClick={() => setChangeRequestModal({ taskId: task.id, title: task.title })}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Request deliverable revisions"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span>Changes</span>
                          </button>
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

      {/* 5. KANBAN BOARD WITH DRAG AND DROP (5 STATUS COLUMNS) */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              statuses: ["TODO", "NOT_STARTED"],
              dropStatus: "TODO",
              title: "Todo",
              color: "border-slate-300",
              bg: "bg-slate-50/50",
            },
            {
              statuses: ["STARTED"],
              dropStatus: "STARTED",
              title: "Started",
              color: "border-sky-400",
              bg: "bg-sky-50/30",
            },
            {
              statuses: ["ONGOING", "IN_PROGRESS"],
              dropStatus: "ONGOING",
              title: "Ongoing",
              color: "border-blue-500",
              bg: "bg-blue-50/30",
            },
            {
              statuses: ["CHECKING", "IN_REVIEW"],
              dropStatus: "CHECKING",
              title: "Checking",
              color: "border-purple-400",
              bg: "bg-purple-50/30",
            },
            {
              statuses: ["COMPLETED"],
              dropStatus: "COMPLETED",
              title: "Completed",
              color: "border-emerald-500",
              bg: "bg-emerald-50/30",
            },
          ].map((col) => {
            const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status as any));
            return (
              <div
                key={col.title}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnColumn(col.dropStatus as any)}
                className={`bg-white border border-[#E2E6F0] rounded-2xl p-3.5 flex flex-col min-h-[500px] transition-colors ${col.bg}`}
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
                    const isMyTask = isTaskAssignedToMe(task);
                    const isCreator = task.creatorId === currentMembershipId || task.creator?.id === currentMembershipId;
                    const canEditOrReassign = isPrivileged || isMyTask || isCreator;
                    const isOverdue =
                      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
                    const cardAssignees = getTaskAssignees(task);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="p-3 bg-white border border-[#E2E6F0] rounded-xl shadow-2xs space-y-2 hover:border-[#5A81FA] transition-all cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ProjectProfileCircle typology={task.project.projectType} name={task.project.name} size="xs" />
                            <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                              {task.project.code}
                            </span>
                            <span className="text-[11px] font-semibold text-[#1F1F1F] truncate max-w-[110px]" title={task.project.name}>
                              {task.project.name}
                            </span>
                          </div>
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

                        {/* Multi-Assignee pill */}
                        <div className="text-[11px] text-[#696E82] bg-[#F2F4FF] px-2 py-1 rounded flex flex-wrap items-center gap-1">
                          <Users className="w-3 h-3 text-[#5A81FA] shrink-0" />
                          {cardAssignees.length > 0 ? (
                            cardAssignees.map((a, i) => (
                              <span key={a.id || i} className="font-semibold text-[#1F1F1F] truncate max-w-[110px]">
                                {a.user.fullName}
                                {a.id === currentMembershipId && (
                                  <span className="ml-1 text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                    YOU
                                  </span>
                                )}
                                {i < cardAssignees.length - 1 && ","}
                              </span>
                            ))
                          ) : (
                            <span className="italic">Unassigned</span>
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
                        <div className="pt-2 border-t border-[#E2E6F0] flex items-center justify-between gap-1">
                          <div className="flex items-center gap-0.5">
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

                          <div className="w-[125px]">
                            <SearchableDropdown
                              size="sm"
                              optionType="status"
                              disabled={loadingTaskId === task.id}
                              value={
                                task.status === "NOT_STARTED" ? "TODO" :
                                task.status === "IN_PROGRESS" ? "ONGOING" :
                                task.status === "IN_REVIEW" ? "CHECKING" :
                                task.status
                              }
                              onChange={(val) => updateStatus(task.id, val)}
                              searchable={false}
                              clearable={false}
                              options={[
                                { value: "TODO", label: "Todo" },
                                { value: "STARTED", label: "Started" },
                                { value: "ONGOING", label: "Ongoing" },
                                { value: "CHECKING", label: "Checking" },
                                { value: "COMPLETED", label: "Completed" },
                              ]}
                            />
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
                  <div className="flex items-center gap-1.5">
                    <ProjectProfileCircle typology={drawerTask.project.projectType} name={drawerTask.project.name} size="xs" />
                    <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {drawerTask.project.code}
                    </span>
                    <span className="text-xs font-bold text-[#1F1F1F]">{drawerTask.project.name}</span>
                  </div>
                  {drawerTask.project.projectType && (
                    <TypologyBadge typology={drawerTask.project.projectType} size="xs" />
                  )}
                  {drawerTask.phase && (
                    <span className="text-[11px] font-medium text-[#696E82] bg-[#F2F4FF] px-2 py-0.5 rounded">
                      {drawerTask.phase.phaseName}
                    </span>
                  )}
                  {getPriorityBadge(drawerTask.priority)}
                  {getStatusBadge(drawerTask.status)}
                </div>
                <h3 className="text-lg font-bold text-[#1F1F1F] tracking-tight">{drawerTask.title}</h3>
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
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#1F1F1F]">
              {/* 1. ASSIGNMENT ACKNOWLEDGEMENT BANNER */}
              {(() => {
                const myAssignment = (drawerTask.assignments || []).find((a) => a.membershipId === currentMembershipId);
                const isAssigned = myAssignment || drawerTask.assigneeId === currentMembershipId || (drawerTask.assignedMemberIds || []).includes(currentMembershipId);
                if (!isAssigned) return null;

                const isAcked = Boolean(myAssignment?.acknowledgedAt);
                if (!isAcked) {
                  return (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        </span>
                        <div className="text-xs">
                          <span className="font-bold text-amber-950 block">Action Required: Acknowledge Assignment</span>
                          <span className="text-[11px] text-amber-800">
                            Please acknowledge receipt of Deliverable v{drawerTask.version || 1} before starting execution.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeAssignment(drawerTask.id, drawerTask.version || 1)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">
                        Assignment acknowledged on {new Date(myAssignment!.acknowledgedAt!).toLocaleDateString()} (v{myAssignment!.acknowledgedVersion || 1})
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>
                );
              })()}

              {/* 2. META GRID */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                <div>
                  <span className="text-[#696E82] text-[11px] block">Assigned Staff</span>
                  <div className="mt-1 space-y-1">
                    {getTaskAssignees(drawerTask).length > 0 ? (
                      getTaskAssignees(drawerTask).map((member, idx) => (
                        <div key={member.id || idx} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#1F1F1F] text-xs">
                            {member.user.fullName}
                          </span>
                          {member.employee?.employeeId && (
                            <span className="text-[10px] text-[#5A81FA] font-mono bg-white px-1.5 py-0.2 rounded border border-[#CEDEFF]">
                              ID: {member.employee.employeeId}
                            </span>
                          )}
                          {member.id === currentMembershipId && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="font-semibold text-[#696E82] text-xs">Unassigned</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[#696E82] text-[11px] block">Designated Reviewer</span>
                  <div className="font-bold text-[#1F1F1F] mt-0.5">
                    {drawerTask.reviewer?.user?.fullName || "Studio Leadership (Admin / Owner)"}
                  </div>
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
              </div>

              {/* 3. ACCEPTANCE CRITERIA BOX */}
              {drawerTask.acceptanceCriteria && (
                <div className="p-3 bg-[#EBF1FF] border border-[#CEDEFF] rounded-xl text-xs space-y-1">
                  <h4 className="font-bold text-[#5A81FA] uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Acceptance Criteria & Definition of Done</span>
                  </h4>
                  <p className="text-[#1F1F1F] leading-relaxed whitespace-pre-line">{drawerTask.acceptanceCriteria}</p>
                </div>
              )}

              {/* 4. DELIVERABLE INSTRUCTIONS & BRIEF */}
              <div>
                <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Deliverable Instructions & Brief</span>
                </h4>
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82] whitespace-pre-line leading-relaxed">
                  {sanitizeTaskDescription(drawerTask.description) || "No detailed brief provided for this deliverable."}
                </div>
              </div>

              {/* 5. CHECKLIST ITEMS & WORKFLOW ACTIONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Deliverable Checklist Tasks ({drawerTask.checklistItems.filter((i) => i.isCompleted).length} / {drawerTask.checklistItems.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionSelectedItems(drawerTask.checklistItems.map((ci) => ci.id));
                      setSubmissionModal({ task: drawerTask });
                    }}
                    className="px-2.5 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Submit for Review</span>
                  </button>
                </div>

                {drawerTask.checklistItems.length === 0 ? (
                  <p className="text-xs text-[#696E82] italic">No checklist items defined.</p>
                ) : (
                  <div className="space-y-2">
                    {drawerTask.checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all space-y-2 ${
                          item.isBlocked
                            ? "bg-red-50/60 border-red-300"
                            : item.isCompleted
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-[#F8F9FD] hover:bg-white border-[#E2E6F0]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(drawerTask.id, item.id, item.isCompleted)}
                            className="flex items-start gap-2 text-left cursor-pointer flex-1 min-w-0"
                          >
                            {item.isCompleted ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-[#696E82] shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span
                                className={`text-xs block ${
                                  item.isCompleted ? "line-through text-[#696E82]" : "text-[#1F1F1F] font-semibold"
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.dueDate && (
                                <span className="text-[10px] text-[#696E82] block">
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.isBlocked ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded border border-red-200">
                                BLOCKED
                              </span>
                            ) : item.status === "IN_REVIEW" ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded border border-amber-200">
                                IN REVIEW
                              </span>
                            ) : item.status === "IN_PROGRESS" ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded border border-blue-200">
                                IN PROGRESS
                              </span>
                            ) : item.isCompleted ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded border border-emerald-200">
                                DONE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-medium text-[10px] rounded border border-gray-200">
                                NOT STARTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Prerequisite Indicator */}
                        {item.prerequisiteItem && (
                          <div className="text-[10px] text-[#696E82] bg-white p-1.5 rounded-lg border border-[#E2E6F0] flex items-center justify-between">
                            <span>Prerequisite: <strong>{item.prerequisiteItem.title}</strong></span>
                            <span className={item.prerequisiteItem.isCompleted ? "text-emerald-700 font-bold" : "text-amber-700 font-medium"}>
                              {item.prerequisiteItem.isCompleted ? "✓ Completed" : "⏳ Pending completion"}
                            </span>
                          </div>
                        )}

                        {/* Blocker Alert Banner */}
                        {item.isBlocked && (
                          <div className="p-2 bg-red-100/70 border border-red-200 rounded-lg text-xs text-red-900 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold">⚠️ Blocked: </span>
                              <span>{item.blockerReason || "Blocker logged"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setBlockerModal({
                                  taskId: drawerTask.id,
                                  checklistItemId: item.id,
                                  title: item.title,
                                  isResolving: true,
                                  existingReason: item.blockerReason || undefined,
                                })
                              }
                              className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold rounded cursor-pointer shrink-0 transition-colors"
                            >
                              Resolve Blocker
                            </button>
                          </div>
                        )}

                        {/* Item Action Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E2E6F0]/60">
                          {/* Start Work button */}
                          {(!item.status || item.status === "NOT_STARTED") && !item.isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleStartChecklistItem(drawerTask.id, item.id)}
                              className="px-2 py-1 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#5A81FA] hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Start Work</span>
                            </button>
                          )}

                          {/* Report Blocker button */}
                          {!item.isBlocked && !item.isCompleted && (
                            <button
                              type="button"
                              onClick={() =>
                                setBlockerModal({
                                  taskId: drawerTask.id,
                                  checklistItemId: item.id,
                                  title: item.title,
                                  isResolving: false,
                                })
                              }
                              className="px-2 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                              <span>Report Blocker</span>
                            </button>
                          )}

                          {/* Request Extension button */}
                          {!item.isCompleted && (
                            <button
                              type="button"
                              onClick={() =>
                                setExtensionModal({
                                  taskId: drawerTask.id,
                                  checklistItemId: item.id,
                                  title: item.title,
                                  currentDueDate: item.dueDate,
                                })
                              }
                              className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Extend Date</span>
                            </button>
                          )}

                          {/* Reopen button */}
                          {item.isCompleted && isPrivileged && (
                            <button
                              type="button"
                              onClick={() =>
                                setReopenModal({
                                  taskId: drawerTask.id,
                                  checklistItemId: item.id,
                                  title: item.title,
                                })
                              }
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Reopen Work</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. SUBMISSIONS & REVIEW DECISIONS QUEUE */}
              {drawerTask.submissions && drawerTask.submissions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#E2E6F0]">
                  <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Versioned Submissions & Reviews ({drawerTask.submissions.length})</span>
                  </h4>

                  <div className="space-y-2">
                    {drawerTask.submissions.map((sub) => {
                      const isPending = sub.status === "PENDING";
                      // Four-Eyes Rule: Submitters cannot approve their own submission
                      const isSubmitter = sub.submitterName === contextUserFullName;
                      const canReview = isPrivileged || drawerTask.reviewerId === currentMembershipId;
                      const selfApprovalBlocked = canReview && isSubmitter;

                      return (
                        <div
                          key={sub.id}
                          className={`p-3 rounded-xl border space-y-2 text-xs ${
                            isPending
                              ? "bg-amber-50/50 border-amber-200 shadow-2xs"
                              : sub.status === "APPROVED"
                              ? "bg-emerald-50/50 border-emerald-200"
                              : "bg-red-50/50 border-red-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1F1F1F]">Snapshot v{sub.version}</span>
                              <span className="text-[#696E82] text-[10px]">by {sub.submitterName}</span>
                              <span className="text-[10px] text-[#696E82]">
                                {new Date(sub.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sub.status === "REQUEST_CHANGES"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>

                          <p className="text-[#1F1F1F] text-xs leading-relaxed">{sub.summary}</p>

                          {/* Evidence Links */}
                          {sub.evidenceLinks && Array.isArray(sub.evidenceLinks) && sub.evidenceLinks.length > 0 && (
                            <div className="text-[11px] space-y-0.5">
                              <span className="font-bold text-[#696E82] block">Attached Deliverable Files / Evidence:</span>
                              {sub.evidenceLinks.map((link: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#5A81FA] hover:underline block truncate"
                                >
                                  🔗 {link}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Review Feedback if rejected */}
                          {sub.reviewFeedback && (
                            <div className="p-2 bg-white rounded-lg border border-red-200 text-red-900 text-xs">
                              <strong>Reviewer Feedback: </strong>
                              {sub.reviewFeedback}
                            </div>
                          )}

                          {/* Review Action Dock (For Reviewer / Admin) */}
                          {isPending && canReview && (
                            <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                              {selfApprovalBlocked ? (
                                <div className="p-2 bg-amber-100/80 rounded-lg text-[11px] text-amber-950 font-medium w-full">
                                  🛡️ <strong>Four-Eyes Policy:</strong> You submitted this version. Another designated reviewer or studio admin must perform the review.
                                </div>
                              ) : (
                                <>
                                  <span className="text-[11px] text-amber-900 font-semibold">Review Decision:</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReviewDecisionModal({
                                          submissionId: sub.id,
                                          taskId: drawerTask.id,
                                          action: "APPROVE",
                                        })
                                      }
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                                    >
                                      ✓ Approve Submission
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReviewDecisionModal({
                                          submissionId: sub.id,
                                          taskId: drawerTask.id,
                                          action: "REQUEST_CHANGES",
                                        })
                                      }
                                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                                    >
                                      Request Changes
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. CLARIFICATIONS & Q&A THREAD */}
              <div className="space-y-3 pt-2 border-t border-[#E2E6F0]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Clarifications & Queries ({drawerTask.clarifications?.length || 0})</span>
                  </h4>
                </div>

                {/* Question Input Form */}
                <form onSubmit={(e) => handleAskClarification(e, drawerTask.id)} className="space-y-2 bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0]">
                  <textarea
                    rows={2}
                    value={clarificationQuestion}
                    onChange={(e) => setClarificationQuestion(e.target.value)}
                    placeholder="Ask a question or request clarification regarding specifications, drawings, or requirements..."
                    className="w-full p-2 bg-white border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={clarificationUrgency}
                        onChange={(e) => setClarificationUrgency(e.target.value as any)}
                        className="p-1 bg-white border border-[#E2E6F0] rounded text-[11px] text-[#696E82]"
                      >
                        <option value="NORMAL">Standard Question</option>
                        <option value="URGENT">Urgent Blocker Query</option>
                      </select>
                      {drawerTask.checklistItems.length > 0 && (
                        <select
                          value={clarificationItemId}
                          onChange={(e) => setClarificationItemId(e.target.value)}
                          className="p-1 bg-white border border-[#E2E6F0] rounded text-[11px] text-[#696E82] max-w-[140px] truncate"
                        >
                          <option value="">General (All)</option>
                          {drawerTask.checklistItems.map((ci) => (
                            <option key={ci.id} value={ci.id}>
                              {ci.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submittingClarification || !clarificationQuestion.trim()}
                      className="px-3 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer transition-colors shadow-xs flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post Query</span>
                    </button>
                  </div>
                </form>

                {/* Clarifications List */}
                {drawerTask.clarifications && drawerTask.clarifications.length > 0 ? (
                  <div className="space-y-2">
                    {drawerTask.clarifications.map((c) => (
                      <div key={c.id} className="p-3 bg-white border border-[#E2E6F0] rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1F1F1F]">{c.authorName}</span>
                          <span className="text-[10px] text-[#696E82]">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[#1F1F1F] leading-relaxed">{c.question}</p>

                        {/* Answers / Replies */}
                        {c.answers && c.answers.length > 0 && (
                          <div className="space-y-1.5 pl-3 border-l-2 border-[#5A81FA]/30 pt-1">
                            {c.answers.map((ans) => (
                              <div key={ans.id} className="p-2 bg-[#F8F9FD] rounded-lg text-xs space-y-0.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-[#5A81FA]">{ans.authorName}</span>
                                  <span className="text-[#696E82]">{new Date(ans.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[#1F1F1F]">{ans.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Action button */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setReplyModal({
                                clarificationId: c.id,
                                question: c.question,
                                taskId: drawerTask.id,
                              })
                            }
                            className="text-[#5A81FA] hover:underline text-[11px] font-semibold cursor-pointer"
                          >
                            Reply / Answer →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#696E82] italic">No clarification questions posted yet.</p>
                )}
              </div>

              {/* 8. COMMENTS & COLLABORATION */}
              <div className="space-y-3 pt-2 border-t border-[#E2E6F0]">
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
                    className="px-3 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-xs"
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

              {/* 9. ACTIVITY HISTORY */}
              {drawerTask.activityHistory && drawerTask.activityHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E2E6F0]">
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
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(isPrivileged || isTaskAssignedToMe(drawerTask) || drawerTask.creatorId === currentMembershipId || drawerTask.creator?.id === currentMembershipId) && (
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
                <span className="text-xs font-medium text-[#696E82]">Status:</span>
                <div className="min-w-[140px]">
                  <SearchableDropdown
                    size="sm"
                    optionType="status"
                    searchable={false}
                    clearable={false}
                    disabled={loadingTaskId === drawerTask.id}
                    value={
                      drawerTask.status === "NOT_STARTED" ? "TODO" :
                      drawerTask.status === "IN_PROGRESS" ? "ONGOING" :
                      drawerTask.status === "IN_REVIEW" ? "CHECKING" :
                      drawerTask.status
                    }
                    onChange={(val) => updateStatus(drawerTask.id, val)}
                    options={[
                      { value: "TODO", label: "📋 Todo" },
                      { value: "STARTED", label: "▶ Started" },
                      { value: "ONGOING", label: "⚡ Ongoing" },
                      { value: "CHECKING", label: "🔍 Checking" },
                      { value: "COMPLETED", label: "✔ Completed" },
                    ]}
                  />
                </div>

                {isPrivileged && (drawerTask.status === "IN_REVIEW" || drawerTask.status === "CHECKING") && (
                  <button
                    onClick={() => setChangeRequestModal({ taskId: drawerTask.id, title: drawerTask.title })}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Request Changes
                  </button>
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
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Edit Deliverable</h3>
                  <p className="text-xs text-[#696E82]">
                    {isPrivileged || editModal.task.creatorId === currentMembershipId
                      ? "Full edit mode: Update typology, project, phase, assignees, checklist, and specs"
                      : "Employee progress update: Update deliverable notes, effort, and checklist items"}
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

            {!isPrivileged && editModal.task.creatorId !== currentMembershipId && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Employee field mode active: Project, phase, priority, due date, and assignees are set by Studio
                  Leadership. You can edit deliverable notes, checklist items, estimated hours, and custom field values.
                </span>
              </div>
            )}

            <form onSubmit={handleEditTask} className="space-y-4 text-xs">
              {/* 1. ARCHITECTURAL TYPOLOGY */}
              <div className="bg-[#FAFBFD] p-3 rounded-xl border border-[#E2E6F0] space-y-1">
                <SearchableSelect
                  id="edit-task-typology"
                  label="Architectural Typology"
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  required={false}
                  placeholder="Select typology (e.g. Commercial, Hospital, Residential)..."
                  searchPlaceholder="Search typology (e.g. Commercial, Hospital, Villa)..."
                  options={[
                    { value: "", label: "All Typologies (Show all projects)" },
                    ...dynamicTypologies.map((typ) => ({
                      value: typ,
                      label: typ,
                      icon: <TypologyDot typology={typ} />,
                    })),
                  ]}
                  value={editTypology}
                  onChange={(val) => {
                    setEditTypology(val);
                    const eff = val === "OTHER" ? editOtherTypology.trim() : val.trim();
                    if (eff) {
                      const match = projects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === editProjectId)) {
                          setEditProjectId(match[0].id);
                          setEditPhaseId("");
                        }
                      }
                    }
                  }}
                  allowOther={true}
                  otherOptionLabel="+ Other Architectural Typology..."
                  otherValue={editOtherTypology}
                  onOtherValueChange={(val) => {
                    setEditOtherTypology(val);
                    const eff = val.trim();
                    if (eff) {
                      const match = projects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === editProjectId)) {
                          setEditProjectId(match[0].id);
                          setEditPhaseId("");
                        }
                      }
                    }
                  }}
                  otherInputPlaceholder="Specify custom typology (e.g. Airport, Cultural Pavilion, Data Center)..."
                  helperText={
                    effectiveEditTypology
                      ? `Showing only ${effectiveEditTypology} projects below (${filteredProjectsForEdit.length} found).`
                      : "Classifies deliverable requirements and filters projects by architectural typology."
                  }
                />
              </div>

              {/* 2. PROJECT & PHASE SELECTOR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-select-project"
                  label="Project"
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  required={true}
                  placeholder={
                    filteredProjectsForEdit.length > 0
                      ? "Select project..."
                      : effectiveEditTypology
                      ? `No ${effectiveEditTypology} projects found`
                      : "Select project..."
                  }
                  searchPlaceholder="Search projects by code, title, or typology..."
                  options={filteredProjectsForEdit.map((p) => ({
                    value: p.id,
                    label: `${p.code} — ${p.name}`,
                    subLabel: p.projectType || undefined,
                    badge: p.code,
                    icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                  }))}
                  value={editProjectId}
                  onChange={(val) => {
                    setEditProjectId(val);
                    setEditPhaseId("");
                    if (val && val !== "OTHER") {
                      const found = projects.find((p) => p.id === val);
                      if (found?.projectType && !editTypology) {
                        setEditTypology(found.projectType);
                      }
                    }
                  }}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Project Reference..."
                  otherValue={editOtherProjectName}
                  onOtherValueChange={setEditOtherProjectName}
                  otherInputPlaceholder="Specify custom project code or client reference..."
                />

                <SearchableSelect
                  id="edit-select-phase"
                  label="Architectural Phase"
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  required={false}
                  placeholder="Select phase..."
                  searchPlaceholder="Search phases..."
                  options={[
                    { value: "", label: "General Project Deliverable", subLabel: "Not phase-specific" },
                    ...availableEditPhases.map((ph) => ({
                      value: ph.id,
                      label: `${ph.sortOrder}. ${ph.phaseName}`,
                    })),
                  ]}
                  value={editPhaseId}
                  onChange={setEditPhaseId}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Phase..."
                  otherValue={editOtherPhaseName}
                  onOtherValueChange={setEditOtherPhaseName}
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
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Prepare 1:20 Pergola Joinery Detail & Column Junctions"
                  className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                    isPrivileged || editModal.task.creatorId === currentMembershipId
                      ? "bg-[#F8F9FD] border-[#E2E6F0] focus:ring-2 focus:ring-[#5A81FA]"
                      : "bg-[#F2F4FF] border-[#E2E6F0] text-[#696E82] cursor-not-allowed"
                  }`}
                />
              </div>

              {/* 4. DESCRIPTION & BRIEF */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Architectural Brief & Instructions
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Specify material specifications, MEP coordination notes, or CAD layering rules..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* 5. ASSIGNEES (MULTI-SELECT) & PRIORITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SearchableSelect
                  id="edit-task-assignee"
                  label="Assignee(s)"
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  required={true}
                  placeholder="Select team member(s)..."
                  searchPlaceholder="Search team by name, ID or role..."
                  multiSelect={true}
                  values={editAssigneeIds}
                  onMultiChange={setEditAssigneeIds}
                  options={members.map((m) => {
                    const designation = m.employee?.designation ? `${m.employee.designation} (${m.role})` : m.role;
                    return {
                      value: m.id,
                      label: m.user.fullName,
                      subLabel: designation,
                      badge: m.employee?.employeeId || undefined,
                    };
                  })}
                  allowOther={true}
                  otherOptionLabel="+ Other / External Specialist or Freelancer..."
                  otherValue={editOtherAssigneeName}
                  onOtherValueChange={setEditOtherAssigneeName}
                  otherInputPlaceholder="Specify external specialist or consultant name..."
                  helperText="Select one or more employees assigned to this deliverable."
                />

                <SearchableSelect
                  id="edit-task-priority"
                  label="Priority"
                  disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                  required={false}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority level..."
                  options={[
                    { value: "LOW", label: "Low Priority", subLabel: "Routine drafting / non-blocking" },
                    { value: "MEDIUM", label: "Medium", subLabel: "Standard milestone deliverable" },
                    { value: "HIGH", label: "High Priority", subLabel: "Client deadline or review gate" },
                    { value: "URGENT", label: "Urgent (Monitored)", subLabel: "Critical path / Immediate escalation" },
                  ]}
                  value={editPriority}
                  onChange={setEditPriority}
                  allowOther={true}
                  otherOptionLabel="+ Other / Custom Priority Level..."
                  otherValue={editOtherPriorityName}
                  onOtherValueChange={setEditOtherPriorityName}
                  otherInputPlaceholder="Specify custom priority descriptor..."
                />
              </div>

              {/* 6. DUE DATE & ESTIMATED EFFORT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    disabled={!isPrivileged && editModal.task.creatorId !== currentMembershipId}
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-[#1F1F1F] focus:outline-none ${
                      isPrivileged || editModal.task.creatorId === currentMembershipId
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
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              {/* 7. DYNAMIC CHECKLIST ITEMS */}
              <div className="pt-2 border-t border-[#E2E6F0] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#1F1F1F]">Checklist Items / Deliverable Sub-Tasks</label>
                  <button
                    type="button"
                    onClick={handleAddEditChecklistField}
                    className="text-[11px] font-semibold text-[#5A81FA] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {editChecklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateEditChecklistItem(idx, e.target.value)}
                      placeholder={`Checklist item ${idx + 1} (e.g. Check waterproofing drop with structural drawings)`}
                      className="flex-1 p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F]"
                    />
                    {editChecklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditChecklistItem(idx)}
                        className="text-[#696E82] hover:text-red-600 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 8. DYNAMIC CUSTOM FIELDS */}
              <DynamicFormFields
                fields={customFields}
                values={editCustomFieldValues}
                onChange={handleEditCustomFieldChange}
                disabled={editing}
              />

              {/* 9. MODAL BUTTONS (WITH DELETE BUTTON) */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0]">
                {isPrivileged || editModal.task.creatorId === currentMembershipId || editModal.task.creator?.id === currentMembershipId ? (
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
      {/* 9. ASSIGN ARCHITECTURAL DELIVERABLE MODAL            */}
      {/* ==================================================== */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Assign Architectural Deliverable</h3>
                  <p className="text-xs text-[#696E82]">Configure deliverable requirements and assign individual checklists to team members</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-lg hover:bg-[#F2F4FF] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {/* 1. SELECT PROJECT & READ-ONLY TOPOLOGY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <div className="md:col-span-2">
                  <SearchableSelect
                    id="select-project"
                    label="Select Project"
                    required={true}
                    placeholder="Select project..."
                    searchPlaceholder="Search projects by code or name..."
                    options={projects.map((p) => ({
                      value: p.id,
                      label: `${p.code} — ${p.name}`,
                      subLabel: p.projectType || undefined,
                      badge: p.code,
                      icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                    }))}
                    value={selectedProjectId}
                    onChange={(val) => {
                      setSelectedProjectId(val);
                      setSelectedPhaseId("");
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.project;
                        return copy;
                      });
                    }}
                    allowOther={false}
                    error={formErrors.project}
                  />
                </div>

                {/* Read-Only Topology Display: Desktop on right, Mobile below */}
                <div className="md:col-span-1">
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Project Topology <span className="text-[10px] text-[#696E82] font-normal">(Read-only)</span>
                  </label>
                  {(() => {
                    const selProj = projects.find((p) => p.id === selectedProjectId);
                    if (selProj?.projectType) {
                      return (
                        <div className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex items-center gap-2">
                          <TypologyDot typology={selProj.projectType} />
                          <span className="font-semibold text-xs text-[#1F1F1F] truncate">{selProj.projectType}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-medium truncate">No topology configured</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 2. ARCHITECTURAL PHASE */}
              <div>
                <SearchableSelect
                  id="select-phase"
                  label="Architectural Phase"
                  required={false}
                  placeholder="Select phase (optional)..."
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
                  allowOther={false}
                />
              </div>

              {/* 3. ARCHITECTURAL BRIEF & INSTRUCTIONS (VOICE/GRAMMAR ASSISTANT OPTED-IN) */}
              <div id="field-brief">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#1F1F1F]">
                    Architectural Brief & Instructions <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[10px] text-[#696E82]">
                    Speech & Grammar Assistant enabled
                  </span>
                </div>
                <textarea
                  id="task-description-input"
                  rows={3}
                  required
                  data-enable-assistant="true"
                  value={taskDescription}
                  onChange={(e) => {
                    setTaskDescription(e.target.value);
                    if (formErrors.description) {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.description;
                        return copy;
                      });
                    }
                  }}
                  placeholder="Specify drafting requirements, sheet numbers, MEP coordination instructions, material specs, or review gates..."
                  className={`w-full p-2.5 bg-[#F8F9FD] border rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] transition-all ${
                    formErrors.description ? "border-red-400 bg-red-50/30" : "border-[#E2E6F0]"
                  }`}
                />
                {formErrors.description && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{formErrors.description}</p>
                )}
              </div>

              {/* 3.1 ACCEPTANCE CRITERIA (VOICE/GRAMMAR ASSISTANT OPTED-IN) */}
              <div id="field-acceptance-criteria">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#1F1F1F]">
                    Acceptance Criteria & Definition of Done
                  </label>
                  <span className="text-[10px] text-[#696E82]">
                    Speech Assistant enabled
                  </span>
                </div>
                <textarea
                  id="task-acceptance-criteria-input"
                  rows={2}
                  data-enable-assistant="true"
                  value={taskAcceptanceCriteria}
                  onChange={(e) => setTaskAcceptanceCriteria(e.target.value)}
                  placeholder="e.g. Dimensions verified with structural grid, AutoCAD layers comply with studio standards, PDF export stamped with GFC stamp..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] transition-all"
                />
              </div>

              {/* 4. OVERALL PRIORITY */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Overall Deliverable Priority <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: "LOW", label: "Low", color: "bg-emerald-50 text-emerald-800 border-emerald-300", desc: "Calm / Routine" },
                    { val: "MEDIUM", label: "Medium", color: "bg-amber-50 text-amber-800 border-amber-300", desc: "Standard gate" },
                    { val: "HIGH", label: "High", color: "bg-orange-50 text-orange-800 border-orange-300", desc: "Milestone gate" },
                    { val: "URGENT", label: "Urgent", color: "bg-rose-50 text-rose-800 border-rose-300", desc: "Critical path" },
                  ].map((p) => {
                    const isSelected = taskPriority === p.val;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setTaskPriority(p.val)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? `${p.color} ring-2 ring-offset-1 ring-[#5A81FA] font-bold shadow-xs`
                            : "bg-[#F8F9FD] border-[#E2E6F0] text-[#696E82] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{p.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-[10px] block opacity-80 mt-0.5">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. ELIGIBLE ASSIGNEES MULTISELECT */}
              <div id="field-assignees">
                <SearchableSelect
                  id="task-assignee"
                  label="Select Eligible Assignee(s)"
                  required={true}
                  placeholder="Select one or more team members..."
                  searchPlaceholder="Search team by name, ID or role..."
                  multiSelect={true}
                  values={taskAssigneeIds}
                  onMultiChange={handleAssigneesChange}
                  options={members.map((m) => {
                    const designation = m.employee?.designation ? `${m.employee.designation} (${m.role})` : m.role;
                    return {
                      value: m.id,
                      label: m.user.fullName,
                      subLabel: designation,
                      badge: m.employee?.employeeId || undefined,
                    };
                  })}
                  allowOther={false}
                  error={formErrors.assignees}
                  helperText="Each selected employee will receive an independent checklist section below."
                />
              </div>

              {/* 5.1 DESIGNATED REVIEWER (FOUR-EYES ENFORCEMENT) */}
              <div id="field-reviewer">
                <SearchableSelect
                  id="task-reviewer"
                  label="Designated Reviewer (Four-Eyes Gatekeeper)"
                  required={false}
                  placeholder="Select reviewer (must not be an assignee)..."
                  searchPlaceholder="Search reviewers..."
                  value={taskReviewerId}
                  onChange={setTaskReviewerId}
                  options={[
                    { value: "", label: "Default: Studio Leadership (Admin / Owner)", subLabel: "Review routed to leads" },
                    ...members
                      .filter((m) => !taskAssigneeIds.includes(m.id))
                      .map((m) => {
                        const designation = m.employee?.designation ? `${m.employee.designation} (${m.role})` : m.role;
                        return {
                          value: m.id,
                          label: m.user.fullName,
                          subLabel: designation,
                          badge: m.employee?.employeeId || undefined,
                        };
                      }),
                  ]}
                  allowOther={false}
                  helperText="Four-eyes rule: Selected reviewer cannot be an assignee on this deliverable."
                />
              </div>

              {/* 6. INDEPENDENT EMPLOYEE CHECKLIST SECTIONS */}
              {taskAssigneeIds.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#E2E6F0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#1F1F1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>Independent Employee Checklists</span>
                      </h4>
                      <p className="text-[11px] text-[#696E82]">
                        Define individual checklist tasks, priority levels, and deadlines for each assigned employee.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {taskAssigneeIds.map((empId) => {
                      const memberObj = members.find((m) => m.id === empId);
                      const rows = employeeChecklists[empId] || [];
                      const isExpanded = expandedEmployeeSections[empId] !== false;
                      const hasSectionError = formErrors[`emp-${empId}`] || rows.some((r) => formErrors[`chk-text-${r.id}`] || formErrors[`chk-date-${r.id}`]);

                      return (
                        <div
                          key={empId}
                          id={`emp-section-${empId}`}
                          className={`rounded-xl border transition-all ${
                            hasSectionError
                              ? "border-red-300 bg-red-50/20"
                              : "border-[#E2E6F0] bg-white shadow-2xs"
                          }`}
                        >
                          {/* Section Header */}
                          <div
                            onClick={() =>
                              setExpandedEmployeeSections((prev) => ({
                                ...prev,
                                [empId]: !isExpanded,
                              }))
                            }
                            className="p-3 flex items-center justify-between bg-[#F8F9FD] rounded-t-xl cursor-pointer hover:bg-[#F2F4FF] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-[#EBF1FF] text-[#5A81FA] font-bold text-[10px] flex items-center justify-center border border-[#CEDEFF] shrink-0">
                                {memberObj?.user.fullName ? memberObj.user.fullName.slice(0, 2).toUpperCase() : "EM"}
                              </div>
                              <span className="font-bold text-xs text-[#1F1F1F] truncate">
                                {memberObj?.user.fullName || "Assigned Employee"}
                              </span>
                              {memberObj?.employee?.employeeId && (
                                <span className="font-mono text-[10px] bg-white border border-[#DFE5F2] px-1.5 py-0.2 rounded text-[#5A81FA] shrink-0">
                                  {memberObj.employee.employeeId}
                                </span>
                              )}
                              {memberObj?.employee?.designation && (
                                <span className="text-[10px] text-[#696E82] hidden sm:inline truncate">
                                  • {memberObj.employee.designation}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-medium text-[#696E82] bg-white px-2 py-0.5 rounded border border-[#E2E6F0]">
                                {rows.length} {rows.length === 1 ? "task" : "tasks"}
                              </span>
                              <span className="text-[#696E82] text-xs">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                          </div>

                          {/* Section Tasks Content */}
                          {isExpanded && (
                            <div className="p-3 space-y-2.5">
                              {formErrors[`emp-${empId}`] && (
                                <p className="text-[11px] text-red-600 font-medium">
                                  {formErrors[`emp-${empId}`]}
                                </p>
                              )}

                              {rows.map((row, idx) => (
                                <div
                                  key={row.id}
                                  className="p-2.5 rounded-lg border border-[#E2E6F0] bg-[#FAFBFD] space-y-2"
                                >
                                  {/* Row 1: Task Description */}
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <input
                                        id={`chk-text-${row.id}`}
                                        type="text"
                                        data-enable-assistant="true"
                                        value={row.title}
                                        onChange={(e) =>
                                          handleUpdateEmployeeTask(empId, row.id, {
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder={`Task ${idx + 1}: e.g. Detail joinery junctions & waterproofing`}
                                        className={`w-full p-2 bg-white border rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] ${
                                          formErrors[`chk-text-${row.id}`]
                                            ? "border-red-400 bg-red-50/40"
                                            : "border-[#E2E6F0]"
                                        }`}
                                      />
                                      {formErrors[`chk-text-${row.id}`] && (
                                        <p className="text-[10px] text-red-600 font-medium mt-0.5">
                                          {formErrors[`chk-text-${row.id}`]}
                                        </p>
                                      )}
                                    </div>

                                    {rows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEmployeeTask(empId, row.id)}
                                        className="text-[#696E82] hover:text-red-600 p-1.5 rounded hover:bg-red-50 cursor-pointer transition-colors shrink-0"
                                        title="Remove task row"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Row 2: Priority and Due Date */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#E2E6F0]/60">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-[#696E82] shrink-0 font-medium">Priority:</span>
                                      <select
                                        value={row.priority}
                                        onChange={(e) =>
                                          handleUpdateEmployeeTask(empId, row.id, {
                                            priority: e.target.value as any,
                                          })
                                        }
                                        className="flex-1 p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                                      >
                                        <option value="LOW">Low (Calm)</option>
                                        <option value="MEDIUM">Medium (Standard)</option>
                                        <option value="HIGH">High (Milestone)</option>
                                        <option value="URGENT">Urgent (Critical)</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-[#696E82] shrink-0 font-medium">Due:</span>
                                      <div className="flex-1">
                                        <input
                                          id={`chk-date-${row.id}`}
                                          type="date"
                                          value={row.dueDate}
                                          onChange={(e) =>
                                            handleUpdateEmployeeTask(empId, row.id, {
                                              dueDate: e.target.value,
                                            })
                                          }
                                          className={`w-full p-1.5 bg-white border rounded-lg text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] ${
                                            formErrors[`chk-date-${row.id}`]
                                              ? "border-red-400 bg-red-50/40"
                                              : "border-[#E2E6F0]"
                                          }`}
                                        />
                                        {formErrors[`chk-date-${row.id}`] && (
                                          <p className="text-[10px] text-red-600 font-medium mt-0.5">
                                            {formErrors[`chk-date-${row.id}`]}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Add Task for Employee Button */}
                              <button
                                type="button"
                                onClick={() => handleAddEmployeeTask(empId)}
                                className="w-full py-1.5 px-3 border border-dashed border-[#5A81FA]/50 hover:border-[#5A81FA] bg-[#F2F4FF]/50 hover:bg-[#F2F4FF] text-[#5A81FA] rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add checklist task for {memberObj?.user.fullName || "employee"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estimated Hours (Optional) */}
              <div className="pt-2 border-t border-[#E2E6F0]">
                <label className="block font-semibold text-[#1F1F1F] mb-1">Estimated Deliverable Effort (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={taskEstimatedHours}
                  onChange={(e) => setTaskEstimatedHours(e.target.value)}
                  placeholder="e.g. 8 (optional studio capacity tracking)"
                  className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Dynamic Custom Fields */}
              <DynamicFormFields
                fields={customFields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                disabled={creatingTask}
              />

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E2E6F0] text-[#696E82] font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {creatingTask ? (
                    <span>Assigning Deliverable...</span>
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

      {/* Confirmation Modal for Discarding Checklist Tasks when removing an assignee */}
      {pendingMemberRemoval && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-[#1F1F1F]">Discard Checklist Tasks?</h4>
            </div>
            <p className="text-xs text-[#696E82]">
              {pendingMemberRemoval.memberName} currently has checklist tasks entered. Removing this team member will discard their tasks.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={cancelDiscardMember}
                className="px-3 py-1.5 bg-[#F2F4FF] hover:bg-[#E2E6F0] text-[#696E82] font-semibold rounded-xl text-xs cursor-pointer"
              >
                Keep Team Member
              </button>
              <button
                type="button"
                onClick={confirmDiscardMember}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Discard & Remove
              </button>
            </div>
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

      {/* ==================================================== */}
      {/* 13. WORKFLOW: BLOCKER MODAL                          */}
      {/* ==================================================== */}
      {blockerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${blockerModal.isResolving ? "bg-emerald-600" : "bg-red-600"}`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    {blockerModal.isResolving ? "Resolve Blocker" : "Report Work Blocker"}
                  </h3>
                  <p className="text-xs text-[#696E82] truncate max-w-[280px]">{blockerModal.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockerModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseOrResolveBlocker} className="space-y-4 text-xs">
              {blockerModal.isResolving ? (
                <div>
                  <label className="block font-semibold text-[#1F1F1F] mb-1">
                    Resolution Notes (How was this resolved?)
                  </label>
                  <textarea
                    rows={3}
                    value={blockerReasonInput}
                    onChange={(e) => setBlockerReasonInput(e.target.value)}
                    placeholder="e.g. Received updated structural grid from civil consultant; joinery clearance confirmed."
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-[#1F1F1F] mb-1">
                      Blocker Category <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={blockerCategory}
                      onChange={(e) => setBlockerCategory(e.target.value)}
                      className="w-full p-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                    >
                      <option value="DRAWINGS">Design & Drawing Discrepancy</option>
                      <option value="SITE_CONDITIONS">Site Condition / Survey Obstacle</option>
                      <option value="APPROVALS">Pending Approval / Client Gate</option>
                      <option value="CLIENT">Client Specification Missing</option>
                      <option value="MATERIALS">Material / Vendor Specification</option>
                      <option value="INTERNAL">Internal Coordination / Dependencies</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1F1F1F] mb-1">Severity Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setBlockerSeverity(sev)}
                          className={`p-2 rounded-xl border text-center font-bold text-[10px] cursor-pointer transition-all ${
                            blockerSeverity === sev
                              ? "bg-red-50 text-red-800 border-red-300 ring-2 ring-red-400"
                              : "bg-[#F8F9FD] border-[#E2E6F0] text-[#696E82]"
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1F1F1F] mb-1">
                      Detailed Blocker Explanation <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={blockerReasonInput}
                      onChange={(e) => setBlockerReasonInput(e.target.value)}
                      placeholder="Explain what is blocking progress and what input is needed from leadership..."
                      className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setBlockerModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlocker || (!blockerModal.isResolving && !blockerReasonInput.trim())}
                  className={`px-5 py-2 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 ${
                    blockerModal.isResolving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submittingBlocker ? "Processing..." : blockerModal.isResolving ? "Mark Resolved" : "Log Blocker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 14. WORKFLOW: DEADLINE EXTENSION MODAL               */}
      {/* ==================================================== */}
      {extensionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Request Due Date Extension</h3>
                  <p className="text-xs text-[#696E82] truncate max-w-[280px]">{extensionModal.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtensionModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestExtension} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Proposed New Deadline <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={extensionProposedDate}
                  onChange={(e) => setExtensionProposedDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {extensionModal.currentDueDate && (
                  <p className="text-[11px] text-[#696E82] mt-1">
                    Current due date: <strong>{new Date(extensionModal.currentDueDate).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Reason for Extension <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={extensionReasonInput}
                  onChange={(e) => setExtensionReasonInput(e.target.value)}
                  placeholder="Explain why the timeline shifted and steps taken to mitigate delays..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setExtensionModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExtension || !extensionProposedDate || !extensionReasonInput.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingExtension ? "Submitting..." : "Submit Extension Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 15. WORKFLOW: VERSIONED SUBMISSION MODAL             */}
      {/* ==================================================== */}
      {submissionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Submit Deliverable for Review</h3>
                  <p className="text-xs text-[#696E82]">Creates an immutable snapshot of completed items and evidence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVersionedSnapshot} className="space-y-4 text-xs">
              {/* Acceptance Criteria Snapshot */}
              {submissionModal.task.acceptanceCriteria && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <span className="font-bold text-blue-950 uppercase text-[10px] block">
                    Review Gate Acceptance Criteria:
                  </span>
                  <p className="text-blue-900 leading-relaxed whitespace-pre-line text-xs">
                    {submissionModal.task.acceptanceCriteria}
                  </p>
                </div>
              )}

              {/* Checklist Task Selection */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Select Checklist Tasks Included in this Submission:
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-[#E2E6F0] rounded-xl p-2 bg-[#F8F9FD]">
                  {submissionModal.task.checklistItems.map((ci) => {
                    const isChecked = submissionSelectedItems.includes(ci.id);
                    return (
                      <label
                        key={ci.id}
                        className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-[#E2E6F0] hover:bg-[#F2F4FF] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubmissionSelectedItems((prev) => [...prev, ci.id]);
                            } else {
                              setSubmissionSelectedItems((prev) => prev.filter((id) => id !== ci.id));
                            }
                          }}
                          className="rounded text-[#5A81FA]"
                        />
                        <span className="text-xs font-medium text-[#1F1F1F] truncate flex-1">{ci.title}</span>
                        {ci.isCompleted && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded">
                            Done
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submission Summary */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Submission Summary / Scope Delivered <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={submissionSummary}
                  onChange={(e) => setSubmissionSummary(e.target.value)}
                  placeholder="e.g. Completed 1:20 joinery detail sheets A-301 through A-304. Updated column junction waterproofing as requested."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Evidence Links */}
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Drawing / Evidence File URLs (One per line)
                </label>
                <textarea
                  rows={2}
                  value={submissionEvidenceLinks}
                  onChange={(e) => setSubmissionEvidenceLinks(e.target.value)}
                  placeholder="https://drive.google.com/file/...&#10;https://bim360.autodesk.com/..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA] font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setSubmissionModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSnapshot || !submissionSummary.trim()}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingSnapshot ? "Submitting..." : "Submit Version Snapshot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 16. WORKFLOW: REVIEW DECISION MODAL                  */}
      {/* ==================================================== */}
      {reviewDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                    reviewDecisionModal.action === "APPROVE" ? "bg-emerald-600" : "bg-amber-600"
                  }`}
                >
                  {reviewDecisionModal.action === "APPROVE" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    {reviewDecisionModal.action === "APPROVE"
                      ? "Approve Deliverable Submission"
                      : "Request Architectural Corrections"}
                  </h3>
                  <p className="text-xs text-[#696E82]">Enforcing Four-Eyes Quality Assurance Gate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewDecisionModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewDecision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  {reviewDecisionModal.action === "APPROVE"
                    ? "Approval Comments (Optional)"
                    : "Correction Instructions (Mandatory) *"}
                </label>
                <textarea
                  rows={3}
                  required={reviewDecisionModal.action === "REQUEST_CHANGES"}
                  value={reviewFeedbackInput}
                  onChange={(e) => setReviewFeedbackInput(e.target.value)}
                  placeholder={
                    reviewDecisionModal.action === "APPROVE"
                      ? "e.g. Verified drawings meet all AIA specifications. Ready for client issuance."
                      : "e.g. Please revise joinery sheet A-302: pergolas require 12mm expansion bolt specifications."
                  }
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setReviewDecisionModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision || (reviewDecisionModal.action === "REQUEST_CHANGES" && !reviewFeedbackInput.trim())}
                  className={`px-5 py-2 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 ${
                    reviewDecisionModal.action === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {submittingDecision
                    ? "Recording Decision..."
                    : reviewDecisionModal.action === "APPROVE"
                    ? "Confirm Approval"
                    : "Send Requested Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 17. WORKFLOW: REOPEN COMPLETED TASK MODAL            */}
      {/* ==================================================== */}
      {reopenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Reopen Completed Task</h3>
                  <p className="text-xs text-[#696E82] truncate max-w-[280px]">{reopenModal.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReopenModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopenItem} className="space-y-4 text-xs">
              <p className="text-[#696E82]">
                Studio governance policy requires an audit justification whenever completed work is reopened.
              </p>

              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Reason for Reopening <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="e.g. Client requested alteration to balcony railing detail after initial milestone sign-off."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setReopenModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen || !reopenReasonInput.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReopen ? "Reopening..." : "Confirm Reopen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 18. WORKFLOW: REPLY TO CLARIFICATION MODAL           */}
      {/* ==================================================== */}
      {replyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Reply to Clarification</h3>
                  <p className="text-xs text-[#696E82]">Provide guidance to assigned staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs space-y-1">
              <span className="font-bold text-[#696E82] block">Question:</span>
              <p className="text-[#1F1F1F] leading-relaxed">{replyModal.question}</p>
            </div>

            <form onSubmit={handleReplyClarification} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F1F1F] mb-1">
                  Your Answer / Clarification <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyMessageInput}
                  onChange={(e) => setReplyMessageInput(e.target.value)}
                  placeholder="Provide clarification, link approved drawing revision, or confirm specification..."
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setReplyModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReply || !replyMessageInput.trim()}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReply ? "Posting..." : "Post Answer"}
                </button>
              </div>
            </form>
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
