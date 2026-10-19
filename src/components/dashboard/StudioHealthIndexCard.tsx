"use client";

import React, { useState } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Users,
  CreditCard,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { StudioHealthIndex } from "@/server/modules/dashboard/service";

interface StudioHealthIndexCardProps {
  shi: StudioHealthIndex;
  className?: string;
}

export function StudioHealthIndexCard({ shi, className = "" }: StudioHealthIndexCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getGradeTheme = (grade: StudioHealthIndex["grade"]) => {
    switch (grade) {
      case "OPTIMAL":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-700",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          stroke: "#10B981",
          ring: "text-emerald-500",
        };
      case "HEALTHY":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-700",
          badge: "bg-blue-100 text-blue-800 border-blue-300",
          stroke: "#3562E8",
          ring: "text-blue-600",
        };
      case "ATTENTION":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          stroke: "#F59E0B",
          ring: "text-amber-500",
        };
      case "CRITICAL":
      default:
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          badge: "bg-rose-100 text-rose-800 border-rose-300",
          stroke: "#EF4444",
          ring: "text-rose-500",
        };
    }
  };

  const theme = getGradeTheme(shi.grade);
  const isPositiveTrend = shi.trend.startsWith("+");

  // SVG Radial Gauge Calculation (radius = 36, circumference ~ 226)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (shi.score / 100) * circumference;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 transition-all ${className}`}
    >
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B122B] to-[#3562E8] text-white flex items-center justify-center shadow-md shadow-blue-500/10">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="type-card-title text-slate-900">
                Studio Health Index (SHI)
              </h2>
              <span
                className={`type-badge font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}
              >
                {shi.grade}
              </span>
            </div>
            <p className="type-helper text-slate-500">
              Composite telemetry: deliverables velocity, review latency, capacity, and cashflow
            </p>
          </div>
        </div>

        {/* Score & Gauge Header Right */}
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <div className="type-kpi-value text-slate-900 tabular-nums">
              {shi.score}
              <span className="text-sm font-semibold text-slate-400">/100</span>
            </div>
            <div
              className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${
                isPositiveTrend ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {isPositiveTrend ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{shi.trend}</span>
            </div>
          </div>

          {/* Radial Progress Ring */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="#E2E8F0"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={theme.stroke}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-xs font-bold font-mono text-slate-700">
              {shi.score}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. FOUR SUB-METRIC PILLARS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Pillar 1: Overdue Velocity */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Deliverables</span>
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {shi.subscores.overdueVelocity.score}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${shi.subscores.overdueVelocity.score}%` }}
            />
          </div>
          <div className="type-metadata text-slate-500 truncate">
            {shi.subscores.overdueVelocity.label}
          </div>
        </div>

        {/* Pillar 2: Review Turnaround */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Review Latency</span>
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {shi.subscores.reviewTurnaround.score}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${shi.subscores.reviewTurnaround.score}%` }}
            />
          </div>
          <div className="type-metadata text-slate-500 truncate">
            {shi.subscores.reviewTurnaround.label}
          </div>
        </div>

        {/* Pillar 3: Team Capacity Balance */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>Team Balance</span>
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {shi.subscores.teamCapacity.score}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${shi.subscores.teamCapacity.score}%` }}
            />
          </div>
          <div className="type-metadata text-slate-500 truncate">
            {shi.subscores.teamCapacity.label}
          </div>
        </div>

        {/* Pillar 4: Cashflow Momentum */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="flex items-center gap-1 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-amber-500" />
              <span>Cash Velocity</span>
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {shi.subscores.cashflowMomentum.score}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${shi.subscores.cashflowMomentum.score}%` }}
            />
          </div>
          <div className="type-metadata text-slate-500 truncate">
            {shi.subscores.cashflowMomentum.label}
          </div>
        </div>
      </div>

      {/* 3. AI / AUTOMATION LEVERAGE RECOMMENDATION STRIP */}
      <div className="p-3 sm:p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-2xl border border-blue-100 flex items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block font-mono">
              HIGH-LEVERAGE ACTION TO BOOST INDEX
            </span>
            <p className="text-slate-800 font-medium truncate mt-0.5">
              {shi.recommendation}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-[#3562E8] hover:underline flex items-center gap-1 shrink-0 cursor-pointer ml-auto"
        >
          <span>{isExpanded ? "Hide Details" : "Telemetry Drilldown"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 4. EXPANDED TELEMETRY EXPLANATION */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Info className="w-4 h-4 text-blue-600" />
            <span>How the Studio Health Index is Computed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
            <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
              <strong className="text-slate-900 block font-mono text-[11px]">
                1. Overdue Deliverables Velocity (30% Weight)
              </strong>
              <p className="text-[11px] leading-relaxed">
                Penalizes active drawing sets and tasks exceeding committed milestone deadlines. Current ratio: {shi.subscores.overdueVelocity.label}.
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
              <strong className="text-slate-900 block font-mono text-[11px]">
                2. Decision Airlock & Review Latency (25% Weight)
              </strong>
              <p className="text-[11px] leading-relaxed">
                Tracks turnaround time for drawings, submissions, and scope changes. Items waiting &gt;24 hours incrementally depress this score.
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
              <strong className="text-slate-900 block font-mono text-[11px]">
                3. Team Capacity Distribution (25% Weight)
              </strong>
              <p className="text-[11px] leading-relaxed">
                Flags allocation extremes where key architects are overloaded (&gt;8 active tasks) while others are under-utilized.
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
              <strong className="text-slate-900 block font-mono text-[11px]">
                4. Cashflow Operational Runway (20% Weight)
              </strong>
              <p className="text-[11px] leading-relaxed">
                Measures the ratio of recorded client fee collections against approved project vendor and material expenses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
