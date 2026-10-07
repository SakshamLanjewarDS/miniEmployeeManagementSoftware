"use client";

import React from "react";
import { Plus, RotateCcw, FolderGit2 } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { AssigneeInfo } from "./TaskAssignees";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";

export interface TaskGridProps {
  tasks: any[];
  isLoading?: boolean;
  isFilterActive?: boolean;
  canAssignDeliverable?: boolean;
  currentMembershipId: string;
  isPrivileged: boolean;
  workspaceTimezone?: string;
  customFields?: CustomFieldDefinition[];
  customValuesByTask?: Record<string, Record<string, any>>;
  loadingTaskId?: string | null;
  onOpenCreateTask?: () => void;
  onClearFilters?: () => void;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onOpenDetails: (task: any) => void;
  onEdit: (task: any) => void;
  onDelegate: (task: any) => void;
  onDelete: (task: any) => void;
  onRequestChanges?: (task: any) => void;
  onToggleChecklist?: (taskId: string, itemId: string, currentStatus: boolean) => void;
  getTaskAssignees: (task: any) => AssigneeInfo[];
  canEditTask: (task: any) => boolean;
  canDeleteTask: (task: any) => boolean;
}

export function TaskGrid({
  tasks,
  isLoading = false,
  isFilterActive = false,
  canAssignDeliverable = true,
  currentMembershipId,
  isPrivileged,
  workspaceTimezone = "Asia/Kolkata",
  customFields = [],
  customValuesByTask = {},
  loadingTaskId = null,
  onOpenCreateTask,
  onClearFilters,
  onUpdateStatus,
  onOpenDetails,
  onEdit,
  onDelegate,
  onDelete,
  onRequestChanges,
  onToggleChecklist,
  getTaskAssignees,
  canEditTask,
  canDeleteTask,
}: TaskGridProps) {
  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="task-grid-region w-full">
        <div className="task-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[14px] bg-white border border-[#DFE5F2] p-4 shadow-2xs space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 bg-[#F3F5FF] rounded-md" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-50 rounded" />
              <div className="h-10 bg-[#F7F8FD] rounded-[10px]" />
              <div className="pt-2 border-t border-[#DFE5F2] flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
              <div className="pt-3 border-t border-[#DFE5F2] flex items-center justify-between">
                <div className="h-8 w-28 bg-[#F3F5FF] rounded-[10px]" />
                <div className="h-8 w-24 bg-slate-100 rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty States
  if (!tasks || tasks.length === 0) {
    if (isFilterActive) {
      return (
        <div className="bg-white border border-[#DFE5F2] rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F3F5FF] border border-[#DFE5F2] flex items-center justify-center mx-auto text-[#5878FF]">
            <RotateCcw className="w-6 h-6 text-[#5878FF]" />
          </div>
          <h3 className="text-base font-bold text-[#111B35]">No deliverables match your filters</h3>
          <p className="text-xs text-[#52617C] max-w-sm mx-auto">
            Try adjusting your search criteria, clearing the status, or resetting the architectural typology.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5878FF] hover:bg-[#4665E8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white border border-[#DFE5F2] rounded-2xl p-12 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#F3F5FF] border border-[#DFE5F2] flex items-center justify-center mx-auto text-[#5878FF]">
          <FolderGit2 className="w-6 h-6 text-[#5878FF]" />
        </div>
        <h3 className="text-base font-bold text-[#111B35]">No deliverables yet</h3>
        <p className="text-xs text-[#52617C] max-w-sm mx-auto">
          Start by assigning architectural deliverables, drafting tasks, or site survey milestones to your studio team.
        </p>
        {canAssignDeliverable && onOpenCreateTask && (
          <button
            type="button"
            onClick={onOpenCreateTask}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#5878FF] hover:bg-[#4665E8] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Deliverable</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Grid Collection
  return (
    <div className="task-grid-region w-full">
      <div className="task-grid">
        {tasks.map((task) => {
          const assignees = getTaskAssignees(task);
          const canEdit = canEditTask(task);
          const canDelete = canDeleteTask(task);

          return (
            <TaskCard
              key={task.id}
              task={task}
              assignees={assignees}
              currentMembershipId={currentMembershipId}
              isPrivileged={isPrivileged}
              canEdit={canEdit}
              canDelete={canDelete}
              workspaceTimezone={workspaceTimezone}
              customFields={customFields}
              customValues={customValuesByTask[task.id] || task.customFields || {}}
              isLoadingStatus={loadingTaskId === task.id}
              onUpdateStatus={onUpdateStatus}
              onOpenDetails={onOpenDetails}
              onEdit={onEdit}
              onDelegate={onDelegate}
              onDelete={onDelete}
              onRequestChanges={onRequestChanges ? () => onRequestChanges(task) : undefined}
              onToggleChecklist={onToggleChecklist}
            />
          );
        })}
      </div>
    </div>
  );
}
