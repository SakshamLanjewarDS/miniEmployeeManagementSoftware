"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RotateCcw,
  User,
  Users,
  FolderKanban,
  Calendar,
  X,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { getCleanTaskTitle } from "@/components/tasks/task-utils";

interface CompletedTasksClientViewProps {
  workspaceSlug: string;
  userRole: string;
  currentMembershipId: string;
  isPrivileged: boolean;
  projects: Array<{ id: string; code: string; name: string }>;
  employees: Array<{
    id: string;
    user: { id: string; fullName: string; email: string };
    employee?: { employeeId: string; designation?: string | null } | null;
  }>;
  initialFilters: {
    search: string;
    assigneeId: string;
    projectId: string;
    priority: string;
    dateRange: string;
    onTimeStatus: string;
  };
}

export default function CompletedTasksClientView({
  workspaceSlug,
  userRole,
  currentMembershipId,
  isPrivileged,
  projects,
  employees,
  initialFilters,
}: CompletedTasksClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters State
  const [search, setSearch] = useState(initialFilters.search);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialFilters.assigneeId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialFilters.projectId);
  const [selectedPriority, setSelectedPriority] = useState(initialFilters.priority);
  const [dateRange, setDateRange] = useState(initialFilters.dateRange);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [onTimeStatus, setOnTimeStatus] = useState(initialFilters.onTimeStatus);
  const [hasReopenHistory, setHasReopenHistory] = useState(false);
  const [sortBy, setSortBy] = useState("completedAt_desc");
  const [page, setPage] = useState(1);

  // Data State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    uniqueCompletedTasks: 0,
    uniqueEmployeesContributing: 0,
    onTimeCount: 0,
    lateCount: 0,
    noDueDateCount: 0,
    legacyUnknownCount: 0,
    totalContributions: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });

  // Detail Drawer & Reopen Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [reopenModalTask, setReopenModalTask] = useState<any | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Completed Tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("workspaceSlug", workspaceSlug);
      if (search.trim()) q.set("search", search.trim());
      if (selectedEmployeeId) q.set("employeeIds", selectedEmployeeId);
      if (selectedProjectId) q.set("projectIds", selectedProjectId);
      if (selectedPriority) q.set("priorities", selectedPriority);
      if (dateRange) q.set("dateRange", dateRange);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (onTimeStatus && onTimeStatus !== "ALL") q.set("onTimeStatus", onTimeStatus);
      if (hasReopenHistory) q.set("hasReopenHistory", "true");
      q.set("sortBy", sortBy);
      q.set("page", String(page));
      q.set("pageSize", "25");

      const res = await fetch(`/api/tasks/completed?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load completed tasks");

      setTasks(data.tasks || []);
      setMetrics(data.metrics || {});
      setPagination(data.pagination || { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });

      // Update URL search parameters without full reload
      const newUrl = `/w/${workspaceSlug}/tasks/completed?${q.toString()}`;
      window.history.replaceState(null, "", newUrl);
    } catch (err: any) {
      console.error("Error fetching completed tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedEmployeeId, selectedProjectId, selectedPriority, dateRange, startDate, endDate, onTimeStatus, hasReopenHistory, sortBy, page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTasks();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const q = new URLSearchParams();
    q.set("workspaceSlug", workspaceSlug);
    if (search.trim()) q.set("search", search.trim());
    if (selectedEmployeeId) q.set("employeeIds", selectedEmployeeId);
    if (selectedProjectId) q.set("projectIds", selectedProjectId);
    if (selectedPriority) q.set("priorities", selectedPriority);
    if (dateRange) q.set("dateRange", dateRange);
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    if (onTimeStatus && onTimeStatus !== "ALL") q.set("onTimeStatus", onTimeStatus);
    if (hasReopenHistory) q.set("hasReopenHistory", "true");

    window.open(`/api/tasks/completed/export?${q.toString()}`, "_blank");
  };

  // Reopen Task Handler
  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModalTask || !reopenReason.trim()) return;

    setReopenSubmitting(true);
    setReopenError(null);
    try {
      const res = await fetch("/api/tasks/completed/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          taskId: reopenModalTask.id,
          reason: reopenReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen task");

      setActionSuccess(`Task "${reopenModalTask.title}" has been reopened into active work.`);
      setReopenModalTask(null);
      setReopenReason("");
      setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      setReopenError(err.message);
    } finally {
      setReopenSubmitting(false);
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedEmployeeId("");
    setSelectedProjectId("");
    setSelectedPriority("");
    setDateRange("ALL_TIME");
    setStartDate("");
    setEndDate("");
    setOnTimeStatus("ALL");
    setHasReopenHistory(false);
    setSortBy("completedAt_desc");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || selectedEmployeeId || selectedProjectId || selectedPriority || (dateRange && dateRange !== "ALL_TIME") || (onTimeStatus && onTimeStatus !== "ALL") || hasReopenHistory
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            <Link href={`/w/${workspaceSlug}/tasks`} className="hover:text-blue-600 transition-colors">
              Work Management
            </Link>
            <span>/</span>
            <span className="text-blue-600">Completed Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            <span>{isPrivileged ? "Completed Tasks Archive" : "My Completed Tasks"}</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Authoritative, durable delivery history. Completed tasks are safely archived without record duplication or loss of audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Active Tasks</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Completed Tasks
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{metrics.uniqueCompletedTasks}</span>
            <span className="text-[11px] text-slate-400">({metrics.totalContributions} contributions)</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Durable canonical records</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            On-Time Delivery
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{metrics.onTimeCount}</span>
            <span className="text-[11px] text-emerald-600">
              {metrics.uniqueCompletedTasks > 0
                ? `${Math.round((metrics.onTimeCount / metrics.uniqueCompletedTasks) * 100)}%`
                : "—"}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">Delivered on or before deadline</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Late Completions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{metrics.lateCount}</span>
            <span className="text-[11px] text-slate-400">({metrics.noDueDateCount} no due date)</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Completed after scheduled target</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Active Contributors
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700">{metrics.uniqueEmployeesContributing}</span>
            <span className="text-[11px] text-slate-400">staff</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Unique employees in this scope</span>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, code..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter (Owner/Admin only) */}
          {isPrivileged ? (
            <div>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer"
              >
                <option value="">All Assignees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user.fullName} {e.employee?.employeeId ? `(${e.employee.employeeId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">Scoped to My Completed Work</span>
            </div>
          )}

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer"
            >
              <option value="completedAt_desc">Latest Completion (Default)</option>
              <option value="completedAt_asc">Oldest Completion</option>
              <option value="dueDate">Target Due Date</option>
              <option value="priority">Priority</option>
              <option value="project">Project Name</option>
            </select>
          </div>
        </div>

        {/* Date Presets & On-Time Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 text-[11px] mr-1">Completed:</span>
            {["ALL_TIME", "TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_MONTH"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setDateRange(preset);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  dateRange === preset
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset === "ALL_TIME"
                  ? "All Time"
                  : preset === "TODAY"
                  ? "Today"
                  : preset === "THIS_WEEK"
                  ? "This Week"
                  : preset === "THIS_MONTH"
                  ? "This Month"
                  : "Last Month"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 text-[11px] mr-1">Status:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "ON_TIME", label: "On-Time", color: "text-emerald-700" },
              { id: "LATE", label: "Late", color: "text-rose-700" },
              { id: "NO_DUE_DATE", label: "No Due Date", color: "text-slate-600" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setOnTimeStatus(p.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  onTimeStatus === p.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}

            <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={hasReopenHistory}
                onChange={(e) => {
                  setHasReopenHistory(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-blue-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Has Reopen History</span>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-2 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading completed tasks archive...</div>
        ) : tasks.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No completed tasks match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try clearing filters to view tasks across all time and contributors."
                : "Deliverables will appear here immediately once their workflow status transitions to Completed."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-xl text-xs hover:bg-blue-100"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Task Deliverable</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Assignee(s)</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Completed Date</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {tasks.map((task) => {
                  const completedDateStr = task.completionDate
                    ? new Date(task.completionDate).toISOString().split("T")[0]
                    : "Legacy";
                  const dueDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[280px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{getCleanTaskTitle(task.title, task.project?.code)}</span>
                          {task.reopenCount > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]"
                              title={`Reopened ${task.reopenCount} time(s)`}
                            >
                              Reopened {task.reopenCount}x
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {task.project ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{task.project.code}</span>
                            <span className="text-slate-400">·</span>
                            <span className="truncate max-w-[120px]">{task.project.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Project</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.assignee ? (
                            <span className="font-medium text-slate-900">{task.assignee.user.fullName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                          {task.assignments && task.assignments.length > 0 && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              +{task.assignments.length}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            task.priority === "URGENT"
                              ? "bg-rose-100 text-rose-800"
                              : task.priority === "HIGH"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {completedDateStr}
                      </td>

                      <td className="py-3.5 px-4">
                        {task.timingClassification === "ON_TIME" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>On-Time</span>
                          </span>
                        ) : task.timingClassification === "LATE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Late {dueDateStr ? `(Due ${dueDateStr})` : ""}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {task.timingClassification === "NO_DUE_DATE" ? "No Deadline" : "Unknown Date"}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Details
                          </button>
                          {isPrivileged && (
                            <button
                              type="button"
                              onClick={() => {
                                setReopenModalTask(task);
                                setReopenReason("");
                                setReopenError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold cursor-pointer flex items-center gap-1"
                              title="Reopen task with mandatory justification"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Details Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Completed Deliverable
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{getCleanTaskTitle(selectedTask.title, selectedTask.project?.code)}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Project:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.project ? `${selectedTask.project.code} — ${selectedTask.project.name}` : "None"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Primary Assignee:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.assignee?.user.fullName || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Completed Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedTask.completionDate ? new Date(selectedTask.completionDate).toISOString().split("T")[0] : "Legacy"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Original Due Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split("T")[0] : "None"}
                  </span>
                </div>
              </div>

              {selectedTask.completedBy && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500">Completed By: </span>
                  <span className="font-semibold text-slate-800">{selectedTask.completedBy.user.fullName}</span>
                </div>
              )}

              {selectedTask.approvedBy && (
                <div>
                  <span className="text-slate-500">Approved By: </span>
                  <span className="font-semibold text-slate-800">{selectedTask.approvedBy.user.fullName}</span>
                </div>
              )}
            </div>

            {/* Co-Assignees / Contributors */}
            {selectedTask.assignments && selectedTask.assignments.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs block">
                  Contributing Assignees ({selectedTask.assignments.length})
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {selectedTask.assignments.map((a: any) => (
                    <div key={a.id} className="p-2.5 flex items-center justify-between bg-white">
                      <span className="font-semibold text-slate-800">{a.membership?.user.fullName}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                        Contribution Approved
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTask.description && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 text-xs block">Deliverable Description</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs whitespace-pre-wrap">
                  {selectedTask.description}
                </div>
              </div>
            )}

            {/* Reopen Audit Cycles */}
            {selectedTask.reopenCount > 0 && (
              <div className="space-y-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span>Reopen Lifecycle History ({selectedTask.reopenCount} cycle(s))</span>
                </div>
                {selectedTask.reopenReason && (
                  <p className="text-amber-800 italic">
                    Latest Justification: "{selectedTask.reopenReason}"
                  </p>
                )}
                {selectedTask.reopenedBy && (
                  <span className="text-[11px] text-amber-700 block">
                    Reopened by {selectedTask.reopenedBy.user.fullName} on{" "}
                    {selectedTask.reopenedAt ? new Date(selectedTask.reopenedAt).toISOString().split("T")[0] : ""}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/w/${workspaceSlug}/tasks?taskId=${selectedTask.id}`}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Open in Task Workbench</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              {isPrivileged && (
                <button
                  type="button"
                  onClick={() => {
                    setReopenModalTask(selectedTask);
                    setReopenReason("");
                    setReopenError(null);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reopen Deliverable</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reopen Mandatory Justification Modal */}
      {reopenModalTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reopen Completed Deliverable</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{reopenModalTask.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReopenModalTask(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopenSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Governance policy requires a justification reason whenever completed deliverables are reopened into active work.
              </p>

              {reopenError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold">
                  {reopenError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Reason for Reopening <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Client requested alteration to balcony railing detail after initial milestone approval."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReopenModalTask(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenSubmitting || !reopenReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {reopenSubmitting ? "Reopening..." : "Confirm & Reopen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
