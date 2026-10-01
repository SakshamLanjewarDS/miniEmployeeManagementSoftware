import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import { loginWithWorkspace } from "../src/server/auth/service";
import { createEmployeeService, resetPasswordService } from "../src/server/modules/employees/service";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";

describe("Employee Password Manipulation & Credential Dispatch Tests", () => {
  let tenant: { id: string; slug: string; name: string };
  let adminContext: TenantContext;
  let adminUser: any;
  let adminMembership: any;

  before(async () => {
    const t = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    assert.ok(t, "Tenant 100percentdesign must exist");
    tenant = t;

    adminUser = await prisma.user.findFirst({
      where: {
        memberships: {
          some: {
            tenantId: t.id,
            role: { in: ["OWNER", "ADMIN"] },
            isActive: true,
          },
        },
      },
      include: { memberships: true },
    });
    assert.ok(adminUser, "Studio Owner / Admin must exist");
    adminMembership = adminUser.memberships.find((m: any) => m.tenantId === t.id);
    assert.ok(adminMembership, "Admin membership must exist");

    adminContext = {
      tenantId: t.id,
      tenantSlug: t.slug,
      tenantName: t.name,
      userId: adminUser.id,
      userFullName: adminUser.fullName,
      userEmail: adminUser.email,
      membershipId: adminMembership.id,
      role: adminMembership.role,
      hasFinanceAccess: adminMembership.hasFinanceAccess,
      employeeId: "EMP-001",
      timezone: "Asia/Kolkata",
      currency: "INR",
    };
  });

  test("1. Create Employee with custom password & dispatch notification to Outbox", async () => {
    const uniqueEmail = `test.architect.${Date.now()}@100percentdesign.in`;
    const uniqueEmpId = `EMP-T${Math.floor(100 + Math.random() * 899)}`;
    const customPassword = "CustomPass#2026!";
    const customMessage = "Welcome to the 100% DESIGN team! Please complete your profile.";

    const created = await createEmployeeService(adminContext, {
      employeeId: uniqueEmpId,
      fullName: "Test Architect Arjun",
      email: uniqueEmail,
      phone: "+91 98111 22334",
      department: "Architecture",
      designation: "Senior Architect",
      role: "EMPLOYEE",
      temporaryPassword: customPassword,
      customMessage,
      notifyEmployee: true,
    });

    assert.equal(created.fullName, "Test Architect Arjun");
    assert.equal(created.employeeId, uniqueEmpId);
    assert.ok(created.notification, "Notification result must be returned");
    assert.ok(created.notification.outboxId, "Outbox ID must be generated");
    assert.ok(created.notification.whatsappUrl.includes("wa.me"), "WhatsApp URL must be generated");
    assert.ok(created.notification.plainTextMessage.includes(customPassword), "Message must contain password");
    assert.ok(created.notification.plainTextMessage.includes(customMessage), "Message must contain custom message");

    // Verify NotificationOutbox record in database
    const outboxRecord = await prisma.notificationOutbox.findUnique({
      where: { id: created.notification.outboxId },
    });
    assert.ok(outboxRecord, "NotificationOutbox record must exist in DB");
    assert.equal(outboxRecord.recipientEmail, uniqueEmail);
    assert.ok(outboxRecord.htmlBody.includes(customPassword), "HTML email body must contain password");

    // Test that the newly created employee can authenticate with their assigned password
    const loginRes = await loginWithWorkspace({
      workspaceSlug: tenant.slug,
      identifier: uniqueEmail,
      password: customPassword,
    });
    assert.equal(loginRes.success, true, "Employee must be able to log in with initial password");
    assert.equal(loginRes.user?.employeeId, uniqueEmpId);
  });

  test("2. Admin manipulates employee password, revokes sessions, and queues update notification", async () => {
    const uniqueEmail = `test.manipulate.${Date.now()}@100percentdesign.in`;
    const uniqueEmpId = `EMP-M${Math.floor(100 + Math.random() * 899)}`;
    const initialPassword = "InitialPass#123!";

    const created = await createEmployeeService(adminContext, {
      employeeId: uniqueEmpId,
      fullName: "Meera Manipulate",
      email: uniqueEmail,
      phone: "+91 99222 33445",
      department: "Interior Design",
      designation: "Interior Architect",
      role: "EMPLOYEE",
      temporaryPassword: initialPassword,
      notifyEmployee: false,
    });

    // Verify initial login works
    const loginBefore = await loginWithWorkspace({
      workspaceSlug: tenant.slug,
      identifier: uniqueEmpId,
      password: initialPassword,
    });
    assert.equal(loginBefore.success, true);
    const sessionTokenBefore = loginBefore.sessionToken!;

    // Admin manipulates/changes password to a brand new one
    const updatedPassword = "UpdatedSecure#999!";
    const updateMessage = "Your password has been changed by Admin Saksham Lanjewar.";

    const resetRes = await resetPasswordService(adminContext, {
      membershipId: created.membershipId,
      temporaryPassword: updatedPassword,
      customMessage: updateMessage,
      notifyEmployee: true,
    });

    assert.equal(resetRes.success, true);
    assert.ok(resetRes.notification, "Reset notification must be returned");
    assert.ok(resetRes.notification.plainTextMessage.includes(updatedPassword));
    assert.ok(resetRes.notification.plainTextMessage.includes(updateMessage));

    // Old password MUST now fail
    const oldLoginAttempt = await loginWithWorkspace({
      workspaceSlug: tenant.slug,
      identifier: uniqueEmpId,
      password: initialPassword,
    });
    assert.equal(oldLoginAttempt.success, false, "Old password must be rejected");

    // New manipulated password MUST succeed
    const newLoginAttempt = await loginWithWorkspace({
      workspaceSlug: tenant.slug,
      identifier: uniqueEmpId,
      password: updatedPassword,
    });
    assert.equal(newLoginAttempt.success, true, "New manipulated password must succeed");
    assert.equal(newLoginAttempt.user?.employeeId, uniqueEmpId);

    // Verify old session token was revoked
    const userSession = await prisma.session.findUnique({
      where: { token: sessionTokenBefore },
    });
    assert.ok(userSession?.revokedAt !== null, "Previous active session must be revoked");
  });
});
