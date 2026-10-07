"use client";

import React from "react";
import { Eye, Pencil, ArrowRightLeft, Trash2, Loader2, RotateCcw } from "lucide-react";
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";

export interface TaskCardActionsProps {
  task: {
    id: string;
    title: string;
    status: string;
  };
  isLoadingStatus: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isPrivileged: boolean;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onOpenDetails: () => void;
  onEdit: () => void;
  onDelegate: () => void;
  onDelete: () => void;
  onRequestChanges?: () => void;
}

export function TaskCardActions({
  task,
  isLoadingStatus,
  canEdit,
  canDelete,
  isPrivileged,
  onUpdateStatus,
  onOpenDetails,
  onEdit,
  onDelegate,
  onDelete,
  onRequestChanges,
}: TaskCardActionsProps) {
  // Normalize status for dropdown
  const currentSelectValue =
    task.status === "NOT_STARTED" ? "TODO" :
    task.status === "IN_PROGRESS" ? "ONGOING" :
    task.status === "IN_REVIEW" ? "CHECKING" :
    task.status;

  const isUnderReview = task.status === "IN_REVIEW" || task.status === "CHECKING";

  return (
    <div className="task-card__footer pt-3 mt-auto border-t border-[#DFE5F2] space-y-2">
      {/* Row 1: Status Dropdown & View Details Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchableDropdown
            size="sm"
            optionType="status"
            searchable={false}
            clearable={false}
            loading={isLoadingStatus}
            disabled={isLoadingStatus}
            value={currentSelectValue}
            onChange={(val) => onUpdateStatus(task.id, val)}
            triggerClassName="font-semibold bg-[#F3F5FF] hover:bg-[#EBF1FF] text-[#111B35]"
            options={[
              { value: "TODO", label: "📋 To do" },
              { value: "STARTED", label: "▶ Started" },
              { value: "ONGOING", label: "⚡ Ongoing" },
              { value: "CHECKING", label: "🔍 Waiting review" },
              { value: "COMPLETED", label: "✔ Completed" },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3 py-2 rounded-[10px] text-xs font-semibold bg-white text-[#3D56C8] hover:bg-[#F3F5FF] border border-[#DFE5F2] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
          title="Open deliverable details, checklist, and conversation"
        >
          <Eye className="w-3.5 h-3.5 text-[#5878FF]" />
          <span>View details</span>
        </button>
      </div>

      {/* Row 2: Secondary Action Controls (Edit, Delegate, Changes, Delete) */}
      {(canEdit || canDelete || (isPrivileged && isUnderReview)) && (
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-white text-[#52617C] hover:text-[#111B35] hover:bg-[#F3F5FF] border border-[#DFE5F2] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Edit deliverable scope and details"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#68758E]" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={onDelegate}
                  className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-white text-[#52617C] hover:text-[#3D56C8] hover:bg-[#F3F5FF] border border-[#DFE5F2] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Delegate deliverable to another team member"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#5878FF]" />
                  <span>Delegate</span>
                </button>
              </>
            )}

            {isPrivileged && isUnderReview && onRequestChanges && (
              <button
                type="button"
                onClick={onRequestChanges}
                className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Request deliverable revisions from assignee"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Changes</span>
              </button>
            )}
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${task.title}`}
              className="p-1.5 rounded-[8px] text-xs font-semibold bg-white text-[#C62844] hover:bg-[#FFF1F3] border border-[#DFE5F2] hover:border-rose-300 flex items-center justify-center transition-colors cursor-pointer min-w-[32px] min-h-[32px] shadow-2xs"
              title={`Delete ${task.title}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-[#C62844]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
