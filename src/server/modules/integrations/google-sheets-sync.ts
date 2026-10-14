/**
 * 24/7 Live Two-Way Google Sheets Synchronization Engine
 * 100% DESIGN Studio — Multi-Tenant Architecture
 *
 * Implements:
 * 1. Live 24/7 background & on-demand sync from Google Sheets (Leave & Vendors).
 * 2. Tombstone Protection: Prevents deleted records from resurrecting on re-sync.
 * 3. Local Authority Shield: Preserves in-app approval/rejection decisions against stale "Pending" sheet states.
 * 4. Auto-provisioning & linking of employees based on sheet email & name.
 * 5. Outbound Webhook Dispatcher: Pushes status changes (Approve, Reject, Delete) directly back to Google Sheet.
 */

import { prisma } from "@/server/db/prisma";
import { TenantContext } from "@/server/tenancy/context";
import { Decimal } from "@prisma/client/runtime/library";

export const DEFAULT_LEAVE_SHEET_ID = "1xw3788TL51yjHzjRZYp2A1Pp9NpoB8pXYzNDvdrCR1U";
export const DEFAULT_VENDOR_SHEET_ID = "1lOYNw1fk9xjSL61SZuox2gB1VRwW3ldQR460h5Ds9J8";

export const DEFAULT_LEAVE_CSV_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_LEAVE_SHEET_ID}/export?format=csv`;
export const DEFAULT_VENDOR_CSV_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_VENDOR_SHEET_ID}/export?format=csv`;

export const DEFAULT_LEAVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw28LoETUSD3jbnDIxMZqBSPoggKLw_iHen4cFkUMm6Ayq6VukjcPwij5YoJRPRS198RA/exec";

/**
 * Splits CSV lines while respecting quoted fields and multi-line content.
 */
function parseCsvRows(csvText: string): string[][] {
  if (!csvText || typeof csvText !== "string") return [];
  const text = csvText.replace(/^\uFEFF/, ""); // Strip BOM

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses calendar dates (From Date, To Date, Leave Date) as Date object at UTC 00:00:00 for @db.Date fields.
 * This completely prevents timezone shifts (e.g. IST midnight UTC-5h30m showing previous day).
 */
export function parseSheetDateOnly(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const clean = str.trim();

  // If ISO string like 2026-10-12 or 2026-10-12T...
  if (clean.includes("T")) {
    const parts = clean.split("T")[0].split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (y && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
    }
  }

  const match = clean.match(
    /^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/
  );

  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const p3 = parseInt(match[3], 10);

    let year = 0;
    let month = 0;
    let day = 0;

    if (p1 >= 1000) {
      // YYYY-MM-DD
      year = p1;
      month = p2;
      day = p3;
    } else if (p3 >= 1000) {
      year = p3;
      if (p1 > 12) {
        // DD/MM/YYYY (e.g. 21/09/2026)
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        // MM/DD/YYYY (e.g. 09/21/2026)
        month = p1;
        day = p2;
      } else {
        // Both <= 12: In Google Sheets/Forms default export format, p1 is month, p2 is day
        month = p1;
        day = p2;
      }
    }

    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    }
  }

  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) {
    return new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0));
  }
  return null;
}

/**
 * Parses timestamp strings from Google Sheet (IST: UTC+5:30) into exact UTC Date object
 */
export function parseSheetTimestamp(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const clean = str.trim();

  // If already an ISO string with explicit timezone
  if (clean.includes("Z") || (clean.includes("T") && (clean.includes("+") || clean.includes("-")))) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  const match = clean.match(
    /^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?)?/i
  );

  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const p3 = parseInt(match[3], 10);
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    const mins = match[5] ? parseInt(match[5], 10) : 0;
    const secs = match[6] ? parseInt(match[6], 10) : 0;
    const meridiem = match[7]?.toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    let year = 0;
    let month = 0;
    let day = 0;

    if (p1 >= 1000) {
      year = p1;
      month = p2;
      day = p3;
    } else if (p3 >= 1000) {
      year = p3;
      if (p1 > 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        month = p1;
        day = p2;
      } else {
        month = p1;
        day = p2;
      }
    }

    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // Indian Standard Time (IST) is UTC+5:30. Convert IST to UTC
      const utcTime = Date.UTC(year, month - 1, day, hours, mins, secs) - (5.5 * 60 * 60 * 1000);
      return new Date(utcTime);
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Parses dates formatted as M/D/YYYY, DD/MM/YYYY, YYYY-MM-DD, or ISO strings
 */
export function parseSheetDate(str: string): Date | null {
  if (!str || !str.trim()) return null;
  if (/\d+:\d+/.test(str)) {
    return parseSheetTimestamp(str);
  }
  return parseSheetDateOnly(str);
}

/**
 * Parses time string like "10:30:00 AM" into minutes from midnight
 */
function parseSheetTimeMinutes(timeStr: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const match = timeStr.trim().match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[4]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Cleans string for safe ID creation
 */
function cleanIdentifier(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Helper to get or create Employee record when syncing from Google Sheets
 */
async function findOrCreateEmployeeForSheetRow(
  tenantId: string,
  email: string,
  fullName: string,
  department?: string
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  // 1. Try finding existing employee by email
  const existingEmployee = await prisma.employee.findFirst({
    where: {
      tenantId,
      membership: {
        user: {
          email: { equals: cleanEmail },
        },
      },
    },
    include: { membership: { include: { user: true } } },
  });

  if (existingEmployee) return existingEmployee;

  // 2. Try finding employee by user fullName
  const nameMatch = await prisma.employee.findFirst({
    where: {
      tenantId,
      membership: {
        user: {
          fullName: { equals: cleanName },
        },
      },
    },
    include: { membership: { include: { user: true } } },
  });

  if (nameMatch) return nameMatch;

  // 3. Auto-provision user & employee record for this team member
  let user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        fullName: cleanName || "Staff Member",
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.", // Default locked password
        accountState: "ACTIVE",
      },
    });
  }

  let membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id,
      },
    },
  });

  if (!membership) {
    membership = await prisma.tenantMembership.create({
      data: {
        tenantId,
        userId: user.id,
        role: "EMPLOYEE",
        isActive: true,
      },
    });
  }

  // Generate unique employee ID
  const count = await prisma.employee.count({ where: { tenantId } });
  const employeeId = `EMP-GS${String(count + 1).padStart(3, "0")}`;

  const newEmployee = await prisma.employee.create({
    data: {
      tenantId,
      membershipId: membership.id,
      employeeId,
      department: department?.trim() || "Architecture",
      designation: "Studio Specialist",
      employmentStatus: "ACTIVE",
      joinDate: new Date(),
    },
    include: { membership: { include: { user: true } } },
  });

  return newEmployee;
}

export interface SyncResult {
  syncType: "LEAVE_SHEET" | "VENDOR_SHEET";
  success: boolean;
  importedCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedTombstonesCount: number;
  preservedLocalDecisionsCount: number;
  failedCount: number;
  lastAttemptAt: string;
  error?: string | null;
}

/**
 * 1. LIVE SYNC FOR LEAVE APPLICATION SHEET
 */
export async function syncLiveLeaveSheet(
  ctx: TenantContext,
  customSheetUrl?: string
): Promise<SyncResult> {
  const now = new Date();
  const url = customSheetUrl || DEFAULT_LEAVE_CSV_URL;

  // Find or create sync config
  let config = await prisma.studioSyncConfig.findUnique({
    where: { tenantId_syncType: { tenantId: ctx.tenantId, syncType: "LEAVE_SHEET" } },
  });

  if (!config) {
    config = await prisma.studioSyncConfig.create({
      data: {
        tenantId: ctx.tenantId,
        syncType: "LEAVE_SHEET",
        sheetId: DEFAULT_LEAVE_SHEET_ID,
        sheetTabName: "Form Responses 1",
        isEnabled: true,
      },
    });
  } else if (config.sheetId === "MANUAL_TEST_SHEET") {
    config = await prisma.studioSyncConfig.update({
      where: { id: config.id },
      data: { sheetId: DEFAULT_LEAVE_SHEET_ID },
    });
  }

  let importedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedTombstonesCount = 0;
  let preservedLocalDecisionsCount = 0;
  let failedCount = 0;
  let errorMsg: string | null = null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet CSV: HTTP ${res.status} ${res.statusText}`);
    }

    const csvText = await res.text();
    const rows = parseCsvRows(csvText);

    if (rows.length < 2) {
      throw new Error("Google Sheet returned empty or invalid CSV content");
    }

    // Header index mapping
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const findCol = (kw: string) => headers.findIndex((h) => h.includes(kw));

    const colTimestamp = findCol("timestamp") >= 0 ? findCol("timestamp") : 0;
    const colName = findCol("employee name") >= 0 ? findCol("employee name") : 1;
    const colDept = findCol("department") >= 0 ? findCol("department") : 2;
    const colLeaveType = findCol("leave type") >= 0 ? findCol("leave type") : 3;
    const colRegularReason = headers.findIndex((h, idx) => h.includes("reason") && idx < 7) >= 0
      ? headers.findIndex((h, idx) => h.includes("reason") && idx < 7)
      : 4;
    const colFromDate = findCol("from date") >= 0 ? findCol("from date") : 5;
    const colToDate = findCol("to date") >= 0 ? findCol("to date") : 6;
    const colMedicalCert = findCol("medical certificate") >= 0 ? findCol("medical certificate") : 7;
    const colEmail = findCol("email") >= 0 ? findCol("email") : 8;
    const colHourlyReason = headers.findIndex((h, idx) => h.includes("reason") && idx >= 7) >= 0
      ? headers.findIndex((h, idx) => h.includes("reason") && idx >= 7)
      : 9;
    const colHourlyDate = findCol("leave date") >= 0 ? findCol("leave date") : 10;
    const colFromTime = findCol("from time") >= 0 ? findCol("from time") : 11;
    const colToTime = findCol("to time") >= 0 ? findCol("to time") : 12;
    const colStatus = findCol("status") >= 0 ? findCol("status") : 13;
    const colProcessedBy = findCol("processed by") >= 0 ? findCol("processed by") : 14;
    const colActionDate = findCol("action date") >= 0 ? findCol("action date") : 15;

    // Iterate data rows (row 1 onwards)
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => !c.trim())) continue;

      const timestampRaw = row[colTimestamp] || "";
      const emailRaw = row[colEmail] || "";
      const nameRaw = (row[colName] || "").trim();
      const deptRaw = (row[colDept] || "").trim();
      const leaveTypeRaw = (row[colLeaveType] || "").trim();
      const statusRaw = (row[colStatus] || "").trim();
      const processedByRaw = (row[colProcessedBy] || "").trim();
      const actionDateRaw = (row[colActionDate] || "").trim();
      const medicalCertRaw = (row[colMedicalCert] || "").trim();

      if (!timestampRaw && !emailRaw) continue;

      // Unique stable identifier for this sheet submission
      const sourceRecordId = `LEAVE_${cleanIdentifier(timestampRaw)}_${cleanIdentifier(emailRaw)}`;

      // Determine leave typology & mode
      const isHourly = /few hours|hourly/i.test(leaveTypeRaw);
      const isHalfDay = /half[- ]day/i.test(leaveTypeRaw);

      // Reason handling: if hourly, prefer hourly reason column; otherwise regular reason
      const reasonRaw = (
        isHourly
          ? (row[colHourlyReason] || row[colRegularReason] || row[9] || row[4] || "")
          : (row[colRegularReason] || row[colHourlyReason] || row[4] || row[9] || "")
      ).trim();

      let leaveType = "CASUAL";
      if (/sick/i.test(leaveTypeRaw)) leaveType = "SICK";
      else if (/emergency/i.test(leaveTypeRaw)) leaveType = "EMERGENCY";
      else if (/annual/i.test(leaveTypeRaw)) leaveType = "ANNUAL";
      else if (isHalfDay) leaveType = "HALF_DAY";
      else if (isHourly) leaveType = "HOURLY";

      // Date resolution
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      let startMinutes: number | null = null;
      let endMinutes: number | null = null;
      let totalMinutes: number | null = null;
      let days = new Decimal(1.0);

      if (isHourly) {
        startDate = parseSheetDateOnly(row[colHourlyDate] || row[colFromDate]) || parseSheetDateOnly(timestampRaw);
        endDate = startDate;
        startMinutes = parseSheetTimeMinutes(row[colFromTime]);
        endMinutes = parseSheetTimeMinutes(row[colToTime]);
        if (startMinutes !== null && endMinutes !== null) {
          totalMinutes = Math.max(0, endMinutes - startMinutes);
          if (totalMinutes === 0) totalMinutes = 60; // fallback if identical times entered
          days = new Decimal(Number((totalMinutes / (8 * 60)).toFixed(3)));
        } else {
          totalMinutes = 120;
          days = new Decimal(0.25);
        }
      } else if (isHalfDay) {
        startDate = parseSheetDateOnly(row[colFromDate]) || parseSheetDateOnly(timestampRaw);
        endDate = parseSheetDateOnly(row[colToDate]) || startDate;
        days = new Decimal(0.5);
      } else {
        startDate = parseSheetDateOnly(row[colFromDate]) || parseSheetDateOnly(timestampRaw);
        endDate = parseSheetDateOnly(row[colToDate]) || startDate;
        if (startDate && endDate) {
          if (endDate < startDate) {
            endDate = startDate;
            days = new Decimal(1.0);
          } else {
            const diffMs = endDate.getTime() - startDate.getTime();
            const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
            days = new Decimal(diffDays);
          }
        }
      }

      if (!startDate) {
        startDate = parseSheetDateOnly(timestampRaw) || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      }
      if (!endDate) {
        endDate = startDate;
      }

      // Status resolution from sheet
      let mappedStatus = "PENDING";
      let isRejectedInSheet = false;
      const lowerStatus = statusRaw.toLowerCase();

      if (lowerStatus.includes("approved")) {
        mappedStatus = "APPROVED";
      } else if (lowerStatus.includes("reject")) {
        mappedStatus = "REJECTED";
        isRejectedInSheet = true;
      } else {
        mappedStatus = "PENDING";
      }

      // Check existing database record
      const existing = await prisma.studioLeaveRequest.findFirst({
        where: {
          tenantId: ctx.tenantId,
          sourceSystem: "GOOGLE_SHEETS",
          sourceRecordId,
        },
      });

      // 🛡️ TOMBSTONE SHIELD: If deleted in app, NEVER resurrect!
      if (existing && existing.deletedAt !== null) {
        skippedTombstonesCount++;
        continue;
      }

      // 🛡️ LOCAL AUTHORITY SHIELD:
      // If approved or rejected in app, do NOT revert to PENDING from sheet!
      if (existing && existing.status !== "PENDING" && mappedStatus === "PENDING") {
        preservedLocalDecisionsCount++;
        unchangedCount++;
        continue;
      }

      // Find or provision employee
      const employee = await findOrCreateEmployeeForSheetRow(
        ctx.tenantId,
        emailRaw,
        nameRaw,
        deptRaw
      );

      const submittedAt = parseSheetTimestamp(timestampRaw) || now;
      const reviewedAt = parseSheetTimestamp(actionDateRaw);

      if (!existing) {
        // Create new record
        await prisma.studioLeaveRequest.create({
          data: {
            tenantId: ctx.tenantId,
            employeeId: employee.id,
            employeeNameRaw: nameRaw,
            employeeEmailRaw: emailRaw,
            startDate,
            endDate,
            startMinutes,
            endMinutes,
            totalMinutes,
            days,
            status: mappedStatus,
            leaveType,
            reason: reasonRaw || "Google Form submission",
            isHalfDay,
            isHourly,
            supportingFileId: medicalCertRaw || null,
            submittedAt,
            reviewedAt,
            reviewNotes: processedByRaw ? `Processed by ${processedByRaw}` : null,
            rejectionReason: isRejectedInSheet ? statusRaw : null,
            sourceSystem: "GOOGLE_SHEETS",
            sourceRecordId,
          },
        });
        importedCount++;
      } else {
        // Update if dates, status, or counts changed
        const shouldUpdate =
          existing.status !== mappedStatus ||
          existing.days.toNumber() !== days.toNumber() ||
          existing.startDate.toISOString().slice(0, 10) !== startDate.toISOString().slice(0, 10) ||
          existing.endDate.toISOString().slice(0, 10) !== endDate.toISOString().slice(0, 10) ||
          existing.submittedAt.toISOString().slice(0, 10) !== submittedAt.toISOString().slice(0, 10) ||
          existing.leaveType !== leaveType ||
          existing.reason !== (reasonRaw || existing.reason) ||
          (medicalCertRaw && existing.supportingFileId !== medicalCertRaw);

        if (shouldUpdate) {
          await prisma.studioLeaveRequest.update({
            where: { id: existing.id },
            data: {
              status: mappedStatus,
              startDate,
              endDate,
              startMinutes,
              endMinutes,
              totalMinutes,
              days,
              leaveType,
              reason: reasonRaw || existing.reason,
              supportingFileId: medicalCertRaw || existing.supportingFileId,
              submittedAt,
              reviewedAt: reviewedAt || existing.reviewedAt,
              reviewNotes: processedByRaw ? `Processed by ${processedByRaw}` : existing.reviewNotes,
              rejectionReason: isRejectedInSheet ? statusRaw : existing.rejectionReason,
            },
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }
  } catch (err: any) {
    failedCount++;
    errorMsg = err.message || "Failed to sync leave sheet";
  }

  // Record sync run metrics in database
  await prisma.studioSyncRun.create({
    data: {
      tenantId: ctx.tenantId,
      configId: config.id,
      syncType: "LEAVE_SHEET",
      importedCount,
      updatedCount,
      unchangedCount,
      failedCount,
      status: errorMsg ? "FAILED" : "SUCCESS",
      errorDetails: errorMsg,
      startedAt: now,
      completedAt: new Date(),
    },
  });

  await prisma.studioSyncConfig.update({
    where: { id: config.id },
    data: {
      lastAttemptAt: now,
      lastSuccessAt: errorMsg ? config.lastSuccessAt : now,
      lastStatus: errorMsg ? "FAILED" : "SUCCESS",
      lastError: errorMsg,
    },
  });

  return {
    syncType: "LEAVE_SHEET",
    success: !errorMsg,
    importedCount,
    updatedCount,
    unchangedCount,
    skippedTombstonesCount,
    preservedLocalDecisionsCount,
    failedCount,
    lastAttemptAt: now.toISOString(),
    error: errorMsg,
  };
}

/**
 * 2. LIVE SYNC FOR VENDORS & CRM SHEET
 */
export async function syncLiveVendorSheet(
  ctx: TenantContext,
  customSheetUrl?: string
): Promise<SyncResult> {
  const now = new Date();
  const url = customSheetUrl || DEFAULT_VENDOR_CSV_URL;

  let config = await prisma.studioSyncConfig.findUnique({
    where: { tenantId_syncType: { tenantId: ctx.tenantId, syncType: "VENDOR_SHEET" } },
  });

  if (!config) {
    config = await prisma.studioSyncConfig.create({
      data: {
        tenantId: ctx.tenantId,
        syncType: "VENDOR_SHEET",
        sheetId: DEFAULT_VENDOR_SHEET_ID,
        sheetTabName: "Form Responses 1",
        isEnabled: true,
      },
    });
  }

  let importedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedTombstonesCount = 0;
  let preservedLocalDecisionsCount = 0;
  let failedCount = 0;
  let errorMsg: string | null = null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch Vendor Sheet CSV: HTTP ${res.status} ${res.statusText}`);
    }

    const csvText = await res.text();
    const rows = parseCsvRows(csvText);

    if (rows.length < 2) {
      throw new Error("Vendor Sheet returned empty or invalid CSV content");
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const findCol = (kw: string) => headers.findIndex((h) => h.includes(kw));

    const colTimestamp = findCol("timestamp") >= 0 ? findCol("timestamp") : 0;
    const colEmail = findCol("email") >= 0 ? findCol("email") : 1;
    const colName = findCol("name") >= 0 ? findCol("name") : 2;
    const colCompany = findCol("company") >= 0 ? findCol("company") : 3;
    const colPurpose = findCol("purpose") >= 0 ? findCol("purpose") : 4;
    const colPhone = findCol("phone") >= 0 ? findCol("phone") : 5;
    const colDesignation = findCol("designation") >= 0 ? findCol("designation") : 6;
    const colIndustry = findCol("industry") >= 0 ? findCol("industry") : 7;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => !c.trim())) continue;

      const timestampRaw = row[colTimestamp] || "";
      const emailRaw = row[colEmail] || "";
      const nameRaw = (row[colName] || "").trim();
      const companyRaw = (row[colCompany] || "").trim();
      const purposeRaw = (row[colPurpose] || "").trim();
      const phoneRaw = (row[colPhone] || "").trim();
      const designationRaw = (row[colDesignation] || "").trim();
      const industryRaw = (row[colIndustry] || "").trim();

      if (!nameRaw && !companyRaw) continue;

      const sourceRecordId = `VENDOR_${cleanIdentifier(timestampRaw)}_${cleanIdentifier(emailRaw)}_${cleanIdentifier(nameRaw)}`;

      const existing = await prisma.studioVendor.findFirst({
        where: {
          tenantId: ctx.tenantId,
          sourceSystem: "GOOGLE_SHEETS",
          sourceRecordId,
        },
      });

      // 🛡️ TOMBSTONE SHIELD: If vendor was marked DELETED in app, NEVER resurrect!
      if (existing && existing.status === "DELETED") {
        skippedTombstonesCount++;
        continue;
      }

      if (!existing) {
        await prisma.studioVendor.create({
          data: {
            tenantId: ctx.tenantId,
            name: nameRaw || companyRaw,
            companyName: companyRaw || null,
            designation: designationRaw || "Representative",
            industryType: industryRaw || "Architecture & Supply",
            phoneNumber: phoneRaw || null,
            email: emailRaw || null,
            purposeOfVisit: purposeRaw || null,
            status: "ACTIVE",
            sourceSystem: "GOOGLE_SHEETS",
            sourceRecordId,
          },
        });
        importedCount++;
      } else {
        const hasChange =
          existing.name !== (nameRaw || companyRaw) ||
          existing.companyName !== (companyRaw || null) ||
          existing.phoneNumber !== (phoneRaw || null) ||
          existing.industryType !== (industryRaw || existing.industryType);

        if (hasChange) {
          await prisma.studioVendor.update({
            where: { id: existing.id },
            data: {
              name: nameRaw || companyRaw,
              companyName: companyRaw || null,
              designation: designationRaw || existing.designation,
              industryType: industryRaw || existing.industryType,
              phoneNumber: phoneRaw || existing.phoneNumber,
              email: emailRaw || existing.email,
              purposeOfVisit: purposeRaw || existing.purposeOfVisit,
            },
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }
  } catch (err: any) {
    failedCount++;
    errorMsg = err.message || "Failed to sync vendor sheet";
  }

  await prisma.studioSyncRun.create({
    data: {
      tenantId: ctx.tenantId,
      configId: config.id,
      syncType: "VENDOR_SHEET",
      importedCount,
      updatedCount,
      unchangedCount,
      failedCount,
      status: errorMsg ? "FAILED" : "SUCCESS",
      errorDetails: errorMsg,
      startedAt: now,
      completedAt: new Date(),
    },
  });

  await prisma.studioSyncConfig.update({
    where: { id: config.id },
    data: {
      lastAttemptAt: now,
      lastSuccessAt: errorMsg ? config.lastSuccessAt : now,
      lastStatus: errorMsg ? "FAILED" : "SUCCESS",
      lastError: errorMsg,
    },
  });

  return {
    syncType: "VENDOR_SHEET",
    success: !errorMsg,
    importedCount,
    updatedCount,
    unchangedCount,
    skippedTombstonesCount,
    preservedLocalDecisionsCount,
    failedCount,
    lastAttemptAt: now.toISOString(),
    error: errorMsg,
  };
}

/**
 * 3. OUTBOUND WRITE-BACK DISPATCHER (PUSH APP ACTIONS TO GOOGLE SHEET WEBHOOK)
 */
export async function pushLeaveActionToGoogleSheet(
  tenantId: string,
  payload: {
    action: "APPROVE" | "REJECT" | "DELETE" | "CANCEL";
    leaveId: string;
    sourceRecordId?: string | null;
    employeeEmail?: string | null;
    employeeName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status: string;
    processedBy: string;
    rejectionReason?: string;
  }
) {
  try {
    const config = await prisma.studioSyncConfig.findUnique({
      where: { tenantId_syncType: { tenantId, syncType: "LEAVE_SHEET" } },
    });

    let webhookUrl = (config as any)?.webhookUrl || process.env.GOOGLE_SHEETS_LEAVE_WEBHOOK_URL;

    // Fallback: Check tenant settings if not set in config or env
    if (!webhookUrl) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      const settings = (tenant?.settings as any) || {};
      webhookUrl = settings.googleSheetsLeaveWebhookUrl || settings.googleSheetsWebhookUrl;
    }

    if (!webhookUrl) {
      webhookUrl = DEFAULT_LEAVE_WEBHOOK_URL;
    }

    let startDateFormatted: string | undefined = undefined;
    if (payload.startDate) {
      const parts = payload.startDate.split("-");
      if (parts.length === 3) {
        startDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "LEAVE_APPLICATIONS",
        action: payload.action,
        leaveId: payload.leaveId,
        sourceRecordId: payload.sourceRecordId,
        employeeEmail: payload.employeeEmail,
        employeeName: payload.employeeName,
        startDate: payload.startDate,
        startDateFormatted,
        endDate: payload.endDate,
        status: payload.status,
        processedBy: payload.processedBy,
        rejectionReason: payload.rejectionReason,
        actionDate: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("Failed to dispatch leave update to Google Sheet webhook:", e);
  }
}

export async function pushVendorActionToGoogleSheet(
  tenantId: string,
  payload: {
    action: "CREATE" | "UPDATE" | "DELETE";
    vendorId: string;
    sourceRecordId?: string | null;
    email?: string | null;
    name: string;
    companyName?: string | null;
    phoneNumber?: string | null;
    industryType?: string | null;
  }
) {
  try {
    const config = await prisma.studioSyncConfig.findUnique({
      where: { tenantId_syncType: { tenantId, syncType: "VENDOR_SHEET" } },
    });

    const webhookUrl = (config as any)?.webhookUrl || process.env.GOOGLE_SHEETS_VENDOR_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "VENDOR_DIRECTORY",
        action: payload.action,
        sourceRecordId: payload.sourceRecordId,
        email: payload.email,
        name: payload.name,
        companyName: payload.companyName,
        phoneNumber: payload.phoneNumber,
        industryType: payload.industryType,
        actionDate: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("Failed to dispatch vendor update to Google Sheet webhook:", e);
  }
}
