import { prisma } from "../../db/prisma";
import { Prisma } from "@prisma/client";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { calculateMonthlyLeaveSummary } from "../leave/policy";
import { calculateEmployeePayroll, RateCalculationMode } from "./engine";
import { sanitizeSpreadsheetFormula } from "../ingest/csv";

const Decimal = Prisma.Decimal;

export interface MonthlyPayrollPreview {
  periodKey: string;
  year: number;
  month: number;
  monthName: string;
  state: string;
  isLocked: boolean;
  totalGross: number;
  totalDeductions: number;
  totalNetPayable: number;
  employees: EmployeePayrollPreviewItem[];
}

export interface EmployeePayrollPreviewItem {
  employeeId: string;
  employeeDbId: string;
  employeeName: string;
  department: string;
  hasCompensation: boolean;
  baseSalary: number;
  rateCalculationMode: RateCalculationMode;
  dailyRate: number;
  totalApprovedLeaveDays: number;
  paidLeaveDays: number;
  unpaidLopDays: number;
  lopDeductionAmount: number;
  allowances: number;
  bonus: number;
  statutoryDeductions: number;
  advanceRecovery: number;
  loanRecovery: number;
  customDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netPayable: number;
  excessLiability: number;
  paymentStatus: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  blockingReason?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Generates monthly payroll preview across all studio employees
 */
export async function getMonthlyPayrollPreview(
  context: TenantContext,
  year: number,
  month: number
): Promise<MonthlyPayrollPreview> {
  assertAdminOrOwner(context);

  const periodKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthName = MONTH_NAMES[month - 1];

  // 1. Check if period already exists in DB
  const existingPeriod = await prisma.studioPayrollPeriod.findUnique({
    where: {
      tenantId_periodKey: {
        tenantId: context.tenantId,
        periodKey,
      },
    },
    include: {
      records: {
        include: {
          employee: {
            include: {
              membership: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
  });

  // If already locked, return the immutable snapshot directly!
  if (existingPeriod && existingPeriod.isLocked) {
    const employees: EmployeePayrollPreviewItem[] = existingPeriod.records.map((r) => ({
      employeeId: r.employee.employeeId,
      employeeDbId: r.employeeId,
      employeeName: r.employee.membership.user.fullName,
      department: r.employee.department || "General",
      hasCompensation: true,
      baseSalary: Number(r.baseSalary),
      rateCalculationMode: r.rateCalculationMode as RateCalculationMode,
      dailyRate: Number(r.dailyRate),
      totalApprovedLeaveDays: Number(r.totalApprovedLeaveDays),
      paidLeaveDays: Number(r.paidLeaveDays),
      unpaidLopDays: Number(r.unpaidLopDays),
      lopDeductionAmount: Number(r.lopDeductionAmount),
      allowances: Number(r.allowancesTotal),
      bonus: Number(r.bonusAmount),
      statutoryDeductions: Number(r.statutoryDeductionsAmount),
      advanceRecovery: Number(r.advanceRecoveryAmount),
      loanRecovery: Number(r.loanRecoveryAmount),
      customDeductions: Number(r.customDeductionsAmount),
      grossSalary: Number(r.grossSalary),
      totalDeductions: Number(r.totalDeductions),
      netPayable: Number(r.netPayable),
      excessLiability: Number(r.excessDeductionLiability),
      paymentStatus: r.paymentStatus,
    }));

    const totalGross = employees.reduce((s, e) => s + e.grossSalary, 0);
    const totalDeductions = employees.reduce((s, e) => s + e.totalDeductions, 0);
    const totalNetPayable = employees.reduce((s, e) => s + e.netPayable, 0);

    return {
      periodKey,
      year,
      month,
      monthName,
      state: existingPeriod.state,
      isLocked: true,
      totalGross,
      totalDeductions,
      totalNetPayable,
      employees,
    };
  }

  // 2. Compute dynamic preview from live leaves and active employee compensations
  const allEmployees = await prisma.employee.findMany({
    where: { tenantId: context.tenantId },
    include: {
      membership: {
        include: { user: true },
      },
      compensations: {
        where: { isCurrent: true },
        take: 1,
      },
      leaveRequests: {
        where: { deletedAt: null },
      },
      advanceLoans: {
        where: { status: "ACTIVE" },
      },
    },
    orderBy: { employeeId: "asc" },
  });

  const previewItems: EmployeePayrollPreviewItem[] = [];

  for (const emp of allEmployees) {
    const comp = emp.compensations[0];
    const empName = emp.membership.user.fullName;

    if (!comp) {
      // Missing salary: visible blocking condition, never silently fallback to 25,000!
      previewItems.push({
        employeeId: emp.employeeId,
        employeeDbId: emp.id,
        employeeName: empName,
        department: emp.department || "General",
        hasCompensation: false,
        baseSalary: 0,
        rateCalculationMode: "FIXED_30",
        dailyRate: 0,
        totalApprovedLeaveDays: 0,
        paidLeaveDays: 0,
        unpaidLopDays: 0,
        lopDeductionAmount: 0,
        allowances: 0,
        bonus: 0,
        statutoryDeductions: 0,
        advanceRecovery: 0,
        loanRecovery: 0,
        customDeductions: 0,
        grossSalary: 0,
        totalDeductions: 0,
        netPayable: 0,
        excessLiability: 0,
        paymentStatus: "PENDING",
        blockingReason: "No compensation record configured. Base monthly salary required.",
      });
      continue;
    }

    // Compute leaves for this employee in target month
    const mappedLeaves = emp.leaveRequests.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.days,
      status: l.status as any,
      leaveType: l.leaveType,
      isPaidEligible: l.isPaidEligible,
      submittedAt: l.submittedAt,
    }));

    const leaveSummary = calculateMonthlyLeaveSummary(year, month, mappedLeaves, 2.0);

    // Active advances or amortized loan recoveries
    let advanceRecovery = 0;
    let loanRecovery = 0;

    for (const loan of emp.advanceLoans) {
      const balance = Number(loan.balanceAmount);
      const monthly = Number(loan.monthlyRecoveryAmount);
      const recoverable = Math.min(balance, monthly);

      if (loan.type === "ADVANCE") {
        advanceRecovery += recoverable;
      } else {
        loanRecovery += recoverable;
      }
    }

    const calcResult = calculateEmployeePayroll(
      {
        employeeId: emp.id,
        baseSalary: Number(comp.baseMonthlySalary),
        rateCalculationMode: comp.rateCalculationMode as RateCalculationMode,
        approvedUnpaidLopDays: leaveSummary.unpaidLopDays,
        totalApprovedLeaveDays: leaveSummary.totalApprovedDays,
        paidLeaveDays: leaveSummary.paidLeaveDays,
        advanceRecovery,
        loanRecovery,
      },
      year,
      month
    );

    previewItems.push({
      employeeId: emp.employeeId,
      employeeDbId: emp.id,
      employeeName: empName,
      department: emp.department || "General",
      hasCompensation: true,
      baseSalary: calcResult.baseSalary,
      rateCalculationMode: calcResult.rateCalculationMode,
      dailyRate: calcResult.dailyRate,
      totalApprovedLeaveDays: calcResult.totalApprovedLeaveDays,
      paidLeaveDays: calcResult.paidLeaveDays,
      unpaidLopDays: calcResult.unpaidLopDays,
      lopDeductionAmount: calcResult.lopDeductionAmount,
      allowances: calcResult.allowancesTotal,
      bonus: calcResult.bonusAmount,
      statutoryDeductions: calcResult.statutoryDeductionsAmount,
      advanceRecovery: calcResult.advanceRecoveryAmount,
      loanRecovery: calcResult.loanRecoveryAmount,
      customDeductions: calcResult.customDeductionsAmount,
      grossSalary: calcResult.grossSalary,
      totalDeductions: calcResult.totalDeductions,
      netPayable: calcResult.netPayable,
      excessLiability: calcResult.excessDeductionLiability,
      paymentStatus: "PENDING",
      bankName: comp.bankName || undefined,
      accountNumber: comp.accountNumber || undefined,
      ifscCode: comp.ifscCode || undefined,
      upiId: comp.upiId || undefined,
    });
  }

  const totalGross = previewItems.reduce((s, e) => s + e.grossSalary, 0);
  const totalDeductions = previewItems.reduce((s, e) => s + e.totalDeductions, 0);
  const totalNetPayable = previewItems.reduce((s, e) => s + e.netPayable, 0);

  return {
    periodKey,
    year,
    month,
    monthName,
    state: existingPeriod ? existingPeriod.state : "DRAFT",
    isLocked: false,
    totalGross: Number(totalGross.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    totalNetPayable: Number(totalNetPayable.toFixed(2)),
    employees: previewItems,
  };
}

/**
 * Finalizes and Locks a payroll period.
 * Makes snapshot immutable and amortizes active advances/loans idempotently!
 */
export async function finalizeAndLockPayrollPeriod(
  context: TenantContext,
  year: number,
  month: number
) {
  assertAdminOrOwner(context);

  const preview = await getMonthlyPayrollPreview(context, year, month);

  // Check if any employee has blocking condition
  const blocking = preview.employees.filter((e) => e.blockingReason);
  if (blocking.length > 0) {
    throw new Error(
      `Cannot finalize payroll: ${blocking.length} employee(s) have unconfigured compensation (${blocking.map((b) => b.employeeName).join(", ")})`
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create or update period to LOCKED
    const period = await tx.studioPayrollPeriod.upsert({
      where: {
        tenantId_periodKey: {
          tenantId: context.tenantId,
          periodKey: preview.periodKey,
        },
      },
      create: {
        tenantId: context.tenantId,
        periodKey: preview.periodKey,
        year,
        month,
        monthName: preview.monthName,
        state: "LOCKED",
        isLocked: true,
        lockedAt: new Date(),
        lockedById: context.membershipId,
        approvedAt: new Date(),
        approvedById: context.membershipId,
      },
      update: {
        state: "LOCKED",
        isLocked: true,
        lockedAt: new Date(),
        lockedById: context.membershipId,
      },
    });

    // 2. Persist immutable records
    for (const emp of preview.employees) {
      await tx.studioPayrollRecord.upsert({
        where: {
          tenantId_periodId_employeeId: {
            tenantId: context.tenantId,
            periodId: period.id,
            employeeId: emp.employeeDbId,
          },
        },
        create: {
          tenantId: context.tenantId,
          periodId: period.id,
          employeeId: emp.employeeDbId,
          baseSalary: new Decimal(emp.baseSalary),
          dailyRate: new Decimal(emp.dailyRate),
          rateCalculationMode: emp.rateCalculationMode,
          totalApprovedLeaveDays: new Decimal(emp.totalApprovedLeaveDays),
          paidLeaveDays: new Decimal(emp.paidLeaveDays),
          unpaidLopDays: new Decimal(emp.unpaidLopDays),
          lopDeductionAmount: new Decimal(emp.lopDeductionAmount),
          allowancesTotal: new Decimal(emp.allowances),
          bonusAmount: new Decimal(emp.bonus),
          statutoryDeductionsAmount: new Decimal(emp.statutoryDeductions),
          advanceRecoveryAmount: new Decimal(emp.advanceRecovery),
          loanRecoveryAmount: new Decimal(emp.loanRecovery),
          customDeductionsAmount: new Decimal(emp.customDeductions),
          grossSalary: new Decimal(emp.grossSalary),
          totalDeductions: new Decimal(emp.totalDeductions),
          netPayable: new Decimal(emp.netPayable),
          excessDeductionLiability: new Decimal(emp.excessLiability),
          paymentStatus: "PENDING",
          isLocked: true,
          calculatedById: context.membershipId,
          calculatedAt: new Date(),
        },
        update: {
          baseSalary: new Decimal(emp.baseSalary),
          dailyRate: new Decimal(emp.dailyRate),
          isLocked: true,
        },
      });

      // 3. Amortize active advances and loans idempotently
      if (emp.advanceRecovery > 0 || emp.loanRecovery > 0) {
        const activeLoans = await tx.studioAdvanceLoan.findMany({
          where: {
            tenantId: context.tenantId,
            employeeId: emp.employeeDbId,
            status: "ACTIVE",
          },
        });

        for (const loan of activeLoans) {
          const balance = Number(loan.balanceAmount);
          const monthly = Number(loan.monthlyRecoveryAmount);
          const recoverable = Math.min(balance, monthly);

          const newRecovered = Number(loan.recoveredAmount) + recoverable;
          const newBalance = Math.max(0, balance - recoverable);
          const newStatus = newBalance <= 0 ? "RECOVERED" : "ACTIVE";

          await tx.studioAdvanceLoan.update({
            where: { id: loan.id },
            data: {
              recoveredAmount: new Decimal(newRecovered),
              balanceAmount: new Decimal(newBalance),
              status: newStatus,
            },
          });
        }
      }
    }

    return period;
  });
}

/**
 * Generates bank payout CSV distribution formatted for Indian Net Banking (HDFC, ICICI, SBI).
 * Strictly sanitizes spreadsheet formula injection characters.
 * Exporting CSV NEVER marks payment as Paid!
 */
export function generateBankPayoutCSV(preview: MonthlyPayrollPreview): string {
  const headers = [
    "Beneficiary Name",
    "Account Number",
    "IFSC Code",
    "Net Amount (INR)",
    "Payment Mode",
    "Employee ID",
    "Remarks",
  ];

  const rows: string[] = [headers.join(",")];

  for (const emp of preview.employees) {
    if (emp.netPayable <= 0) continue;

    const safeName = `"${sanitizeSpreadsheetFormula(emp.employeeName).replace(/"/g, '""')}"`;
    // String safe account number to preserve leading zeros!
    const safeAcNo = `"${sanitizeSpreadsheetFormula(emp.accountNumber || "").replace(/"/g, '""')}"`;
    const safeIfsc = `"${sanitizeSpreadsheetFormula(emp.ifscCode || "").replace(/"/g, '""')}"`;
    const safeAmount = emp.netPayable.toFixed(2);
    const safeEmpId = `"${sanitizeSpreadsheetFormula(emp.employeeId).replace(/"/g, '""')}"`;
    const remarks = `"${sanitizeSpreadsheetFormula(`Salary ${preview.monthName} ${preview.year}`).replace(/"/g, '""')}"`;

    rows.push([safeName, safeAcNo, safeIfsc, safeAmount, "NEFT/RTGS", safeEmpId, remarks].join(","));
  }

  return rows.join("\r\n");
}
