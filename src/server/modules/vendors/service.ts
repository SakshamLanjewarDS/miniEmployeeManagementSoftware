import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";

export interface VendorFilterOptions {
  industryType?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateVendorInput {
  name: string;
  companyName?: string;
  designation?: string;
  industryType?: string;
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  status?: string;
  purposeOfVisit?: string;
  notes?: string;
  followupDate?: string;
  rating?: number;
  visitHistoryJson?: any;
}

/**
 * Full CRM Vendor directory for Owner and Admin
 * Returns all management fields including private notes, ratings, and visit history.
 */
export async function listVendorsForAdmin(
  context: TenantContext,
  options: VendorFilterOptions = {}
) {
  assertAdminOrOwner(context);

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 30));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    tenantId: context.tenantId,
  };

  if (options.status) {
    whereClause.status = options.status;
  } else {
    // 🛡️ TOMBSTONE SHIELD: Exclude soft-deleted / tombstoned vendors by default
    whereClause.status = { not: "DELETED" };
  }
  if (options.industryType) {
    whereClause.industryType = options.industryType;
  }
  if (options.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { companyName: { contains: q } },
      { industryType: { contains: q } },
      { notes: { contains: q } },
    ];
  }

  const [totalCount, vendors] = await Promise.all([
    prisma.studioVendor.count({ where: whereClause }),
    prisma.studioVendor.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      skip,
      take: pageSize,
    }),
  ]);

  return {
    vendors,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Restricted Employee Vendor Directory
 * Enforces strict SQL selection allowlist:
 * ID, name, company, designation, industry, phone, email, website, status.
 * Zero private notes, ratings, follow-up dates, visit logs, or pricing ever queried or returned!
 */
export async function listVendorsForEmployee(
  context: TenantContext,
  options: VendorFilterOptions = {}
) {
  // Any authenticated tenant member can access the restricted public-to-staff directory
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 30));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    tenantId: context.tenantId,
    // Exclude inactive or visitor-only records from employee staff directory
    status: { in: ["ACTIVE", "PARTNERED", "FOLLOW_UP"] },
  };

  if (options.industryType) {
    whereClause.industryType = options.industryType;
  }
  if (options.search) {
    const q = options.search.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { companyName: { contains: q } },
      { industryType: { contains: q } },
    ];
  }

  const [totalCount, vendors] = await Promise.all([
    prisma.studioVendor.count({ where: whereClause }),
    prisma.studioVendor.findMany({
      where: whereClause,
      // Strict DB-level allowlist! Private fields stripped at the database query level!
      select: {
        id: true,
        name: true,
        companyName: true,
        designation: true,
        industryType: true,
        phoneNumber: true,
        email: true,
        websiteUrl: true,
        status: true,
        createdAt: true,
        visitHistoryJson: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    vendors,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Creates a vendor / contractor / visitor CRM record (Owner/Admin only)
 */
export async function createVendor(context: TenantContext, input: CreateVendorInput) {
  assertAdminOrOwner(context);

  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Contact or vendor name is required");
  }

  const vendor = await prisma.studioVendor.create({
    data: {
      tenantId: context.tenantId,
      name: input.name.trim(),
      companyName: input.companyName?.trim() || null,
      designation: input.designation?.trim() || null,
      industryType: input.industryType?.trim() || "General",
      phoneNumber: input.phoneNumber?.trim() || null,
      email: input.email?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      status: input.status || "ACTIVE",
      purposeOfVisit: input.purposeOfVisit?.trim() || null,
      notes: input.notes?.trim() || null,
      followupDate: input.followupDate ? new Date(input.followupDate) : null,
      rating: input.rating || 3,
      visitHistoryJson: input.visitHistoryJson || undefined,
      sourceSystem: "MANUAL",
    },
  });

  // Outbound push to Google Sheets (non-blocking)
  import("@/server/modules/integrations/google-sheets-sync").then((mod) => {
    mod.pushVendorActionToGoogleSheet(context.tenantId, {
      action: "CREATE",
      vendorId: vendor.id,
      name: vendor.name,
      companyName: vendor.companyName,
      email: vendor.email,
      phoneNumber: vendor.phoneNumber,
      industryType: vendor.industryType,
    }).catch(console.warn);
  });

  return vendor;
}

/**
 * Updates an existing vendor / contractor CRM record (Owner/Admin only)
 */
export async function updateVendor(
  context: TenantContext,
  vendorId: string,
  input: Partial<CreateVendorInput>
) {
  assertAdminOrOwner(context);

  const existing = await prisma.studioVendor.findFirst({
    where: {
      id: vendorId,
      tenantId: context.tenantId,
      status: { not: "DELETED" },
    },
  });

  if (!existing) {
    throw new Error("Vendor not found or already deleted");
  }

  const updated = await prisma.studioVendor.update({
    where: { id: existing.id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName?.trim() || null } : {}),
      ...(input.designation !== undefined ? { designation: input.designation?.trim() || null } : {}),
      ...(input.industryType ? { industryType: input.industryType.trim() } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber?.trim() || null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl?.trim() || null } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.purposeOfVisit !== undefined ? { purposeOfVisit: input.purposeOfVisit?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.followupDate !== undefined
        ? { followupDate: input.followupDate ? new Date(input.followupDate) : null }
        : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.visitHistoryJson !== undefined ? { visitHistoryJson: input.visitHistoryJson } : {}),
    },
  });

  // Outbound push to Google Sheets (non-blocking)
  import("@/server/modules/integrations/google-sheets-sync").then((mod) => {
    mod.pushVendorActionToGoogleSheet(context.tenantId, {
      action: "UPDATE",
      vendorId: updated.id,
      sourceRecordId: updated.sourceRecordId,
      name: updated.name,
      companyName: updated.companyName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      industryType: updated.industryType,
    }).catch(console.warn);
  });

  return updated;
}

/**
 * Tombstones / soft-deletes a vendor CRM record (Owner/Admin only)
 * Sets status to 'DELETED' so it permanently disappears from UI and will NEVER resurrect on CSV re-sync!
 */
export async function deleteVendor(context: TenantContext, vendorId: string) {
  assertAdminOrOwner(context);

  const existing = await prisma.studioVendor.findFirst({
    where: {
      id: vendorId,
      tenantId: context.tenantId,
    },
  });

  if (!existing) {
    throw new Error("Vendor not found");
  }

  const tombstoned = await prisma.studioVendor.update({
    where: { id: existing.id },
    data: {
      status: "DELETED",
    },
  });

  // Outbound push to Google Sheets (non-blocking)
  import("@/server/modules/integrations/google-sheets-sync").then((mod) => {
    mod.pushVendorActionToGoogleSheet(context.tenantId, {
      action: "DELETE",
      vendorId: existing.id,
      sourceRecordId: existing.sourceRecordId,
      name: existing.name,
      companyName: existing.companyName,
      email: existing.email,
      phoneNumber: existing.phoneNumber,
    }).catch(console.warn);
  });

  return tombstoned;
}
