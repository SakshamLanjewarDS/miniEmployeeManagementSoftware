/**
 * Date Controls & Timezone Period Calculator (PERF-04)
 * Supports Daily, Weekly, Monthly, Yearly, and Custom Range with inclusive-to-exclusive boundary conversion.
 */

export type DatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "LAST_YEAR"
  | "CUSTOM";

export interface DateRangeResult {
  preset: DatePreset;
  startDate: Date;
  endDate: Date; // Exclusive query boundary (next day 00:00:00)
  displayStart: string; // YYYY-MM-DD
  displayEnd: string;   // YYYY-MM-DD
  timezone: string;
  totalDays: number;
  isCurrentPeriodIncomplete: boolean;
  comparisonRange?: {
    startDate: Date;
    endDate: Date;
    displayStart: string;
    displayEnd: string;
  };
}

export function parsePeriodDates(
  preset: DatePreset = "THIS_MONTH",
  customStart?: string,
  customEnd?: string,
  timezone: string = "Asia/Kolkata"
): DateRangeResult {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (preset) {
    case "TODAY": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    }
    case "YESTERDAY": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "THIS_WEEK": {
      // Monday as week start
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      break;
    }
    case "LAST_WEEK": {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day - 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      break;
    }
    case "THIS_MONTH": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
    case "LAST_MONTH": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "THIS_YEAR": {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    }
    case "LAST_YEAR": {
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case "CUSTOM":
    default: {
      if (customStart && customEnd) {
        const sParts = customStart.split("-").map(Number);
        const eParts = customEnd.split("-").map(Number);
        start = new Date(sParts[0], sParts[1] - 1, sParts[2]);
        // Translate inclusive user-selected end date to exclusive next-day boundary
        end = new Date(eParts[0], eParts[1] - 1, eParts[2] + 1);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      break;
    }
  }

  const durationMs = end.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

  // Calculate comparison range (equivalent preceding duration)
  const compEnd = new Date(start.getTime());
  const compStart = new Date(start.getTime() - durationMs);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // User-visible inclusive end date is 1 day before exclusive query boundary
  const inclusiveEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const compInclusiveEnd = new Date(compEnd.getTime() - 24 * 60 * 60 * 1000);

  const isCurrentPeriodIncomplete = end.getTime() > now.getTime();

  return {
    preset,
    startDate: start,
    endDate: end,
    displayStart: formatDate(start),
    displayEnd: formatDate(inclusiveEnd),
    timezone,
    totalDays,
    isCurrentPeriodIncomplete,
    comparisonRange: {
      startDate: compStart,
      endDate: compEnd,
      displayStart: formatDate(compStart),
      displayEnd: formatDate(compInclusiveEnd),
    },
  };
}
