export function getTaskDateAnalysis(
  dueDateStr: string | null | undefined,
  createdAtStr: string | null | undefined,
  status: string,
  timezone: string = "Asia/Kolkata"
) {
  // If task is completed or cancelled, terminal status removes active overdue/due today warnings
  const isTerminal = status === "COMPLETED" || status === "CANCELLED";

  // Formatter for calendar date comparison (YYYY-MM-DD)
  const getCalendarDateStr = (dateObj: Date): string => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(dateObj);
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
      return `${year}-${month}-${day}`;
    } catch {
      return dateObj.toISOString().split("T")[0];
    }
  };

  const todayStr = getCalendarDateStr(new Date());

  let formattedDueDate = "Not set";
  let isDueToday = false;
  let isOverdue = false;

  if (dueDateStr) {
    const dueObj = new Date(dueDateStr);
    if (!isNaN(dueObj.getTime())) {
      try {
        formattedDueDate = new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(dueObj);
      } catch {
        formattedDueDate = dueObj.toLocaleDateString();
      }

      const dueCalendarStr = getCalendarDateStr(dueObj);
      if (!isTerminal) {
        if (dueCalendarStr === todayStr) {
          isDueToday = true;
        } else if (dueCalendarStr < todayStr) {
          isOverdue = true;
        }
      }
    }
  }

  let formattedCreatedAt = "Not set";
  if (createdAtStr) {
    const createdObj = new Date(createdAtStr);
    if (!isNaN(createdObj.getTime())) {
      try {
        formattedCreatedAt = new Intl.DateTimeFormat("en-IN", {
          timeZone: timezone,
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(createdObj);
      } catch {
        formattedCreatedAt = createdObj.toLocaleDateString();
      }
    }
  }

  return {
    formattedDueDate,
    formattedCreatedAt,
    isDueToday,
    isOverdue,
    isTerminal,
  };
}

/**
 * Strips auto-injected metadata footers (e.g. "Typology: ...") from task descriptions
 * so only the user's authentic deliverable notes are shown.
 */
export function sanitizeTaskDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  let cleaned = desc.trim();

  // Strip trailing metadata block (e.g. "\n\n---\nTypology: ..." or "\n---\nTypology: ...")
  if (cleaned.includes("\n\n---\n")) {
    const parts = cleaned.split("\n\n---\n");
    const mainText = parts[0].trim();
    if (!mainText && parts[1]?.toLowerCase().includes("typology:")) {
      return "";
    }
    cleaned = mainText;
  } else if (cleaned.includes("\n---\n")) {
    const parts = cleaned.split("\n---\n");
    const mainText = parts[0].trim();
    if (!mainText && parts[1]?.toLowerCase().includes("typology:")) {
      return "";
    }
    cleaned = mainText;
  }

  // If the description is purely meta notes like "Typology: Commercial & Corporate Office"
  // or "Typology: ... • Assigned Specialist: ..."
  if (/^Typology:\s*[^•\n]+(\s*•\s*[^•\n]+)*$/i.test(cleaned)) {
    return "";
  }

  // If it starts with "Typology: ..." on the first line
  cleaned = cleaned.replace(/^Typology:\s*[^\n]+(\n|$)/i, "").trim();

  return cleaned;
}

/**
 * Workflow Priority Ranking for Studio Tasks:
 * 1. CHECKING (Top priority: awaiting partner/admin review or submitted deliverables)
 * 2. ONGOING (Active in-progress deliverables)
 * 3. OTHERS (Todo, Started, Changes requested, Blocked, etc.)
 * 4. COMPLETED (Finished deliverables - automatically positioned at the down/bottom)
 * 5. CANCELLED (Terminal cancelled tasks)
 */
export function getTaskWorkflowRank(
  taskOrStatus:
    | string
    | null
    | undefined
    | {
        status?: string | null;
        submissions?: Array<{ status?: string | null }> | null;
        checklistItems?: Array<{ status?: string | null }> | null;
      }
): number {
  if (!taskOrStatus) return 3;

  const status = (
    typeof taskOrStatus === "string" ? taskOrStatus : taskOrStatus.status || ""
  ).toUpperCase();

  // 1. Completed deliverables go to the bottom (rank 4)
  if (status === "COMPLETED") {
    return 4;
  }
  // 2. Cancelled deliverables also go to the bottom (rank 5)
  if (status === "CANCELLED") {
    return 5;
  }

  // 3. Checking / In Review deliverables go to the top (rank 1)
  const isObj = typeof taskOrStatus === "object" && taskOrStatus !== null;
  const hasPendingSubmission =
    isObj &&
    Array.isArray(taskOrStatus.submissions) &&
    taskOrStatus.submissions.some((s) => s?.status === "PENDING");
  const hasItemInReview =
    isObj &&
    Array.isArray(taskOrStatus.checklistItems) &&
    taskOrStatus.checklistItems.some(
      (ci) => ci?.status === "IN_REVIEW" || ci?.status === "CHECKING"
    );

  if (
    status === "CHECKING" ||
    status === "IN_REVIEW" ||
    hasPendingSubmission ||
    hasItemInReview
  ) {
    return 1;
  }

  // 4. Ongoing / In Progress deliverables (rank 2)
  if (status === "ONGOING" || status === "IN_PROGRESS") {
    return 2;
  }

  // 5. All others (TODO, NOT_STARTED, STARTED, CHANGES_REQUESTED, REVISION, BLOCKED, etc.) (rank 3)
  return 3;
}

/**
 * Compare two tasks according to studio workflow hierarchy:
 * Checking (top) > Ongoing > Others > Completed (down/bottom)
 * Within each status tier, sorts by the chosen secondary sort.
 */
export function compareTasksByWorkflow(
  a: any,
  b: any,
  secondarySort: string = "DUE_DATE_ASC"
): number {
  const rankA = getTaskWorkflowRank(a);
  const rankB = getTaskWorkflowRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // If both tasks are completed, prioritize most recently completed first
  if (rankA === 4) {
    if (a.completionDate && b.completionDate) {
      const compDiff =
        new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime();
      if (compDiff !== 0) return compDiff;
    }
  }

  switch (secondarySort) {
    case "DUE_DATE_ASC": {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    case "DUE_DATE_DESC": {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    }
    case "CREATED_DESC":
      return (
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    case "CREATED_ASC":
      return (
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    case "ALPHA_ASC":
      return (a.title || "").localeCompare(b.title || "");
    case "ALPHA_DESC":
      return (b.title || "").localeCompare(a.title || "");
    case "PROJ_ALPHA_ASC":
      return (a.project?.code || "").localeCompare(b.project?.code || "");
    default:
      return 0;
  }
}

