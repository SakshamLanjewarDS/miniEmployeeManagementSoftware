"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TenantContext } from "@/server/tenancy/context";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Users,
  Download,
  Filter,
  Search,
  Calendar,
  ChevronRight,
  X,
  Info,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

interface PerformanceClientViewProps {
  context: TenantContext;
}

export function PerformanceClientView({ context }: PerformanceClientViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Period State
  const [preset, setPreset] = useState("THIS_MONTH");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAccessibleChartTable, setShowAccessibleChartTable] = useState(false);

  // Selected Employee Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "delivery" | "quality" | "capacity" | "evidence">("overview");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        workspaceSlug: context.tenantSlug,
        preset,
        ...(department !== "ALL" ? { department } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      const res = await fetch(`/api/performance?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status} failed`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load performance analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [preset, department]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      workspaceSlug: context.tenantSlug,
      preset,
      ...(department !== "ALL" ? { department } : {}),
    });
    window.location.href = `/api/performance/export?${params.toString()}`;
  };

  // Sorted and filtered employees
  const sortedEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return [...data.employees].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }
      if (aVal === null || aVal === undefined) return sortOrder === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === "asc" ? -1 : 1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortOrder]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3562E8]">
            <Layers className="w-3.5 h-3.5" />
            <span>Practice Management Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Employee Performance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data-backed delivery velocity, on-time delivery rates, four-eyes quality, and capacity utilization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh metrics"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#3562E8] hover:bg-[#2C308D] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Preset Selector */}
          <div className="flex items-center gap-1.5 text-xs font-medium bg-slate-100/80 p-1 rounded-xl overflow-x-auto touch-scroll-x max-w-full">
            {[
              { id: "TODAY", label: "Today" },
              { id: "THIS_WEEK", label: "This Week" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px] ${
                  preset === p.id
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 max-w-full sm:max-w-md justify-start sm:justify-end">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer min-h-[36px]"
            >
              <option value="ALL">All Departments</option>
              <option value="Architecture">Architecture</option>
              <option value="Interior Design">Interior Design</option>
              <option value="3D Visualization">3D Visualization</option>
              <option value="Civil">Civil</option>
              <option value="Administration">Administration</option>
            </select>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search architect name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3562E8] min-h-[36px]"
              />
            </form>
          </div>
        </div>

        {data?.period && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#3562E8]" />
              <span>Coverage: <strong>{data.period.startDate}</strong> to <strong>{data.period.endDate}</strong> ({data.period.totalDays} days in {data.period.timezone})</span>
            </span>
            {data.period.isCurrentPeriodIncomplete && (
              <span className="text-amber-600 font-medium">
                • Ongoing Period (metrics represent activity up to current moment)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Studio KPI Cards */}
      {data?.studioKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: On-Time Delivery Rate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>On-Time Delivery Rate</span>
              <Clock className="w-4 h-4 text-[#3562E8]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.studioKpis.onTimeRatePercent !== null ? `${data.studioKpis.onTimeRatePercent}%` : "—"}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({data.studioKpis.onTimeNumerator}/{data.studioKpis.onTimeDenominator} due items)
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Due deliverables completed on/before approved deadline</span>
            </div>
          </div>

          {/* KPI 2: Completed Deliverables */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Completed Deliverables</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.studioKpis.totalCompleted}
              </span>
              <span className="text-[11px] text-slate-500">
                ({data.studioKpis.governedCompleted} Governed, {data.studioKpis.operationalCompleted} Op)
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Independent four-eyes approved vs operational self-completed</span>
            </div>
          </div>

          {/* KPI 3: First-Pass Quality Rate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>First-Pass Approval</span>
              <FileCheck2 className="w-4 h-4 text-[#2C308D]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {data.studioKpis.firstPassRatePercent !== null ? `${data.studioKpis.firstPassRatePercent}%` : "—"}
              </span>
              <span className="text-[11px] text-slate-500">
                ({data.studioKpis.firstPassApproved}/{data.studioKpis.firstPassDecided} decided)
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Approved v1 submissions without rework ({data.studioKpis.firstPassPending} pending)</span>
            </div>
          </div>

          {/* KPI 4: Overdue Workload */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Overdue Workload</span>
              <AlertTriangle className={`w-4 h-4 ${data.studioKpis.totalOverdue > 0 ? "text-rose-500" : "text-slate-400"}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${data.studioKpis.totalOverdue > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {data.studioKpis.totalOverdue}
              </span>
              <span className="text-[11px] text-slate-500">
                items past deadline
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Capacity: {data.studioKpis.totalAllocatedHours}h allocated / {data.studioKpis.totalAvailableCapacityHours}h net available</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Trends Visualization Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Delivery Velocity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Delivery Velocity Trends</h2>
              <p className="text-[11px] text-slate-500">Weekly cohort delivery and on-time completion across studio</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAccessibleChartTable(!showAccessibleChartTable)}
              className="text-[11px] font-semibold text-[#3562E8] hover:underline"
            >
              {showAccessibleChartTable ? "Hide Data Table" : "Show Data Table"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {data?.deliveryTrends?.map((bucket: any) => (
              <div key={bucket.dateLabel} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>{bucket.dateLabel}</span>
                  <span>{bucket.completedCount} completed ({bucket.onTimeCount} on-time)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${Math.min(100, bucket.onTimeCount * 10)}%` }}
                    title={`On-time: ${bucket.onTimeCount}`}
                  />
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${Math.min(100, (bucket.completedCount - bucket.onTimeCount) * 10)}%` }}
                    title={`Completed with extension: ${bucket.completedCount - bucket.onTimeCount}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {showAccessibleChartTable && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs border border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-1">Period</th>
                    <th className="pb-1">Completed</th>
                    <th className="pb-1">On-Time</th>
                    <th className="pb-1">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.deliveryTrends?.map((b: any) => (
                    <tr key={b.dateLabel} className="border-b border-slate-100 last:border-0">
                      <td className="py-1">{b.dateLabel}</td>
                      <td className="py-1">{b.completedCount}</td>
                      <td className="py-1">{b.onTimeCount}</td>
                      <td className="py-1">{b.overdueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Card 2: Quality & First-Pass vs Rework */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Four-Eyes Quality & Revision Rework</h2>
              <p className="text-[11px] text-slate-500">First-pass approved deliverables vs revisions requested</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data?.qualityTrends?.map((bucket: any) => (
              <div key={bucket.dateLabel} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>{bucket.dateLabel}</span>
                  <span>{bucket.firstPassApproved} first-pass pass, {bucket.reworkRequired} revisions</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="bg-[#3562E8] h-full"
                    style={{ width: `${Math.min(100, bucket.firstPassApproved * 12)}%` }}
                    title={`First-Pass: ${bucket.firstPassApproved}`}
                  />
                  <div
                    className="bg-rose-400 h-full"
                    style={{ width: `${Math.min(100, bucket.reworkRequired * 12)}%` }}
                    title={`Rework: ${bucket.reworkRequired}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3562E8]" />
              <span>First-Pass Approved</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Technical Revision Requested</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Employee Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Architect & Staff Performance Dossier</h2>
            <p className="text-xs text-slate-500">Individual metrics calculated strictly for the authorized cohort and filters</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {sortedEmployees.length} staff members
          </span>
        </div>

        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full text-left text-xs text-slate-700 min-w-[720px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-right">Due Items</th>
                <th className="py-3 px-3 text-right">Completed</th>
                <th className="py-3 px-3 text-right">On-Time Rate</th>
                <th className="py-3 px-3 text-right">First-Pass</th>
                <th className="py-3 px-3 text-right">Rework</th>
                <th className="py-3 px-3 text-right">Overdue</th>
                <th className="py-3 px-3 text-right">Capacity (Net)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEmployees.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{emp.code} • {emp.designation}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{emp.department}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium">{emp.dueCount}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium">
                    <span title={`${emp.governedCompletedCount} Governed, ${emp.operationalCompletedCount} Operational`}>
                      {emp.completedCount}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {emp.onTimeRatePercent !== null ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        emp.onTimeRatePercent >= 85
                          ? "bg-emerald-50 text-emerald-700"
                          : emp.onTimeRatePercent >= 70
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}>
                        {emp.onTimeRatePercent}%
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {emp.firstPassRatePercent !== null ? (
                      <span className="font-mono font-bold text-slate-800">
                        {emp.firstPassRatePercent}%
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {emp.reworkCount > 0 ? (
                      <span className="text-amber-600 font-bold">{emp.reworkCount}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {emp.overdueCount > 0 ? (
                      <span className="text-rose-600 font-bold">{emp.overdueCount}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {emp.availableCapacityHours}h
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setDrawerTab("overview");
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#3562E8] hover:bg-[#3562E8]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Employee Detail Slide-over Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />

          {/* Drawer Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perf-drawer-title"
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 id="perf-drawer-title" className="text-base font-bold text-slate-900">{selectedEmployee.name}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedEmployee.code} • {selectedEmployee.designation} ({selectedEmployee.department})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-3 sm:px-4 text-xs font-semibold overflow-x-auto touch-scroll-x">
              {[
                { id: "overview", label: "Overview" },
                { id: "delivery", label: "Delivery" },
                { id: "quality", label: "Quality" },
                { id: "capacity", label: "Capacity" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDrawerTab(t.id as any)}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[40px] ${
                    drawerTab === t.id
                      ? "border-[#3562E8] text-[#3562E8] font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
              {drawerTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">On-Time Rate</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {selectedEmployee.onTimeRatePercent !== null ? `${selectedEmployee.onTimeRatePercent}%` : "No items due"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedEmployee.onTimeCount} of {selectedEmployee.onTimeEligibleDenominator} due items
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">First-Pass Rate</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {selectedEmployee.firstPassRatePercent !== null ? `${selectedEmployee.firstPassRatePercent}%` : "No submissions"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedEmployee.firstPassApprovedCount} of {selectedEmployee.firstPassDecidedCount} decided
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-900">Deliverable Breakdown in Period</div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Assigned In Period:</span>
                      <span className="font-mono font-bold">{selectedEmployee.assignedCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Governed Deliverables Passed:</span>
                      <span className="font-mono font-bold text-emerald-700">{selectedEmployee.governedCompletedCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Operational Deliverables Completed:</span>
                      <span className="font-mono font-bold">{selectedEmployee.operationalCompletedCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Active Blockers:</span>
                      <span className="font-mono font-bold text-rose-600">{selectedEmployee.activeBlockerCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "delivery" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 mb-2">Overdue Aging Bands</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>1 – 3 Days:</span>
                        <span className="font-mono font-bold">{selectedEmployee.overdueAging.band1to3d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>4 – 7 Days:</span>
                        <span className="font-mono font-bold">{selectedEmployee.overdueAging.band4to7d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>8 – 14 Days:</span>
                        <span className="font-mono font-bold">{selectedEmployee.overdueAging.band8to14d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>15+ Days (Critical):</span>
                        <span className="font-mono font-bold text-rose-600">{selectedEmployee.overdueAging.band15dPlus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "quality" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">Four-Eyes Quality Metrics</div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">First-Pass Submissions Approved:</span>
                    <span className="font-mono font-bold text-emerald-600">{selectedEmployee.firstPassApprovedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Technical Revisions Requested:</span>
                    <span className="font-mono font-bold text-amber-600">{selectedEmployee.reworkCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Pending Review:</span>
                    <span className="font-mono font-bold">{selectedEmployee.firstPassPendingCount}</span>
                  </div>
                </div>
              )}

              {drawerTab === "capacity" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">Capacity & Leave Deduction</div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Scheduled Studio Hours:</span>
                    <span className="font-mono font-bold">{selectedEmployee.scheduledHours}h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 text-emerald-700">
                    <span>Approved Leave Deduction:</span>
                    <span className="font-mono font-bold">-{selectedEmployee.leaveDeductionHours}h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 font-bold">
                    <span>Net Available Capacity:</span>
                    <span className="font-mono">{selectedEmployee.availableCapacityHours}h</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Estimated Effort Allocated:</span>
                    <span className="font-mono font-bold">{selectedEmployee.allocatedEstimatedHours}h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
