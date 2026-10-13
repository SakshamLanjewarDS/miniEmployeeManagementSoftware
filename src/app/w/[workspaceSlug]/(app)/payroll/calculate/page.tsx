"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  ArrowLeft,
  DollarSign,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  User,
  Save,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

export default function SalaryCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  // Employees list for selection
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Calculation parameters
  const [baseSalary, setBaseSalary] = useState<number>(55000);
  const [rateMode, setRateMode] = useState<"FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS">("FIXED_30");
  const [workingDays, setWorkingDays] = useState<number>(26);
  const [unpaidLopDays, setUnpaidLopDays] = useState<number>(2.0);
  const [allowances, setAllowances] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [statutoryDeductions, setStatutoryDeductions] = useState<number>(0);
  const [advanceRecovery, setAdvanceRecovery] = useState<number>(0);
  const [loanRecovery, setLoanRecovery] = useState<number>(0);
  const [customDeductions, setCustomDeductions] = useState<number>(0);

  // Calculation API results
  const [calcData, setCalcData] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Fetch staff list on mount
  useEffect(() => {
    async function loadEmployees() {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/payroll/compensation?workspaceSlug=${workspaceSlug}`);
        const data = await res.json();
        if (data.compensations) {
          setEmployees(data.compensations.map((c: any) => c.employee));
        }
      } catch (err) {
        console.error("Failed to load staff list", err);
      } finally {
        setLoadingEmployees(false);
      }
    }
    loadEmployees();
  }, [workspaceSlug]);

  // Recalculate whenever inputs change
  useEffect(() => {
    async function runCalculation() {
      setIsCalculating(true);
      try {
        const query = new URLSearchParams({
          workspaceSlug,
          baseSalary: baseSalary.toString(),
          mode: rateMode,
          year: year.toString(),
          month: month.toString(),
          workingDays: workingDays.toString(),
          unpaidLopDays: unpaidLopDays.toString(),
          allowances: allowances.toString(),
          bonus: bonus.toString(),
          statutoryDeductions: statutoryDeductions.toString(),
          advanceRecovery: advanceRecovery.toString(),
          loanRecovery: loanRecovery.toString(),
          customDeductions: customDeductions.toString(),
        });

        if (selectedEmployeeId) {
          query.set("employeeId", selectedEmployeeId);
        }

        const res = await fetch(`/api/payroll/calculate?${query.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setCalcData(data);
        }
      } catch (err) {
        console.error("Calculation request failed", err);
      } finally {
        setIsCalculating(false);
      }
    }

    const timer = setTimeout(runCalculation, 150);
    return () => clearTimeout(timer);
  }, [
    workspaceSlug,
    selectedEmployeeId,
    baseSalary,
    rateMode,
    year,
    month,
    workingDays,
    unpaidLopDays,
    allowances,
    bonus,
    statutoryDeductions,
    advanceRecovery,
    loanRecovery,
    customDeductions,
  ]);

  // When an employee is selected, automatically fill in their data
  const handleSelectEmployee = async (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;

    try {
      const q = new URLSearchParams({
        workspaceSlug,
        employeeId: empId,
        year: year.toString(),
        month: month.toString(),
      });
      const res = await fetch(`/api/payroll/calculate?${q.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBaseSalary(data.inputs.baseSalary);
        setRateMode(data.inputs.rateCalculationMode);
        setUnpaidLopDays(data.inputs.approvedUnpaidLopDays);
        setAdvanceRecovery(data.inputs.advanceRecovery);
        setLoanRecovery(data.inputs.loanRecovery);
      }
    } catch (err) {
      console.error("Failed to load employee details", err);
    }
  };

  const handleApplyToStaff = async () => {
    if (!selectedEmployeeId) {
      alert("Please select a studio staff member to save this compensation configuration.");
      return;
    }

    setSaveLoading(true);
    setSaveSuccess(null);
    try {
      const res = await fetch("/api/payroll/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          employeeId: selectedEmployeeId,
          baseMonthlySalary: baseSalary,
          rateCalculationMode: rateMode,
          notes: `Updated via Project 2 Salary Calculator (${rateMode} mode)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update compensation");

      setSaveSuccess("Staff member compensation and rate calculation mode updated successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <Link
              href={`/w/${workspaceSlug}/payroll`}
              className="flex items-center gap-1 hover:text-[#5A81FA] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Studio Payroll</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Project 2 Salary Calculator & Engine</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] border border-[#CEDEFF] flex items-center justify-center text-[#5A81FA]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">
                Project 2 Salary Calculation Engine
              </h1>
              <p className="text-xs text-[#696E82] mt-0.5">
                Multi-Mode Daily Rate (Fixed 30 • Calendar Days • Working Days) & Loss of Pay (LOP) Simulator
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/w/${workspaceSlug}/payroll`}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
          >
            Back to Monthly Payroll
          </Link>
          {selectedEmployeeId && (
            <button
              onClick={handleApplyToStaff}
              disabled={saveLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#5A81FA] text-white hover:bg-[#4870EB] shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveLoading ? "Saving..." : "Save to Staff Record"}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Main Grid: Inputs on Left, Results & Formulas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Simulator Parameters */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick Select Employee Card */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">Load Studio Staff Member</h3>
              </div>
              <span className="text-[11px] text-[#696E82]">Optional</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F1F1F] block mb-1.5">
                Select Employee (or simulate custom values)
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full text-xs font-medium bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]/20 focus:border-[#5A81FA]"
              >
                <option value="">-- Custom Simulation (Enter values below) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.membership?.user?.fullName} ({emp.department || "Studio"})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Period */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-medium bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-medium bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>
            </div>
          </div>

          {/* Base Compensation & Mode Card */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">Base Salary & Mode (ADR-04)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Rule ADR-04
              </span>
            </div>

            {/* Base Salary Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1F1F1F]">Monthly Base Salary (₹)</label>
                <span className="text-xs font-mono font-bold text-[#2C308D]">
                  ₹{baseSalary.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs font-mono font-bold bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
              />

              {/* Standard Studio Tiers Quick Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: "Junior ₹25k", val: 25000 },
                  { label: "Specialist ₹40k", val: 40000 },
                  { label: "Senior ₹55k", val: 55000 },
                  { label: "Principal ₹85k", val: 85000 },
                ].map((tier) => (
                  <button
                    key={tier.label}
                    type="button"
                    onClick={() => setBaseSalary(tier.val)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                      baseSalary === tier.val
                        ? "bg-[#2C308D] text-white border-[#2C308D]"
                        : "bg-[#F8F9FE] text-[#696E82] border-[#E2E6F0] hover:bg-white"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate Calculation Mode Radio Buttons */}
            <div>
              <label className="text-xs font-semibold text-[#1F1F1F] block mb-2">
                Daily Rate Calculation Mode
              </label>
              <div className="space-y-2">
                {/* Fixed 30 */}
                <label
                  onClick={() => setRateMode("FIXED_30")}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    rateMode === "FIXED_30"
                      ? "bg-[#F2F4FF] border-[#5A81FA] text-[#1F1F1F]"
                      : "bg-[#F8F9FE] border-[#E2E6F0] text-[#696E82] hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="rateMode"
                    checked={rateMode === "FIXED_30"}
                    onChange={() => setRateMode("FIXED_30")}
                    className="mt-1 accent-[#5A81FA]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                      <span>Fixed 30 Days</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                        Studio Default
                      </span>
                    </div>
                    <div className="text-[11px] text-[#696E82] mt-0.5">
                      Daily Rate = <code className="font-mono text-[#2C308D]">Base Salary / 30.0</code>
                    </div>
                  </div>
                </label>

                {/* Calendar Days */}
                <label
                  onClick={() => setRateMode("CALENDAR_DAYS")}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    rateMode === "CALENDAR_DAYS"
                      ? "bg-[#F2F4FF] border-[#5A81FA] text-[#1F1F1F]"
                      : "bg-[#F8F9FE] border-[#E2E6F0] text-[#696E82] hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="rateMode"
                    checked={rateMode === "CALENDAR_DAYS"}
                    onChange={() => setRateMode("CALENDAR_DAYS")}
                    className="mt-1 accent-[#5A81FA]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1F1F1F]">
                      Calendar Days in Month ({calcData?.inputs?.daysInMonth || 30} Days)
                    </div>
                    <div className="text-[11px] text-[#696E82] mt-0.5">
                      Daily Rate = <code className="font-mono text-[#2C308D]">Base Salary / Days in Month</code>
                    </div>
                  </div>
                </label>

                {/* Working Days */}
                <label
                  onClick={() => setRateMode("WORKING_DAYS")}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    rateMode === "WORKING_DAYS"
                      ? "bg-[#F2F4FF] border-[#5A81FA] text-[#1F1F1F]"
                      : "bg-[#F8F9FE] border-[#E2E6F0] text-[#696E82] hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="rateMode"
                    checked={rateMode === "WORKING_DAYS"}
                    onChange={() => setRateMode("WORKING_DAYS")}
                    className="mt-1 accent-[#5A81FA]"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#1F1F1F]">
                      Working Days Denominator
                    </div>
                    <div className="text-[11px] text-[#696E82] mt-0.5">
                      Daily Rate = <code className="font-mono text-[#2C308D]">Base Salary / Working Days</code>
                    </div>
                    {rateMode === "WORKING_DAYS" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-[#1F1F1F]">Working Days:</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={workingDays}
                          onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 26))}
                          className="w-16 text-xs font-mono font-bold bg-white border border-[#E2E6F0] rounded-lg px-2 py-1 text-center"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Leave LOP & Additions / Deductions Card */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">Leaves & Adjustments</h3>
              </div>
              <span className="text-[11px] text-[#696E82]">Loss of Pay & Allowances</span>
            </div>

            {/* Approved Unpaid LOP Days */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#1F1F1F]">
                  Approved Unpaid LOP Days
                </label>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {unpaidLopDays} Days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={unpaidLopDays}
                onChange={(e) => setUnpaidLopDays(parseFloat(e.target.value) || 0)}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#696E82] mt-1 font-mono">
                <span>0 Days</span>
                <span>5 Days</span>
                <span>10 Days</span>
                <span>15 Days</span>
              </div>
              <p className="text-[10px] text-[#696E82] mt-1">
                Note: Each employee has 2.0 paid days allowance/month. Approved days exceeding 2.0 become Unpaid LOP.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Allowances (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={allowances}
                  onChange={(e) => setAllowances(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Bonus (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bonus}
                  onChange={(e) => setBonus(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Advance Recovery (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceRecovery}
                  onChange={(e) => setAdvanceRecovery(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Loan Recovery (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={loanRecovery}
                  onChange={(e) => setLoanRecovery(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl px-3 py-2 text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Instant Live Output & Formula Audit */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top KPI Summary Banner */}
          <div className="bg-[#2C308D] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Project 2 Net Payable Result</span>
                </div>
                <div className="text-3xl md:text-4xl font-extrabold font-mono mt-1 tracking-tight text-white">
                  ₹{calcData?.calculation?.netPayable?.toLocaleString("en-IN") || "0"}
                </div>
                <div className="text-xs text-blue-200 mt-1">
                  Disbursed for {monthNames[month - 1]} {year} • {rateMode}
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 text-right min-w-[160px]">
                <div className="text-[11px] text-blue-200 uppercase font-semibold">Daily Rate</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  ₹{calcData?.calculation?.dailyRate?.toLocaleString("en-IN") || "0"}
                  <span className="text-xs font-normal text-blue-200">/day</span>
                </div>
                <div className="text-[10px] text-blue-200 mt-0.5 font-mono">
                  Mode: {rateMode}
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 pt-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-blue-200 block font-sans">Gross Salary</span>
                <strong className="text-sm font-bold text-white">
                  ₹{calcData?.calculation?.grossSalary?.toLocaleString("en-IN") || "0"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-rose-300 block font-sans">LOP Deductions</span>
                <strong className="text-sm font-bold text-rose-300">
                  -₹{calcData?.calculation?.lopDeductionAmount?.toLocaleString("en-IN") || "0"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-blue-200 block font-sans">Total Deductions</span>
                <strong className="text-sm font-bold text-rose-300">
                  -₹{calcData?.calculation?.totalDeductions?.toLocaleString("en-IN") || "0"}
                </strong>
              </div>
            </div>

            {/* Excess Liability Alert if applicable */}
            {calcData?.calculation?.excessDeductionLiability > 0 && (
              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-300/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  <strong>Excess Deduction Liability:</strong> Deductions exceed gross pay by ₹
                  {calcData?.calculation?.excessDeductionLiability?.toLocaleString("en-IN")}. Clamped to ₹0 net, liability is preserved for future periods per ADR-04.
                </span>
              </div>
            )}
          </div>

          {/* 3-Mode Comparison Cards */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">
                  Multi-Mode Daily Rate Comparison (Project 2 Matrix)
                </h3>
              </div>
              <span className="text-xs text-[#696E82]">Comparing all 3 Studio Formulas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {calcData?.modeComparison &&
                Object.entries(calcData.modeComparison).map(([key, item]: [string, any]) => (
                  <div
                    key={key}
                    onClick={() => setRateMode(key as any)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      item.isCurrentSelected
                        ? "bg-[#F2F4FF] border-[#5A81FA] ring-2 ring-[#5A81FA]/20 shadow-xs"
                        : "bg-[#F8F9FE] border-[#E2E6F0] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1F1F1F] truncate">
                        {key === "FIXED_30" ? "Fixed 30 Days" : key === "CALENDAR_DAYS" ? "Calendar Days" : "Working Days"}
                      </span>
                      {item.isCurrentSelected && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#5A81FA] text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#696E82] mt-1">
                      Divisor: <span className="font-mono font-semibold">{item.denominator}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#E2E6F0]/60 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#696E82] font-sans">Daily Rate:</span>
                        <strong className="text-[#1F1F1F]">₹{item.dailyRate}/day</strong>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#696E82] font-sans">LOP Deduct:</span>
                        <span className="text-rose-600 font-semibold">-₹{item.lopDeduction}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-[#E2E6F0]/40">
                        <span className="text-[10px] text-[#696E82] font-sans font-bold">Net Pay:</span>
                        <strong className="text-[#2C308D] font-bold">₹{item.netPayable.toLocaleString("en-IN")}</strong>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Mathematical Step-by-Step Breakdown Accordion */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2F7] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5A81FA]" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">
                  Mathematical Step-by-Step Breakdown (ADR-04)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#696E82]">Pure Precision Engine</span>
            </div>

            {calcData?.formulas && (
              <div className="space-y-3 text-xs">
                {/* Step 1: Daily Rate */}
                <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
                  <div className="flex items-center justify-between text-[#696E82] text-[11px] font-semibold mb-1">
                    <span>STEP 1: DAILY RATE CALCULATION</span>
                    <span className="font-mono text-[#2C308D]">₹{calcData.formulas.dailyRate.value}/day</span>
                  </div>
                  <div className="font-mono text-[#1F1F1F] font-semibold text-xs">
                    {calcData.formulas.dailyRate.equation}
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Formula: {calcData.formulas.dailyRate.formula}
                  </div>
                </div>

                {/* Step 2: LOP Deduction */}
                <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
                  <div className="flex items-center justify-between text-[#696E82] text-[11px] font-semibold mb-1">
                    <span>STEP 2: LEAVE LOSS OF PAY (LOP) DEDUCTION</span>
                    <span className="font-mono text-rose-600">₹{calcData.formulas.lopDeduction.value}</span>
                  </div>
                  <div className="font-mono text-[#1F1F1F] font-semibold text-xs">
                    {calcData.formulas.lopDeduction.equation}
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Formula: {calcData.formulas.lopDeduction.formula}
                  </div>
                </div>

                {/* Step 3: Gross Pay */}
                <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
                  <div className="flex items-center justify-between text-[#696E82] text-[11px] font-semibold mb-1">
                    <span>STEP 3: GROSS SALARY AGGREGATION</span>
                    <span className="font-mono text-emerald-700">₹{calcData.formulas.grossSalary.value}</span>
                  </div>
                  <div className="font-mono text-[#1F1F1F] font-semibold text-xs">
                    {calcData.formulas.grossSalary.equation}
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Formula: {calcData.formulas.grossSalary.formula}
                  </div>
                </div>

                {/* Step 4: Total Deductions */}
                <div className="p-3 bg-[#F8F9FE] rounded-xl border border-[#E2E6F0]">
                  <div className="flex items-center justify-between text-[#696E82] text-[11px] font-semibold mb-1">
                    <span>STEP 4: TOTAL DEDUCTIONS AGGREGATION</span>
                    <span className="font-mono text-rose-600">₹{calcData.formulas.totalDeductions.value}</span>
                  </div>
                  <div className="font-mono text-[#1F1F1F] font-semibold text-xs">
                    {calcData.formulas.totalDeductions.equation}
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Formula: {calcData.formulas.totalDeductions.formula}
                  </div>
                </div>

                {/* Step 5: Net Payable */}
                <div className="p-3 bg-[#F2F4FF] rounded-xl border border-[#CEDEFF]">
                  <div className="flex items-center justify-between text-[#2C308D] text-[11px] font-bold mb-1">
                    <span>STEP 5: NET PAYABLE DISBURSEMENT</span>
                    <span className="font-mono text-base font-extrabold">₹{calcData.formulas.netPayable.value}</span>
                  </div>
                  <div className="font-mono text-[#1F1F1F] font-bold text-xs">
                    {calcData.formulas.netPayable.equation}
                  </div>
                  <div className="text-[10px] text-[#696E82] mt-0.5">
                    Formula: {calcData.formulas.netPayable.formula}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
