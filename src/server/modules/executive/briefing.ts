import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly, formatDateOnly } from "../leave/policy";

export interface MorningBriefingData {
  date: string;
  timeContext: string;
  absentStaffToday: {
    employeeId: string;
    employeeName: string;
    department: string;
    leaveType: string;
  }[];
  pendingLeaveReviewsCount: number;
  urgentDeliverables: {
    id: string;
    title: string;
    category: string;
    priority: string;
    isOverdue: boolean;
  }[];
  meetingsToday: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    meetingType: string;
  }[];
}

/**
 * Generates Morning Executive Briefing snapshot for Owner & Admin (evaluated dynamically on access)
 */
export async function getMorningExecutiveBriefing(
  context: TenantContext
): Promise<MorningBriefingData> {
  assertAdminOrOwner(context);

  const today = parseDateOnly(new Date());
  const todayStr = formatDateOnly(today);

  // 1. Query staff absent today
  const activeLeaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: context.tenantId,
      status: "APPROVED",
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: {
      employee: {
        include: {
          membership: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
  });

  const absentStaffToday = activeLeaves.map((l) => ({
    employeeId: l.employee.employeeId,
    employeeName: l.employeeNameRaw || l.employee.membership.user.fullName,
    department: l.employee.department || "General",
    leaveType: l.leaveType,
  }));

  // 2. Pending leaves count
  const pendingLeaveReviewsCount = await prisma.studioLeaveRequest.count({
    where: {
      tenantId: context.tenantId,
      status: "PENDING",
      deletedAt: null,
    },
  });

  // 3. Urgent or overdue executive deliverables
  const deliverables = await prisma.executiveTask.findMany({
    where: {
      tenantId: context.tenantId,
      status: { not: "DONE" },
      isArchived: false,
      OR: [
        { dueDate: { lte: today } },
        { priority: "URGENT" },
      ],
    },
    take: 10,
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
  });

  const urgentDeliverables = deliverables.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category || "Deliverable",
    priority: d.priority,
    isOverdue: d.dueDate ? formatDateOnly(d.dueDate) < todayStr : false,
  }));

  // 4. Meetings scheduled today
  const meetings = await prisma.studioMeeting.findMany({
    where: {
      tenantId: context.tenantId,
      meetingDate: today,
      status: { not: "CANCELLED" },
    },
    orderBy: { startTime: "asc" },
  });

  const meetingsToday = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    startTime: m.startTime,
    endTime: m.endTime,
    meetingType: m.meetingType,
  }));

  return {
    date: todayStr,
    timeContext: "09:00 AM IST Scheduled Briefing",
    absentStaffToday,
    pendingLeaveReviewsCount,
    urgentDeliverables,
    meetingsToday,
  };
}
