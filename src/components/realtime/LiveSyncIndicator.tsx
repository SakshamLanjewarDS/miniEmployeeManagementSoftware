"use client";

import React, { useState } from "react";
import { Radio, RefreshCw, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { StudioRealtimeEvent } from "./useStudioRealtime";

interface LiveSyncIndicatorProps {
  isConnected: boolean;
  lastEvent?: StudioRealtimeEvent | null;
  onManualRefresh?: () => void;
  className?: string;
}

export function LiveSyncIndicator({
  isConnected,
  lastEvent,
  onManualRefresh,
  className = "",
}: LiveSyncIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    if (onManualRefresh) onManualRefresh();
    setTimeout(() => setIsRotating(false), 600);
  };

  const getEventLabel = (type?: string) => {
    switch (type) {
      case "TASK_UPDATED":
        return "Deliverable updated";
      case "DECISION_UPDATED":
        return "Executive decision processed";
      case "VISIT_LOGGED":
        return "Site visit logged";
      case "DRAWING_UPDATED":
        return "GFC revision updated";
      case "MEETING_SCHEDULED":
        return "Studio meeting scheduled";
      default:
        return "Workspace synced";
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
          isConnected
            ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70"
            : "bg-amber-50/80 text-amber-700 border-amber-200/80 hover:bg-amber-100/70"
        }`}
        title={isConnected ? "Realtime event mesh active" : "Reconnecting to live event mesh..."}
      >
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse"></span>
          )}
        </span>

        <span className="tracking-wide">{isConnected ? "Live Sync" : "Connecting..."}</span>

        {onManualRefresh && (
          <span
            onClick={handleRefresh}
            className="p-0.5 ml-0.5 rounded-full hover:bg-emerald-200/60 transition-colors"
            title="Refresh stream state"
          >
            <RefreshCw
              className={`w-3 h-3 text-emerald-600 ${isRotating ? "animate-spin" : ""}`}
            />
          </span>
        )}
      </button>

      {/* Popover on click */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>SSE Real-Time Stream</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isConnected
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isConnected ? "ACTIVE" : "RETRYING"}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Instantaneous state sync enabled. No manual page refresh required when deliverables, site visits, or approvals change.
          </p>

          {lastEvent && (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-0.5">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Last Event:</span>
              </div>
              <div className="text-slate-600 font-medium">
                {getEventLabel(lastEvent.type)}
              </div>
              <div className="text-slate-400 font-mono">
                {new Date(lastEvent.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className="text-[10px] text-slate-400 hover:text-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
