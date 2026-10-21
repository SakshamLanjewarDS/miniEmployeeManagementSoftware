/**
 * Form helpers and presets for advanced Google Form-style Leave Application
 */

export interface TimeSlot {
  minutes: number;
  label: string;
}

export const STUDIO_WORKDAY_START_MINUTES = 630; // 10:30 AM
export const STUDIO_WORKDAY_END_MINUTES = 1110;  // 06:30 PM
export const STUDIO_STANDARD_DAY_MINUTES = 480;  // 8 Hours

/**
 * Formats minutes from midnight into 12-hour AM/PM string
 */
export function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${period}`;
}

/**
 * Generates 30-min time slots within the studio workday
 */
export const STUDIO_TIME_SLOTS: TimeSlot[] = [
  { minutes: 630, label: "10:30 AM (Office Open)" },
  { minutes: 660, label: "11:00 AM" },
  { minutes: 690, label: "11:30 AM" },
  { minutes: 720, label: "12:00 PM" },
  { minutes: 750, label: "12:30 PM" },
  { minutes: 780, label: "01:00 PM" },
  { minutes: 810, label: "01:30 PM" },
  { minutes: 840, label: "02:00 PM" },
  { minutes: 870, label: "02:30 PM (Second Half Start)" },
  { minutes: 900, label: "03:00 PM" },
  { minutes: 930, label: "03:30 PM" },
  { minutes: 960, label: "04:00 PM" },
  { minutes: 990, label: "04:30 PM" },
  { minutes: 1020, label: "05:00 PM" },
  { minutes: 1050, label: "05:30 PM" },
  { minutes: 1080, label: "06:00 PM" },
  { minutes: 1110, label: "06:30 PM (Office Close)" },
];

export interface HourlyPreset {
  label: string;
  minutes: number;
  daysFraction: string;
}

export const HOURLY_PRESETS: HourlyPreset[] = [
  { label: "30 Mins", minutes: 30, daysFraction: "0.063" },
  { label: "1 Hour", minutes: 60, daysFraction: "0.125" },
  { label: "1.5 Hours", minutes: 90, daysFraction: "0.188" },
  { label: "2 Hours", minutes: 120, daysFraction: "0.250" },
  { label: "3 Hours", minutes: 180, daysFraction: "0.375" },
  { label: "4 Hours", minutes: 240, daysFraction: "0.500" },
];

export interface LeaveTypeOption {
  id: string;
  label: string;
  code: string;
  badge: string;
  desc: string;
  exemptNotice?: boolean;
}

export const ADVANCED_LEAVE_TYPES: LeaveTypeOption[] = [
  {
    id: "CASUAL",
    label: "Casual Leave",
    code: "CL",
    badge: "Personal / Family",
    desc: "For planned personal commitments, family events, and personal time off",
  },
  {
    id: "EMERGENCY",
    label: "Emergency Leave",
    code: "EL",
    badge: "Urgent Exempt",
    desc: "For unforeseen urgent personal or family emergencies",
    exemptNotice: true,
  },
  {
    id: "SICK",
    label: "Sick / Medical Leave",
    code: "SL",
    badge: "Medical Exempt",
    desc: "For sudden illness, doctor consultation, and recovery",
    exemptNotice: true,
  },
];

export interface StructuredLeaveMetadata {
  reason: string;
  emergencyContact?: string;
  coveringColleague?: string;
  coveringColleagueId?: string;
  handoverNotes?: string;
  supportingDocUrl?: string;
  supportingDocName?: string;
}

/**
 * Builds a composite string preserving backward compatibility with legacy reason column
 */
export function buildCompositeLeaveReason(data: StructuredLeaveMetadata): string {
  const parts: string[] = [];
  const cleanReason = (data.reason || "").trim();
  if (cleanReason) {
    parts.push(cleanReason);
  }

  const metaLines: string[] = [];
  if (data.coveringColleague) {
    metaLines.push(`• Covering Colleague: ${data.coveringColleague}`);
  }
  if (data.coveringColleagueId) {
    metaLines.push(`• Covering Colleague ID: ${data.coveringColleagueId}`);
  }
  if (data.handoverNotes) {
    metaLines.push(`• Handover Notes: ${data.handoverNotes}`);
  }
  if (data.emergencyContact) {
    metaLines.push(`• Emergency Contact: ${data.emergencyContact}`);
  }
  if (data.supportingDocUrl) {
    metaLines.push(`• Supporting Document: ${data.supportingDocUrl}`);
  }
  if (data.supportingDocName) {
    metaLines.push(`• Document Name: ${data.supportingDocName}`);
  }

  if (metaLines.length > 0) {
    if (parts.length > 0) {
      parts.push("\n---");
    }
    parts.push(...metaLines);
  }

  return parts.join("\n");
}

/**
 * Parses legacy/composite reason strings back into structured metadata
 */
export function parseCompositeLeaveReason(raw?: string | null): StructuredLeaveMetadata {
  if (!raw) {
    return { reason: "" };
  }

  const lines = raw.split("\n");
  const reasonLines: string[] = [];
  let emergencyContact: string | undefined;
  let coveringColleague: string | undefined;
  let coveringColleagueId: string | undefined;
  let handoverNotes: string | undefined;
  let supportingDocUrl: string | undefined;
  let supportingDocName: string | undefined;

  let inMetaSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "---") {
      inMetaSection = true;
      continue;
    }

    if (trimmed.startsWith("• Covering Colleague:") || trimmed.startsWith("Covering Colleague:")) {
      coveringColleague = trimmed.replace(/^.*?Covering Colleague:\s*/i, "").trim();
    } else if (trimmed.startsWith("• Covering Colleague ID:") || trimmed.startsWith("Covering Colleague ID:")) {
      coveringColleagueId = trimmed.replace(/^.*?Covering Colleague ID:\s*/i, "").trim();
    } else if (trimmed.startsWith("• Handover Notes:") || trimmed.startsWith("Handover Notes:")) {
      handoverNotes = trimmed.replace(/^.*?Handover Notes:\s*/i, "").trim();
    } else if (trimmed.startsWith("• Emergency Contact:") || trimmed.startsWith("Emergency Contact:")) {
      emergencyContact = trimmed.replace(/^.*?Emergency Contact:\s*/i, "").trim();
    } else if (trimmed.startsWith("• Supporting Document:") || trimmed.startsWith("Supporting Document:")) {
      supportingDocUrl = trimmed.replace(/^.*?Supporting Document:\s*/i, "").trim();
    } else if (trimmed.startsWith("• Document Name:") || trimmed.startsWith("Document Name:")) {
      supportingDocName = trimmed.replace(/^.*?Document Name:\s*/i, "").trim();
    } else if (!inMetaSection) {
      reasonLines.push(line);
    }
  }

  return {
    reason: reasonLines.join("\n").trim(),
    emergencyContact,
    coveringColleague,
    coveringColleagueId,
    handoverNotes,
    supportingDocUrl,
    supportingDocName,
  };
}

/**
 * Calculates calendar days and working days (excluding Sundays) between two dates
 */
export function calculateDateMetrics(startDateStr: string, endDateStr: string) {
  if (!startDateStr) return { calendarDays: 0, workingDays: 0 };
  const endStr = endDateStr || startDateStr;
  
  const start = new Date(startDateStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { calendarDays: 0, workingDays: 0 };
  }

  const diffTime = end.getTime() - start.getTime();
  const calendarDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay(); // 0 = Sunday
    if (day !== 0) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return { calendarDays, workingDays };
}
