"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, MapPin, CheckSquare, Sparkles, Route, Building2 } from "lucide-react";
import TasksClientView from "./TasksClientView";
import VisitsClientView from "../visits/VisitsClientView";

export interface StudioTasksHubViewProps {
  initialTab?: "tasks" | "visits";
  workspaceSlug: string;
  userRole: string;
  currentMembershipId: string;
  contextUserFullName: string;
  workspaceTimezone: string;
  tasksProps: any;
  visitsProps: any;
  taskCount: number;
  scheduledVisitsCount: number;
  activeVisitCount: number;
}

export default function StudioTasksHubView({
  initialTab = "tasks",
  workspaceSlug,
  userRole,
  currentMembershipId,
  contextUserFullName,
  workspaceTimezone,
  tasksProps,
  visitsProps,
  taskCount,
  scheduledVisitsCount,
  activeVisitCount,
}: StudioTasksHubViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query parameter if present, otherwise fallback to initialTab
  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"tasks" | "visits">(
    queryTab === "visits" ? "visits" : initialTab === "visits" ? "visits" : "tasks"
  );

  // Synchronize state with URL search parameters on route navigation
  useEffect(() => {
    if (queryTab === "visits" || queryTab === "tasks") {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (tab: "tasks" | "visits") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    const newUrl = `/w/${workspaceSlug}/tasks?${params.toString()}`;
    router.push(newUrl);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* UNIFIED WORK MANAGEMENT DUAL-TAB NAVIGATION BAR          */}
      {/* ======================================================== */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-2 sm:p-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] w-full sm:w-auto">
            <button
              type="button"
              id="tab-studio-tasks"
              onClick={() => handleTabChange("tasks")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-[#5A81FA] text-white shadow-xs"
                  : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white"
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Studio Tasks</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "tasks"
                    ? "bg-white/20 text-white"
                    : "bg-[#E2E6F0] text-[#696E82]"
                }`}
              >
                {taskCount}
              </span>
            </button>

            <button
              type="button"
              id="tab-site-visit-tasks"
              onClick={() => handleTabChange("visits")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === "visits"
                  ? "bg-[#5A81FA] text-white shadow-xs"
                  : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white"
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Site Visit Tasks</span>
              {activeVisitCount > 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>ACTIVE</span>
                </span>
              ) : scheduledVisitsCount > 0 ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeTab === "visits"
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {scheduledVisitsCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* Context Helper on Right */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#696E82] pr-3">
            <span className="font-semibold text-[#1F1F1F]">Work Management Hub</span>
            <span>•</span>
            <span className="font-medium">
              {activeTab === "tasks"
                ? "Studio Deliverables & Architectural Execution"
                : "Field Inspections, Journey Tracking & Site Verification"}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB CONTENT 1: STUDIO TASKS                              */}
      {/* ======================================================== */}
      {activeTab === "tasks" && (
        <div className="animate-in fade-in-50 duration-150">
          {tasksProps ? (
            <TasksClientView {...tasksProps} />
          ) : (
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-50 rounded-xl" />
              <div className="h-64 bg-slate-50 rounded-xl" />
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB CONTENT 2: SITE VISIT TASKS                          */}
      {/* ======================================================== */}
      {activeTab === "visits" && (
        <div className="animate-in fade-in-50 duration-150">
          {visitsProps ? (
            <VisitsClientView {...visitsProps} />
          ) : (
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-50 rounded-xl" />
              <div className="h-64 bg-slate-50 rounded-xl" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
