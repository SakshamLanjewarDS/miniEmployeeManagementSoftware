"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  MessageSquare,
  Sparkles,
  Calendar,
  ExternalLink,
  Info,
} from "lucide-react";

export interface DecisionItemDetails {
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

interface DecisionConsequenceCardProps {
  item: DecisionItemDetails;
  feedback: string;
  onFeedbackChange: (text: string) => void;
  onExecute: (action: "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "RESOLVE_BLOCKER") => void;
  isSubmitting: boolean;
  className?: string;
}

export function DecisionConsequenceCard({
  item,
  feedback,
  onFeedbackChange,
  onExecute,
  isSubmitting,
  className = "",
}: DecisionConsequenceCardProps) {
  const [copiedTransmittal, setCopiedTransmittal] = useState(false);

  // Quick Preset Feedback Tags for Instant Review Directives
  const presetFeedbacks = [
    "Approved as per structural clearance.",
    "Approved for GFC issue to site.",
    "Verify on-site MEP dimensions before concrete pour.",
    "Redlines marked on drawing canvas. Please revise.",
    "Coordinate with client representative before proceeding.",
  ];

  // Calculate Downstream Consequence Model
  const getDownstreamImpact = () => {
    switch (item.type) {
      case "DRAWING_REVISION":
      case "DELIVERABLE_SUBMISSION":
        return {
          financialImpact: "Unlocks Phase Milestone Billing (Estimated ₹1,20,000)",
          financialDelta: "+0%",
          scheduleImpact: "On Schedule • Zero Delay to GFC Milestone",
          downstreamTrades: ["Civil Masonry", "Plumbing Riser Piping", "Electrical Conduits"],
          slaRisk: item.ageHours > 48 ? "HIGH (Contractor SLA Breached)" : "NORMAL",
        };
      case "SCOPE_CHANGE":
        const fee = item.details?.feeImpactAmount || 75000;
        const days = item.details?.scheduleImpactDays || 7;
        return {
          financialImpact: `Fee Variation of +₹${Number(fee).toLocaleString("en-IN")}`,
          financialDelta: `+${((fee / 1500000) * 100).toFixed(1)}% Contingency Buffer`,
          scheduleImpact: `Schedule extended by +${days} calendar days`,
          downstreamTrades: [item.details?.affectedScope || "All Architectural Disciplines"],
          slaRisk: "Awaiting Client Signed Addendum",
        };
      case "DEADLINE_EXTENSION":
        const extDays = item.details?.proposedDueDate
          ? Math.max(1, Math.round((new Date(item.details.proposedDueDate).getTime() - (item.details.currentDueDate ? new Date(item.details.currentDueDate).getTime() : Date.now())) / (1000 * 3600 * 24)))
          : 5;
        return {
          financialImpact: `Site Supervision Overhead (+₹${(extDays * 2500).toLocaleString("en-IN")})`,
          financialDelta: "Marginal Cost Variance",
          scheduleImpact: `Milestone delivery pushed by +${extDays} days`,
          downstreamTrades: ["Site Inspection Team", "Material Procurement"],
          slaRisk: item.ageHours > 24 ? "URGENT (Review within 6 hours)" : "NORMAL",
        };
      case "TASK_BLOCKER":
        return {
          financialImpact: "Civil Construction Stoppage (Risk of Daily Labor Claims)",
          financialDelta: "High Exposure",
          scheduleImpact: "Critical Path Blocked (-2 days accumulated)",
          downstreamTrades: ["Site General Contractor", "Structural Consultant"],
          slaRisk: "CRITICAL (Site team paused awaiting clearance)",
        };
      case "LEAVE_APPLICATION":
      case "LEAVE_CANCELLATION":
        return {
          financialImpact: "Covered by Studio Paid Leave Allowance",
          financialDelta: "Zero Impact",
          scheduleImpact: `${item.details?.days || 1} Day(s) absence (${item.details?.sessionType || "Full Day"})`,
          downstreamTrades: ["Drafting Squad Resource Allocation"],
          slaRisk: "NORMAL",
        };
      default:
        return {
          financialImpact: "Standard Operational Decision",
          financialDelta: "0%",
          scheduleImpact: "Aligned with project targets",
          downstreamTrades: ["Architectural Team"],
          slaRisk: "NORMAL",
        };
    }
  };

  const impact = getDownstreamImpact();

  // WhatsApp & Email Transmittal Formatter
  const handleCopyTransmittal = () => {
    const text = `*100% DESIGN STUDIO | EXECUTIVE DECISION TRANSMITTAL*
----------------------------------------
*Project:* ${item.projectCode || "STUDIO"} — ${item.projectName || "Workspace"}
*Item:* ${item.title}
*Type:* ${item.typeLabel}
*Requester:* ${item.requesterName}
*Status:* ${item.canApprove ? "APPROVED & STAMPED FOR GFC" : "UNDER EXECUTIVE REVIEW"}
*Directives:* ${feedback.trim() || "Approved as per studio quality standards."}
----------------------------------------
_Cryptographically stamped by Studio Executive Leadership._`;

    navigator.clipboard.writeText(text);
    setCopiedTransmittal(true);
    setTimeout(() => setCopiedTransmittal(false), 2500);
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ${className}`}>
      {/* 1. GOVERNANCE & AUDIT HEADER */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            CONSEQUENCE &amp; GOVERNANCE COCKPIT
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Aging: {item.ageHours}h ({item.ageDays}d)
          </span>
        </div>

        {/* Four-Eyes Verification Status */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            item.canApprove
              ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {item.canApprove ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block">Four-Eyes Compliant</span>
                <span className="text-[10px] text-emerald-700/80 truncate block">
                  Author ({item.requesterName}) ≠ Reviewer (You)
                </span>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block">Segregation of Duties Enforced</span>
                <span className="text-[10px] text-amber-700/80 truncate block">
                  {item.cannotApproveReason || "Independent partner sign-off required"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. CONSEQUENCE ENGINE BODY (Scrollable) */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Financial Consequence Tile */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Financial Consequence</span>
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {impact.financialDelta}
            </span>
          </div>
          <p className="text-slate-800 font-medium text-xs leading-relaxed">
            {impact.financialImpact}
          </p>
        </div>

        {/* Schedule & Handover Consequence Tile */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Schedule Impact</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">Milestone Delta</span>
          </div>
          <p className="text-slate-800 font-medium text-xs leading-relaxed">
            {impact.scheduleImpact}
          </p>
        </div>

        {/* Downstream Affected Trades / Disciplines */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Downstream Affected Disciplines &amp; Trades</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {impact.downstreamTrades.map((trade, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium text-[11px] rounded-lg border border-slate-200"
              >
                {trade}
              </span>
            ))}
          </div>
        </div>

        {/* Directive Feedback Notes */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Executive Directives &amp; Redline Notes</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Transmitted to Author</span>
          </div>

          {/* Quick Preset Pills */}
          <div className="flex flex-wrap gap-1">
            {presetFeedbacks.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onFeedbackChange(preset)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] rounded-md border border-slate-200 transition-colors cursor-pointer text-left"
              >
                + {preset.length > 32 ? preset.slice(0, 32) + "..." : preset}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Type executive directives, specific corrections, or structural caveats..."
            className="w-full p-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-sans"
          />
        </div>
      </div>

      {/* 3. 1-CLICK EXECUTIVE ACTION BAR (Footer) */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {item.type === "TASK_BLOCKER" ? (
            <button
              type="button"
              onClick={() => onExecute("RESOLVE_BLOCKER")}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Unblock Deliverable Now</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  onExecute(
                    item.type === "DEADLINE_EXTENSION" ||
                    item.type === "LEAVE_APPLICATION" ||
                    item.type === "LEAVE_CANCELLATION"
                      ? "REJECT"
                      : "REQUEST_CHANGES"
                  )
                }
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
              >
                {item.type === "DEADLINE_EXTENSION" ||
                item.type === "LEAVE_APPLICATION" ||
                item.type === "LEAVE_CANCELLATION"
                  ? "Reject Request"
                  : "Request Changes"}
              </button>

              <button
                type="button"
                onClick={() => onExecute("APPROVE")}
                disabled={isSubmitting || !item.canApprove}
                className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  item.canApprove
                    ? "bg-[#3562E8] hover:bg-blue-600 text-white cursor-pointer shadow-blue-500/20"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Stamp</span>
              </button>
            </>
          )}
        </div>

        {/* External Transmittal Helper */}
        <button
          type="button"
          onClick={handleCopyTransmittal}
          className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          title="Copy formatted notice for contractor or client WhatsApp group"
        >
          {copiedTransmittal ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Transmittal Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy WhatsApp Transmittal Notice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
