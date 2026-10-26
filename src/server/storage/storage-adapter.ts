import fs from "fs";
import path from "path";
import crypto from "crypto";
import net from "net";
import { prisma } from "../db/prisma";
import { TenantContext, assertTenantAccess, ForbiddenException } from "../tenancy/context";

// shortcut: Local filesystem volume storage (ceiling: single-host disk capacity, not replicated across distributed serverless nodes), upgrade: replace with S3/GCS presigned URL adapter when moving to containerized multi-node orchestration
const BASE_STORAGE_DIR = path.join(process.cwd(), "storage", "uploads");

// Allowed MIME types and extensions for architectural deliverables
const ALLOWED_MIME_MAP: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/acad": [".dwg"],
  "image/vnd.dwg": [".dwg"],
  "application/x-dwg": [".dwg"],
  "application/dxf": [".dxf"],
  "image/vnd.dxf": [".dxf"],
  "application/x-dxf": [".dxf"],
  "application/octet-stream": [".dwg", ".dxf", ".pdf"],
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface SaveFileInput {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  isDocumentVault?: boolean;
  isTrustedInternal?: boolean;
}

/**
 * Validate content magic bytes to prevent MIME-type spoofing
 */
export function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (ext === ".pdf") {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  // JPEG: 0xFF, 0xD8, 0xFF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 0x89, 0x50, 0x4E, 0x47
  if (ext === ".png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  // WebP: RIFF....WEBP
  if (ext === ".webp") {
    return buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }
  // DWG: AC10
  if (ext === ".dwg") {
    return buffer.toString("ascii", 0, 4).startsWith("AC");
  }
  // DXF: plain ASCII or binary DXF
  if (ext === ".dxf") {
    const header = buffer.toString("ascii", 0, Math.min(buffer.length, 128));
    return header.includes("SECTION") || header.includes("AutoCAD") || header.includes("0\n");
  }
  return false;
}

export function validateFileMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const ext = ALLOWED_MIME_MAP[mimeType]?.[0] || ".pdf";
  return validateMagicBytes(buffer, ext);
}

/**
 * Detect encrypted / password-protected PDF files
 */
export function isEncryptedPdf(buffer: Buffer): boolean {
  const binaryString = buffer.toString("latin1");
  return binaryString.includes("/Encrypt");
}

/**
 * Real Antivirus Scanning Integration
 * Supports TCP ClamAV daemon (INSTREAM) and HTTP Antivirus microservice.
 * Missing, failed, or timed-out scans fail-closed into quarantine.
 */
export interface ScanResult {
  isClean: boolean;
  isInfected: boolean;
  scanStatus: "CLEAN" | "SCANNED_CLEAN" | "INFECTED" | "QUARANTINED";
  scannerDetails: string;
}

export async function scanBufferForMalware(buffer: Buffer): Promise<ScanResult> {
  const clamHost = process.env.CLAMAV_HOST;
  const clamPort = parseInt(process.env.CLAMAV_PORT || "3310", 10);
  const antivirusUrl = process.env.ANTIVIRUS_SERVICE_URL;

  // 1. HTTP Antivirus Service
  if (antivirusUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(antivirusUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(buffer),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        return {
          isClean: false,
          isInfected: false,
          scanStatus: "QUARANTINED",
          scannerDetails: `Antivirus HTTP service error (${res.status}): failing closed into quarantine`,
        };
      }
      const data = await res.json().catch(() => ({}));
      if (data.isInfected || data.infected) {
        return {
          isClean: false,
          isInfected: true,
          scanStatus: "INFECTED",
          scannerDetails: `Malware detected by HTTP antivirus service: ${data.virusName || "Infected"}`,
        };
      }
      return {
        isClean: true,
        isInfected: false,
        scanStatus: "SCANNED_CLEAN",
        scannerDetails: "Scanned clean by HTTP antivirus service",
      };
    } catch (err: any) {
      console.warn("[Antivirus] HTTP scanner error / timeout:", err?.message);
      return {
        isClean: false,
        isInfected: false,
        scanStatus: "QUARANTINED",
        scannerDetails: `Antivirus service unreachable (${err?.message || "timeout"}). Quarantined by default.`,
      };
    }
  }

  // 2. ClamAV TCP Daemon (INSTREAM protocol)
  if (clamHost) {
    return new Promise<ScanResult>((resolve) => {
      const client = new net.Socket();
      let response = "";
      let settled = false;

      const finish = (result: ScanResult) => {
        if (!settled) {
          settled = true;
          try { client.destroy(); } catch (_) {}
          resolve(result);
        }
      };

      client.setTimeout(5000, () => {
        finish({
          isClean: false,
          isInfected: false,
          scanStatus: "QUARANTINED",
          scannerDetails: "ClamAV socket timed out after 5000ms. Quarantined by default.",
        });
      });

      client.on("error", (err) => {
        console.warn("[Antivirus] ClamAV socket error:", err.message);
        finish({
          isClean: false,
          isInfected: false,
          scanStatus: "QUARANTINED",
          scannerDetails: `ClamAV daemon connection failed (${err.message}). Quarantined by default.`,
        });
      });

      client.connect(clamPort, clamHost, () => {
        client.write("zINSTREAM\0");
        const CHUNK_SIZE = 64 * 1024;
        let offset = 0;
        while (offset < buffer.length) {
          const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
          const lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32BE(chunk.length, 0);
          client.write(lenBuf);
          client.write(chunk);
          offset += chunk.length;
        }
        const zeroBuf = Buffer.alloc(4);
        zeroBuf.writeUInt32BE(0, 0);
        client.write(zeroBuf);
      });

      client.on("data", (data) => {
        response += data.toString("ascii");
      });

      client.on("end", () => {
        if (response.includes("OK")) {
          finish({
            isClean: true,
            isInfected: false,
            scanStatus: "SCANNED_CLEAN",
            scannerDetails: "Scanned clean by ClamAV daemon",
          });
        } else if (response.includes("FOUND")) {
          finish({
            isClean: false,
            isInfected: true,
            scanStatus: "INFECTED",
            scannerDetails: `ClamAV malware signature detected: ${response.trim()}`,
          });
        } else {
          finish({
            isClean: false,
            isInfected: false,
            scanStatus: "QUARANTINED",
            scannerDetails: `Unexpected ClamAV daemon response: ${response.trim()}`,
          });
        }
      });
    });
  }

  // 3. Fail-closed into quarantine if scanner unavailable
  return {
    isClean: false,
    isInfected: false,
    scanStatus: "QUARANTINED",
    scannerDetails: "No external malware scanner configured (CLAMAV_HOST or ANTIVIRUS_SERVICE_URL). Retaining fail-closed quarantine.",
  };
}

/**
 * Save an uploaded file into secure tenant-isolated storage
 */
export async function savePrivateFile(
  ctx: TenantContext,
  input: SaveFileInput
): Promise<{ id: string; fileName: string; byteSize: number; mimeType: string; isQuarantined: boolean; scanStatus: string }> {
  const { fileName, mimeType, buffer } = input;

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 25MB.`);
  }

  // Validate extension
  const ext = path.extname(fileName).toLowerCase();
  const validExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".dwg", ".dxf"];
  if (!validExtensions.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Permitted formats: PDF, DWG, DXF, JPG, PNG, and WebP.`
    );
  }

  // Validate real file content matches extension
  if (!validateMagicBytes(buffer, ext)) {
    throw new Error(
      `File content does not match the declared extension "${ext}". Potential file type spoofing detected.`
    );
  }

  // Handle password-protected PDFs
  if (ext === ".pdf" && isEncryptedPdf(buffer)) {
    throw new Error(
      "Password-protected PDF files cannot be automated for review or scanning. Please upload an unencrypted copy of your official document."
    );
  }

  // Calculate SHA-256 Checksum
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  // Real Antivirus Quarantine Pipeline:
  // Internal server-generated documents (e.g. issued HR letter PDFs) are clean by construction.
  // External uploads run through the real antivirus scanner and fail-closed into quarantine.
  let isQuarantined = true;
  let scanStatus = "QUARANTINED";

  if (input.isTrustedInternal) {
    isQuarantined = false;
    scanStatus = "CLEAN";
  } else {
    const scanResult = await scanBufferForMalware(buffer);
    isQuarantined = !scanResult.isClean;
    scanStatus = scanResult.scanStatus;
  }

  // Create tenant subdirectory
  const tenantDir = path.join(BASE_STORAGE_DIR, `tenant-${ctx.tenantId}`);
  await fs.promises.mkdir(tenantDir, { recursive: true });

  const fileId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedFileName = `${fileId}-${safeName}`;
  const absoluteStoragePath = path.join(tenantDir, storedFileName);

  // Write file to disk
  await fs.promises.writeFile(absoluteStoragePath, buffer);

  // Record in Database
  const privateFile = await prisma.privateFile.create({
    data: {
      id: fileId,
      tenantId: ctx.tenantId,
      fileName,
      storagePath: path.relative(process.cwd(), absoluteStoragePath),
      mimeType: mimeType || "application/octet-stream",
      byteSize: buffer.length,
      checksum,
      isQuarantined,
      scanStatus,
      uploaderId: ctx.membershipId,
    },
  });

  return {
    id: privateFile.id,
    fileName: privateFile.fileName,
    byteSize: privateFile.byteSize,
    mimeType: privateFile.mimeType,
    isQuarantined: privateFile.isQuarantined,
    scanStatus: privateFile.scanStatus,
  };
}

/**
 * Read private file safely for authorized streaming
 */
export async function readPrivateFile(
  ctx: TenantContext,
  fileId: string
): Promise<{
  fileName: string;
  mimeType: string;
  byteSize: number;
  buffer: Buffer;
}> {
  const fileRecord = await prisma.privateFile.findFirst({
    where: {
      id: fileId,
      tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
    },
  });

  if (!fileRecord) {
    throw new Error("File not found in this studio workspace.");
  }

  if (fileRecord.isQuarantined) {
    throw new ForbiddenException("This file is currently quarantined for security review.");
  }

  const absolutePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), fileRecord.storagePath);

  if (!fs.existsSync(/*turbopackIgnore: true*/ absolutePath)) {
    throw new Error("File content is missing from storage volume.");
  }

  const buffer = await fs.promises.readFile(/*turbopackIgnore: true*/ absolutePath);

  return {
    fileName: fileRecord.fileName,
    mimeType: fileRecord.mimeType,
    byteSize: fileRecord.byteSize,
    buffer,
  };
}
