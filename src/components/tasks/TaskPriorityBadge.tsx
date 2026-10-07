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
          className={`inline-flex items-center font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs ${sizeClasses} ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Urgent</span>
        </span>
      );

    case "HIGH":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs ${sizeClasses} ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>High</span>
        </span>
      );

    case "MEDIUM":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs ${sizeClasses} ${className}`}
        >
          <ArrowUp className="w-3 h-3 text-amber-700" />
          <span>Medium</span>
        </span>
      );

    case "LOW":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs ${sizeClasses} ${className}`}
        >
          <span>Low</span>
        </span>
      );
  }
}
