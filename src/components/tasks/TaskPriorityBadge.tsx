"use client";

import React from "react";
import { AlertTriangle, AlertCircle, ArrowUp } from "lucide-react";

export interface TaskPriorityBadgeProps {
  priority: string;
  size?: "sm" | "md";
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  size = "md",
  className = "",
}: TaskPriorityBadgeProps) {
  const norm = (priority || "").toUpperCase();
  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-[12px] px-2.5 py-0.5 gap-1";

  switch (norm) {
    case "URGENT":
      return (
        <span
          className={`inline-flex items-center font-bold rounded-full bg-[#FFF1F3] text-[#C62844] border border-[#FECDD3] shadow-2xs ${sizeClasses} ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Urgent</span>
        </span>
      );

    case "HIGH":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-[#FFF8E6] text-[#9A6700] border border-[#FDE68A] shadow-2xs ${sizeClasses} ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>High</span>
        </span>
      );

    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-[#F3F5FF] text-[#52617C] border border-[#DFE5F2] shadow-2xs ${sizeClasses} ${className}`}
        >
          <ArrowUp className="w-3 h-3 text-[#68758E]" />
          <span>Medium</span>
        </span>
      );

    case "LOW":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs ${sizeClasses} ${className}`}
        >
          <span>Low</span>
        </span>
      );
  }
}
