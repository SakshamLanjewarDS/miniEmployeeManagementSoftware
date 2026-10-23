/**
 * Lightweight, pure TypeScript PDF Generator for HR Letterhead Documents
 * Emits standard PDF 1.4 documents with vector text, A4 layout (595.28 x 841.89 pt),
 * margins, multi-page text flow, header/footer, and draft watermark.
 */

export interface LetterPdfOptions {
  referenceNumber: string;
  title: string;
  dateStr: string;
  bodyText: string;
  companyName: string;
  companyAddress?: string;
  employeeName: string;
  employeeDesignation?: string;
  signatoryName: string;
  signatoryTitle: string;
  isDraft: boolean;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function generateLetterPdf(options: LetterPdfOptions): Buffer {
  const {
    referenceNumber,
    title,
    dateStr,
    bodyText,
    companyName,
    companyAddress,
    employeeName,
    employeeDesignation,
    signatoryName,
    signatoryTitle,
    isDraft,
  } = options;

  const topMargin = options.margins?.top ?? 72; // 1 inch = 72 pt
  const bottomMargin = options.margins?.bottom ?? 72;
  const leftMargin = options.margins?.left ?? 54;
  const rightMargin = options.margins?.right ?? 54;

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Split body text into lines with simple word wrapping
  const maxCharsPerLine = Math.floor(contentWidth / 6.2); // ~10pt font character width average
  const paragraphs = bodyText.split(/\r?\n/);
  const wrappedLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      wrappedLines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  }

  // Calculate lines per page
  const headerHeight = 120;
  const footerHeight = 110;
  const firstPageBodyHeight = pageHeight - topMargin - headerHeight - footerHeight - bottomMargin;
  const laterPageBodyHeight = pageHeight - topMargin - 40 - footerHeight - bottomMargin;
  const lineHeight = 15;

  const firstPageMaxLines = Math.floor(firstPageBodyHeight / lineHeight);
  const laterPageMaxLines = Math.floor(laterPageBodyHeight / lineHeight);

  const pages: string[][] = [];
  const remaining = [...wrappedLines];

  // Page 1
  pages.push(remaining.splice(0, Math.min(remaining.length, firstPageMaxLines)));

  // Subsequent pages
  while (remaining.length > 0) {
    pages.push(remaining.splice(0, Math.min(remaining.length, laterPageMaxLines)));
  }

  const totalPages = pages.length;

  function escapePdfText(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  const contentStreams: string[] = [];

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageNum = pIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const pageLines = pages[pIdx];

    let stream = "";

    // Draft Watermark
    if (isDraft) {
      stream += `q\n0.92 0.92 0.92 rg\n`;
      stream += `BT\n/F2 42 Tf\n`;
      stream += `1 0 0 1 120 450 Tm\n`;
      stream += `(OFFICIAL DRAFT - UNISSUED) Tj\n`;
      stream += `ET\nQ\n`;
    }

    // Letterhead Header (Top)
    if (isFirstPage) {
      // Company brand / header
      stream += `BT\n/F2 16 Tf\n`;
      stream += `0.1 0.1 0.15 rg\n`;
      stream += `${leftMargin} ${pageHeight - topMargin} Td\n`;
      stream += `(${escapePdfText(companyName.toUpperCase())}) Tj\nET\n`;

      if (companyAddress) {
        stream += `BT\n/F1 8 Tf\n`;
        stream += `0.4 0.4 0.45 rg\n`;
        stream += `${leftMargin} ${pageHeight - topMargin - 14} Td\n`;
        stream += `(${escapePdfText(companyAddress)}) Tj\nET\n`;
      }

      // Header horizontal rule
      stream += `0.8 0.8 0.85 RG\n0.75 w\n`;
      stream += `${leftMargin} ${pageHeight - topMargin - 22} m ${pageWidth - rightMargin} ${pageHeight - topMargin - 22} l S\n`;

      // Reference number and Date
      stream += `BT\n/F2 9 Tf\n0.2 0.2 0.25 rg\n`;
      stream += `${leftMargin} ${pageHeight - topMargin - 40} Td\n`;
      stream += `(Ref: ${escapePdfText(referenceNumber)}) Tj\nET\n`;

      stream += `BT\n/F1 9 Tf\n0.2 0.2 0.25 rg\n`;
      stream += `${pageWidth - rightMargin - 120} ${pageHeight - topMargin - 40} Td\n`;
      stream += `(Date: ${escapePdfText(dateStr)}) Tj\nET\n`;

      // Employee Address Block
      stream += `BT\n/F2 10 Tf\n0.15 0.15 0.2 rg\n`;
      stream += `${leftMargin} ${pageHeight - topMargin - 60} Td\n`;
      stream += `(To: ${escapePdfText(employeeName)}) Tj\nET\n`;

      if (employeeDesignation) {
        stream += `BT\n/F1 9 Tf\n0.35 0.35 0.4 rg\n`;
        stream += `${leftMargin} ${pageHeight - topMargin - 73} Td\n`;
        stream += `(${escapePdfText(employeeDesignation)}) Tj\nET\n`;
      }

      // Subject / Title
      stream += `BT\n/F2 12 Tf\n0.1 0.1 0.2 rg\n`;
      stream += `${leftMargin} ${pageHeight - topMargin - 95} Td\n`;
      stream += `(Subject: ${escapePdfText(title)}) Tj\nET\n`;
    } else {
      // Continuation Header
      stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n`;
      stream += `${leftMargin} ${pageHeight - topMargin + 10} Td\n`;
      stream += `(${escapePdfText(companyName)} | Ref: ${escapePdfText(referenceNumber)} | Page ${pageNum} of ${totalPages}) Tj\nET\n`;

      stream += `0.85 0.85 0.85 RG\n0.5 w\n`;
      stream += `${leftMargin} ${pageHeight - topMargin + 4} m ${pageWidth - rightMargin} ${pageHeight - topMargin + 4} l S\n`;
    }

    // Body Text Lines
    const currentY = isFirstPage
      ? pageHeight - topMargin - headerHeight
      : pageHeight - topMargin - 20;

    stream += `BT\n/F1 10 Tf\n15 TL\n0.15 0.15 0.15 rg\n`;
    stream += `${leftMargin} ${currentY} Td\n`;

    for (let i = 0; i < pageLines.length; i++) {
      const line = pageLines[i];
      if (i > 0) stream += `T*\n`;
      if (line) {
        stream += `(${escapePdfText(line)}) Tj\n`;
      }
    }
    stream += `ET\n`;

    // Signatory Block on Last Page
    if (isLastPage) {
      const sigY = bottomMargin + 65;
      stream += `BT\n/F1 9 Tf\n0.2 0.2 0.2 rg\n`;
      stream += `${leftMargin} ${sigY + 36} Td\n`;
      stream += `(Sincerely,) Tj\nET\n`;

      stream += `BT\n/F2 10 Tf\n0.1 0.1 0.1 rg\n`;
      stream += `${leftMargin} ${sigY + 14} Td\n`;
      stream += `(${escapePdfText(signatoryName)}) Tj\nET\n`;

      stream += `BT\n/F1 9 Tf\n0.3 0.3 0.3 rg\n`;
      stream += `${leftMargin} ${sigY} Td\n`;
      stream += `(${escapePdfText(signatoryTitle)}) Tj\n`;
      stream += `0 -12 Td\n(${escapePdfText(companyName)}) Tj\nET\n`;
    }

    // Footer & Page Numbering
    stream += `0.85 0.85 0.85 RG\n0.5 w\n`;
    stream += `${leftMargin} ${bottomMargin + 20} m ${pageWidth - rightMargin} ${bottomMargin + 20} l S\n`;

    stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n`;
    stream += `${leftMargin} ${bottomMargin + 8} Td\n`;
    stream += `(Confidential - Issued by ${escapePdfText(companyName)}) Tj\nET\n`;

    stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n`;
    stream += `${pageWidth - rightMargin - 60} ${bottomMargin + 8} Td\n`;
    stream += `(Page ${pageNum} of ${totalPages}) Tj\nET\n`;

    contentStreams.push(stream);
  }

  // Rebuild the whole PDF cleanly with accurate byte offsets
  const pdfParts: Buffer[] = [];
  let byteOffset = 0;

  function pushPart(str: string) {
    const buf = Buffer.from(str, "latin1");
    pdfParts.push(buf);
    byteOffset += buf.length;
  }

  const finalOffsets: number[] = [0];

  pushPart("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // obj 1 Catalog
  finalOffsets[1] = byteOffset;
  pushPart(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // obj 2 Pages (will refer to page objects 5, 7, 9...)
  const pageIds: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    pageIds.push(5 + i * 2 + 1); // 6, 8, 10...
  }
  const kidsStr = pageIds.map((id) => `${id} 0 R`).join(" ");

  finalOffsets[2] = byteOffset;
  pushPart(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj\n`);

  // obj 3 Font Regular
  finalOffsets[3] = byteOffset;
  pushPart(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // obj 4 Font Bold
  finalOffsets[4] = byteOffset;
  pushPart(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  let currentObjId = 5;
  for (let i = 0; i < totalPages; i++) {
    const streamContent = contentStreams[i];
    const streamBuffer = Buffer.from(streamContent, "utf-8");

    // Content Stream
    const cId = currentObjId++;
    finalOffsets[cId] = byteOffset;
    pushPart(`${cId} 0 obj\n<< /Length ${streamBuffer.length} >>\nstream\n`);
    pdfParts.push(streamBuffer);
    byteOffset += streamBuffer.length;
    pushPart(`\nendstream\nendobj\n`);

    // Page
    const pId = currentObjId++;
    finalOffsets[pId] = byteOffset;
    pushPart(`${pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cId} 0 R >>\nendobj\n`);
  }

  // Cross-reference table
  const startXref = byteOffset;
  pushPart(`xref\n0 ${currentObjId}\n0000000000 65535 f \n`);
  for (let i = 1; i < currentObjId; i++) {
    const offsetStr = String(finalOffsets[i]).padStart(10, "0");
    pushPart(`${offsetStr} 00000 n \n`);
  }

  // Trailer
  pushPart(`trailer\n<< /Size ${currentObjId} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  return Buffer.concat(pdfParts);
}
