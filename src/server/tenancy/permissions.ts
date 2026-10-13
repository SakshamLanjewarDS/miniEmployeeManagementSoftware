import { TenantRole } from "@prisma/client";
import { TenantContext, ForbiddenException } from "./context";

/**
 * Centralized Role & Capability Permission System (ROLE-01, ROLE-02, ROLE-03)
 * Distinguishes OWNER from ADMIN:
 * - OWNER: Partner / Principal Architect with sovereign tenant authority (Billing, Deletion, Integrations, Financial Locks)
 * - ADMIN: Studio Operations & Practice Admin (Day-to-day team, task assignments, leave reviews, attendance corrections)
 * - EMPLOYEE: Practice staff (Self-workstation, assignments, submissions, punches, personal leave)
 */

export type StudioCapability =
  // Tenant Sovereign Ownership (Owner Exclusive)
  | "tenant.billing.manage"
  | "tenant.settings.manage"
  | "tenant.delete"
  | "tenant.export"
  | "integration.manage"
  | "leave.policy.manage"
  | "payroll.finalize"

  // Studio Operations & Administration (Owner + Admin)
  | "integration.view"
  | "employees.view"
  | "employees.manage"
  | "employees.onboard"
  | "employees.offboard"
  | "permissions.view"
  | "leave.view_all"
  | "leave.approve"
  | "attendance.view_all"
  | "attendance.correct"
  | "projects.create"
  | "projects.manage"
  | "tasks.create"
  | "tasks.assign"
  | "tasks.approve_governed"
  | "drawings.approve"
  | "drawings.release"
  | "materials.approve"
  | "rfis.manage"
  | "performance.view"
  | "performance.view_details"
  | "performance.export"
  | "performance.manage_settings"
  | "inbox.view"

  // Financial Management (Owner + Admin with explicit finance access)
  | "finance.view"
  | "finance.manage"
  | "payroll.view"
  | "payroll.prepare"

  // Standard Practice Employee Capabilities
  | "leave.request"
  | "leave.view_self"
  | "attendance.punch"
  | "attendance.view_self"
  | "projects.view"
  | "tasks.view"
  | "tasks.work"
  | "drawings.view"
  | "drawings.upload"
  | "materials.submit"
  | "rfis.submit";

/**
 * Checks whether an active tenant context holds a specific capability
 */
export function hasCapability(ctx: TenantContext, capability: StudioCapability): boolean {
  if (!ctx || !ctx.role) return false;

  // 1. OWNER has all capabilities
  if (ctx.role === TenantRole.OWNER) {
    return true;
  }

  // 2. ADMIN capabilities (Operations without sovereign billing/deletion/lock authority)
  if (ctx.role === TenantRole.ADMIN) {
    // Sovereign owner-only restrictions
    if (
      capability === "tenant.billing.manage" ||
      capability === "tenant.delete" ||
      capability === "tenant.settings.manage" ||
      capability === "integration.manage" ||
      capability === "leave.policy.manage" ||
      capability === "payroll.finalize"
    ) {
      return false;
    }

    // Finance capabilities require explicit hasFinanceAccess
    if (
      capability === "finance.view" ||
      capability === "finance.manage" ||
      capability === "payroll.view" ||
      capability === "payroll.prepare"
    ) {
      return ctx.hasFinanceAccess;
    }

    // All standard admin operational capabilities allowed
    return true;
  }

  // 3. EMPLOYEE capabilities
  if (ctx.role === TenantRole.EMPLOYEE) {
    const employeeAllowed: StudioCapability[] = [
      "leave.request",
      "leave.view_self",
      "attendance.punch",
      "attendance.view_self",
      "projects.view",
      "tasks.view",
      "tasks.work",
      "drawings.view",
      "drawings.upload",
      "materials.submit",
      "rfis.submit",
    ];
    return employeeAllowed.includes(capability);
  }

  // Fallback for legacy roles (e.g. PROJECT_MANAGER mapped to Employee + project view)
  return false;
}

/**
 * Strict fail-closed capability assertion
 */
export function assertCapability(
  ctx: TenantContext,
  capability: StudioCapability,
  message?: string
): void {
  if (!hasCapability(ctx, capability)) {
    throw new ForbiddenException(
      message || `Forbidden: Action requires capability '${capability}'`
    );
  }
}

/**
 * Returns a read-only list of effective capabilities for the current membership
 */
export function getEffectiveCapabilities(ctx: TenantContext): StudioCapability[] {
  const allCapabilities: StudioCapability[] = [
    "tenant.billing.manage",
    "tenant.settings.manage",
    "tenant.delete",
    "tenant.export",
    "integration.manage",
    "leave.policy.manage",
    "payroll.finalize",
    "integration.view",
    "employees.view",
    "employees.manage",
    "employees.onboard",
    "employees.offboard",
    "permissions.view",
    "leave.view_all",
    "leave.approve",
    "attendance.view_all",
    "attendance.correct",
    "projects.create",
    "projects.manage",
    "tasks.create",
    "tasks.assign",
    "tasks.approve_governed",
    "drawings.approve",
    "drawings.release",
    "materials.approve",
    "rfis.manage",
    "performance.view",
    "performance.view_details",
    "performance.export",
    "performance.manage_settings",
    "inbox.view",
    "finance.view",
    "finance.manage",
    "payroll.view",
    "payroll.prepare",
    "leave.request",
    "leave.view_self",
    "attendance.punch",
    "attendance.view_self",
    "projects.view",
    "tasks.view",
    "tasks.work",
    "drawings.view",
    "drawings.upload",
    "materials.submit",
    "rfis.submit",
  ];

  return allCapabilities.filter((cap) => hasCapability(ctx, cap));
}
