import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import {
  getFormFieldConfigs,
  upsertFormFieldConfig,
  hideFormFieldConfig,
  restoreFormFieldConfig,
} from "../src/server/modules/form-fields/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";

describe("Admin Form Field Controls Test Suite (Edit & Delete for Admins Only)", () => {
  let tenant: any;
  let adminCtx: TenantContext;
  let employeeCtx: TenantContext;

  before(async () => {
    tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(tenant, "Tenant 100percentdesign must exist");

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { user: true, employee: true },
    });

    const adminMember = members.find((m) => m.role === TenantRole.OWNER || m.role === TenantRole.ADMIN);
    assert.ok(adminMember, "Admin/Owner must exist");

    const employeeMember = members.find((m) => m.role === TenantRole.EMPLOYEE);
    assert.ok(employeeMember, "Employee must exist");

    adminCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: adminMember.userId,
      userEmail: adminMember.user.email,
      userFullName: adminMember.user.fullName,
      membershipId: adminMember.id,
      employeeId: adminMember.employee?.employeeId ?? null,
      role: adminMember.role,
      hasFinanceAccess: true,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };

    employeeCtx = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: employeeMember.userId,
      userEmail: employeeMember.user.email,
      userFullName: employeeMember.user.fullName,
      membershipId: employeeMember.id,
      employeeId: employeeMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };
  });

  // -------------------------------------------------------------------------
  // 1. Initial State
  // -------------------------------------------------------------------------
  test("1. Successfully retrieves form field configurations for tenant", async () => {
    const configs = await getFormFieldConfigs(adminCtx, "PROJECT");
    assert.ok(typeof configs === "object");
  });

  // -------------------------------------------------------------------------
  // 2. Admin can edit/customize a form field
  // -------------------------------------------------------------------------
  test("2. Admin can edit field settings (label, placeholder, helperText, required)", async () => {
    const saved = await upsertFormFieldConfig(adminCtx, {
      formId: "PROJECT",
      fieldKey: "siteAddress",
      label: "Architectural Site Coordinates & Plot Address",
      placeholder: "e.g. Sector 42, Golf Course Road, Gurugram",
      helperText: "Verify physical parcel boundaries with municipal sanction drawings",
      required: true,
      isHidden: false,
    });

    assert.equal(saved.formId, "PROJECT");
    assert.equal(saved.fieldKey, "siteAddress");
    assert.equal(saved.label, "Architectural Site Coordinates & Plot Address");
    assert.equal(saved.placeholder, "e.g. Sector 42, Golf Course Road, Gurugram");
    assert.equal(saved.helperText, "Verify physical parcel boundaries with municipal sanction drawings");
    assert.equal(saved.required, true);
    assert.equal(saved.isHidden, false);

    // Verify it persists and can be retrieved
    const configs = await getFormFieldConfigs(adminCtx, "PROJECT");
    assert.ok(configs.siteAddress);
    assert.equal(configs.siteAddress.label, "Architectural Site Coordinates & Plot Address");
  });

  // -------------------------------------------------------------------------
  // 3. Non-admin is rejected from editing form fields (Access Only for Admin)
  // -------------------------------------------------------------------------
  test("3. Access control: Non-admin employee is blocked from editing form fields", async () => {
    await assert.rejects(
      async () => {
        await upsertFormFieldConfig(employeeCtx, {
          formId: "PROJECT",
          fieldKey: "siteAddress",
          label: "Hacked Label",
        });
      },
      (err: any) => {
        assert.match(err.message, /Only Studio Administrators or Owners/);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 4. Admin can delete/hide a form field
  // -------------------------------------------------------------------------
  test("4. Admin can delete/hide a field from the form", async () => {
    const hidden = await hideFormFieldConfig(
      adminCtx,
      "TASK",
      "estimatedHours",
      "Estimated Deliverable Effort (Hours)"
    );

    assert.equal(hidden.formId, "TASK");
    assert.equal(hidden.fieldKey, "estimatedHours");
    assert.equal(hidden.isHidden, true);

    const configs = await getFormFieldConfigs(adminCtx, "TASK");
    assert.ok(configs.estimatedHours);
    assert.equal(configs.estimatedHours.isHidden, true);
  });

  // -------------------------------------------------------------------------
  // 5. Non-admin is rejected from deleting/hiding form fields
  // -------------------------------------------------------------------------
  test("5. Access control: Non-admin employee is blocked from deleting/hiding form fields", async () => {
    await assert.rejects(
      async () => {
        await hideFormFieldConfig(employeeCtx, "TASK", "estimatedHours");
      },
      (err: any) => {
        assert.match(err.message, /Only Studio Administrators or Owners/);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 6. Admin can restore a hidden form field
  // -------------------------------------------------------------------------
  test("6. Admin can restore a previously hidden field back to the form", async () => {
    const restored = await restoreFormFieldConfig(adminCtx, "TASK", "estimatedHours");

    assert.equal(restored.formId, "TASK");
    assert.equal(restored.fieldKey, "estimatedHours");
    assert.equal(restored.isHidden, false);

    const configs = await getFormFieldConfigs(adminCtx, "TASK");
    assert.equal(configs.estimatedHours.isHidden, false);
  });

  // -------------------------------------------------------------------------
  // 7. Non-admin is rejected from restoring form fields
  // -------------------------------------------------------------------------
  test("7. Access control: Non-admin employee is blocked from restoring form fields", async () => {
    await assert.rejects(
      async () => {
        await restoreFormFieldConfig(employeeCtx, "TASK", "estimatedHours");
      },
      (err: any) => {
        assert.match(err.message, /Only Studio Administrators or Owners/);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 8. Tenant isolation: Configurations are strictly scoped to the tenant
  // -------------------------------------------------------------------------
  test("8. Tenant isolation: Form field customizations do not leak across tenants", async () => {
    // Create or find dummy second tenant context
    const fakeOtherTenantCtx: TenantContext = {
      ...adminCtx,
      tenantId: "fake-tenant-id-isolated-test",
      tenantSlug: "fake-other-studio",
    };

    // Other tenant should not have 100percentdesign's custom field configs
    // Since fake tenant doesn't exist in DB, querying returns empty object safely
    const otherConfigs = await getFormFieldConfigs(fakeOtherTenantCtx, "PROJECT");
    assert.equal(otherConfigs.siteAddress, undefined, "Other tenant must not inherit tenant configs");
  });
});
