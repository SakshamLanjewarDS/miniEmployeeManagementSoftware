import { Decimal } from "@prisma/client/runtime/library";
export { Decimal };

/**
 * Standard Studio Constants & Working Schedule
 */
export const DEFAULT_MONTHLY_PAID_ALLOWANCE = 2.0; // 2.0 eligible paid days per calendar month
export const WORKING_MINUTES_PER_DAY = 480; // 8 hours = 480 minutes
export const HALF_DAY_MINUTES = 240; // 4 hours = 0.5 days
export const QUARTER_DAY_MINUTES = 120; // 2 hours = 0.25 days
export const EIGHTH_DAY_MINUTES = 60; // 1 hour = 0.125 days

export const DEFAULT_OFFICE_START_TIME = "10:30";
export const DEFAULT_OFFICE_END_TIME = "18:30";
export const DEFAULT_STUDIO_TIMEZONE = "Asia/Kolkata";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequestInput {
  id: string;
  employeeId: string;
  startDate: string | Date; // YYYY-MM-DD or Date
  endDate: string | Date;   // YYYY-MM-DD or Date
  days: number | Decimal;
  status: LeaveStatus;
  leaveType: string;
  isPaidEligible: boolean;
  isHalfDay?: boolean;
  isHourly?: boolean;
  startMinutes?: number | null;
  endMinutes?: number | null;
  totalMinutes?: number | null;
  submittedAt: string | Date;
  deletedAt?: string | Date | null;
  reason?: string | null;
  isExemptShortNotice?: boolean;
}

export interface MonthAllocationResult {
  year: number;
  month: number; // 1 - 12
  monthKey: string; // YYYY-MM
  allocatedDays: number;
}

export interface MonthlyLeaveSummary {
  year: number;
  month: number;
  monthKey: string;
  monthlyPaidAllowance: number;
  totalRequests: number;
  totalRequestedDays: number;
  totalApprovedDays: number;
  paidLeaveDays: number;
  unpaidLopDays: number;
  remainingPaidAllowance: number;
  pendingRequestsCount: number;
  pendingDays: number;
  hourlyTotalMinutes: number;
  requests: LeaveRequestWithAllocation[];
}

export interface LeaveRequestWithAllocation extends LeaveRequestInput {
  allocatedDaysInMonth: number;
  isPaidInMonth: number;
  isUnpaidInMonth: number;
}

/**
 * Converts minutes to exact fractional leave days
 * 480 -> 1.0, 240 -> 0.5, 120 -> 0.25, 60 -> 0.125
 */
export function minutesToDays(minutes: number): number {
  if (minutes <= 0) return 0;
  return Number((minutes / WORKING_MINUTES_PER_DAY).toFixed(3));
}

/**
 * Converts days to working minutes
 */
export function daysToMinutes(days: number): number {
  return Math.round(days * WORKING_MINUTES_PER_DAY);
}

/**
 * Normalizes date to Date object at UTC 00:00:00 for @db.Date fields
 */
export function parseDateOnly(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
  }
  const parts = dateInput.split("T")[0].split("-");
  return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Computes calendar days spanned between two dates inclusive
 */
export function countCalendarDaysInclusive(start: Date, end: Date): number {
  const s = parseDateOnly(start).getTime();
  const e = parseDateOnly(end).getTime();
  if (e < s) return 0;
  return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Cross-month proportional day allocation formula:
 * Month allocation = requested total quantity * (calendar days in month / total calendar days spanned)
 * Residual integer minute rounding ensures the sum across months equals total requested days exactly.
 */
export function allocateDaysAcrossMonths(
  startDate: string | Date,
  endDate: string | Date,
  totalRequestedDays: number
): MonthAllocationResult[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (end < start || totalRequestedDays <= 0) {
    return [];
  }

  const totalCalendarDays = countCalendarDaysInclusive(start, end);
  if (totalCalendarDays <= 0) return [];

  // Identify all distinct Year-Month buckets spanned
  const monthsSpanned: { year: number; month: number; daysInMonth: number }[] = [];
  const current = new Date(start);

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    let existing = monthsSpanned.find((entry) => entry.year === y && entry.month === m);
    if (!existing) {
      existing = { year: y, month: m, daysInMonth: 0 };
      monthsSpanned.push(existing);
    }
    existing.daysInMonth += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // If spans single month, entire quantity belongs to that month
  if (monthsSpanned.length === 1) {
    const entry = monthsSpanned[0];
    return [
      {
        year: entry.year,
        month: entry.month,
        monthKey: `${entry.year}-${String(entry.month).padStart(2, "0")}`,
        allocatedDays: totalRequestedDays,
      },
    ];
  }

  // Cross-month proportional allocation with minute-accurate residual rule
  const totalMinutes = Math.round(totalRequestedDays * WORKING_MINUTES_PER_DAY);
  let allocatedMinutesSum = 0;
  const results: MonthAllocationResult[] = [];

  for (let i = 0; i < monthsSpanned.length; i++) {
    const entry = monthsSpanned[i];
    const monthKey = `${entry.year}-${String(entry.month).padStart(2, "0")}`;

    if (i === monthsSpanned.length - 1) {
      // Terminal month gets exact residual to guarantee sum matches total requested minutes exactly
      const remainingMinutes = Math.max(0, totalMinutes - allocatedMinutesSum);
      const days = Number((remainingMinutes / WORKING_MINUTES_PER_DAY).toFixed(3));
      results.push({
        year: entry.year,
        month: entry.month,
        monthKey,
        allocatedDays: days,
      });
    } else {
      const monthMinutes = Math.round(
        (totalMinutes * entry.daysInMonth) / totalCalendarDays
      );
      allocatedMinutesSum += monthMinutes;
      const days = Number((monthMinutes / WORKING_MINUTES_PER_DAY).toFixed(3));
      results.push({
        year: entry.year,
        month: entry.month,
        monthKey,
        allocatedDays: days,
      });
    }
  }

  return results;
}

/**
 * Checks if a leave request is submitted on short notice (< 24 hours prior to leave start)
 */
export function evaluateShortNotice(
  submittedAt: string | Date,
  startDate: string | Date,
  startMinutes: number | null = null,
  leaveType: string = "CASUAL",
  reason: string = "",
  isExemptFlag: boolean = false,
  isHourly: boolean = false,
  sessionType?: string | null
): { isShortNotice: boolean; isExempt: boolean; shouldAutoReject: boolean; rejectionReason?: string } {
  const subDate = new Date(submittedAt);
  const startDay = parseDateOnly(startDate);

  // Default office start is 10:30 AM (630 minutes from midnight)
  // For Second Half: 14:30 PM (870 minutes from midnight)
  let officeMinutes = 10 * 60 + 30; // 630
  if (sessionType === "SECOND_HALF") {
    officeMinutes = 14 * 60 + 30; // 870
  } else if (startMinutes !== null && startMinutes !== undefined) {
    officeMinutes = startMinutes;
  }

  const y = startDay.getUTCFullYear();
  const m = startDay.getUTCMonth();
  const d = startDay.getUTCDate();
  // Target office time in IST (+5:30) converted to UTC
  const targetStartTime = new Date(
    Date.UTC(y, m, d, Math.floor(officeMinutes / 60), officeMinutes % 60, 0) - (5.5 * 60 * 60 * 1000)
  );

  const diffMs = targetStartTime.getTime() - subDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const isShortNotice = diffHours < 24;

  // Medical / Sick, Emergency, and Hourly leaves are exempt from 24h notice requirement
  const normalizedType = leaveType.toUpperCase();
  const normalizedReason = (reason || "").toLowerCase();
  const isExempt =
    isExemptFlag ||
    isHourly ||
    normalizedType === "SICK" ||
    normalizedType === "EMERGENCY" ||
    normalizedReason.includes("medical") ||
    normalizedReason.includes("emergency") ||
    normalizedReason.includes("hospital");

  const shouldAutoReject = isShortNotice && !isExempt;
  const rejectionReason = shouldAutoReject
    ? "Auto-rejected: Ordinary leave requires at least 24 hours advance notice."
    : undefined;

  return { isShortNotice, isExempt, shouldAutoReject, rejectionReason };
}

/**
 * Central Monthly Leave Calculation Engine
 * Computes monthly paid vs unpaid (Loss of Pay) days according to studio policy:
 * 1. Default allowance: 2.0 eligible paid days per calendar month.
 * 2. Approved eligible requests consume allowance strictly ordered by (startDate ASC, submittedAt ASC, id ASC).
 * 3. Pending, Rejected, Cancelled, and deleted requests do not consume paid allowance.
 * 4. Explicitly unpaid requests remain unpaid.
 * 5. Excess over allowance becomes Unpaid LOP.
 */
export function calculateMonthlyLeaveSummary(
  targetYear: number,
  targetMonth: number, // 1 - 12
  employeeRequests: LeaveRequestInput[],
  monthlyAllowance = DEFAULT_MONTHLY_PAID_ALLOWANCE
): MonthlyLeaveSummary {
  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  // Filter requests that intersect this month and are not soft-deleted
  const intersectingRequests: {
    request: LeaveRequestInput;
    allocatedDays: number;
  }[] = [];

  for (const req of employeeRequests) {
    if (req.deletedAt) continue;

    const daysNum = req.days instanceof Decimal ? Number(req.days) : Number(req.days);
    const allocations = allocateDaysAcrossMonths(req.startDate, req.endDate, daysNum);
    const monthAlloc = allocations.find((a) => a.year === targetYear && a.month === targetMonth);

    if (monthAlloc && monthAlloc.allocatedDays > 0) {
      intersectingRequests.push({
        request: req,
        allocatedDays: monthAlloc.allocatedDays,
      });
    }
  }

  // Sort approved requests strictly chronologically: (startDate ASC, submittedAt ASC, id ASC)
  const approvedRequests = intersectingRequests
    .filter((item) => item.request.status === "APPROVED")
    .sort((a, b) => {
      const dateA = parseDateOnly(a.request.startDate).getTime();
      const dateB = parseDateOnly(b.request.startDate).getTime();
      if (dateA !== dateB) return dateA - dateB;

      const subA = new Date(a.request.submittedAt).getTime();
      const subB = new Date(b.request.submittedAt).getTime();
      if (subA !== subB) return subA - subB;

      return a.request.id.localeCompare(b.request.id);
    });

  let remainingAllowance = monthlyAllowance;
  let totalApprovedDays = 0;
  let paidDays = 0;
  let unpaidLopDays = 0;
  let hourlyTotalMinutes = 0;

  const processedRequests: LeaveRequestWithAllocation[] = [];

  for (const item of approvedRequests) {
    const req = item.request;
    const allocDays = item.allocatedDays;
    totalApprovedDays += allocDays;

    if (req.isHourly && req.totalMinutes) {
      hourlyTotalMinutes += req.totalMinutes;
    }

    if (!req.isPaidEligible || req.leaveType === "LOSS_OF_PAY") {
      // Explicitly unpaid leave does not consume paid allowance
      unpaidLopDays += allocDays;
      processedRequests.push({
        ...req,
        allocatedDaysInMonth: allocDays,
        isPaidInMonth: 0,
        isUnpaidInMonth: allocDays,
      });
    } else {
      // Eligible for paid allowance
      if (remainingAllowance > 0) {
        const canPay = Math.min(allocDays, remainingAllowance);
        const unpaidPortion = Math.max(0, allocDays - canPay);

        paidDays += canPay;
        unpaidLopDays += unpaidPortion;
        remainingAllowance = Math.max(0, remainingAllowance - canPay);

        processedRequests.push({
          ...req,
          allocatedDaysInMonth: allocDays,
          isPaidInMonth: Number(canPay.toFixed(3)),
          isUnpaidInMonth: Number(unpaidPortion.toFixed(3)),
        });
      } else {
        // Allowance exhausted: entire request is LOP
        unpaidLopDays += allocDays;
        processedRequests.push({
          ...req,
          allocatedDaysInMonth: allocDays,
          isPaidInMonth: 0,
          isUnpaidInMonth: allocDays,
        });
      }
    }
  }

  // Process non-approved requests (Pending, Rejected, Cancelled)
  let totalRequestedDays = totalApprovedDays;
  let pendingRequestsCount = 0;
  let pendingDays = 0;

  for (const item of intersectingRequests) {
    if (item.request.status !== "APPROVED") {
      totalRequestedDays += item.allocatedDays;
      if (item.request.status === "PENDING") {
        pendingRequestsCount += 1;
        pendingDays += item.allocatedDays;
      }
      processedRequests.push({
        ...item.request,
        allocatedDaysInMonth: item.allocatedDays,
        isPaidInMonth: 0,
        isUnpaidInMonth: 0,
      });
    }
  }

  return {
    year: targetYear,
    month: targetMonth,
    monthKey,
    monthlyPaidAllowance: monthlyAllowance,
    totalRequests: intersectingRequests.length,
    totalRequestedDays: Number(totalRequestedDays.toFixed(3)),
    totalApprovedDays: Number(totalApprovedDays.toFixed(3)),
    paidLeaveDays: Number(paidDays.toFixed(3)),
    unpaidLopDays: Number(unpaidLopDays.toFixed(3)),
    remainingPaidAllowance: Number(remainingAllowance.toFixed(3)),
    pendingRequestsCount,
    pendingDays: Number(pendingDays.toFixed(3)),
    hourlyTotalMinutes,
    requests: processedRequests,
  };
}
