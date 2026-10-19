"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Coins,
  MinusCircle,
  Wallet,
  Users,
  Search,
  Info,
  Lock,
  Unlock,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Check,
  CheckCircle2,
  Calculator,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Edit3,
  SlidersHorizontal,
  Building,
  CreditCard,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

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

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  // Modals & Drawers
  const [selectedBreakdownEmployee, setSelectedBreakdownEmployee] = useState<any | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Edit Salary Modal State
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState<number>(55000);
  const [editRateMode, setEditRateMode] = useState<"FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS">("FIXED_30");
  const [editBankName, setEditBankName] = useState<string>("");
  const [editAccountNumber, setEditAccountNumber] = useState<string>("");
  const [editIfscCode, setEditIfscCode] = useState<string>("");
  const [editSaving, setEditSaving] = useState<boolean>(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

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

  const handlePrevMonth = () => {
    setPage(1);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    setPage(1);
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

      setActionSuccess(`Payroll period ${preview?.periodKey || ""} finalized and locked successfully.`);
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
      setSettingsModalOpen(false);
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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
      if (selectedBreakdownEmployee?.employeeId === editingEmployee.employeeId) {
        setSelectedBreakdownEmployee((prev: any) => ({
          ...prev,
          baseSalary: editBaseSalary,
          rateCalculationMode: editRateMode,
          bankName: editBankName,
          accountNumber: editAccountNumber,
          ifscCode: editIfscCode,
        }));
      }
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!preview?.employees) return [];
    return preview.employees.filter((emp: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (emp.employeeName && emp.employeeName.toLowerCase().includes(q)) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q));

      const matchesMethod =
        methodFilter === "ALL" ||
        emp.rateCalculationMode === methodFilter ||
        (!emp.rateCalculationMode && methodFilter === "FIXED_30");

      return matchesSearch && matchesMethod;
    });
  }, [preview?.employees, searchQuery, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  // Format initials
  const getInitials = (name: string) => {
    if (!name) return "SL";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5 pb-24 md:pb-12 text-[#1F1F1F]">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#696E82]">
        <span>Finance &amp; Payroll</span>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">Payroll</span>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[#1F1F1F] tracking-tight">
            Monthly payroll
          </h1>
          <p className="text-xs md:text-sm text-[#696E82] mt-0.5">
            Review earnings, deductions and employee pay.
          </p>
        </div>

        {/* Month Selector & Status Badge */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs md:text-sm font-semibold text-[#1F1F1F] min-w-[130px] text-center font-mono">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {preview?.isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Finalized • Locked</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Open • Draft</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs & Top Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Navigation Tabs */}
        <div className="inline-flex items-center bg-[#F4F6FB] p-1 rounded-xl border border-[#E2E6F0] self-start">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold bg-[#1456F0] text-white shadow-2xs transition-all"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <Link
            href={`/w/${workspaceSlug}/payroll/calculate`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60 transition-all"
          >
            <Calculator className="w-3.5 h-3.5 text-[#696E82]" />
            <span>Salary calculator</span>
          </Link>
        </div>

        {/* Action Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-[#696E82]" />
            <span>Salary settings</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#5A81FA]" />
            <span>Export CSV</span>
          </button>

          <button
            disabled={actionLoading || preview?.isLocked}
            onClick={handleLockPeriod}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all ${
              preview?.isLocked
                ? "bg-gray-100 text-[#696E82] border border-[#E2E6F0] cursor-not-allowed"
                : "bg-[#1456F0] hover:bg-[#0F47D1] text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{preview?.isLocked ? "Finalized" : actionLoading ? "Finalizing..." : "Review & finalize"}</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Draft Notification Banner matching Reference */}
      {!preview?.isLocked ? (
        <div className="flex items-center gap-3 p-3.5 bg-[#FFF9EB] border border-[#FEE3A2] rounded-2xl text-xs text-[#92400E]">
          <div className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-xs shrink-0">
            !
          </div>
          <div className="flex-1">
            <span className="font-bold">Draft payroll</span>
            <span className="mx-1">•</span>
            <span>Amounts may change until finalized. No payment has been recorded by this preview.</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Finalized payroll snapshot</span>
            <span className="mx-1">•</span>
            <span>This pay cycle is locked for audit integrity. Bank disbursement slips can be downloaded below.</span>
          </div>
        </div>
      )}

      {/* 4 Summary Cards matching Reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Gross Payroll */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Gross payroll</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                ₹{preview ? preview.totalGross.toLocaleString("en-IN") : "0"}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Total base salaries + allowances
          </div>
        </div>

        {/* Total Deductions */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FEECEC] text-[#DC2626] flex items-center justify-center shrink-0">
              <MinusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Total deductions</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                ₹{preview ? preview.totalDeductions.toLocaleString("en-IN") : "0"}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Leave, loans and other deductions
          </div>
        </div>

        {/* Estimated Net Pay */}
        <div className="p-4 md:p-5 bg-[#F8FAFF] rounded-2xl border border-[#CEDEFF] shadow-2xs hover:border-[#5A81FA] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#1456F0] font-semibold">Estimated net pay</div>
              <div className="text-xl md:text-2xl font-bold text-[#1456F0] tracking-tight mt-0.5">
                ₹{preview ? preview.totalNetPayable.toLocaleString("en-IN") : "0"}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#E2E6F0]">
            Estimated amount to be disbursed upon finalization
          </div>
        </div>

        {/* Employees */}
        <div className="p-4 md:p-5 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs hover:border-[#CEDEFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F4F6FB] text-[#1F1F1F] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#696E82] font-medium">Employees</div>
              <div className="text-xl md:text-2xl font-bold text-[#1F1F1F] tracking-tight mt-0.5">
                {preview ? preview.employees.length : 0}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#696E82] mt-3 pt-2.5 border-t border-[#F2F4F8]">
            Included in this payroll
          </div>
        </div>
      </div>

      {/* Employee Pay Breakdown Section */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs overflow-hidden">
        {/* Section Top Bar */}
        <div className="p-4 md:p-5 border-b border-[#E2E6F0] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-[#1F1F1F]">Employee pay breakdown</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#696E82] bg-[#F8F9FE] px-2.5 py-1 rounded-lg border border-[#E2E6F0]">
              <span>Calculation method:</span>
              <span className="font-semibold text-[#1F1F1F]">Fixed 30 days</span>
              <button
                onClick={() => setSettingsModalOpen(true)}
                title="View ADR-04 Multi-Mode calculation policy"
                className="text-[#5A81FA] hover:text-[#1456F0]"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:border-[#1456F0]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F] p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by calculation method"
              className="text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-1.5 text-[#1F1F1F] font-medium focus:outline-none focus:border-[#1456F0] cursor-pointer"
            >
              <option value="ALL">All calculation methods</option>
              <option value="FIXED_30">Fixed 30 days (Standard)</option>
              <option value="CALENDAR_DAYS">Calendar days</option>
              <option value="WORKING_DAYS">Working days (26d)</option>
            </select>

            {(searchQuery || methodFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setMethodFilter("ALL");
                  setPage(1);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
                title="Reset payroll filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#696E82] flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#1456F0] border-t-transparent rounded-full animate-spin" />
            <span>Calculating monthly compensation, approved leaves, and deductions...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#696E82] space-y-2">
            <p>No employee records matched your filter criteria.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-[#1456F0] font-semibold hover:underline"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View matching Reference Image */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E6F0] text-[#696E82] font-semibold bg-[#FAFBFF]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Base salary (per month)</th>
                    <th className="py-3 px-4">Leave deduction</th>
                    <th className="py-3 px-4">Other deductions</th>
                    <th className="py-3 px-4">Estimated net pay</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F7]">
                  {paginatedEmployees.map((emp: any, index: number) => {
                    const rowNumber = (page - 1) * pageSize + index + 1;
                    const otherDeductions = (emp.advanceRecovery || 0) + (emp.loanRecovery || 0);

                    return (
                      <tr
                        key={emp.employeeId}
                        className="hover:bg-[#F8F9FE] transition-colors group"
                      >
                        {/* Row Index */}
                        <td className="py-3.5 px-4 text-[#696E82] text-center font-mono font-medium">
                          {rowNumber}
                        </td>

                        {/* Employee Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(emp.employeeName)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                                <span>{emp.employeeName}</span>
                                {!preview?.isLocked && (
                                  <button
                                    onClick={() => handleOpenEditModal(emp)}
                                    className="opacity-0 group-hover:opacity-100 text-[#696E82] hover:text-[#1456F0] transition-opacity"
                                    title="Edit Salary / Banking Info"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-[#696E82] mt-0.5">
                                <span>{emp.employeeId}</span>
                                {emp.department && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span>{emp.department}</span>
                                  </>
                                )}
                              </div>
                              {emp.blockingReason && (
                                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                  ⚠️ {emp.blockingReason}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Base Salary */}
                        <td className="py-3.5 px-4 font-semibold text-[#1F1F1F] font-mono">
                          ₹{(emp.baseSalary || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Leave Deduction */}
                        <td className="py-3.5 px-4 font-mono">
                          {emp.lopDeductionAmount > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -₹{(emp.lopDeductionAmount || 0).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-[#696E82]">₹0</span>
                          )}
                        </td>

                        {/* Other Deductions */}
                        <td className="py-3.5 px-4 font-mono">
                          {otherDeductions > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -₹{(otherDeductions || 0).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-[#696E82]">₹0</span>
                          )}
                        </td>

                        {/* Estimated Net Pay */}
                        <td className="py-3.5 px-4 font-bold text-[#1456F0] font-mono text-[13px]">
                          ₹{(emp.netPayable || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedBreakdownEmployee(emp)}
                            className="inline-flex items-center gap-1 text-[#1456F0] hover:text-[#0F47D1] font-semibold text-xs transition-colors"
                          >
                            <span>View breakdown</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack Cards matching Reference Image */}
            <div className="md:hidden divide-y divide-[#E2E6F0]">
              {paginatedEmployees.map((emp: any) => {
                const otherDeductions = (emp.advanceRecovery || 0) + (emp.loanRecovery || 0);

                return (
                  <div key={emp.employeeId} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(emp.employeeName)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1F1F1F]">
                          {emp.employeeName}
                        </div>
                        <div className="text-xs text-[#696E82]">
                          <span>{emp.employeeId}</span>
                          {emp.department && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{emp.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs pt-1 border-t border-[#F2F4F8]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#696E82]">Base salary</span>
                        <span className="font-semibold text-[#1F1F1F] font-mono">
                          ₹{(emp.baseSalary || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#696E82]">Leave deduction</span>
                        <span className="font-mono text-[#696E82]">
                          {emp.lopDeductionAmount > 0
                            ? `-₹${(emp.lopDeductionAmount || 0).toLocaleString("en-IN")}`
                            : "₹0"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#696E82]">Other deductions</span>
                        <span className="font-mono text-[#696E82]">
                          {otherDeductions > 0 ? `-₹${(otherDeductions || 0).toLocaleString("en-IN")}` : "₹0"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#F2F4F8]">
                        <span className="font-semibold text-[#1F1F1F]">Estimated net pay</span>
                        <span className="font-bold text-sm text-[#1456F0] font-mono">
                          ₹{(emp.netPayable || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => setSelectedBreakdownEmployee(emp)}
                        className="inline-flex items-center gap-1 text-[#1456F0] font-semibold text-xs"
                      >
                        <span>View breakdown</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls matching Reference */}
            <div className="p-4 border-t border-[#E2E6F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#696E82]">
              <div>
                Showing {(page - 1) * pageSize + 1} –{" "}
                {Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length}{" "}
                employees
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:bg-[#F8F9FE] disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                        page === i + 1
                          ? "bg-[#1456F0] text-white shadow-2xs"
                          : "border border-[#E2E6F0] bg-white text-[#1F1F1F] hover:bg-[#F8F9FE]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-[#E2E6F0] bg-white text-[#696E82] hover:bg-[#F8F9FE] disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Info Notice matching Reference Image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#696E82] pt-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#1456F0] shrink-0" />
          <span>
            Only approved leave is included in this preview. Other adjustments may be added before
            finalization.
          </span>
        </div>
        <Link
          href={`/w/${workspaceSlug}/payroll/calculate`}
          className="inline-flex items-center gap-1 text-[#1456F0] font-semibold hover:underline shrink-0"
        >
          <span>Salary calculator</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Sticky Bottom Actions Bar on Mobile matching Reference */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E6F0] p-3 px-4 flex items-center gap-2.5 shadow-lg">
        <button
          onClick={handleExportCSV}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#E2E6F0] bg-white text-[#1F1F1F] text-xs font-bold shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-[#5A81FA]" />
          <span>Export CSV</span>
        </button>
        <button
          disabled={actionLoading || preview?.isLocked}
          onClick={handleLockPeriod}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#1456F0] text-white text-xs font-bold shadow-xs disabled:opacity-50"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{preview?.isLocked ? "Finalized" : "Review & finalize"}</span>
        </button>
      </div>

      {/* Employee Breakdown Drawer / Modal */}
      {selectedBreakdownEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#F0F2F7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBF1FF] text-[#1456F0] font-bold text-sm flex items-center justify-center">
                  {getInitials(selectedBreakdownEmployee.employeeName)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    {selectedBreakdownEmployee.employeeName}
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    {selectedBreakdownEmployee.employeeId} • {selectedBreakdownEmployee.department || "Design Staff"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreakdownEmployee(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1.5 rounded-xl hover:bg-[#F8F9FE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Breakdown Content */}
            <div className="space-y-4 text-xs">
              {/* Daily Rate & Rate Mode Box */}
              <div className="p-3.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#696E82] block">Calculation Method</span>
                  <span className="font-bold text-[#1F1F1F]">
                    {selectedBreakdownEmployee.rateCalculationMode === "WORKING_DAYS"
                      ? "Working Days (Base ÷ 26)"
                      : selectedBreakdownEmployee.rateCalculationMode === "CALENDAR_DAYS"
                      ? "Calendar Days (Base ÷ Days in Month)"
                      : "Fixed 30 Days (Base ÷ 30.0)"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#696E82] block">Effective Daily Rate</span>
                  <span className="font-bold text-sm text-[#1456F0] font-mono">
                    ₹{selectedBreakdownEmployee.dailyRate}/day
                  </span>
                </div>
              </div>

              {/* Items Breakdown List */}
              <div className="space-y-2 border-t border-[#F0F2F7] pt-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#696E82]">Base monthly salary</span>
                  <span className="font-semibold text-[#1F1F1F] font-mono">
                    ₹{(selectedBreakdownEmployee.baseSalary || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[#696E82] block">Unpaid Loss of Pay (LOP) Leave</span>
                    <span className="text-[11px] text-[#696E82]">
                      {selectedBreakdownEmployee.unpaidLopDays || 0} days × ₹{selectedBreakdownEmployee.dailyRate || 0}
                    </span>
                  </div>
                  <span className="font-semibold text-rose-600 font-mono">
                    {selectedBreakdownEmployee.lopDeductionAmount > 0
                      ? `-₹${(selectedBreakdownEmployee.lopDeductionAmount || 0).toLocaleString("en-IN")}`
                      : "₹0"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[#696E82] block">Loan &amp; Advance Recoveries</span>
                    <span className="text-[11px] text-[#696E82]">Amortized studio deduction</span>
                  </div>
                  <span className="font-semibold text-rose-600 font-mono">
                    {(selectedBreakdownEmployee.advanceRecovery || 0) + (selectedBreakdownEmployee.loanRecovery || 0) > 0
                      ? `-₹${((selectedBreakdownEmployee.advanceRecovery || 0) + (selectedBreakdownEmployee.loanRecovery || 0)).toLocaleString("en-IN")}`
                      : "₹0"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[#E2E6F0] font-bold text-sm">
                  <span className="text-[#1F1F1F]">Estimated net disbursement</span>
                  <span className="text-[#1456F0] font-mono text-base">
                    ₹{(selectedBreakdownEmployee.netPayable || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Bank Details Strip */}
              <div className="p-3 bg-white border border-[#E2E6F0] rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-[#696E82]">
                  <CreditCard className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>
                    {selectedBreakdownEmployee.bankName || "HDFC Bank"} •{" "}
                    {selectedBreakdownEmployee.accountNumber
                      ? `••••${selectedBreakdownEmployee.accountNumber.slice(-4)}`
                      : "Direct Deposit"}
                  </span>
                </div>
                <span className="text-[#696E82] font-mono">
                  IFSC: {selectedBreakdownEmployee.ifscCode || "HDFC0001244"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F0F2F7]">
              {!preview?.isLocked ? (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(selectedBreakdownEmployee);
                    setSelectedBreakdownEmployee(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#696E82]" />
                  <span>Edit salary</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Link
                  href={`/w/${workspaceSlug}/payroll/calculate?employeeId=${selectedBreakdownEmployee.employeeDbId || selectedBreakdownEmployee.employeeId}`}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#EBF1FF] text-[#1456F0] hover:bg-[#D9E6FF] flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Open in calculator</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedBreakdownEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0F47D1]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#1456F0]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">Studio Salary Settings</h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#696E82]">
              <p>
                Configure the studio-wide salary calculation framework and default rate determination
                rules (ADR-04).
              </p>

              <div className="p-3 bg-[#F8F9FE] border border-[#E2E6F0] rounded-2xl space-y-1.5 text-xs">
                <div className="font-bold text-[#1F1F1F]">Standard Daily Rate Formula</div>
                <p className="text-[11px]">
                  <strong>Fixed 30 Days:</strong> Daily Rate = Base Salary ÷ 30.0 days. This standardizes
                  disbursements regardless of month length.
                </p>
              </div>

              <div className="p-3 bg-white border border-[#E2E6F0] rounded-2xl space-y-2">
                <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1456F0]" />
                  <span>Batch Initialize Studio Salaries</span>
                </div>
                <p className="text-[11px]">
                  Automatically assign standard architecture compensation tiers (Principal ₹85k, Senior ₹55k, Specialist ₹40k, Junior ₹25k) to staff members who do not have compensation configured yet.
                </p>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleBatchSetupSalaries}
                  className="w-full py-2 px-3 rounded-xl bg-[#EBF1FF] text-[#1456F0] font-semibold text-xs hover:bg-[#D9E6FF] transition-colors"
                >
                  {actionLoading ? "Processing..." : "Run Batch Setup"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#F0F2F7]">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0F47D1]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Salary Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                  className="w-full text-xs font-mono font-bold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
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
                  className="w-full text-xs font-medium bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                >
                  <option value="FIXED_30">Fixed 30 Days (Base ÷ 30.0) — Studio Default</option>
                  <option value="CALENDAR_DAYS">Calendar Days (Base ÷ Days in Month)</option>
                  <option value="WORKING_DAYS">Working Days (Base ÷ 26 Working Days)</option>
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
                    className="w-full text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1F1F1F] block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    placeholder="00123456789"
                    className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
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
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#1456F0]"
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
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0F47D1] disabled:opacity-50"
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
