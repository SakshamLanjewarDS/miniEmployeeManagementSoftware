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
  readonly hasHrAccess?: boolean;
  readonly avatarUrl?: string | null;
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
 * Admin Authority: Only ADMIN can generate, design, and circulate employment letters.
 */
export function assertAdminOnly(context: TenantContext, message = "Forbidden: Studio Administrator authority required to generate or circulate letters"): void {
  if (context.role !== TenantRole.ADMIN && context.role !== TenantRole.OWNER) {
    throw new ForbiddenException(message);
  }
}

/**
 * Sovereign Tenant Authority: Only OWNER can alter billing, delete tenant,
 * or manage global integrations and financial locks.
 */
export function assertOwnerOnly(context: TenantContext, message = "Forbidden: Studio Owner / Partner privileges required"): void {
  if (context.role !== TenantRole.OWNER) {
    throw new ForbiddenException(message);
  }
}

/**
 * Shared studio operational management for OWNER and ADMIN (projects, tasks, employees).
 * Sovereign tenant configuration and billing remain strictly OWNER exclusive.
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

export function canManageHR(context: TenantContext): boolean {
  return isOwner(context) || isAdmin(context) || Boolean(context.hasHrAccess);
}

export function assertCanManageHR(context: TenantContext, message = "Forbidden: HR management privileges required"): void {
  if (!canManageHR(context)) {
    throw new ForbiddenException(message);
  }
}

/**
 * An Admin cannot verify their own HR documents or approve their own employment letter.
 * Route these to the Owner or another authorized reviewer.
 */
export function assertCannotSelfReview(
  context: TenantContext,
  targetEmployeeOrMembershipId: string,
  message = "Forbidden: Administrators cannot verify their own HR documents or approve their own employment letter"
): void {
  if (
    context.role !== TenantRole.OWNER &&
    (context.employeeId === targetEmployeeOrMembershipId || context.membershipId === targetEmployeeOrMembershipId)
  ) {
    throw new ForbiddenException(message);
  }
}

export { getTenantContextFromSession } from "../auth/session";
