"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Eye,
  Pencil,
  ArrowRightLeft,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { TaskStatusDropdown } from "./TaskStatusDropdown";
import { AssigneeInfo } from "./TaskAssignees";
import { getTaskDateAnalysis, sanitizeTaskDescription } from "./task-utils";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";

export interface TaskCardProps {
  task: any;
  assignees: AssigneeInfo[];
  currentMembershipId: string;
  isPrivileged: boolean;
  canEdit: boolean;
  canDelete: boolean;
  workspaceTimezone?: string;
  customFields?: CustomFieldDefinition[];
  customValues?: Record<string, any>;
  isLoadingStatus?: boolean;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onOpenDetails: (task: any) => void;
  onEdit: (task: any) => void;
  onDelegate: (task: any) => void;
  onDelete: (task: any) => void;
  onRequestChanges?: () => void;
  onToggleChecklist?: (taskId: string, itemId: string, currentStatus: boolean) => void;
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
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    formattedDueDate,
  } = getTaskDateAnalysis(task.dueDate, task.createdAt, task.status, workspaceTimezone);

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

  // Clean deliverable notes
  const cleanDescription = useMemo(() => {
    return sanitizeTaskDescription(task.description) || task.description || "";
  }, [task.description]);

  // Priority Badge Configuration (Matches pill shape & exact palette)
  const priorityConfig = useMemo(() => {
    const p = (task.priority || "MEDIUM").toUpperCase();
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
  }, [task.priority]);

  // Top-Right Status Badge Configuration (Matches pill shape & exact palette)
  const statusBadgeConfig = useMemo(() => {
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
        label: "Checking",
        icon: "🔍",
        classes: "bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]",
      };
    }
    if (norm === "ONGOING" || norm === "IN_PROGRESS") {
      return {
        label: "Ongoing",
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
  const projectCode = task.project?.code || "PRJ-043";
  const projectName = task.project?.name || "Rajesh Gandhi";
  const projectInitials = useMemo(() => {
    return projectName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PR";
  }, [projectName]);

  // Primary Assignee Details
  const primaryAssignee = assignees[0];
  const primaryName =
    primaryAssignee?.user?.fullName ||
    task.assignee?.user?.fullName ||
    (typeof task.assigneeName === "string" ? task.assigneeName : null);

  const primaryInitials = useMemo(() => {
    if (!primaryName) return "??";
    return primaryName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [primaryName]);

  // Employee ID Code (e.g. EMP-005)
  const employeeId =
    primaryAssignee?.employee?.employeeId ||
    task.assignee?.employee?.employeeId ||
    (primaryAssignee as any)?.employeeId ||
    (task as any)?.employeeId ||
    "EMP-005";

  return (
    <article
      className="task-card rounded-2xl bg-white border border-[#e2e8f0] shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 transition-all duration-200 group relative min-w-0 gap-3.5"
      style={{ overflowWrap: "anywhere" }}
      aria-label={`Task: ${task.title}`}
    >
      {/* ============================================================== */}
      {/* ROW 1: Priority Badge (Left) & Status Badge (Right)            */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${priorityConfig.classes}`}
        >
          <span className="text-xs font-bold">{priorityConfig.icon}</span>
          <span>{priorityConfig.label}</span>
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${statusBadgeConfig.classes}`}
        >
          <span className="font-bold">{statusBadgeConfig.icon}</span>
          <span>{statusBadgeConfig.label}</span>
        </span>
      </div>

      {/* ============================================================== */}
      {/* ROW 2: Project Avatar Circle + Project Code + Project Name     */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2.5 min-w-0">
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

      {/* ============================================================== */}
      {/* ROW 3: Inset Deliverable Card (Title + Description)           */}
      {/* ============================================================== */}
      <div className="bg-[#f8faff] border border-[#e2e8f0] rounded-xl p-3.5 text-left">
        <div className="flex items-center gap-1.5 text-blue-600 mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
            DELIVERABLE
          </span>
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

        <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-1.5 line-clamp-2 leading-relaxed">
          {cleanDescription || "No specific instructions provided"}
        </p>
      </div>

      {/* ============================================================== */}
      {/* ROW 4: Assigned To (Left) & Due Date (Right)                   */}
      {/* ============================================================== */}
      <div className="pt-3.5 border-t border-slate-100 flex items-start justify-between gap-2">
        {/* Left: Assigned To */}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            ASSIGNED TO
          </div>
          {!primaryName ? (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0" title={primaryName}>
              <div className="w-6 h-6 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] font-bold text-[10px] flex items-center justify-center shrink-0">
                {primaryInitials}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {primaryName}
              </span>
              {employeeId && (
                <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                  {employeeId}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Due Date */}
        <div className="text-right shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            DUE DATE
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-900">
            {formattedDueDate}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            Created: {formattedCreatedAt}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ROW 5: More Details Toggle Link                                */}
      {/* ============================================================== */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer focus:outline-none"
        >
          <span>{isExpanded ? "Less details" : "More details"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expandable info tray */}
        {isExpanded && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2 animate-in fade-in duration-150">
            {task.project?.projectType && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Typology:</span>
                <span className="font-semibold text-slate-700">{task.project.projectType}</span>
              </div>
            )}
            {task.project?.currentPhase && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phase:</span>
                <span className="font-semibold text-slate-700">{task.project.currentPhase}</span>
              </div>
            )}
            {Array.isArray(task.checklistItems) && task.checklistItems.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Checklist ({task.checklistItems.filter((i: any) => i.isCompleted || i.status === "COMPLETED").length}/{task.checklistItems.length})
                </span>
                <ul className="space-y-1 mt-1">
                  {task.checklistItems.map((item: any) => (
                    <li key={item.id} className="flex items-center gap-2 text-slate-700">
                      <span className="text-slate-400">•</span>
                      <span className={item.isCompleted || item.status === "COMPLETED" ? "line-through text-slate-400" : ""}>
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* ROW 6: Status Dropdown Trigger (Left) & View Details (Right)   */}
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
          <Eye className="w-4 h-4 text-blue-600" />
          <span>View details</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ROW 7: Edit & Delegate (Left) & Delete Button (Far Right)      */}
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

        {/* Delete Icon (Colorful red icon button aligned to the far right) */}
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
