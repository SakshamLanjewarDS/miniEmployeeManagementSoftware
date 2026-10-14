"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  FileCheck2,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Check,
  X,
  ShieldAlert,
  FolderKanban,
  MapPin,
  RefreshCw,
} from "lucide-react";

interface DecisionInboxItem {
  id: string;
  rawId: string;
  type: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  requesterId: string;
  requesterName: string;
  requesterRole?: string;
  requesterAvatarUrl?: string;
  submittedAt: string;
  ageHours: number;
  ageDays: number;
  urgency: "CRITICAL" | "URGENT" | "NORMAL";
  canApprove: boolean;
  cannotApproveReason?: string;
  status: string;
  summary: string;
  details: Record<string, any>;
}

interface DecisionInboxData {
  items: DecisionInboxItem[];
  counts: {
    total: number;
    myDecisions: number;
    allAuthorized: number;
    blockers: number;
    deliverableSubmissions: number;
    deadlineExtensions: number;
    scopeChanges: number;
    profileChanges: number;
    drawingRevisions: number;
    siteVisits: number;
    leaveApplications: number;
    leaveCancellations: number;
  };
}

export default function OwnerDecisionInboxPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [activeTab, setActiveTab] = useState<"all-authorized" | "my-decisions" | "blockers">("all-authorized");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DecisionInboxData | null>(null);

  // Selected item for slide-over drawer
  const [selectedItem, setSelectedItem] = useState<DecisionInboxItem | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParams = new URLSearchParams({
        workspaceSlug,
        tab: activeTab,
        ...(selectedType !== "ALL" ? { type: selectedType } : {}),
        ...(selectedUrgency !== "ALL" ? { urgency: selectedUrgency } : {}),
        ...(searchQuery ? { q: searchQuery } : {}),
      });

      const res = await fetch(`/api/inbox?${qParams.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted: Only Studio Owners and Administrators have authority to access the Decision Inbox.");
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load decision items.");
      }

      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || "Failed to load inbox data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeTab, selectedType, selectedUrgency]);

  // Handle Quick Search submission with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInbox();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExecuteDecision = async (
    item: DecisionInboxItem,
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "RESOLVE_BLOCKER",
    customFeedback?: string
  ) => {
    if (!item.canApprove && (action === "APPROVE" || action === "RESOLVE_BLOCKER")) {
      alert(item.cannotApproveReason || "You are not permitted to approve this item.");
      return;
    }

    setIsSubmitting(true);
    setActionSuccessMessage(null);
    try {
      const res = await fetch(`/api/inbox/decide?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          id: item.rawId,
          action,
          feedback: customFeedback !== undefined ? customFeedback : decisionFeedback,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to execute decision.");
      }

      setActionSuccessMessage(`Decision executed successfully: ${action}`);
      setDecisionFeedback("");
      setSelectedItem(null);
      await fetchInbox();
    } catch (err: any) {
      alert(err.message || "Error executing decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DELIVERABLE_SUBMISSION":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: FileCheck2,
          label: "Deliverable Review",
        };
      case "DEADLINE_EXTENSION":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "Deadline Extension",
        };
      case "SCOPE_CHANGE":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Layers,
          label: "Scope & Fee Change",
        };
      case "PROFILE_CHANGE":
        return {
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
          icon: User,
          label: "HR Record Change",
        };
      case "DRAWING_REVISION":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: FileCheck2,
          label: "Drawing Release",
        };
      case "SITE_VISIT":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: MapPin,
          label: "Site Inspection",
        };
      case "TASK_BLOCKER":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: AlertTriangle,
          label: "Critical Blocker",
        };
      case "LEAVE_APPLICATION":
        return {
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          icon: Calendar,
          label: "Leave Application",
        };
      case "LEAVE_CANCELLATION":
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          icon: RefreshCw,
          label: "Leave Cancellation",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Inbox,
          label: type,
        };
    }
  };

  const getUrgencyBadge = (urgency: string, ageHours: number) => {
    if (urgency === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Critical ({ageHours}h ago)
        </span>
      );
    }
    if (urgency === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Urgent ({ageHours}h ago)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-400" />
        {ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Owner Decision Inbox</h1>
              <p className="text-sm text-slate-500">
                Studio Leadership Unified Authorization Queue & Multi-Workflow Decision Center
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInbox()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">All Pending</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{data?.counts.total ?? 0}</span>
            <span className="text-xs text-slate-400">Total requests</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">My Actionable</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600">{data?.counts.myDecisions ?? 0}</span>
            <span className="text-xs text-slate-400">Four-eyes compliant</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider">Scope & Changes</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-700">
              {(data?.counts.scopeChanges ?? 0) + (data?.counts.profileChanges ?? 0)}
            </span>
            <span className="text-xs text-slate-400">Impact updates</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="text-xs font-medium text-rose-700 uppercase tracking-wider">Active Blockers</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700">{data?.counts.blockers ?? 0}</span>
            <span className="text-xs text-rose-600 font-medium">Require unblocking</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Segmented Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto touch-scroll-x max-w-full">
          <button
            onClick={() => setActiveTab("all-authorized")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${
              activeTab === "all-authorized"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Authorized ({data?.counts.allAuthorized ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("my-decisions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "my-decisions"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Decisions ({data?.counts.myDecisions ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("blockers")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "blockers"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Blockers ({data?.counts.blockers ?? 0})
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="DELIVERABLE_SUBMISSION">Deliverables</option>
            <option value="DEADLINE_EXTENSION">Extensions</option>
            <option value="SCOPE_CHANGE">Scope Changes</option>
            <option value="PROFILE_CHANGE">HR Profile</option>
            <option value="DRAWING_REVISION">Drawings</option>
            <option value="SITE_VISIT">Site Visits</option>
            <option value="LEAVE_APPLICATION">Leave Applications</option>
            <option value="LEAVE_CANCELLATION">Leave Cancellations</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">Critical (&gt;48h)</option>
            <option value="URGENT">Urgent (&gt;24h)</option>
            <option value="NORMAL">Standard</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 w-44 md:w-56"
            />
          </div>
        </div>
      </div>

      {/* Main List Area */}
      {error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <div className="font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            {error}
          </div>
        </div>
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aggregating workspace decisions and checking authority gates...</p>
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Decision Inbox is Clear</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            No pending submissions, extensions, or blocked deliverables require executive review under this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;

            return (
              <div
                key={item.id}
                className={`p-4 bg-white rounded-xl border transition shadow-xs hover:border-slate-300 ${
                  item.urgency === "CRITICAL" ? "border-l-4 border-l-rose-500" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${badge.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>

                        {item.projectCode && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {item.projectCode}
                          </span>
                        )}

                        {getUrgencyBadge(item.urgency, item.ageHours)}

                        {!item.canApprove && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            Four-Eyes Restricted
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>

                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                        {item.summary}
                      </div>

                      <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <strong className="font-medium text-slate-600">{item.requesterName}</strong>
                          {item.requesterRole && ` (${item.requesterRole})`}
                        </span>
                        <span>•</span>
                        <span>Submitted {new Date(item.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex md:flex-col items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition inline-flex items-center gap-1"
                    >
                      Inspect Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {item.type === "TASK_BLOCKER" ? (
                        <button
                          onClick={() => handleExecuteDecision(item, "RESOLVE_BLOCKER", "Unblocked via Executive Action")}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                        >
                          Resolve Blocker
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const note = prompt("Enter corrections or change instructions required:");
                              if (note !== null) {
                                handleExecuteDecision(item, item.type === "DEADLINE_EXTENSION" ? "REJECT" : "REQUEST_CHANGES", note);
                              }
                            }}
                            disabled={isSubmitting}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                          >
                            {item.type === "DEADLINE_EXTENSION" ? "Reject" : "Request Changes"}
                          </button>

                          <button
                            onClick={() => handleExecuteDecision(item, "APPROVE")}
                            disabled={isSubmitting || !item.canApprove}
                            title={item.cannotApproveReason}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition inline-flex items-center gap-1 ${
                              item.canApprove
                                ? "text-white bg-blue-600 hover:bg-blue-700"
                                : "text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Drawer for Detailed Inspection */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Decision Inspection"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity"
        >
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  {selectedItem.typeLabel}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{selectedItem.title}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-5 flex-1">
              {/* Project & Context */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-400 font-medium">Project Scope</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {selectedItem.projectCode} — {selectedItem.projectName || "Studio Deliverable"}
                </div>
              </div>

              {/* Submitter & Timing */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium">Requester / Submitter</div>
                  <div className="text-slate-900 font-bold mt-0.5">{selectedItem.requesterName}</div>
                  <div className="text-slate-500">{selectedItem.requesterRole}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium">Age in Queue</div>
                  <div className="text-slate-900 font-bold mt-0.5">{selectedItem.ageHours} hours elapsed</div>
                  <div className="text-slate-500">{new Date(selectedItem.submittedAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Four-Eyes Notification */}
              {!selectedItem.canApprove && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Four-Eyes Verification Enforced:</strong>
                    <p className="mt-0.5">{selectedItem.cannotApproveReason}</p>
                  </div>
                </div>
              )}

              {/* Summary & Statement */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Request Summary & Justification</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.summary}
                </div>
              </div>

              {/* Type-Specific Details */}
              {selectedItem.type === "DEADLINE_EXTENSION" && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-blue-900">Schedule Impact Comparison</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Current Due Date:</span>
                      <div className="font-semibold text-slate-800">
                        {selectedItem.details.currentDueDate
                          ? new Date(selectedItem.details.currentDueDate).toLocaleDateString()
                          : "None"}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Proposed New Due Date:</span>
                      <div className="font-semibold text-blue-700">
                        {new Date(selectedItem.details.proposedDueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.type === "SCOPE_CHANGE" && (
                <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-purple-900">Financial & Program Impact</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Schedule Extension:</span>
                      <div className="font-semibold text-slate-800">
                        +{selectedItem.details.scheduleImpactDays} days
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Fee Variation:</span>
                      <div className="font-semibold text-purple-700">
                        ₹{selectedItem.details.feeImpactAmount}
                      </div>
                    </div>
                  </div>
                  {selectedItem.details.affectedScope && (
                    <div className="mt-2 text-slate-700">
                      <strong>Affected Disciplines:</strong> {selectedItem.details.affectedScope}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.type === "PROFILE_CHANGE" && (
                <div className="p-3.5 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-cyan-900">Official HR Record Modification</div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-500">Target Field:</span>{" "}
                      <strong className="text-slate-800">{selectedItem.details.fieldKey}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Previous Value:</span>{" "}
                      <span className="text-rose-700 line-through">{selectedItem.details.oldValue || "None"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Requested Official Value:</span>{" "}
                      <span className="text-emerald-700 font-semibold">{selectedItem.details.newValue}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Links / Files */}
              {selectedItem.details.evidenceLinks && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Deliverable Evidence Links</label>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {Array.isArray(selectedItem.details.evidenceLinks)
                      ? selectedItem.details.evidenceLinks.map((l: string, i: number) => (
                          <a
                            key={i}
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 mb-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {l}
                          </a>
                        ))
                      : String(selectedItem.details.evidenceLinks)}
                  </div>
                </div>
              )}

              {selectedItem.type === "LEAVE_APPLICATION" && (
                <div className="p-3.5 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-teal-900">Leave Application Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Dates:</span>
                      <div className="font-semibold text-slate-800">
                        {selectedItem.details.startDate} — {selectedItem.details.endDate}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Duration:</span>
                      <div className="font-semibold text-teal-700">
                        {selectedItem.details.days} Day(s) {selectedItem.details.isHalfDay ? `(${selectedItem.details.sessionType})` : ""}
                      </div>
                    </div>
                  </div>
                  {selectedItem.details.isShortNotice && (
                    <div className="mt-1 p-2 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-medium">
                      Short notice request (&lt;24 hours). {selectedItem.details.isExemptShortNotice ? `Exemption stated: ${selectedItem.details.exemptionReason || "Yes"}` : ""}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.type === "LEAVE_CANCELLATION" && (
                <div className="p-3.5 bg-orange-50/50 border border-orange-100 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-orange-900">Approved Leave Cancellation Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Approved Dates:</span>
                      <div className="font-semibold text-slate-800">
                        {selectedItem.details.startDate} — {selectedItem.details.endDate}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Duration:</span>
                      <div className="font-semibold text-orange-700">
                        {selectedItem.details.days} Day(s)
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-slate-700">
                    <span className="text-slate-500">Cancellation Reason:</span> {selectedItem.details.cancellationReason}
                  </div>
                </div>
              )}

              {/* Feedback Comment Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Executive Decision Note / Correction Instructions
                </label>
                <textarea
                  rows={3}
                  value={decisionFeedback}
                  onChange={(e) => setDecisionFeedback(e.target.value)}
                  placeholder="Enter comments, approval notes, or specific corrections for the team..."
                  className="w-full p-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 pb-safe">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {selectedItem.type === "TASK_BLOCKER" ? (
                  <button
                    onClick={() => handleExecuteDecision(selectedItem, "RESOLVE_BLOCKER")}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition cursor-pointer flex-1 sm:flex-initial"
                  >
                    Unblock Deliverable
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        handleExecuteDecision(
                          selectedItem,
                          selectedItem.type === "DEADLINE_EXTENSION" ||
                          selectedItem.type === "LEAVE_APPLICATION" ||
                          selectedItem.type === "LEAVE_CANCELLATION"
                            ? "REJECT"
                            : "REQUEST_CHANGES"
                        )
                      }
                      disabled={isSubmitting}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex-1 sm:flex-initial"
                    >
                      {selectedItem.type === "DEADLINE_EXTENSION" ||
                      selectedItem.type === "LEAVE_APPLICATION" ||
                      selectedItem.type === "LEAVE_CANCELLATION"
                        ? "Reject Request"
                        : "Request Changes"}
                    </button>

                    <button
                      onClick={() => handleExecuteDecision(selectedItem, "APPROVE")}
                      disabled={isSubmitting || !selectedItem.canApprove}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                        selectedItem.canApprove
                          ? "text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          : "text-slate-400 bg-slate-200 cursor-not-allowed"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Approval
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
