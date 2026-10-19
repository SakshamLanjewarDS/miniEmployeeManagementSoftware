"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Search,
  Filter,
  User,
  Shield,
  X,
  Check,
} from "lucide-react";
import { broadcastRealtimeEvent, useRealtimeSubscription } from "@/lib/realtime";

export default function AttendanceManagementPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correction Modal
  const [correctingRecord, setCorrectingRecord] = useState<any | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    punchIn: "",
    punchOut: "",
    status: "PRESENT",
    correctionReason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAttendance = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        pageSize: "100",
        ...(selectedDate ? { date: selectedDate } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/attendance?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load attendance logs");

      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((rec) => {
      const empName = (rec.employee?.membership?.user?.fullName || "").toLowerCase();
      const empId = (rec.employee?.employeeId || "").toLowerCase();
      return empName.includes(q) || empId.includes(q);
    });
  }, [records, searchQuery]);

  useEffect(() => {
    fetchAttendance();
  }, [workspaceSlug, selectedDate, statusFilter]);

  // Real-time dynamic updates: visible polling + tab focus revalidation + cross-tab live events
  useRealtimeSubscription(["ATTENDANCE_UPDATED"], () => fetchAttendance(true), { intervalMs: 20000 });

  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          recordId: correctingRecord.id,
          punchIn: correctionForm.punchIn ? `${selectedDate}T${correctionForm.punchIn}:00` : undefined,
          punchOut: correctionForm.punchOut ? `${selectedDate}T${correctionForm.punchOut}:00` : undefined,
          status: correctionForm.status,
          correctionReason: correctionForm.correctionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Correction failed");

      setActionSuccess("Attendance punch audited and corrected successfully.");
      setCorrectingRecord(null);
      fetchAttendance();
      broadcastRealtimeEvent("ATTENDANCE_UPDATED");
      broadcastRealtimeEvent("NOTIFICATION_UPDATED");
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
            <span>Studio Operations</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Staff Attendance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] tracking-tight">Studio Attendance & Punch Logs</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Owner/Admin restricted • Incomplete punch reporting • Audited time corrections
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-2xl p-1 shadow-2xs flex-1 sm:flex-initial">
            <span className="px-2.5 sm:px-3 text-xs font-semibold text-[#696E82] whitespace-nowrap">Select Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 sm:px-3 py-1.5 text-xs font-mono font-bold text-[#1F1F1F] bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] focus:outline-none focus:border-[#5A81FA] w-full"
            />
          </div>

          <button
            onClick={() => setSelectedDate(todayStr)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Present</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{summary.presentCount}</div>
            <div className="text-[10px] text-[#696E82]">Full-day attendance</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Half Day</div>
            <div className="text-xl font-extrabold text-indigo-600 mt-1 font-mono">{summary.halfDayCount}</div>
            <div className="text-[10px] text-[#696E82]">Partial shifts</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">On Leave</div>
            <div className="text-xl font-extrabold text-[#5A81FA] mt-1 font-mono">{summary.onLeaveCount}</div>
            <div className="text-[10px] text-[#696E82]">Approved leaves</div>
          </div>
          <div className="p-3.5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Absent</div>
            <div className="text-xl font-extrabold text-rose-600 mt-1 font-mono">{summary.absentCount}</div>
            <div className="text-[10px] text-[#696E82]">Unexcused absence</div>
          </div>
          <div className="p-3.5 bg-[#FFFBEB] rounded-2xl border border-amber-200 shadow-2xs col-span-2 md:col-span-1">
            <div className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider">Missing Punch</div>
            <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">{summary.missingPunchCount}</div>
            <div className="text-[10px] text-amber-700">Requires review</div>
          </div>
        </div>
      )}

      {/* Filter Selector Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name or ID..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#1F1F1F] whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter attendance by status"
            className="px-3 py-1.5 text-xs bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="ABSENT">Absent</option>
            <option value="MISSING_PUNCH">Missing Punch</option>
          </select>

          {(statusFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#696E82]">Loading attendance logs...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#696E82]">
            {records.length > 0
              ? "No attendance records match your filter criteria."
              : `No attendance records recorded for ${selectedDate}.`}
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {filteredRecords.map((rec) => {
              const empName = rec.employee?.membership?.user?.fullName || "Staff Member";
              const empId = rec.employee?.employeeId || "EMP";
              const pInStr = rec.punchIn
                ? new Date(rec.punchIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                : "--:--";
              const pOutStr = rec.punchOut
                ? new Date(rec.punchOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                : "--:--";
              const hoursWorked = rec.totalMinutes ? (rec.totalMinutes / 60).toFixed(1) : "0.0";

              return (
                <div
                  key={rec.id}
                  className="p-3.5 hover:bg-[#F8F9FE] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="w-8 h-8 rounded-full bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0">
                      {empName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#1F1F1F]">{empName}</div>
                      <div className="text-[11px] text-[#696E82] font-mono mt-0.5">
                        {empId} • {rec.employee?.department || "General"}
                      </div>
                    </div>
                  </div>

                  {/* Punch times */}
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[#696E82] block font-sans">Punch In</span>
                      <strong className="text-[#1F1F1F]">{pInStr}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#696E82] block font-sans">Punch Out</span>
                      <strong className="text-[#1F1F1F]">{pOutStr}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#696E82] block font-sans">Total Hours</span>
                      <span className="text-[#5A81FA] font-bold">{hoursWorked} hrs</span>
                    </div>
                  </div>

                  {/* Status & Correction */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        rec.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : rec.status === "HALF_DAY"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : rec.status === "ON_LEAVE"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : rec.status === "ABSENT"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {rec.status}
                    </span>

                    <button
                      onClick={() => {
                        setCorrectingRecord(rec);
                        setCorrectionForm({
                          punchIn: rec.punchIn
                            ? new Date(rec.punchIn).toTimeString().slice(0, 5)
                            : "10:30",
                          punchOut: rec.punchOut
                            ? new Date(rec.punchOut).toTimeString().slice(0, 5)
                            : "18:30",
                          status: rec.status,
                          correctionReason: rec.correctionReason || "",
                        });
                      }}
                      className="p-1.5 text-[#696E82] hover:text-[#5A81FA] hover:bg-[#F2F4FF] rounded-lg transition-colors"
                      title="Audited Punch Correction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audited Correction Modal */}
      {correctingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audited Punch Correction"
          className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleCorrectSubmit}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 border border-[#E2E6F0] shadow-xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">Audited Punch Correction</h3>
                <p className="text-xs text-[#696E82]">
                  {correctingRecord.employee?.membership?.user?.fullName} ({selectedDate})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="p-1 text-[#696E82] hover:bg-[#F8F9FE] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Punch In Time</label>
                  <input
                    type="time"
                    value={correctionForm.punchIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, punchIn: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Punch Out Time</label>
                  <input
                    type="time"
                    value={correctionForm.punchOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, punchOut: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl font-mono text-[#1F1F1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Adjusted Status</label>
                <select
                  value={correctionForm.status}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                >
                  <option value="PRESENT">Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={correctionForm.correctionReason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })}
                  placeholder="e.g. Biometric device clock desync / verified on site log"
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setCorrectingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-[#696E82] hover:bg-[#F8F9FE] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5A81FA] hover:bg-[#4870EB] rounded-xl disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
