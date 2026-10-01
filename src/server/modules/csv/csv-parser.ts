/**
 * RFC 4180 Compliant CSV Parser and Serializer
 * Includes OWASP Formula Injection Sanitization
 */

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const escaped = str.replace(/"/g, '""');
  // Neutralize formula injection triggers: =, +, -, @, tab, CR
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}

export function parseCsv(csvText: string): Record<string, string>[] {
  if (!csvText || typeof csvText !== "string") return [];

  // Strip UTF-8 BOM if present
  const text = csvText.replace(/^\uFEFF/, "");

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
          i++; // skip next quote
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
        if (nextChar === "\n") {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    return [];
  }

  // Detect if row 0 (or subsequent rows) is an Excel merged header/title banner (e.g. "Client details,,,,,,")
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rows.length - 1, 5); r++) {
    const nonEmpty = rows[r].filter((c) => c.trim().length > 0);
    const nextNonEmpty = rows[r + 1] ? rows[r + 1].filter((c) => c.trim().length > 0) : [];
    if (nonEmpty.length <= 1 && nextNonEmpty.length >= 2) {
      headerRowIndex = r + 1;
      continue;
    }
    if (nonEmpty.length >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const rawHeaders = rows[headerRowIndex].map((h) => h.trim());
  const data: Record<string, string>[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip completely empty rows
    if (row.length === 0 || row.every((c) => c === "")) continue;

    const record: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      if (rawHeaders[c].length > 0) {
        record[rawHeaders[c]] = row[c] !== undefined ? row[c] : "";
      }
    }
    data.push(record);
  }

  return data;
}

export function stringifyCsv<T extends Record<string, any>>(
  columns: { key: keyof T; header: string }[],
  data: T[]
): string {
  const headerRow = columns.map((c) => sanitizeCsvCell(c.header)).join(",");
  const dataRows = data.map((item) =>
    columns.map((c) => sanitizeCsvCell(item[c.key])).join(",")
  );
  return [headerRow, ...dataRows].join("\r\n");
}
