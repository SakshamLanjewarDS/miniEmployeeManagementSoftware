import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly, formatDateOnly } from "../leave/policy";

export interface AttendanceFilterOptions {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: string; // PRESENT, HALF_DAY, ABSENT, ON_LEAVE, MISSING_PUNCH
  page?: number;
  pageSize?: number;
}

export interface AttendancePunchCorrectionInput {
  recordId: string;
  punchIn?: string; // ISO datetime
  punchOut?: string; // ISO datetime
  status?: string;
  correctionReason: string;
}

/**
 * Lists attendance records with employee filters and missing punch indicators.
 * Strictly Owner/Admin accessible.
 */
export async function listAttendanceRecords(
  context: TenantContext,
  options: AttendanceFilterOptions = {}
) {
  assertAdminOrOwner(context);

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 30));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    tenantId: context.tenantId,
  };

  if (options.date) {
    whereClause.date = parseDateOnly(options.date);
  } else if (options.startDate || options.endDate) {
    whereClause.date = {};
    if (options.startDate) whereClause.date.gte = parseDateOnly(options.startDate);
    if (options.endDate) whereClause.date.lte = parseDateOnly(options.endDate);
  }

  if (options.employeeId) {
    whereClause.employeeId = options.employeeId;
  }

  if (options.status) {
    whereClause.status = options.status;
  }

  const [totalCount, records] = await Promise.all([
    prisma.studioAttendanceRecord.count({ where: whereClause }),
    prisma.studioAttendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            membership: {
              include: {
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
        correctedBy: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { employee: { employeeId: "asc" } }],
      skip,
      take: pageSize,
    }),
  ]);

  // Compute daily summary stats if single date filter is provided
  let summary = {
    totalRecords: totalCount,
    presentCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    onLeaveCount: 0,
    missingPunchCount: 0,
  };

  if (options.date) {
    const allForDate = await prisma.studioAttendanceRecord.findMany({
      where: {
        tenantId: context.tenantId,
        date: parseDateOnly(options.date),
      },
      select: { status: true, punchIn: true, punchOut: true },
    });

    for (const r of allForDate) {
      if (r.status === "PRESENT") summary.presentCount++;
      else if (r.status === "HALF_DAY") summary.halfDayCount++;
      else if (r.status === "ABSENT") summary.absentCount++;
      else if (r.status === "ON_LEAVE") summary.onLeaveCount++;

      if (r.status === "MISSING_PUNCH" || (r.punchIn && !r.punchOut)) {
        summary.missingPunchCount++;
      }
    }
  }

  return {
    records,
    summary,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Submits an audited manual attendance punch correction
 */
export async function correctAttendancePunch(
  context: TenantContext,
  input: AttendancePunchCorrectionInput
) {
  assertAdminOrOwner(context);

  if (!input.correctionReason || input.correctionReason.trim().length === 0) {
    throw new Error("Audited correction reason is mandatory for manual punch adjustments");
  }

  const record = await prisma.studioAttendanceRecord.findFirst({
    where: {
      id: input.recordId,
      tenantId: context.tenantId,
    },
  });

  if (!record) {
    throw new Error("Attendance record not found");
  }

  const pIn = input.punchIn ? new Date(input.punchIn) : record.punchIn;
  const pOut = input.punchOut ? new Date(input.punchOut) : record.punchOut;

  let totalMinutes = record.totalMinutes;
  if (pIn && pOut && pOut > pIn) {
    totalMinutes = Math.round((pOut.getTime() - pIn.getTime()) / (1000 * 60));
  }

  return await prisma.studioAttendanceRecord.update({
    where: { id: record.id },
    data: {
      punchIn: pIn,
      punchOut: pOut,
      totalMinutes,
      status: input.status || record.status,
      correctionReason: input.correctionReason.trim(),
      correctedById: context.membershipId,
      correctedAt: new Date(),
    },
  });
}
