"use client";

import React, { useState } from "react";
import {
  Layers,
  Calendar,
  Clock,
  MessageSquare,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { ProjectProfileCircle, TypologyBadge, getTypologyConfig } from "@/lib/typology";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskAssignees, AssigneeInfo } from "./TaskAssignees";
import { TaskCardActions } from "./TaskCardActions";
import { getTaskDateAnalysis, sanitizeTaskDescription } from "./task-utils";
import { DynamicCardFields } from "@/components/custom-fields/DynamicCardFields";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";

export interface TaskCardProps {
  task: any;
  assignees: any[];
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
  assignees,
  currentMembershipId,
  isPrivileged,
  canEdit,
  canDelete,
  workspaceTimezone = "Asia/Kolkata",
  customFields = [],
  customValues = {},
  isLoadingStatus = false,
  onUpdateStatus,
  onOpenDetails,
  onEdit,
  onDelegate,
  onDelete,
  onRequestChanges,
  onToggleChecklist,
}: TaskCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const {
    formattedDueDate,
    formattedCreatedAt,
    isDueToday,
    isOverdue,
  } = getTaskDateAnalysis(task.dueDate, task.createdAt, task.status, workspaceTimezone);

  const typologyConfig = getTypologyConfig(task.project?.projectType);

  const rawDescription = sanitizeTaskDescription(task.description);
  const hasLongDescription = rawDescription.length > 140;
  const displayDescription =
    hasLongDescription && !isDescriptionExpanded
      ? `${rawDescription.slice(0, 140)}...`
      : rawDescription;

  const completedChecklistCount = task.checklistItems.filter((i) => i.isCompleted).length;
  const totalChecklistCount = task.checklistItems.length;

  return (
    <article
      className="task-card rounded-[14px] bg-white border border-[#DFE5F2] shadow-[0_1px_3px_rgba(17,27,53,0.04)] p-3.5 sm:p-4 flex flex-col justify-between min-w-0 hover:border-[#CEDEFF] hover:shadow-[0_2px_8px_rgba(17,27,53,0.06)] transition-all"
      style={{ overflowWrap: "anywhere" }}
      aria-label={`Deliverable: ${task.title}`}
    >
      <div className="space-y-3">
        {/* A. Header metadata (Priority and Status badge - no duplicate project code) */}
        <header className="flex items-center justify-between gap-2 flex-wrap">
          <TaskPriorityBadge priority={task.priority} size="sm" />
          <TaskStatusBadge status={task.status} size="sm" />
        </header>

        {/* B. Project Identity (in place of task name: Project Code + Project Name with Project Color) */}
        <div className="flex items-center gap-2 min-w-0">
          <ProjectProfileCircle
            typology={task.project?.projectType}
            name={task.project?.name}
            size="sm"
          />
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className="font-mono text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 shadow-2xs"
              style={{
                color: typologyConfig.color,
                backgroundColor: `${typologyConfig.color}15`,
                borderColor: `${typologyConfig.color}40`,
              }}
              title={`Project Code: ${task.project?.code || "N/A"}`}
            >
              {task.project?.code || "PRJ"}
            </span>
            <span
              className="text-[15px] font-semibold leading-[1.4] text-[#111B35] truncate min-w-0"
              title={task.project?.name || "No project assigned"}
            >
              {task.project?.name || "No project assigned"}
            </span>
          </div>
        </div>

        {/* C. Deliverable Box (in place of topology text: Task Name heading + Phase + Description) */}
        <div className="p-3 rounded-[10px] bg-[#F7F8FD] border border-[#DFE5F2]/80 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenDetails(task)}
              className="text-left flex-1 group/title cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5878FF] rounded"
            >
              <div className="text-[10px] font-bold text-[#68758E] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#5878FF]" />
                <span>Deliverable</span>
              </div>
              <h3 className="text-[15px] font-semibold leading-[1.4] text-[#111B35] group-hover/title:text-[#5878FF] group-hover/title:underline transition-colors break-words">
                {task.title || "Untitled deliverable"}
              </h3>
            </button>

            {task.phase?.phaseName && (
              <span
                className="text-[11px] font-medium text-[#68758E] bg-white border border-[#DFE5F2] px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs"
                title={`Phase: ${task.phase.phaseName}`}
              >
                {task.phase.phaseName}
              </span>
            )}
          </div>

          {rawDescription ? (
            <div className="text-[13px] leading-[1.5] text-[#52617C] break-words pt-0.5">
              <span>{displayDescription}</span>
              {hasLongDescription && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="ml-1 text-[12px] font-semibold text-[#3D56C8] hover:text-[#4665E8] hover:underline cursor-pointer"
                >
                  {isDescriptionExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-[12px] leading-[1.5] text-[#68758E] italic pt-0.5">
              No description added
            </p>
          )}
        </div>

        {/* D. Assignment and dates (Two internal columns) */}
        <div className="pt-2 border-t border-[#DFE5F2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left Column: Assignment */}
            <div className="min-w-0">
              <TaskAssignees
                assignees={assignees}
                currentMembershipId={currentMembershipId}
              />
            </div>

            {/* Right Column: Due Date & Created Date */}
            <div className="space-y-1.5 text-right sm:text-right text-left">
              <div>
                <span className="text-[11px] font-semibold text-[#68758E] uppercase tracking-wider block">
                  Due date
                </span>
                <div className="flex items-center justify-start sm:justify-end gap-1.5 flex-wrap mt-0.5">
                  <span
                    className={`text-[13px] font-semibold ${
                      isOverdue
                        ? "text-[#C62844]"
                        : isDueToday
                        ? "text-[#3D56C8]"
                        : "text-[#111B35]"
                    }`}
                  >
                    {formattedDueDate}
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] font-bold text-[#C62844] bg-[#FFF1F3] border border-[#FECDD3] px-1.5 py-0.2 rounded shrink-0">
                      Overdue
                    </span>
                  )}
                  {isDueToday && (
                    <span className="text-[10px] font-bold text-[#3D56C8] bg-[#F0F5FF] border border-[#CEDEFF] px-1.5 py-0.2 rounded shrink-0">
                      Due today
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#68758E] block">
                  Created: <span className="font-medium text-[#52617C]">{formattedCreatedAt}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* E. In-Card "More details" Accordion Expansion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="text-[12px] font-semibold text-[#3D56C8] hover:text-[#4665E8] flex items-center gap-1 transition-colors cursor-pointer"
            aria-expanded={showMoreDetails}
          >
            <span>{showMoreDetails ? "Hide details" : "More details"}</span>
            {showMoreDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showMoreDetails && (
            <div className="mt-2 pt-2 border-t border-[#DFE5F2] space-y-2 text-xs animate-in fade-in duration-150">
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold text-[#68758E] uppercase">Typology</dt>
                  <dd className="font-medium text-[#111B35] truncate mt-0.5">
                    <TypologyBadge typology={task.project?.projectType || "Not specified"} size="xs" />
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-semibold text-[#68758E] uppercase">Phase</dt>
                  <dd className="font-medium text-[#111B35] truncate">
                    {task.phase?.phaseName || "Not phase-specific"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-semibold text-[#68758E] uppercase">Estimated Effort</dt>
                  <dd className="font-medium text-[#111B35]">
                    {task.estimatedHours ? `${Number(task.estimatedHours)} hrs` : "Not estimated"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-semibold text-[#68758E] uppercase">Assigned By</dt>
                  <dd className="font-medium text-[#111B35] truncate">
                    {task.creator?.user?.fullName || "Studio Member"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[10px] font-semibold text-[#68758E] uppercase">Discussions</dt>
                  <dd className="font-medium text-[#111B35] flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-[#68758E]" />
                    <span>{task.comments.length} comment{task.comments.length === 1 ? "" : "s"}</span>
                  </dd>
                </div>
              </dl>

              {/* Interactive Checklist Preview */}
              {totalChecklistCount > 0 && (
                <div className="pt-2 border-t border-[#DFE5F2]/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#68758E]">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-[#5878FF]" />
                      <span>Checklist ({completedChecklistCount}/{totalChecklistCount})</span>
                    </span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {task.checklistItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canEdit || !onToggleChecklist}
                        onClick={() => onToggleChecklist?.(task.id, item.id, item.isCompleted)}
                        className={`flex items-center gap-2 text-xs text-left w-full transition-colors ${
                          canEdit && onToggleChecklist ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {item.isCompleted ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#68758E] shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            item.isCompleted ? "line-through text-[#68758E]" : "text-[#111B35] font-medium"
                          }`}
                        >
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Custom Fields */}
              <DynamicCardFields fields={customFields} values={customValues} />
            </div>
          )}
        </div>
      </div>

      {/* F. Footer Actions */}
      <TaskCardActions
        task={task}
        isLoadingStatus={isLoadingStatus}
        canEdit={canEdit}
        canDelete={canDelete}
        isPrivileged={isPrivileged}
        onUpdateStatus={onUpdateStatus}
        onOpenDetails={() => onOpenDetails(task)}
        onEdit={() => onEdit(task)}
        onDelegate={() => onDelegate(task)}
        onDelete={() => onDelete(task)}
        onRequestChanges={onRequestChanges}
      />
    </article>
  );
}
