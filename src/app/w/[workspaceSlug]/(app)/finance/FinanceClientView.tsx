"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Tablet,
  Monitor,
  Menu,
  Bell,
  MapPin,
  CheckSquare,
  FolderKanban,
  FileCheck2,
  Users,
  Wrench,
  Briefcase,
  Building,
  LogOut,
  Info,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

export interface FeeMilestoneItem {
  id: string;
  projectId: string;
  project: {
    id: string;
    code: string;
    name: string;
  };
  title: string;
  amount: number | string;
  currency: string;
  milestoneDate: string;
  status: "PENDING" | "INVOICED" | "PAID";
}

export interface FinancialSummaryData {
  totalBudget: number;
  totalInvoicedFees: number;
  totalReceivedPayments: number;
  totalApprovedExpenses: number;
  totalQuotationCommitments: number;
  netCashPosition: number;
}

export interface FinanceClientViewProps {
  workspaceSlug: string;
  userRole: string;
  userFullName: string;
  initialSummary: FinancialSummaryData;
  initialMilestones: FeeMilestoneItem[];
}

export default function FinanceClientView({
  workspaceSlug,
  userRole,
  userFullName,
  initialSummary,
  initialMilestones,
}: FinanceClientViewProps) {
  // Executive viewport mode
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");

  // State mode: Reference 0 Data (matching the screenshot exactly) vs Populated Illustrative Example
  const [dataMode, setDataMode] = useState<"reference-zero" | "populated-example">("reference-zero");

  // Interactive UI states
  const [isQuotationExpanded, setIsQuotationExpanded] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [simulatedState, setSimulatedState] = useState<"normal" | "loading" | "error">("normal");

  // Format currency with Indian digit grouping: INR X,XX,XXX
  const formatINR = (val: number) => {
    return `INR ${Number(val || 0).toLocaleString("en-IN")}`;
  };

  // Illustrative Populated Sample Data (Internally consistent financial dataset)
  const samplePopulatedData: {
    summary: FinancialSummaryData;
    milestones: FeeMilestoneItem[];
  } = useMemo(() => {
    const summary: FinancialSummaryData = {
      totalBudget: 4500000,
      totalInvoicedFees: 1800000,
      totalReceivedPayments: 1250000,
      totalApprovedExpenses: 1850000,
      totalQuotationCommitments: 820000,
      netCashPosition: 1250000 - 1850000, // INR 10,65,000
    };

    const milestones: FeeMilestoneItem[] = [
      {
        id: "ms-1",
        projectId: "prj-1",
        project: {
          id: "prj-1",
          code: "HZ-2026",
          name: "Horizon Towers Luxury Residence",
        },
        title: "Concept Design Approval & Master Layout",
        amount: 500000,
        currency: "INR",
        milestoneDate: "2026-09-15T00:00:00.000Z",
        status: "PAID",
      },
      {
        id: "ms-2",
        projectId: "prj-1",
        project: {
          id: "prj-1",
          code: "HZ-2026",
          name: "Horizon Towers Luxury Residence",
        },
        title: "Schematic Package & Municipal Submission",
        amount: 750000,
        currency: "INR",
        milestoneDate: "2026-09-30T00:00:00.000Z",
        status: "PAID",
      },
      {
        id: "ms-3",
        projectId: "prj-1",
        project: {
          id: "prj-1",
          code: "HZ-2026",
          name: "Horizon Towers Luxury Residence",
        },
        title: "Detailed Working Drawings (GFC Set)",
        amount: 550000,
        currency: "INR",
        milestoneDate: "2026-10-20T00:00:00.000Z",
        status: "INVOICED",
      },
      {
        id: "ms-4",
        projectId: "prj-2",
        project: {
          id: "prj-2",
          code: "TEST-PRJ-01",
          name: "Test Site Alpha",
        },
        title: "Site Commencement & Excavation Sign-Off",
        amount: 250000,
        currency: "INR",
        milestoneDate: "2026-11-05T00:00:00.000Z",
        status: "PENDING",
      },
    ];

    return { summary, milestones };
  }, []);

  // Active dataset based on mode
  const activeSummary = useMemo(() => {
    if (dataMode === "reference-zero") {
      return initialSummary; // Matches screenshot exact values: INR 0 across all cards
    }
    return samplePopulatedData.summary;
  }, [dataMode, initialSummary, samplePopulatedData]);

  const activeMilestones = useMemo(() => {
    if (dataMode === "reference-zero") {
      return initialMilestones; // Matches screenshot: 0 rows in table
    }
    return samplePopulatedData.milestones;
  }, [dataMode, initialMilestones, samplePopulatedData]);

  return (
    <div className="w-full bg-[#F8F9FD] min-h-screen text-[#0F172A] font-sans antialiased pb-24 md:pb-12">
      {/* ==================================================== */}
      {/* TOP EXECUTIVE DESIGN TOOLBAR                         */}
      {/* Viewport switcher, state toggles, interactive mocks  */}
      {/* ==================================================== */}
      <aside aria-label="Executive Design Controls" className="sticky top-0 z-40 bg-[#0B122B] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewportMode("mobile")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "mobile"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone 390px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("tablet")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "tablet"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet 768px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewportMode === "desktop"
                  ? "bg-[#4865F6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Auto</span>
            </button>
          </div>

          {/* Quick Mockup State Triggers */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {/* Mode Toggle */}
            <button
              type="button"
              onClick={() => setDataMode(dataMode === "reference-zero" ? "populated-example" : "reference-zero")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                dataMode === "reference-zero"
                  ? "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-indigo-600/90 hover:bg-indigo-500 text-white border-indigo-500"
              }`}
            >
              <span>{dataMode === "reference-zero" ? "Mode: Zero Data (Screenshot)" : "Mode: Populated Example"}</span>
            </button>

            {/* Simulation states */}
            <button
              type="button"
              onClick={() => setSimulatedState(simulatedState === "loading" ? "normal" : "loading")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border shrink-0 ${
                simulatedState === "loading"
                  ? "bg-amber-600 text-white border-amber-500"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              Simulate Loading
            </button>

            <button
              type="button"
              onClick={() => setSimulatedState(simulatedState === "error" ? "normal" : "error")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border shrink-0 ${
                simulatedState === "error"
                  ? "bg-rose-600 text-white border-rose-500"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              Simulate Error / Retry
            </button>

            <button
              type="button"
              onClick={() => setIsQuotationExpanded(!isQuotationExpanded)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              {isQuotationExpanded ? "Collapse Note" : "Expand Commitments Note"}
            </button>

            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium border border-slate-700 shrink-0"
            >
              Nav Drawer
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* RESPONSIVE CONTAINER WRAPPER                         */}
      {/* Adapts to 390px, 768px, or Desktop Auto             */}
      {/* ==================================================== */}
      <div
        className={`mx-auto transition-all duration-300 ${
          viewportMode === "mobile"
            ? "max-w-[420px] bg-white border-x border-[#E2E6F0] shadow-xl my-0 sm:my-4 rounded-none sm:rounded-3xl overflow-hidden"
            : viewportMode === "tablet"
            ? "max-w-[768px] bg-white border-x border-[#E2E6F0] shadow-xl my-0 sm:my-4 rounded-none sm:rounded-3xl overflow-hidden"
            : "max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
        }`}
      >
        {/* ==================================================== */}
        {/* 1. COMPACT APPLICATION HEADER                        */}
        {/* ==================================================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E6F0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0B122B] text-white flex items-center justify-center font-black text-xs tracking-tight shadow-xs">
                100%
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-sm text-[#0F172A] tracking-tight">100% DESIGN Studio</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtle Site Check-in action (non-competing) */}
            <Link
              href={`/w/${workspaceSlug}/visits`}
              title="Site Visits & GPS Check-In"
              className="w-8 h-8 rounded-lg bg-[#F8F9FD] border border-[#E2E6F0] text-slate-600 hover:text-[#4865F6] flex items-center justify-center transition-colors"
            >
              <MapPin className="w-4 h-4" />
            </Link>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative w-8 h-8 rounded-lg bg-[#F8F9FD] border border-[#E2E6F0] text-slate-600 hover:text-[#0F172A] flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {/* Profile Avatar */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-[#4865F6] text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer"
            >
              SL
            </button>
          </div>
        </header>

        {/* ==================================================== */}
        {/* MAIN BODY AREA                                       */}
        {/* Strictly in requested single-column order            */}
        {/* ==================================================== */}
        <main className="p-4 sm:p-5 space-y-4">
          {/* SIMULATED ERROR / RETRY STATE */}
          {simulatedState === "error" && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 text-rose-900 shadow-2xs space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-rose-900">Failed to load financial ledgers</h3>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    Unable to retrieve real-time budget balances and verified milestones from the Kolkata node server. Please check your connectivity.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60">
                <button
                  type="button"
                  onClick={() => setSimulatedState("normal")}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Loading Data</span>
                </button>
              </div>
            </div>
          )}

          {/* 2 & 3. PAGE HEADING & SHORT DESCRIPTION */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4865F6] uppercase tracking-wider">
                <Receipt className="w-3 h-3" />
                <span>STUDIO FINANCE & ACCOUNTS</span>
                <span>•</span>
                <span>CASH FLOW & BUDGETS</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>INR Ledger Verified</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] leading-snug">
              Project Finance
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Budgets, client fees, and project expenses.
            </p>
          </div>

          {/* Mode Indicator Banner when Populated Example is active */}
          {dataMode === "populated-example" && (
            <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-indigo-900 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold">Illustrative Populated State Active</span>
              </div>
              <button
                type="button"
                onClick={() => setDataMode("reference-zero")}
                className="text-[10px] text-indigo-700 font-bold hover:underline"
              >
                Reset to Screenshot 0 Data
              </button>
            </div>
          )}

          {/* ==================================================== */}
          {/* 4. FOUR FINANCIAL SUMMARY CARDS                      */}
          {/* 2-column on mobile, stacks on narrow, 4-col desktop  */}
          {/* ==================================================== */}
          {simulatedState === "loading" ? (
            /* Loading Skeletons for Summary Cards */
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-2 animate-pulse"
                >
                  <div className="h-2.5 w-20 bg-slate-200 rounded"></div>
                  <div className="h-6 w-28 bg-slate-200 rounded"></div>
                  <div className="h-2 w-24 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Card A: Total Planned Budgets */}
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Planned Budgets
                </span>
                <span className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight block">
                  {formatINR(activeSummary.totalBudget)}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Across active commissions.
                </span>
              </div>

              {/* Card B: Received Client Fees */}
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Received Client Fees
                </span>
                <span className="text-lg sm:text-xl font-black text-[#4865F6] tracking-tight block">
                  {formatINR(activeSummary.totalReceivedPayments)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 block leading-tight">
                  Invoiced: {formatINR(activeSummary.totalInvoicedFees)}
                </span>
              </div>

              {/* Card C: Approved Project Expenses */}
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Approved Project Expenses
                </span>
                <span className="text-lg sm:text-xl font-black text-rose-700 tracking-tight block">
                  {formatINR(activeSummary.totalApprovedExpenses)}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Travel, surveys, site ops.
                </span>
              </div>

              {/* Card D: Net Cash Flow Position */}
              <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Net Cash Flow Position
                </span>
                <span className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight block">
                  {formatINR(activeSummary.netCashPosition)}
                </span>
                <div className="text-[10px] text-slate-500 leading-tight space-y-0.5">
                  <p>Received fees minus expenses.</p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                    (Not audited profit)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 5. QUOTATION COMMITMENTS INFORMATION                 */}
          {/* Converted into a compact mobile card with expansion  */}
          {/* ==================================================== */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#F2F4FF] text-[#4865F6] border border-[#D5DFFC] flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[#0F172A] leading-tight">
                    Quotation Commitments
                  </h3>
                  <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      Accepted quotations: {formatINR(activeSummary.totalQuotationCommitments)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tracked separately from paid expenses.
                  </p>
                </div>
              </div>

              {/* Expansion Trigger */}
              <button
                type="button"
                onClick={() => setIsQuotationExpanded(!isQuotationExpanded)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[10px] font-semibold border border-slate-200 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <span>{isQuotationExpanded ? "Hide Note" : "Why this is separate"}</span>
                {isQuotationExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Expanded Explanation (Full meaning from reference) */}
            {isQuotationExpanded && (
              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-slate-600 leading-relaxed space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-[#4865F6]" />
                  <span>Separation Principle in Cash Flow Accounting</span>
                </div>
                <p>
                  Accepted contractor quotations are contractual commitments. They are tracked separately from paid expenses to avoid double-counting in cash flow.
                </p>
                <p className="text-[10px] text-slate-500">
                  Once a contractor submits an invoice against an accepted quotation and the expense is approved, it transitions into Approved Project Expenses.
                </p>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* 6. CLIENT FEE MILESTONES SCHEDULE                    */}
          {/* Stacked mobile cards on phone, table on desktop      */}
          {/* ==================================================== */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Client Fee Milestones Schedule
                </h3>
                <p className="text-[11px] text-slate-500">
                  Project deliverables tied to architectural billing gates
                </p>
              </div>

              <div className="text-[11px] font-medium text-slate-500">
                {activeMilestones.length} {activeMilestones.length === 1 ? "Milestone" : "Milestones"}
              </div>
            </div>

            {/* SCREEN 1: Primary Confirmed Zero-Data Empty State */}
            {simulatedState === "loading" ? (
              /* Loading Skeletons for Milestones */
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] space-y-2 animate-pulse">
                    <div className="h-3 w-40 bg-slate-200 rounded"></div>
                    <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : activeMilestones.length === 0 ? (
              <div className="p-8 sm:p-10 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E6F0] text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                  <Calendar className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    No client fee milestones to display.
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Milestones will appear here when available.
                  </p>
                </div>
              </div>
            ) : (
              /* SCREEN 3: Populated Milestone State */
              <div>
                {/* Mobile View: Stacked Cards (Visible on phones/tablets) */}
                <div className="space-y-2.5 md:hidden">
                  {activeMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-2 hover:border-[#4865F6]/40 transition-all"
                    >
                      {/* Top: Milestone Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">
                            {m.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-mono font-bold text-[#4865F6] bg-white px-1.5 py-0.5 rounded border border-[#CEDEFF]">
                              {m.project.code}
                            </span>
                            <span className="truncate">{m.project.name}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                            m.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.status === "INVOICED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      {/* Bottom Row: Amount & Target Date */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                        <div className="text-slate-500 text-[11px]">
                          Target: <strong className="text-slate-700 font-medium">{new Date(m.milestoneDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                        </div>
                        <div className="font-bold text-[#0F172A] font-mono text-xs sm:text-sm">
                          {m.currency} {Number(m.amount).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Preserved Table Layout (Visible on desktop screens md+) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FD] text-[#64748B] font-semibold border-b border-[#E2E6F0]">
                      <tr>
                        <th className="py-2.5 px-3">Project</th>
                        <th className="py-2.5 px-3">Milestone Title</th>
                        <th className="py-2.5 px-3">Target Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6F0]">
                      {activeMilestones.map((m) => (
                        <tr key={m.id} className="hover:bg-[#F8F9FD] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#4865F6]">{m.project.code}</td>
                          <td className="py-3 px-3 font-medium text-[#0F172A]">{m.title}</td>
                          <td className="py-3 px-3 text-[#64748B]">
                            {new Date(m.milestoneDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#0F172A] font-mono">
                            {m.currency} {Number(m.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                m.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : m.status === "INVOICED"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ==================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR                         */}
        {/* ==================================================== */}
        <nav aria-label="Mobile Navigation" className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2E6F0] px-4 py-2 flex items-center justify-around text-[10px] text-slate-500 md:hidden">
          <Link
            href={`/w/${workspaceSlug}/tasks`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tasks</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <FolderKanban className="w-4 h-4" />
            <span>Projects</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/visits`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <MapPin className="w-4 h-4" />
            <span>Site Visits</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/drawings`}
            className="flex flex-col items-center gap-1 py-1 hover:text-[#4865F6]"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Drawings</span>
          </Link>

          <Link
            href={`/w/${workspaceSlug}/finance`}
            className="flex flex-col items-center gap-1 py-1 text-[#4865F6] font-bold"
          >
            <Receipt className="w-4 h-4 stroke-[2.5]" />
            <span>Finance</span>
            <span className="w-1 h-1 rounded-full bg-[#4865F6]"></span>
          </Link>
        </nav>
      </div>

      {/* ==================================================== */}
      {/* 4. SLIDE-OUT MOBILE NAVIGATION DRAWER                */}
      {/* Contains all 9 destinations with Finance highlighted */}
      {/* ==================================================== */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="bg-white w-72 max-w-[85vw] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Top */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0B122B] text-white flex items-center justify-center font-black text-xs">
                  100%
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">100% DESIGN Studio</h3>
                  <p className="text-[10px] text-slate-500">Architectural Operations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation items (All 9 preserved) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              <Link
                href={`/w/${workspaceSlug}/tasks`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-slate-400" />
                <span>Studio Tasks</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/projects`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-slate-400" />
                <span>Projects</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/visits`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Site Visits & GPS</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/drawings`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-slate-400" />
                <span>Drawings & Approvals</span>
              </Link>

              {/* HIGHLIGHTED PROJECT FINANCE DESTINATION */}
              <Link
                href={`/w/${workspaceSlug}/finance`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold bg-[#4865F6] text-white shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>Project Finance</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/team`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Studio Team</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/contractors`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Wrench className="w-4 h-4 text-slate-400" />
                <span>Contractors</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/consultants`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>Consultants</span>
              </Link>

              <Link
                href={`/w/${workspaceSlug}/directory`}
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Building className="w-4 h-4 text-slate-400" />
                <span>Clients & Directory</span>
              </Link>
            </div>

            {/* Install App & Account Footer */}
            <div className="p-3 border-t border-[#E2E6F0] bg-slate-50 space-y-2">
              <button
                type="button"
                onClick={() => alert("PWA Installation prompt ready for offline field work.")}
                className="w-full py-2 bg-white border border-[#E2E6F0] rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#4865F6]" />
                <span>Install Mobile PWA</span>
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#4865F6] text-white font-bold text-[10px] flex items-center justify-center">
                    SL
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{userFullName || "Saksham Lanjewar"}</p>
                    <p className="text-[10px] text-slate-500 font-mono">EMP-001 • {userRole}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = `/w/${workspaceSlug}/login`;
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. USER PROFILE MODAL                                */}
      {/* ==================================================== */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#4865F6] text-white font-bold text-sm flex items-center justify-center">
                  SL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{userFullName || "Saksham Lanjewar"}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-mono font-bold text-[#4865F6]">EMP-001</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-700 uppercase">{userRole || "ADMIN / OWNER"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Workspace:</span>
                <span className="font-semibold text-slate-800">100% DESIGN Studio</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">designsaksham1@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Financial Clearance:</span>
                <span className="font-semibold text-emerald-700">Audit & Ledger Authorized</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = `/w/${workspaceSlug}/login`;
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
