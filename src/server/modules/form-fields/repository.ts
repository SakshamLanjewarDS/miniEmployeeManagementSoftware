import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";

export interface FormFieldConfig {
  formId: string;
  fieldKey: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  isHidden?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

// In-memory cache for tenant form field settings
const formFieldConfigsCache = new Map<string, { configs: Record<string, Record<string, FormFieldConfig>>; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

async function getCachedConfigs(tenantId: string): Promise<Record<string, Record<string, FormFieldConfig>>> {
  const now = Date.now();
  const cached = formFieldConfigsCache.get(tenantId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.configs;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as any) || {};
  const configs = settings.formFieldConfigs || {};
  formFieldConfigsCache.set(tenantId, { configs, cachedAt: now });
  return configs;
}

function invalidateCache(tenantId: string) {
  formFieldConfigsCache.delete(tenantId);
}

/**
 * Retrieve all form field customizations for a tenant
 */
export async function getFormFieldConfigs(
  ctx: TenantContext,
  formId?: string
): Promise<Record<string, FormFieldConfig>> {
  const allConfigs = await getCachedConfigs(ctx.tenantId);
  if (formId) {
    return allConfigs[formId] || {};
  }
  // Flatten or return all
  const flattened: Record<string, FormFieldConfig> = {};
  for (const fId of Object.keys(allConfigs)) {
    const formFields = allConfigs[fId];
    for (const key of Object.keys(formFields)) {
      flattened[`${fId}:${key}`] = formFields[key];
    }
  }
  return flattened;
}

/**
 * Save / Update a form field customization (Admin/Owner only)
 */
export async function upsertFormFieldConfig(
  ctx: TenantContext,
  config: FormFieldConfig
): Promise<FormFieldConfig> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can customize form fields.");

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as any) || {};
  const formFieldConfigs = settings.formFieldConfigs || {};
  const formConfigs = formFieldConfigs[config.formId] || {};

  const updatedConfig: FormFieldConfig = {
    ...formConfigs[config.fieldKey],
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: ctx.userFullName || ctx.userId,
  };

  const updatedSettings = {
    ...settings,
    formFieldConfigs: {
      ...formFieldConfigs,
      [config.formId]: {
        ...formConfigs,
        [config.fieldKey]: updatedConfig,
      },
    },
  };

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { settings: updatedSettings },
  });

  invalidateCache(ctx.tenantId);
  return updatedConfig;
}

/**
 * Hide / Delete a form field from a form (Admin/Owner only)
 */
export async function hideFormFieldConfig(
  ctx: TenantContext,
  formId: string,
  fieldKey: string,
  label?: string
): Promise<FormFieldConfig> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can remove form fields.");

  return upsertFormFieldConfig(ctx, {
    formId,
    fieldKey,
    label,
    isHidden: true,
  });
}

/**
 * Restore a hidden form field (Admin/Owner only)
 */
export async function restoreFormFieldConfig(
  ctx: TenantContext,
  formId: string,
  fieldKey: string
): Promise<FormFieldConfig> {
  assertAdminOrOwner(ctx, "Only Studio Administrators or Owners can restore form fields.");

  return upsertFormFieldConfig(ctx, {
    formId,
    fieldKey,
    isHidden: false,
  });
}
