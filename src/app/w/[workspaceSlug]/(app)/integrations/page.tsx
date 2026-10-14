"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Clock,
  Play,
  Pause,
  RotateCw,
  Layers,
  Database,
  Mail,
  FileSpreadsheet,
  HardDrive,
  ShieldAlert,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  category: "SYNC" | "IMPORT" | "COMMUNICATION" | "WORKER" | "STORAGE";
  isEnabled: boolean;
  status: "HEALTHY" | "DEGRADED" | "ERROR" | "NOT_CONFIGURED" | "AWAITING_RUN";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  nextScheduledAt: string | null;
  freshnessMinutes: number | null;
  sanitizedError: string | null;
  metrics: {
    processedCount: number;
    failedCount: number;
    backlogCount: number;
    additionalInfo?: string;
  };
  actionsAllowed: string[];
}

interface IntegrationHealthData {
  generatedAt: string;
  overallHealth: "HEALTHY" | "DEGRADED" | "ATTENTION_REQUIRED";
  activeConnectorsCount: number;
  failingConnectorsCount: number;
  totalBacklogItems: number;
  connectors: Connector[];
  recentSyncLogs: Array<{
    id: string;
    syncType: string;
    status: string;
    importedCount: number;
    updatedCount: number;
    failedCount: number;
    startedAt: string;
    completedAt: string | null;
    sanitizedError: string | null;
  }>;
}

export default function IntegrationsHealthPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [data, setData] = useState<IntegrationHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/integrations/health", {
        headers: { "x-workspace-slug": workspaceSlug },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load integration health");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceSlug) {
      fetchHealth();
    }
  }, [workspaceSlug]);

  const handleManualSync = async (syncType: string) => {
    try {
      setActionLoading(syncType);
      const res = await fetch("/api/integrations/health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({ action: "MANUAL_SYNC", syncType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Manual sync failed");
      alert(`Manual sync completed successfully! Status: ${json.status}`);
      fetchHealth();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryOutbox = async () => {
    try {
      setActionLoading("RETRY_OUTBOX");
      const res = await fetch("/api/integrations/health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({ action: "RETRY_OUTBOX" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Retry failed");
      alert(`Retried outbox dispatch: ${json.retriedCount} message(s) queued for delivery.`);
      fetchHealth();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSchedule = async (syncType: string, currentState: boolean) => {
    try {
      setActionLoading(`TOGGLE_${syncType}`);
      const res = await fetch("/api/integrations/health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-slug": workspaceSlug,
        },
        body: JSON.stringify({
          action: "TOGGLE_SCHEDULE",
          syncType,
          isEnabled: !currentState,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Toggle failed");
      fetchHealth();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: Connector["status"]) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Healthy
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Degraded
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Failing
          </span>
        );
      case "AWAITING_RUN":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Awaiting Initial Run
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Not Configured
          </span>
        );
    }
  };

  const getCategoryIcon = (category: Connector["category"]) => {
    switch (category) {
      case "SYNC":
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case "IMPORT":
        return <Layers className="w-4 h-4 text-blue-600" />;
      case "COMMUNICATION":
        return <Mail className="w-4 h-4 text-purple-600" />;
      case "WORKER":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "STORAGE":
        return <HardDrive className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0B122B] tracking-tight">
            Integration & Job Health Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status, data freshness, queue backlogs, and diagnostic controls for all studio
            connectors.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#5A81FA] text-white hover:bg-[#4870e8] rounded-lg shadow-sm transition disabled:opacity-50 w-full sm:w-auto min-h-[38px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Top Metrics Row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Overall Studio Health</div>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  data.overallHealth === "HEALTHY"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : data.overallHealth === "DEGRADED"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {data.overallHealth}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Truthful operational status</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Active Connectors</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {data.activeConnectorsCount} / {data.connectors.length}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Scheduling enabled</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-rose-600">Failing Connectors</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {data.failingConnectorsCount}
            </div>
            <div className="text-[11px] text-rose-500 mt-0.5">Require immediate review</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-medium text-slate-500">Queue & Staged Backlog</div>
            <div className="text-2xl font-bold text-[#5A81FA] mt-1">
              {data.totalBacklogItems}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pending delivery / commit</div>
          </div>
        </div>
      )}

      {/* Connectors Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5A81FA]" />
          Verifying connector health, outbox queues, and freshness timestamps...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 text-sm bg-white rounded-xl border border-rose-200">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.connectors.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(c.category)}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {c.category}
                    </span>
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                <h3 className="text-sm font-bold text-[#0B122B] mt-1">{c.name}</h3>

                <p className="text-xs text-slate-500 mt-0.5">{c.metrics.additionalInfo}</p>

                {c.sanitizedError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-mono break-all flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{c.sanitizedError}</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Freshness</span>
                    <span className="font-semibold text-slate-700">
                      {c.freshnessMinutes !== null ? `${c.freshnessMinutes}m ago` : "Never synced"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Processed / Failed</span>
                    <span className="font-semibold text-slate-700">
                      {c.metrics.processedCount} / {c.metrics.failedCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                {c.actionsAllowed.includes("MANUAL_SYNC") && (
                  <button
                    onClick={() =>
                      handleManualSync(
                        c.name.includes("Leave") ? "LEAVE_SHEET" : "VENDOR_SHEET"
                      )
                    }
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    <RotateCw className="w-3 h-3" /> Manual Sync
                  </button>
                )}

                {c.actionsAllowed.includes("RETRY_FAILED_OUTBOX") && (
                  <button
                    onClick={handleRetryOutbox}
                    disabled={actionLoading !== null || c.metrics.failedCount === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition disabled:opacity-40"
                  >
                    <RotateCw className="w-3 h-3" /> Retry Failed
                  </button>
                )}

                {c.actionsAllowed.includes("TOGGLE_SCHEDULE") && (
                  <button
                    onClick={() =>
                      handleToggleSchedule(
                        c.name.includes("Leave") ? "LEAVE_SHEET" : "VENDOR_SHEET",
                        c.isEnabled
                      )
                    }
                    disabled={actionLoading !== null}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-medium rounded-lg transition ${
                      c.isEnabled
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-800"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.isEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {c.isEnabled ? "Pause" : "Resume"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Sync Logs Table */}
      {data && data.recentSyncLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0B122B] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5A81FA]" />
              Recent Connector Execution Audit Logs
            </h2>
            <span className="text-xs text-slate-400">Bounded & sanitized runs</span>
          </div>

          <div className="overflow-x-auto touch-scroll-x">
            <table className="w-full text-left border-collapse text-xs min-w-[580px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Connector</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Imported</th>
                  <th className="py-3 px-3">Updated</th>
                  <th className="py-3 px-3">Failed</th>
                  <th className="py-3 px-3">Started At</th>
                  <th className="py-3 px-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentSyncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-800">{log.syncType}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{log.importedCount}</td>
                    <td className="py-3 px-3 text-slate-600">{log.updatedCount}</td>
                    <td className="py-3 px-3 text-rose-600 font-medium">{log.failedCount}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.startedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {log.completedAt
                        ? new Date(log.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                        : "Running"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
