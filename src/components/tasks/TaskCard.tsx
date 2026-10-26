"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Eye,
  Pencil,
  ArrowRightLeft,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  Users,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { TaskStatusDropdown } from "./TaskStatusDropdown";
import { AssigneeInfo } from "./TaskAssignees";
import { sanitizeTaskDescription, getCleanTaskTitle } from "./task-utils";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";

export interface TaskCardProps {
  task: any;
  assignees?: AssigneeInfo[];
  currentMembershipId: string;
  isPrivileged: boolean;
  canEdit: boolean;
  canDelete: boolean;
  workspaceTimezone?: string;
  customFields?: CustomFieldDefinition[];
  customValues?: Record<string, any>;
  isLoadingStatus?: boolean;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onOpenDetails: (task: any, assignmentId?: string) => void;
  onEdit: (task: any) => void;
  onDelegate: (task: any) => void;
  onDelete: (task: any) => void;
  onRequestChanges?: (task?: any, submissionId?: string) => void;
  onToggleChecklist?: (taskId: string, itemId: string, currentStatus: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers: Timezone-aware date & time formatting
// ---------------------------------------------------------------------------
function formatDateTimeWithTimezone(dateInput: any, timezone: string = "Asia/Kolkata"): string {
  if (!dateInput) return "No deadline";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "No deadline";

    // Detect if hours or minutes are present (non-zero UTC)
    const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(hasTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
    };
    return new Intl.DateTimeFormat("en-GB", options).format(d);
  } catch {
    return "No deadline";
  }
}

// ---------------------------------------------------------------------------
// Helpers: Priority badge configuration
// ---------------------------------------------------------------------------
function getPriorityBadgeConfig(priority?: string) {
  const p = (priority || "MEDIUM").toUpperCase();
  if (p === "URGENT") {
    return {
      label: "Urgent",
      icon: "↑",
      classes: "bg-[#fff1f2] text-[#be123c] border-[#fecdd3]",
    };
  }
  if (p === "HIGH") {
    return {
      label: "High",
      icon: "↑",
      classes: "bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]",
    };
  }
  if (p === "LOW") {
    return {
      label: "Low",
      icon: "↓",
      classes: "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]",
    };
  }
  return {
    label: "Medium",
    icon: "↑",
    classes: "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
  };
}

// ---------------------------------------------------------------------------
// Workflow concept keys & styling
// ---------------------------------------------------------------------------
type WorkflowConceptKey =
  | "AWAITING_ACK"
  | "IN_PROGRESS"
  | "AWAITING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED";

interface WorkflowStatusConfig {
  key: WorkflowConceptKey;
  label: string;
  icon: string;
  classes: string;
}

function getWorkflowStatusConfig(key: WorkflowConceptKey): WorkflowStatusConfig {
  switch (key) {
    case "APPROVED":
      return {
        key: "APPROVED",
        label: "Approved / Completed",
        icon: "✓",
        classes: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
      };
    case "AWAITING_REVIEW":
      return {
        key: "AWAITING_REVIEW",
        label: "Submitted / Awaiting review",
        icon: "🔍",
        classes: "bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]",
      };
    case "CHANGES_REQUESTED":
      return {
        key: "CHANGES_REQUESTED",
        label: "Changes requested",
        icon: "🔄",
        classes: "bg-[#fff1f2] text-[#be123c] border-[#fecdd3]",
      };
    case "IN_PROGRESS":
      return {
        key: "IN_PROGRESS",
        label: "Acknowledged / In progress",
        icon: "⚡",
        classes: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
      };
    case "AWAITING_ACK":
    default:
      return {
        key: "AWAITING_ACK",
        label: "Awaiting acknowledgement",
        icon: "⏳",
        classes: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
      };
  }
}

export const TaskCard = React.memo(function TaskCard({
  task,
  assignees = [],
  currentMembershipId,
  isPrivileged,
  canEdit,
  canDelete,
  workspaceTimezone = "Asia/Kolkata",
  isLoadingStatus = false,
  onUpdateStatus,
  onOpenDetails,
  onEdit,
  onDelegate,
  onDelete,
  onToggleChecklist,
}: TaskCardProps) {
  const [isDetailsTrayExpanded, setIsDetailsTrayExpanded] = useState(false);
  // Expand/collapse tracking for employee checklists: record<membershipId, boolean>
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklistExpand = (memberId: string) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // Clean deliverable brief notes
  const cleanDescription = useMemo(() => {
    return sanitizeTaskDescription(task.description) || task.description || "";
  }, [task.description]);

  // Formatted Created Date (e.g. 7 Oct 2026)
  const formattedCreatedAt = useMemo(() => {
    if (!task.createdAt) return "Recently";
    try {
      return new Date(task.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  }, [task.createdAt]);

  // Top-Right Deliverable Status Badge Configuration
  const deliverableStatusBadgeConfig = useMemo(() => {
    const norm = (task.status || "").toUpperCase();
    if (norm === "COMPLETED") {
      return {
        label: "Completed",
        icon: "✓",
        classes: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
      };
    }
    if (norm === "CHECKING" || norm === "IN_REVIEW") {
      return {
        label: "In Review",
        icon: "🔍",
        classes: "bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]",
      };
    }
    if (norm === "ONGOING" || norm === "IN_PROGRESS") {
      return {
        label: "In Progress",
        icon: "⚡",
        classes: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
      };
    }
    if (norm === "STARTED") {
      return {
        label: "Started",
        icon: "▶",
        classes: "bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]",
      };
    }
    if (norm === "CHANGES_REQUESTED" || norm === "REVISION") {
      return {
        label: "Revision",
        icon: "🔄",
        classes: "bg-[#fff1f2] text-[#be123c] border-[#fecdd3]",
      };
    }
    return {
      label: "Todo",
      icon: "📋",
      classes: "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]",
    };
  }, [task.status]);

  // Project details
  const projectCode = task.project?.code || "PRJ";
  const projectName = task.project?.name || "Architecture Project";
  const projectInitials = useMemo(() => {
    return (
      projectName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "PR"
    );
  }, [projectName]);

  // Accurate Overdue logic for Parent Deliverable:
  // ONLY overdue if deadline has passed AND deliverable is not finished!
  const isParentOverdue = useMemo(() => {
    if (!task.dueDate) return false;
    const isFinished = task.status === "COMPLETED" || task.status === "CANCELLED";
    if (isFinished) return false;
    try {
      const due = new Date(task.dueDate);
      return !isNaN(due.getTime()) && due.getTime() < Date.now();
    } catch {
      return false;
    }
  }, [task.dueDate, task.status]);

  // =========================================================================
  // Process Employee Assignments & Individual Checklists
  // =========================================================================
  const employeeSections = useMemo(() => {
    const rawAssignments: any[] = Array.isArray(task.assignments) ? task.assignments : [];
    const rawChecklist: any[] = Array.isArray(task.checklistItems) ? task.checklistItems : [];
    const rawSubmissions: any[] = Array.isArray(task.submissions) ? task.submissions : [];

    // Collect distinct assigned membership IDs
    const memberIdSet = new Set<string>();
    rawAssignments.forEach((a) => {
      if (a.membershipId) memberIdSet.add(a.membershipId);
    });
    if (Array.isArray(task.assignedMemberIds)) {
      task.assignedMemberIds.forEach((id: string) => {
        if (id) memberIdSet.add(id);
      });
    }
    if (task.assigneeId) memberIdSet.add(task.assigneeId);
    if (Array.isArray(assignees)) {
      assignees.forEach((a) => {
        if (a.id) memberIdSet.add(a.id);
      });
    }
    // Also include anyone who has an assigned checklist item
    rawChecklist.forEach((ci) => {
      if (ci.assignedMemberId) memberIdSet.add(ci.assignedMemberId);
    });

    const memberIds = Array.from(memberIdSet);
    const nowMs = Date.now();

    return memberIds.map((memberId) => {
      // 1. Linked TaskAssignment record
      const assignment = rawAssignments.find((a) => a.membershipId === memberId);
      const assignmentId = assignment?.id || `assign-${memberId}`;

      // 2. Member identification
      const assignInfo = assignees.find((a) => a.id === memberId || (a as any).membershipId === memberId);
      const assignmentMember = assignment?.membership;
      const taskAssigneeMatch = task.assignee && (task.assignee.id === memberId || task.assigneeId === memberId) ? task.assignee : null;

      const fullName =
        assignmentMember?.user?.fullName ||
        assignInfo?.user?.fullName ||
        taskAssigneeMatch?.user?.fullName ||
        (typeof (assignInfo as any)?.name === "string" ? (assignInfo as any).name : null) ||
        "Team Member";

      const employeeId =
        assignmentMember?.employee?.employeeId ||
        assignInfo?.employee?.employeeId ||
        taskAssigneeMatch?.employee?.employeeId ||
        (assignInfo as any)?.employeeId ||
        "";

      const designation =
        assignmentMember?.employee?.designation ||
        assignInfo?.employee?.designation ||
        taskAssigneeMatch?.employee?.designation ||
        "";

      const initials = fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "TM";

      const isCurrentUser = memberId === currentMembershipId;

      // 3. Employee's specific checklist items
      // Never combine items: match strictly on assignedMemberId (or fallback if only 1 member)
      const employeeChecklist = rawChecklist.filter((ci) => {
        if (ci.assignedMemberId) return ci.assignedMemberId === memberId;
        return memberIds.length === 1;
      });

      const totalChecklistCount = employeeChecklist.length;
      const completedChecklistCount = employeeChecklist.filter(
        (ci) => ci.isCompleted || ci.status === "COMPLETED"
      ).length;
      const checklistProgressPct =
        totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

      // 4. Employee's submissions
      const employeeSubmissions = rawSubmissions.filter((s) => s.submitterId === memberId);
      const latestSubmission = employeeSubmissions[0]; // ordered desc
      const pendingSubmission = employeeSubmissions.find((s) => s.status === "PENDING");

      // 5. Employee Priority: Highest among their checklist items, fallback to task.priority
      let empPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
      const prioritiesInChecklist = employeeChecklist.map((ci) => (ci.priority || "").toUpperCase());
      if (prioritiesInChecklist.includes("URGENT")) {
        empPriority = "URGENT";
      } else if (prioritiesInChecklist.includes("HIGH")) {
        empPriority = "HIGH";
      } else if (prioritiesInChecklist.includes("LOW") && !prioritiesInChecklist.includes("MEDIUM")) {
        empPriority = "LOW";
      } else if (task.priority) {
        empPriority = task.priority.toUpperCase() as any;
      }
      const priorityConfig = getPriorityBadgeConfig(empPriority);

      // 6. Employee Deadline: Latest due date among their checklist items, fallback to task.dueDate
      let latestEmployeeDueDate: any = null;
      for (const item of employeeChecklist) {
        if (item.dueDate) {
          const d = new Date(item.dueDate);
          if (!isNaN(d.getTime())) {
            if (!latestEmployeeDueDate || d > latestEmployeeDueDate) {
              latestEmployeeDueDate = d;
            }
          }
        }
      }
      if (!latestEmployeeDueDate && task.dueDate) {
        const d = new Date(task.dueDate);
        if (!isNaN(d.getTime())) latestEmployeeDueDate = d;
      }

      const formattedDeadline = formatDateTimeWithTimezone(latestEmployeeDueDate, workspaceTimezone);

      // 7. Workflow Status: Map strictly to the 5 requested concepts
      // Concept 1: Approved / Completed
      const isApproved = Boolean(
        assignment?.isCompleted ||
        latestSubmission?.status === "APPROVED" ||
        (totalChecklistCount > 0 && completedChecklistCount === totalChecklistCount && assignment?.isCompleted)
      );

      // Concept 2: Submitted / Awaiting review
      const isAwaitingReview = Boolean(
        task.status === "CHECKING" ||
        task.status === "IN_REVIEW" ||
        pendingSubmission !== undefined ||
        employeeChecklist.some((ci) => ci.status === "IN_REVIEW" || ci.status === "CHECKING")
      );

      // Concept 3: Changes requested
      const isChangesRequested = Boolean(
        latestSubmission?.status === "CHANGES_REQUESTED" ||
        latestSubmission?.status === "REWORK_REQUESTED" ||
        employeeChecklist.some((ci) => ci.status === "CHANGES_REQUESTED")
      );

      // Concept 4: Acknowledged / In progress
      const isAcknowledged = Boolean(
        assignment?.acknowledgedAt ||
        completedChecklistCount > 0 ||
        employeeChecklist.some((ci) => ci.status === "IN_PROGRESS" || ci.status === "STARTED")
      );

      let conceptKey: WorkflowConceptKey = "AWAITING_ACK";
      if (isApproved) {
        conceptKey = "APPROVED";
      } else if (isAwaitingReview) {
        conceptKey = "AWAITING_REVIEW";
      } else if (isChangesRequested) {
        conceptKey = "CHANGES_REQUESTED";
      } else if (isAcknowledged) {
        conceptKey = "IN_PROGRESS";
      } else {
        conceptKey = "AWAITING_ACK";
      }
      const workflowStatus = getWorkflowStatusConfig(conceptKey);

      // Overdue logic per employee:
      // Overdue ONLY if deadline < now AND status is not Approved / Completed!
      const isOverdue = Boolean(
        latestEmployeeDueDate &&
        new Date(latestEmployeeDueDate).getTime() < nowMs &&
        !isApproved
      );

      return {
        memberId,
        assignmentId,
        fullName,
        employeeId,
        designation,
        initials,
        isCurrentUser,
        checklistItems: employeeChecklist,
        totalChecklistCount,
        completedChecklistCount,
        checklistProgressPct,
        priority: empPriority,
        priorityConfig,
        deadline: latestEmployeeDueDate,
        formattedDeadline,
        isOverdue,
        workflowStatus,
        isApproved,
        isAwaitingReview,
        isChangesRequested,
        isAcknowledged,
        pendingSubmission,
        latestSubmission,
      };
    });
  }, [
    task.assignments,
    task.checklistItems,
    task.submissions,
    task.assignedMemberIds,
    task.assigneeId,
    task.assignee,
    task.priority,
    task.dueDate,
    assignees,
    currentMembershipId,
    workspaceTimezone,
  ]);

  // =========================================================================
  // Parent Deliverable Overall Progress & Metrics (Section 5)
  // =========================================================================
  const totalAssignedEmployees = employeeSections.length;
  const allChecklistItems: any[] = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  const totalChecklistItems = allChecklistItems.length;
  const totalCompletedChecklistItems = allChecklistItems.filter(
    (ci) => ci.isCompleted || ci.status === "COMPLETED"
  ).length;

  // Calculated strictly from actual checklist counts, not unweighted averages
  const parentChecklistProgressPct =
    totalChecklistItems > 0
      ? Math.round((totalCompletedChecklistItems / totalChecklistItems) * 100)
      : 0;

  const awaitingReviewCount = employeeSections.filter((emp) => emp.isAwaitingReview).length;
  const approvedCount = employeeSections.filter((emp) => emp.isApproved).length;
  const displayTitle = getCleanTaskTitle(task.title, projectCode, projectName);

  return (
    <article
      className="task-card rounded-2xl bg-white border border-[#E2E6F0] hover:border-[#CBD5E1] p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition-all duration-150 group relative min-w-0 gap-3 text-left virtual-render press-feedback"
      style={{ overflowWrap: "anywhere" }}
      aria-label={`Deliverable: ${displayTitle}`}
    >
      {/* ============================================================== */}
      {/* 1. HEADER: Project Badge & Discipline + Status Badges          */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <div className="w-5 h-5 rounded-full bg-[#a21caf] text-white flex items-center justify-center font-semibold text-[10px] shrink-0 shadow-2xs">
            {projectInitials}
          </div>
          <span className="font-mono type-badge font-semibold text-[#c026d3] bg-[#fdf2f8] border border-[#fbcfe8] px-1.5 py-0.2 rounded shrink-0">
            {projectCode}
          </span>
          <div className="flex items-center gap-1 text-slate-500 type-badge">
            <Layers className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">Architectural Deliverable</span>
          </div>
          {task.phase?.phaseName && (
            <span className="type-badge text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
              {task.phase.phaseName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isParentOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full type-badge font-medium bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
              <span>Overdue</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full type-badge font-medium border shadow-2xs ${deliverableStatusBadgeConfig.classes}`}
          >
            <span className="font-bold">{deliverableStatusBadgeConfig.icon}</span>
            <span>{deliverableStatusBadgeConfig.label}</span>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DELIVERABLE TITLE & PROJECT CONTEXT                         */}
      {/* ============================================================== */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => onOpenDetails(task)}
          className="text-left w-full group/title cursor-pointer focus:outline-none"
        >
          <h3 className="type-card-title text-slate-900 group-hover/title:text-blue-600 transition-colors line-clamp-1 font-semibold leading-tight">
            {displayTitle}
          </h3>
        </button>

        <div className="flex items-center gap-2 type-helper text-slate-500 flex-wrap">
          <span>Project: <strong className="text-slate-700 font-semibold">{projectName}</strong></span>
          {cleanDescription && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 truncate max-w-[200px] sm:max-w-[280px]">{cleanDescription}</span>
            </>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CONSOLIDATED PROGRESS & STATS STRIP                         */}
      {/* ============================================================== */}
      <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="type-badge font-semibold">
              Checklist {totalCompletedChecklistItems}/{totalChecklistItems} ({parentChecklistProgressPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5 type-badge font-medium shrink-0">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              {approvedCount}/{totalAssignedEmployees} approved
            </span>
            {awaitingReviewCount > 0 && (
              <span className="text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                {awaitingReviewCount} in review
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              parentChecklistProgressPct === 100
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-blue-500 to-indigo-600"
            }`}
            style={{ width: `${parentChecklistProgressPct}%` }}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ASSIGNED RESPONSIBILITIES: COMPACT, PROMINENT EMPLOYEE LIST */}
      {/* ============================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="type-badge font-semibold text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Assigned responsibilities ({totalAssignedEmployees})</span>
          </span>
          <span className="type-helper text-slate-400">Tracked individually</span>
        </div>

        {employeeSections.length === 0 ? (
          <div className="py-2 px-3 text-center border border-dashed border-slate-200 rounded-xl type-helper text-slate-400">
            No employees currently assigned.
          </div>
        ) : (
          <div className="space-y-2">
            {employeeSections.map((emp) => (
              <div
                key={emp.memberId}
                className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-all text-xs space-y-1.5"
              >
                {/* Row 1: Avatar + FULL NAME clearly visible & bold + Priority + Action */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                      {emp.initials}
                    </div>
                    {/* EMPLOYEE FULL NAME: CLEARLY VISIBLE, PROMINENT & BOLD */}
                    <span className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight truncate">
                      {emp.fullName}
                    </span>
                    {emp.isCurrentUser && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded font-bold shrink-0">
                        You
                      </span>
                    )}
                    {emp.employeeId && (
                      <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 rounded shrink-0 hidden sm:inline">
                        {emp.employeeId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Priority Pill */}
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${emp.priorityConfig.classes}`}>
                      <span>{emp.priorityConfig.icon}</span>
                      <span>{emp.priorityConfig.label}</span>
                    </span>

                    {/* Review Submission button if awaiting review, otherwise details button */}
                    {emp.isAwaitingReview ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(task, emp.assignmentId);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Review Submission"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(task, emp.assignmentId);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View Checklist & Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Workflow Status Badge + Due Date + Checklist Counts */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 text-[11px]">
                  {/* Employee Workflow Status Badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shadow-2xs ${emp.workflowStatus.classes} shrink-0`}>
                    <span className="font-bold">{emp.workflowStatus.icon}</span>
                    <span>{emp.workflowStatus.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5 text-slate-500 truncate ml-auto text-[11px]">
                    <span className="truncate">Due {emp.formattedDeadline}</span>
                    {emp.isOverdue && (
                      <span className="text-rose-600 font-bold text-[9px] bg-rose-50 px-1 rounded border border-rose-200 shrink-0">
                        Overdue
                      </span>
                    )}
                    {emp.totalChecklistCount > 0 && (
                      <span className="text-slate-400 font-medium shrink-0">
                        • {emp.completedChecklistCount}/{emp.totalChecklistCount} tasks
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. FOOTER ACTIONS: STATUS DROPDOWN + DETAILS + EDIT/DELEGATE/DEL */}
      {/* ============================================================== */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <TaskStatusDropdown
            currentStatus={task.status}
            isLoading={isLoadingStatus}
            onSelectStatus={(newStatus) => onUpdateStatus(task.id, newStatus)}
            variant="select"
            fullWidth
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(task);
            }}
            className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/70 text-blue-600 type-button-label flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>Details</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!canEdit}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) onEdit(task);
            }}
            className={`p-1.5 rounded-lg border border-slate-200/90 type-badge flex items-center transition-colors shadow-2xs ${
              canEdit ? "bg-white text-slate-700 hover:bg-slate-50 cursor-pointer" : "bg-slate-50 text-slate-300 cursor-not-allowed"
            }`}
            title="Edit Task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelegate(task);
            }}
            className="p-1.5 rounded-lg border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 type-badge flex items-center transition-colors cursor-pointer shadow-2xs"
            title="Delegate Responsibility"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>

          {canDelete || isPrivileged ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              className="p-1.5 rounded-lg border border-slate-200/90 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
});
