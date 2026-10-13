import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly, formatDateOnly, countCalendarDaysInclusive } from "./policy";

export interface DateAbsenceEntry {
  date: string; // YYYY-MM-DD
  totalAbsent: number;
  approvedCount: number;
  pendingCount: number;
  hasCollision: boolean; // >= 2 staff absent
  isBottleneck: boolean; // >= 3 staff absent or critical department overlap
  departmentCounts: Record<string, number>;
  absentEmployees: {
    leaveId: string;
    employeeId: string;
    employeeName: string;
    department: string;
    status: string;
    leaveType: string;
    days: number;
    isHalfDay: boolean;
    isHourly: boolean;
  }[];
}

export interface MonthlyCalendarMatrix {
  year: number;
  month: number;
  monthKey: string;
  totalUniqueEmployeesAbsent: number;
  totalAbsenceDaysCount: number;
  maxCollisionCount: number;
  criticalDates: string[];
  days: DateAbsenceEntry[];
}

/**
 * Computes monthly team absence matrix and visual collision heatmap for Owner/Admin calendar.
 */
export async function getTeamLeaveCalendarMatrix(
  context: TenantContext,
  targetYear: number,
  targetMonth: number,
  departmentFilter?: string
): Promise<MonthlyCalendarMatrix> {
  assertAdminOrOwner(context);

  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const firstDay = new Date(targetYear, targetMonth - 1, 1);
  const lastDay = new Date(targetYear, targetMonth, 0); // Last day of month
  const totalDaysInMonth = lastDay.getDate();

  // Query leaves intersecting this month
  const leaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      deletedAt: null,
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: lastDay },
      endDate: { gte: firstDay },
      ...(departmentFilter ? { employee: { department: departmentFilter } } : {}),
    },
    include: {
      employee: {
        include: {
          membership: {
            include: { user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  // Initialize matrix for each day of the month
  const dayMap = new Map<string, DateAbsenceEntry>();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const curDate = new Date(targetYear, targetMonth - 1, d);
    const dateStr = formatDateOnly(curDate);
    dayMap.set(dateStr, {
      date: dateStr,
      totalAbsent: 0,
      approvedCount: 0,
      pendingCount: 0,
      hasCollision: false,
      isBottleneck: false,
      departmentCounts: {},
      absentEmployees: [],
    });
  }

  const uniqueEmployeesSet = new Set<string>();
  let totalAbsenceDaysCount = 0;

  for (const leave of leaves) {
    uniqueEmployeesSet.add(leave.employeeId);
    const empName = leave.employeeNameRaw || leave.employee.membership.user.fullName;
    const dept = leave.employee.department || "General";
    const leaveStart = parseDateOnly(leave.startDate);
    const leaveEnd = parseDateOnly(leave.endDate);

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(targetYear, targetMonth - 1, d);
      if (curDate >= leaveStart && curDate <= leaveEnd) {
        const dateStr = formatDateOnly(curDate);
        const dayEntry = dayMap.get(dateStr);
        if (dayEntry) {
          dayEntry.totalAbsent += 1;
          totalAbsenceDaysCount += 1;
          if (leave.status === "APPROVED") {
            dayEntry.approvedCount += 1;
          } else {
            dayEntry.pendingCount += 1;
          }

          dayEntry.departmentCounts[dept] = (dayEntry.departmentCounts[dept] || 0) + 1;

          dayEntry.absentEmployees.push({
            leaveId: leave.id,
            employeeId: leave.employee.employeeId,
            employeeName: empName,
            department: dept,
            status: leave.status,
            leaveType: leave.leaveType,
            days: Number(leave.days),
            isHalfDay: leave.isHalfDay,
            isHourly: leave.isHourly,
          });

          if (dayEntry.totalAbsent >= 2) {
            dayEntry.hasCollision = true;
          }
          if (dayEntry.totalAbsent >= 3) {
            dayEntry.isBottleneck = true;
          }
        }
      }
    }
  }

  const daysList = Array.from(dayMap.values());
  let maxCollision = 0;
  const criticalDates: string[] = [];

  for (const day of daysList) {
    if (day.totalAbsent > maxCollision) {
      maxCollision = day.totalAbsent;
    }
    if (day.isBottleneck) {
      criticalDates.push(day.date);
    }
  }

  return {
    year: targetYear,
    month: targetMonth,
    monthKey,
    totalUniqueEmployeesAbsent: uniqueEmployeesSet.size,
    totalAbsenceDaysCount,
    maxCollisionCount: maxCollision,
    criticalDates,
    days: daysList,
  };
}
