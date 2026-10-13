import { ProjectStatus, TenantRole } from "@prisma/client";
import { TenantContext, isAdminOrOwner, assertAdminOrOwner, ForbiddenException } from "../../tenancy/context";

/**
 * ============================================================================
 * PROJECT LIFECYCLE TRANSITION MATRIX & POLICY
 * ============================================================================
 *
 * Canonical Project States:
 * - DRAFT: Pre-commissioning concept. Incomplete briefs permitted. No operational tasks or timers.
 * - PLANNING: Formal pre-design / brief development phase prior to construction commissioning.
 * - ACTIVE: Fully commissioned project with active deliverables, site visits, and timers.
 * - ON_HOLD: Temporarily suspended project. Freezes new work, timers, and check-ins. Allows checkout and stopping timers.
 * - COMPLETED: Finished project. Handover package compiled, 0 active site visits, all deliverables completed or exception-waived.
 * - CANCELLED: Terminated project with work disposition (CANCEL_OPEN_TASKS or PRESERVE_SUBMITTED_WORK).
 *
 * Visibility Property:
 * - isArchived: Orthogonal boolean property. Hides project from active workspace listings while preserving underlying status.
 */

export const ALLOWED_PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [
    ProjectStatus.PLANNING,
    ProjectStatus.ACTIVE,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.PLANNING]: [
    ProjectStatus.DRAFT,
    ProjectStatus.ACTIVE,
    ProjectStatus.ON_HOLD,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.ACTIVE]: [
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.ON_HOLD]: [
    ProjectStatus.ACTIVE,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.COMPLETED]: [
    ProjectStatus.ACTIVE, // via reopenProject only
  ],
  [ProjectStatus.CANCELLED]: [
    ProjectStatus.ACTIVE, // via reopenProject only
  ],
  [ProjectStatus.ARCHIVED]: [
    ProjectStatus.ACTIVE, // legacy enum compatibility
  ],
};

export interface LifecycleTransitionRule {
  allowedSourceStates: ProjectStatus[];
  permittedRoles: TenantRole[];
  requiresReason: boolean;
  actionName: string;
}

export const LIFECYCLE_ACTIONS: Record<string, LifecycleTransitionRule> = {
  ACTIVATE: {
    allowedSourceStates: [ProjectStatus.DRAFT, ProjectStatus.PLANNING],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: false,
    actionName: "Commission & Activate Project",
  },
  PLAN: {
    allowedSourceStates: [ProjectStatus.DRAFT],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: false,
    actionName: "Advance to Planning / Concept Phase",
  },
  HOLD: {
    allowedSourceStates: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: true,
    actionName: "Place Project On Hold",
  },
  RESUME: {
    allowedSourceStates: [ProjectStatus.ON_HOLD],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: true,
    actionName: "Resume Project from Hold",
  },
  COMPLETE: {
    allowedSourceStates: [ProjectStatus.ACTIVE],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: false,
    actionName: "Close & Complete Project",
  },
  REOPEN: {
    allowedSourceStates: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: true,
    actionName: "Reopen Closed / Cancelled Project",
  },
  CANCEL: {
    allowedSourceStates: [ProjectStatus.DRAFT, ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD],
    permittedRoles: [TenantRole.OWNER, TenantRole.ADMIN],
    requiresReason: true,
    actionName: "Cancel Project",
  },
};

/**
 * Validates whether a project status transition is permitted under studio governance rules.
 */
export function validateProjectStatusTransition(
  ctx: TenantContext,
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus,
  options: {
    isExplicitLifecycleAction?: boolean;
    reason?: string;
  } = {}
): void {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can change project lifecycle status.");

  if (currentStatus === targetStatus) {
    return; // No-op transition
  }

  const allowedTargets = ALLOWED_PROJECT_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    throw new Error(
      `Invalid lifecycle transition: Cannot move project from ${currentStatus} to ${targetStatus}. Permitted transitions from ${currentStatus} are: [${allowedTargets.join(", ")}].`
    );
  }

  // Prevent generic update from bypassing governed endpoints
  if (!options.isExplicitLifecycleAction) {
    if (targetStatus === ProjectStatus.COMPLETED) {
      throw new Error(
        "Direct status change to COMPLETED is forbidden. Use the governed project completion action with checklist verification."
      );
    }
    if (targetStatus === ProjectStatus.ON_HOLD) {
      throw new Error(
        "Direct status change to ON_HOLD is forbidden. Use the governed hold project action with documented rationale."
      );
    }
    if (targetStatus === ProjectStatus.CANCELLED) {
      throw new Error(
        "Direct status change to CANCELLED is forbidden. Use the governed project cancellation action with work disposition."
      );
    }
    if ((currentStatus === ProjectStatus.COMPLETED || currentStatus === ProjectStatus.CANCELLED) && targetStatus === ProjectStatus.ACTIVE) {
      throw new Error(
        `Direct status change to ACTIVE is forbidden for ${currentStatus} projects. Use the governed reopen project action with justification.`
      );
    }
  }
}

/**
 * Returns the permitted target states for a project given its current state.
 */
export function getAvailableProjectTransitions(currentStatus: ProjectStatus): ProjectStatus[] {
  return ALLOWED_PROJECT_TRANSITIONS[currentStatus] || [];
}
