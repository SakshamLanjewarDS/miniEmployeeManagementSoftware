"use client";

import React from "react";
import { Calendar, AlertTriangle, Play, Clock, CheckCircle2 } from "lucide-react";

export interface TaskDashboardMetrics {
  dueToday: number;
  overdue: number;
  inProgress: number;
  waitingReview: number;
  completed: number;
  total?: number;
}

interface TaskMetricsCardsProps {
  metrics: TaskDashboardMetrics;
  selectedDueDateCategory: string;
  selectedStatusCategory: string;
  onMetricClick: (type: "TODAY" | "OVERDUE" | "IN_PROGRESS" | "WAITING_REVIEW" | "COMPLETED") => void;
}

export const TaskMetricsCards = React.memo(function TaskMetricsCards({
  metrics,
  selectedDueDateCategory,
  selectedStatusCategory,
  onMetricClick,
}: TaskMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* Card 1: Due Today */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => onMetricClick("TODAY")}
        className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
          selectedDueDateCategory === "TODAY"
            ? "bg-[#F8F9FE] border-[#3562E8] ring-2 ring-[#3562E8]/20"
            : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF]"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="type-kpi-label text-[#0B122B] font-medium">Due today</span>
          <Calendar className="w-4 h-4 text-[#3562E8]" />
        </div>
        <div className="type-kpi-value text-[#0B122B] mt-1 tabular-nums">
          {metrics.dueToday}
        </div>
        <p className="type-helper text-[#696E82] mt-1">Pending today</p>
      </button>

      {/* Card 2: Overdue */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => onMetricClick("OVERDUE")}
        className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
          selectedDueDateCategory === "OVERDUE"
            ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
            : "bg-white border-[#E2E6F0] hover:border-rose-200"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="type-kpi-label text-rose-600 font-medium">Overdue</span>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="type-kpi-value text-[#0B122B] mt-1 tabular-nums">
          {metrics.overdue}
        </div>
        <p className="type-helper text-rose-600/80 mt-1">Requires immediate attention</p>
      </button>

      {/* Card 3: In Progress */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => onMetricClick("IN_PROGRESS")}
        className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
          selectedStatusCategory === "IN_PROGRESS"
            ? "bg-[#F8F9FE] border-[#3562E8] ring-2 ring-[#3562E8]/20"
            : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF]"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="type-kpi-label text-[#3562E8] font-medium">In progress</span>
          <Play className="w-4 h-4 text-[#3562E8] fill-current" />
        </div>
        <div className="type-kpi-value text-[#0B122B] mt-1 tabular-nums">
          {metrics.inProgress}
        </div>
        <p className="type-helper text-[#696E82] mt-1">Active studio drafting</p>
      </button>

      {/* Card 4: Waiting for Review */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => onMetricClick("WAITING_REVIEW")}
        className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
          selectedStatusCategory === "WAITING_REVIEW"
            ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/20"
            : "bg-white border-[#E2E6F0] hover:border-purple-200"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="type-kpi-label text-purple-700 font-medium">Waiting review</span>
          <Clock className="w-4 h-4 text-purple-600" />
        </div>
        <div className="type-kpi-value text-[#0B122B] mt-1 tabular-nums">
          {metrics.waitingReview}
        </div>
        <p className="type-helper text-[#696E82] mt-1">Submitted for approval</p>
      </button>

      {/* Card 5: Completed */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => onMetricClick("COMPLETED")}
        className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-1 ${
          selectedStatusCategory === "COMPLETED"
            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
            : "bg-white border-[#E2E6F0] hover:border-emerald-200"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="type-kpi-label text-emerald-700 font-medium">Completed</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="type-kpi-value text-[#0B122B] mt-1 tabular-nums">
          {metrics.completed}
        </div>
        <p className="type-helper text-emerald-700/80 mt-1">Approved deliverables</p>
      </button>
    </div>
  );
});
