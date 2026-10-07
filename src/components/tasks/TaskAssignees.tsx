"use client";

import React, { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

export interface AssigneeInfo {
  id?: string;
  user: { fullName: string; email?: string };
  employee?: { employeeId?: string | null; designation?: string | null; department?: string | null } | null;
}

export interface TaskAssigneesProps {
  assignees: AssigneeInfo[];
  currentMembershipId?: string;
}

export function TaskAssignees({ assignees, currentMembershipId }: TaskAssigneesProps) {
  const [showAll, setShowAll] = useState(false);

  if (!assignees || assignees.length === 0) {
    return (
      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-[#68758E] uppercase tracking-wider block">
          Assigned to
        </span>
        <span className="text-xs text-[#68758E] italic block">Unassigned</span>
      </div>
    );
  }

  const primary = assignees[0];
  const remainingCount = assignees.length - 1;

  const getInitials = (fullName: string) => {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (fullName || "U").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-[#68758E] uppercase tracking-wider block">
          Assigned to
        </span>
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-semibold text-[#3D56C8] hover:text-[#4665E8] flex items-center gap-0.5 cursor-pointer"
            title={showAll ? "Collapse assignees list" : "View all assigned employees"}
          >
            <span>{showAll ? "Hide" : `+${remainingCount} more`}</span>
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Primary Assignee */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-6 h-6 rounded-full bg-[#EBF1FF] text-[#3D56C8] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#CEDEFF] shadow-2xs"
          title={primary.user.fullName}
        >
          {getInitials(primary.user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-[#111B35] break-words">
              {primary.user.fullName}
            </span>
            {primary.employee?.employeeId && (
              <span className="font-mono text-[10px] font-bold text-[#3D56C8] bg-[#F3F5FF] border border-[#DFE5F2] px-1.5 py-0.2 rounded shrink-0">
                {primary.employee.employeeId}
              </span>
            )}
            {primary.id === currentMembershipId && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                You
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded assignees list */}
      {showAll && remainingCount > 0 && (
        <div className="pt-1.5 space-y-1.5 border-t border-[#DFE5F2]/80 mt-1 animate-in fade-in duration-150">
          {assignees.slice(1).map((m, idx) => (
            <div key={m.id || idx} className="flex items-center gap-2 min-w-0 pl-1">
              <div
                className="w-5 h-5 rounded-full bg-[#F3F5FF] text-[#52617C] font-bold text-[9px] flex items-center justify-center shrink-0 border border-[#DFE5F2]"
                title={m.user.fullName}
              >
                {getInitials(m.user.fullName)}
              </div>
              <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-[#111B35] break-words">
                  {m.user.fullName}
                </span>
                {m.employee?.employeeId && (
                  <span className="font-mono text-[9px] font-bold text-[#3D56C8] bg-[#F3F5FF] border border-[#DFE5F2] px-1 rounded">
                    {m.employee.employeeId}
                  </span>
                )}
                {m.id === currentMembershipId && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 rounded">
                    You
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
