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
  Printer,
  Scale,
  MessageSquare,
  Award,
  Sparkles,
  MapPin,
  Activity,
  Compass,
  Check,
  Briefcase,
  AlertCircle,
  Zap,
  ListTodo,
  CheckSquare,
  PieChart,
  ExternalLink,
  ShieldCheck,
  CircleDot,
  SlidersHorizontal,
  ArrowRight,
  CornerDownRight,
} from "lucide-react";

interface PerformanceClientViewProps {
  context: TenantContext;
}

export function PerformanceClientView({ context }: PerformanceClientViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Modes: Dossier Table, 9-Box Matrix, Burnout Radar, Bottleneck Waterfall
  const [viewMode, setViewMode] = useState<"dossier" | "matrix" | "burnout" | "waterfall">("dossier");

  // Filters & Period State
  const [preset, setPreset] = useState("THIS_MONTH");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAccessibleChartTable, setShowAccessibleChartTable] = useState(false);

  // Selected Employee Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "tasks" | "taskAnalytics" | "radar" | "delivery" | "quality" | "site" | "capacity" | "notes">("overview");

  // Task Filter state in Slide-over Drawer
  const [drawerTaskStatusFilter, setDrawerTaskStatusFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "OVERDUE" | "BLOCKED">("ALL");
  const [drawerTaskSearch, setDrawerTaskSearch] = useState<string>("");
  const [drawerTaskProjectFilter, setDrawerTaskProjectFilter] = useState<string>("ALL");

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setDrawerTaskStatusFilter("ALL");
    setDrawerTaskSearch("");
    setDrawerTaskProjectFilter("ALL");
  };

  // Task counts for drawer filter tabs
  const drawerTaskCounts = useMemo(() => {
    if (!selectedEmployee?.taskList) {
      return { total: 0, completed: 0, inProgress: 0, overdue: 0, blocked: 0 };
    }
    const list = selectedEmployee.taskList as any[];
    return {
      total: list.length,
      completed: list.filter((t) => t.isCompleted).length,
      inProgress: list.filter((t) => !t.isCompleted && !t.isOverdue && !t.isBlocked && t.status !== "CANCELLED").length,
      overdue: list.filter((t) => t.isOverdue).length,
      blocked: list.filter((t) => t.isBlocked).length,
    };
  }, [selectedEmployee]);

  // Filtered task list for drawer
  const filteredEmployeeTasks = useMemo(() => {
    if (!selectedEmployee?.taskList) return [];
    return (selectedEmployee.taskList as any[]).filter((task) => {
      // Status filter
      if (drawerTaskStatusFilter === "COMPLETED" && !task.isCompleted) return false;
      if (drawerTaskStatusFilter === "IN_PROGRESS" && (task.isCompleted || task.isOverdue || task.isBlocked || task.status === "CANCELLED")) return false;
      if (drawerTaskStatusFilter === "OVERDUE" && !task.isOverdue) return false;
      if (drawerTaskStatusFilter === "BLOCKED" && !task.isBlocked) return false;

      // Project filter
      if (drawerTaskProjectFilter !== "ALL" && task.projectId !== drawerTaskProjectFilter) return false;

      // Search query
      if (drawerTaskSearch.trim()) {
        const q = drawerTaskSearch.toLowerCase().trim();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesProject = task.projectName?.toLowerCase().includes(q) || task.projectCode?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject) return false;
      }

      return true;
    });
  }, [selectedEmployee, drawerTaskStatusFilter, drawerTaskProjectFilter, drawerTaskSearch]);

  // Action Modals State
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [rebalanceEmployee, setRebalanceEmployee] = useState<any | null>(null);
  const [rebalanceTaskId, setRebalanceTaskId] = useState<string>("");
  const [rebalanceToMemberId, setRebalanceToMemberId] = useState<string>("");
  const [rebalanceReason, setRebalanceReason] = useState<string>("");
  const [rebalancing, setRebalancing] = useState(false);

  // Dossier Print / PDF Modal
  const [dossierModalEmployee, setDossierModalEmployee] = useState<any | null>(null);

  // Leadership Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteEmployee, setNoteEmployee] = useState<any | null>(null);
  const [noteType, setNoteType] = useState<"KUDOS" | "COACHING" | "NOTE">("KUDOS");
  const [noteMessage, setNoteMessage] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Success Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

      // If drawer employee is open, refresh their data from new payload
      if (selectedEmployee) {
        const refreshed = json.employees?.find((e: any) => e.employeeId === selectedEmployee.employeeId);
        if (refreshed) setSelectedEmployee(refreshed);
      }
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

  // Rebalance Task Handler
  const handleExecuteRebalance = async () => {
    if (!rebalanceTaskId || !rebalanceToMemberId) {
      alert("Please select both a deliverable and a target team member.");
      return;
    }
    setRebalancing(true);
    try {
      const res = await fetch("/api/performance/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: context.tenantSlug,
          taskId: rebalanceTaskId,
          toMembershipId: rebalanceToMemberId,
          reason: rebalanceReason || "Workload rebalanced via Employee Performance Suite",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to rebalance task");

      showToast(json.message || "Workload rebalanced successfully");
      setRebalanceModalOpen(false);
      setRebalanceReason("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to rebalance task");
    } finally {
      setRebalancing(false);
    }
  };

  // Submit Leadership Note Handler
  const handleSubmitNote = async () => {
    if (!noteMessage.trim() || !noteEmployee) return;
    setSubmittingNote(true);
    try {
      const res = await fetch("/api/performance/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: context.tenantSlug,
          employeeId: noteEmployee.employeeId,
          noteType,
          message: noteMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit note");

      showToast(json.message || "Leadership note recorded");
      setNoteModalOpen(false);
      setNoteMessage("");
    } catch (err: any) {
      alert(err.message || "Failed to submit note");
    } finally {
      setSubmittingNote(false);
    }
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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // SVG Radar Polygon Calculator (6-Axis: Velocity, Quality, Field, On-Time, Capacity, Punctuality)
  const renderRadarChart = (emp: any) => {
    const size = 260;
    const center = size / 2;
    const radius = size * 0.38;

    const vVelocity = Math.min(100, (emp.completedCount / Math.max(1, emp.assignedCount || 5)) * 100);
    const vQuality = emp.firstPassRatePercent ?? 70;
    const vField = Math.min(100, ((emp.siteVisitsCount || 0) / 4) * 100);
    const vOnTime = emp.onTimeRatePercent ?? 70;
    const vCapacity = Math.min(100, Math.max(20, 100 - Math.abs((emp.utilizationPercent || 80) - 85)));
    const vPunctuality = emp.attendancePunctualityPercent ?? 85;

    const values = [vVelocity, vQuality, vField, vOnTime, vCapacity, vPunctuality];
    const labels = ["Velocity", "Quality", "Field", "On-Time", "Capacity", "Punctuality"];
    const totalAxes = 6;

    const getCoord = (value: number, index: number) => {
      const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
      const r = (value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    };

    const polygonPoints = values.map((val, idx) => {
      const c = getCoord(val, idx);
      return `${c.x},${c.y}`;
    }).join(" ");

    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-inner">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-2">
          <Compass className="w-3.5 h-3.5" />
          <span>Practitioner Competency Radar</span>
        </div>
        <svg width={size} height={size} className="overflow-visible">
          {/* Concentric Grid Rings */}
          {[0.25, 0.5, 0.75, 1.0].map((level, lIdx) => {
            const ringPoints = Array.from({ length: totalAxes }).map((_, aIdx) => {
              const angle = (Math.PI * 2 / totalAxes) * aIdx - Math.PI / 2;
              const r = radius * level;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(" ");
            return (
              <polygon
                key={lIdx}
                points={ringPoints}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Spokes */}
          {Array.from({ length: totalAxes }).map((_, aIdx) => {
            const angle = (Math.PI * 2 / totalAxes) * aIdx - Math.PI / 2;
            const endX = center + radius * Math.cos(angle);
            const endY = center + radius * Math.sin(angle);
            return (
              <line
                key={aIdx}
                x1={center}
                y1={center}
                x2={endX}
                y2={endY}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(53, 98, 232, 0.35)"
            stroke="#5A81FA"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {values.map((val, idx) => {
            const pt = getCoord(val, idx);
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#ffffff"
                stroke="#3562E8"
                strokeWidth="2"
              />
            );
          })}

          {/* Labels */}
          {labels.map((lbl, idx) => {
            const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
            const labelR = radius + 18;
            const lx = center + labelR * Math.cos(angle);
            const ly = center + labelR * Math.sin(angle);
            return (
              <text
                key={idx}
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                className="text-[10px] font-mono font-medium fill-slate-300"
              >
                {lbl}
              </text>
            );
          })}
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2 w-full text-center text-[10px]">
          <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block">Quality</span>
            <span className="font-bold text-indigo-300">{emp.firstPassRatePercent ?? "—"}%</span>
          </div>
          <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block">On-Time</span>
            <span className="font-bold text-emerald-400">{emp.onTimeRatePercent ?? "—"}%</span>
          </div>
          <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block">Field</span>
            <span className="font-bold text-amber-400">{emp.siteVisitsCount} visits</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" suppressHydrationWarning>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3562E8]">
            <Layers className="w-3.5 h-3.5" />
            <span>Practice Management Hub • Enterprise Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Employee Performance & Talent Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Four-eyes governed delivery velocity, site inspection quality, attendance discipline, and workload health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh metrics"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3562E8]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (sortedEmployees.length > 0) {
                setDossierModalEmployee(sortedEmployees[0]);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#3562E8] hover:bg-[#2C308D] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>1-on-1 Review Briefing</span>
          </button>
        </div>
      </div>

      {/* 2. Controls, Period & View Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Preset Selector */}
          <div className="flex items-center gap-1.5 text-xs font-medium bg-slate-100/90 p-1 rounded-xl overflow-x-auto touch-scroll-x max-w-full">
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
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[34px] ${
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
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium cursor-pointer min-h-[36px]"
            >
              <option value="ALL">All Departments</option>
              <option value="Architecture">Architecture</option>
              <option value="Interior Design">Interior Design</option>
              <option value="3D Visualization">3D Visualization</option>
              <option value="Civil">Civil</option>
              <option value="Administration">Administration</option>
            </select>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[170px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search architect or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3562E8] min-h-[36px]"
              />
            </form>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode("dossier")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "dossier"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#3562E8]" />
              <span>Dossier Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>9-Box Talent Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("waterfall")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "waterfall"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>Handoff Latency Waterfall</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("burnout")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === "burnout"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-rose-500" />
              <span>Capacity & Burnout Heatmap</span>
            </button>
          </div>

          {data?.period && (
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#3562E8]" />
              <span>
                Window: <strong>{data.period.startDate}</strong> to <strong>{data.period.endDate}</strong> ({data.period.totalDays}d)
              </span>
              {data.period.isCurrentPeriodIncomplete && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Live Current Window
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Studio Macro KPI Cards (With Prior Period Deltas & Sparklines) */}
      {data?.studioKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: On-Time Delivery Rate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>On-Time Delivery Rate</span>
              <Clock className="w-4 h-4 text-[#3562E8]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                  {data.studioKpis.onTimeRatePercent !== null ? `${data.studioKpis.onTimeRatePercent}%` : "—"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({data.studioKpis.onTimeNumerator}/{data.studioKpis.onTimeDenominator})
                </span>
              </div>
              {data.studioKpis.onTimeDeltaPercent !== null && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    data.studioKpis.onTimeDeltaPercent >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {data.studioKpis.onTimeDeltaPercent >= 0 ? "+" : ""}
                  {data.studioKpis.onTimeDeltaPercent}%
                </span>
              )}
            </div>
            <div className="mt-2.5 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Deliverables completed on/before deadline</span>
            </div>
          </div>

          {/* KPI 2: Completed Deliverables */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Completed Deliverables</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                  {data.studioKpis.totalCompleted}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({data.studioKpis.governedCompleted} Governed, {data.studioKpis.operationalCompleted} Op)
                </span>
              </div>
              {data.studioKpis.completedDelta !== 0 && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    data.studioKpis.completedDelta >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {data.studioKpis.completedDelta >= 0 ? "+" : ""}
                  {data.studioKpis.completedDelta} items
                </span>
              )}
            </div>
            <div className="mt-2.5 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Independent four-eyes approved vs operational</span>
            </div>
          </div>

          {/* KPI 3: First-Pass Quality Rate */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>First-Pass Approval</span>
              <FileCheck2 className="w-4 h-4 text-[#2C308D]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                  {data.studioKpis.firstPassRatePercent !== null ? `${data.studioKpis.firstPassRatePercent}%` : "—"}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({data.studioKpis.firstPassApproved}/{data.studioKpis.firstPassDecided})
                </span>
              </div>
              {data.studioKpis.firstPassDeltaPercent !== null && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    data.studioKpis.firstPassDeltaPercent >= 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {data.studioKpis.firstPassDeltaPercent >= 0 ? "+" : ""}
                  {data.studioKpis.firstPassDeltaPercent}%
                </span>
              )}
            </div>
            <div className="mt-2.5 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Approved v1 submissions without rework ({data.studioKpis.firstPassPending} pending)</span>
            </div>
          </div>

          {/* KPI 4: Studio Capacity & Utilization */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Studio Capacity Health</span>
              <Scale className={`w-4 h-4 ${data.studioKpis.totalOverdue > 0 ? "text-amber-500" : "text-[#3562E8]"}`} />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                  {data.studioKpis.studioUtilizationPercent}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({data.studioKpis.totalAllocatedHours}h / {data.studioKpis.totalAvailableCapacityHours}h)
                </span>
              </div>
              <span
                className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  data.studioKpis.totalOverdue > 0
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {data.studioKpis.totalOverdue} overdue
              </span>
            </div>
            <div className="mt-2.5 text-[10px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Field visits: {data.studioKpis.totalSiteVisits} • Site issues resolved: {data.studioKpis.totalSiteIssuesResolved}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cross-Domain Intelligence Micro-Bar */}
      {data?.studioKpis && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border border-slate-800">
          <div className="space-y-0.5 border-r border-slate-800 pr-2">
            <div className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Site Inspections</span>
            </div>
            <div className="text-lg font-bold font-mono">{data.studioKpis.totalSiteVisits} visits</div>
            <div className="text-[10px] text-slate-400">Field audits completed in period</div>
          </div>

          <div className="space-y-0.5 border-r border-slate-800 pr-2">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Site Issues Resolved</span>
            </div>
            <div className="text-lg font-bold font-mono">{data.studioKpis.totalSiteIssuesResolved} closed</div>
            <div className="text-[10px] text-slate-400">Defects verified on project sites</div>
          </div>

          <div className="space-y-0.5 border-r border-slate-800 pr-2">
            <div className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Review Queue Wait</span>
            </div>
            <div className="text-lg font-bold font-mono">{data.studioKpis.avgReviewWaitHours} hrs</div>
            <div className="text-[10px] text-slate-400">Avg leadership decision turnaround</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-blue-300 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>Studio Punctuality</span>
            </div>
            <div className="text-lg font-bold font-mono">
              {data.studioKpis.studioPunctualityPercent !== null ? `${data.studioKpis.studioPunctualityPercent}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-400">On-time check-in reliability</div>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE CONTENT SWITCHER */}

      {/* VIEW MODE 1: 9-BOX TALENT & EXECUTION MATRIX */}
      {viewMode === "matrix" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>9-Box Talent & Strategic Execution Matrix</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-dimensional synthesis: Independent Four-Eyes First-Pass Quality vs. Delivery Velocity / On-Time Adherence.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Lead / Star ({data?.talentDistribution?.starCount || 0})</span>
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block ml-2" />
              <span>Precision ({data?.talentDistribution?.precisionCount || 0})</span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block ml-2" />
              <span>Velocity ({data?.talentDistribution?.velocityCount || 0})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quadrant 1: Star Lead Architects */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Lead Architects & Core Stars
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900">
                  Quality ≥75% & On-Time ≥75%
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Pillars of the studio. High precision drafting coupled with rigorous schedule adherence. Prime candidates for project architect ownership.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedEmployees
                  .filter((e) => e.talentQuadrant === "STAR")
                  .map((emp) => (
                    <div
                      key={emp.employeeId}
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("overview");
                      }}
                      className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.designation}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="font-bold text-emerald-700">{emp.onTimeRatePercent}% OT</div>
                        <div className="text-indigo-600">{emp.firstPassRatePercent}% FP</div>
                      </div>
                    </div>
                  ))}
                {sortedEmployees.filter((e) => e.talentQuadrant === "STAR").length === 0 && (
                  <div className="text-xs text-slate-400 italic py-2">No employees currently in this quadrant.</div>
                )}
              </div>
            </div>

            {/* Quadrant 2: Precision Masters */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    Precision Masters & Detailers
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-900">
                  Quality ≥75% & On-Time &lt;75%
                </span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Exceptional technical drawing standards with zero rework, but vulnerable to deadline slippage. Requires milestone scoping and buffer protection.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedEmployees
                  .filter((e) => e.talentQuadrant === "PRECISION")
                  .map((emp) => (
                    <div
                      key={emp.employeeId}
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("overview");
                      }}
                      className="p-2.5 rounded-xl bg-white border border-indigo-200 shadow-2xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.designation}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="text-amber-700">{emp.onTimeRatePercent ?? "—"}% OT</div>
                        <div className="font-bold text-indigo-700">{emp.firstPassRatePercent}% FP</div>
                      </div>
                    </div>
                  ))}
                {sortedEmployees.filter((e) => e.talentQuadrant === "PRECISION").length === 0 && (
                  <div className="text-xs text-slate-400 italic py-2">No employees currently in this quadrant.</div>
                )}
              </div>
            </div>

            {/* Quadrant 3: High Velocity Deliverers */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    High Velocity Deliverers
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
                  Quality &lt;75% & On-Time ≥75%
                </span>
              </div>
              <p className="text-[11px] text-amber-700">
                Extremely rapid completion and always on time, but generates revision cycles. Benefits from drafting checklists and peer QA pre-checks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedEmployees
                  .filter((e) => e.talentQuadrant === "VELOCITY")
                  .map((emp) => (
                    <div
                      key={emp.employeeId}
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("overview");
                      }}
                      className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.designation}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="font-bold text-emerald-700">{emp.onTimeRatePercent}% OT</div>
                        <div className="text-rose-600">{emp.firstPassRatePercent ?? "—"}% FP</div>
                      </div>
                    </div>
                  ))}
                {sortedEmployees.filter((e) => e.talentQuadrant === "VELOCITY").length === 0 && (
                  <div className="text-xs text-slate-400 italic py-2">No employees currently in this quadrant.</div>
                )}
              </div>
            </div>

            {/* Quadrant 4: Growth & Guidance Needed */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Developing & Guidance Required
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Emerging / Support Needed
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Staff currently facing delivery impediments, onboarding, or rework churn. Target for 1-on-1 coaching plans or workload rebalancing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedEmployees
                  .filter((e) => e.talentQuadrant === "GROWTH")
                  .map((emp) => (
                    <div
                      key={emp.employeeId}
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("overview");
                      }}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.designation}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="text-slate-600">{emp.onTimeRatePercent ?? "—"}% OT</div>
                        <div className="text-slate-500">{emp.firstPassRatePercent ?? "—"}% FP</div>
                      </div>
                    </div>
                  ))}
                {sortedEmployees.filter((e) => e.talentQuadrant === "GROWTH").length === 0 && (
                  <div className="text-xs text-slate-400 italic py-2">No employees currently in this quadrant.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: HANDOFF LATENCY WATERFALL */}
      {viewMode === "waterfall" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Deliverable Lifecycle & Handoff Latency Waterfall</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies whether delays originate in architectural drafting, leadership review queue delays, or client technical rework.
            </p>
          </div>

          {/* Macro Studio Waterfall Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900">Studio Average Deliverable Lifecycle (Elapsed Hours)</div>
            <div className="w-full h-8 rounded-xl bg-slate-200 overflow-hidden flex text-[11px] font-bold text-white">
              <div
                style={{ width: "45%" }}
                className="bg-[#3562E8] flex items-center justify-center px-2 truncate"
                title={`Drafting Phase: ${data?.bottleneckWaterfall?.avgDraftingHours || 22}h`}
              >
                1. Drafting ({data?.bottleneckWaterfall?.avgDraftingHours || 22}h)
              </div>
              <div
                style={{ width: "35%" }}
                className="bg-amber-500 flex items-center justify-center px-2 truncate"
                title={`Reviewer Queue: ${data?.bottleneckWaterfall?.avgReviewWaitHours || 14}h`}
              >
                2. Review Queue ({data?.bottleneckWaterfall?.avgReviewWaitHours || 14}h)
              </div>
              <div
                style={{ width: "20%" }}
                className="bg-rose-500 flex items-center justify-center px-2 truncate"
                title={`Rework Revision: ${data?.bottleneckWaterfall?.avgReworkHours || 8}h`}
              >
                3. Rework ({data?.bottleneckWaterfall?.avgReworkHours || 8}h)
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Avg Architect Drafting</span>
                <span className="text-base font-bold text-[#3562E8] font-mono">
                  {data?.bottleneckWaterfall?.avgDraftingHours || 22.4} hrs
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Avg Reviewer Queue Wait</span>
                <span className="text-base font-bold text-amber-600 font-mono">
                  {data?.bottleneckWaterfall?.avgReviewWaitHours || 14.8} hrs
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Avg Revision Rework</span>
                <span className="text-base font-bold text-rose-600 font-mono">
                  {data?.bottleneckWaterfall?.avgReworkHours || 8.5} hrs
                </span>
              </div>
            </div>
          </div>

          {/* Individual Breakdown Table */}
          <div className="overflow-x-auto touch-scroll-x">
            <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Architect</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Drafting Time (h)</th>
                  <th className="py-2.5 px-3 text-right">Review Wait (h)</th>
                  <th className="py-2.5 px-3 text-right">Rework Cycles</th>
                  <th className="py-2.5 px-3 text-right">Active Blockers</th>
                  <th className="py-2.5 px-3 text-center">Primary Bottleneck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedEmployees.map((emp) => {
                  const isReviewBottleneck = emp.reviewWaitHours > 24;
                  const isReworkBottleneck = emp.reworkCount >= 3;
                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{emp.department}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">{emp.draftingHours}h</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className={isReviewBottleneck ? "font-bold text-amber-600" : ""}>
                          {emp.reviewWaitHours}h
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className={emp.reworkCount > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                          {emp.reworkCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {emp.activeBlockerCount > 0 ? (
                          <span className="font-bold text-rose-600">{emp.activeBlockerCount}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isReviewBottleneck ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Leadership Review Delay
                          </span>
                        ) : isReworkBottleneck ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                            Drafting Revisions
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Smooth Flow
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: CAPACITY & BURNOUT HEATMAP */}
      {viewMode === "burnout" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-rose-500" />
                <span>Workload Fragility & Burnout Radar</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proactive studio monitoring: early alerts for chronic overallocation, excessive overtime, and overdue tasks.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {sortedEmployees.filter((e) => e.burnoutRisk === "CRITICAL").length} Critical Overloads
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEmployees.map((emp) => {
              const isCritical = emp.burnoutRisk === "CRITICAL";
              const isElevated = emp.burnoutRisk === "ELEVATED";
              return (
                <div
                  key={emp.employeeId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical
                      ? "bg-rose-50/60 border-rose-200 shadow-sm"
                      : isElevated
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-white border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{emp.code} • {emp.department}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? "bg-rose-600 text-white"
                          : isElevated
                          ? "bg-amber-500 text-white"
                          : emp.burnoutRisk === "OPTIMAL"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {emp.burnoutRisk}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Capacity Utilization</span>
                      <span className="font-mono font-bold">{emp.utilizationPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          emp.utilizationPercent > 110
                            ? "bg-rose-600"
                            : emp.utilizationPercent > 90
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, emp.utilizationPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                      <span>Allocated: {emp.allocatedEstimatedHours}h</span>
                      <span>Net Available: {emp.availableCapacityHours}h</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Overdue Items</span>
                      <span className={`font-mono font-bold ${emp.overdueCount > 0 ? "text-rose-600" : "text-slate-700"}`}>
                        {emp.overdueCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Overtime Hours</span>
                      <span className="font-mono font-bold text-slate-700">{emp.overtimeHours}h</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("radar");
                      }}
                      className="text-[11px] font-semibold text-[#3562E8] hover:underline"
                    >
                      View Radar
                    </button>
                    {(isCritical || isElevated || emp.overdueCount > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setRebalanceEmployee(emp);
                          setRebalanceTaskId(emp.openTasks[0]?.id || "");
                          setRebalanceModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Rebalance Workload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: DOSSIER TABLE (PRIMARY DEFAULT) */}
      {viewMode === "dossier" && (
        <div className="space-y-6">
          {/* Dual Trend Visualizations */}
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
                  <p className="text-[11px] text-slate-500">First-pass approved deliverables vs technical revisions</p>
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

          {/* Employee Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Architect & Staff Performance Dossier</h2>
                <p className="text-xs text-slate-500">Click any column header to sort; click an employee to open their 360° competence dossier</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {sortedEmployees.length} staff members
              </span>
            </div>

            <div className="overflow-x-auto touch-scroll-x">
              <table className="w-full text-left text-xs text-slate-700 min-w-[840px]">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => handleSort("name")}>
                      Employee
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort("department")}>
                      Department
                    </th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:text-slate-900" onClick={() => handleSort("talentQuadrant")}>
                      Talent Tier
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("completedCount")}>
                      Completed
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("onTimeRatePercent")}>
                      On-Time Rate
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("firstPassRatePercent")}>
                      First-Pass
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("siteVisitsCount")}>
                      Site Visits
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("overdueCount")}>
                      Overdue
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("utilizationPercent")}>
                      Utilization
                    </th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedEmployees.map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        handleSelectEmployee(emp);
                        setDrawerTab("overview");
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {emp.burnoutRisk === "CRITICAL" && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Critical Overload" />
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{emp.code} • {emp.designation}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{emp.department}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.talentQuadrant === "STAR"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : emp.talentQuadrant === "PRECISION"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : emp.talentQuadrant === "VELOCITY"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {emp.talentQuadrant}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        <span title={`${emp.governedCompletedCount} Governed, ${emp.operationalCompletedCount} Operational`}>
                          {emp.completedCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {emp.onTimeRatePercent !== null ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                              emp.onTimeRatePercent >= 80
                                ? "bg-emerald-50 text-emerald-700"
                                : emp.onTimeRatePercent >= 70
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
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
                        {emp.siteVisitsCount > 0 ? (
                          <span className="font-bold text-[#3562E8]">{emp.siteVisitsCount}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {emp.overdueCount > 0 ? (
                          <span className="text-rose-600 font-bold">{emp.overdueCount}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            emp.utilizationPercent > 110
                              ? "text-rose-600"
                              : emp.utilizationPercent > 95
                              ? "text-amber-600"
                              : "text-slate-700"
                          }`}
                        >
                          {emp.utilizationPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectEmployee(emp);
                              setDrawerTab("tasks");
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-[#3562E8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="View employee's deliverables and task breakdown"
                          >
                            <ListTodo className="w-3 h-3 text-[#3562E8]" />
                            <span>Tasks ({emp.taskList?.length ?? emp.assignedCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectEmployee(emp);
                              setDrawerTab("overview");
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-[#3562E8] hover:bg-[#3562E8]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDossierModalEmployee(emp)}
                            title="Generate 1-on-1 Review Briefing"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SLIDE-OVER DETAIL DRAWER */}
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
            className="relative w-full max-w-2xl lg:max-w-3xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="perf-drawer-title" className="text-base font-bold text-slate-900">
                    {selectedEmployee.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedEmployee.talentQuadrant === "STAR"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedEmployee.talentQuadrant === "PRECISION"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {selectedEmployee.talentQuadrant} TIER
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedEmployee.code} • {selectedEmployee.designation} ({selectedEmployee.department})
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDossierModalEmployee(selectedEmployee)}
                  className="p-2 text-slate-500 hover:text-[#3562E8] hover:bg-white rounded-xl border border-slate-200 transition-colors"
                  title="Print Executive 1-on-1 Dossier"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-3 sm:px-4 text-xs font-semibold overflow-x-auto touch-scroll-x">
              {[
                { id: "overview", label: "Overview" },
                {
                  id: "tasks",
                  label: `Deliverables & Tasks (${selectedEmployee.taskList?.length || selectedEmployee.assignedCount || 0})`,
                  badge: (selectedEmployee.taskAnalytics?.overdueTasks || selectedEmployee.overdueCount) > 0
                    ? `${selectedEmployee.taskAnalytics?.overdueTasks || selectedEmployee.overdueCount} late`
                    : undefined,
                  badgeColor: "bg-rose-100 text-rose-700",
                },
                { id: "taskAnalytics", label: "Task Analytics & Mix" },
                { id: "radar", label: "Competency Radar" },
                { id: "delivery", label: "Delivery & Latency" },
                { id: "quality", label: "Quality & Rework" },
                { id: "site", label: "Site & Field" },
                { id: "capacity", label: "Capacity & Attendance" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDrawerTab(t.id as any)}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
                    drawerTab === t.id
                      ? "border-[#3562E8] text-[#3562E8] font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>{t.label}</span>
                  {t.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${t.badgeColor}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
              {drawerTab === "overview" && (
                <div className="space-y-4">
                  {/* Top Key Performance Indicators */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">On-Time Rate</div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                        {selectedEmployee.onTimeRatePercent !== null ? `${selectedEmployee.onTimeRatePercent}%` : "No items due"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedEmployee.onTimeCount} of {selectedEmployee.onTimeEligibleDenominator} due deliverables
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">First-Pass Rate</div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                        {selectedEmployee.firstPassRatePercent !== null ? `${selectedEmployee.firstPassRatePercent}%` : "No submissions"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {selectedEmployee.firstPassApprovedCount} of {selectedEmployee.firstPassDecidedCount} decided
                      </div>
                    </div>
                  </div>

                  {/* Deliverables Execution Health Card */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-[#3562E8]" />
                        <span className="text-xs font-bold text-slate-900">Deliverables Execution Health</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrawerTab("tasks")}
                        className="text-[11px] font-semibold text-[#3562E8] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All Deliverables ({selectedEmployee.taskAnalytics?.totalTasks || selectedEmployee.assignedCount || 0})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Tasks</div>
                        <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                          {selectedEmployee.taskAnalytics?.totalTasks ?? selectedEmployee.assignedCount}
                        </div>
                      </div>
                      <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-100">
                        <div className="text-[10px] uppercase font-bold text-emerald-700">Completed</div>
                        <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
                          {selectedEmployee.taskAnalytics?.completedTasks ?? selectedEmployee.completedCount}
                        </div>
                      </div>
                      <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-100">
                        <div className="text-[10px] uppercase font-bold text-blue-700">In Progress</div>
                        <div className="text-lg font-bold font-mono text-blue-800 mt-0.5">
                          {selectedEmployee.taskAnalytics?.inProgressTasks ?? 0}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-lg border ${
                        (selectedEmployee.taskAnalytics?.overdueTasks ?? selectedEmployee.overdueCount) > 0
                          ? "bg-rose-50/80 border-rose-200"
                          : "bg-slate-50 border-slate-100"
                      }`}>
                        <div className={`text-[10px] uppercase font-bold ${
                          (selectedEmployee.taskAnalytics?.overdueTasks ?? selectedEmployee.overdueCount) > 0
                            ? "text-rose-700"
                            : "text-slate-400"
                        }`}>Overdue</div>
                        <div className={`text-lg font-bold font-mono mt-0.5 ${
                          (selectedEmployee.taskAnalytics?.overdueTasks ?? selectedEmployee.overdueCount) > 0
                            ? "text-rose-700"
                            : "text-slate-900"
                        }`}>
                          {selectedEmployee.taskAnalytics?.overdueTasks ?? selectedEmployee.overdueCount}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Completion Rate</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedEmployee.taskAnalytics?.completionRatePercent ?? 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{
                            width: `${
                              selectedEmployee.taskAnalytics?.totalTasks
                                ? ((selectedEmployee.taskAnalytics.onTimeCompletedCount || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100
                                : 0
                            }%`,
                          }}
                          title={`On-Time Completed: ${selectedEmployee.taskAnalytics?.onTimeCompletedCount || 0}`}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all"
                          style={{
                            width: `${
                              selectedEmployee.taskAnalytics?.totalTasks
                                ? ((selectedEmployee.taskAnalytics.lateCompletedCount || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100
                                : 0
                            }%`,
                          }}
                          title={`Late Completed: ${selectedEmployee.taskAnalytics?.lateCompletedCount || 0}`}
                        />
                        <div
                          className="bg-blue-400 h-full transition-all"
                          style={{
                            width: `${
                              selectedEmployee.taskAnalytics?.totalTasks
                                ? ((selectedEmployee.taskAnalytics.inProgressTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100
                                : 0
                            }%`,
                          }}
                          title={`In Progress: ${selectedEmployee.taskAnalytics?.inProgressTasks || 0}`}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all"
                          style={{
                            width: `${
                              selectedEmployee.taskAnalytics?.totalTasks
                                ? ((selectedEmployee.taskAnalytics.overdueTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100
                                : 0
                            }%`,
                          }}
                          title={`Overdue: ${selectedEmployee.taskAnalytics?.overdueTasks || 0}`}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Need deep project & urgency breakdown?</span>
                      <button
                        type="button"
                        onClick={() => setDrawerTab("taskAnalytics")}
                        className="font-bold text-[#3562E8] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Task Analytics & Mix</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-900">Deliverables in Evaluation Window</div>
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
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Active Delivery Blockers:</span>
                      <span className="font-mono font-bold text-rose-600">{selectedEmployee.activeBlockerCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Site Inspections Completed:</span>
                      <span className="font-mono font-bold text-[#3562E8]">{selectedEmployee.siteVisitsCount}</span>
                    </div>
                  </div>

                  {/* Quick Leadership Actions */}
                  <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-900">Direct Leadership Actions</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteEmployee(selectedEmployee);
                          setNoteType("KUDOS");
                          setNoteModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>Award Kudos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteEmployee(selectedEmployee);
                          setNoteType("COACHING");
                          setNoteModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Add Coaching Note</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DEDICATED TAB 1: DELIVERABLES & TASKS */}
              {drawerTab === "tasks" && (
                <div className="space-y-4">
                  {/* 1. Filter Pills Row */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "ALL", label: "All Tasks", count: drawerTaskCounts.total, activeColor: "bg-slate-900 text-white" },
                      { id: "COMPLETED", label: "Completed", count: drawerTaskCounts.completed, activeColor: "bg-emerald-600 text-white", badgeColor: "text-emerald-700 bg-emerald-100" },
                      { id: "IN_PROGRESS", label: "In Progress", count: drawerTaskCounts.inProgress, activeColor: "bg-[#3562E8] text-white", badgeColor: "text-blue-700 bg-blue-100" },
                      { id: "OVERDUE", label: "Overdue", count: drawerTaskCounts.overdue, activeColor: "bg-rose-600 text-white", badgeColor: "text-rose-700 bg-rose-100" },
                      { id: "BLOCKED", label: "Blocked", count: drawerTaskCounts.blocked, activeColor: "bg-amber-600 text-white", badgeColor: "text-amber-700 bg-amber-100" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDrawerTaskStatusFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          drawerTaskStatusFilter === f.id
                            ? `${f.activeColor} shadow-2xs`
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          drawerTaskStatusFilter === f.id ? "bg-white/20 text-white" : (f.badgeColor || "bg-slate-200 text-slate-700")
                        }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 2. Search & Project Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={drawerTaskSearch}
                        onChange={(e) => setDrawerTaskSearch(e.target.value)}
                        placeholder="Search deliverables or projects..."
                        className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3562E8]"
                      />
                      {drawerTaskSearch && (
                        <button
                          type="button"
                          onClick={() => setDrawerTaskSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="sm:w-56 shrink-0">
                      <select
                        value={drawerTaskProjectFilter}
                        onChange={(e) => setDrawerTaskProjectFilter(e.target.value)}
                        aria-label="Filter tasks by project"
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#3562E8]"
                      >
                        <option value="ALL">All Projects ({selectedEmployee.taskAnalytics?.projectBreakdown?.length || 0})</option>
                        {selectedEmployee.taskAnalytics?.projectBreakdown?.map((p: any) => (
                          <option key={p.projectId} value={p.projectId}>
                            [{p.projectCode}] {p.projectName} ({p.total})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Status Summary Banner */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>
                      Showing <strong>{filteredEmployeeTasks.length}</strong> of <strong>{drawerTaskCounts.total}</strong> deliverables
                      {drawerTaskStatusFilter !== "ALL" && ` (Filter: ${drawerTaskStatusFilter})`}
                    </span>
                    {drawerTaskCounts.overdue > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRebalanceEmployee(selectedEmployee);
                          const firstOverdue = selectedEmployee.taskList?.find((t: any) => t.isOverdue);
                          if (firstOverdue) setRebalanceTaskId(firstOverdue.id);
                          setRebalanceModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Scale className="w-3 h-3" />
                        <span>Rebalance Overdue Workload</span>
                      </button>
                    )}
                  </div>

                  {/* 4. Task Cards List */}
                  {filteredEmployeeTasks.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-bold text-slate-700">No deliverables match current filters</div>
                      <p className="text-xs text-slate-400">
                        Try changing the status filter or clearing your search query.
                      </p>
                      {(drawerTaskStatusFilter !== "ALL" || drawerTaskSearch || drawerTaskProjectFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerTaskStatusFilter("ALL");
                            setDrawerTaskSearch("");
                            setDrawerTaskProjectFilter("ALL");
                          }}
                          className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEmployeeTasks.map((task: any) => {
                        const isOverdue = task.isOverdue;
                        const isCompleted = task.isCompleted;
                        const isBlocked = task.isBlocked;

                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isOverdue
                                ? "bg-rose-50/30 border-rose-200 hover:border-rose-300"
                                : isBlocked
                                ? "bg-amber-50/30 border-amber-200 hover:border-amber-300"
                                : isCompleted
                                ? "bg-white border-slate-200/90 hover:border-slate-300"
                                : "bg-white border-slate-200 hover:border-[#3562E8]/40 shadow-2xs"
                            }`}
                          >
                            {/* Card Top: Badges */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Status Pill */}
                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>COMPLETED</span>
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>OVERDUE (+{task.overdueDays}d)</span>
                                  </span>
                                ) : isBlocked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>BLOCKED</span>
                                  </span>
                                ) : task.status === "IN_PROGRESS" || task.status === "ONGOING" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3" />
                                    <span>IN PROGRESS</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    <CircleDot className="w-3 h-3" />
                                    <span>{task.status}</span>
                                  </span>
                                )}

                                {/* Priority Pill */}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    task.priority === "URGENT"
                                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                                      : task.priority === "HIGH"
                                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                                      : task.priority === "MEDIUM"
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {task.priority}
                                </span>

                                {/* Project Tag */}
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold flex items-center gap-1">
                                  <span>[{task.projectCode}]</span>
                                  <span className="max-w-[140px] truncate">{task.projectName}</span>
                                </span>
                              </div>

                              {/* Governance pill */}
                              <div>
                                {task.governancePolicy === "FOUR_EYES_GOVERNED" ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Four-Eyes Governed</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Operational
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Task Title */}
                            <div className="text-sm font-bold text-slate-900 mt-2 mb-1">
                              {task.title}
                            </div>

                            {/* Checklist Progress if items exist */}
                            {task.checklistTotal > 0 && (
                              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3 text-slate-400" />
                                    <span>Checklist Milestones</span>
                                  </span>
                                  <span className="font-mono font-bold">
                                    {task.checklistCompleted} / {task.checklistTotal} ({Math.round((task.checklistCompleted / task.checklistTotal) * 100)}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      task.checklistCompleted === task.checklistTotal ? "bg-emerald-500" : "bg-[#3562E8]"
                                    }`}
                                    style={{ width: `${(task.checklistCompleted / task.checklistTotal) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Blocker reason if blocked */}
                            {task.isBlocked && (
                              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <span className="font-bold">Blocker Detail: </span>
                                  {task.blockerReason || "Delivery blocked pending external resolution or team input."}
                                </div>
                              </div>
                            )}

                            {/* Submission status & review feedback if present */}
                            {(task.latestSubmissionStatus || task.latestFeedback) && (
                              <div className="mt-2 p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[10px] uppercase text-indigo-700 flex items-center gap-1">
                                    <FileCheck2 className="w-3 h-3" />
                                    <span>Leadership Review: {task.latestSubmissionStatus || "Submitted"}</span>
                                  </span>
                                  <span className="text-[10px] text-indigo-500 font-mono">
                                    {task.submissionCount} {task.submissionCount === 1 ? "submission" : "submissions"}
                                  </span>
                                </div>
                                {task.latestFeedback && (
                                  <p className="italic text-slate-700 pl-2 border-l-2 border-indigo-300">
                                    "{task.latestFeedback}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Footer: Timeline & Actions */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap text-slate-500">
                                <span className="flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>Due: {task.dueDate || "No deadline"}</span>
                                </span>

                                {isCompleted && (
                                  <>
                                    <span>•</span>
                                    {task.isOnTime === true ? (
                                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        ✓ Delivered On-Time ({task.completionDate})
                                      </span>
                                    ) : task.isOnTime === false ? (
                                      <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        ⚠️ Delivered Late ({task.completionDate})
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">
                                        Finished: {task.completionDate}
                                      </span>
                                    )}
                                  </>
                                )}

                                {isOverdue && (
                                  <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                    🚨 {task.overdueDays} days past deadline
                                  </span>
                                )}

                                {task.estimatedHours && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-600">
                                      {task.estimatedHours}h est.
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1.5">
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRebalanceEmployee(selectedEmployee);
                                      setRebalanceTaskId(task.id);
                                      setRebalanceModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-[#3562E8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Scale className="w-3 h-3" />
                                    <span>Reassign / Offload</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* DEDICATED TAB 2: TASK ANALYTICS & MIX */}
              {drawerTab === "taskAnalytics" && (
                <div className="space-y-4">
                  {/* Hero Metric Scorecards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Completion Rate</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        {selectedEmployee.taskAnalytics?.completionRatePercent ?? 0}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedEmployee.taskAnalytics?.completedTasks ?? 0} of {selectedEmployee.taskAnalytics?.totalTasks ?? 0} finished
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">On-Time Execution</div>
                      <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                        {selectedEmployee.onTimeRatePercent !== null ? `${selectedEmployee.onTimeRatePercent}%` : "—"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedEmployee.taskAnalytics?.onTimeCompletedCount ?? 0} on-time, {selectedEmployee.taskAnalytics?.lateCompletedCount ?? 0} late
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Active Pressure</div>
                      <div className={`text-2xl font-bold font-mono mt-1 ${
                        (selectedEmployee.taskAnalytics?.overdueTasks || 0) > 0 ? "text-rose-600" : "text-slate-900"
                      }`}>
                        {(selectedEmployee.taskAnalytics?.overdueTasks || 0) + (selectedEmployee.taskAnalytics?.blockedTasks || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedEmployee.taskAnalytics?.overdueTasks || 0} overdue • {selectedEmployee.taskAnalytics?.blockedTasks || 0} blocked
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Capacity Load</div>
                      <div className="text-2xl font-bold font-mono text-[#3562E8] mt-1">
                        {selectedEmployee.utilizationPercent}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedEmployee.allocatedEstimatedHours}h of {selectedEmployee.availableCapacityHours}h net
                      </div>
                    </div>
                  </div>

                  {/* Deliverable Mix & Status Distribution Bar */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <PieChart className="w-4 h-4 text-[#3562E8]" />
                        <span>Deliverables Status Distribution</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {selectedEmployee.taskAnalytics?.totalTasks || 0} total deliverables
                      </span>
                    </div>

                    {/* Stacked Distribution Bar */}
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                      {(selectedEmployee.taskAnalytics?.totalTasks || 0) > 0 ? (
                        <>
                          <div
                            className="bg-emerald-500 h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.onTimeCompletedCount || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`On-time completed: ${selectedEmployee.taskAnalytics.onTimeCompletedCount || 0}`}
                          />
                          <div
                            className="bg-amber-400 h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.lateCompletedCount || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`Late completed: ${selectedEmployee.taskAnalytics.lateCompletedCount || 0}`}
                          />
                          <div
                            className="bg-[#3562E8] h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.inProgressTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`In progress: ${selectedEmployee.taskAnalytics.inProgressTasks || 0}`}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.overdueTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`Overdue: ${selectedEmployee.taskAnalytics.overdueTasks || 0}`}
                          />
                          <div
                            className="bg-orange-500 h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.blockedTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`Blocked: ${selectedEmployee.taskAnalytics.blockedTasks || 0}`}
                          />
                          <div
                            className="bg-slate-300 h-full"
                            style={{
                              width: `${((selectedEmployee.taskAnalytics.pendingTasks || 0) / selectedEmployee.taskAnalytics.totalTasks) * 100}%`,
                            }}
                            title={`Pending: ${selectedEmployee.taskAnalytics.pendingTasks || 0}`}
                          />
                        </>
                      ) : (
                        <div className="bg-slate-200 h-full w-full" />
                      )}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-slate-600 truncate">On-Time: <strong>{selectedEmployee.taskAnalytics?.onTimeCompletedCount || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-slate-600 truncate">Late: <strong>{selectedEmployee.taskAnalytics?.lateCompletedCount || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3562E8] shrink-0" />
                        <span className="text-slate-600 truncate">Active: <strong>{selectedEmployee.taskAnalytics?.inProgressTasks || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-slate-600 truncate">Overdue: <strong>{selectedEmployee.taskAnalytics?.overdueTasks || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-slate-600 truncate">Blocked: <strong>{selectedEmployee.taskAnalytics?.blockedTasks || 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                        <span className="text-slate-600 truncate">Pending: <strong>{selectedEmployee.taskAnalytics?.pendingTasks || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Project Breakdown & Context Switching */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-600" />
                        <span>Project Workload Distribution & Context Switching</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {selectedEmployee.taskAnalytics?.projectBreakdown?.length || 0} active projects
                      </span>
                    </div>

                    {selectedEmployee.taskAnalytics?.projectBreakdown && selectedEmployee.taskAnalytics.projectBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.taskAnalytics.projectBreakdown.map((prj: any, idx: number) => {
                          const pct = prj.total > 0 ? Math.round((prj.completed / prj.total) * 100) : 0;
                          return (
                            <div key={prj.projectId} className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-800">[{prj.projectCode}]</span>
                                  <span className="font-semibold text-slate-900">{prj.projectName}</span>
                                  {idx === 0 && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                                      Primary Load
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500">
                                  <strong>{prj.completed}</strong> / {prj.total} completed ({pct}%)
                                  {prj.overdue > 0 && (
                                    <span className="text-rose-600 font-bold ml-1.5">
                                      • {prj.overdue} overdue
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-[#3562E8]"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No project task mappings found.</div>
                    )}

                    {(selectedEmployee.taskAnalytics?.projectBreakdown?.length || 0) >= 4 && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>High Context Switching:</strong> Assigned across {selectedEmployee.taskAnalytics.projectBreakdown.length} concurrent projects. High task interleaving may reduce technical focus and elevate handoff latency.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Priority Mix & Cognitive Pressure */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Priority Pressure & Task Urgency Mix</span>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          label: "Urgent Priority",
                          count: selectedEmployee.taskAnalytics?.priorityBreakdown?.urgent || 0,
                          barColor: "bg-rose-500",
                          textColor: "text-rose-700",
                        },
                        {
                          label: "High Priority",
                          count: selectedEmployee.taskAnalytics?.priorityBreakdown?.high || 0,
                          barColor: "bg-orange-500",
                          textColor: "text-orange-700",
                        },
                        {
                          label: "Medium Priority",
                          count: selectedEmployee.taskAnalytics?.priorityBreakdown?.medium || 0,
                          barColor: "bg-[#3562E8]",
                          textColor: "text-blue-700",
                        },
                        {
                          label: "Low Priority",
                          count: selectedEmployee.taskAnalytics?.priorityBreakdown?.low || 0,
                          barColor: "bg-slate-400",
                          textColor: "text-slate-600",
                        },
                      ].map((p) => {
                        const total = selectedEmployee.taskAnalytics?.totalTasks || 1;
                        const pct = Math.round((p.count / total) * 100);
                        return (
                          <div key={p.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600 font-medium">{p.label}</span>
                              <span className="font-mono font-bold text-slate-800">
                                {p.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full ${p.barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stress Assessment */}
                    {(() => {
                      const urgent = selectedEmployee.taskAnalytics?.priorityBreakdown?.urgent || 0;
                      const high = selectedEmployee.taskAnalytics?.priorityBreakdown?.high || 0;
                      const total = selectedEmployee.taskAnalytics?.totalTasks || 1;
                      const ratio = (urgent + high) / total;

                      if (ratio >= 0.4 && total > 2) {
                        return (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>High Urgency Load ({Math.round(ratio * 100)}%):</strong> Over 40% of deliverables are marked Urgent/High. Recommend offloading medium/low deliverables to protect core execution quality.
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Balanced Priority Distribution:</strong> Healthy spread of urgent vs routine tasks without disproportionate firefighting pressure.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Governance & Four-Eyes Technical Quality Architecture */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Four-Eyes Technical Governance vs Operational Deliverables</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Governed Deliverables Passed (Four-Eyes):</span>
                      <span className="font-mono font-bold text-purple-700">
                        {selectedEmployee.governedCompletedCount}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Operational Deliverables Completed:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedEmployee.operationalCompletedCount}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">First-Pass Technical Approval Rate:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {selectedEmployee.firstPassRatePercent !== null ? `${selectedEmployee.firstPassRatePercent}%` : "No decided reviews"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Technical Revisions / Rework Required:</span>
                      <span className="font-mono font-bold text-amber-600">
                        {selectedEmployee.reworkCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "radar" && (
                <div className="space-y-4">
                  {renderRadarChart(selectedEmployee)}
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    The Competency Radar visualizes balanced performance across 6 facets. High performers balance drafting velocity and first-pass technical accuracy without neglecting site coordination or schedule discipline.
                  </p>
                </div>
              )}

              {drawerTab === "delivery" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Handoff Latency Breakdown</div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Average Drafting Turnaround:</span>
                      <span className="font-mono font-bold">{selectedEmployee.draftingHours} hrs</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Average Leadership Review Wait:</span>
                      <span className="font-mono font-bold text-amber-600">{selectedEmployee.reviewWaitHours} hrs</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Median Full Deliverable Cycle:</span>
                      <span className="font-mono font-bold text-[#3562E8]">{selectedEmployee.medianTurnaroundHours} hrs</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Overdue Aging Bands</div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>1 – 3 Days:</span>
                      <span className="font-mono font-bold">{selectedEmployee.overdueAging.band1to3d}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>4 – 7 Days:</span>
                      <span className="font-mono font-bold">{selectedEmployee.overdueAging.band4to7d}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>8 – 14 Days:</span>
                      <span className="font-mono font-bold">{selectedEmployee.overdueAging.band8to14d}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-rose-600 font-semibold">15+ Days (Critical):</span>
                      <span className="font-mono font-bold text-rose-600">{selectedEmployee.overdueAging.band15dPlus}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "quality" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900">Four-Eyes Technical Quality</div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">First-Pass Submissions Approved:</span>
                    <span className="font-mono font-bold text-emerald-600">{selectedEmployee.firstPassApprovedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Technical Revisions Requested:</span>
                    <span className="font-mono font-bold text-amber-600">{selectedEmployee.reworkCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Submissions Pending Leadership Review:</span>
                    <span className="font-mono font-bold">{selectedEmployee.firstPassPendingCount}</span>
                  </div>
                </div>
              )}

              {drawerTab === "site" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-900">Field Inspections & Defect Resolution</div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Site Visits Conducted:</span>
                    <span className="font-mono font-bold text-[#3562E8]">{selectedEmployee.siteVisitsCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Site Visit Reports Accepted:</span>
                    <span className="font-mono font-bold text-emerald-600">{selectedEmployee.siteVisitsApprovedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Site Snags / Issues Logged:</span>
                    <span className="font-mono font-bold">{selectedEmployee.siteIssuesReportedCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Site Issues Verified & Resolved:</span>
                    <span className="font-mono font-bold text-emerald-600">{selectedEmployee.siteIssuesResolvedCount}</span>
                  </div>
                </div>
              )}

              {drawerTab === "capacity" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Capacity & Leave Health</div>
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
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Estimated Effort Allocated:</span>
                      <span className="font-mono font-bold">{selectedEmployee.allocatedEstimatedHours}h</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Capacity Utilization:</span>
                      <span className="font-mono font-bold text-[#3562E8]">{selectedEmployee.utilizationPercent}%</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Attendance & Punctuality Reliability</div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Present Workdays:</span>
                      <span className="font-mono font-bold">{selectedEmployee.attendancePresentDays} days</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Punctuality Rate:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {selectedEmployee.attendancePunctualityPercent !== null ? `${selectedEmployee.attendancePunctualityPercent}%` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Overtime Hours Logged:</span>
                      <span className="font-mono font-bold">{selectedEmployee.overtimeHours}h</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. WORKLOAD REBALANCING MODAL */}
      {rebalanceModalOpen && rebalanceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Rebalance Employee Workload</h3>
              </div>
              <button
                type="button"
                onClick={() => setRebalanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Reassign active deliverables from <strong>{rebalanceEmployee.name}</strong> ({rebalanceEmployee.utilizationPercent}% utilization, {rebalanceEmployee.overdueCount} overdue) to a colleague with safe capacity.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  1. Select Deliverable to Offload:
                </label>
                {(() => {
                  const candidateTasks = (rebalanceEmployee.taskList?.filter((t: any) => !t.isCompleted && t.status !== "CANCELLED") || rebalanceEmployee.openTasks || []);
                  if (candidateTasks.length > 0) {
                    return (
                      <select
                        value={rebalanceTaskId}
                        onChange={(e) => setRebalanceTaskId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="">Select a deliverable to reassign...</option>
                        {candidateTasks.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.priority} • Due: {t.dueDate || "No deadline"}{t.isOverdue ? ` • OVERDUE (+${t.overdueDays}d)` : ""})
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <div className="text-xs text-slate-400 italic">No open deliverables available to reassign.</div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  2. Select Recipient Colleague:
                </label>
                <select
                  value={rebalanceToMemberId}
                  onChange={(e) => setRebalanceToMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Choose team member...</option>
                  {data?.availableColleagues
                    ?.filter((c: any) => c.membershipId !== rebalanceEmployee.membershipId)
                    .map((c: any) => (
                      <option key={c.membershipId} value={c.membershipId}>
                        {c.name} ({c.department} • {c.utilizationPercent}% util • {c.availableCapacityHours}h net)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  3. Reason / Handover Note:
                </label>
                <textarea
                  value={rebalanceReason}
                  onChange={(e) => setRebalanceReason(e.target.value)}
                  placeholder="e.g. Offloading schematic drafting to prevent delivery bottleneck..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRebalanceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rebalancing || !rebalanceTaskId || !rebalanceToMemberId}
                onClick={handleExecuteRebalance}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#3562E8] hover:bg-[#2C308D] text-white disabled:opacity-50"
              >
                {rebalancing ? "Reassigning..." : "Execute Rebalance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. LEADERSHIP NOTE & KUDOS MODAL */}
      {noteModalOpen && noteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Leadership Note & Review Feedback</h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Recording feedback for <strong>{noteEmployee.name}</strong> ({noteEmployee.designation}). This entry is logged in the tenant audit trail.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Feedback Classification:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "KUDOS", label: "Commendation", color: "text-amber-700 bg-amber-50" },
                    { id: "COACHING", label: "Coaching Plan", color: "text-indigo-700 bg-indigo-50" },
                    { id: "NOTE", label: "General Note", color: "text-slate-700 bg-slate-50" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNoteType(t.id as any)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                        noteType === t.id
                          ? "border-[#3562E8] bg-[#3562E8]/10 text-[#3562E8]"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message / Review Observations:</label>
                <textarea
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  placeholder="Record observations regarding drawing precision, client coordination, or milestone dedication..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#3562E8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingNote || !noteMessage.trim()}
                onClick={handleSubmitNote}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#3562E8] hover:bg-[#2C308D] text-white disabled:opacity-50"
              >
                {submittingNote ? "Logging..." : "Log to Audit Dossier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. 1-ON-1 EXECUTIVE PERFORMANCE DOSSIER MODAL (PRINT & PDF READY) */}
      {dossierModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 my-8 print:border-none print:shadow-none print:p-0">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#3562E8]" />
                <h3 className="text-base font-bold text-slate-900">Executive 1-on-1 Performance Dossier</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#3562E8] hover:bg-[#2C308D] rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDossierModalEmployee(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE DOSSIER CONTENT */}
            <div className="space-y-6 text-slate-800">
              {/* Executive Dossier Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#3562E8]">
                    100% DESIGN Studio OS • Talent Evaluation Report
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">{dossierModalEmployee.name}</h2>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">
                    {dossierModalEmployee.code} • {dossierModalEmployee.designation} • {dossierModalEmployee.department}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900">Period: {data?.period?.startDate} to {data?.period?.endDate}</div>
                  <div className="text-slate-500 text-[10px]">{data?.period?.timezone}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 border border-slate-300">
                    {dossierModalEmployee.talentQuadrant} TIER
                  </span>
                </div>
              </div>

              {/* Scorecard Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">On-Time Rate</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {dossierModalEmployee.onTimeRatePercent !== null ? `${dossierModalEmployee.onTimeRatePercent}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">First-Pass Quality</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {dossierModalEmployee.firstPassRatePercent !== null ? `${dossierModalEmployee.firstPassRatePercent}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Field Inspections</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {dossierModalEmployee.siteVisitsCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Punctuality</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {dossierModalEmployee.attendancePunctualityPercent !== null ? `${dossierModalEmployee.attendancePunctualityPercent}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Two Column Detailed Metrics */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                    Delivery & Quality Integrity
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Total Completed:</span>
                    <span className="font-mono font-bold">{dossierModalEmployee.completedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Governed Four-Eyes Passed:</span>
                    <span className="font-mono font-bold text-emerald-700">{dossierModalEmployee.governedCompletedCount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Revisions Requested:</span>
                    <span className="font-mono font-bold text-amber-700">{dossierModalEmployee.reworkCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Drafting Turnaround:</span>
                    <span className="font-mono font-bold">{dossierModalEmployee.draftingHours} hrs</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                    Capacity & Attendance Balance
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Scheduled Studio Hours:</span>
                    <span className="font-mono font-bold">{dossierModalEmployee.scheduledHours}h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Approved Leave Deductions:</span>
                    <span className="font-mono font-bold">-{dossierModalEmployee.leaveDeductionHours}h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Capacity Utilization:</span>
                    <span className="font-mono font-bold">{dossierModalEmployee.utilizationPercent}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Overtime Hours:</span>
                    <span className="font-mono font-bold">{dossierModalEmployee.overtimeHours}h</span>
                  </div>
                </div>
              </div>

              {/* Review Sign-Off Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
                <div className="space-y-6">
                  <div>
                    <span className="font-bold block text-slate-800">Evaluated By:</span>
                    <span className="text-[11px] text-slate-500">Partner / Studio Director</span>
                  </div>
                  <div className="border-b border-slate-400 w-48" />
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="font-bold block text-slate-800">Acknowledged By:</span>
                    <span className="text-[11px] text-slate-500">{dossierModalEmployee.name}</span>
                  </div>
                  <div className="border-b border-slate-400 w-48" />
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
