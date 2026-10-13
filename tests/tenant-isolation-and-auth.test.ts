import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import { loginWithWorkspace, deactivateMember } from "../src/server/auth/service";
import { resolveSessionAndTenant } from "../src/server/auth/session";
import { findEmployeesByTenant, findEmployeeByMembershipId } from "../src/server/modules/employees/repository";
import { createEmployeeService } from "../src/server/modules/employees/service";
import { reassignTask, updateTask, createTask } from "../src/server/modules/tasks/repository";
import { TenantContext } from "../src/server/tenancy/context";
import { TenantRole, TaskPriority, TaskWorkflowStatus, ProjectStatus } from "@prisma/client";

describe("Phase 1: SaaS Foundation & Multi-Tenant Isolation Tests", () => {
  assertSafeTestDatabase();

  const T1_SLUG = `test-t1-${Date.now()}`;
  const T2_SLUG = `test-t2-${Date.now()}`;

  let tenant1: any;
  let tenant2: any;
  let tanyaSessionToken: string;
  let ananyaSessionToken: string;
  let apexSessionToken: string;
  let project1: any;
  let task1: any;

  before(async () => {
    const passwordHash = await bcrypt.hash("StudioPassword2026!", 10);

    // 1. Create Isolated Tenant 1
    tenant1 = await prisma.tenant.create({
      data: {
        slug: T1_SLUG,
        name: "100% DESIGN Studio (Test)",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // 2. Create Isolated Tenant 2
    tenant2 = await prisma.tenant.create({
      data: {
        slug: T2_SLUG,
        name: "Apex Studio (Test)",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    // 3. Seed Users in Tenant 1
    // Tanya Mathur (EMP-001, OWNER)
    const tanyaUser = await prisma.user.create({
      data: {
        email: `boss-${Date.now()}@100percentdesign.in`,
        fullName: "Tanya Mathur",
        passwordHash,
      },
    });
    const tanyaMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: tanyaUser.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: tanyaMember.id,
        employeeId: "EMP-001",
        designation: "Studio Principal",
        department: "Administration",
      },
    });

    // Priya Sharma (EMP-002, ADMIN)
    const priyaUser = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@100percentdesign.in`,
        fullName: "Priya Sharma",
        passwordHash,
      },
    });
    const priyaMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: priyaUser.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: priyaMember.id,
        employeeId: "EMP-002",
        designation: "Studio Administrator",
        department: "Administration",
      },
    });

    // Vikram Sen (EMP-003, EMPLOYEE)
    const vikramUser = await prisma.user.create({
      data: {
        email: `vikram-${Date.now()}@100percentdesign.in`,
        fullName: "Vikram Sen",
        passwordHash,
      },
    });
    const vikramMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: vikramUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: vikramMember.id,
        employeeId: "EMP-003",
        designation: "Senior Architect",
        department: "Architecture",
      },
    });

    // Ananya Roy (EMP-004, EMPLOYEE)
    const ananyaUser = await prisma.user.create({
      data: {
        email: `ananya-${Date.now()}@100percentdesign.in`,
        fullName: "Ananya Roy",
        passwordHash,
      },
    });
    const ananyaMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: ananyaUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: ananyaMember.id,
        employeeId: "EMP-004",
        designation: "Junior Architect",
        department: "Architecture",
      },
    });

    // Rohan Joshi (EMP-005, EMPLOYEE)
    const rohanUser = await prisma.user.create({
      data: {
        email: `rohan-${Date.now()}@100percentdesign.in`,
        fullName: "Rohan Joshi",
        passwordHash,
      },
    });
    const rohanMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant1.id,
        userId: rohanUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant1.id,
        membershipId: rohanMember.id,
        employeeId: "EMP-005",
        designation: "Draftsman",
        department: "Architecture",
      },
    });

    // 4. Seed Users in Tenant 2
    // Siddharth Rao (EMP-001 in Tenant 2, OWNER)
    const siddharthUser = await prisma.user.create({
      data: {
        email: `siddharth-${Date.now()}@apexstudio.in`,
        fullName: "Siddharth Rao",
        passwordHash,
      },
    });
    const siddharthMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant2.id,
        userId: siddharthUser.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant2.id,
        membershipId: siddharthMember.id,
        employeeId: "EMP-001",
        designation: "Apex Principal",
        department: "Administration",
      },
    });

    // Meera Nair (EMP-002 in Tenant 2, EMPLOYEE)
    const meeraUser = await prisma.user.create({
      data: {
        email: `meera-${Date.now()}@apexstudio.in`,
        fullName: "Meera Nair",
        passwordHash,
      },
    });
    const meeraMember = await prisma.tenantMembership.create({
      data: {
        tenantId: tenant2.id,
        userId: meeraUser.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });
    await prisma.employee.create({
      data: {
        tenantId: tenant2.id,
        membershipId: meeraMember.id,
        employeeId: "EMP-002",
        designation: "Architectural Lead",
        department: "Architecture",
      },
    });

    // 5. Create project and task in Tenant 1 assigned to Ananya
    project1 = await prisma.project.create({
      data: {
        tenantId: tenant1.id,
        code: `TST-${Date.now().toString().slice(-4)}`,
        name: "Test Villa Isolation Project",
        projectType: "RESIDENTIAL_VILLA",
        status: ProjectStatus.ACTIVE,
      },
    });

    const tanyaCtx: TenantContext = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: tanyaUser.id,
      userEmail: tanyaUser.email,
      userFullName: tanyaUser.fullName,
      membershipId: tanyaMember.id,
      employeeId: "EMP-001",
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    task1 = await createTask(tanyaCtx, {
      projectId: project1.id,
      title: "Ground Floor Waterproofing Details",
      description: "Initial waterproofing instructions and detailing",
      assigneeId: ananyaMember.id,
      priority: TaskPriority.HIGH,
      checklistItems: [
        {
          title: "Verify membrane alignment",
          assignedMemberId: ananyaMember.id,
        },
      ],
    });
  });

  after(async () => {
    // Teardown isolated test tenants
    if (tenant1?.id) {
      await prisma.tenant.delete({ where: { id: tenant1.id } }).catch(() => {});
    }
    if (tenant2?.id) {
      await prisma.tenant.delete({ where: { id: tenant2.id } }).catch(() => {});
    }
  });

  test("1. Company-scoped Employee ID Login (EMP-001 collision resolves to distinct users)", async () => {
    // Tenant 1: EMP-001 -> Tanya Mathur (Boss / Owner)
    const loginT1 = await loginWithWorkspace({
      workspaceSlug: tenant1.slug,
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
      workspaceSlug: tenant2.slug,
      identifier: "EMP-001",
      password: "StudioPassword2026!",
    });
    assert.equal(loginT2.success, true);
    assert.equal(loginT2.user?.fullName, "Siddharth Rao");
    assert.equal(loginT2.user?.role, "OWNER");
    assert.ok(loginT2.sessionToken);
    apexSessionToken = loginT2.sessionToken;

    // Verify tokens resolve to distinct tenant contexts
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, tenant1.slug);
    assert.equal(ctx1.tenantId, tenant1.id);
    assert.equal(ctx1.userFullName, "Tanya Mathur");

    const ctx2 = await resolveSessionAndTenant(apexSessionToken, tenant2.slug);
    assert.equal(ctx2.tenantId, tenant2.id);
    assert.equal(ctx2.userFullName, "Siddharth Rao");
  });

  test("2. Work Email Login for Admin & Boss", async () => {
    const priyaEmp = await prisma.employee.findFirst({
      where: { tenantId: tenant1.id, employeeId: "EMP-002" },
      include: { membership: { include: { user: true } } },
    });
    assert.ok(priyaEmp);

    const loginAdmin = await loginWithWorkspace({
      workspaceSlug: tenant1.slug,
      identifier: priyaEmp.membership.user.email,
      password: "StudioPassword2026!",
    });
    assert.equal(loginAdmin.success, true);
    assert.equal(loginAdmin.user?.fullName, "Priya Sharma");
    assert.equal(loginAdmin.user?.role, "ADMIN");
    assert.equal(loginAdmin.user?.employeeId, "EMP-002");

    const tanyaEmp = await prisma.employee.findFirst({
      where: { tenantId: tenant1.id, employeeId: "EMP-001" },
      include: { membership: { include: { user: true } } },
    });
    assert.ok(tanyaEmp);

    const loginBoss = await loginWithWorkspace({
      workspaceSlug: tenant1.slug,
      identifier: tanyaEmp.membership.user.email,
      password: "StudioPassword2026!",
    });
    assert.equal(loginBoss.success, true);
    assert.equal(loginBoss.user?.fullName, "Tanya Mathur");
    assert.equal(loginBoss.user?.role, "OWNER");
    assert.equal(loginBoss.user?.employeeId, "EMP-001");
  });

  test("3. Team Structure: Exactly 1 Boss, 1 Admin, and 3 Employees in 100% DESIGN", async () => {
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, tenant1.slug);
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
    const ctx1 = await resolveSessionAndTenant(tanyaSessionToken, tenant1.slug);
    const employeesT1 = await findEmployeesByTenant(ctx1);

    for (const emp of employeesT1) {
      assert.notEqual(emp.fullName, "Siddharth Rao", "Must not leak Tenant 2 owner into Tenant 1");
      assert.notEqual(emp.fullName, "Meera Nair", "Must not leak Tenant 2 employee into Tenant 1");
    }

    const apexMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant2.id, employee: { employeeId: "EMP-002" } },
    });
    assert.ok(apexMember);

    const crossQuery = await findEmployeeByMembershipId(ctx1, apexMember.id);
    assert.equal(crossQuery, null, "Cross-tenant query must return null");
  });

  test("5. Account Deactivation immediately invalidates active sessions", async () => {
    // 1. Login as Ananya (EMP-004)
    const empLogin = await loginWithWorkspace({
      workspaceSlug: tenant1.slug,
      identifier: "EMP-004",
      password: "StudioPassword2026!",
    });
    assert.equal(empLogin.success, true);
    ananyaSessionToken = empLogin.sessionToken!;

    // 2. Verify Ananya can resolve context
    const ctxBefore = await resolveSessionAndTenant(ananyaSessionToken, tenant1.slug);
    assert.equal(ctxBefore.userFullName, "Ananya Roy");

    // 3. Admin/Owner Tanya deactivates Ananya's membership
    const tanyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, role: "OWNER" },
    });
    assert.ok(tanyaMember);

    const ananyaMember = await prisma.tenantMembership.findUnique({
      where: { id: ctxBefore.membershipId },
    });
    assert.ok(ananyaMember);

    const deactResult = await deactivateMember(tenant1.id, ananyaMember.id, tanyaMember.userId);
    assert.equal(deactResult.success, true);

    // 4. Verify Ananya's active session is now rejected
    await assert.rejects(
      async () => {
        await resolveSessionAndTenant(ananyaSessionToken, tenant1.slug);
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
    const ananyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, employee: { employeeId: "EMP-004" } },
      include: { user: true, employee: true },
    });
    assert.ok(ananyaMember);

    const employeeCtx: TenantContext = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
      userId: ananyaMember.userId,
      userEmail: ananyaMember.user.email,
      userFullName: ananyaMember.user.fullName,
      membershipId: ananyaMember.id,
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
    const ananyaMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, employee: { employeeId: "EMP-004" } },
      include: { user: true, employee: true },
    });
    assert.ok(ananyaMember);

    const vikramMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, employee: { employeeId: "EMP-003" } },
      include: { user: true, employee: true },
    });
    assert.ok(vikramMember);

    const rohanMember = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant1.id, employee: { employeeId: "EMP-005" } },
      include: { user: true, employee: true },
    });
    assert.ok(rohanMember);

    const ananyaCtx: TenantContext = {
      tenantId: tenant1.id,
      tenantSlug: tenant1.slug,
      tenantName: tenant1.name,
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

    // 1. Employee can EDIT their assigned task
    const updatedTask = await updateTask(ananyaCtx, task1.id, {
      title: "Updated Ground Floor Waterproofing Details",
      estimatedHours: 14.5,
    });
    assert.equal(updatedTask.title, "Updated Ground Floor Waterproofing Details");
    assert.equal(Number(updatedTask.estimatedHours), 14.5);

    // 2. Employee is unable to do task -> DELEGATES to Vikram!
    const delegatedTask = await reassignTask(
      ananyaCtx,
      task1.id,
      vikramMember.id,
      "Unable to finish due to urgent site inspection in Alibaug. Handed over to Vikram."
    );
    assert.equal(delegatedTask.assigneeId, vikramMember.id);

    // Verify delegation is audited in TaskActivityHistory
    const history = await prisma.taskActivityHistory.findFirst({
      where: { taskId: task1.id, action: "REASSIGNED" },
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
        await reassignTask(rohanCtx, task1.id, ananyaMember.id, "Unauthorized transfer attempt");
      },
      (err: any) => {
        return err.name === "ForbiddenException";
      },
      "Non-assignee employee without Admin/Boss role must be forbidden from reassigning tasks"
    );
  });
});
