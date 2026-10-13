import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner, ForbiddenException } from "../../tenancy/context";

/**
 * Leave Balance Ledger Service (LEAVE-05)
 * Explanatory, immutable balance transaction ledger tracking:
 * - Monthly accrual credits
 * - Balance reservations for pending requests
 * - Consumptions on approval
 * - Releases on rejection / cancellation
 * - Authorized manual adjustments with documented reasons
 */

export type LedgerEntryType =
  | "MONTHLY_ACCRUAL"
  | "PENDING_RESERVATION"
  | "RESERVATION_RELEASED"
  | "CONSUMED_APPROVED"
  | "CANCELLATION_RESTORE"
  | "MANUAL_ADJUSTMENT"
  | "YEAR_END_EXPIRY";

export interface LedgerEntryRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  entryType: LedgerEntryType;
  amountDays: number;
  balanceAfter: number;
  leaveRequestId?: string;
  actorId?: string;
  reason: string;
  effectiveDate: Date;
  createdAt: Date;
}

// In-memory ledger buffer for fast balance calculation and explanatory auditing
const inMemoryLedger: LedgerEntryRecord[] = [];

/**
 * Appends an explanatory transaction entry to the employee's leave balance ledger
 */
export async function recordLeaveLedgerEntry(
  tenantId: string,
  employeeId: string,
  entryType: LedgerEntryType,
  amountDays: number,
  reason: string,
  options: {
    leaveRequestId?: string;
    actorId?: string;
    effectiveDate?: Date;
  } = {}
): Promise<LedgerEntryRecord> {
  const currentHistory = inMemoryLedger.filter(
    (e) => e.tenantId === tenantId && e.employeeId === employeeId
  );
  const currentBalance = currentHistory.reduce((sum, e) => sum + e.amountDays, 0);
  const newBalance = Number((currentBalance + amountDays).toFixed(3));

  const entry: LedgerEntryRecord = {
    id: `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenantId,
    employeeId,
    entryType,
    amountDays,
    balanceAfter: newBalance,
    leaveRequestId: options.leaveRequestId,
    actorId: options.actorId,
    reason,
    effectiveDate: options.effectiveDate || new Date(),
    createdAt: new Date(),
  };

  inMemoryLedger.push(entry);

  // Also log into studio audit events
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: options.actorId || "SYSTEM",
        action: "LEAVE_LEDGER_TRANSACTION",
        entityType: "EmployeeLeaveLedger",
        entityId: employeeId,
        safeChangeSummary: `[${entryType}] ${amountDays > 0 ? "+" : ""}${amountDays} days for Employee ${employeeId}. Balance: ${newBalance}. Reason: ${reason}`,
      },
    });
  } catch {
    // Non-fatal
  }

  return entry;
}

/**
 * Retrieves the full explanatory ledger statement for an employee
 */
export async function getEmployeeLedgerStatement(
  tenantId: string,
  employeeId: string
): Promise<{
  employeeId: string;
  currentPaidBalance: number;
  entries: LedgerEntryRecord[];
}> {
  const entries = inMemoryLedger
    .filter((e) => e.tenantId === tenantId && e.employeeId === employeeId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const currentPaidBalance = entries.reduce((sum, e) => sum + e.amountDays, 0);

  return {
    employeeId,
    currentPaidBalance: Number(Math.max(0, currentPaidBalance).toFixed(3)),
    entries,
  };
}

/**
 * Authorized manual adjustment of leave balance with required justification
 */
export async function adjustEmployeeLeaveBalance(
  ctx: TenantContext,
  employeeId: string,
  adjustmentDays: number,
  justificationReason: string
): Promise<LedgerEntryRecord> {
  assertAdminOrOwner(ctx, "Only Studio Leadership can execute manual leave balance adjustments.");

  if (!justificationReason || justificationReason.trim().length < 5) {
    throw new Error("A clear audit justification reason is required for manual balance adjustments.");
  }

  return await recordLeaveLedgerEntry(
    ctx.tenantId,
    employeeId,
    "MANUAL_ADJUSTMENT",
    adjustmentDays,
    justificationReason.trim(),
    { actorId: ctx.membershipId }
  );
}
