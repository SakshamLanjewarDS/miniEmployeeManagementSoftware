"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Plus,
  Search,
  Filter,
  User,
  Users,
  Calendar,
  MessageSquare,
  Paperclip,
  X,
  Check,
  ChevronRight,
  FolderKanban,
  Send,
} from "lucide-react";

import MobileFilterDrawer from "@/components/ui/MobileFilterDrawer";

export default function ExecutiveTasksPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [tasks, setTasks] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active filters count for mobile indicator
  const mobileActiveFilterCount = (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0);

  // Drawer & Modals
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    category: "Design Review",
    priority: "MEDIUM",
    dueDate: "",
    dueTime: "",
    assigneeMembershipIds: [] as string[],
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });

      const res = await fetch(`/api/executive-tasks?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load executive tasks");

      setTasks(data.tasks || []);
      setKpis(data.kpis || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/employees?workspaceSlug=${workspaceSlug}&limit=100`);
      const data = await res.json();
      if (res.ok) {
        setTeamMembers(data.employees || data.data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [workspaceSlug, statusFilter, priorityFilter]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/executive-tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/executive-tasks/${selectedTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, content: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommentText("");
        setSelectedTask({
          ...selectedTask,
          comments: [data.comment, ...(selectedTask.comments || [])],
        });
      }
    } catch {
      // ignore
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/executive-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          priority: createForm.priority,
          dueDate: createForm.dueDate || undefined,
          dueTime: createForm.dueTime || undefined,
          assigneeMembershipIds: createForm.assigneeMembershipIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setIsCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        category: "Design Review",
        priority: "MEDIUM",
        dueDate: "",
        dueTime: "",
        assigneeMembershipIds: [],
      });
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Executive Studio Work</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Partner Deliverables</span>
          </div>
          <h1 className="type-page-title text-[#1F1F1F]">Executive Task Board</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Single & Joint leadership assignments • 8 KPI slots • Isolated from employee tasks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] ${
                viewMode === "table" ? "bg-[#5A81FA] text-white" : "text-[#696E82] hover:text-[#1F1F1F]"
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] ${
                viewMode === "kanban" ? "bg-[#5A81FA] text-white" : "text-[#696E82] hover:text-[#1F1F1F]"
              }`}
            >
              Kanban Board
            </button>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all w-full sm:w-auto min-h-[38px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Deliverable</span>
          </button>
        </div>
      </div>

      {/* 8 KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Total Active</div>
            <div className="text-xl font-extrabold text-[#1F1F1F] mt-1 font-mono">{kpis.totalActive}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">To Do</div>
            <div className="text-xl font-extrabold text-gray-700 mt-1 font-mono">{kpis.toDoCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">In Progress</div>
            <div className="text-xl font-extrabold text-[#5A81FA] mt-1 font-mono">{kpis.inProgressCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Waiting</div>
            <div className="text-xl font-extrabold text-amber-600 mt-1 font-mono">{kpis.waitingCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Done</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{kpis.doneCount}</div>
          </div>
          <div className="p-3 bg-[#FFF5F5] rounded-2xl border border-rose-200 shadow-2xs">
            <div className="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">Overdue</div>
            <div className="text-xl font-extrabold text-rose-700 mt-1 font-mono">{kpis.overdueCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Due Today</div>
            <div className="text-xl font-extrabold text-amber-600 mt-1 font-mono">{kpis.dueTodayCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Tomorrow</div>
            <div className="text-xl font-extrabold text-blue-600 mt-1 font-mono">{kpis.dueTomorrowCount}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#696E82]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deliverables, specs, or categories..."
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA] text-[#1F1F1F]"
            />
          </div>

          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="sm:hidden relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-semibold text-[#1F1F1F] active:scale-95 transition-all shrink-0"
            aria-label="Open filter sidebar"
          >
            <Filter className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Filters</span>
            {mobileActiveFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#5A81FA] text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                {mobileActiveFilterCount}
              </span>
            )}
          </button>

          {/* Desktop Filter Dropdowns */}
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Statuses</option>
              <option value="TO_DO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING">Waiting</option>
              <option value="DONE">Done</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Mobile Horizontal Quick Status Carousel (1-tap access) */}
        <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none pb-0.5 pt-0.5">
          {[
            { id: "", label: "All" },
            { id: "TO_DO", label: "To Do" },
            { id: "IN_PROGRESS", label: "In Progress" },
            { id: "WAITING", label: "Waiting" },
            { id: "DONE", label: "Done" },
          ].map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? "bg-[#5A81FA] text-white shadow-xs"
                    : "bg-[#F8F9FD] text-[#696E82] border border-[#E2E6F0] hover:bg-slate-100"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Filter Drawer / Bottom Sheet */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Executive Filters"
        activeCount={mobileActiveFilterCount}
        onReset={() => {
          setStatusFilter("");
          setPriorityFilter("");
        }}
        resultsCount={tasks.length}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Deliverable Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Statuses</option>
              <option value="TO_DO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING">Waiting</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Priority Level</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </MobileFilterDrawer>

      {/* Main View: Table or Kanban */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#696E82]">Loading executive deliverables...</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#696E82]">No executive deliverables found.</div>
          ) : (
            <div className="divide-y divide-[#E2E6F0]">
              {tasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  task.status !== "DONE" &&
                  new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDrawerOpen(true);
                    }}
                    className="p-4 hover:bg-[#F8F9FE] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs cursor-pointer"
                  >
                    {/* Left: Title & Category */}
                    <div className="min-w-[260px] flex-1">
                      <div className="font-bold text-[#1F1F1F] text-sm hover:text-[#5A81FA] transition-colors flex items-center gap-2">
                        <span>{task.title}</span>
                        {task.assignments?.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Joint ({task.assignments.length})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#696E82] flex items-center gap-2 mt-1">
                        <span className="font-medium text-[#5A81FA]">{task.category}</span>
                        {task.project && (
                          <>
                            <span>•</span>
                            <span>{task.project.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle: Leadership Assignees */}
                    <div className="flex items-center gap-1 min-w-[150px]">
                      {task.assignments?.map((a: any) => (
                        <div
                          key={a.id}
                          title={a.assignee?.user?.fullName}
                          className="w-7 h-7 rounded-full bg-[#0B122B] text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs"
                        >
                          {a.assignee?.user?.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>

                    {/* Due Date */}
                    <div className="min-w-[130px] font-mono text-[11px]">
                      {task.dueDate ? (
                        <div className={isOverdue ? "text-rose-600 font-bold flex items-center gap-1" : "text-[#696E82]"}>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No deadline</span>
                      )}
                    </div>

                    {/* Priority & Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === "URGENT"
                            ? "bg-rose-100 text-rose-800"
                            : task.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {task.priority}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          task.status === "DONE"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : task.status === "IN_PROGRESS"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                            : task.status === "WAITING"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="flex md:grid gap-4 overflow-x-auto touch-scroll-x md:grid-cols-4 snap-x snap-mandatory md:snap-none pb-2">
          {(["TO_DO", "IN_PROGRESS", "WAITING", "DONE"] as const).map((colStatus) => {
            const colTasks = tasks.filter((t) => t.status === colStatus);
            const colTitle = colStatus.replace("_", " ");

            return (
              <div key={colStatus} className="bg-[#F8F9FD] rounded-3xl p-3 border border-[#E2E6F0] space-y-3 w-[285px] sm:w-[320px] md:w-auto shrink-0 snap-center">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">{colTitle}</span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-[#E2E6F0] text-[#696E82]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[300px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsDrawerOpen(true);
                      }}
                      className="p-3 bg-white rounded-2xl border border-[#E2E6F0] hover:border-[#5A81FA] shadow-2xs transition-all cursor-pointer space-y-2 text-xs"
                    >
                      <div className="font-bold text-[#1F1F1F]">{task.title}</div>
                      <div className="text-[10px] text-[#5A81FA] font-medium">{task.category}</div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                        <span className="text-[#696E82]">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.assignments?.map((a: any) => (
                            <span
                              key={a.id}
                              className="w-5 h-5 rounded-full bg-[#0B122B] text-white font-bold text-[9px] flex items-center justify-center"
                            >
                              {a.assignee?.user?.fullName?.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details Drawer */}
      {isDrawerOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
                <span className="text-xs font-bold text-[#5A81FA] uppercase tracking-wider">
                  Deliverable Specifications
                </span>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-[#696E82]" />
                </button>
              </div>

              <div>
                <h2 className="type-section-title text-[#1F1F1F]">{selectedTask.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#5A81FA] font-semibold">{selectedTask.category}</span>
                  {selectedTask.project && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-[#696E82]">{selectedTask.project.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Transition Control */}
              <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1F1F1F]">Update Status:</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                  className="px-3 py-1.5 bg-white border border-[#E2E6F0] rounded-xl font-bold text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                >
                  <option value="TO_DO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING">Waiting</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <span className="text-xs font-semibold text-[#696E82] block mb-1">Specifications & Scope:</span>
                <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-xs text-[#1F1F1F]">
                  {selectedTask.description || <span className="italic text-gray-400">No specifications recorded.</span>}
                </div>
              </div>

              {/* Collaboration Comments */}
              <div className="space-y-3 pt-2 border-t border-[#E2E6F0]">
                <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Executive Collaboration ({selectedTask.comments?.length || 0})</span>
                </h4>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add executive feedback or review note..."
                    className="flex-1 px-3 py-2 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#5A81FA]"
                  />
                  <button
                    type="submit"
                    disabled={commentLoading || !commentText.trim()}
                    className="px-3 py-2 bg-[#5A81FA] text-white rounded-xl text-xs font-semibold hover:bg-[#4870EB] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {selectedTask.comments?.map((c: any) => (
                    <div key={c.id} className="pt-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#696E82]">
                        <span className="font-bold text-[#1F1F1F]">{c.author?.user?.fullName}</span>
                        <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-[#1F1F1F] mt-1">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E6F0] flex justify-end">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Deliverable Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleCreateTask}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-deliv-title"
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-[#E2E6F0] shadow-xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 id="create-deliv-title" className="type-card-title text-[#1F1F1F]">Create Executive Deliverable</h3>
                <p className="text-xs text-[#696E82]">Leadership deliverable tracking</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#696E82] hover:bg-gray-100 rounded-lg cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Final Client Presentation for Villa Signature"
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  >
                    <option value="Design Review">Design Review</option>
                    <option value="Client Presentation">Client Presentation</option>
                    <option value="Site Coordination">Site Coordination</option>
                    <option value="Financial">Financial Review</option>
                    <option value="Studio Operations">Studio Operations</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Due Date</label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Specifications & Description</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Details, design specifications, requirements..."
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Deliverable"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
