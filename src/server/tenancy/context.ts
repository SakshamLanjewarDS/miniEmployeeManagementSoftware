import { TenantRole } from "@prisma/client";

export interface TenantContext {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly tenantName: string;
  readonly userId: string;
  readonly userEmail: string;
  readonly userFullName: string;
  readonly membershipId: string;
  readonly employeeId: string | null;
  readonly designation?: string | null;
  readonly department?: string | null;
  readonly phone?: string | null;
  readonly role: TenantRole;
  readonly hasFinanceAccess: boolean;
  readonly timezone: string;
  readonly currency: string;
}

export class UnauthorizedException extends Error {
  constructor(message = "Unauthorized: Session is invalid or expired") {
    super(message);
    this.name = "UnauthorizedException";
  }
}

export class ForbiddenException extends Error {
  constructor(message = "Forbidden: Insufficient privileges for this action") {
    super(message);
    this.name = "ForbiddenException";
  }
}

export class TenantMismatchException extends Error {
  constructor(message = "Cross-tenant access violation detected") {
    super(message);
    this.name = "TenantMismatchException";
  }
}

/**
 * Asserts that a target record's tenantId matches the current request context.
 * Strict fail-closed policy.
 */
export function assertTenantAccess(context: TenantContext, resourceTenantId: string): void {
  if (!context || !context.tenantId || context.tenantId !== resourceTenantId) {
    throw new TenantMismatchException();
  }
}

export const ACTIVE_ROLES = [TenantRole.OWNER, TenantRole.ADMIN, TenantRole.EMPLOYEE] as const;
export type ActiveRole = (typeof ACTIVE_ROLES)[number];

export function isOwner(context: TenantContext): boolean {
  return context.role === TenantRole.OWNER;
}

export function isAdmin(context: TenantContext): boolean {
  return context.role === TenantRole.ADMIN;
}

/**
 * OWNER and ADMIN have equal management permissions within their own tenant:
 * Projects, phases, milestones, assignments, tasks, checklists, submissions,
 * reviews, drawings, site visits, employees, accounts, roles, clients,
 * contractors, consultants, finance, custom fields, import/export, announcements,
 * reports, and settings.
 */
export function isAdminOrOwner(context: TenantContext): boolean {
  return context.role === TenantRole.OWNER || context.role === TenantRole.ADMIN;
}

export function isEmployee(context: TenantContext): boolean {
  return context.role === TenantRole.EMPLOYEE;
}

export function canManageEmployees(context: TenantContext): boolean {
  return isAdminOrOwner(context);
}

export function canManageDirectories(context: TenantContext): boolean {
  return isAdminOrOwner(context);
}

export function canManageFinance(context: TenantContext): boolean {
  return isAdminOrOwner(context) || context.hasFinanceAccess;
}

export function canApproveWork(context: TenantContext): boolean {
  return isAdminOrOwner(context);
}

export function assertAdminOrOwner(context: TenantContext, message = "Forbidden: Administrator or Owner privileges required"): void {
  if (!isAdminOrOwner(context)) {
    throw new ForbiddenException(message);
  }
}

export function assertCanManageDirectories(context: TenantContext, message = "Forbidden: Administrator or Owner privileges required to manage directories"): void {
  if (!canManageDirectories(context)) {
    throw new ForbiddenException(message);
  }
}

export function assertCanManageFinance(context: TenantContext, message = "Forbidden: Financial management privileges required"): void {
  if (!canManageFinance(context)) {
    throw new ForbiddenException(message);
  }
}
