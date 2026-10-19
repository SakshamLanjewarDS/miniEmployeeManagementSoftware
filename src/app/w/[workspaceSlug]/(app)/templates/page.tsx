"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  FileText,
  Layers,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
  Plus,
  Play,
  ArrowRight,
  Shield,
  X,
  RefreshCw,
  Search,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  projectType: string;
  description?: string;
  category?: string;
  status: string;
  version: number;
  phasesJson: any[];
  deliverablesJson: any[];
  dependenciesJson?: any[];
  createdAt: string;
}

export default function TemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [inspectTemplate, setInspectTemplate] = useState<Template | null>(null);

  // Apply Modal
  const [applyTemplate, setApplyTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [members, setMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [roleMapping, setRoleMapping] = useState<Record<string, string>>({});

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/templates", {
        headers: { "x-workspace-slug": workspaceSlug },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load templates");
      setTemplates(json.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsAndMembers = async () => {
    try {
      const pRes = await fetch("/api/projects", {
        headers: { "x-workspace-slug": workspaceSlug },
      });
      const pJson = await pRes.json();
      if (pRes.ok) {
        setProjects(pJson.projects || []);
      }

      // Fetch studio talent
      const mRes = await fetch("/api/team", {
        headers: { "x-workspace-slug": workspaceSlug },
      });
      const mJson = await mRes.json();
      if (mRes.ok && mJson.employees) {
        setMembers(
          mJson.employees.map((e: any) => ({
            id: e.membershipId || e.id,
            name: e.fullName || e.user?.fullName || e.name,
            role: e.designation || e.department || "Team Member",
          }))
        );
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (workspaceSlug) {
      fetchTemplates();
      fetchProjectsAndMembers();
    }
  }, [workspaceSlug]);

  const handleOpenApply = (t: Template) => {
    setApplyTemplate(t);
    setSelectedProjectId(projects[0]?.id || "");
    setStartDate(new Date().toISOString().slice(0, 10));
    setPreviewData(null);

    // Initial role mapping
    const deliverables = t.deliverablesJson || [];
    const roles = Array.from(new Set(deliverables.map((d: any) => d.suggestedRole).filter(Boolean)));
    const initialMap: Record<string, string> = {};
    roles.forEach((r) => {
      initialMap[r as string] = members[0]?.id || "";
    });
    setRoleMapping(initialMap);
  };

  const handlePreview = async () => {
    if (!applyTemplate || !selectedProjectId) return;
    try {
      setPreviewLoading(true);
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({
          action: "PREVIEW",
          templateId: applyTemplate.id,
          projectId: selectedProjectId,
          startDate,
          roleMapping,
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

  const handleConfirmApply = async () => {
    if (!applyTemplate || !selectedProjectId) return;
    try {
      setApplying(true);
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({
          action: "APPLY",
          templateId: applyTemplate.id,
          projectId: selectedProjectId,
          startDate,
          roleMapping,
          confirmationNotes: "Applied via Studio Blueprint Template Manager",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to apply template");

      alert(
        `Template "${applyTemplate.name}" applied successfully!\nGenerated ${json.phasesCount} phases and ${json.tasksCount} tasks.`
      );
      setApplyTemplate(null);
      router.push(`/w/${workspaceSlug}/projects/${selectedProjectId}`);
    } catch (err: any) {
      alert(`Application Error: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.projectType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="type-page-title text-[#0B122B]">
            Project & Checklist Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standardized architecture & interior blueprints with phase dates, role assignments,
            deliverables, and required verification checklists.
          </p>
        </div>

        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Blueprints
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-scroll-x pb-0.5 max-w-full">
          {["ALL", "Architecture", "Interior Design"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap min-h-[36px] ${
                categoryFilter === cat
                  ? "bg-[#5A81FA] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL" ? "All Blueprints" : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5A81FA]" />
          Loading studio templates catalogue...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          No blueprints found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((t) => {
            const phases = t.phasesJson || [];
            const deliverables = t.deliverablesJson || [];
            const totalHours = deliverables.reduce(
              (acc: number, d: any) => acc + (d.estimatedHours || 0),
              0
            );

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-[#5A81FA]/40 transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#5A81FA] border border-blue-100">
                      {t.category || t.projectType}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      v{t.version} • {t.status}
                    </span>
                  </div>

                  <h3 className="type-card-title text-[#0B122B] group-hover:text-[#5A81FA] transition">
                    {t.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {t.description || "Production-tested studio workflow template."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-medium">Phases</div>
                      <div className="font-bold text-slate-800 mt-0.5">{phases.length}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-medium">Tasks</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {deliverables.length}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-medium">Est. Hours</div>
                      <div className="font-bold text-[#5A81FA] mt-0.5">{totalHours}h</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectTemplate(t)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5"
                  >
                    Inspect Structure
                  </button>
                  <button
                    onClick={() => handleOpenApply(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg shadow-sm transition"
                  >
                    <Play className="w-3 h-3 fill-white" /> Apply to Project
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Template Modal */}
      {inspectTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-template-title"
            className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="inspect-template-title" className="text-base font-bold text-[#0B122B]">{inspectTemplate.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {inspectTemplate.category} • Version {inspectTemplate.version}
                </p>
              </div>
              <button
                onClick={() => setInspectTemplate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Phases Workflow:</h4>
                <div className="space-y-2">
                  {inspectTemplate.phasesJson?.map((p: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                      <div className="font-medium text-slate-800">
                        {idx + 1}. {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Duration: {p.durationDays} days (Offset: +{p.offsetDays}d from start) •{" "}
                        {p.description || "Standard milestone"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Deliverables & Checklists:</h4>
                <div className="space-y-2">
                  {inspectTemplate.deliverablesJson?.map((d: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{d.title}</span>
                        <span className="text-[#5A81FA] font-semibold">{d.estimatedHours || 0}h</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Suggested Role: {d.suggestedRole || "General"} • Priority: {d.priority || "MEDIUM"}
                      </div>
                      {d.checklists && d.checklists.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-[#5A81FA]/30 space-y-1">
                          {d.checklists.map((c: any, cIdx: number) => (
                            <div key={cIdx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              {c.title}
                              {c.requiredEvidence && (
                                <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">
                                  Proof Required
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  const t = inspectTemplate;
                  setInspectTemplate(null);
                  handleOpenApply(t);
                }}
                className="px-4 py-2 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg transition"
              >
                Apply this Blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Project Modal */}
      {applyTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0B122B]">
                  Apply: {applyTemplate.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates an immutable project snapshot with calculated dates and role assignments.
                </p>
              </div>
              <button
                onClick={() => setApplyTemplate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
              {/* Project Selection */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Target Project <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Project Kickoff / Start Date <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Role Mapping */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Map Suggested Roles to Active Studio Talent:
                </label>
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  {Object.keys(roleMapping).map((role) => (
                    <div key={role} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                      <span className="font-medium text-slate-700 sm:w-1/3 truncate">{role}:</span>
                      <select
                        value={roleMapping[role]}
                        onChange={(e) => {
                          setRoleMapping({ ...roleMapping, [role]: e.target.value });
                          setPreviewData(null);
                        }}
                        className="w-full sm:w-2/3 border border-slate-200 rounded-lg p-1.5 text-xs bg-white"
                      >
                        <option value="">-- Unassigned --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Button */}
              <div>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
                >
                  {previewLoading ? "Calculating Dates & Diffs..." : "Preview Generated Schedule"}
                </button>
              </div>

              {/* Preview Output */}
              {previewData && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>Generated Schedule Preview:</span>
                    <span className="text-[#5A81FA]">{previewData.totalEstimatedHours}h Total Effort</span>
                  </div>

                  {previewData.warnings.map((w: string, i: number) => (
                    <div key={i} className="text-amber-700 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}

                  <div className="text-[11px] text-slate-600">
                    Will generate <strong>{previewData.resolvedPhases.length} phases</strong> and{" "}
                    <strong>{previewData.resolvedTasks.length} tasks</strong> starting on{" "}
                    <strong>{previewData.projectStartDate}</strong>.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setApplyTemplate(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                disabled={applying || !selectedProjectId}
                className="px-4 py-2 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {applying ? "Applying..." : "Confirm & Apply Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
