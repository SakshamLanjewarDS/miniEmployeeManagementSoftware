"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  ArrowLeft,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Settings,
  AlertCircle,
  Info,
  Save,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { PayrollSubNav } from "@/components/payroll/PayrollSubNav";

// ==========================================
// Types
// ==========================================

type RateMode = "FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS";

interface EmployeeOption {
  id: string;
  employeeId: string;
  fullName: string;
  designation?: string | null;
  department?: string | null;
  hasCompensation?: boolean;
}

interface LeaveRecordItem {
  id: string;
  startDate: string;
  endDate: string;
  displayDate: string;
  duration: string;
  durationDays?: number;
  durationHours?: number;
  treatment: "Paid" | "Unpaid" | "Mixed";
  paidPortion: number;
  unpaidPortion: number;
  isHourly: boolean;
  status: string;
  leaveType: string;
  reason?: string | null;
}

// Illustrative reference data (shown in demonstration mode)
const SAMPLE_EMPLOYEE: EmployeeOption = {
  id: "sample-emp-014",
  employeeId: "EMP-014",
  fullName: "Aarav Sharma",
  designation: "Interior Designer",
  department: "Design Studio",
  hasCompensation: true,
};

const SAMPLE_LEAVE_RECORDS: LeaveRecordItem[] = [
  {
    id: "sample-lr-1",
    startDate: "2026-10-03",
    endDate: "2026-10-03",
    displayDate: "03 Oct 2026",
    duration: "1 day",
    durationDays: 1,
    treatment: "Paid",
    paidPortion: 1,
    unpaidPortion: 0,
    isHourly: false,
    status: "APPROVED",
    leaveType: "CASUAL",
    reason: "Personal commitment",
  },
  {
    id: "sample-lr-2",
    startDate: "2026-10-07",
    endDate: "2026-10-07",
    displayDate: "07 Oct 2026",
    duration: "1 day",
    durationDays: 1,
    treatment: "Paid",
    paidPortion: 1,
    unpaidPortion: 0,
    isHourly: false,
    status: "APPROVED",
    leaveType: "CASUAL",
    reason: "Family function",
  },
  {
    id: "sample-lr-3",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    displayDate: "12 – 14 Oct 2026",
    duration: "2.5 days",
    durationDays: 2.5,
    treatment: "Unpaid",
    paidPortion: 0,
    unpaidPortion: 2.5,
    isHourly: false,
    status: "APPROVED",
    leaveType: "CASUAL",
    reason: "Outstation travel",
  },
  {
    id: "sample-lr-4",
    startDate: "2026-10-16",
    endDate: "2026-10-16",
    displayDate: "16 Oct 2026",
    duration: "2 hrs",
    durationHours: 2,
    treatment: "Unpaid",
    paidPortion: 0,
    unpaidPortion: 2,
    isHourly: true,
    status: "APPROVED",
    leaveType: "LOSS_OF_PAY",
    reason: "Doctor appointment",
  },
];

export default function SalaryCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  // Mode: Demo Mode vs Real Employee Data Mode
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Period state
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(10); // October

  // Employee dropdown state
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("sample-emp-014");
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState<boolean>(false);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  // Left Panel Inputs
  const [baseSalary, setBaseSalary] = useState<number>(55000);
  const [rateMode, setRateMode] = useState<RateMode>("FIXED_30");
  const [workingDays, setWorkingDays] = useState<number>(26);
  const [workdayHours, setWorkdayHours] = useState<number>(8);

  // Adjustments
  const [allowances, setAllowances] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [advanceRecovery, setAdvanceRecovery] = useState<number>(0);
  const [loanRecovery, setLoanRecovery] = useState<number>(0);
  const [statutoryDeductions, setStatutoryDeductions] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Leave Analysis Data
  const [approvedLeaveDays, setApprovedLeaveDays] = useState<number>(4.5);
  const [paidAppliedDays, setPaidAppliedDays] = useState<number>(2.0);
  const [unpaidDays, setUnpaidDays] = useState<number>(2.5);
  const [unpaidHours, setUnpaidHours] = useState<number>(2.0);
  const [pendingExcludedCount, setPendingExcludedCount] = useState<number>(1);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecordItem[]>(SAMPLE_LEAVE_RECORDS);
  const [leaveRecordsPage, setLeaveRecordsPage] = useState<number>(1);

  // Status & Saved State
  const [statusBadgeText, setStatusBadgeText] = useState<string>("Draft estimate");
  const [isPeriodLocked, setIsPeriodLocked] = useState<boolean>(false);
  const [hasCompensation, setHasCompensation] = useState<boolean>(true);

  // Server Communication State
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Modals
  const [leaveModalOpen, setLeaveModalOpen] = useState<boolean>(false);
  const [calculationDetailsOpen, setCalculationDetailsOpen] = useState<boolean>(false);

  // Race condition guard
  const activeRequestId = useRef<number>(0);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch staff list on mount
  useEffect(() => {
    async function loadStaff() {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/employees?workspaceSlug=${workspaceSlug}&limit=100`);
        const data = await res.json();
        if (res.ok && data.employees) {
          const mapped: EmployeeOption[] = data.employees.map((e: any) => ({
            id: e.id,
            employeeId: e.employeeId,
            fullName: e.fullName || e.name || "Employee",
            designation: e.designation || "Staff",
            department: e.department || "Studio",
            hasCompensation: true,
          }));
          setEmployees(mapped);
        }
      } catch (err) {
        console.error("Failed to load employee list", err);
      } finally {
        setLoadingEmployees(false);
      }
    }
    loadStaff();
  }, [workspaceSlug]);

  // Load real employee data when an employee or period changes
  const fetchEmployeeData = async (empId: string, yr: number, mo: number) => {
    if (isDemoMode && empId === "sample-emp-014") {
      // Keep sample numbers
      setBaseSalary(55000);
      setRateMode("FIXED_30");
      setApprovedLeaveDays(4.5);
      setPaidAppliedDays(2.0);
      setUnpaidDays(2.5);
      setUnpaidHours(2.0);
      setPendingExcludedCount(1);
      setLeaveRecords(SAMPLE_LEAVE_RECORDS);
      setAllowances(0);
      setBonus(0);
      setAdvanceRecovery(0);
      setLoanRecovery(0);
      setStatutoryDeductions(0);
      setOtherDeductions(0);
      setStatusBadgeText("Draft estimate");
      setHasCompensation(true);
      setFetchError(null);
      return;
    }

    const currentReq = ++activeRequestId.current;
    setIsLoadingData(true);
    setFetchError(null);

    try {
      const q = new URLSearchParams({
        workspaceSlug,
        employeeId: empId,
        year: yr.toString(),
        month: mo.toString(),
      });

      const res = await fetch(`/api/payroll/calculate?${q.toString()}`);
      const data = await res.json();

      // Guard against out-of-order race responses
      if (currentReq !== activeRequestId.current) return;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load employee salary & leave data.");
      }

      setHasCompensation(data.employee?.hasCompensation ?? false);
      if (data.employee?.hasCompensation && data.inputs?.baseSalary) {
        setBaseSalary(data.inputs.baseSalary);
        setRateMode(data.inputs.rateCalculationMode || "FIXED_30");
      }

      setWorkdayHours(data.policy?.workdayHours || 8);
      setApprovedLeaveDays(data.leaveAnalysis?.approvedLeaveDays || 0);
      setPaidAppliedDays(data.leaveAnalysis?.paidAppliedDays || 0);
      setUnpaidDays(data.leaveAnalysis?.unpaidDays || 0);
      setUnpaidHours(data.leaveAnalysis?.unpaidHours || 0);
      setPendingExcludedCount(data.leaveAnalysis?.pendingCount || 0);
      setLeaveRecords(data.leaveAnalysis?.leaveRecords || []);

      setAdvanceRecovery(data.inputs?.advanceRecovery || 0);
      setLoanRecovery(data.inputs?.loanRecovery || 0);
      setStatutoryDeductions(data.inputs?.statutoryDeductions || 0);
      setOtherDeductions(data.inputs?.customDeductions || 0);

      setStatusBadgeText(data.draftStatus?.badgeText || "Draft estimate");
      setIsPeriodLocked(data.draftStatus?.isLocked || false);
    } catch (err: any) {
      if (currentReq === activeRequestId.current) {
        setFetchError(err.message || "Failed to load data.");
      }
    } finally {
      if (currentReq === activeRequestId.current) {
        setIsLoadingData(false);
      }
    }
  };

  // Trigger data load when employee or period changes
  useEffect(() => {
    if (!isDemoMode && selectedEmployeeId) {
      fetchEmployeeData(selectedEmployeeId, year, month);
    }
  }, [selectedEmployeeId, year, month, isDemoMode]);

  // Selected employee metadata
  const currentEmployee = useMemo(() => {
    if (isDemoMode && selectedEmployeeId === "sample-emp-014") {
      return SAMPLE_EMPLOYEE;
    }
    return (
      employees.find((e) => e.id === selectedEmployeeId || e.employeeId === selectedEmployeeId) || {
        id: selectedEmployeeId || "unknown",
        employeeId: selectedEmployeeId ? "EMP-???" : "None",
        fullName: selectedEmployeeId ? "Selected Employee" : "Select an employee",
        designation: "Studio Staff",
        department: "General",
        hasCompensation: true,
      }
    );
  }, [isDemoMode, selectedEmployeeId, employees]);

  // Filtered staff list for search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        (e.designation && e.designation.toLowerCase().includes(q))
    );
  }, [employees, employeeSearch]);

  // ==========================================
  // AUTHORITATIVE CALCULATION ENGINE
  // ==========================================
  const calculation = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let divisor = 30;
    if (rateMode === "CALENDAR_DAYS") divisor = daysInMonth;
    else if (rateMode === "WORKING_DAYS") divisor = Math.max(1, workingDays);

    const safeBaseSalary = Math.max(0, baseSalary || 0);
    const exactDailyRate = safeBaseSalary > 0 && divisor > 0 ? safeBaseSalary / divisor : 0;
    const exactHourlyRate = exactDailyRate > 0 && workdayHours > 0 ? exactDailyRate / workdayHours : 0;

    const displayedDailyRate = Math.round(exactDailyRate * 100) / 100;
    const displayedHourlyRate = Math.round(exactHourlyRate * 100) / 100;

    const exactDayDeduction = unpaidDays * exactDailyRate;
    const exactHourDeduction = unpaidHours * exactHourlyRate;
    const exactAggregateLeaveDeduction = exactDayDeduction + exactHourDeduction;

    const displayedDayDeduction = Math.round(exactDayDeduction * 100) / 100;
    const displayedHourDeduction = Math.round(exactHourDeduction * 100) / 100;
    const displayedAggregateLeaveDeduction = Math.round(exactAggregateLeaveDeduction * 100) / 100;

    // Component sum vs aggregate reconciliation
    const componentsSum = Math.round((displayedDayDeduction + displayedHourDeduction) * 100) / 100;
    const roundingAdjustment = Math.round((displayedAggregateLeaveDeduction - componentsSum) * 100) / 100;

    const grossEarnings = safeBaseSalary + (allowances || 0) + (bonus || 0);
    const otherDeductionsTotal =
      (advanceRecovery || 0) + (loanRecovery || 0) + (statutoryDeductions || 0) + (otherDeductions || 0);
    const totalDeductions = displayedAggregateLeaveDeduction + otherDeductionsTotal;

    const netPayable = Math.max(0, grossEarnings - totalDeductions);
    const excessLiability = Math.max(0, totalDeductions - grossEarnings);

    return {
      divisor,
      workdayHours,
      exactDailyRate,
      exactHourlyRate,
      displayedDailyRate,
      displayedHourlyRate,
      exactDayDeduction,
      exactHourDeduction,
      displayedDayDeduction,
      displayedHourDeduction,
      displayedAggregateLeaveDeduction,
      componentsSum,
      roundingAdjustment,
      grossEarnings,
      otherDeductionsTotal,
      totalDeductions,
      netPayable,
      excessLiability,
    };
  }, [
    baseSalary,
    rateMode,
    year,
    month,
    workingDays,
    workdayHours,
    unpaidDays,
    unpaidHours,
    allowances,
    bonus,
    advanceRecovery,
    loanRecovery,
    statutoryDeductions,
    otherDeductions,
  ]);

  // Formatter for Indian Currency
  const formatINR = (val: number, showDecimals: boolean = true) => {
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    });
  };

  // Month Names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentMonthName = monthNames[month - 1] || "October";

  // Visible records in leave table summary (limit to 4 for clean desktop height)
  const visibleLeaveRecords = useMemo(() => {
    const startIdx = (leaveRecordsPage - 1) * 4;
    return leaveRecords.slice(startIdx, startIdx + 4);
  }, [leaveRecords, leaveRecordsPage]);
  const totalLeavePages = Math.max(1, Math.ceil(leaveRecords.length / 4));

  // Reset to original defaults
  const handleReset = () => {
    if (isDemoMode) {
      setBaseSalary(55000);
      setRateMode("FIXED_30");
      setAllowances(0);
      setBonus(0);
      setAdvanceRecovery(0);
      setLoanRecovery(0);
      setStatutoryDeductions(0);
      setOtherDeductions(0);
      setApprovedLeaveDays(4.5);
      setPaidAppliedDays(2.0);
      setUnpaidDays(2.5);
      setUnpaidHours(2.0);
      setPendingExcludedCount(1);
      setLeaveRecords(SAMPLE_LEAVE_RECORDS);
      setStatusBadgeText("Draft estimate");
    } else {
      fetchEmployeeData(selectedEmployeeId, year, month);
    }
  };

  // Save Draft Calculation to Database
  const handleSaveDraft = async () => {
    if (isDemoMode) {
      setSaveSuccessMsg("Demo draft calculation verified. Select a real studio staff member to persist.");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      return;
    }

    if (!selectedEmployeeId) {
      setSaveErrorMsg("Please select an employee before saving the draft.");
      return;
    }

    setSaveLoading(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const res = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          workspaceSlug,
          employeeId: selectedEmployeeId,
          baseSalary,
          rateCalculationMode: rateMode,
          year,
          month,
          configuredWorkingDays: workingDays,
          configuredWorkdayHours: workdayHours,
          approvedUnpaidLopDays: unpaidDays,
          unpaidHours,
          totalApprovedLeaveDays: approvedLeaveDays,
          paidLeaveDays: paidAppliedDays,
          allowances,
          bonus,
          statutoryDeductions,
          advanceRecovery,
          loanRecovery,
          customDeductions: otherDeductions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save draft calculation");
      }

      setStatusBadgeText("Saved draft");
      setSaveSuccessMsg(`Draft calculation successfully saved for ${currentMonthName} ${year}.`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Failed to save draft.");
      setTimeout(() => setSaveErrorMsg(null), 5000);
    } finally {
      setSaveLoading(false);
    }
  };

  // Toggle demo mode
  const handleToggleDemoMode = () => {
    if (!isDemoMode) {
      setIsDemoMode(true);
      setSelectedEmployeeId("sample-emp-014");
      setYear(2026);
      setMonth(10);
      setBaseSalary(55000);
      setRateMode("FIXED_30");
      setAllowances(0);
      setBonus(0);
      setAdvanceRecovery(0);
      setLoanRecovery(0);
      setStatutoryDeductions(0);
      setOtherDeductions(0);
      setApprovedLeaveDays(4.5);
      setPaidAppliedDays(2.0);
      setUnpaidDays(2.5);
      setUnpaidHours(2.0);
      setPendingExcludedCount(1);
      setLeaveRecords(SAMPLE_LEAVE_RECORDS);
      setStatusBadgeText("Draft estimate");
      setHasCompensation(true);
      setFetchError(null);
    } else {
      setIsDemoMode(false);
      if (employees.length > 0) {
        setSelectedEmployeeId(employees[0].id);
      }
    }
  };

  return (
    <div className="-m-3.5 sm:-m-5 md:-m-6 lg:-m-8 p-3.5 sm:p-5 md:p-6 lg:p-8 min-h-[calc(100vh-64px)] bg-[#F2F4FB] text-[#111827] flex flex-col justify-between">
      <div className="max-w-[1560px] mx-auto w-full space-y-4">
        {/* Local Payroll Sub-Navigation */}
        <PayrollSubNav workspaceSlug={workspaceSlug} activeTab="calculate" />

        {/* ==========================================
            1. BREADCRUMB & PAGE HEADER
        ========================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1.5">
              <Link
                href={`/w/${workspaceSlug}/payroll`}
                className="flex items-center gap-1 hover:text-[#2435A0] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Studio Payroll</span>
              </Link>
              <span>/</span>
              <span className="font-medium text-[#111827]">Calculator</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-center text-[#2563EB] shadow-2xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#111827]">
                    Salary & leave calculator
                  </h1>
                  <button
                    onClick={handleToggleDemoMode}
                    title="Click to toggle between illustrative Sample Data and Live Studio Data"
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                      isDemoMode
                        ? "bg-blue-50 text-[#2563EB] border-blue-200 hover:bg-blue-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {isDemoMode ? "Sample data" : "Live studio data"}
                  </button>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Calculate salary with integrated leave data and see exactly how pay is calculated.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/w/${workspaceSlug}/payroll`}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#111827] hover:bg-[#F8F9FE] shadow-2xs transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to payroll</span>
            </Link>
          </div>
        </div>

        {/* Global Alert notifications */}
        {fetchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchEmployeeData(selectedEmployeeId, year, month)}
              className="text-xs font-semibold underline hover:text-rose-950"
            >
              Retry
            </button>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* ==========================================
            2. FULL-WIDTH CONTEXT BAR
        ========================================== */}
        <div className="bg-white rounded-2xl border border-[#E2E6F0] p-3 md:px-5 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Employee Selector */}
            <div className="md:col-span-6 relative" ref={employeeDropdownRef}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block leading-none mb-1">
                    Employee
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                    className="w-full flex items-center justify-between text-left hover:text-[#2435A0] transition-colors focus:outline-none"
                  >
                    <div className="truncate">
                      <span className="text-xs md:text-sm font-bold text-[#111827] truncate block">
                        {currentEmployee.fullName} · {currentEmployee.employeeId}
                      </span>
                      <span className="text-[11px] text-[#64748B] truncate block">
                        {currentEmployee.designation || "Studio Staff"}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#64748B] ml-2 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Dropdown Menu */}
              {employeeDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-full md:w-96 bg-white rounded-2xl border border-[#E2E6F0] shadow-xl z-50 p-2 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Search name or ID..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl focus:outline-none focus:border-[#2435A0]"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {/* Demo Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDemoMode(true);
                        setSelectedEmployeeId("sample-emp-014");
                        setEmployeeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                        isDemoMode && selectedEmployeeId === "sample-emp-014"
                          ? "bg-blue-50 text-[#2563EB] font-semibold"
                          : "hover:bg-[#F8F9FE] text-[#111827]"
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Aarav Sharma · EMP-014</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Sample</span>
                      </div>
                      <div className="text-[11px] text-[#64748B]">Interior Designer</div>
                    </button>

                    <div className="border-t border-[#F0F2F7] my-1" />

                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setIsDemoMode(false);
                          setSelectedEmployeeId(emp.id);
                          setEmployeeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                          !isDemoMode && selectedEmployeeId === emp.id
                            ? "bg-blue-50 text-[#2563EB] font-semibold"
                            : "hover:bg-[#F8F9FE] text-[#111827]"
                        }`}
                      >
                        <div className="font-bold">{emp.fullName} · {emp.employeeId}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {emp.designation || "Studio Staff"} • {emp.department || "General"}
                        </div>
                      </button>
                    ))}

                    {filteredEmployees.length === 0 && (
                      <div className="p-3 text-center text-xs text-[#64748B]">
                        No studio staff match your search.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pay Period Selector */}
            <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-[#F0F2F7] pt-2 md:pt-0 md:pl-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block leading-none mb-1">
                    Pay period
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={`${year}-${month}`}
                      onChange={(e) => {
                        const [y, m] = e.target.value.split("-").map(Number);
                        setYear(y);
                        setMonth(m);
                      }}
                      className="text-xs md:text-sm font-bold text-[#111827] bg-transparent hover:text-[#2435A0] focus:outline-none cursor-pointer"
                    >
                      {[
                        { y: 2026, m: 10, label: "October 2026" },
                        { y: 2026, m: 9, label: "September 2026" },
                        { y: 2026, m: 8, label: "August 2026" },
                        { y: 2026, m: 11, label: "November 2026" },
                        { y: 2026, m: 12, label: "December 2026" },
                        { y: 2025, m: 10, label: "October 2025" },
                      ].map((item) => (
                        <option key={`${item.y}-${item.m}`} value={`${item.y}-${item.m}`}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-[#F0F2F7] pt-2 md:pt-0 md:pl-4 flex items-center justify-between md:justify-end gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block leading-none mb-1">
                    Status
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg border inline-block ${
                      statusBadgeText === "Saved draft"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : statusBadgeText === "Locked"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-blue-50 text-[#2563EB] border-blue-200/80"
                    }`}
                  >
                    {statusBadgeText}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            3. THREE PANELS (DESKTOP GRID)
        ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 items-start">
          {/* ------------------------------------------
              LEFT PANEL: SALARY INPUTS
          ------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 md:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#111827]">Salary inputs</h2>
              </div>
              <Link
                href={`/w/${workspaceSlug}/payroll`}
                className="text-xs font-medium text-[#2563EB] hover:text-[#1E2C87] flex items-center gap-1 transition-colors"
              >
                <span>Payroll settings</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Missing Salary State Warning */}
            {!isDemoMode && !hasCompensation && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Compensation unconfigured</strong>
                  <span>No base salary record found for this period. Enter a simulated base salary below or save to staff records.</span>
                </div>
              </div>
            )}

            {/* SECTION 01: Base & calculation method */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">
                  01
                </span>
                <span className="text-xs font-bold text-[#111827]">Base & calculation method</span>
              </div>

              {/* Monthly Base Salary Input */}
              <div>
                <label className="text-xs text-[#64748B] block mb-1">
                  Monthly base salary (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={baseSalary || ""}
                  onChange={(e) => setBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="55,000"
                  className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                />
              </div>

              {/* Daily Rate Method (Segmented / Radio Options) */}
              <div>
                <label className="text-xs text-[#64748B] block mb-1.5">
                  Daily rate method
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F8F9FE] p-1 rounded-xl border border-[#E2E6F0]">
                  <button
                    type="button"
                    onClick={() => setRateMode("FIXED_30")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      rateMode === "FIXED_30"
                        ? "bg-white text-[#2435A0] shadow-2xs border border-[#CEDEFF]"
                        : "text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                        rateMode === "FIXED_30"
                          ? "border-[#2563EB] bg-[#2563EB]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {rateMode === "FIXED_30" && <span className="w-1 h-1 rounded-full bg-white" />}
                    </span>
                    <span className="truncate">Fixed 30 days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRateMode("CALENDAR_DAYS")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      rateMode === "CALENDAR_DAYS"
                        ? "bg-white text-[#2435A0] shadow-2xs border border-[#CEDEFF]"
                        : "text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                        rateMode === "CALENDAR_DAYS"
                          ? "border-[#2563EB] bg-[#2563EB]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {rateMode === "CALENDAR_DAYS" && <span className="w-1 h-1 rounded-full bg-white" />}
                    </span>
                    <span className="truncate">Calendar days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRateMode("WORKING_DAYS")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      rateMode === "WORKING_DAYS"
                        ? "bg-white text-[#2435A0] shadow-2xs border border-[#CEDEFF]"
                        : "text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                        rateMode === "WORKING_DAYS"
                          ? "border-[#2563EB] bg-[#2563EB]"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {rateMode === "WORKING_DAYS" && <span className="w-1 h-1 rounded-full bg-white" />}
                    </span>
                    <span className="truncate">Working days</span>
                  </button>
                </div>

                {/* Divisor & Workday Duration Helper */}
                <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1.5 px-1">
                  <span>
                    Divisor: <strong className="text-[#111827]">{calculation.divisor} days</strong> · Workday:{" "}
                    <strong className="text-[#111827]">{calculation.workdayHours} hours</strong>
                  </span>
                  {rateMode === "WORKING_DAYS" && (
                    <div className="flex items-center gap-1">
                      <span>Days:</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={workingDays}
                        onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 26))}
                        className="w-12 text-center text-xs bg-[#F8F9FE] border border-[#E2E6F0] rounded py-0.5"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 02: Additional earnings */}
            <div className="space-y-3 pt-1 border-t border-[#F0F2F7]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">
                  02
                </span>
                <span className="text-xs font-bold text-[#111827]">Additional earnings</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={allowances || 0}
                    onChange={(e) => setAllowances(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Bonus (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bonus || 0}
                    onChange={(e) => setBonus(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 03: Other deductions */}
            <div className="space-y-3 pt-1 border-t border-[#F0F2F7]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">
                  03
                </span>
                <span className="text-xs font-bold text-[#111827]">Other deductions</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Advance recovery (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advanceRecovery || 0}
                    onChange={(e) => setAdvanceRecovery(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Loan recovery (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={loanRecovery || 0}
                    onChange={(e) => setLoanRecovery(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Statutory deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={statutoryDeductions || 0}
                    onChange={(e) => setStatutoryDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748B] block mb-1">
                    Other deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherDeductions || 0}
                    onChange={(e) => setOtherDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-semibold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#2435A0]"
                  />
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="pt-2 text-[11px] text-[#64748B] flex items-center gap-1.5 border-t border-[#F0F2F7]">
              <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span>Employee data loaded · Adjustments stay in this draft.</span>
            </div>
          </div>

          {/* ------------------------------------------
              CENTER PANEL: EMPLOYEE LEAVE ANALYSIS
          ------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 md:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#111827]">Employee leave analysis</h2>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] text-[#64748B] font-medium hidden sm:inline">
                  {currentMonthName} {year}
                </span>
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(true)}
                  className="text-xs font-medium text-[#2563EB] hover:text-[#1E2C87] flex items-center gap-1 transition-colors"
                >
                  <span>View leave details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 4 Compact Metric Tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Tile 1: Approved leave */}
              <div className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FE] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-1">
                    Approved leave
                  </span>
                  <span className="text-xs md:text-sm font-bold text-[#111827]">
                    {approvedLeaveDays} days
                  </span>
                </div>
              </div>

              {/* Tile 2: Paid applied */}
              <div className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FE] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[#2563EB] shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-1">
                    Paid applied
                  </span>
                  <span className="text-xs md:text-sm font-bold text-[#111827]">
                    {paidAppliedDays} days
                  </span>
                </div>
              </div>

              {/* Tile 3: Unpaid days */}
              <div className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FE] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-1">
                    Unpaid days
                  </span>
                  <span className="text-xs md:text-sm font-bold text-[#111827]">
                    {unpaidDays} days
                  </span>
                </div>
              </div>

              {/* Tile 4: Unpaid hours */}
              <div className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FE] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block font-medium leading-none mb-1">
                    Unpaid hours
                  </span>
                  <span className="text-xs md:text-sm font-bold text-[#111827]">
                    {unpaidHours} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Note if hourly leave exists */}
            {unpaidHours > 0 && (
              <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 px-0.5">
                <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>Hourly leave is separate from the {approvedLeaveDays} days.</span>
              </div>
            )}

            {/* Proportional Paid vs Unpaid Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                {approvedLeaveDays > 0 ? (
                  <>
                    <div
                      style={{
                        width: `${Math.min(100, (paidAppliedDays / approvedLeaveDays) * 100)}%`,
                      }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                    />
                    <div
                      style={{
                        width: `${Math.min(100, (unpaidDays / approvedLeaveDays) * 100)}%`,
                      }}
                      className="bg-[#F87171] h-full transition-all duration-300"
                    />
                  </>
                ) : (
                  <div className="w-full bg-slate-200 h-full" />
                )}
              </div>

              <div className="flex items-center gap-4 text-[11px] font-medium text-[#111827]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Paid {paidAppliedDays} days</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F87171] shrink-0" />
                  <span>Unpaid {unpaidDays} days</span>
                </div>
              </div>
            </div>

            {/* Leave Records Semantic Table */}
            <div className="space-y-2 pt-1 border-t border-[#F0F2F7]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111827]">Leave records</span>
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(true)}
                  className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-0.5"
                >
                  <span>View all leave details</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="border border-[#E2E6F0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FE] border-b border-[#E2E6F0] text-[11px] text-[#64748B]">
                    <tr>
                      <th className="py-1.5 px-3 font-semibold">Date</th>
                      <th className="py-1.5 px-3 font-semibold">Duration</th>
                      <th className="py-1.5 px-3 font-semibold text-right">Treatment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F7]">
                    {visibleLeaveRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#F8F9FE]/60 transition-colors">
                        <td className="py-2 px-3 font-medium text-[#111827] whitespace-nowrap">
                          {rec.displayDate}
                        </td>
                        <td className="py-2 px-3 text-[#64748B] whitespace-nowrap">
                          {rec.duration}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              rec.treatment === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : rec.treatment === "Mixed"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {rec.treatment}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {leaveRecords.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-[11px] text-[#64748B]">
                          No leave records for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status strip under table */}
              <div className="flex items-center justify-between text-[11px]">
                {pendingExcludedCount > 0 ? (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>
                      {pendingExcludedCount} pending request{pendingExcludedCount > 1 ? "s" : ""} excluded
                    </span>
                  </div>
                ) : (
                  <span />
                )}
                <span className="text-[#64748B] text-[10px]">Approved records only</span>
              </div>
            </div>

            {/* How leave affects pay section */}
            <div className="space-y-2 pt-2 border-t border-[#F0F2F7]">
              <span className="text-xs font-bold text-[#111827] block">
                How leave affects pay
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#111827]">
                  <span className="text-[#64748B]">Unpaid days</span>
                  <div className="space-y-0.5 text-right font-mono">
                    <span className="text-xs text-[#64748B] mr-2">
                      {unpaidDays} × ₹{formatINR(calculation.displayedDailyRate)}
                    </span>
                    <strong className="text-[#111827]">
                      ₹{formatINR(calculation.displayedDayDeduction)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#111827]">
                  <span className="text-[#64748B]">Unpaid hours</span>
                  <div className="space-y-0.5 text-right font-mono">
                    <span className="text-xs text-[#64748B] mr-2">
                      {unpaidHours} × ₹{formatINR(calculation.displayedHourlyRate)}
                    </span>
                    <strong className="text-[#111827]">
                      ₹{formatINR(calculation.displayedHourDeduction)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-[#64748B]">
                Day rate ÷ {calculation.workdayHours} = hourly rate. Amounts use full precision.
              </div>

              {/* Pale Coral Total Strip */}
              <div className="p-3 bg-[#FFF1F2] border border-[#FFE4E6] rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-[#BE123C]">Total leave deduction</span>
                <span className="text-base font-extrabold font-mono text-[#BE123C]">
                  ₹{formatINR(calculation.displayedAggregateLeaveDeduction)}
                </span>
              </div>

              {/* Rounding reconciliation note (only shown if nonzero) */}
              {Math.abs(calculation.roundingAdjustment) > 0 && (
                <div className="text-[10px] text-[#64748B]">
                  ₹{formatINR(Math.abs(calculation.roundingAdjustment))} rounding adjustment included.
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------
              RIGHT PANEL: SALARY CALCULATION
          ------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 md:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#111827]">Salary calculation</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live estimate</span>
              </div>
            </div>

            {/* Top Compact Rate Strip */}
            <div className="bg-[#EEF4FF] border border-[#CEDEFF] rounded-xl p-3 grid grid-cols-2 divide-x divide-[#CEDEFF] text-center">
              <div className="pr-2">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider mb-0.5">
                  Daily rate
                </span>
                <span className="text-base md:text-lg font-bold font-mono text-[#182B6B]">
                  ₹{formatINR(calculation.displayedDailyRate)}
                </span>
              </div>
              <div className="pl-2">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider mb-0.5">
                  Hourly rate
                </span>
                <span className="text-base md:text-lg font-bold font-mono text-[#182B6B]">
                  ₹{formatINR(calculation.displayedHourlyRate)}
                </span>
              </div>
            </div>

            {/* Accounting-style Ledger */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#111827]">
                <span className="text-[#64748B]">Base salary</span>
                <span className="font-mono font-semibold">₹{formatINR(baseSalary)}</span>
              </div>

              <div className="flex justify-between items-center text-[#111827]">
                <span className="text-[#64748B]">Allowances</span>
                <span className="font-mono font-semibold">₹{formatINR(allowances || 0)}</span>
              </div>

              <div className="flex justify-between items-center text-[#111827]">
                <span className="text-[#64748B]">Bonus</span>
                <span className="font-mono font-semibold">₹{formatINR(bonus || 0)}</span>
              </div>

              {/* Gross Earnings */}
              <div className="flex justify-between items-center pt-2 border-t border-[#F0F2F7] font-bold text-sm text-[#111827]">
                <span>Gross earnings</span>
                <span className="font-mono">₹{formatINR(calculation.grossEarnings)}</span>
              </div>

              {/* Deductions */}
              <div className="flex justify-between items-center pt-2 text-[#111827]">
                <span className="text-[#64748B]">Leave deduction</span>
                <span className="font-mono font-semibold text-rose-600">
                  {calculation.displayedAggregateLeaveDeduction > 0
                    ? `-₹${formatINR(calculation.displayedAggregateLeaveDeduction)}`
                    : "₹0.00"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#111827]">
                <span className="text-[#64748B]">Other deductions</span>
                <span className="font-mono font-semibold">
                  ₹{formatINR(calculation.otherDeductionsTotal)}
                </span>
              </div>

              {/* Total Deductions */}
              <div className="flex justify-between items-center pt-2 border-t border-[#F0F2F7] font-bold text-sm text-[#111827]">
                <span>Total deductions</span>
                <span className="font-mono">₹{formatINR(calculation.totalDeductions)}</span>
              </div>
            </div>

            {/* Prominent Hero Indigo Net-Pay Panel */}
            <div className="bg-[#182878] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

              <span className="text-[11px] font-bold tracking-wider text-blue-200 uppercase block mb-1">
                NET PAYABLE
              </span>
              <div className="text-3xl md:text-4xl font-extrabold font-mono tracking-tight text-white mb-1">
                ₹{formatINR(calculation.netPayable)}
              </div>
              <span className="text-xs text-blue-200 block font-normal">
                Gross earnings − total deductions
              </span>

              {calculation.excessLiability > 0 && (
                <div className="mt-3 p-2 bg-amber-500/20 border border-amber-300/30 rounded-lg text-xs text-amber-200">
                  Excess liability ₹{formatINR(calculation.excessLiability)} preserved for future periods.
                </div>
              )}
            </div>

            {/* Below Indigo Card Controls */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Estimate only · Not paid</span>
              </span>
              <button
                type="button"
                onClick={() => setCalculationDetailsOpen(true)}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1E2C87] flex items-center gap-1 transition-colors"
              >
                <span>View calculation details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          4. FOOTER & ACTIONS
      ========================================== */}
      <div className="max-w-[1560px] mx-auto w-full mt-6 pt-4 border-t border-[#E2E6F0] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            {isDemoMode
              ? "Sample data · Payroll has not been updated."
              : "Draft calculation · Payroll has not been updated."}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#111827] hover:bg-[#F8F9FE] shadow-2xs transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveLoading}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#2435A0] hover:bg-[#1E2C87] text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveLoading ? "Saving draft..." : "Save draft calculation"}</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          5. LEAVE DETAILS MODAL
      ========================================== */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Detailed Leave Breakdown — {currentMonthName} {year}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#F8F9FE] flex items-center justify-center text-[#64748B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-[#64748B] block">Employee</span>
                  <strong>{currentEmployee.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block">Approved Leave</span>
                  <strong>{approvedLeaveDays} days</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block">Paid Entitlement</span>
                  <strong>{paidAppliedDays} days</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block">Loss of Pay</span>
                  <strong>{unpaidDays} days + {unpaidHours} hrs</strong>
                </div>
              </div>

              <div className="border border-[#E2E6F0] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FE] border-b border-[#E2E6F0] text-[11px] text-[#64748B]">
                    <tr>
                      <th className="py-2 px-3">Date Range</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Type & Reason</th>
                      <th className="py-2 px-3 text-right">Payroll Treatment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F7]">
                    {leaveRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8F9FE]/60">
                        <td className="py-2.5 px-3 font-semibold text-[#111827]">
                          {r.displayDate}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748B]">{r.duration}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-[#111827]">{r.leaveType}</span>
                          {r.reason && (
                            <span className="text-[11px] text-[#64748B] block truncate max-w-xs">
                              {r.reason}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              r.treatment === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.treatment === "Mixed"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {r.treatment}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaveRecords.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-xs text-[#64748B]">
                          No leave records for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2435A0] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          6. CALCULATION DETAILS AUDIT MODAL
      ========================================== */}
      {calculationDetailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Authoritative Calculation Ledger & Equations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCalculationDetailsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#F8F9FE] flex items-center justify-center text-[#64748B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Daily Rate Equation */}
              <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] space-y-1">
                <div className="flex justify-between font-semibold text-[#64748B] text-[11px]">
                  <span>DAILY RATE</span>
                  <span className="font-mono text-[#182B6B]">
                    ₹{formatINR(calculation.displayedDailyRate)}
                  </span>
                </div>
                <div className="font-mono text-[#111827]">
                  Base Salary (₹{formatINR(baseSalary, false)}) ÷ Divisor ({calculation.divisor} days) = ₹
                  {calculation.exactDailyRate.toFixed(4)}
                </div>
              </div>

              {/* Hourly Rate Equation */}
              <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] space-y-1">
                <div className="flex justify-between font-semibold text-[#64748B] text-[11px]">
                  <span>HOURLY RATE</span>
                  <span className="font-mono text-[#182B6B]">
                    ₹{formatINR(calculation.displayedHourlyRate)}
                  </span>
                </div>
                <div className="font-mono text-[#111827]">
                  Daily Rate (₹{calculation.exactDailyRate.toFixed(4)}) ÷ Workday Hours ({calculation.workdayHours} hrs) = ₹
                  {calculation.exactHourlyRate.toFixed(4)}
                </div>
              </div>

              {/* Leave Deductions Math */}
              <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0] space-y-2">
                <div className="font-semibold text-[#64748B] text-[11px]">LEAVE LOSS OF PAY (LOP) DEDUCTIONS</div>
                <div className="font-mono text-[#111827] space-y-1">
                  <div>
                    Day LOP: {unpaidDays} days × ₹{calculation.exactDailyRate.toFixed(4)} = ₹
                    {formatINR(calculation.displayedDayDeduction)}
                  </div>
                  <div>
                    Hour LOP: {unpaidHours} hrs × ₹{calculation.exactHourlyRate.toFixed(4)} = ₹
                    {formatINR(calculation.displayedHourDeduction)}
                  </div>
                  <div className="pt-1 border-t border-[#E2E6F0] flex justify-between font-bold">
                    <span>Aggregate Leave Deduction:</span>
                    <span className="text-rose-600">
                      ₹{formatINR(calculation.displayedAggregateLeaveDeduction)}
                    </span>
                  </div>
                  {Math.abs(calculation.roundingAdjustment) > 0 && (
                    <div className="text-[11px] text-[#64748B] font-sans">
                      * Includes ₹{formatINR(Math.abs(calculation.roundingAdjustment))} aggregate rounding reconciliation.
                    </div>
                  )}
                </div>
              </div>

              {/* Net Payable Ledger */}
              <div className="p-3 bg-[#182878] rounded-xl text-white space-y-1.5 font-mono">
                <div className="flex justify-between text-blue-200 text-[11px]">
                  <span>Gross Earnings:</span>
                  <span>₹{formatINR(calculation.grossEarnings)}</span>
                </div>
                <div className="flex justify-between text-rose-300 text-[11px]">
                  <span>Leave Deductions:</span>
                  <span>-₹{formatINR(calculation.displayedAggregateLeaveDeduction)}</span>
                </div>
                <div className="flex justify-between text-blue-200 text-[11px]">
                  <span>Other Deductions:</span>
                  <span>-₹{formatINR(calculation.otherDeductionsTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-white/20 text-white">
                  <span>NET PAYABLE:</span>
                  <span>₹{formatINR(calculation.netPayable)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCalculationDetailsOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2435A0] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
