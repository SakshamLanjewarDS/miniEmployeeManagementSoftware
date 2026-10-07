"use client";

import React from "react";
import { Check, Clock, Play, ListTodo, AlertOctagon } from "lucide-react";

export interface TaskStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function TaskStatusBadge({
  status,
  size = "md",
  className = "",
}: TaskStatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-[12px] px-2.5 py-1 gap-1.5";

  switch (norm) {
    case "COMPLETED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-[#ECFDF5] text-[#087F5B] border border-[#A7F3D0] shadow-2xs ${sizeClasses} ${className}`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Completed</span>
        </span>
      );

    case "CHECKING":
    case "IN_REVIEW":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-[#F5F0FF] text-[#7C3AED] border border-[#DDD0FF] shadow-2xs ${sizeClasses} ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Waiting review</span>
        </span>
      );

    case "ONGOING":
    case "IN_PROGRESS":
    case "STARTED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-[#EBF1FF] text-[#3D56C8] border border-[#CEDEFF] shadow-2xs ${sizeClasses} ${className}`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>In progress</span>
        </span>
      );

    case "BLOCKED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-[#FFF1F3] text-[#C62844] border border-[#FECDD3] shadow-2xs ${sizeClasses} ${className}`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Blocked</span>
        </span>
      );

    case "TODO":
    case "NOT_STARTED":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-[#F3F5FF] text-[#52617C] border border-[#DFE5F2] shadow-2xs ${sizeClasses} ${className}`}
        >
          <ListTodo className="w-3.5 h-3.5 opacity-70" />
          <span>To do</span>
        </span>
      );
  }
}
