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

