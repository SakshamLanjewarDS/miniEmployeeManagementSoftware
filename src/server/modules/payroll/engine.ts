import { Decimal } from "@prisma/client/runtime/library";

export type RateCalculationMode = "FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS";

export interface PayrollInputItem {
  employeeId: string;
  baseSalary: number;
  rateCalculationMode: RateCalculationMode;
  approvedUnpaidLopDays: number; // Unpaid leave days from monthly leave service
  totalApprovedLeaveDays: number;
  paidLeaveDays: number;
  allowances?: number;
  bonus?: number;
  statutoryDeductions?: number;
  advanceRecovery?: number;
  loanRecovery?: number;
  customDeductions?: number;
}

export interface PayrollCalculationResult {
  employeeId: string;
  baseSalary: number;
  rateCalculationMode: RateCalculationMode;
  dailyRate: number;
  totalApprovedLeaveDays: number;
  paidLeaveDays: number;
  unpaidLopDays: number;
  lopDeductionAmount: number;
  allowancesTotal: number;
  bonusAmount: number;
  statutoryDeductionsAmount: number;
  advanceRecoveryAmount: number;
  loanRecoveryAmount: number;
  customDeductionsAmount: number;
  grossSalary: number;
  totalDeductions: number;
  netPayable: number;
  excessDeductionLiability: number;
}

/**
 * Computes the daily rate based on mode, year, month, and configured working days
 */
export function calculateDailyRate(
  baseSalary: number,
  mode: RateCalculationMode,
  year: number,
  month: number, // 1 - 12
  configuredWorkingDays: number = 26
): number {
  if (baseSalary <= 0) return 0;

  switch (mode) {
    case "FIXED_30":
      return Number((baseSalary / 30.0).toFixed(2));

    case "CALENDAR_DAYS": {
      // Days in month including leap years
      const daysInMonth = new Date(year, month, 0).getDate();
      return Number((baseSalary / daysInMonth).toFixed(2));
    }

    case "WORKING_DAYS": {
      if (configuredWorkingDays <= 0) {
        throw new Error("Working days denominator cannot be zero or negative");
      }
      return Number((baseSalary / configuredWorkingDays).toFixed(2));
    }

    default:
      return Number((baseSalary / 30.0).toFixed(2));
  }
}

/**
 * Calculates individual employee payroll compensation breakdown
 */
export function calculateEmployeePayroll(
  item: PayrollInputItem,
  year: number,
  month: number,
  configuredWorkingDays: number = 26
): PayrollCalculationResult {
  const dailyRate = calculateDailyRate(
    item.baseSalary,
    item.rateCalculationMode,
    year,
    month,
    configuredWorkingDays
  );

  const lopDeduction = Number((dailyRate * item.approvedUnpaidLopDays).toFixed(2));
  const allowances = Number((item.allowances || 0).toFixed(2));
  const bonus = Number((item.bonus || 0).toFixed(2));
  const statutory = Number((item.statutoryDeductions || 0).toFixed(2));
  const advanceRec = Number((item.advanceRecovery || 0).toFixed(2));
  const loanRec = Number((item.loanRecovery || 0).toFixed(2));
  const customDed = Number((item.customDeductions || 0).toFixed(2));

  const grossSalary = Number((item.baseSalary + allowances + bonus).toFixed(2));
  const totalDeductions = Number(
    (lopDeduction + statutory + advanceRec + loanRec + customDed).toFixed(2)
  );

  let netPayable = 0;
  let excessDeductionLiability = 0;

  if (grossSalary >= totalDeductions) {
    netPayable = Number((grossSalary - totalDeductions).toFixed(2));
  } else {
    // Clamping net to zero MUST NOT erase excess liability
    netPayable = 0;
    excessDeductionLiability = Number((totalDeductions - grossSalary).toFixed(2));
  }

  return {
    employeeId: item.employeeId,
    baseSalary: item.baseSalary,
    rateCalculationMode: item.rateCalculationMode,
    dailyRate,
    totalApprovedLeaveDays: item.totalApprovedLeaveDays,
    paidLeaveDays: item.paidLeaveDays,
    unpaidLopDays: item.approvedUnpaidLopDays,
    lopDeductionAmount: lopDeduction,
    allowancesTotal: allowances,
    bonusAmount: bonus,
    statutoryDeductionsAmount: statutory,
    advanceRecoveryAmount: advanceRec,
    loanRecoveryAmount: loanRec,
    customDeductionsAmount: customDed,
    grossSalary,
    totalDeductions,
    netPayable,
    excessDeductionLiability,
  };
}
