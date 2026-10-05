import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "textarea"
  | "url";

export interface CustomFieldDefinition {
  id: string;
  entity: string; // "PROJECT" | "TASK" | "CONTRACTOR" | "CONSULTANT"
  key: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  options?: string[]; // For dropdown select
  required: boolean;
  showOnCard: boolean;
  showInFilters: boolean;
  category?: string;
  sortOrder: number;
  createdAt: string;
}

// Default initial architectural fields for projects if none configured yet
export const DEFAULT_PROJECT_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: "cf_plot_area",
    entity: "PROJECT",
    key: "plotAreaSqft",
    label: "Plot Area (sq.ft)",
    type: "number",
    placeholder: "e.g. 2400",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Site & Zoning",
    sortOrder: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_rera_no",
    entity: "PROJECT",
    key: "reraNumber",
    label: "RERA Registration No.",
    type: "text",
    placeholder: "e.g. P50500001234",
    required: false,
    showOnCard: false,
    showInFilters: true,
    category: "Approvals & Legal",
    sortOrder: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_sanction_auth",
    entity: "PROJECT",
    key: "sanctionAuthority",
    label: "Sanction Authority",
    type: "select",
    options: ["NMC", "NIT", "MMRDA", "Town Planning", "PMRDA", "Gram Panchayat"],
    placeholder: "Select municipal authority",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Approvals & Legal",
    sortOrder: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_soil_test",
    entity: "PROJECT",
    key: "soilTestDone",
    label: "Soil Test Verified",
    type: "boolean",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Site & Zoning",
    sortOrder: 4,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_TASK_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: "cf_task_milestone",
    entity: "TASK",
    key: "milestonePhase",
    label: "Milestone Stage",
    type: "select",
    options: ["Concept & Feasibility", "Schematic Design", "Design Development", "Good for Construction (GFC)", "Client Handover"],
    placeholder: "Select project milestone",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Workflow",
    sortOrder: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_task_client_signoff",
    entity: "TASK",
    key: "clientSignoffRequired",
    label: "Client Sign-off Required",
    type: "boolean",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Approvals",
    sortOrder: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_task_deliverable_format",
    entity: "TASK",
    key: "deliverableFormat",
    label: "Deliverable Format",
    type: "select",
    options: ["Architectural PDF", "AutoCAD DWG", "Revit BIM Model", "Physical A1 Print", "3D Renderings Pack"],
    placeholder: "Select deliverable format",
    required: false,
    showOnCard: false,
    showInFilters: true,
    category: "Deliverables",
    sortOrder: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_TEAM_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: "cf_team_coa",
    entity: "TEAM",
    key: "coaRegistrationNo",
    label: "CoA Registration No.",
    type: "text",
    placeholder: "e.g. CA/2021/12345",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Professional Credentials",
    sortOrder: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_team_blood_group",
    entity: "TEAM",
    key: "bloodGroup",
    label: "Blood Group",
    type: "select",
    options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
    placeholder: "Select blood group",
    required: false,
    showOnCard: false,
    showInFilters: false,
    category: "Medical & Safety",
    sortOrder: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_team_emergency_contact",
    entity: "TEAM",
    key: "emergencyContact",
    label: "Emergency Contact Phone",
    type: "text",
    placeholder: "+91 98765 43210 (Kin)",
    required: false,
    showOnCard: false,
    showInFilters: false,
    category: "Medical & Safety",
    sortOrder: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_CONTRACTOR_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: "cf_contractor_gstin",
    entity: "CONTRACTOR",
    key: "gstinNumber",
    label: "GSTIN / Tax ID",
    type: "text",
    placeholder: "e.g. 27ABCDE1234F1Z5",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Commercial & Compliance",
    sortOrder: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_contractor_safety",
    entity: "CONTRACTOR",
    key: "safetyCertified",
    label: "Safety Compliance Certified",
    type: "boolean",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Site Standards",
    sortOrder: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_contractor_labor",
    entity: "CONTRACTOR",
    key: "laborStrength",
    label: "Labor Force Capacity",
    type: "number",
    placeholder: "e.g. 45 workers",
    required: false,
    showOnCard: false,
    showInFilters: false,
    category: "Operations",
    sortOrder: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_CONSULTANT_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: "cf_consultant_license",
    entity: "CONSULTANT",
    key: "licenseNumber",
    label: "Chartered License / Registration",
    type: "text",
    placeholder: "e.g. STR-MH-2023-882",
    required: false,
    showOnCard: true,
    showInFilters: true,
    category: "Credentials",
    sortOrder: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_consultant_fee_basis",
    entity: "CONSULTANT",
    key: "feeBasis",
    label: "Fee Basis",
    type: "select",
    options: ["Per Sq.Ft Built-Up", "Lumpsum Milestone", "% of Project Cost", "Hourly Retainer"],
    placeholder: "Select fee basis",
    required: false,
    showOnCard: false,
    showInFilters: true,
    category: "Commercial",
    sortOrder: 2,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "cf_consultant_undertaking",
    entity: "CONSULTANT",
    key: "undertakingSubmitted",
    label: "Safety Undertaking Submitted",
    type: "boolean",
    required: false,
    showOnCard: true,
    showInFilters: false,
    category: "Compliance",
    sortOrder: 3,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const DEFAULT_DEFINITIONS_BY_ENTITY: Record<string, CustomFieldDefinition[]> = {
  PROJECT: DEFAULT_PROJECT_CUSTOM_FIELDS,
  TASK: DEFAULT_TASK_CUSTOM_FIELDS,
  TEAM: DEFAULT_TEAM_CUSTOM_FIELDS,
  CONTRACTOR: DEFAULT_CONTRACTOR_CUSTOM_FIELDS,
  CONSULTANT: DEFAULT_CONSULTANT_CUSTOM_FIELDS,
};

// In-memory cache for tenant settings (avoids multiple remote DB queries on every page load)
const tenantSettingsCache = new Map<string, { settings: any; cachedAt: number }>();
const SETTINGS_CACHE_TTL_MS = 60 * 1000;

async function getCachedTenantSettings(tenantId: string) {
  const now = Date.now();
  const cached = tenantSettingsCache.get(tenantId);
  if (cached && now - cached.cachedAt < SETTINGS_CACHE_TTL_MS) {
    return cached.settings;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as any) || {};
  tenantSettingsCache.set(tenantId, { settings, cachedAt: now });
  return settings;
}

function invalidateTenantSettingsCache(tenantId: string) {
  tenantSettingsCache.delete(tenantId);
}

/**
 * Retrieve custom field definitions for a tenant and specific entity
 */
export async function getCustomFieldDefinitions(
  ctx: TenantContext,
  entity: string = "PROJECT"
): Promise<CustomFieldDefinition[]> {
  const settings = await getCachedTenantSettings(ctx.tenantId);
  const definitions = settings.customFieldDefinitions?.[entity];

  if (!definitions || !Array.isArray(definitions) || definitions.length === 0) {
    const defaults = DEFAULT_DEFINITIONS_BY_ENTITY[entity];
    if (defaults && defaults.length > 0) {
      // Seed default entity fields in background
      await saveCustomFieldDefinitions(ctx, entity, defaults);
      return defaults;
    }
    return [];
  }

  return definitions.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Save custom field definitions for a tenant and entity
 */
export async function saveCustomFieldDefinitions(
  ctx: TenantContext,
  entity: string,
  definitions: CustomFieldDefinition[]
): Promise<CustomFieldDefinition[]> {
  invalidateTenantSettingsCache(ctx.tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as any) || {};
  const existingDefs = settings.customFieldDefinitions || {};

  const updatedSettings = {
    ...settings,
    customFieldDefinitions: {
      ...existingDefs,
      [entity]: definitions,
    },
  };

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { settings: updatedSettings },
  });
  invalidateTenantSettingsCache(ctx.tenantId);

  return definitions;
}

/**
 * Add or update a single custom field definition
 */
export async function upsertCustomFieldDefinition(
  ctx: TenantContext,
  entity: string,
  field: Omit<CustomFieldDefinition, "id" | "createdAt" | "sortOrder"> & {
    id?: string;
    sortOrder?: number;
  }
): Promise<CustomFieldDefinition> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can configure form fields.");

  const currentDefinitions = await getCustomFieldDefinitions(ctx, entity);
  const now = new Date().toISOString();

  let targetId = field.id;
  let updatedDefinitions: CustomFieldDefinition[];

  if (targetId) {
    // Update existing definition
    updatedDefinitions = currentDefinitions.map((d) => {
      if (d.id === targetId) {
        return {
          ...d,
          ...field,
          id: targetId!,
          entity,
          sortOrder: field.sortOrder ?? d.sortOrder,
        };
      }
      return d;
    });
  } else {
    // Add new definition
    targetId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDef: CustomFieldDefinition = {
      ...field,
      id: targetId,
      entity,
      sortOrder: field.sortOrder ?? currentDefinitions.length + 1,
      createdAt: now,
    };
    updatedDefinitions = [...currentDefinitions, newDef];
  }

  await saveCustomFieldDefinitions(ctx, entity, updatedDefinitions);
  return updatedDefinitions.find((d) => d.id === targetId)!;
}

/**
 * Delete a custom field definition
 */
export async function deleteCustomFieldDefinition(
  ctx: TenantContext,
  entity: string,
  fieldId: string
): Promise<boolean> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can delete form fields.");

  const currentDefinitions = await getCustomFieldDefinitions(ctx, entity);
  const filtered = currentDefinitions.filter((d) => d.id !== fieldId);

  await saveCustomFieldDefinitions(ctx, entity, filtered);
  return true;
}

/**
 * Retrieve all custom field values for an entity (e.g. all projects in tenant)
 */
export async function getCustomFieldValues(
  ctx: TenantContext,
  entity: string = "PROJECT",
  recordId?: string
): Promise<Record<string, any>> {
  const settings = await getCachedTenantSettings(ctx.tenantId);
  const allValues = settings.customFieldValues?.[entity] || {};

  if (recordId) {
    return allValues[recordId] || {};
  }

  return allValues;
}

/**
 * Save custom field values for a specific record (e.g. project ID)
 */
export async function saveCustomFieldValues(
  ctx: TenantContext,
  entity: string,
  recordId: string,
  values: Record<string, any>
): Promise<Record<string, any>> {
  invalidateTenantSettingsCache(ctx.tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as any) || {};
  const entityValues = settings.customFieldValues?.[entity] || {};
  const currentRecordValues = entityValues[recordId] || {};

  const updatedRecordValues = {
    ...currentRecordValues,
    ...values,
  };

  const updatedSettings = {
    ...settings,
    customFieldValues: {
      ...settings.customFieldValues,
      [entity]: {
        ...entityValues,
        [recordId]: updatedRecordValues,
      },
    },
  };

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { settings: updatedSettings },
  });
  invalidateTenantSettingsCache(ctx.tenantId);

  return updatedRecordValues;
}
