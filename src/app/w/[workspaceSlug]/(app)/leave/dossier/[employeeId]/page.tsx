"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  Building,
  Mail,
  Phone,
} from "lucide-react";

export default function EmployeeDossierPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";
  const employeeId = params?.employeeId as string;

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  const [dossier, setDossier] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDossier = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        year: currentYear.toString(),
        month: currentMonth.toString(),
      });

      const res = await fetch(`/api/leave/dossier/${employeeId}?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load employee dossier");
      }
      setDossier(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, [workspaceSlug, employeeId, currentYear, currentMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const emp = dossier?.employee;
  const summary = dossier?.monthlySummary;
  const history = dossier?.allHistory || [];

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/w/${workspaceSlug}/leave`}
          className="inline-flex items-center gap-1.5 text-xs text-[#696E82] hover:text-[#5A81FA] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leave Records</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Staff Member Dossier</h1>
            <p className="text-xs text-[#696E82]">
              Leadership operational review • Quota consumption & Loss of Pay records
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#1F1F1F] min-w-[120px] text-center font-mono">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl">
          {error}
        </div>
      )}

      {/* Staff Profile Card */}
      {emp && (
        <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B122B] text-white text-lg font-bold flex items-center justify-center">
              {emp.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1F1F1F]">{emp.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D] font-mono">
                  {emp.employeeId}
                </span>
              </div>
              <div className="text-xs text-[#696E82] mt-0.5">
                <span>{emp.designation || "Studio Staff"}</span> • <span>{emp.department || "General"}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#696E82] mt-1">
                {emp.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#5A81FA]" />
                    <span>{emp.email}</span>
                  </span>
                )}
                {emp.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#5A81FA]" />
                    <span>{emp.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compensation summary if available */}
          {emp.compensation && (
            <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] text-xs space-y-1 min-w-[200px]">
              <div className="text-[10px] text-[#696E82] font-semibold uppercase tracking-wider">Base Salary</div>
              <div className="text-base font-extrabold text-[#1F1F1F] font-mono">
                ₹{Number(emp.compensation.baseMonthlySalary).toLocaleString("en-IN")}/mo
              </div>
              <div className="text-[10px] text-[#5A81FA] font-medium">
                Rate Mode: {emp.compensation.rateCalculationMode}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Quota & LOP Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Total Requested
          </div>
          <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
            {summary ? Number(summary.totalRequestedDays).toFixed(2) : "0.00"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Total applied in this month</div>
        </div>

        <div className="p-4 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] shadow-2xs">
          <div className="text-[11px] text-[#2C308D] font-semibold uppercase tracking-wider">
            Paid Leave Days
          </div>
          <div className="text-2xl font-extrabold text-[#2C308D] mt-2 font-mono">
            {summary ? Number(summary.paidLeaveDays).toFixed(2) : "0.00"} Days
          </div>
          <div className="text-[11px] text-[#4870EB] mt-0.5">Covered by 2.0 monthly quota</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Unpaid LOP Days
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
            {summary ? Number(summary.unpaidLopDays).toFixed(2) : "0.00"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Subject to payroll salary deduction</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
          <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
            Remaining Allowance
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2 font-mono">
            {summary ? Number(summary.remainingPaidAllowance).toFixed(2) : "2.00"} Days
          </div>
          <div className="text-[11px] text-[#696E82] mt-0.5">Unused paid days in {monthNames[currentMonth - 1]}</div>
        </div>
      </div>

      {/* Selected Month Detail Records */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
        <div className="border-b border-[#E2E6F0] pb-3">
          <h3 className="text-sm font-bold text-[#1F1F1F]">
            Leave Requests for {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <p className="text-xs text-[#696E82]">
            Detailed consumption order and audit notes for this period
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#696E82]">Loading dossier records...</div>
        ) : summary?.requests?.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#696E82] bg-[#F8F9FD] rounded-2xl">
            No leave requests for {monthNames[currentMonth - 1]} {currentYear}.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {summary?.requests?.map((req: any) => (
              <div key={req.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-[#1F1F1F] font-mono">
                    {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-[#696E82] flex items-center gap-2 mt-0.5">
                    <span>{req.leaveType}</span>
                    <span>•</span>
                    <span>Total: <strong>{Number(req.days)} Days</strong></span>
                    {req.allocatedDaysInMonth && (
                      <>
                        <span>•</span>
                        <span>This Month: <strong>{req.allocatedDaysInMonth} Days</strong></span>
                      </>
                    )}
                  </div>
                  {req.reason && (
                    <div className="text-[11px] text-[#696E82] italic mt-1">
                      Reason: &ldquo;{req.reason}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {req.status === "APPROVED" && (
                    <div className="flex items-center gap-1.5">
                      {req.isPaidInMonth > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {req.isPaidInMonth} Paid
                        </span>
                      )}
                      {req.isUnpaidInMonth > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {req.isUnpaidInMonth} LOP
                        </span>
                      )}
                    </div>
                  )}

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      req.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : req.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-rose-100 text-rose-800 border-rose-200"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
