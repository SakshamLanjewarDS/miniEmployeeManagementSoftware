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

/**
 * Retrieve custom field definitions for a tenant and specific entity
 */
export async function getCustomFieldDefinitions(
  ctx: TenantContext,
  entity: string = "PROJECT"
): Promise<CustomFieldDefinition[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as any) || {};
  const definitions = settings.customFieldDefinitions?.[entity];

  if (!definitions || !Array.isArray(definitions) || definitions.length === 0) {
    if (entity === "PROJECT") {
      // Seed default project fields in background
      await saveCustomFieldDefinitions(ctx, "PROJECT", DEFAULT_PROJECT_CUSTOM_FIELDS);
      return DEFAULT_PROJECT_CUSTOM_FIELDS;
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
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as any) || {};
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

  return updatedRecordValues;
}
