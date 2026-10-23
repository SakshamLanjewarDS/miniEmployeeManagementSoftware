import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import {
  calculateDailyRate,
  calculateEmployeePayroll,
  getRateDivisor,
  RateCalculationMode,
} from "@/server/modules/payroll/engine";
import { allocateDaysAcrossMonths } from "@/server/modules/leave/policy";

const CalculateQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, "Year must be a 4-digit integer")
    .transform(Number)
    .refine((val) => val >= 1000 && val <= 9999, { message: "Year must be a valid 4-digit calendar year" })
    .optional(),
  month: z
    .string()
    .regex(/^\d{1,2}$/, "Month must be an integer between 1 and 12")
    .transform(Number)
    .refine((val) => val >= 1 && val <= 12, { message: "Month must be between 1 and 12" })
    .optional(),
  workingDays: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "workingDays must be a valid number between 1 and 31")
    .transform(Number)
    .refine((val) => val >= 1 && val <= 31, { message: "workingDays must be between 1 and 31" })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const validationResult = CalculateQuerySchema.safeParse({
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
      workingDays: searchParams.get("workingDays") ?? undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid query parameters" },
        { status: 400 }
      );
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const validated = validationResult.data;
    const now = new Date();
    const year = validated.year ?? now.getFullYear();
    const month = validated.month ?? now.getMonth() + 1;
    const configuredWorkingDays = validated.workingDays ?? 26;
    const employeeId = searchParams.get("employeeId") || undefined;

    let baseSalary = parseFloat(searchParams.get("baseSalary") || "0");
    let mode: RateCalculationMode = (searchParams.get("mode") as RateCalculationMode) || "FIXED_30";
    if (!["FIXED_30", "CALENDAR_DAYS", "WORKING_DAYS"].includes(mode)) {
      mode = "FIXED_30";
    }

    let approvedUnpaidLopDays = parseFloat(searchParams.get("unpaidLopDays") || "0");
    let approvedUnpaidHours = parseFloat(searchParams.get("unpaidHours") || "0");
    let totalApprovedLeaveDays = parseFloat(searchParams.get("approvedLeaveDays") || "0");
    let paidLeaveDays = parseFloat(searchParams.get("paidLeaveDays") || "0");
    let allowances = parseFloat(searchParams.get("allowances") || "0");
    let bonus = parseFloat(searchParams.get("bonus") || "0");
    let statutoryDeductions = parseFloat(searchParams.get("statutoryDeductions") || "0");
    let advanceRecovery = parseFloat(searchParams.get("advanceRecovery") || "0");
    let loanRecovery = parseFloat(searchParams.get("loanRecovery") || "0");
    let customDeductions = parseFloat(searchParams.get("customDeductions") || "0");

    let employeeInfo: any = null;
    let leaveRecords: any[] = [];
    let pendingCount = 0;
    let hasCompensation = false;

    // Load Studio Policy
    const leavePolicy = await prisma.studioLeavePolicy.findUnique({
      where: { tenantId: ctx.tenantId },
    });
    const monthlyPaidAllowance = leavePolicy?.defaultMonthlyPaidDays ? Number(leavePolicy.defaultMonthlyPaidDays) : 2.0;
    const workingMinutesPerDay = leavePolicy?.workingMinutesPerDay || 480;
    const configuredWorkdayHours = Math.round(workingMinutesPerDay / 60) || 8;

    // If employeeId is supplied, query employee, active compensation, leave requests, and loans
    if (employeeId) {
      const emp = await prisma.employee.findFirst({
        where: {
          tenantId: ctx.tenantId,
          OR: [{ id: employeeId }, { employeeId: employeeId }],
        },
        include: {
          membership: { include: { user: true } },
          compensations: { where: { isCurrent: true }, take: 1 },
          leaveRequests: { where: { deletedAt: null } },
          advanceLoans: { where: { status: "ACTIVE" } },
        },
      });

      if (emp) {
        const comp = emp.compensations[0];
        hasCompensation = !!comp;

        employeeInfo = {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.membership.user.fullName,
          email: emp.membership.user.email,
          designation: emp.designation || "Studio Staff",
          department: emp.department || "General",
          hasCompensation,
        };

        if (comp && !searchParams.has("baseSalary")) {
          baseSalary = Number(comp.baseMonthlySalary);
          if (!searchParams.has("mode")) {
            mode = comp.rateCalculationMode as RateCalculationMode;
          }
        }

        // Process leave requests for the target month & year
        if (!searchParams.has("unpaidLopDays") && !searchParams.has("unpaidHours")) {
          // Identify requests intersecting this month
          const intersectingItems: {
            request: (typeof emp.leaveRequests)[0];
            allocatedDays: number;
          }[] = [];

          for (const req of emp.leaveRequests) {
            const daysNum = Number(req.days);
            const allocations = allocateDaysAcrossMonths(req.startDate, req.endDate, daysNum);
            const mAlloc = allocations.find((a) => a.year === year && a.month === month);
            if (mAlloc && mAlloc.allocatedDays > 0) {
              intersectingItems.push({
                request: req,
                allocatedDays: mAlloc.allocatedDays,
              });
            }
          }

          // Separate into approved vs non-approved
          const approved = intersectingItems.filter((i) => i.request.status === "APPROVED");
          pendingCount = intersectingItems.filter((i) => i.request.status === "PENDING").length;

          // Split approved into day-based and hourly-based
          const dayApproved = approved.filter((i) => !i.request.isHourly);
          const hourlyApproved = approved.filter((i) => i.request.isHourly);

          // Sort day approved strictly chronologically
          dayApproved.sort((a, b) => {
            const dA = new Date(a.request.startDate).getTime();
            const dB = new Date(b.request.startDate).getTime();
            if (dA !== dB) return dA - dB;
            return new Date(a.request.submittedAt).getTime() - new Date(b.request.submittedAt).getTime();
          });

          let remAllowance = monthlyPaidAllowance;
          let calculatedApprovedDays = 0;
          let calculatedPaidDays = 0;
          let calculatedUnpaidDays = 0;
          let calculatedUnpaidHours = 0;

          // Process day leaves
          for (const item of dayApproved) {
            const req = item.request;
            const days = item.allocatedDays;
            calculatedApprovedDays += days;

            let paidPortion = 0;
            let unpaidPortion = 0;
            let treatment: "Paid" | "Unpaid" | "Mixed" = "Unpaid";

            if (!req.isPaidEligible || req.leaveType === "LOSS_OF_PAY") {
              unpaidPortion = days;
              treatment = "Unpaid";
            } else if (remAllowance > 0) {
              paidPortion = Math.min(days, remAllowance);
              unpaidPortion = Math.max(0, days - paidPortion);
              remAllowance = Math.max(0, remAllowance - paidPortion);
              if (unpaidPortion === 0) treatment = "Paid";
              else if (paidPortion === 0) treatment = "Unpaid";
              else treatment = "Mixed";
            } else {
              unpaidPortion = days;
              treatment = "Unpaid";
            }

            calculatedPaidDays += paidPortion;
            calculatedUnpaidDays += unpaidPortion;

            leaveRecords.push({
              id: req.id,
              startDate: req.startDate,
              endDate: req.endDate,
              displayDate: formatLeaveDisplayDate(req.startDate, req.endDate),
              duration: `${days} ${days === 1 ? "day" : "days"}`,
              durationDays: days,
              treatment,
              paidPortion: Number(paidPortion.toFixed(2)),
              unpaidPortion: Number(unpaidPortion.toFixed(2)),
              isHourly: false,
              status: req.status,
              leaveType: req.leaveType,
              reason: req.reason,
            });
          }

          // Process hourly leaves
          for (const item of hourlyApproved) {
            const req = item.request;
            const hours = req.totalMinutes ? req.totalMinutes / 60 : Number(req.days) * configuredWorkdayHours;
            const treatment: "Paid" | "Unpaid" = req.isPaidEligible && req.leaveType !== "LOSS_OF_PAY" ? "Paid" : "Unpaid";

            if (treatment === "Unpaid") {
              calculatedUnpaidHours += hours;
            }

            leaveRecords.push({
              id: req.id,
              startDate: req.startDate,
              endDate: req.endDate,
              displayDate: formatLeaveDisplayDate(req.startDate, req.endDate),
              duration: `${hours} ${hours === 1 ? "hr" : "hrs"}`,
              durationHours: hours,
              treatment,
              paidPortion: treatment === "Paid" ? hours : 0,
              unpaidPortion: treatment === "Unpaid" ? hours : 0,
              isHourly: true,
              status: req.status,
              leaveType: req.leaveType,
              reason: req.reason,
            });
          }

          totalApprovedLeaveDays = Number(calculatedApprovedDays.toFixed(2));
          paidLeaveDays = Number(calculatedPaidDays.toFixed(2));
          approvedUnpaidLopDays = Number(calculatedUnpaidDays.toFixed(2));
          approvedUnpaidHours = Number(calculatedUnpaidHours.toFixed(2));
        }

        // Active loan recoveries
        if (!searchParams.has("advanceRecovery") && !searchParams.has("loanRecovery")) {
          for (const loan of emp.advanceLoans) {
            const balance = Number(loan.balanceAmount);
            const monthly = Number(loan.monthlyRecoveryAmount);
            const deduction = Math.min(balance, monthly);
            if (loan.type === "SALARY_ADVANCE") {
              advanceRecovery += deduction;
            } else {
              loanRecovery += deduction;
            }
          }
        }
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const divisor = getRateDivisor(mode, year, month, configuredWorkingDays);

    // Primary calculation
    const calculation = calculateEmployeePayroll(
      {
        employeeId: employeeId || "SIMULATION",
        baseSalary,
        rateCalculationMode: mode,
        approvedUnpaidLopDays,
        totalApprovedLeaveDays,
        paidLeaveDays,
        unpaidLeaveHours: approvedUnpaidHours,
        configuredWorkdayHours,
        allowances,
        bonus,
        statutoryDeductions,
        advanceRecovery,
        loanRecovery,
        customDeductions,
      },
      year,
      month,
      configuredWorkingDays,
      configuredWorkdayHours
    );

    // Check draft status from database
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;
    let isSavedDraft = false;
    let isPeriodLocked = false;
    let lastSavedAt: Date | null = null;

    if (employeeInfo?.id) {
      const periodRecord = await prisma.studioPayrollRecord.findFirst({
        where: {
          tenantId: ctx.tenantId,
          employeeId: employeeInfo.id,
          period: { periodKey },
        },
        include: { period: true },
      });

      if (periodRecord) {
        isSavedDraft = true;
        isPeriodLocked = periodRecord.isLocked || periodRecord.period.isLocked;
        lastSavedAt = periodRecord.calculatedAt;
      }
    }

    const statusBadge = isPeriodLocked
      ? "Locked"
      : isSavedDraft
      ? "Saved draft"
      : "Draft estimate";

    return NextResponse.json({
      success: true,
      employee: employeeInfo,
      policy: {
        defaultMonthlyPaidDays: monthlyPaidAllowance,
        workingMinutesPerDay,
        workdayHours: configuredWorkdayHours,
        timezone: "Asia/Kolkata",
      },
      leaveAnalysis: {
        approvedLeaveDays: calculation.totalApprovedLeaveDays,
        paidAppliedDays: calculation.paidLeaveDays,
        unpaidDays: calculation.unpaidLopDays,
        unpaidHours: calculation.unpaidLeaveHours,
        pendingCount,
        leaveRecords,
        hourlySeparateNote:
          calculation.unpaidLeaveHours > 0
            ? `Hourly leave is separate from the ${calculation.totalApprovedLeaveDays} days.`
            : null,
      },
      inputs: {
        baseSalary,
        rateCalculationMode: mode,
        divisor,
        year,
        month,
        monthName: getMonthName(month),
        daysInMonth,
        configuredWorkingDays,
        configuredWorkdayHours,
        approvedUnpaidLopDays,
        approvedUnpaidHours,
        totalApprovedLeaveDays,
        paidLeaveDays,
        allowances,
        bonus,
        statutoryDeductions,
        advanceRecovery,
        loanRecovery,
        customDeductions,
      },
      calculation,
      draftStatus: {
        isDraft: !isPeriodLocked,
        isSaved: isSavedDraft,
        isLocked: isPeriodLocked,
        badgeText: statusBadge,
        lastSavedAt: lastSavedAt ? lastSavedAt.toISOString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate salary" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const {
      action = "CALCULATE",
      employeeId,
      baseSalary: rawBase = 0,
      rateCalculationMode: rawMode = "FIXED_30",
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      configuredWorkingDays = 26,
      configuredWorkdayHours = 8,
      approvedUnpaidLopDays = 0,
      unpaidHours = 0,
      totalApprovedLeaveDays = 0,
      paidLeaveDays = 0,
      allowances = 0,
      bonus = 0,
      statutoryDeductions = 0,
      advanceRecovery = 0,
      loanRecovery = 0,
      customDeductions = 0,
      notes,
    } = body;

    const baseSalary = Number(rawBase);
    let mode: RateCalculationMode = ["FIXED_30", "CALENDAR_DAYS", "WORKING_DAYS"].includes(rawMode)
      ? rawMode
      : "FIXED_30";

    const calculation = calculateEmployeePayroll(
      {
        employeeId: employeeId || "CUSTOM",
        baseSalary,
        rateCalculationMode: mode,
        approvedUnpaidLopDays: Number(approvedUnpaidLopDays),
        totalApprovedLeaveDays: Number(totalApprovedLeaveDays),
        paidLeaveDays: Number(paidLeaveDays),
        unpaidLeaveHours: Number(unpaidHours),
        configuredWorkdayHours: Number(configuredWorkdayHours),
        allowances: Number(allowances),
        bonus: Number(bonus),
        statutoryDeductions: Number(statutoryDeductions),
        advanceRecovery: Number(advanceRecovery),
        loanRecovery: Number(loanRecovery),
        customDeductions: Number(customDeductions),
      },
      year,
      month,
      configuredWorkingDays,
      configuredWorkdayHours
    );

    // If action is SAVE_DRAFT, persist to StudioPayrollPeriod and StudioPayrollRecord
    if (action === "SAVE_DRAFT") {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Leadership permissions required to save payroll draft" },
          { status: 403 }
        );
      }

      if (!employeeId) {
        return NextResponse.json(
          { error: "Employee must be selected to save draft calculation" },
          { status: 400 }
        );
      }

      const emp = await prisma.employee.findFirst({
        where: {
          tenantId: ctx.tenantId,
          OR: [{ id: employeeId }, { employeeId }],
        },
      });

      if (!emp) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }

      const periodKey = `${year}-${String(month).padStart(2, "0")}`;

      // Check if period is locked
      const existingPeriod = await prisma.studioPayrollPeriod.findUnique({
        where: {
          tenantId_periodKey: {
            tenantId: ctx.tenantId,
            periodKey,
          },
        },
      });

      if (existingPeriod && existingPeriod.isLocked) {
        return NextResponse.json(
          { error: `Cannot modify payroll: Period ${periodKey} is locked and finalized.` },
          { status: 400 }
        );
      }

      // Upsert draft period
      const period = await prisma.studioPayrollPeriod.upsert({
        where: {
          tenantId_periodKey: {
            tenantId: ctx.tenantId,
            periodKey,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          periodKey,
          year,
          month,
          monthName: getMonthName(month),
          state: "DRAFT",
          isLocked: false,
        },
        update: {},
      });

      // Upsert draft record
      const record = await prisma.studioPayrollRecord.upsert({
        where: {
          tenantId_periodId_employeeId: {
            tenantId: ctx.tenantId,
            periodId: period.id,
            employeeId: emp.id,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          periodId: period.id,
          employeeId: emp.id,
          baseSalary: new Prisma.Decimal(calculation.baseSalary),
          dailyRate: new Prisma.Decimal(calculation.dailyRate),
          rateCalculationMode: calculation.rateCalculationMode,
          totalApprovedLeaveDays: new Prisma.Decimal(calculation.totalApprovedLeaveDays),
          paidLeaveDays: new Prisma.Decimal(calculation.paidLeaveDays),
          unpaidLopDays: new Prisma.Decimal(calculation.unpaidLopDays),
          lopDeductionAmount: new Prisma.Decimal(calculation.lopDeductionAmount),
          allowancesTotal: new Prisma.Decimal(calculation.allowancesTotal),
          bonusAmount: new Prisma.Decimal(calculation.bonusAmount),
          statutoryDeductionsAmount: new Prisma.Decimal(calculation.statutoryDeductionsAmount),
          advanceRecoveryAmount: new Prisma.Decimal(calculation.advanceRecoveryAmount),
          loanRecoveryAmount: new Prisma.Decimal(calculation.loanRecoveryAmount),
          customDeductionsAmount: new Prisma.Decimal(calculation.customDeductionsAmount),
          grossSalary: new Prisma.Decimal(calculation.grossSalary),
          totalDeductions: new Prisma.Decimal(calculation.totalDeductions),
          netPayable: new Prisma.Decimal(calculation.netPayable),
          excessDeductionLiability: new Prisma.Decimal(calculation.excessDeductionLiability),
          paymentStatus: "PENDING",
          isLocked: false,
          calculatedById: ctx.membershipId,
          calculatedAt: new Date(),
          earningsBreakdownJson: {
            baseSalary: calculation.baseSalary,
            allowances: calculation.allowancesTotal,
            bonus: calculation.bonusAmount,
            grossSalary: calculation.grossSalary,
          },
          deductionsBreakdownJson: {
            divisor: calculation.divisor,
            workdayHours: calculation.workdayHours,
            dailyRate: calculation.dailyRate,
            hourlyRate: calculation.hourlyRate,
            unpaidDays: calculation.unpaidLopDays,
            unpaidHours: calculation.unpaidLeaveHours,
            dayDeduction: calculation.dayDeductionAmount,
            hourDeduction: calculation.hourDeductionAmount,
            roundingAdjustment: calculation.roundingAdjustmentAmount,
            leaveDeduction: calculation.lopDeductionAmount,
            advanceRecovery: calculation.advanceRecoveryAmount,
            loanRecovery: calculation.loanRecoveryAmount,
            statutoryDeductions: calculation.statutoryDeductionsAmount,
            otherDeductions: calculation.customDeductionsAmount,
            totalDeductions: calculation.totalDeductions,
          },
          notes: notes || `Draft saved via Salary & Leave Calculator on ${new Date().toLocaleDateString("en-IN")}`,
        },
        update: {
          baseSalary: new Prisma.Decimal(calculation.baseSalary),
          dailyRate: new Prisma.Decimal(calculation.dailyRate),
          rateCalculationMode: calculation.rateCalculationMode,
          totalApprovedLeaveDays: new Prisma.Decimal(calculation.totalApprovedLeaveDays),
          paidLeaveDays: new Prisma.Decimal(calculation.paidLeaveDays),
          unpaidLopDays: new Prisma.Decimal(calculation.unpaidLopDays),
          lopDeductionAmount: new Prisma.Decimal(calculation.lopDeductionAmount),
          allowancesTotal: new Prisma.Decimal(calculation.allowancesTotal),
          bonusAmount: new Prisma.Decimal(calculation.bonusAmount),
          statutoryDeductionsAmount: new Prisma.Decimal(calculation.statutoryDeductionsAmount),
          advanceRecoveryAmount: new Prisma.Decimal(calculation.advanceRecoveryAmount),
          loanRecoveryAmount: new Prisma.Decimal(calculation.loanRecoveryAmount),
          customDeductionsAmount: new Prisma.Decimal(calculation.customDeductionsAmount),
          grossSalary: new Prisma.Decimal(calculation.grossSalary),
          totalDeductions: new Prisma.Decimal(calculation.totalDeductions),
          netPayable: new Prisma.Decimal(calculation.netPayable),
          excessDeductionLiability: new Prisma.Decimal(calculation.excessDeductionLiability),
          calculatedById: ctx.membershipId,
          calculatedAt: new Date(),
          earningsBreakdownJson: {
            baseSalary: calculation.baseSalary,
            allowances: calculation.allowancesTotal,
            bonus: calculation.bonusAmount,
            grossSalary: calculation.grossSalary,
          },
          deductionsBreakdownJson: {
            divisor: calculation.divisor,
            workdayHours: calculation.workdayHours,
            dailyRate: calculation.dailyRate,
            hourlyRate: calculation.hourlyRate,
            unpaidDays: calculation.unpaidLopDays,
            unpaidHours: calculation.unpaidLeaveHours,
            dayDeduction: calculation.dayDeductionAmount,
            hourDeduction: calculation.hourDeductionAmount,
            roundingAdjustment: calculation.roundingAdjustmentAmount,
            leaveDeduction: calculation.lopDeductionAmount,
            advanceRecovery: calculation.advanceRecoveryAmount,
            loanRecovery: calculation.loanRecoveryAmount,
            statutoryDeductions: calculation.statutoryDeductionsAmount,
            otherDeductions: calculation.customDeductionsAmount,
            totalDeductions: calculation.totalDeductions,
          },
          notes: notes || `Draft updated via Salary & Leave Calculator on ${new Date().toLocaleDateString("en-IN")}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Draft calculation saved successfully.",
        recordId: record.id,
        periodKey,
        savedAt: record.calculatedAt.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      calculation,
      daysInMonth: new Date(year, month, 0).getDate(),
      configuredWorkingDays,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute salary calculation" },
      { status: 500 }
    );
  }
}

function formatLeaveDisplayDate(startDate: Date | string, endDate: Date | string): string {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sDay = String(s.getUTCDate()).padStart(2, "0");
  const sMonth = monthNamesShort[s.getUTCMonth()];
  const sYear = s.getUTCFullYear();
  const eDay = String(e.getUTCDate()).padStart(2, "0");
  const eMonth = monthNamesShort[e.getUTCMonth()];
  const eYear = e.getUTCFullYear();

  if (sDay === eDay && sMonth === eMonth && sYear === eYear) {
    return `${sDay} ${sMonth} ${sYear}`;
  }
  if (sMonth === eMonth && sYear === eYear) {
    return `${sDay} – ${eDay} ${sMonth} ${sYear}`;
  }
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
}

function getMonthName(month: number): string {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return names[month - 1] || `Month ${month}`;
}
