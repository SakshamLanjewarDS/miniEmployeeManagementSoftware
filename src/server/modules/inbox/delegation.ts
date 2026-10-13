import { prisma } from "../../db/prisma";
import {
  TenantContext,
  assertAdminOrOwner,
  ForbiddenException,
} from "../../tenancy/context";

export type DelegationScope = "ALL" | "LEAVE_ONLY" | "TASKS_ONLY" | "DRAWINGS_ONLY";

export interface CreateDelegationInput {
  delegateeMembershipId: string;
  scope: DelegationScope;
  validFrom: string; // ISO date or YYYY-MM-DD
  validUntil: string; // ISO date or YYYY-MM-DD
  reason: string;
}

export interface ApprovalDelegationRecord {
  id: string;
  delegatorMembershipId: string;
  delegatorName: string;
  delegateeMembershipId: string;
  delegateeName: string;
  scope: DelegationScope;
  validFrom: string;
  validUntil: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Creates a time-limited approval delegation for absence/travel coverage.
 * Strictly guarded to Studio Leadership (Owner/Admin).
 */
export async function createApprovalDelegation(
  ctx: TenantContext,
  input: CreateDelegationInput
): Promise<ApprovalDelegationRecord> {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can establish approval delegations.");

  // Validation: Cannot delegate to oneself
  if (input.delegateeMembershipId === ctx.membershipId) {
    throw new Error("Cannot delegate approval authority to yourself.");
  }

  const validFromDate = new Date(input.validFrom);
  const validUntilDate = new Date(input.validUntil);

  if (isNaN(validFromDate.getTime()) || isNaN(validUntilDate.getTime())) {
    throw new Error("Invalid start or end date for delegation period.");
  }

  if (validUntilDate <= validFromDate) {
    throw new Error("Delegation expiry date must be strictly after the start date.");
  }

  // Verify delegatee belongs to the same tenant and is active
  const delegatee = await prisma.tenantMembership.findFirst({
    where: {
      id: input.delegateeMembershipId,
      tenantId: ctx.tenantId,
      isActive: true,
    },
    include: {
      user: { select: { fullName: true, email: true } },
    },
  });

  if (!delegatee) {
    throw new Error("Specified delegatee member not found or inactive in this studio workspace.");
  }

  // Read existing tenant settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, any>) || {};
  const existingDelegations: any[] = settings.approvalDelegations || [];

  const newDelegationId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const delegationEntry = {
    id: newDelegationId,
    delegatorMembershipId: ctx.membershipId,
    delegatorName: ctx.userFullName,
    delegateeMembershipId: input.delegateeMembershipId,
    delegateeName: delegatee.user.fullName,
    scope: input.scope,
    validFrom: validFromDate.toISOString(),
    validUntil: validUntilDate.toISOString(),
    reason: input.reason.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const updatedDelegations = [...existingDelegations, delegationEntry];

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        settings: {
          ...settings,
          approvalDelegations: updatedDelegations,
        },
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "APPROVAL_DELEGATION_CREATED",
        entityType: "ApprovalDelegation",
        entityId: newDelegationId,
        safeChangeSummary: `Delegated ${input.scope} approval authority to ${delegatee.user.fullName} until ${validUntilDate.toISOString().split("T")[0]} (${input.reason.trim()})`,
      },
    }),
  ]);

  return delegationEntry;
}

/**
 * Lists all active and historical approval delegations in the workspace
 */
export async function listApprovalDelegations(
  ctx: TenantContext
): Promise<ApprovalDelegationRecord[]> {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can view approval delegations.");

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, any>) || {};
  const delegations: any[] = settings.approvalDelegations || [];

  const now = new Date();
  return delegations.map((d) => ({
    ...d,
    isActive: d.isActive && new Date(d.validUntil) >= now && new Date(d.validFrom) <= now,
  }));
}

/**
 * Revoke an active approval delegation before its natural expiration
 */
export async function revokeApprovalDelegation(
  ctx: TenantContext,
  delegationId: string
): Promise<void> {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can revoke approval delegations.");

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, any>) || {};
  const delegations: any[] = settings.approvalDelegations || [];

  const target = delegations.find((d) => d.id === delegationId);
  if (!target) {
    throw new Error("Delegation record not found.");
  }

  const updatedDelegations = delegations.map((d) =>
    d.id === delegationId ? { ...d, isActive: false, revokedAt: new Date().toISOString() } : d
  );

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        settings: {
          ...settings,
          approvalDelegations: updatedDelegations,
        },
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "APPROVAL_DELEGATION_REVOKED",
        entityType: "ApprovalDelegation",
        entityId: delegationId,
        safeChangeSummary: `Revoked approval delegation to ${target.delegateeName} early by ${ctx.userFullName}`,
      },
    }),
  ]);
}

/**
 * Evaluates whether a user can exercise delegated authority for a specific approval task.
 * Enforces:
 * 1. Time-window validation (current timestamp must be within validFrom and validUntil).
 * 2. Scope validation (scope must cover the requested task type).
 * 3. NO SELF-APPROVAL CONFLICT: Delegated reviewer CANNOT approve their own submission!
 */
export async function evaluateDelegatedAuthority(
  ctx: TenantContext,
  requiredScope: "LEAVE" | "TASKS" | "DRAWINGS",
  submitterMembershipId: string
): Promise<{ isDelegated: boolean; delegatorName?: string }> {
  // CRITICAL CONFLICT RULE: Submitter can NEVER approve their own submission via delegation!
  if (ctx.membershipId === submitterMembershipId) {
    return { isDelegated: false };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, any>) || {};
  const delegations: any[] = settings.approvalDelegations || [];

  const now = new Date();
  const activeDelegation = delegations.find((d) => {
    if (!d.isActive) return false;
    if (d.delegateeMembershipId !== ctx.membershipId) return false;

    const from = new Date(d.validFrom);
    const until = new Date(d.validUntil);
    if (now < from || now > until) return false;

    if (d.scope === "ALL") return true;
    if (requiredScope === "LEAVE" && d.scope === "LEAVE_ONLY") return true;
    if (requiredScope === "TASKS" && d.scope === "TASKS_ONLY") return true;
    if (requiredScope === "DRAWINGS" && d.scope === "DRAWINGS_ONLY") return true;

    return false;
  });

  if (!activeDelegation) {
    return { isDelegated: false };
  }

  return {
    isDelegated: true,
    delegatorName: activeDelegation.delegatorName,
  };
}
