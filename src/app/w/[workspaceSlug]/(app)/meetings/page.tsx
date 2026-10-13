"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowRight,
  Layers,
  Users,
  Check,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function StudioMeetingsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conversion state
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Schedule modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meetingDate: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    endTime: "12:30",
    meetingType: "Design Review",
    agenda: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings?workspaceSlug=${workspaceSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load studio meetings");
      setMeetings(data.meetings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [workspaceSlug]);

  const handleConvertActionItem = async (meetingId: string, actionItemId: string) => {
    setConvertingId(actionItemId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items/${actionItemId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");

      if (data.alreadyConverted) {
        setActionSuccess("Action item was already converted to an executive task.");
      } else {
        setActionSuccess(`Converted to Executive Deliverable: "${data.task.title}"`);
      }
      fetchMeetings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          title: form.title,
          meetingDate: form.meetingDate,
          startTime: form.startTime,
          endTime: form.endTime,
          meetingType: form.meetingType,
          agenda: form.agenda,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule meeting");

      setIsScheduleOpen(false);
      setForm({
        title: "",
        meetingDate: new Date().toISOString().split("T")[0],
        startTime: "11:00",
        endTime: "12:30",
        meetingType: "Design Review",
        agenda: "",
      });
      fetchMeetings();
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
            <span className="font-semibold text-[#1F1F1F]">Studio Meetings</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Studio Meetings & Action Items</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Design reviews, client presentations, decisions, and idempotent deliverable conversion
          </p>
        </div>

        <button
          onClick={() => setIsScheduleOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
            Loading scheduled studio meetings...
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
            No studio meetings recorded.
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4 text-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E2E6F0] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#1F1F1F]">{m.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D]">
                      {m.meetingType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#696E82] mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>{new Date(m.meetingDate).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>
                        {m.startTime} — {m.endTime}
                      </span>
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {m.status}
                </span>
              </div>

              {m.agenda && (
                <div>
                  <span className="font-semibold text-[#696E82] block mb-1">Agenda & Notes:</span>
                  <div className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-[#1F1F1F]">
                    {m.agenda}
                  </div>
                </div>
              )}

              {/* Action Items List */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="font-bold text-[#1F1F1F] text-[11px] uppercase tracking-wider block">
                  Action Items & Deliverables ({m.actionItems?.length || 0})
                </span>

                {m.actionItems?.length === 0 ? (
                  <p className="text-gray-400 italic">No action items recorded for this meeting.</p>
                ) : (
                  <div className="space-y-2">
                    {m.actionItems?.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-[#1F1F1F]">{item.description}</div>
                          <div className="text-[11px] text-[#696E82] flex items-center gap-2 mt-0.5">
                            {item.assignee && (
                              <span>Assignee: <strong>{item.assignee.user?.fullName}</strong></span>
                            )}
                            {item.dueDate && (
                              <span>• Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          {item.status === "CONVERTED_TO_TASK" ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Converted to Task</span>
                            </span>
                          ) : (
                            <button
                              disabled={convertingId === item.id}
                              onClick={() => handleConvertActionItem(m.id, item.id)}
                              className="px-2.5 py-1 bg-[#5A81FA] hover:bg-[#4870EB] text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <Layers className="w-3 h-3" />
                              <span>{convertingId === item.id ? "Converting..." : "Convert to Task"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleScheduleSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E2E6F0] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Schedule Studio Meeting</h3>
                <p className="text-xs text-[#696E82]">Leadership design & coordination review</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="p-1 text-[#696E82] hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Architectural Phase 2 Review"
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.meetingDate}
                    onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Meeting Type</label>
                <select
                  value={form.meetingType}
                  onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                >
                  <option value="Design Review">Design Review</option>
                  <option value="Client Presentation">Client Presentation</option>
                  <option value="Site Coordination">Site Coordination</option>
                  <option value="Partner Strategy">Partner Strategy</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Agenda</label>
                <textarea
                  rows={2}
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  placeholder="Key topics to discuss..."
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50"
              >
                {actionLoading ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
