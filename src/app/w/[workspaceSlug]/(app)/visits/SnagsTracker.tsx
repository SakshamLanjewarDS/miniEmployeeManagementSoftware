"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  Flag,
} from "lucide-react";

export interface SnagItem {
  id?: string;
  title: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  contractorResponsible?: string;
  targetDate?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  notes?: string;
}

interface SnagsTrackerProps {
  snags: SnagItem[];
  isEditable?: boolean;
  onSnagsChange?: (snags: SnagItem[]) => void;
  availableContractors?: Array<{ name: string; firmName?: string | null; trade?: string | null }>;
}

const SEVERITY_CONFIG: Record<
  SnagItem["severity"],
  { label: string; bg: string; text: string; border: string }
> = {
  CRITICAL: {
    label: "CRITICAL",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-300",
  },
  MAJOR: {
    label: "MAJOR",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  MINOR: {
    label: "MINOR",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-300",
  },
};

const COMMON_PRESETS = [
  { title: "Column honeycombing / aggregate exposure", severity: "CRITICAL" as const },
  { title: "Shuttering slurry leak at slab joint", severity: "MAJOR" as const },
  { title: "Plumbing pipe pressure drop (< 5 bar)", severity: "CRITICAL" as const },
  { title: "Tiling plumb & level deviation (> 3mm)", severity: "MINOR" as const },
  { title: "Electrical conduit missing junction box", severity: "MAJOR" as const },
];

export default function SnagsTracker({
  snags = [],
  isEditable = false,
  onSnagsChange,
  availableContractors = [],
}: SnagsTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSeverity, setNewSeverity] = useState<SnagItem["severity"]>("MAJOR");
  const [newContractor, setNewContractor] = useState(availableContractors[0]?.name || "");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handleAddSnag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: SnagItem = {
      id: `snag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim(),
      severity: newSeverity,
      contractorResponsible: newContractor.trim() || undefined,
      targetDate: newTargetDate || undefined,
      status: "OPEN",
      notes: newNotes.trim() || undefined,
    };

    onSnagsChange?.([...snags, newItem]);

    setNewTitle("");
    setNewNotes("");
    setNewTargetDate("");
    setShowAddForm(false);
  };

  const handleApplyPreset = (preset: { title: string; severity: SnagItem["severity"] }) => {
    setNewTitle(preset.title);
    setNewSeverity(preset.severity);
    setShowAddForm(true);
  };

  const handleToggleStatus = (index: number) => {
    if (!isEditable) return;
    const updated = [...snags];
    const curr = updated[index].status;
    updated[index].status = curr === "RESOLVED" ? "OPEN" : "RESOLVED";
    onSnagsChange?.(updated);
  };

  const handleDeleteSnag = (index: number) => {
    const updated = snags.filter((_, idx) => idx !== index);
    onSnagsChange?.(updated);
  };

  const criticalCount = snags.filter((s) => s.severity === "CRITICAL" && s.status !== "RESOLVED").length;
  const openCount = snags.filter((s) => s.status !== "RESOLVED").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-600" />
          <h4 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
            Site Snags & Defect Flagging Register ({openCount} Open)
          </h4>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
              {criticalCount} Critical
            </span>
          )}
        </div>

        {isEditable && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 bg-white hover:bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? "Close Form" : "Log New Snag"}</span>
          </button>
        )}
      </div>

      {/* Preset quick buttons if editable */}
      {isEditable && !showAddForm && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-[#696E82] font-semibold">Quick Presets:</span>
          {COMMON_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-[10px] px-2 py-0.5 bg-[#F8F9FD] hover:bg-[#F2F4FF] text-[#1F1F1F] border border-[#E2E6F0] rounded-md transition-colors cursor-pointer"
            >
              + {p.title.split("/")[0].trim()}
            </button>
          ))}
        </div>
      )}

      {/* Add New Snag Form */}
      {showAddForm && isEditable && (
        <form
          onSubmit={handleAddSnag}
          className="p-3.5 bg-[#FAFBFD] border border-[#CEDEFF] rounded-xl space-y-3 text-xs"
        >
          <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Record Site Defect / Quality Punch Item</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
              Defect Title & Location Description <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Honeycombing in Column C4, ground floor lobby"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Severity */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none"
              >
                <option value="MINOR">MINOR (Aesthetic / Touchup)</option>
                <option value="MAJOR">MAJOR (Rework Required)</option>
                <option value="CRITICAL">CRITICAL (Structural / Safety)</option>
              </select>
            </div>

            {/* Contractor */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                Responsible Contractor
              </label>
              <input
                type="text"
                placeholder="e.g. Kunal Sharma (Civil)"
                value={newContractor}
                onChange={(e) => setNewContractor(e.target.value)}
                className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none"
              />
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                Target Rectification Date
              </label>
              <input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Rectification instruction (e.g. Chip loose mortar, apply structural bonding agent and non-shrink grout)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-[#E2E6F0]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-white border border-[#E2E6F0] text-[#696E82] font-semibold rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-lg text-xs shadow-xs"
            >
              Add Defect to Register
            </button>
          </div>
        </form>
      )}

      {/* Snag List */}
      {snags.length === 0 ? (
        <div className="p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-center text-xs text-[#696E82]">
          <span>✔ No snags or defects logged for this inspection. Quality verified.</span>
        </div>
      ) : (
        <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden bg-white">
          {snags.map((snag, idx) => {
            const sev = SEVERITY_CONFIG[snag.severity] || SEVERITY_CONFIG.MAJOR;
            const isResolved = snag.status === "RESOLVED";

            return (
              <div
                key={snag.id || idx}
                className={`p-3 flex items-start justify-between gap-3 text-xs transition-colors ${
                  isResolved ? "bg-[#FAFBFD] opacity-70" : "hover:bg-[#F8F9FD]"
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border ${sev.bg} ${sev.text} ${sev.border}`}
                    >
                      {sev.label}
                    </span>
                    <span
                      className={`font-semibold ${
                        isResolved ? "line-through text-[#696E82]" : "text-[#1F1F1F]"
                      }`}
                    >
                      {snag.title}
                    </span>
                  </div>

                  {snag.notes && <p className="text-[11px] text-[#696E82] italic">{snag.notes}</p>}

                  <div className="flex items-center gap-3 text-[10px] text-[#696E82] pt-0.5">
                    {snag.contractorResponsible && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#5A81FA]" />
                        <span>Contractor: {snag.contractorResponsible}</span>
                      </span>
                    )}
                    {snag.targetDate && (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Target: {new Date(snag.targetDate).toLocaleDateString("en-IN")}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(idx)}
                    disabled={!isEditable}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      isResolved
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >
                    {isResolved ? "✔ RESOLVED" : "OPEN"}
                  </button>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSnag(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1 rounded cursor-pointer"
                      title="Remove snag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
