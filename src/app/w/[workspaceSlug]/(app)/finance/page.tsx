import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { Receipt, ShieldAlert, IndianRupee, TrendingUp, AlertCircle, FileText } from "lucide-react";

interface FinancePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function FinancePage({ params }: FinancePageProps) {
  const { workspaceSlug } = await params;
  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  // Strict permission gate: Boss (OWNER), Admin (ADMIN), or explicit financial clearance
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN" && !ctx.hasFinanceAccess) {
    return (
      <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-3 mt-12 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#1F1F1F]">Financial Access Restricted</h2>
        <p className="text-xs text-[#696E82]">
          Project financial ledgers, contractor quotations, fee milestones, and studio budgets are restricted to Partners and
          personnel with explicit financial clearance.
        </p>
      </div>
    );
  }

  // Fetch financial aggregates for this tenant
  const [budgets, milestones, payments, expenses, quotations] = await Promise.all([
    prisma.budget.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.feeMilestone.findMany({ where: { tenantId: ctx.tenantId }, include: { project: true } }),
    prisma.feePayment.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.expense.findMany({ where: { tenantId: ctx.tenantId }, include: { project: true } }),
    prisma.quotation.findMany({ where: { tenantId: ctx.tenantId } }),
  ]);

  const totalBudget = budgets.reduce((acc, b) => acc + Number(b.plannedAmount), 0);
  const totalInvoicedFees = milestones.reduce((acc, m) => acc + Number(m.amount), 0);
  const totalReceivedPayments = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalApprovedExpenses = expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalQuotationCommitments = quotations
    .filter((q) => q.status === "ACCEPTED")
    .reduce((acc, q) => acc + Number(q.amount), 0);

  const netCashPosition = totalReceivedPayments - totalApprovedExpenses;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider">
            <span>Studio Finance & Accounts</span>
            <span>•</span>
            <span>Cash Flow & Budgets</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] mt-1">Project Finance Dashboard</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Planned budgets, client fee milestones, and verified studio expenses
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">
            Total Planned Budgets
          </span>
          <span className="text-xl font-bold text-[#1F1F1F] mt-1 block">
            INR {totalBudget.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-[#696E82]">Across active commissions</span>
        </div>

        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">
            Received Client Fees
          </span>
          <span className="text-xl font-bold text-[#5A81FA] mt-1 block">
            INR {totalReceivedPayments.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            Invoiced: INR {totalInvoicedFees.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">
            Approved Project Expenses
          </span>
          <span className="text-xl font-bold text-rose-800 mt-1 block">
            INR {totalApprovedExpenses.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-[#696E82]">Travel, surveys, site ops</span>
        </div>

        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">
            Net Cash Flow Position
          </span>
          <span className="text-xl font-bold text-[#1F1F1F] mt-1 block">
            INR {netCashPosition.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-[#696E82] block mt-0.5">
            Received fees minus expenses (not audited profit)
          </span>
        </div>
      </div>

      {/* Contractor Commitments Note */}
      <div className="bg-[#F8F9FD] border border-[#E2E6F0] p-4 rounded-xl text-xs flex items-start gap-3">
        <Receipt className="w-4 h-4 text-[#5A81FA] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1F1F1F]">Separation of Quotation Commitments:</strong>
          <p className="text-[#696E82] mt-0.5">
            Accepted contractor quotations (Total: INR {totalQuotationCommitments.toLocaleString("en-IN")}) are recorded
            as contractual commitments and are strictly tracked separately from paid expenses to avoid double-counting in
            cash-flow accounting.
          </p>
        </div>
      </div>

      {/* Fee Milestones Ledger */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-[#1F1F1F]">Client Fee Milestones Schedule</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FD] text-[#696E82] font-semibold border-b border-[#E2E6F0]">
              <tr>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Milestone Title</th>
                <th className="py-2.5 px-3">Target Date</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6F0]">
              {milestones.map((m) => (
                <tr key={m.id} className="hover:bg-[#F8F9FD]">
                  <td className="py-3 px-3 font-mono font-bold text-[#5A81FA]">{m.project.code}</td>
                  <td className="py-3 px-3 font-medium text-[#1F1F1F]">{m.title}</td>
                  <td className="py-3 px-3 text-[#696E82]">
                    {new Date(m.milestoneDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#1F1F1F]">
                    {m.currency} {Number(m.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        m.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
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
    </div>
  );
}
