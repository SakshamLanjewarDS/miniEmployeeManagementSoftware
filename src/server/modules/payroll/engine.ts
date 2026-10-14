import { Decimal } from "@prisma/client/runtime/library";

export type RateCalculationMode = "FIXED_30" | "CALENDAR_DAYS" | "WORKING_DAYS";

export interface PayrollInputItem {
  employeeId: string;
  baseSalary: number;
  rateCalculationMode: RateCalculationMode;
  approvedUnpaidLopDays: number; // Unpaid leave days from monthly leave service
  totalApprovedLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveHours?: number; // Unpaid leave hours (separate from days)
  configuredWorkdayHours?: number; // Configured workday hours (default 8)
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
  divisor: number;
  workdayHours: number;
  dailyRate: number;
  hourlyRate: number;
  totalApprovedLeaveDays: number;
  paidLeaveDays: number;
  unpaidLopDays: number;
  unpaidLeaveHours: number;
  dayDeductionAmount: number;
  hourDeductionAmount: number;
  roundingAdjustmentAmount: number;
  lopDeductionAmount: number; // Total leave deduction (day deduction + hour deduction + rounding)
  allowancesTotal: number;
  bonusAmount: number;
  statutoryDeductionsAmount: number;
  advanceRecoveryAmount: number;
  loanRecoveryAmount: number;
  customDeductionsAmount: number;
  otherDeductionsAmount: number;
  grossSalary: number;
  totalDeductions: number;
  netPayable: number;
  excessDeductionLiability: number;
}

/**
 * Returns the divisor (denominator) used for the given mode, year, month, and configured working days.
 */
export function getRateDivisor(
  mode: RateCalculationMode,
  year: number,
  month: number,
  configuredWorkingDays: number = 26
): number {
  switch (mode) {
    case "FIXED_30":
      return 30;
    case "CALENDAR_DAYS":
      return new Date(year, month, 0).getDate();
    case "WORKING_DAYS":
      if (configuredWorkingDays <= 0) {
        throw new Error("Working days denominator cannot be zero or negative");
      }
      return configuredWorkingDays;
    default:
      return 30;
  }
}

/**
 * Computes exact (unrounded) daily rate based on mode, year, month, and configured working days.
 */
export function calculateExactDailyRate(
  baseSalary: number,
  mode: RateCalculationMode,
  year: number,
  month: number,
  configuredWorkingDays: number = 26
): number {
  if (baseSalary <= 0) return 0;
  const divisor = getRateDivisor(mode, year, month, configuredWorkingDays);
  return baseSalary / divisor;
}

/**
 * Computes the displayed daily rate (rounded to 2 decimal places).
 */
export function calculateDailyRate(
  baseSalary: number,
  mode: RateCalculationMode,
  year: number,
  month: number, // 1 - 12
  configuredWorkingDays: number = 26
): number {
  if (baseSalary <= 0) return 0;
  return Number(calculateExactDailyRate(baseSalary, mode, year, month, configuredWorkingDays).toFixed(2));
}

/**
 * Calculates individual employee payroll compensation breakdown
 */
export function calculateEmployeePayroll(
  item: PayrollInputItem,
  year: number,
  month: number,
  configuredWorkingDays: number = 26,
  configuredWorkdayHours: number = 8
): PayrollCalculationResult {
  const divisor = getRateDivisor(item.rateCalculationMode, year, month, configuredWorkingDays);
  const exactDaily = calculateExactDailyRate(
    item.baseSalary,
    item.rateCalculationMode,
    year,
    month,
    configuredWorkingDays
  );

  const workdayHours = item.configuredWorkdayHours || configuredWorkdayHours || 8;
  const exactHourly = exactDaily > 0 && workdayHours > 0 ? exactDaily / workdayHours : 0;

  const dailyRate = Number(exactDaily.toFixed(2));
  const hourlyRate = Number(exactHourly.toFixed(2));

  const unpaidDays = Number(item.approvedUnpaidLopDays || 0);
  const unpaidHours = Number(item.unpaidLeaveHours || 0);

  // Full-precision calculation to avoid component rounding distortion
  const exactDayDeduction = unpaidDays * exactDaily;
  const exactHourDeduction = unpaidHours * exactHourly;
  const exactAggregateLop = exactDayDeduction + exactHourDeduction;

  const dayDeductionAmount = Number(exactDayDeduction.toFixed(2));
  const hourDeductionAmount = Number(exactHourDeduction.toFixed(2));
  const lopDeductionAmount = Number(exactAggregateLop.toFixed(2));

  // Rounding reconciliation: difference between displayed aggregate and sum of displayed components
  const componentSum = Number((dayDeductionAmount + hourDeductionAmount).toFixed(2));
  const roundingAdjustmentAmount = Number((lopDeductionAmount - componentSum).toFixed(2));

  const allowances = Number((item.allowances || 0).toFixed(2));
  const bonus = Number((item.bonus || 0).toFixed(2));
  const statutory = Number((item.statutoryDeductions || 0).toFixed(2));
  const advanceRec = Number((item.advanceRecovery || 0).toFixed(2));
  const loanRec = Number((item.loanRecovery || 0).toFixed(2));
  const customDed = Number((item.customDeductions || 0).toFixed(2));

  const grossSalary = Number((item.baseSalary + allowances + bonus).toFixed(2));
  const otherDeductions = Number((statutory + advanceRec + loanRec + customDed).toFixed(2));
  const totalDeductions = Number((lopDeductionAmount + otherDeductions).toFixed(2));

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
    divisor,
    workdayHours,
    dailyRate,
    hourlyRate,
    totalApprovedLeaveDays: item.totalApprovedLeaveDays,
    paidLeaveDays: item.paidLeaveDays,
    unpaidLopDays: unpaidDays,
    unpaidLeaveHours: unpaidHours,
    dayDeductionAmount,
    hourDeductionAmount,
    roundingAdjustmentAmount,
    lopDeductionAmount,
    allowancesTotal: allowances,
    bonusAmount: bonus,
    statutoryDeductionsAmount: statutory,
    advanceRecoveryAmount: advanceRec,
    loanRecoveryAmount: loanRec,
    customDeductionsAmount: customDed,
    otherDeductionsAmount: otherDeductions,
    grossSalary,
    totalDeductions,
    netPayable,
    excessDeductionLiability,
  };
}
