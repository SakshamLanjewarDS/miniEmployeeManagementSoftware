"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  X,
  FileText,
  MapPin,
  Calendar,
  RotateCcw,
  Check,
  ArrowRight,
  ShieldAlert,
  Layers,
} from "lucide-react";

interface SiteIssuesViewProps {
  workspaceSlug: string;
  hideHeader?: boolean;
  defaultProjectId?: string;
}

export default function SiteIssuesView({
  workspaceSlug,
  hideHeader = false,
  defaultProjectId,
}: SiteIssuesViewProps) {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modals & Drawer
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // New Issue Form
  const [newIssueForm, setNewIssueForm] = useState({
    projectId: defaultProjectId || "",
    siteLocation: "",
    title: "",
    description: "",
    category: "CIVIL",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    dueDate: "",
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [projects, setProjects] = useState<any[]>([]);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(priorityFilter !== "ALL" ? { priority: priorityFilter } : {}),
        ...(search ? { search } : {}),
        ...(overdueOnly ? { isOverdue: "true" } : {}),
        ...(defaultProjectId ? { projectId: defaultProjectId } : {}),
      });

      const res = await fetch(`/api/site-issues?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load site issues");
      setIssues(json.issues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?workspaceSlug=${workspaceSlug}`);
      const json = await res.json();
      if (res.ok && json.projects) {
        setProjects(json.projects);
        if (json.projects.length > 0 && !newIssueForm.projectId) {
          setNewIssueForm((prev) => ({ ...prev, projectId: defaultProjectId || json.projects[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [workspaceSlug, statusFilter, priorityFilter, overdueOnly, search, defaultProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [workspaceSlug]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/site-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          ...newIssueForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to report issue");

      setIsReportModalOpen(false);
      setToastMessage({ type: "success", text: `Issue ${json.issue?.referenceNumber || "reported"} created successfully.` });
      setNewIssueForm({
        projectId: defaultProjectId || (projects[0]?.id || ""),
        siteLocation: "",
        title: "",
        description: "",
        category: "CIVIL",
        priority: "MEDIUM",
        dueDate: "",
      });
      fetchIssues();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/site-issues/${selectedIssue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          status: newStatus,
          resolutionNotes: resolutionNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update issue status");

      setSelectedIssue(json.issue);
      setToastMessage({ type: "success", text: `Issue updated to ${newStatus}.` });
      fetchIssues();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (decision: "CLOSE" | "REOPEN") => {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/site-issues/${selectedIssue.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          decision,
          reopenReason: decision === "REOPEN" ? reopenReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to verify issue");

      setSelectedIssue(json.issue);
      setToastMessage({
        type: "success",
        text: decision === "CLOSE" ? "Site issue formally verified and closed." : "Site issue reopened.",
      });
      fetchIssues();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToTask = async () => {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/site-issues/${selectedIssue.id}/convert-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to convert issue to task");

      setToastMessage({
        type: "success",
        text: json.alreadyConverted
          ? "Site issue was already linked to an existing task."
          : `Task created and linked successfully: ${json.task?.title}`,
      });
      fetchIssues();
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header (optional) */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F1F1F] tracking-tight">Site Issues & Snag Tracking</h2>
            <p className="text-xs text-[#696E82] mt-0.5">
              Field defects, contractor accountability, and resolution sign-off
            </p>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A81FA] text-white text-xs font-bold shadow-xs hover:bg-[#4870EB] transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Report Site Issue</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E6F0] shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA] w-48 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY_FOR_VERIFICATION">Ready for Verification</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E6F0] bg-white focus:outline-none focus:border-[#5A81FA]"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent / Critical</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-[#696E82] cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-[#5A81FA] focus:ring-[#5A81FA]"
            />
            <span>Overdue only</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIssues}
            className="p-2 border border-[#E2E6F0] rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#5A81FA]" : ""}`} />
          </button>
          {hideHeader && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5A81FA] text-white text-xs font-bold hover:bg-[#4870EB] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Issues Table / Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[#696E82] bg-white rounded-2xl border border-[#E2E6F0]">
          Loading site issues...
        </div>
      ) : issues.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#1F1F1F]">No site issues found</h3>
          <p className="text-xs text-[#696E82] mt-1">
            No snags matching your current filters. Click "Report Site Issue" to log defects discovered on site.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue) => {
            const isCritical = issue.priority === "URGENT" || issue.priority === "HIGH";
            const isResolved = issue.status === "CLOSED" || issue.status === "READY_FOR_VERIFICATION";

            return (
              <div
                key={issue.id}
                onClick={() => {
                  setSelectedIssue(issue);
                  setIsDetailDrawerOpen(true);
                }}
                className="p-4 bg-white rounded-2xl border border-[#E2E6F0] hover:border-slate-300 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {issue.referenceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        issue.priority === "URGENT"
                          ? "bg-rose-100 text-rose-800"
                          : issue.priority === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#1F1F1F] line-clamp-1">{issue.title}</h3>
                  <p className="text-xs text-[#696E82] mt-1 line-clamp-2">{issue.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-[#696E82]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#5A81FA] shrink-0" />
                      <span className="truncate">{issue.siteLocation || issue.project?.name}</span>
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        issue.status === "CLOSED"
                          ? "bg-emerald-100 text-emerald-800"
                          : issue.status === "READY_FOR_VERIFICATION"
                          ? "bg-blue-100 text-blue-800"
                          : issue.status === "OPEN"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {issue.status.replace("_", " ")}
                    </span>
                  </div>
                  {issue.dueDate && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E6F0] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <h3 className="text-base font-bold text-[#1F1F1F]">Report Site Issue / Snag</h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Project</label>
                <select
                  required
                  value={newIssueForm.projectId}
                  onChange={(e) => setNewIssueForm((p) => ({ ...p, projectId: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:ring-2 focus:ring-[#5A81FA]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Issue Title / Summary</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Column honeycombing on Grid C-4"
                  value={newIssueForm.title}
                  onChange={(e) => setNewIssueForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category / Trade</label>
                  <select
                    value={newIssueForm.category}
                    onChange={(e) => setNewIssueForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                  >
                    <option value="CIVIL">Civil & Structural</option>
                    <option value="MEP">MEP & Services</option>
                    <option value="FINISHES">Architectural Finishes</option>
                    <option value="SAFETY">Safety & Hazard</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Priority</label>
                  <select
                    value={newIssueForm.priority}
                    onChange={(e) => setNewIssueForm((p) => ({ ...p, priority: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Site Location / Grid</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor Slab, East Wing"
                  value={newIssueForm.siteLocation}
                  onChange={(e) => setNewIssueForm((p) => ({ ...p, siteLocation: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description & Rectification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe observed defect, non-conformance, and instructions..."
                  value={newIssueForm.description}
                  onChange={(e) => setNewIssueForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Target Rectification Date</label>
                <input
                  type="date"
                  value={newIssueForm.dueDate}
                  onChange={(e) => setNewIssueForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#E2E6F0] bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#5A81FA] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Report Site Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {isDetailDrawerOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {selectedIssue.referenceNumber}
                  </span>
                  <span className="font-semibold text-slate-600">{selectedIssue.category}</span>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1F1F1F]">{selectedIssue.title}</h3>
                <p className="text-xs text-[#696E82] mt-1">{selectedIssue.description}</p>
              </div>

              <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#696E82]">Project:</span>
                  <span className="font-bold text-[#1F1F1F]">{selectedIssue.project?.name || selectedIssue.projectId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#696E82]">Location:</span>
                  <span className="font-medium text-[#1F1F1F]">{selectedIssue.siteLocation || "On Site"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#696E82]">Status:</span>
                  <span className="font-bold text-[#5A81FA]">{selectedIssue.status.replace("_", " ")}</span>
                </div>
                {selectedIssue.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-[#696E82]">Target Date:</span>
                    <span className="font-medium text-slate-800">{new Date(selectedIssue.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="space-y-2 pt-2 border-t border-[#E2E6F0]">
                <h4 className="font-bold text-[#1F1F1F]">Update Status & Resolution</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIssue.status === "OPEN" && (
                    <button
                      onClick={() => handleUpdateStatus("IN_PROGRESS")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold cursor-pointer"
                    >
                      Start Rectification
                    </button>
                  )}
                  {selectedIssue.status !== "READY_FOR_VERIFICATION" && selectedIssue.status !== "CLOSED" && (
                    <button
                      onClick={() => handleUpdateStatus("READY_FOR_VERIFICATION")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold cursor-pointer"
                    >
                      Mark Ready for Verification
                    </button>
                  )}
                  {selectedIssue.status === "READY_FOR_VERIFICATION" && (
                    <button
                      onClick={() => handleVerify("CLOSE")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      Verify & Close Issue
                    </button>
                  )}
                </div>
              </div>

              {/* Convert to Task */}
              <div className="pt-2 border-t border-[#E2E6F0]">
                <button
                  onClick={handleConvertToTask}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Convert to Actionable Studio Task</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E6F0]">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
