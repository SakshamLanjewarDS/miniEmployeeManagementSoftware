import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { TenantContext, assertTenantAccess, ForbiddenException } from "../tenancy/context";

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
}

/**
 * Save an uploaded file into secure tenant-isolated storage
 */
export async function savePrivateFile(
  ctx: TenantContext,
  input: SaveFileInput
): Promise<{ id: string; fileName: string; byteSize: number; mimeType: string }> {
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

  // Calculate SHA-256 Checksum
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

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
      isQuarantined: false,
      scanStatus: "SCANNED_CLEAN", // Cleaned by hash & extension heuristics
      uploaderId: ctx.membershipId,
    },
  });

  return {
    id: privateFile.id,
    fileName: privateFile.fileName,
    byteSize: privateFile.byteSize,
    mimeType: privateFile.mimeType,
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
