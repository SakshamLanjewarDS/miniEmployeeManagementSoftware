/**
 * Shared-Task Attribution & De-Duplication Engine (PERF-06)
 * Distinguishes standalone ownership, individual checklist attribution, and shared participation.
 * Prevents double-counting in team rollups.
 */

export interface TaskAttributionResult {
  taskId: string;
  isShared: boolean;
  assignedMemberIds: string[];
  individualShare: number; // 1.0 for single owner, 1/N for shared
  attributionType: "INDIVIDUAL" | "CHECKLIST_SPECIFIC" | "SHARED_PARTICIPATION";
}

/**
 * Calculates attribution share for a task to prevent multiplying delivery counts across multi-assignee teams
 */
export function calculateTaskAttribution(task: {
  id: string;
  assigneeId?: string | null;
  assignedMemberIds?: any;
  checklistItems?: Array<{ assignedMemberId?: string | null }>;
}): Record<string, TaskAttributionResult> {
  const memberIds: string[] = [];
  if (task.assigneeId) memberIds.push(task.assigneeId);

  if (Array.isArray(task.assignedMemberIds)) {
    task.assignedMemberIds.forEach((id: string) => {
      if (typeof id === "string" && !memberIds.includes(id)) {
        memberIds.push(id);
      }
    });
  }

  const results: Record<string, TaskAttributionResult> = {};
  const isShared = memberIds.length > 1;
  const share = memberIds.length > 0 ? 1 / memberIds.length : 1;

  for (const mId of memberIds) {
    // Check if member has specific checklist item attribution
    const memberChecklistCount = task.checklistItems?.filter(
      (c) => c.assignedMemberId === mId
    ).length || 0;

    const attributionType: "INDIVIDUAL" | "CHECKLIST_SPECIFIC" | "SHARED_PARTICIPATION" =
      !isShared
        ? "INDIVIDUAL"
        : memberChecklistCount > 0
        ? "CHECKLIST_SPECIFIC"
        : "SHARED_PARTICIPATION";

    results[mId] = {
      taskId: task.id,
      isShared,
      assignedMemberIds: memberIds,
      individualShare: Number(share.toFixed(3)),
      attributionType,
    };
  }

  return results;
}
