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
} from "lucide-react";
import { TaskStatusDropdown } from "./TaskStatusDropdown";
import { AssigneeInfo } from "./TaskAssignees";
import { sanitizeTaskDescription } from "./task-utils";
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

export function TaskCard({
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

  return (
    <article
      className="task-card rounded-2xl bg-white border border-[#e2e8f0] shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 transition-all duration-200 group relative min-w-0 gap-4"
      style={{ overflowWrap: "anywhere" }}
      aria-label={`Deliverable: ${task.title}`}
    >
      {/* ============================================================== */}
      {/* HEADER: Project Code & Name (Left) + Overall Deliverable Status */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-full bg-[#a21caf] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
            {projectInitials}
          </div>
          <span className="font-mono text-xs font-bold text-[#c026d3] bg-[#fdf2f8] border border-[#fbcfe8] px-2 py-0.5 rounded-md shrink-0">
            {projectCode}
          </span>
          <span
            className="font-bold text-sm sm:text-[15px] text-[#0f172a] truncate"
            title={projectName}
          >
            {projectName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isParentOverdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Overdue</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${deliverableStatusBadgeConfig.classes}`}
          >
            <span className="font-bold">{deliverableStatusBadgeConfig.icon}</span>
            <span>{deliverableStatusBadgeConfig.label}</span>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* INSET DELIVERABLE BRIEF (Title + Architectural Instructions)   */}
      {/* ============================================================== */}
      <div className="bg-[#f8faff] border border-[#e2e8f0] rounded-xl p-3.5 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 text-blue-600">
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              ARCHITECTURAL DELIVERABLE
            </span>
          </div>

          {task.phase?.phaseName && (
            <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
              Phase: {task.phase.phaseName}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenDetails(task)}
          className="text-left w-full group/title cursor-pointer focus:outline-none"
        >
          <h4 className="text-[14px] sm:text-[15px] font-bold text-slate-900 group-hover/title:text-blue-600 transition-colors line-clamp-1 leading-snug">
            {task.title || "Untitled Deliverable"}
          </h4>
        </button>

        <p className="text-xs sm:text-[13px] text-slate-600 font-normal mt-1.5 line-clamp-2 leading-relaxed">
          {cleanDescription || "No specific architectural instructions provided."}
        </p>
      </div>

      {/* ============================================================== */}
      {/* SECTION 5: ACCURATE PARENT PROGRESS & SUMMARY STRIP            */}
      {/* ============================================================== */}
      <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Number of Assigned Employees */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs">
              <Users className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span>
                {totalAssignedEmployees} {totalAssignedEmployees === 1 ? "Employee" : "Employees"}
              </span>
            </span>

            {/* Total Completed Checklist Items / Total Checklist Items */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {totalChecklistItems > 0
                  ? `${totalCompletedChecklistItems}/${totalChecklistItems} Checklist Items (${parentChecklistProgressPct}%)`
                  : "0 Checklist Items"}
              </span>
            </span>

            {/* Number of Approved Employee Assignments */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {approvedCount} of {totalAssignedEmployees} Approved
              </span>
            </span>

            {/* Number of Employee Assignments Awaiting Review */}
            {awaitingReviewCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs shadow-2xs animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                <span>{awaitingReviewCount} Awaiting Review</span>
              </span>
            )}
          </div>

          <div className="text-[11px] font-semibold text-slate-500 ml-auto">
            {parentChecklistProgressPct}% Completed
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
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
      {/* SECTION 4: REDESIGNED SEPARATED EMPLOYEE ASSIGNMENT SECTIONS  */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3 h-3 text-slate-400" />
            <span>ASSIGNED RESPONSIBILITIES ({totalAssignedEmployees})</span>
          </div>
          <span className="text-[10px] text-slate-400">Independent tracking</span>
        </div>

        {employeeSections.length === 0 ? (
          <div className="p-3 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            No employees currently assigned.
          </div>
        ) : (
          <div className="space-y-2.5">
            {employeeSections.map((emp) => {
              const isChecklistExpanded = Boolean(expandedChecklists[emp.memberId]);
              const visibleChecklistItems = isChecklistExpanded
                ? emp.checklistItems
                : emp.checklistItems.slice(0, 2);

              return (
                <div
                  key={emp.memberId}
                  className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all p-3.5 space-y-3 shadow-2xs text-left"
                >
                  {/* Top: Employee Avatar, Name, Employee ID, Priority, and Workflow Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Left: Avatar + Name + ID */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {emp.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {emp.fullName}
                          </span>
                          {emp.employeeId && (
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {emp.employeeId}
                            </span>
                          )}
                          {emp.isCurrentUser && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 rounded shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        {emp.designation && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {emp.designation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Employee Priority Badge & Workflow Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {/* Priority Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${emp.priorityConfig.classes}`}
                        title={`Priority: ${emp.priorityConfig.label}`}
                      >
                        <span className="font-bold">{emp.priorityConfig.icon}</span>
                        <span>{emp.priorityConfig.label}</span>
                      </span>

                      {/* Workflow Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${emp.workflowStatus.classes}`}
                      >
                        <span className="font-bold">{emp.workflowStatus.icon}</span>
                        <span>{emp.workflowStatus.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Middle Meta Strip: Deadline & Checklist Progress Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    {/* Deadline */}
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">Due:</span>
                      <span className="font-medium text-slate-800">{emp.formattedDeadline}</span>
                      {emp.isOverdue && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Checklist Progress */}
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {emp.completedChecklistCount}/{emp.totalChecklistCount} completed
                      </span>
                      {emp.totalChecklistCount > 0 && (
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${emp.checklistProgressPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employee's Dedicated Checklist Items */}
                  {emp.totalChecklistCount > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <ul className="space-y-1">
                        {visibleChecklistItems.map((item: any, idx: number) => {
                          const isDone = item.isCompleted || item.status === "COMPLETED";
                          const itemPriority = item.priority ? getPriorityBadgeConfig(item.priority) : null;
                          const itemDue = item.dueDate
                            ? formatDateTimeWithTimezone(item.dueDate, workspaceTimezone)
                            : null;

                          return (
                            <li
                              key={item.id || idx}
                              className={`flex items-start justify-between gap-2 p-1.5 rounded-lg border text-xs transition-colors ${
                                isDone
                                  ? "bg-emerald-50/30 border-emerald-100 text-slate-500"
                                  : "bg-[#FAFAFD] border-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <button
                                  type="button"
                                  disabled={!onToggleChecklist || (!isPrivileged && !emp.isCurrentUser)}
                                  onClick={() =>
                                    onToggleChecklist &&
                                    onToggleChecklist(task.id, item.id, item.isCompleted)
                                  }
                                  className={`mt-0.5 shrink-0 ${
                                    onToggleChecklist && (isPrivileged || emp.isCurrentUser)
                                      ? "cursor-pointer"
                                      : "cursor-default"
                                  }`}
                                  title={
                                    onToggleChecklist && (isPrivileged || emp.isCurrentUser)
                                      ? "Toggle item completion"
                                      : "Designated employee or manager action"
                                  }
                                >
                                  {isDone ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                                <span
                                  className={`break-words leading-relaxed ${
                                    isDone ? "line-through text-slate-400" : "font-medium"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                {itemPriority && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded border font-semibold ${itemPriority.classes}`}
                                  >
                                    {itemPriority.label}
                                  </span>
                                )}
                                {itemDue && (
                                  <span className="text-slate-400 hidden sm:inline">
                                    {itemDue}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Expand / Collapse Button for Long Checklists */}
                      {emp.totalChecklistCount > 2 && (
                        <button
                          type="button"
                          onClick={() => toggleChecklistExpand(emp.memberId)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-0.5 focus:outline-none"
                        >
                          <span>
                            {isChecklistExpanded
                              ? "Show fewer items"
                              : `Show all ${emp.totalChecklistCount} checklist items`}
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${
                              isChecklistExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Employee Action: Review or View Details */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Assignment ID: <span className="font-mono text-slate-600">{emp.assignmentId.slice(-6)}</span>
                    </span>

                    {emp.isAwaitingReview ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(task, emp.assignmentId);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review Submission</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(task, emp.assignmentId);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50/50 text-blue-600 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Assignment</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MORE DETAILS TRAY TOGGLE                                       */}
      {/* ============================================================== */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsDetailsTrayExpanded(!isDetailsTrayExpanded)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer focus:outline-none"
        >
          <span>{isDetailsTrayExpanded ? "Less deliverable info" : "More deliverable info"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isDetailsTrayExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {isDetailsTrayExpanded && (
          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2 animate-in fade-in duration-150 text-left">
            {task.project?.projectType && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Typology:</span>
                <span className="font-semibold text-slate-700">{task.project.projectType}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Deadline:</span>
                <span className="font-semibold text-slate-700">
                  {formatDateTimeWithTimezone(task.dueDate, workspaceTimezone)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Created Date:</span>
              <span className="font-medium text-slate-700">{formattedCreatedAt}</span>
            </div>
            {task.creator?.user?.fullName && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned By:</span>
                <span className="font-semibold text-slate-700">{task.creator.user.fullName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* BOTTOM ACTIONS: Status Transition & Full Details               */}
      {/* ============================================================== */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
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
          className="px-3.5 py-2 rounded-xl border border-blue-200 bg-white text-blue-600 font-semibold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          <ExternalLink className="w-4 h-4 text-blue-600" />
          <span>Full Details</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* EDIT, DELEGATE, DELETE BUTTONS                                */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          disabled={!canEdit}
          onClick={(e) => {
            e.stopPropagation();
            if (canEdit) onEdit(task);
          }}
          className={`px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ${
            canEdit
              ? "bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              : "bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
          }`}
        >
          <Pencil className="w-3.5 h-3.5 text-slate-500" />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelegate(task);
          }}
          className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Delegate</span>
        </button>

        {/* Delete Icon Button */}
        {canDelete || isPrivileged ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            className="ml-auto p-2 rounded-xl border border-slate-200/90 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer shadow-2xs group/del"
            title="Delete Task"
            aria-label="Delete Task"
          >
            <Trash2 className="w-4 h-4 stroke-[2.2] text-rose-600 group-hover/del:text-rose-700 transition-colors" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="ml-auto p-2 rounded-xl border border-slate-200/60 bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed"
            title="Only task assigner or admin can delete this task"
            aria-label="Delete Task (Disabled)"
          >
            <Trash2 className="w-4 h-4 text-slate-300" />
          </button>
        )}
      </div>
    </article>
  );
}
