"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileQuestion,
  ChevronRight,
  X,
} from "lucide-react";

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

interface DaySlot {
  date: string;
  dayName: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  standardCapacityHours: number;
  leaveHours: number;
  leaveType?: string;
  availableCapacityHours: number;
  plannedDemandHours: number;
  tasks: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    estimatedHours: number;
    allocatedHoursToday: number;
    hasEstimate: boolean;
  }>;
}

interface EmployeeSummary {
  membershipId: string;
  employeeId?: string;
  employeeNumber?: string;
  fullName: string;
  email: string;
  department?: string;
  designation?: string;
  totalWorkingDays: number;
  availableCapacityHours: number;
  plannedDemandHours: number;
  utilizationPercentage: number;
  allocationStatus: "BALANCED" | "OVERALLOCATED" | "UNDERALLOCATED" | "ESTIMATES_INCOMPLETE";
  missingEstimateCount: number;
  assignedTaskCount: number;
  dailySlots: DaySlot[];
}

interface CapacityOverviewResponse {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string };
  overallMetrics: {
    totalEmployees: number;
    totalAvailableHours: number;
    totalPlannedHours: number;
    averageUtilization: number;
    overallocatedCount: number;
    underallocatedCount: number;
    balancedCount: number;
    incompleteEstimatesCount: number;
    unscheduledTasksCount: number;
  };
  employees: EmployeeSummary[];
  unscheduledTasks: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    estimatedHours: number | null;
    assigneeName?: string;
    missingReason: string;
  }>;
}

export default function WorkloadCapacityPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CapacityOverviewResponse | null>(null);

  // Filters
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(formatDate(addDays(new Date(), 13)));
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Selected Employee for Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTask, setAdjustTask] = useState<{ id: string; title: string; currentAssigneeId?: string } | null>(null);
  const [targetAssigneeId, setTargetAssigneeId] = useState<string>("");
  const [newStartDate, setNewStartDate] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        startDate,
        endDate,
        ...(departmentFilter ? { department: departmentFilter } : {}),
      });

      const res = await fetch(`/api/capacity?${query.toString()}`, {
        headers: { "x-workspace-slug": workspaceSlug },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load capacity data");
      }
      setData(json);
      if (selectedEmployee) {
        const updated = json.employees?.find((e: any) => e.membershipId === selectedEmployee.membershipId);
        if (updated) setSelectedEmployee(updated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceSlug) {
      fetchData();
    }
  }, [workspaceSlug, startDate, endDate, departmentFilter]);

  const handleOpenAdjust = (task: { id: string; title: string; currentAssigneeId?: string }) => {
    setAdjustTask(task);
    setTargetAssigneeId(task.currentAssigneeId || "");
    setNewStartDate("");
    setNewDueDate("");
    setAdjustReason("");
    setPreviewData(null);
    setAdjustModalOpen(true);
  };

  const handlePreviewAdjustment = async () => {
    if (!adjustTask) return;
    try {
      setPreviewLoading(true);
      const res = await fetch("/api/capacity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({
          action: "preview",
          taskId: adjustTask.id,
          targetAssigneeId: targetAssigneeId || undefined,
          newStartDate: newStartDate || undefined,
          newDueDate: newDueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview failed");
      setPreviewData(json.preview);
    } catch (err: any) {
      alert(`Preview Error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyAdjustment = async () => {
    if (!adjustTask || !adjustReason.trim()) {
      alert("Please enter a valid reason for this schedule adjustment.");
      return;
    }
    try {
      setAdjustSubmitting(true);
      const res = await fetch("/api/capacity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({
          action: "adjust",
          taskId: adjustTask.id,
          targetAssigneeId: targetAssigneeId || undefined,
          newStartDate: newStartDate || undefined,
          newDueDate: newDueDate || undefined,
          reason: adjustReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Adjustment failed");

      alert("Workload adjustment applied successfully and logged to audit history.");
      setAdjustModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Adjustment Error: ${err.message}`);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const STANDARD_DEPARTMENTS = [
    "Architecture",
    "Interior Design",
    "Structural",
    "Landscape",
    "MEP",
    "3D Visualisation",
    "Admin / Finance",
    "Project Management",
  ];

  const [allDepartments, setAllDepartments] = useState<string[]>(STANDARD_DEPARTMENTS);

  useEffect(() => {
    if (data?.employees) {
      setAllDepartments((prev) => {
        const set = new Set(prev);
        data.employees.forEach((e) => {
          if (e.department) set.add(e.department);
        });
        return Array.from(set).sort();
      });
    }
  }, [data]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter((e) => {
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (selectedStatusFilter === "ALL") return true;
      return e.allocationStatus === selectedStatusFilter;
    });
  }, [data, selectedStatusFilter, departmentFilter]);

  const getStatusBadge = (status: EmployeeSummary["allocationStatus"], utilization: number) => {
    switch (status) {
      case "OVERALLOCATED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Overallocated ({utilization}%)
          </span>
        );
      case "UNDERALLOCATED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Underallocated ({utilization}%)
          </span>
        );
      case "ESTIMATES_INCOMPLETE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Estimates Missing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Balanced ({utilization}%)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B122B] tracking-tight">
            Workload & Capacity Planning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time schedule capacity, approved leave deductions, and demand math across studio talent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(formatDate(addDays(new Date(), 13)));
            }}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 shadow-sm transition"
          >
            2 Weeks
          </button>
          <button
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(formatDate(addDays(new Date(), 29)));
            }}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 shadow-sm transition"
          >
            30 Days
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Transparent Math Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <strong className="text-slate-800">Planning Methodology:</strong> Available capacity is
          derived strictly from configured working schedule (8h/day, 10:30–18:30 IST) minus weekends,
          studio holidays, and approved leave. Planned demand is computed from explicit task estimated
          hours divided equally across assigned members. If estimates are missing, capacity is shown
          as incomplete—hours are never fabricated. Utilization is a resource balancing tool, not an
          individual performance score.
        </div>
      </div>

      {/* Metrics Row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Active Talent</div>
            <div className="text-xl font-bold text-[#0B122B] mt-1">
              {data.overallMetrics.totalEmployees}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Assigned to studio</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Available Capacity</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {data.overallMetrics.totalAvailableHours}h
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">After leave deductions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Planned Demand</div>
            <div className="text-xl font-bold text-[#5A81FA] mt-1">
              {data.overallMetrics.totalPlannedHours}h
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg Util: {data.overallMetrics.averageUtilization}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-rose-600">Overallocated</div>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {data.overallMetrics.overallocatedCount}
            </div>
            <div className="text-[11px] text-rose-500 mt-0.5">&gt;100% scheduled</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-amber-600">Underallocated</div>
            <div className="text-xl font-bold text-amber-700 mt-1">
              {data.overallMetrics.underallocatedCount}
            </div>
            <div className="text-[11px] text-amber-500 mt-0.5">&lt;70% scheduled</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-purple-600">Missing Estimates</div>
            <div className="text-xl font-bold text-purple-700 mt-1">
              {data.overallMetrics.incompleteEstimatesCount}
            </div>
            <div className="text-[11px] text-purple-500 mt-0.5">Tasks missing hours</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5A81FA] bg-white cursor-pointer"
            >
              <option value="">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              aria-label="Filter by allocation status"
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5A81FA] bg-white cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OVERALLOCATED">Overallocated (&gt;100%)</option>
              <option value="BALANCED">Balanced (70-100%)</option>
              <option value="UNDERALLOCATED">Underallocated (&lt;70%)</option>
              <option value="ESTIMATES_INCOMPLETE">Estimates Incomplete</option>
            </select>
          </div>

          {(departmentFilter || selectedStatusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter("");
                setSelectedStatusFilter("ALL");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Employee Capacity Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0B122B] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5A81FA]" />
            Employee Workload Matrix
          </h2>
          <span className="text-xs text-slate-400">
            Click an employee row to view granular day-by-day task distributions
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5A81FA]" />
            Calculating studio availability and workload allocations...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No employees found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll-x">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Talent</th>
                  <th className="py-3 px-3">Working Days</th>
                  <th className="py-3 px-3">Capacity</th>
                  <th className="py-3 px-3">Planned Demand</th>
                  <th className="py-3 px-3">Utilization</th>
                  <th className="py-3 px-3">Allocation Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.membershipId}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#0B122B]">{emp.fullName}</div>
                      <div className="text-[11px] text-slate-400">
                        {emp.department || "General"} {emp.designation ? `• ${emp.designation}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{emp.totalWorkingDays} days</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {emp.availableCapacityHours}h
                    </td>
                    <td className="py-3 px-3 text-[#5A81FA] font-medium">
                      {emp.plannedDemandHours}h
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              emp.allocationStatus === "OVERALLOCATED"
                                ? "bg-rose-500"
                                : emp.allocationStatus === "UNDERALLOCATED"
                                ? "bg-amber-400"
                                : emp.allocationStatus === "ESTIMATES_INCOMPLETE"
                                ? "bg-purple-400"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, emp.utilizationPercentage)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-600">
                          {emp.utilizationPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(emp.allocationStatus, emp.utilizationPercentage)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="text-xs text-[#5A81FA] hover:text-[#4870e8] font-medium inline-flex items-center gap-1"
                      >
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unscheduled Tasks Section */}
      {data && data.unscheduledTasks.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
            <FileQuestion className="w-4 h-4 text-amber-600" />
            Unscheduled Active Tasks ({data.unscheduledTasks.length})
          </div>
          <p className="text-xs text-amber-700 mb-3">
            These tasks have no start date or due date configured and cannot be mapped into the
            capacity schedule. Assign dates to track them accurately.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-3 rounded-lg border border-amber-200/60 shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-slate-800">{task.title}</div>
                  <div className="text-[11px] text-slate-400">
                    {task.projectName} • {task.assigneeName || "Unassigned"}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdjust(task)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition"
                >
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Detail Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emp-drawer-title"
            className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 id="emp-drawer-title" className="text-base font-bold text-[#0B122B]">
                  {selectedEmployee.fullName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmployee.department || "General"} • {selectedEmployee.designation || "Team Member"} •{" "}
                  {selectedEmployee.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Row inside Drawer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3.5 sm:p-4 bg-slate-50/30 border-b border-slate-100 text-center">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                <div className="text-[11px] text-slate-400 font-medium">Available Capacity</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {selectedEmployee.availableCapacityHours}h
                </div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                <div className="text-[11px] text-slate-400 font-medium">Planned Demand</div>
                <div className="text-base font-bold text-[#5A81FA] mt-0.5">
                  {selectedEmployee.plannedDemandHours}h
                </div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                <div className="text-[11px] text-slate-400 font-medium">Allocation Status</div>
                <div className="mt-1">
                  {getStatusBadge(
                    selectedEmployee.allocationStatus,
                    selectedEmployee.utilizationPercentage
                  )}
                </div>
              </div>
            </div>

            {/* Daily Schedule List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Daily Workload & Leave Breakdown
              </h4>

              {selectedEmployee.dailySlots.map((slot) => (
                <div
                  key={slot.date}
                  className={`p-3.5 rounded-xl border text-xs transition ${
                    !slot.isWorkingDay
                      ? "bg-slate-50/50 border-slate-200/60 text-slate-400"
                      : slot.leaveHours > 0
                      ? "bg-purple-50/40 border-purple-200/60"
                      : "bg-white border-slate-200/80 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {slot.date} ({slot.dayName})
                      </span>
                      {slot.isHoliday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">
                          Holiday: {slot.holidayName || "Public Holiday"}
                        </span>
                      )}
                      {!slot.isWorkingDay && !slot.isHoliday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                          Weekend
                        </span>
                      )}
                      {slot.leaveHours > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                          {slot.leaveType}: -{slot.leaveHours}h
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-medium text-slate-700">
                        {slot.plannedDemandHours}h Demand / {slot.availableCapacityHours}h Avail
                      </span>
                    </div>
                  </div>

                  {slot.tasks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                      {slot.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between bg-slate-50 p-2 rounded text-[11px]"
                        >
                          <div>
                            <span className="font-medium text-slate-800">{task.title}</span>
                            <span className="text-slate-400 ml-1.5">({task.projectName})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#5A81FA] font-medium">
                              +{task.allocatedHoursToday}h today
                            </span>
                            <button
                              onClick={() =>
                                handleOpenAdjust({
                                  id: task.id,
                                  title: task.title,
                                  currentAssigneeId: selectedEmployee.membershipId,
                                })
                              }
                              className="text-[10px] text-slate-500 hover:text-[#5A81FA] underline"
                            >
                              Adjust
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Schedule / Reassign Modal */}
      {adjustModalOpen && adjustTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-workload-title"
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="adjust-workload-title" className="text-base font-bold text-[#0B122B]">
                Adjust Workload: {adjustTask.title}
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Reassign Talent:
                </label>
                <select
                  value={targetAssigneeId}
                  onChange={(e) => setTargetAssigneeId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                >
                  <option value="">-- Keep Current Assignee --</option>
                  {data?.employees.map((e) => (
                    <option key={e.membershipId} value={e.membershipId}>
                      {e.fullName} ({e.department || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">New Start Date:</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">New Due Date:</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handlePreviewAdjustment}
                  disabled={previewLoading}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
                >
                  {previewLoading ? "Checking Conflicts..." : "Preview Impact & Conflicts"}
                </button>
              </div>

              {previewData && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-800">Preview Analysis:</div>
                  <div className="text-slate-600">{previewData.impactSummary}</div>
                  {previewData.warnings.map((w: string, i: number) => (
                    <div key={i} className="text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                  {previewData.blockers.map((b: string, i: number) => (
                    <div key={i} className="text-rose-700 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {b}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Adjustment Justification Reason <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain why this task is being reassigned or rescheduled (recorded in audit logs)..."
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAdjustment}
                disabled={adjustSubmitting || (previewData && !previewData.isValid)}
                className="px-4 py-2 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {adjustSubmitting ? "Applying..." : "Confirm & Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
