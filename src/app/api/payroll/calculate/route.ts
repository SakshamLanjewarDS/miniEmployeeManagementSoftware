import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { calculateDailyRate, calculateEmployeePayroll, RateCalculationMode } from "@/server/modules/payroll/engine";
import { calculateMonthlyLeaveSummary } from "@/server/modules/leave/policy";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const employeeId = searchParams.get("employeeId") || undefined;
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const configuredWorkingDays = Math.max(1, parseInt(searchParams.get("workingDays") || "26", 10));

    let baseSalary = parseFloat(searchParams.get("baseSalary") || "0");
    let mode: RateCalculationMode = (searchParams.get("mode") as RateCalculationMode) || "FIXED_30";
    if (!["FIXED_30", "CALENDAR_DAYS", "WORKING_DAYS"].includes(mode)) {
      mode = "FIXED_30";
    }

    let approvedUnpaidLopDays = parseFloat(searchParams.get("unpaidLopDays") || "0");
    let totalApprovedLeaveDays = parseFloat(searchParams.get("approvedLeaveDays") || "0");
    let paidLeaveDays = parseFloat(searchParams.get("paidLeaveDays") || "0");
    let allowances = parseFloat(searchParams.get("allowances") || "0");
    let bonus = parseFloat(searchParams.get("bonus") || "0");
    let statutoryDeductions = parseFloat(searchParams.get("statutoryDeductions") || "0");
    let advanceRecovery = parseFloat(searchParams.get("advanceRecovery") || "0");
    let loanRecovery = parseFloat(searchParams.get("loanRecovery") || "0");
    let customDeductions = parseFloat(searchParams.get("customDeductions") || "0");

    let employeeInfo: any = null;

    // If an employeeId is provided, pull real studio records
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
        employeeInfo = {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.membership.user.fullName,
          email: emp.membership.user.email,
          designation: emp.designation,
          department: emp.department,
        };

        const comp = emp.compensations[0];
        if (comp && !searchParams.has("baseSalary")) {
          baseSalary = Number(comp.baseMonthlySalary);
          if (!searchParams.has("mode")) {
            mode = comp.rateCalculationMode as RateCalculationMode;
          }
        }

        if (!searchParams.has("unpaidLopDays")) {
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
          approvedUnpaidLopDays = leaveSummary.unpaidLopDays;
          totalApprovedLeaveDays = leaveSummary.totalApprovedDays;
          paidLeaveDays = leaveSummary.paidLeaveDays;
        }

        if (!searchParams.has("advanceRecovery") && !searchParams.has("loanRecovery")) {
          for (const loan of emp.advanceLoans) {
            const balance = Number(loan.balanceAmount);
            const monthly = Number(loan.monthlyRecoveryAmount);
            const deduction = Math.min(balance, monthly);
            if (loan.loanType === "SALARY_ADVANCE") {
              advanceRecovery += deduction;
            } else {
              loanRecovery += deduction;
            }
          }
        }
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    // Primary calculation
    const calculation = calculateEmployeePayroll(
      {
        employeeId: employeeId || "SIMULATION",
        baseSalary,
        rateCalculationMode: mode,
        approvedUnpaidLopDays,
        totalApprovedLeaveDays,
        paidLeaveDays,
        allowances,
        bonus,
        statutoryDeductions,
        advanceRecovery,
        loanRecovery,
        customDeductions,
      },
      year,
      month,
      configuredWorkingDays
    );

    // Multi-mode comparison across all 3 Project 2 modes
    const fixed30DailyRate = calculateDailyRate(baseSalary, "FIXED_30", year, month, configuredWorkingDays);
    const fixed30Lop = Number((fixed30DailyRate * approvedUnpaidLopDays).toFixed(2));
    const fixed30Net = Math.max(
      0,
      Number((calculation.grossSalary - (fixed30Lop + statutoryDeductions + advanceRecovery + loanRecovery + customDeductions)).toFixed(2))
    );

    const calendarDailyRate = calculateDailyRate(baseSalary, "CALENDAR_DAYS", year, month, configuredWorkingDays);
    const calendarLop = Number((calendarDailyRate * approvedUnpaidLopDays).toFixed(2));
    const calendarNet = Math.max(
      0,
      Number((calculation.grossSalary - (calendarLop + statutoryDeductions + advanceRecovery + loanRecovery + customDeductions)).toFixed(2))
    );

    const workingDaysDailyRate = calculateDailyRate(baseSalary, "WORKING_DAYS", year, month, configuredWorkingDays);
    const workingDaysLop = Number((workingDaysDailyRate * approvedUnpaidLopDays).toFixed(2));
    const workingDaysNet = Math.max(
      0,
      Number((calculation.grossSalary - (workingDaysLop + statutoryDeductions + advanceRecovery + loanRecovery + customDeductions)).toFixed(2))
    );

    // Step-by-step mathematical explanations
    const modeDenominator =
      mode === "FIXED_30" ? "30.0 (Standard Studio Rule)" : mode === "CALENDAR_DAYS" ? `${daysInMonth} (Days in ${getMonthName(month)})` : `${configuredWorkingDays} (Working Days)`;

    const formulas = {
      dailyRate: {
        formula: `Base Salary / Denominator`,
        equation: `₹${baseSalary.toLocaleString("en-IN")} / ${modeDenominator} = ₹${calculation.dailyRate.toLocaleString("en-IN")}/day`,
        value: calculation.dailyRate,
      },
      lopDeduction: {
        formula: `Daily Rate × Approved Unpaid LOP Days`,
        equation: `₹${calculation.dailyRate.toLocaleString("en-IN")} × ${approvedUnpaidLopDays} days = ₹${calculation.lopDeductionAmount.toLocaleString("en-IN")}`,
        value: calculation.lopDeductionAmount,
      },
      grossSalary: {
        formula: `Base Monthly Salary + Allowances + Bonus`,
        equation: `₹${baseSalary.toLocaleString("en-IN")} + ₹${allowances.toLocaleString("en-IN")} + ₹${bonus.toLocaleString("en-IN")} = ₹${calculation.grossSalary.toLocaleString("en-IN")}`,
        value: calculation.grossSalary,
      },
      totalDeductions: {
        formula: `LOP Deduction + Statutory (PF/PT) + Advances + Loans + Custom`,
        equation: `₹${calculation.lopDeductionAmount.toLocaleString("en-IN")} + ₹${statutoryDeductions.toLocaleString("en-IN")} + ₹${advanceRecovery.toLocaleString("en-IN")} + ₹${loanRecovery.toLocaleString("en-IN")} + ₹${customDeductions.toLocaleString("en-IN")} = ₹${calculation.totalDeductions.toLocaleString("en-IN")}`,
        value: calculation.totalDeductions,
      },
      netPayable: {
        formula: `max(0.0, Gross Salary - Total Deductions)`,
        equation: `max(0, ₹${calculation.grossSalary.toLocaleString("en-IN")} - ₹${calculation.totalDeductions.toLocaleString("en-IN")}) = ₹${calculation.netPayable.toLocaleString("en-IN")}`,
        value: calculation.netPayable,
      },
      excessDeductionLiability: {
        formula: `Total Deductions - Gross Salary (preserved if deductions > gross)`,
        equation: calculation.excessDeductionLiability > 0
          ? `₹${calculation.totalDeductions.toLocaleString("en-IN")} - ₹${calculation.grossSalary.toLocaleString("en-IN")} = ₹${calculation.excessDeductionLiability.toLocaleString("en-IN")} (Carried Forward)`
          : `₹0.00 (Fully Covered)`,
        value: calculation.excessDeductionLiability,
      },
    };

    return NextResponse.json({
      success: true,
      employee: employeeInfo,
      inputs: {
        baseSalary,
        rateCalculationMode: mode,
        year,
        month,
        monthName: getMonthName(month),
        daysInMonth,
        configuredWorkingDays,
        approvedUnpaidLopDays,
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
      formulas,
      modeComparison: {
        FIXED_30: {
          modeName: "Fixed 30 Days (Studio Standard)",
          denominator: 30,
          dailyRate: fixed30DailyRate,
          lopDeduction: fixed30Lop,
          netPayable: fixed30Net,
          isCurrentSelected: mode === "FIXED_30",
        },
        CALENDAR_DAYS: {
          modeName: `Calendar Days (${daysInMonth} Days in ${getMonthName(month)})`,
          denominator: daysInMonth,
          dailyRate: calendarDailyRate,
          lopDeduction: calendarLop,
          netPayable: calendarNet,
          isCurrentSelected: mode === "CALENDAR_DAYS",
        },
        WORKING_DAYS: {
          modeName: `Working Days (${configuredWorkingDays} Working Days)`,
          denominator: configuredWorkingDays,
          dailyRate: workingDaysDailyRate,
          lopDeduction: workingDaysLop,
          netPayable: workingDaysNet,
          isCurrentSelected: mode === "WORKING_DAYS",
        },
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
      employeeId,
      baseSalary: rawBase = 0,
      rateCalculationMode: rawMode = "FIXED_30",
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      configuredWorkingDays = 26,
      approvedUnpaidLopDays = 0,
      totalApprovedLeaveDays = 0,
      paidLeaveDays = 0,
      allowances = 0,
      bonus = 0,
      statutoryDeductions = 0,
      advanceRecovery = 0,
      loanRecovery = 0,
      customDeductions = 0,
    } = body;

    const baseSalary = Number(rawBase);
    let mode: RateCalculationMode = ["FIXED_30", "CALENDAR_DAYS", "WORKING_DAYS"].includes(rawMode)
      ? rawMode
      : "FIXED_30";

    const daysInMonth = new Date(year, month, 0).getDate();

    const calculation = calculateEmployeePayroll(
      {
        employeeId: employeeId || "CUSTOM",
        baseSalary,
        rateCalculationMode: mode,
        approvedUnpaidLopDays: Number(approvedUnpaidLopDays),
        totalApprovedLeaveDays: Number(totalApprovedLeaveDays),
        paidLeaveDays: Number(paidLeaveDays),
        allowances: Number(allowances),
        bonus: Number(bonus),
        statutoryDeductions: Number(statutoryDeductions),
        advanceRecovery: Number(advanceRecovery),
        loanRecovery: Number(loanRecovery),
        customDeductions: Number(customDeductions),
      },
      year,
      month,
      configuredWorkingDays
    );

    return NextResponse.json({
      success: true,
      calculation,
      daysInMonth,
      configuredWorkingDays,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute salary calculation" }, { status: 500 });
  }
}

function getMonthName(month: number): string {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return names[month - 1] || `Month ${month}`;
}
