import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { parseDateOnly, minutesToDays, Decimal } from "../leave/policy";

export interface StagedLeaveRow {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: {
    employeeIdCandidate?: string;
    employeeNameCandidate?: string;
    matchedEmployeeId?: string;
    matchedEmployeeName?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    leaveType?: string;
    reason?: string;
    sourceRecordId?: string;
    submittedAt?: string;
  };
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface CSVParseOptions {
  dateFormat?: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
  batchType: "LEAVE" | "ATTENDANCE" | "BANK_DETAILS";
}

// shortcut: Synchronous regex formula escaping (ceiling: uploads up to 25MB / 10,000 rows in memory), upgrade: move CSV parser into streaming worker queue (e.g. BullMQ / Node streams) if single upload exceeds 50,000 rows
/**
 * Strips potential CSV spreadsheet formula injection characters (=, +, -, @, \t, \r, \n, |, %)
 */
export function sanitizeSpreadsheetFormula(val: string): string {
  if (!val) return "";
  if (/^[=+\-@\t\r\n|%]/.test(val)) {
    return `'${val}`;
  }
  const trimmed = val.trim();
  if (/^[=+\-@\t\r\n|%]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return val;
}

/**
 * Robust RFC 4180 compliant CSV parser
 */
export function parseCSVText(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // Carriage return: check if followed by newline
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) lines.push(currentRow);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rows = lines.slice(1);

  return { headers: lines[0], rows };
}

/**
 * Auto-maps CSV header aliases to standard canonical field keys
 */
export function mapHeaderAliases(headers: string[]): Record<string, number> {
  const aliasMap: Record<string, string[]> = {
    employeeId: ["employeeid", "empid", "id", "staffid", "code"],
    employeeName: ["employeename", "name", "staffname", "applicant", "fullname"],
    startDate: ["startdate", "fromdate", "from", "start"],
    endDate: ["enddate", "todate", "to", "end"],
    days: ["days", "totaldays", "duration", "dayscount", "noofdays"],
    leaveType: ["leavetype", "type", "category"],
    reason: ["reason", "purpose", "justification", "remarks", "notes"],
    submittedAt: ["submittedat", "timestamp", "appliedat", "dateapplied"],
    sourceRecordId: ["sourcerecordid", "sheetrowid", "recordid", "rowid"],
    // Bank details
    bankName: ["bankname", "bank"],
    accountHolderName: ["accountholdername", "accountholder", "holdername", "nameasperbank"],
    accountNumber: ["accountnumber", "acno", "accountno", "bankaccount", "bankaccountnumber"],
    ifscCode: ["ifsccode", "ifsc"],
    upiId: ["upiid", "upi", "vpa"],
    panNumber: ["pannumber", "pan", "panno"],
  };

  const mapping: Record<string, number> = {};

  headers.forEach((h, colIndex) => {
    const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
      if (aliases.includes(cleanHeader) && mapping[canonicalKey] === undefined) {
        mapping[canonicalKey] = colIndex;
      }
    }
  });

  return mapping;
}

/**
 * Parses ambiguous dates based on explicit format specification
 */
export function parseDateWithFormat(
  dateStr: string,
  format: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY" = "YYYY-MM-DD"
): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // If already ISO YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(clean)) {
    const parts = clean.split("T")[0].split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  // Handle slash or dash delimited date
  const parts = clean.split(/[/\-.]/);
  if (parts.length >= 3) {
    let y = 0;
    let m = 0;
    let d = 0;

    if (format === "DD/MM/YYYY") {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    } else if (format === "MM/DD/YYYY") {
      m = parseInt(parts[0], 10);
      d = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    } else {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    }

    if (y < 100) y += 2000;

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return new Date(y, m - 1, d);
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Previews and stages a CSV upload batch for non-destructive review
 */
export async function stageCSVImport(
  context: TenantContext,
  csvText: string,
  fileName: string,
  options: CSVParseOptions
) {
  assertAdminOrOwner(context);

  const { headers, rows } = parseCSVText(csvText);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error("Uploaded CSV file is empty or contains no data rows");
  }

  const mapping = mapHeaderAliases(headers);

  // Fetch all active employees in current tenant to match candidates
  const tenantEmployees = await prisma.employee.findMany({
    where: { tenantId: context.tenantId },
    include: {
      membership: {
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });

  // Fetch existing leave sourceRecordIds to detect duplicates
  const existingSourceIds = new Set(
    (
      await prisma.studioLeaveRequest.findMany({
        where: { tenantId: context.tenantId },
        select: { sourceRecordId: true },
      })
    )
      .map((r) => r.sourceRecordId)
      .filter(Boolean)
  );

  const stagedRows: StagedLeaveRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rawObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rawObj[h] = row[colIdx] || "";
    });

    const errors: string[] = [];
    const empIdVal = mapping.employeeId !== undefined ? row[mapping.employeeId]?.trim() : "";
    const empNameVal = mapping.employeeName !== undefined ? row[mapping.employeeName]?.trim() : "";
    const startVal = mapping.startDate !== undefined ? row[mapping.startDate]?.trim() : "";
    const endVal = mapping.endDate !== undefined ? row[mapping.endDate]?.trim() : startVal;
    const daysVal = mapping.days !== undefined ? parseFloat(row[mapping.days]?.trim() || "0") : 1.0;
    const typeVal = mapping.leaveType !== undefined ? row[mapping.leaveType]?.trim() : "CASUAL";
    const reasonVal = mapping.reason !== undefined ? row[mapping.reason]?.trim() : "";
    const sourceIdVal = mapping.sourceRecordId !== undefined ? row[mapping.sourceRecordId]?.trim() : `row_${idx + 1}`;

    // 1. Employee Matching
    let matchedEmp = tenantEmployees.find(
      (e) => e.employeeId.toLowerCase() === empIdVal.toLowerCase()
    );

    if (!matchedEmp && empNameVal) {
      // Fuzzy name matching candidate
      matchedEmp = tenantEmployees.find((e) =>
        e.membership.user.fullName.toLowerCase().includes(empNameVal.toLowerCase())
      );
    }

    if (!matchedEmp) {
      errors.push(`Unmatched staff identity: '${empIdVal || empNameVal}' not found in studio roster`);
    }

    // 2. Date parsing
    const parsedStart = parseDateWithFormat(startVal, options.dateFormat);
    const parsedEnd = parseDateWithFormat(endVal, options.dateFormat);

    if (!parsedStart) {
      errors.push(`Invalid start date format: '${startVal}'`);
    }
    if (!parsedEnd) {
      errors.push(`Invalid end date format: '${endVal}'`);
    }
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
      errors.push("End date cannot precede start date");
    }

    // 3. Duplicate check
    const isDuplicate = existingSourceIds.has(sourceIdVal);
    if (isDuplicate) {
      duplicateCount += 1;
    }

    const isValid = errors.length === 0 && !isDuplicate;
    if (isValid) {
      validCount += 1;
    } else if (errors.length > 0) {
      invalidCount += 1;
    }

    stagedRows.push({
      rowNumber: idx + 2, // 1-indexed accounting for header row
      raw: rawObj,
      mapped: {
        employeeIdCandidate: empIdVal,
        employeeNameCandidate: empNameVal,
        matchedEmployeeId: matchedEmp?.id,
        matchedEmployeeName: matchedEmp?.membership.user.fullName,
        startDate: parsedStart ? parsedStart.toISOString().split("T")[0] : undefined,
        endDate: parsedEnd ? parsedEnd.toISOString().split("T")[0] : undefined,
        days: isNaN(daysVal) || daysVal <= 0 ? 1.0 : daysVal,
        leaveType: typeVal || "CASUAL",
        reason: sanitizeSpreadsheetFormula(reasonVal),
        sourceRecordId: sourceIdVal,
      },
      isValid,
      isDuplicate,
      errors,
    });
  });

  // Create persistent staged batch in database
  const batch = await prisma.studioImportBatch.create({
    data: {
      tenantId: context.tenantId,
      batchType: options.batchType,
      sourceFileName: fileName,
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      status: "STAGED",
      columnMapping: mapping as any,
      stagedRowsJson: stagedRows as any,
      uploaderId: context.membershipId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
    },
  });

  return {
    batchId: batch.id,
    fileName,
    totalRows: rows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    duplicateRows: duplicateCount,
    columnMapping: mapping,
    previewRows: stagedRows.slice(0, 50), // First 50 rows for preview
  };
}

/**
 * Atomically commits a confirmed staged import batch into production records
 */
export async function commitStagedLeaveImport(context: TenantContext, batchId: string) {
  assertAdminOrOwner(context);

  return await prisma.$transaction(async (tx) => {
    const batch = await tx.studioImportBatch.findFirst({
      where: {
        id: batchId,
        tenantId: context.tenantId,
        status: "STAGED",
      },
    });

    if (!batch) {
      throw new Error("Staged import batch not found or already committed");
    }

    if (new Date() > batch.expiresAt) {
      await tx.studioImportBatch.update({
        where: { id: batch.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Staged batch has expired. Please re-upload CSV.");
    }

    const stagedRows = (batch.stagedRowsJson as unknown as StagedLeaveRow[]) || [];
    const validRowsToCommit = stagedRows.filter((r) => r.isValid && !r.isDuplicate);

    if (validRowsToCommit.length === 0) {
      throw new Error("No valid, non-duplicate rows available to commit");
    }

    let insertedCount = 0;

    for (const r of validRowsToCommit) {
      const m = r.mapped;
      if (!m.matchedEmployeeId || !m.startDate || !m.endDate) continue;

      const startDate = parseDateOnly(m.startDate);
      const endDate = parseDateOnly(m.endDate);
      const days = m.days || 1.0;
      const isHalfDay = days === 0.5;
      const isHourly = days < 0.5;

      await tx.studioLeaveRequest.upsert({
        where: {
          tenantId_sourceSystem_sourceRecordId: {
            tenantId: context.tenantId,
            sourceSystem: "CSV_IMPORT",
            sourceRecordId: m.sourceRecordId || `batch_${batch.id}_row_${r.rowNumber}`,
          },
        },
        create: {
          tenantId: context.tenantId,
          employeeId: m.matchedEmployeeId,
          employeeNameRaw: m.employeeNameCandidate || m.matchedEmployeeName,
          startDate,
          endDate,
          days: new Decimal(days),
          status: "APPROVED", // Imported historical leaves default to Approved unless flagged
          leaveType: m.leaveType || "CASUAL",
          reason: m.reason,
          isPaidEligible: m.leaveType !== "LOSS_OF_PAY",
          isHalfDay,
          isHourly,
          sourceSystem: "CSV_IMPORT",
          sourceRecordId: m.sourceRecordId || `batch_${batch.id}_row_${r.rowNumber}`,
          submittedAt: new Date(),
          reviewedById: context.membershipId,
          reviewedAt: new Date(),
        },
        update: {
          startDate,
          endDate,
          days: new Decimal(days),
          leaveType: m.leaveType || "CASUAL",
          reason: m.reason,
        },
      });

      insertedCount += 1;
    }

    // Update batch status to COMMITTED
    await tx.studioImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMMITTED",
        committedAt: new Date(),
      },
    });

    return {
      success: true,
      committedCount: insertedCount,
      skippedCount: stagedRows.length - insertedCount,
    };
  });
}
