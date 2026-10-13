import { TenantContext, ForbiddenException } from "@/server/tenancy/context";
import { TaskWorkflowStatus } from "@prisma/client";

/**
 * Task Completion Governance Policy (GOV-01, GOV-02, GOV-03)
 * Explicit governance policy replacing blanket self-completion:
 * - REVIEW_REQUIRED: Governed architectural deliverables, drawing approvals, releases.
 *   Requires independent four-eyes review. Submitter/assignee CANNOT self-approve (even if Owner/Admin).
 * - SELF_COMPLETION_ALLOWED: Operational, administrative, or non-governed internal tasks.
 */

export type TaskGovernancePolicy = "REVIEW_REQUIRED" | "SELF_COMPLETION_ALLOWED";

export interface GovernanceEvaluationResult {
  allowed: boolean;
  requiresReview: boolean;
  policy: TaskGovernancePolicy;
  reason?: string;
  isBlockedReview?: boolean;
}

/**
 * Determines whether a task requires independent governance review
 */
export function getTaskGovernancePolicy(task: {
  governancePolicy?: string | null;
  acceptanceCriteria?: string | null;
  phaseId?: string | null;
}): TaskGovernancePolicy {
  // If explicitly designated, respect setting
  if (task.governancePolicy === "SELF_COMPLETION_ALLOWED") {
    return "SELF_COMPLETION_ALLOWED";
  }
  // Architectural deliverables linked to phases or with acceptance criteria default to REVIEW_REQUIRED
  return "REVIEW_REQUIRED";
}

/**
 * Evaluates whether an actor is authorized to transition a task to COMPLETED
 * Enforces strict four-eyes principle across all channels (Kanban, dropdowns, APIs, jobs).
 */
export function evaluateTaskCompletionGovernance(
  ctx: TenantContext,
  task: {
    id: string;
    creatorId?: string | null;
    assigneeId?: string | null;
    assignedMemberIds?: any;
    reviewerId?: string | null;
    governancePolicy?: string | null;
    status: TaskWorkflowStatus;
    submissions?: Array<{ submitterId: string; status: string }>;
  },
  targetStatus: TaskWorkflowStatus
): GovernanceEvaluationResult {
  // Non-completion transitions follow standard workflow permissions
  if (targetStatus !== TaskWorkflowStatus.COMPLETED) {
    return {
      allowed: true,
      requiresReview: false,
      policy: getTaskGovernancePolicy(task),
    };
  }

  const policy = getTaskGovernancePolicy(task);

  // 1. Operational tasks with SELF_COMPLETION_ALLOWED
  if (policy === "SELF_COMPLETION_ALLOWED") {
    return {
      allowed: true,
      requiresReview: false,
      policy: "SELF_COMPLETION_ALLOWED",
    };
  }

  // 2. Governed deliverables with REVIEW_REQUIRED
  // Check if current actor is an assignee, creator, or recent submitter
  const assignedMemberIds = Array.isArray(task.assignedMemberIds)
    ? (task.assignedMemberIds as string[])
    : [];
  const isAssignee =
    task.assigneeId === ctx.membershipId ||
    assignedMemberIds.includes(ctx.membershipId);

  const isSubmitter =
    task.submissions?.some(
      (s) => s.submitterId === ctx.membershipId && s.status === "PENDING"
    ) || false;

  // FOUR-EYES RULE: Submitter or assignee CANNOT self-approve governed work!
  // Sovereign Owner status DOES NOT bypass this fundamental architectural governance rule!
  if (isAssignee || isSubmitter) {
    return {
      allowed: false,
      requiresReview: true,
      policy: "REVIEW_REQUIRED",
      reason:
        "Four-Eyes Principle: Deliverable assignees or submitters cannot approve their own governed deliverable. Independent review is mandatory.",
    };
  }

  // Actor must have leadership or designated reviewer authority
  const isPrivileged = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const isDesignatedReviewer = task.reviewerId === ctx.membershipId;

  if (!isPrivileged && !isDesignatedReviewer) {
    return {
      allowed: false,
      requiresReview: true,
      policy: "REVIEW_REQUIRED",
      reason:
        "Forbidden: Only an independent designated reviewer or Studio Leadership can approve governed deliverables.",
    };
  }

  // Check for reviewer availability conflict
  if (task.reviewerId && task.reviewerId === task.assigneeId) {
    return {
      allowed: false,
      requiresReview: true,
      policy: "REVIEW_REQUIRED",
      isBlockedReview: true,
      reason:
        "Blocked Review: The designated reviewer is also the deliverable assignee. Reassign an independent reviewer to approve.",
    };
  }

  return {
    allowed: true,
    requiresReview: true,
    policy: "REVIEW_REQUIRED",
  };
}

/**
 * Asserts task completion governance, throwing ForbiddenException on violation
 */
export function assertTaskCompletionGovernance(
  ctx: TenantContext,
  task: any,
  targetStatus: TaskWorkflowStatus
): void {
  const result = evaluateTaskCompletionGovernance(ctx, task, targetStatus);
  if (!result.allowed) {
    throw new ForbiddenException(result.reason || "Governed task completion disallowed.");
  }
}
