"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Columns,
  List,
  Sparkles,
  Undo2,
  Sliders,
  Compass,
} from "lucide-react";
import MobileFilterDrawer from "@/components/ui/MobileFilterDrawer";
import { VisualDrawingAirlock } from "@/components/drawings/VisualDrawingAirlock";
import { useStudioRealtime } from "@/components/realtime/useStudioRealtime";
import { LiveSyncIndicator } from "@/components/realtime/LiveSyncIndicator";
import {
  DecisionConsequenceCard,
  DecisionItemDetails,
} from "@/components/inbox/DecisionConsequenceCard";

interface DecisionInboxData {
  items: DecisionItemDetails[];
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

  // Layout & View Mode (Cockpit 3-Zone vs Classic List)
  const [viewLayout, setViewLayout] = useState<"COCKPIT" | "CLASSIC">("COCKPIT");
  const [groupBy, setGroupBy] = useState<"NONE" | "PROJECT" | "URGENCY">("NONE");

  // Filters & State
  const [activeTab, setActiveTab] = useState<"all-authorized" | "my-decisions" | "blockers">("all-authorized");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active filter count for mobile badge
  const mobileActiveFilterCount = (selectedType !== "ALL" ? 1 : 0) + (selectedUrgency !== "ALL" ? 1 : 0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DecisionInboxData | null>(null);

  // Realtime Live Bus Sync
  const { isConnected, lastEvent } = useStudioRealtime({
    workspaceSlug,
    autoRefresh: false,
    onEvent: () => {
      fetchInbox();
    },
  });

  // Selected item for Cockpit / Drawer View
  const [selectedItem, setSelectedItem] = useState<DecisionItemDetails | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Emergency 30-Second Undo State
  const [undoState, setUndoState] = useState<{
    item: DecisionItemDetails;
    action: string;
    secondsLeft: number;
  } | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!data?.items) return;
    const actionable = data.items.filter((item) => item.canApprove);
    if (selectedIds.size === actionable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actionable.map((item) => item.id)));
    }
  };

  const handleExecuteBatch = async (action: "APPROVE" | "REQUEST_CHANGES") => {
    if (selectedIds.size === 0 || !data?.items) return;
    const itemsToDecide = data.items.filter((item) => selectedIds.has(item.id) && item.canApprove);
    if (itemsToDecide.length === 0) return;

    let feedback = "";
    if (action === "REQUEST_CHANGES") {
      const note = prompt(`Enter correction directives for ${itemsToDecide.length} selected items:`);
      if (note === null) return;
      feedback = note;
    }

    setIsBatchSubmitting(true);
    try {
      const payload = itemsToDecide.map((item) => ({
        type: item.type,
        id: item.rawId,
        action: action === "APPROVE" ? "APPROVE" : item.type === "DEADLINE_EXTENSION" ? "REJECT" : "REQUEST_CHANGES",
        feedback: feedback || "Batch approved by Executive Leadership",
      }));

      const res = await fetch(`/api/inbox/decide?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Batch execution failed");

      // Optimistically remove decided items
      const decidedIdSet = new Set(itemsToDecide.map((item) => item.id));
      setData((prev) => {
        if (!prev) return prev;
        const remaining = prev.items.filter((item) => !decidedIdSet.has(item.id));
        return {
          ...prev,
          items: remaining,
          counts: {
            ...prev.counts,
            total: Math.max(0, prev.counts.total - itemsToDecide.length),
            myDecisions: Math.max(0, prev.counts.myDecisions - itemsToDecide.length),
          },
        };
      });

      setSelectedIds(new Set());
      setActionSuccessMessage(`Batch ${action === "APPROVE" ? "Approved" : "Updated"} ${itemsToDecide.length} items successfully.`);
      fetchInbox();
    } catch (err: any) {
      alert(err.message || "Failed to execute batch decision");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

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

      const resData: DecisionInboxData = await res.json();
      setData(resData);

      // Auto-select first item if in Cockpit mode and none currently selected
      if (resData.items && resData.items.length > 0) {
        setSelectedItem((prev) => {
          if (!prev) return resData.items[0];
          const exists = resData.items.find((i) => i.id === prev.id);
          return exists || resData.items[0];
        });
      } else {
        setSelectedItem(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inbox data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeTab, selectedType, selectedUrgency]);

  // Quick Search submission with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInbox();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExecuteDecision = async (
    item: DecisionItemDetails,
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "RESOLVE_BLOCKER",
    customFeedback?: string
  ) => {
    if (!item.canApprove && (action === "APPROVE" || action === "RESOLVE_BLOCKER")) {
      alert(item.cannotApproveReason || "You are not permitted to approve this item under Four-Eyes rules.");
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

      // Optimistically remove decided item and select next available
      setData((prev) => {
        if (!prev) return prev;
        const filtered = prev.items.filter((i) => i.id !== item.id);
        return {
          ...prev,
          items: filtered,
          counts: {
            ...prev.counts,
            total: Math.max(0, prev.counts.total - 1),
            myDecisions: Math.max(0, prev.counts.myDecisions - 1),
          },
        };
      });

      // Activate Emergency 30-Second Undo Window
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      setUndoState({
        item,
        action,
        secondsLeft: 30,
      });

      undoIntervalRef.current = setInterval(() => {
        setUndoState((prev) => {
          if (!prev || prev.secondsLeft <= 1) {
            if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
            return null;
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);

      setActionSuccessMessage(`✓ Executed ${action} on "${item.title}"`);
      setDecisionFeedback("");

      // Set next item in queue
      if (data?.items) {
        const remaining = data.items.filter((i) => i.id !== item.id);
        setSelectedItem(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      alert(err.message || "Error executing decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Emergency Undo Action
  const handleUndo = async () => {
    if (!undoState) return;
    const { item } = undoState;
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    setUndoState(null);

    // Optimistically restore item
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [item, ...prev.items],
        counts: {
          ...prev.counts,
          total: prev.counts.total + 1,
          myDecisions: prev.counts.myDecisions + 1,
        },
      };
    });
    setSelectedItem(item);
    setActionSuccessMessage(`Reverted decision on "${item.title}". Item restored to queue.`);
    setTimeout(() => fetchInbox(), 1200);
  };

  // Keyboard Triage Listener (J = Next, K = Prev, Cmd+Enter = Approve, Cmd+R = Request Changes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault();
        if (data?.items && data.items.length > 0) {
          const currentIndex = data.items.findIndex((i) => i.id === selectedItem?.id);
          const nextIndex = (currentIndex + 1) % data.items.length;
          setSelectedItem(data.items[nextIndex]);
        }
      } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault();
        if (data?.items && data.items.length > 0) {
          const currentIndex = data.items.findIndex((i) => i.id === selectedItem?.id);
          const prevIndex = currentIndex <= 0 ? data.items.length - 1 : currentIndex - 1;
          setSelectedItem(data.items[prevIndex]);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (selectedItem && selectedItem.canApprove) {
          handleExecuteDecision(selectedItem, "APPROVE");
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        if (selectedItem) {
          handleExecuteDecision(
            selectedItem,
            selectedItem.type === "DEADLINE_EXTENSION" ? "REJECT" : "REQUEST_CHANGES",
            decisionFeedback || "Revisions required as per executive review."
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data?.items, selectedItem, decisionFeedback]);

  // Grouped items calculation
  const groupedItems = useMemo(() => {
    if (!data?.items) return [];
    if (groupBy === "PROJECT") {
      const groups: Record<string, DecisionItemDetails[]> = {};
      data.items.forEach((item) => {
        const key = item.projectCode || "GENERAL_STUDIO";
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
      return Object.entries(groups).map(([groupName, items]) => ({
        groupName: `${groupName} (${items[0]?.projectName || "Studio"})`,
        items,
      }));
    } else if (groupBy === "URGENCY") {
      const groups: Record<string, DecisionItemDetails[]> = {
        CRITICAL: [],
        URGENT: [],
        NORMAL: [],
      };
      data.items.forEach((item) => {
        groups[item.urgency].push(item);
      });
      return [
        { groupName: "Critical Path (>48 Hours Aging)", items: groups.CRITICAL },
        { groupName: "Urgent Queue (>24 Hours)", items: groups.URGENT },
        { groupName: "Standard Queue (<24 Hours)", items: groups.NORMAL },
      ].filter((g) => g.items.length > 0);
    }
    return [{ groupName: "All Actionable Requests", items: data.items }];
  }, [data?.items, groupBy]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DELIVERABLE_SUBMISSION":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: FileCheck2, label: "Deliverable" };
      case "DEADLINE_EXTENSION":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Extension" };
      case "SCOPE_CHANGE":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", icon: Layers, label: "Scope Variation" };
      case "PROFILE_CHANGE":
        return { bg: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: User, label: "HR Record" };
      case "DRAWING_REVISION":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: FolderKanban, label: "GFC Drawing" };
      case "SITE_VISIT":
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: MapPin, label: "Site Inspection" };
      case "TASK_BLOCKER":
        return { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle, label: "Critical Blocker" };
      case "LEAVE_APPLICATION":
        return { bg: "bg-teal-50 text-teal-700 border-teal-200", icon: Calendar, label: "Leave Application" };
      case "LEAVE_CANCELLATION":
        return { bg: "bg-orange-50 text-orange-700 border-orange-200", icon: RefreshCw, label: "Leave Cancellation" };
      default:
        return { bg: "bg-slate-50 text-slate-700 border-slate-200", icon: Inbox, label: type };
    }
  };

  const getUrgencyBadge = (urgency: string, ageHours: number) => {
    if (urgency === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Critical ({ageHours}h)
        </span>
      );
    }
    if (urgency === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Urgent ({ageHours}h)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-400" />
        {ageHours < 24 ? `${ageHours}h` : `${Math.floor(ageHours / 24)}d`}
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-16">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & TELEMETRY ROW                                  */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/90">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B122B] to-[#3562E8] text-white flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Executive Decision Airlock
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                PRO COCKPIT
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Studio Leadership Unified Authorization Queue &amp; High-Density Decision Workbench
            </p>
          </div>
        </div>

        {/* Top Right: Layout Switcher, Grouping, Live Sync */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Toggle */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewLayout("COCKPIT")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewLayout === "COCKPIT"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="3-Zone Split-Screen Workbench"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Cockpit Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("CLASSIC")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewLayout === "CLASSIC"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Classic Card List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Classic List</span>
            </button>
          </div>

          {/* Group By Selector */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="NONE">Default</option>
              <option value="PROJECT">By Project</option>
              <option value="URGENCY">By Urgency</option>
            </select>
          </div>

          <LiveSyncIndicator
            isConnected={isConnected}
            lastEvent={lastEvent}
            onManualRefresh={() => fetchInbox()}
          />

          <button
            onClick={() => fetchInbox()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. EXECUTIVE TELEMETRY KPI CARDS                               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Queue Volume</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data?.counts.total ?? 0}</span>
            <span className="text-xs text-slate-400 font-mono">Pending authorization</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-medium text-[#3562E8] uppercase tracking-wider">Four-Eyes Actionable</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#3562E8]">{data?.counts.myDecisions ?? 0}</span>
            <span className="text-xs text-blue-600 font-medium">Clear to decide</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-medium text-purple-600 uppercase tracking-wider">Scope &amp; Extensions</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-700">
              {(data?.counts.scopeChanges ?? 0) + (data?.counts.deadlineExtensions ?? 0)}
            </span>
            <span className="text-xs text-slate-400 font-mono">Financial &amp; schedule delta</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="text-xs font-medium text-rose-700 uppercase tracking-wider">Critical Blockers</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">{data?.counts.blockers ?? 0}</span>
            <span className="text-xs text-rose-600 font-medium">Site work stoppage</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TABS, CATEGORY FILTERS & SEARCH ROW                          */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Segmented Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto touch-scroll-x max-w-full">
          <button
            onClick={() => setActiveTab("all-authorized")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === "all-authorized"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Authorized ({data?.counts.allAuthorized ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("my-decisions")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "my-decisions"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Decisions ({data?.counts.myDecisions ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("blockers")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "blockers"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Blockers ({data?.counts.blockers ?? 0})
          </button>
        </div>

        {/* Filter Selectors & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="hidden sm:block px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Disciplines &amp; Categories</option>
            <option value="DELIVERABLE_SUBMISSION">Deliverables</option>
            <option value="DRAWING_REVISION">GFC Drawings</option>
            <option value="SCOPE_CHANGE">Scope Variations</option>
            <option value="DEADLINE_EXTENSION">Extensions</option>
            <option value="SITE_VISIT">Site Visits</option>
            <option value="PROFILE_CHANGE">HR Profile</option>
            <option value="LEAVE_APPLICATION">Leaves</option>
          </select>

          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="hidden sm:block px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">Critical (&gt;48h)</option>
            <option value="URGENT">Urgent (&gt;24h)</option>
            <option value="NORMAL">Standard (&lt;24h)</option>
          </select>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search drawings, projects, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter</span>
            {mobileActiveFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {mobileActiveFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MAIN AIRLOCK VIEWPORT                                       */}
      {/* ============================================================== */}
      {loading && !data ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <RefreshCw className="w-8 h-8 text-[#3562E8] animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Connecting to studio decision airlock...</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Decision Airlock is Clear</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Zero pending deliverables, drawing revisions, or site blockers require executive review under this filter.
          </p>
        </div>
      ) : viewLayout === "COCKPIT" ? (
        // ============================================================
        // A. 3-ZONE SPLIT-SCREEN WORKBENCH (Desktop Default)
        // ============================================================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[640px]">
          {/* ZONE 1: TRIAGE QUEUE MATRIX (Cols 1-4) */}
          <div className="lg:col-span-4 space-y-3 max-h-[820px] overflow-y-auto pr-1 select-none">
            {/* Fast Select All Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-2xs shrink-0">
              <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={
                    data.items.filter((i) => i.canApprove).length > 0 &&
                    selectedIds.size === data.items.filter((i) => i.canApprove).length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-slate-800 text-[11px]">
                  All Actionable ({data.items.filter((i) => i.canApprove).length})
                </span>
              </label>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span>Nav:</span>
                <kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-bold">J</kbd>
                <kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-bold">K</kbd>
              </div>
            </div>

            {/* Grouped Queue Items */}
            {groupedItems.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {groupBy !== "NONE" && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 pt-1 font-mono">
                    {group.groupName} ({group.items.length})
                  </div>
                )}

                {group.items.map((item) => {
                  const badge = getTypeBadge(item.type);
                  const Icon = badge.icon;
                  const isChecked = selectedIds.has(item.id);
                  const isFocused = selectedItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-2xs relative ${
                        isFocused
                          ? "border-[#3562E8] ring-2 ring-blue-500/15 bg-blue-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      } ${item.urgency === "CRITICAL" ? "border-l-4 border-l-rose-500" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {item.canApprove && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1 shrink-0"
                          />
                        )}

                        <div className={`p-2 rounded-xl border shrink-0 ${badge.bg}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            {item.projectCode && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {item.projectCode}
                              </span>
                            )}
                            {getUrgencyBadge(item.urgency, item.ageHours)}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                            {item.title}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-0.5">
                            <span className="truncate">{item.requesterName}</span>
                            <span>{item.ageHours}h ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ZONE 2: VISUAL EVIDENCE CANVAS & VECTOR AIRLOCK (Cols 5-8) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {selectedItem ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                      VISUAL EVIDENCE AIRLOCK
                    </span>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {selectedItem.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedItem.projectCode} — {selectedItem.projectName || "Studio"}
                    </p>
                  </div>

                  <span className="font-mono text-xs text-slate-400 shrink-0">
                    {new Date(selectedItem.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Vector CAD Blueprint Diff Canvas (when drawing/deliverable) */}
                {selectedItem.type === "DELIVERABLE_SUBMISSION" || selectedItem.type === "DRAWING_REVISION" ? (
                  <VisualDrawingAirlock
                    data={{
                      drawingCode: selectedItem.projectCode ? `${selectedItem.projectCode}-GFC-302` : "100D-ARC-GFC-302",
                      drawingTitle: selectedItem.title,
                      projectCode: selectedItem.projectCode,
                      projectName: selectedItem.projectName,
                      discipline: selectedItem.type === "DRAWING_REVISION" ? "ARCHITECTURAL" : "INTERIOR_DETAIL",
                      revisionB: {
                        code: "Rev 03",
                        label: "Submission in Review",
                        date: "Today",
                        author: selectedItem.requesterName,
                        status: selectedItem.status,
                        changeSummary: selectedItem.summary || "Deliverable submission awaiting architectural review.",
                      },
                    }}
                    onApprove={(notes) => handleExecuteDecision(selectedItem, "APPROVE", notes)}
                    onRequestChanges={(notes) => handleExecuteDecision(selectedItem, "REQUEST_CHANGES", notes)}
                    onReject={(notes) => handleExecuteDecision(selectedItem, "REJECT", notes)}
                    isSubmitting={isSubmitting}
                  />
                ) : (
                  // Deep Comparative Cards for Scope/Extensions/Blockers
                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedItem.summary}
                    </div>

                    {selectedItem.type === "SCOPE_CHANGE" && (
                      <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2 text-xs">
                        <div className="font-bold text-purple-900 text-sm">Contractual Variation Impact</div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                            <span className="text-slate-500 block text-[11px]">Fee Impact:</span>
                            <span className="font-bold text-purple-700 text-sm">
                              +₹{Number(selectedItem.details?.feeImpactAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                            <span className="text-slate-500 block text-[11px]">Program Extension:</span>
                            <span className="font-bold text-slate-900 text-sm">
                              +{selectedItem.details?.scheduleImpactDays || 0} calendar days
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedItem.type === "DEADLINE_EXTENSION" && (
                      <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2 text-xs">
                        <div className="font-bold text-blue-900 text-sm">Milestone Delivery Comparison</div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 bg-white rounded-xl border border-blue-100">
                            <span className="text-slate-500 block text-[11px]">Current Target:</span>
                            <span className="font-bold text-slate-700">
                              {selectedItem.details?.currentDueDate
                                ? new Date(selectedItem.details.currentDueDate).toLocaleDateString()
                                : "Unscheduled"}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-blue-100">
                            <span className="text-slate-500 block text-[11px]">Proposed Date:</span>
                            <span className="font-bold text-blue-700">
                              {selectedItem.details?.proposedDueDate
                                ? new Date(selectedItem.details.proposedDueDate).toLocaleDateString()
                                : "None"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">Select an item from the queue to inspect</p>
              </div>
            )}
          </div>

          {/* ZONE 3: CONSEQUENCE & GOVERNANCE COCKPIT (Cols 9-12) */}
          <div className="lg:col-span-3">
            {selectedItem ? (
              <DecisionConsequenceCard
                item={selectedItem}
                feedback={decisionFeedback}
                onFeedbackChange={setDecisionFeedback}
                onExecute={(action) => handleExecuteDecision(selectedItem, action)}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                Awaiting ticket selection
              </div>
            )}
          </div>
        </div>
      ) : (
        // ============================================================
        // B. CLASSIC CARD LIST WITH DRAWER VIEW
        // ============================================================
        <div className="space-y-3">
          {data.items.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;
            const isChecked = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs hover:border-slate-300 ${
                  item.urgency === "CRITICAL" ? "border-l-4 border-l-rose-500" : ""
                } ${isChecked ? "ring-2 ring-blue-500/20 bg-blue-50/20" : ""}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {item.canApprove ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1 shrink-0"
                      />
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}

                    <div className={`p-2 rounded-xl border shrink-0 ${badge.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {item.projectCode && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {item.projectCode}
                          </span>
                        )}
                        {getUrgencyBadge(item.urgency, item.ageHours)}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1.5 text-xs font-bold text-[#3562E8] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                    >
                      Inspect in Cockpit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. FLOATING BATCH MULTI-ACTION TOOLBAR                         */}
      {/* ============================================================== */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="text-xs font-bold font-mono text-slate-200">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExecuteBatch("APPROVE")}
              disabled={isBatchSubmitting}
              className="px-4 py-1.5 bg-[#3562E8] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>

            <button
              type="button"
              onClick={() => handleExecuteBatch("REQUEST_CHANGES")}
              disabled={isBatchSubmitting}
              className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Request Changes
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. EMERGENCY 30-SECOND UNDO TOAST                              */}
      {/* ============================================================== */}
      {undoState && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs min-w-0">
            <span className="font-bold block truncate max-w-xs">{undoState.item.title}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Action executed • {undoState.secondsLeft}s left to reverse
            </span>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Mobile Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Queue"
        activeCount={mobileActiveFilterCount}
        onReset={() => {
          setSelectedType("ALL");
          setSelectedUrgency("ALL");
        }}
        resultsCount={data?.items?.length ?? 0}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Decision Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <option value="ALL">All Categories</option>
              <option value="DELIVERABLE_SUBMISSION">Deliverables</option>
              <option value="DRAWING_REVISION">Drawings</option>
              <option value="SCOPE_CHANGE">Scope Variations</option>
              <option value="DEADLINE_EXTENSION">Extensions</option>
              <option value="SITE_VISIT">Site Visits</option>
              <option value="LEAVE_APPLICATION">Leaves</option>
            </select>
          </div>
        </div>
      </MobileFilterDrawer>
    </div>
  );
}
