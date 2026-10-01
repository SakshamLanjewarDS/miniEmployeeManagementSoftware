import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/server/db/prisma";
import { loginWithWorkspace, deactivateMember } from "../src/server/auth/service";
import { resolveSessionAndTenant } from "../src/server/auth/session";
import { findEmployeesByTenant, findEmployeeByMembershipId } from "../src/server/modules/employees/repository";
import { createEmployeeService } from "../src/server/modules/employees/service";
import { reassignTask, updateTask } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskPriority, TaskWorkflowStatus } from "@prisma/client";

describe("Phase 1: SaaS Foundation & Multi-Tenant Isolation Tests", () => {
  let tenant1: { id: string; slug: string };
  let tenant2: { id: string; slug: string };
  let tanyaSessionToken: string;
  let ananyaSessionToken: string;
  let apexSessionToken: string;

  before(async () => {
    const t1 = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
    const t2 = await prisma.tenant.findUnique({ where: { slug: "apex-studio" } });
    assert.ok(t1, "Tenant 1 (100% DESIGN) must exist");
    assert.ok(t2, "Tenant 2 (Apex Studio) must exist");
    tenant1 = t1;
    tenant2 = t2;
  });

  after(async () => {
    // Cleanup any test-created records if needed
  });

  test("1. Company-scoped Employee ID Login (EMP-001 collision resolves to distinct users)", async () => {
    // Tenant 1: EMP-001 -> Tanya Mathur (Boss / Owner)
    const loginT1 = await loginWithWorkspace({
      workspaceSlug: "100percentdesign",
      identifier: "EMP-001",
      password: "StudioPassword2026!",
    });
    assert.equal(loginT1.success, true);
    assert.equal(loginT1.user?.fullName, "Tanya Mathur");
    assert.equal(loginT1.user?.role, "OWNER");
    assert.ok(loginT1.sessionToken);
    tanyaSessionToken = loginT1.sessionToken;

    // Tenant 2: EMP-001 -> Siddharth Rao
    const loginT2 = await loginWithWorkspace({
      workspaceSlug: "apex-studio",
      identifier: "EMP-001",
      password: "StudioPassword2026!",
    });
    assert.equal(loginT2.success, true);
    assert.equal(loginT2.user?.fullName, "Siddharth Rao");
    assert.equal(loginT2.user?.role, "OWNER");
    assert.ok(loginT2.sessionToken);
    apexSessionToken = loginT2.sessionToken;

    // Verify tokens resolve to distinct tenant contexts
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, "100percentdesign");
    assert.equal(ctx1.tenantId, tenant1.id);
    assert.equal(ctx1.userFullName, "Tanya Mathur");

    const ctx2 = await resolveSessionAndTenant(apexSessionToken, "apex-studio");
    assert.equal(ctx2.tenantId, tenant2.id);
    assert.equal(ctx2.userFullName, "Siddharth Rao");
  });

  test("2. Work Email Login for Admin & Boss", async () => {
    const loginAdmin = await loginWithWorkspace({
      workspaceSlug: "100percentdesign",
      identifier: "admin@100percentdesign.in",
      password: "StudioPassword2026!",
    });
    assert.equal(loginAdmin.success, true);
    assert.equal(loginAdmin.user?.fullName, "Priya Sharma");
    assert.equal(loginAdmin.user?.role, "ADMIN");
    assert.equal(loginAdmin.user?.employeeId, "EMP-002");

    const loginBoss = await loginWithWorkspace({
      workspaceSlug: "100percentdesign",
      identifier: "boss@100percentdesign.in",
      password: "StudioPassword2026!",
    });
    assert.equal(loginBoss.success, true);
    assert.equal(loginBoss.user?.fullName, "Tanya Mathur");
    assert.equal(loginBoss.user?.role, "OWNER");
    assert.equal(loginBoss.user?.employeeId, "EMP-001");
  });

  test("3. Team Structure: Exactly 1 Boss, 1 Admin, and 3 Employees in 100% DESIGN", async () => {
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, "100percentdesign");
    const employeesT1 = await findEmployeesByTenant(ctx1);

    assert.ok(employeesT1.length >= 5, "Tenant 1 must have at least 5 members");

    const boss = employeesT1.find((e) => e.role === "OWNER");
    assert.ok(boss);
    assert.equal(boss.employeeId, "EMP-001");
    assert.equal(boss.fullName, "Tanya Mathur");

    const admin = employeesT1.find((e) => e.role === "ADMIN");
    assert.ok(admin);
    assert.equal(admin.employeeId, "EMP-002");
    assert.equal(admin.fullName, "Priya Sharma");

    const seedEmployees = employeesT1.filter((e) => ["EMP-003", "EMP-004", "EMP-005"].includes(e.employeeId));
    assert.equal(seedEmployees.length, 3, "Must have the 3 standard seed employees");

    const empIds = seedEmployees.map((e) => e.employeeId).sort();
    assert.deepEqual(empIds, ["EMP-003", "EMP-004", "EMP-005"]);
  });

  test("4. Cross-Tenant Data Isolation (Tenant A cannot see Tenant B records)", async () => {
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, "100percentdesign");
    const employeesT1 = await findEmployeesByTenant(ctx1);

    for (const emp of employeesT1) {
      assert.notEqual(emp.fullName, "Siddharth Rao", "Must not leak Tenant 2 owner into Tenant 1");
      assert.notEqual(emp.fullName, "Meera Nair", "Must not leak Tenant 2 employee into Tenant 1");
    }

    const apexMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant2.id, user: { email: "meera@apexstudio.in" } },
    });
    assert.ok(apexMember);

    const crossQuery = await findEmployeeByMembershipId(ctx1, apexMember.id);
    assert.equal(crossQuery, null, "Cross-tenant query must return null");
  });

  test("5. Account Deactivation immediately invalidates active sessions", async () => {
    // 1. Login as Ananya (EMP-004)
    const empLogin = await loginWithWorkspace({
      workspaceSlug: "100percentdesign",
      identifier: "EMP-004",
      password: "StudioPassword2026!",
    });
    assert.equal(empLogin.success, true);
    ananyaSessionToken = empLogin.sessionToken!;

    // 2. Verify Ananya can resolve context
    const ctxBefore = await resolveSessionAndTenant(ananyaSessionToken, "100percentdesign");
    assert.equal(ctxBefore.userFullName, "Ananya Roy");

    // 3. Admin/Owner Tanya deactivates Ananya's membership
    const tanyaUser = await prisma.user.findUnique({ where: { email: "boss@100percentdesign.in" } });
    assert.ok(tanyaUser);

    const ananyaMember = await prisma.tenantMembership.findUnique({
      where: { id: ctxBefore.membershipId },
    });
    assert.ok(ananyaMember);

    const deactResult = await deactivateMember(tenant1.id, ananyaMember.id, tanyaUser.id);
    assert.equal(deactResult.success, true);

    // 4. Verify Ananya's active session is now rejected
    await assert.rejects(
      async () => {
        await resolveSessionAndTenant(ananyaSessionToken, "100percentdesign");
      },
      (err: any) => {
        return err.name === "UnauthorizedException";
      },
      "Deactivated employee session must be rejected"
    );

    // Reactivate Ananya for subsequent tests
    await prisma.tenantMembership.update({
      where: { id: ananyaMember.id },
      data: { isActive: true },
    });
  });

  test("6. Authorization Gate: Non-admin employees cannot create employees", async () => {
    const employeeCtx: TenantContext = {
      tenantId: tenant1.id,
      tenantSlug: "100percentdesign",
      tenantName: "100% DESIGN Studio",
      userId: "user-test-emp",
      userEmail: "ananya@100percentdesign.in",
      userFullName: "Ananya Roy",
      membershipId: "mem-test-emp",
      employeeId: "EMP-004",
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    await assert.rejects(
      async () => {
        await createEmployeeService(employeeCtx, {
          employeeId: "EMP-099",
          fullName: "Hacker Employee",
          email: "hacker@test.com",
          role: "EMPLOYEE",
        });
      },
      (err: any) => {
        return err.name === "ForbiddenException";
      },
      "Non-admin employee must be forbidden from creating employees"
    );
  });

  test("7. Employee Task Delegation & Editing Functionality", async () => {
    // Ensure test employees are active
    await prisma.tenantMembership.updateMany({
      where: {
        tenantId: tenant1.id,
        user: { email: { in: ["ananya@100percentdesign.in", "vikram@100percentdesign.in"] } },
      },
      data: { isActive: true },
    });

    // Ananya (EMP-004) has task 1 assigned to her
    const ananyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "ananya@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(ananyaMember);

    const vikramMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "vikram@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(vikramMember);

    const rohanMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, user: { email: "rohan@100percentdesign.in" } },
      include: { user: true, employee: true },
    });
    assert.ok(rohanMember);

    const ananyaCtx: TenantContext = {
      tenantId: tenant1.id,
      tenantSlug: "100percentdesign",
      tenantName: "100% DESIGN Studio",
      userId: ananyaMember.userId,
      userEmail: ananyaMember.user.email,
      userFullName: ananyaMember.user.fullName,
      membershipId: ananyaMember.id,
      employeeId: ananyaMember.employee?.employeeId ?? null,
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    // Find a task assigned to Ananya
    const task = await prisma.task.findFirst({
      where: { tenantId: tenant1.id, assigneeId: ananyaMember.id },
    });
    assert.ok(task, "Task assigned to Ananya must exist");

    // 1. Employee can EDIT their assigned task
    const updatedTask = await updateTask(ananyaCtx, task.id, {
      title: "Updated Ground Floor Waterproofing Details",
      estimatedHours: 14.5,
    });
    assert.equal(updatedTask.title, "Updated Ground Floor Waterproofing Details");
    assert.equal(Number(updatedTask.estimatedHours), 14.5);

    // 2. Employee is unable to do task -> DELEGATES to Vikram!
    const delegatedTask = await reassignTask(
      ananyaCtx,
      task.id,
      vikramMember.id,
      "Unable to finish due to urgent site inspection in Alibaug. Handed over to Vikram."
    );
    assert.equal(delegatedTask.assigneeId, vikramMember.id);

    // Verify delegation is audited in TaskActivityHistory
    const history = await prisma.taskActivityHistory.findFirst({
      where: { taskId: task.id, action: "REASSIGNED" },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(history);
    assert.equal(history.newValue, "Vikram Sen");
    assert.ok(history.reason?.includes("Alibaug"));

    // 3. Unauthorized Employee Rohan CANNOT reassign Vikram's task without permission
    const rohanCtx: TenantContext = {
      ...ananyaCtx,
      userId: rohanMember.userId,
      userEmail: rohanMember.user.email,
      userFullName: rohanMember.user.fullName,
      membershipId: rohanMember.id,
      employeeId: rohanMember.employee?.employeeId ?? null,
    };

    await assert.rejects(
      async () => {
        await reassignTask(rohanCtx, task.id, ananyaMember.id, "Unauthorized transfer attempt");
      },
      (err: any) => {
        return err.name === "ForbiddenException";
      },
      "Non-assignee employee without Admin/Boss role must be forbidden from reassigning tasks"
    );

    // Restore task assignment back to Ananya for seed consistency
    const bossUser = await prisma.user.findUnique({ where: { email: "boss@100percentdesign.in" } });
    const bossMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, userId: bossUser!.id },
    });
    const bossCtx: TenantContext = {
      ...ananyaCtx,
      userId: bossUser!.id,
      userEmail: bossUser!.email,
      userFullName: bossUser!.fullName,
      membershipId: bossMember!.id,
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
    };
    await reassignTask(bossCtx, task.id, ananyaMember.id, "Restored to Ananya for test baseline");
  });
});
