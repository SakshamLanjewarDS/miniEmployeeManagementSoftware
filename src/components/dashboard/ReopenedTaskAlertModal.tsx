"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RotateCcw,
  AlertTriangle,
  X,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ReopenedTaskAlert } from "@/server/modules/dashboard/service";

interface ReopenedTaskAlertModalProps {
  workspaceSlug: string;
  reopenedTasks: ReopenedTaskAlert[];
  forceOpen?: boolean;
  onClose?: () => void;
}

export function ReopenedTaskAlertModal({
  workspaceSlug,
  reopenedTasks,
  forceOpen = false,
  onClose,
}: ReopenedTaskAlertModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (forceOpen && reopenedTasks.length > 0) {
      setIsOpen(true);
      return;
    }

    if (!reopenedTasks || reopenedTasks.length === 0) {
      setIsOpen(false);
      return;
    }

    // Check if any of the reopened tasks are not yet acknowledged in this browser
    const hasUnacknowledged = reopenedTasks.some((task) => {
      const ackKey = `reopened_task_ack_${workspaceSlug}_${task.id}_${task.reopenedAt}`;
      return !localStorage.getItem(ackKey);
    });

    if (hasUnacknowledged) {
      setIsOpen(true);
    }
  }, [reopenedTasks, workspaceSlug, forceOpen]);

  const handleAcknowledgeAll = () => {
    // Save acknowledgment for all current reopened items
    for (const task of reopenedTasks) {
      const ackKey = `reopened_task_ack_${workspaceSlug}_${task.id}_${task.reopenedAt}`;
      localStorage.setItem(ackKey, "true");
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleDismissCurrent = () => {
    const current = reopenedTasks[currentIndex];
    if (current) {
      const ackKey = `reopened_task_ack_${workspaceSlug}_${current.id}_${current.reopenedAt}`;
      localStorage.setItem(ackKey, "true");
    }

    if (currentIndex < reopenedTasks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
      onClose?.();
    }
  };

  if (!isOpen || !reopenedTasks || reopenedTasks.length === 0) return null;

  const currentTask = reopenedTasks[currentIndex] || reopenedTasks[0];
  const hasMultiple = reopenedTasks.length > 1;

  const formattedDate = currentTask.reopenedAt
    ? new Date(currentTask.reopenedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently";

  const formattedDueDate = currentTask.dueDate
    ? new Date(currentTask.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 border-2 border-amber-300 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <RotateCcw className="w-5 h-5 animate-spin-reverse-once" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  LEADERSHIP WORKFLOW NOTICE
                </span>
                {hasMultiple && (
                  <span className="font-bold text-[10px] text-slate-500">
                    ({currentIndex + 1} of {reopenedTasks.length})
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                Deliverable Reopened by Leadership
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcknowledgeAll}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Dismiss popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel indicator if multiple */}
        {hasMultiple && (
          <div className="flex items-center justify-between bg-amber-50/60 p-2 rounded-xl border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-900">
              Multiple deliverables require revisions:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-lg bg-white border border-amber-200 text-amber-800 disabled:opacity-40 hover:bg-amber-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-bold text-amber-950">
                {currentIndex + 1} / {reopenedTasks.length}
              </span>
              <button
                type="button"
                disabled={currentIndex === reopenedTasks.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(reopenedTasks.length - 1, prev + 1))}
                className="p-1 rounded-lg bg-white border border-amber-200 text-amber-800 disabled:opacity-40 hover:bg-amber-50 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Reopened Deliverable Card */}
        <div className="bg-[#F8F9FD] rounded-2xl p-4 border border-[#E2E6F0] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[10px] font-bold text-[#3562E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                {currentTask.projectCode}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 truncate" title={currentTask.projectName}>
                {currentTask.projectName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider shrink-0">
              {currentTask.priority}
            </span>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {currentTask.taskTitle}
            </h4>
            {currentTask.itemTitle && currentTask.itemTitle !== currentTask.taskTitle && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-900 font-semibold bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 w-fit">
                <span className="text-amber-700 font-normal">Checklist Item:</span>
                <span>{currentTask.itemTitle}</span>
              </div>
            )}
          </div>

          {/* Leadership Justification Box */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Reopened by {currentTask.reopenedBy}</span>
              </span>
              <span className="text-amber-700 font-normal text-[10px]">
                {formattedDate}
              </span>
            </div>
            <div className="border-l-3 border-amber-500 pl-3 py-0.5">
              <p className="text-xs text-amber-950 font-medium leading-relaxed italic">
                "{currentTask.reopenReason}"
              </p>
            </div>
          </div>

          {/* Due date info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Target deadline: {formattedDueDate || "No deadline set"}</span>
            </span>
            <span className="text-amber-700 font-semibold text-[10px] bg-amber-100/70 px-2 py-0.5 rounded">
              Status moved to In Progress
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={hasMultiple ? handleDismissCurrent : handleAcknowledgeAll}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer text-center"
          >
            {hasMultiple && currentIndex < reopenedTasks.length - 1
              ? "Next Reopened Task →"
              : "Acknowledge & Continue"}
          </button>

          <Link
            href={`/w/${workspaceSlug}/tasks?taskId=${currentTask.taskId}`}
            onClick={handleAcknowledgeAll}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#3562E8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Deliverable & Fix Work</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
