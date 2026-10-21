/**
 * Advanced Multi-Dimensional Filtering Engine (PERF-05)
 * Slices performance analytics across organizational and project dimensions.
 */

export interface PerformanceFilterParams {
  employeeIds?: string[];
  department?: string;
  designation?: string;
  projectId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "ALL";
  governanceType?: "ALL" | "GOVERNED" | "OPERATIONAL";
  deliveryStatus?: "ALL" | "ON_TIME" | "LATE" | "OVERDUE";
  isBlocked?: boolean;
  employmentStatus?: "ACTIVE" | "INACTIVE" | "ALL";
  searchQuery?: string;
}

export function buildPerformanceWhereClause(
  tenantId: string,
  filters: PerformanceFilterParams = {}
): Record<string, any> {
  const where: Record<string, any> = {
    tenantId,
  };

  if (filters.employeeIds && filters.employeeIds.length > 0) {
    where.employeeId = { in: filters.employeeIds };
  }

  if (filters.department && filters.department !== "ALL") {
    where.department = filters.department;
  }

  if (filters.designation && filters.designation !== "ALL") {
    where.designation = filters.designation;
  }

  if (filters.projectId && filters.projectId !== "ALL") {
    where.projectId = filters.projectId;
  }

  if (filters.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }

  return where;
}
