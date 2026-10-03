import React from "react";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { serializeForClient } from "@/server/utils/serialize";
import { ShieldAlert } from "lucide-react";
import FinanceClientView from "./FinanceClientView";

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
    prisma.feeMilestone.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { milestoneDate: "asc" },
    }),
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

  const initialSummary = {
    totalBudget,
    totalInvoicedFees,
    totalReceivedPayments,
    totalApprovedExpenses,
    totalQuotationCommitments,
    netCashPosition,
  };

  return (
    <FinanceClientView
      workspaceSlug={ctx.tenantSlug}
      userRole={ctx.role}
      userFullName={ctx.userFullName}
      initialSummary={serializeForClient(initialSummary) as any}
      initialMilestones={serializeForClient(milestones) as any}
    />
  );
}
