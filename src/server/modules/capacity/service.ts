/**
 * Workload & Capacity Planning Domain Service
 * 100% DESIGN Studio — Multi-Tenant Architecture
 *
 * Implements:
 * 1. Schedule-aware employee capacity (8h/day, 10:30-18:30 IST default, excluding weekends/holidays).
 * 2. Approved full/half/hourly leave deductions (leave-aware availability).
 * 3. Demand calculation strictly from explicit task estimatedHours divided evenly across multi-assignees.
 * 4. Transparent math: capacity unknown/incomplete when estimates are missing (never inventing hours).
 * 5. Reassignment/rescheduling impact previews with project membership & leave conflict verification.
 * 6. Deliberate application of workload adjustments with audit logging and notifications.
 */

import { prisma } from "../../db/prisma";
import { TenantContext } from "../../tenancy/context";
import { Prisma } from "@prisma/client";

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function getDayName(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

function startOfDay(d: Date): Date {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

function parseISO(s: string): Date {
  const parts = s.slice(0, 10).split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

function isAfter(d1: Date, d2: Date): boolean {
  return d1.getTime() > d2.getTime();
}

export interface CapacityQueryParams {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  projectId?: string;
  department?: string;
}

export interface DayCapacitySlot {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  standardCapacityHours: number;
  leaveHours: number;
  leaveType?: string;
  availableCapacityHours: number;
  plannedDemandHours: number;
  tasks: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    estimatedHours: number;
    allocatedHoursToday: number;
    hasEstimate: boolean;
  }>;
}

export interface EmployeeWorkloadSummary {
  membershipId: string;
  employeeId?: string;
  employeeNumber?: string;
  fullName: string;
  email: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  totalWorkingDays: number;
  availableCapacityHours: number;
  plannedDemandHours: number;
  utilizationPercentage: number;
  allocationStatus: "BALANCED" | "OVERALLOCATED" | "UNDERALLOCATED" | "ESTIMATES_INCOMPLETE";
  missingEstimateCount: number;
  assignedTaskCount: number;
  dailySlots: DayCapacitySlot[];
}

export interface StudioCapacityOverview {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string };
  overallMetrics: {
    totalEmployees: number;
    totalAvailableHours: number;
    totalPlannedHours: number;
    averageUtilization: number;
    overallocatedCount: number;
    underallocatedCount: number;
    balancedCount: number;
    incompleteEstimatesCount: number;
    unscheduledTasksCount: number;
  };
  employees: EmployeeWorkloadSummary[];
  unscheduledTasks: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    estimatedHours: number | null;
    assigneeName?: string;
    missingReason: string;
  }>;
}

export interface WorkloadAdjustmentPreview {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  currentAssignee?: { id: string; name: string };
  targetAssignee?: { id: string; name: string };
  currentDates: { startDate: string | null; dueDate: string | null };
  newDates: { startDate: string | null; dueDate: string | null };
  estimatedHours: number | null;
  isValid: boolean;
  warnings: string[];
  blockers: string[];
  impactSummary: string;
}

/**
 * Asserts caller has studio leadership permissions for workload planning.
 */
function assertPlanningAccess(ctx: TenantContext) {
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN" && ctx.role !== "PROJECT_MANAGER") {
    throw new Error("Forbidden: Only Studio Owners, Administrators, and Project Managers can access workload planning.");
  }
}

/**
 * Helper to parse a date into YYYY-MM-DD
 */
function toDateStr(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return formatDate(d);
}

/**
 * Fetches configured studio holidays for the tenant
 */
async function getTenantHolidays(tenantId: string): Promise<Map<string, string>> {
  const policy = await prisma.studioLeavePolicy.findUnique({
    where: { tenantId },
  });

  const holidayMap = new Map<string, string>();

  if ((policy as any)?.holidays && Array.isArray((policy as any).holidays)) {
    for (const h of (policy as any).holidays as Array<{ date?: string; name?: string }>) {
      if (h.date && h.name) {
        holidayMap.set(h.date, h.name);
      }
    }
  }

  return holidayMap;
}

/**
 * Main query service: calculates transparent capacity & planned demand across employees
 */
export async function getStudioWorkloadCapacity(
  ctx: TenantContext,
  params: CapacityQueryParams
): Promise<StudioCapacityOverview> {
  assertPlanningAccess(ctx);

  const start = startOfDay(parseISO(params.startDate));
  const end = startOfDay(parseISO(params.endDate));

  if (isAfter(start, end)) {
    throw new Error("Invalid date range: Start date cannot be after end date.");
  }

  // Generate sequence of days
  const dateSlots: Array<{ date: string; dayName: string; isWeekend: boolean; dateObj: Date }> = [];
  let curr = start;
  while (!isAfter(curr, end)) {
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
    dateSlots.push({
      date: formatDate(curr),
      dayName: getDayName(curr),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dateObj: curr,
    });
    curr = addDays(curr, 1);
  }

  const holidays = await getTenantHolidays(ctx.tenantId);

  // Fetch all active memberships for this tenant
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId: ctx.tenantId,
      isActive: true,
      user: { accountState: "ACTIVE" },
      ...(params.department
        ? {
            employee: {
              department: params.department,
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      employee: {
        select: {
          id: true,
          employeeId: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
  });

  // Fetch approved leaves in this date window
  const approvedLeaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
      days: true,
      isHalfDay: true,
      isHourly: true,
      leaveType: true,
      totalMinutes: true,
    },
  });

  // Map employeeId to membershipId
  const employeeIdToMembershipId = new Map<string, string>();
  for (const m of memberships) {
    if (m.employee?.id) {
      employeeIdToMembershipId.set(m.employee.id, m.id);
    }
  }

  // Fetch active tasks
  const activeTasks = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignee: {
        select: {
          id: true,
          user: { select: { fullName: true } },
        },
      },
    },
  });

  const unscheduledTasks: StudioCapacityOverview["unscheduledTasks"] = [];
  const scheduledTasksList: typeof activeTasks = [];

  for (const t of activeTasks) {
    if (!t.startDate && !t.dueDate) {
      unscheduledTasks.push({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project.name,
        estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
        assigneeName: t.assignee?.user.fullName,
        missingReason: "No start date or due date defined",
      });
    } else {
      scheduledTasksList.push(t);
    }
  }

  // Build employee summaries
  const employees: EmployeeWorkloadSummary[] = [];

  for (const member of memberships) {
    // 1. Calculate base daily slots and leave deductions
    const dailySlots: DayCapacitySlot[] = dateSlots.map((slot) => {
      const isHoliday = holidays.has(slot.date);
      const isWorkingDay = !slot.isWeekend && !isHoliday;
      const standardHours = isWorkingDay ? 8.0 : 0.0;

      // Check leave for this employee on this date
      let leaveHours = 0;
      let leaveType: string | undefined = undefined;

      if (member.employee?.id) {
        const empLeaves = approvedLeaves.filter((l) => l.employeeId === member.employee!.id);
        for (const l of empLeaves) {
          const lStartStr = toDateStr(l.startDate);
          const lEndStr = toDateStr(l.endDate);

          if (slot.date >= lStartStr && slot.date <= lEndStr) {
            if (l.isHourly && l.totalMinutes) {
              leaveHours += Math.min(8.0, Number((l.totalMinutes / 60).toFixed(2)));
              leaveType = "Hourly Leave";
            } else if (l.isHalfDay) {
              leaveHours += 4.0;
              leaveType = "Half Day Leave";
            } else {
              leaveHours += 8.0;
              leaveType = `${l.leaveType} Leave`;
            }
          }
        }
      }

      leaveHours = Math.min(leaveHours, standardHours);
      const availableCapacityHours = Math.max(0, standardHours - leaveHours);

      return {
        date: slot.date,
        dayName: slot.dayName,
        isWorkingDay,
        isHoliday,
        holidayName: holidays.get(slot.date),
        standardCapacityHours: standardHours,
        leaveHours,
        leaveType,
        availableCapacityHours,
        plannedDemandHours: 0,
        tasks: [],
      };
    });

    // 2. Distribute assigned tasks across days
    let assignedTaskCount = 0;
    let missingEstimateCount = 0;

    for (const t of scheduledTasksList) {
      // Check if this membership is assigned
      let isAssigned = false;
      let totalAssigneesCount = 1;

      if (Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.length > 0) {
        totalAssigneesCount = t.assignedMemberIds.length;
        if ((t.assignedMemberIds as string[]).includes(member.id)) {
          isAssigned = true;
        }
      } else if (t.assigneeId === member.id) {
        isAssigned = true;
        totalAssigneesCount = 1;
      }

      if (!isAssigned) continue;

      assignedTaskCount++;

      const hasEstimate = t.estimatedHours !== null && Number(t.estimatedHours) > 0;
      if (!hasEstimate) {
        missingEstimateCount++;
      }

      const totalEstimatedHours = hasEstimate ? Number(t.estimatedHours) : 0;
      // Per-assignee allocation: strictly divided among assignees to prevent duplicate counting
      const assigneeEstimatedHours = totalAssigneesCount > 0 ? totalEstimatedHours / totalAssigneesCount : 0;

      // Determine task date window
      const taskStartStr = t.startDate ? toDateStr(t.startDate) : toDateStr(t.dueDate!);
      const taskEndStr = t.dueDate ? toDateStr(t.dueDate) : toDateStr(t.startDate!);

      // Count working days in the entire task duration to allocate effort per day
      let taskWorkingDaysCount = 0;
      const tStartObj = parseISO(taskStartStr);
      const tEndObj = parseISO(taskEndStr);

      let dayItr = tStartObj;
      while (!isAfter(dayItr, tEndObj)) {
        const dW = dayItr.getDay();
        const dStr = formatDate(dayItr);
        if (dW !== 0 && dW !== 6 && !holidays.has(dStr)) {
          taskWorkingDaysCount++;
        }
        dayItr = addDays(dayItr, 1);
      }

      if (taskWorkingDaysCount === 0) taskWorkingDaysCount = 1;

      const dailyEffortForAssignee = assigneeEstimatedHours / taskWorkingDaysCount;

      // Allocate to dailySlots that fall within task window
      for (const slot of dailySlots) {
        if (slot.date >= taskStartStr && slot.date <= taskEndStr) {
          if (slot.isWorkingDay) {
            slot.plannedDemandHours = Number((slot.plannedDemandHours + dailyEffortForAssignee).toFixed(2));
            slot.tasks.push({
              id: t.id,
              title: t.title,
              projectId: t.projectId,
              projectName: t.project.name,
              estimatedHours: assigneeEstimatedHours,
              allocatedHoursToday: Number(dailyEffortForAssignee.toFixed(2)),
              hasEstimate,
            });
          }
        }
      }
    }

    // 3. Compute totals and status
    const totalWorkingDays = dailySlots.filter((s) => s.isWorkingDay).length;
    const availableCapacityHours = Number(
      dailySlots.reduce((acc, s) => acc + s.availableCapacityHours, 0).toFixed(2)
    );
    const plannedDemandHours = Number(
      dailySlots.reduce((acc, s) => acc + s.plannedDemandHours, 0).toFixed(2)
    );

    const utilizationPercentage =
      availableCapacityHours > 0
        ? Math.round((plannedDemandHours / availableCapacityHours) * 100)
        : 0;

    let allocationStatus: EmployeeWorkloadSummary["allocationStatus"] = "BALANCED";
    if (missingEstimateCount > 0) {
      allocationStatus = "ESTIMATES_INCOMPLETE";
    } else if (utilizationPercentage > 100) {
      allocationStatus = "OVERALLOCATED";
    } else if (utilizationPercentage < 70) {
      allocationStatus = "UNDERALLOCATED";
    }

    employees.push({
      membershipId: member.id,
      employeeId: member.employee?.id,
      employeeNumber: member.employee?.employeeId,
      fullName: member.user.fullName,
      email: member.user.email,
      department: member.employee?.department || undefined,
      designation: member.employee?.designation || undefined,
      totalWorkingDays,
      availableCapacityHours,
      plannedDemandHours,
      utilizationPercentage,
      allocationStatus,
      missingEstimateCount,
      assignedTaskCount,
      dailySlots,
    });
  }

  // Compute studio-wide overview metrics
  const totalAvailableHours = Number(
    employees.reduce((acc, e) => acc + e.availableCapacityHours, 0).toFixed(2)
  );
  const totalPlannedHours = Number(
    employees.reduce((acc, e) => acc + e.plannedDemandHours, 0).toFixed(2)
  );
  const averageUtilization =
    totalAvailableHours > 0
      ? Math.round((totalPlannedHours / totalAvailableHours) * 100)
      : 0;

  const overallMetrics = {
    totalEmployees: employees.length,
    totalAvailableHours,
    totalPlannedHours,
    averageUtilization,
    overallocatedCount: employees.filter((e) => e.allocationStatus === "OVERALLOCATED").length,
    underallocatedCount: employees.filter((e) => e.allocationStatus === "UNDERALLOCATED").length,
    balancedCount: employees.filter((e) => e.allocationStatus === "BALANCED").length,
    incompleteEstimatesCount: employees.filter((e) => e.allocationStatus === "ESTIMATES_INCOMPLETE").length,
    unscheduledTasksCount: unscheduledTasks.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { startDate: params.startDate, endDate: params.endDate },
    overallMetrics,
    employees,
    unscheduledTasks,
  };
}

/**
 * Previews a proposed workload reassignment or date rescheduling.
 * Checks project membership, approved leaves, and estimates transparently before applying.
 */
export async function previewWorkloadAdjustment(
  ctx: TenantContext,
  params: {
    taskId: string;
    targetAssigneeId?: string;
    newStartDate?: string;
    newDueDate?: string;
  }
): Promise<WorkloadAdjustmentPreview> {
  assertPlanningAccess(ctx);

  const task = await prisma.task.findFirst({
    where: { id: params.taskId, tenantId: ctx.tenantId },
    include: {
      project: true,
      assignee: { include: { user: true } },
    },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  const warnings: string[] = [];
  const blockers: string[] = [];

  let targetMembership: any = null;
  if (params.targetAssigneeId) {
    targetMembership = await prisma.tenantMembership.findFirst({
      where: { id: params.targetAssigneeId, tenantId: ctx.tenantId, isActive: true },
      include: { user: true, employee: true },
    });

    if (!targetMembership) {
      blockers.push("The selected target assignee is inactive or does not exist in this tenant.");
    } else {
      // Verify project membership
      const isProjectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: task.projectId,
          membershipId: params.targetAssigneeId,
        },
      });

      if (!isProjectMember && targetMembership.role !== "OWNER" && targetMembership.role !== "ADMIN") {
        warnings.push(
          `Assignee "${targetMembership.user.fullName}" is not an explicit member of project "${task.project.name}". They will be added to the project team.`
        );
      }
    }
  }

  // Validate dates
  const effectiveStart = params.newStartDate || (task.startDate ? toDateStr(task.startDate) : null);
  const effectiveDue = params.newDueDate || (task.dueDate ? toDateStr(task.dueDate) : null);

  if (effectiveStart && effectiveDue && effectiveStart > effectiveDue) {
    blockers.push("Proposed start date cannot be later than the proposed due date.");
  }

  // Check approved leave conflicts for target assignee
  if (targetMembership?.employee?.id && effectiveStart && effectiveDue) {
    const overlappingLeaves = await prisma.studioLeaveRequest.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: targetMembership.employee.id,
        status: "APPROVED",
        startDate: { lte: parseISO(effectiveDue) },
        endDate: { gte: parseISO(effectiveStart) },
      },
    });

    if (overlappingLeaves.length > 0) {
      warnings.push(
        `Target assignee has ${overlappingLeaves.length} approved leave window(s) intersecting this planned task schedule.`
      );
    }
  }

  // Check missing estimates
  const hasEstimate = task.estimatedHours !== null && Number(task.estimatedHours) > 0;
  if (!hasEstimate) {
    warnings.push("This task has no explicit estimated hours; planned demand cannot be precisely calculated.");
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: task.project.name,
    currentAssignee: task.assignee
      ? { id: task.assignee.id, name: task.assignee.user.fullName }
      : undefined,
    targetAssignee: targetMembership
      ? { id: targetMembership.id, name: targetMembership.user.fullName }
      : undefined,
    currentDates: {
      startDate: task.startDate ? toDateStr(task.startDate) : null,
      dueDate: task.dueDate ? toDateStr(task.dueDate) : null,
    },
    newDates: {
      startDate: params.newStartDate || null,
      dueDate: params.newDueDate || null,
    },
    estimatedHours: hasEstimate ? Number(task.estimatedHours) : null,
    isValid: blockers.length === 0,
    warnings,
    blockers,
    impactSummary:
      blockers.length === 0
        ? `Ready to adjust schedule for "${task.title}". Estimated demand: ${
            hasEstimate ? `${Number(task.estimatedHours)}h` : "Unknown"
          }.`
        : "Cannot apply adjustments due to blocking validation errors.",
  };
}

/**
 * Deliberately applies a verified workload adjustment with transactional audit trail and notifications.
 */
export async function applyWorkloadAdjustment(
  ctx: TenantContext,
  params: {
    taskId: string;
    targetAssigneeId?: string;
    newStartDate?: string;
    newDueDate?: string;
    reason: string;
  }
) {
  assertPlanningAccess(ctx);

  if (!params.reason?.trim()) {
    throw new Error("A justification reason is required when adjusting capacity and task assignments.");
  }

  const preview = await previewWorkloadAdjustment(ctx, params);
  if (!preview.isValid) {
    throw new Error(`Cannot apply adjustment: ${preview.blockers.join("; ")}`);
  }

  const task = await prisma.task.findFirst({
    where: { id: params.taskId, tenantId: ctx.tenantId },
    include: { project: true, assignee: { include: { user: true } } },
  });

  if (!task) throw new Error("Task not found.");

  const oldAssigneeId = task.assigneeId;
  const newAssigneeId = params.targetAssigneeId !== undefined ? params.targetAssigneeId : task.assigneeId;

  const updateData: Prisma.TaskUpdateInput = {};

  if (params.targetAssigneeId !== undefined) {
    updateData.assignee = params.targetAssigneeId
      ? { connect: { id: params.targetAssigneeId } }
      : { disconnect: true };
    updateData.assignedMemberIds = params.targetAssigneeId ? [params.targetAssigneeId] : [];
  }

  if (params.newStartDate !== undefined) {
    updateData.startDate = params.newStartDate ? parseISO(params.newStartDate) : null;
  }

  if (params.newDueDate !== undefined) {
    updateData.dueDate = params.newDueDate ? parseISO(params.newDueDate) : null;
  }

  return await prisma.$transaction(async (tx) => {
    // If target assignee is specified and not a project member, ensure project membership
    if (newAssigneeId) {
      const existingMember = await tx.projectMember.findFirst({
        where: { projectId: task.projectId, membershipId: newAssigneeId },
      });

      if (!existingMember) {
        await tx.projectMember.create({
          data: {
            tenantId: ctx.tenantId,
            projectId: task.projectId,
            membershipId: newAssigneeId,
            projectRole: "Team Member",
          },
        });
      }
    }

    const updatedTask = await tx.task.update({
      where: { id: task.id },
      data: updateData,
    });

    // Create Audit Event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        projectId: task.projectId,
        action: "WORKLOAD_CAPACITY_ADJUSTMENT",
        entityType: "Task",
        entityId: task.id,
        safeChangeSummary: `Workload plan adjusted for "${task.title}": Assignee changed from ${
          task.assignee?.user.fullName || "Unassigned"
        } to ${preview.targetAssignee?.name || "Unassigned"}, Start: ${
          preview.newDates.startDate || "unchanged"
        }, Due: ${preview.newDates.dueDate || "unchanged"}. Reason: ${params.reason.trim()}`,
      },
    });

    // Send notification to newly assigned member if changed
    if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
      const targetUser = await tx.tenantMembership.findUnique({
        where: { id: newAssigneeId },
        include: { user: true },
      });

      if (targetUser?.user.email) {
        await tx.studioEmailOutbox.create({
          data: {
            tenantId: ctx.tenantId,
            recipientEmail: targetUser.user.email,
            subject: `Workload Assignment: ${task.title}`,
            eventType: "TASK_ASSIGNED",
            htmlBody: `<p>Hello ${targetUser.user.fullName},</p><p>You have been assigned to <strong>${task.title}</strong> on project <strong>${task.project.name}</strong>.</p><p><strong>Reason:</strong> ${params.reason.trim()}</p>`,
            status: "PENDING",
            idempotencyKey: `workload-reassign-${task.id}-${newAssigneeId}-${Date.now()}`,
          },
        });
      }
    }

    return updatedTask;
  });
}
