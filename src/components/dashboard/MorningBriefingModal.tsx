"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";

interface MorningBriefingModalProps {
  workspaceSlug: string;
  role: string;
}

export function MorningBriefingModal({ workspaceSlug, role }: MorningBriefingModalProps) {
  // Only display for Owner and Admin
  if (role !== "OWNER" && role !== "ADMIN") return null;

  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const ackKey = `morning_briefing_ack_${workspaceSlug}_${todayStr}`;

    // Auto-open if not yet acknowledged today
    const hasAcknowledged = localStorage.getItem(ackKey);

    const loadBriefing = async () => {
      try {
        const res = await fetch(`/api/executive/briefing?workspaceSlug=${workspaceSlug}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json);
          if (!hasAcknowledged) {
            setIsOpen(true);
          }
        }
      } catch {
        // ignore
      }
    };

    loadBriefing();
  }, [workspaceSlug]);

  const handleAcknowledge = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem(`morning_briefing_ack_${workspaceSlug}_${todayStr}`, "true");
    setIsOpen(false);
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-[#E2E6F0] shadow-2xl space-y-4 animate-fade-in text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Morning Executive Briefing</h3>
              <p className="text-[11px] text-[#696E82]">100% DESIGN Studio • {data.date}</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-[#696E82]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Absent Staff Today */}
        <div className="p-3.5 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1F1F1F]">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span>Staff Away Today ({data.absentStaffToday.length})</span>
            </span>
            <Link
              href={`/w/${workspaceSlug}/leave/calendar`}
              onClick={() => setIsOpen(false)}
              className="text-[#5A81FA] text-[11px] hover:underline"
            >
              View Calendar →
            </Link>
          </div>

          {data.absentStaffToday.length === 0 ? (
            <p className="text-[#696E82] italic text-[11px]">All studio staff members are scheduled present today.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.absentStaffToday.map((s: any) => (
                <span
                  key={s.employeeId}
                  className="px-2 py-1 rounded-lg bg-white border border-[#E2E6F0] text-[11px] font-medium text-[#1F1F1F]"
                >
                  <strong>{s.employeeName}</strong> ({s.department}) • {s.leaveType}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. Pending Reviews */}
        {data.pendingLeaveReviewsCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>{data.pendingLeaveReviewsCount}</strong> staff leave requests require leadership approval.
              </span>
            </span>
            <Link
              href={`/w/${workspaceSlug}/leave`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-amber-900 underline"
            >
              Review Now
            </Link>
          </div>
        )}

        {/* 3. Urgent Deliverables & Deadlines */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
            Critical Deliverables ({data.urgentDeliverables.length})
          </span>
          {data.urgentDeliverables.length === 0 ? (
            <p className="text-gray-400 italic">No urgent deliverables due today.</p>
          ) : (
            <div className="space-y-1.5">
              {data.urgentDeliverables.slice(0, 3).map((d: any) => (
                <div
                  key={d.id}
                  className="p-2.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex items-center justify-between"
                >
                  <span className="font-semibold text-[#1F1F1F]">{d.title}</span>
                  {d.isOverdue ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                      Overdue
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Due Today
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Meetings Today */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider block">
            Scheduled Meetings Today ({data.meetingsToday.length})
          </span>
          {data.meetingsToday.length === 0 ? (
            <p className="text-gray-400 italic">No meetings scheduled for today.</p>
          ) : (
            <div className="space-y-1.5">
              {data.meetingsToday.map((m: any) => (
                <div
                  key={m.id}
                  className="p-2.5 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex items-center justify-between font-mono"
                >
                  <span className="font-semibold text-[#1F1F1F] font-sans">{m.title}</span>
                  <span className="text-[#5A81FA] text-[11px]">
                    {m.startTime} — {m.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t border-[#E2E6F0] flex justify-end">
          <button
            onClick={handleAcknowledge}
            className="px-5 py-2 text-xs font-bold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Acknowledge & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
