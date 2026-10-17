"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Lock,
  Unlock,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Building,
  User,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  Calculator,
  Edit3,
  Sparkles,
  Settings,
  X,
  Check,
} from "lucide-react";
import { PayrollSubNav } from "@/components/payroll/PayrollSubNav";

export default function PayrollManagementPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Salary Modal State
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState<number>(55000);
  const [editRateMode, setEditRateMode] = useState<"FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS">("FIXED_30");
  const [editBankName, setEditBankName] = useState<string>("");
  const [editAccountNumber, setEditAccountNumber] = useState<string>("");
  const [editIfscCode, setEditIfscCode] = useState<string>("");
  const [editSaving, setEditSaving] = useState<boolean>(false);

  const fetchPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        year: currentYear.toString(),
        month: currentMonth.toString(),
      });

      const res = await fetch(`/api/payroll/preview?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payroll preview");

      setPreview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [workspaceSlug, currentYear, currentMonth]);

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

  const handleLockPeriod = async () => {
    if (
      !confirm(
        `Are you sure you want to finalize and lock payroll for ${monthNames[currentMonth - 1]} ${currentYear}? This creates an immutable audited snapshot and amortizes active loan recoveries.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/payroll/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          year: currentYear,
          month: currentMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize payroll");

      setActionSuccess(`Payroll period ${preview?.periodKey} finalized and locked successfully.`);
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/payroll/export-csv?workspaceSlug=${workspaceSlug}&year=${currentYear}&month=${currentMonth}`;
  };

  // Batch setup standard studio salaries
  const handleBatchSetupSalaries = async () => {
    if (
      !confirm(
        "Initialize standard architectural studio compensation tiers (Principal ₹85k, Senior ₹55k, Specialist ₹40k, Junior ₹25k with Fixed 30 mode) for all staff members currently lacking salaries?"
      )
    ) {
      return;
    }

    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/payroll/compensation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to batch setup compensation");

      setActionSuccess(data.message || "Successfully initialized studio salaries!");
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal for single employee
  const handleOpenEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setEditBaseSalary(emp.baseSalary > 0 ? emp.baseSalary : 45000);
    setEditRateMode(emp.rateCalculationMode || "FIXED_30");
    setEditBankName(emp.bankName || "HDFC Bank");
    setEditAccountNumber(emp.accountNumber || "");
    setEditIfscCode(emp.ifscCode || "HDFC0001244");
  };

  const handleSaveEmployeeSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditSaving(true);
    try {
      const res = await fetch("/api/payroll/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          employeeId: editingEmployee.employeeDbId || editingEmployee.employeeId,
          baseMonthlySalary: editBaseSalary,
          rateCalculationMode: editRateMode,
          bankName: editBankName,
          accountNumber: editAccountNumber,
          ifscCode: editIfscCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update compensation");

      setActionSuccess(`Updated salary for ${editingEmployee.employeeName} to ₹${editBaseSalary.toLocaleString("en-IN")}`);
      setEditingEmployee(null);
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Payroll Sub-Navigation */}
      <PayrollSubNav workspaceSlug={workspaceSlug} activeTab="overview" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Studio Finance</span>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Salary & Payroll Engine (Project 2)</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Studio Enterprise Payroll</h1>
            {preview?.isLocked ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Period Finalized & Locked</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                <span>Open / Dynamic Preview</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#696E82] mt-0.5">
            Automatic Loss of Pay (LOP) deductions from approved leave records • Fixed 30 / Calendar / Working Days modes
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Navigator */}
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

          {/* Quick Setup Staff Salaries */}
          <button
            onClick={handleBatchSetupSalaries}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#2C308D] hover:bg-[#F2F4FF] hover:border-[#CEDEFF] shadow-2xs transition-all disabled:opacity-50"
            title="Auto-initialize standard studio compensation tiers for staff lacking salaries"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Setup Staff Salaries</span>
          </button>

          {/* Dedicated Calculator Link */}
          <Link
            href={`/w/${workspaceSlug}/payroll/calculate`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#2C308D] hover:bg-[#E5ECFF] shadow-2xs transition-all"
          >
            <Calculator className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Salary Calculator</span>
          </Link>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Export CSV</span>
          </button>

          {!preview?.isLocked && (
            <button
              disabled={actionLoading}
              onClick={handleLockPeriod}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{actionLoading ? "Locking..." : "Finalize & Lock"}</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-2xs">
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

      {/* KPI Stats */}
      {preview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">Gross Payroll</div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
              ₹{preview.totalGross.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">Base salaries + allowances</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
              Total Deductions
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-2 font-mono">
              -₹{preview.totalDeductions.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">LOP leaves + loan recoveries</div>
          </div>

          <div className="p-4 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] shadow-2xs">
            <div className="text-[11px] text-[#2C308D] font-semibold uppercase tracking-wider">
              Net Payable Disbursement
            </div>
            <div className="text-2xl font-extrabold text-[#2C308D] mt-2 font-mono">
              ₹{preview.totalNetPayable.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-[#4870EB] mt-0.5">Final studio bank payout</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="text-[11px] text-[#696E82] font-semibold uppercase tracking-wider">
              Staff Members
            </div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
              {preview.employees.length}
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">Included in monthly run</div>
          </div>
        </div>
      )}

      {/* Staff Payroll Table */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1F1F1F]">
              Staff Compensation Breakdown ({monthNames[currentMonth - 1]} {currentYear})
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2C308D]">
              Project 2 Multi-Mode
            </span>
          </div>
          <span className="text-xs text-[#696E82] font-mono">
            {preview?.employees.length || 0} Staff Evaluated
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#696E82]">Calculating compensation and deductions...</div>
        ) : preview?.employees.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#696E82]">No active staff members found.</div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {preview?.employees.map((emp: any) => (
              <div
                key={emp.employeeId}
                className="p-4 hover:bg-[#F8F9FE] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                {/* Employee Profile */}
                <div className="flex items-center gap-3 min-w-[210px]">
                  <div className="w-9 h-9 rounded-full bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0">
                    {emp.employeeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                      <span>{emp.employeeName}</span>
                      {!preview?.isLocked && (
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="text-[#696E82] hover:text-[#5A81FA] p-0.5 transition-colors"
                          title="Set / Edit Base Salary"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-[#696E82] font-mono mt-0.5">
                      {emp.employeeId} • {emp.department}
                    </div>
                    {emp.blockingReason && (
                      <div className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <span>⚠️ {emp.blockingReason}</span>
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="underline text-[#5A81FA] font-bold"
                        >
                          Fix
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Base Salary & Daily Rate */}
                <div className="font-mono text-xs min-w-[140px]">
                  <span className="text-[10px] text-[#696E82] font-sans block">Base Salary</span>
                  <strong className="text-[#1F1F1F]">₹{emp.baseSalary.toLocaleString("en-IN")}</strong>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    ₹{emp.dailyRate}/day{" "}
                    <span className="font-semibold text-[#2C308D]">
                      ({emp.rateCalculationMode === "FIXED_30" ? "Fixed 30" : emp.rateCalculationMode === "CALENDAR_DAYS" ? "Calendar" : "Working"})
                    </span>
                  </div>
                </div>

                {/* Leave LOP deductions */}
                <div className="font-mono text-xs min-w-[150px]">
                  <span className="text-[10px] text-[#696E82] font-sans block">Unpaid LOP Leave</span>
                  <span className="text-rose-600 font-bold">
                    {emp.unpaidLopDays > 0 ? `-₹${emp.lopDeductionAmount.toLocaleString("en-IN")}` : "₹0.00"}
                  </span>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    {emp.unpaidLopDays} LOP / {emp.paidLeaveDays} Paid Days
                  </div>
                </div>

                {/* Recoveries */}
                <div className="font-mono text-xs min-w-[110px]">
                  <span className="text-[10px] text-[#696E82] font-sans block">Loan Recoveries</span>
                  <span className="text-rose-600 font-semibold">
                    {emp.advanceRecovery + emp.loanRecovery > 0
                      ? `-₹${(emp.advanceRecovery + emp.loanRecovery).toLocaleString("en-IN")}`
                      : "₹0.00"}
                  </span>
                </div>

                {/* Net Payable */}
                <div className="font-mono text-xs min-w-[130px] p-2 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-right">
                  <span className="text-[10px] text-[#696E82] font-sans block">Net Payable</span>
                  <strong className="text-sm font-extrabold text-[#2C308D]">
                    ₹{emp.netPayable.toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* Bank Details & Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-[#696E82] font-mono min-w-[140px]">
                    <div>{emp.bankName || "No Bank Info"}</div>
                    <div>
                      {emp.accountNumber
                        ? `••••${emp.accountNumber.slice(-4)} (${emp.ifscCode || "IFSC"})`
                        : "No Account Configured"}
                    </div>
                  </div>

                  <Link
                    href={`/w/${workspaceSlug}/payroll/calculate?employeeId=${emp.employeeDbId || emp.employeeId}`}
                    className="p-1.5 rounded-lg bg-[#F8F9FE] text-[#5A81FA] hover:bg-[#EEF2FF] border border-[#E2E6F0] transition-colors"
                    title="Simulate / Inspect Formulas in Calculator"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Employee Salary Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Configure Staff Compensation</h3>
                <p className="text-xs text-[#696E82] mt-0.5">
                  {editingEmployee.employeeName} ({editingEmployee.employeeId})
                </p>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeSalary} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Base Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editBaseSalary}
                  onChange={(e) => setEditBaseSalary(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
                <div className="mt-1.5 flex gap-1">
                  {[25000, 40000, 55000, 85000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setEditBaseSalary(amt)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F8F9FE] border border-[#E2E6F0] text-[#696E82] hover:bg-white"
                    >
                      ₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  Rate Calculation Mode (ADR-04)
                </label>
                <select
                  value={editRateMode}
                  onChange={(e) => setEditRateMode(e.target.value as any)}
                  className="w-full text-xs font-medium bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                >
                  <option value="FIXED_30">Fixed 30 Days (Base / 30.0) — Studio Default</option>
                  <option value="CALENDAR_DAYS">Calendar Days (Base / Days in Month)</option>
                  <option value="WORKING_DAYS">Working Days (Base / 26 Working Days)</option>
                </select>
                <div className="text-[10px] text-[#696E82] mt-1 font-mono">
                  Computed Daily Rate: ₹{(editBaseSalary / (editRateMode === "FIXED_30" ? 30 : editRateMode === "CALENDAR_DAYS" ? 31 : 26)).toFixed(2)}/day
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="HDFC Bank"
                    className="w-full text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    placeholder="00123456789"
                    className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={editIfscCode}
                  onChange={(e) => setEditIfscCode(e.target.value)}
                  placeholder="HDFC0001244"
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0F2F7]">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Compensation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
