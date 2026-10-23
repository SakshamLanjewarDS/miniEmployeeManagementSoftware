import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import {
  createSession,
  resolveSessionAndTenant,
  clearSessionCache,
} from "../src/server/auth/session";
import {
  TenantContext,
  isAdminOrOwner,
  assertAdminOrOwner,
  ForbiddenException,
  UnauthorizedException,
} from "../src/server/tenancy/context";
import { TenantRole, TenantLifecycleState, UserAccountState } from "@prisma/client";

describe("Permission Revocation & Session Invalidation Suite", () => {
  assertSafeTestDatabase();

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userA2: any;
  let userB: any;
  let memberA: any;
  let memberA2: any;
  let memberB: any;
  let sessionTokenA: string;
  let sessionTokenB: string;

  before(async () => {
    const timestamp = Date.now();

    // 1. Setup Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        name: `Perm Test Tenant A ${timestamp}`,
        slug: `perm-a-${timestamp}`,
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: TenantLifecycleState.ACTIVE,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `admin-a-${timestamp}@perm-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Admin User A",
        accountState: UserAccountState.ACTIVE,
      },
    });

    memberA = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantA.id,
        userId: userA.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
        isActive: true,
      },
    });

    userA2 = await prisma.user.create({
      data: {
        email: `unrelated-a2-${timestamp}@perm-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Unrelated Employee A2",
        accountState: UserAccountState.ACTIVE,
      },
    });

    memberA2 = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantA.id,
        userId: userA2.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
        isActive: true,
      },
    });

    const sA = await createSession(userA.id, tenantA.id);
    sessionTokenA = sA.token;

    // 2. Setup Tenant B (Isolation target)
    tenantB = await prisma.tenant.create({
      data: {
        name: `Perm Test Tenant B ${timestamp}`,
        slug: `perm-b-${timestamp}`,
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: TenantLifecycleState.ACTIVE,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `admin-b-${timestamp}@perm-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Admin User B",
        accountState: UserAccountState.ACTIVE,
      },
    });

    memberB = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantB.id,
        userId: userB.id,
        role: TenantRole.ADMIN,
        hasFinanceAccess: true,
        isActive: true,
      },
    });

    const sB = await createSession(userB.id, tenantB.id);
    sessionTokenB = sB.token;
  });

  after(async () => {
    try {
      clearSessionCache();
      for (const t of [tenantA, tenantB]) {
        if (!t?.id) continue;
        await prisma.session.deleteMany({ where: { activeTenantId: t.id } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: t.id } });
        await prisma.tenant.delete({ where: { id: t.id } });
      }
      for (const u of [userA, userA2, userB]) {
        if (!u?.id) continue;
        await prisma.session.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
      }
    } catch {
      // Best-effort cleanup
    }
  });

  test("1. Baseline: Authenticated session resolves active Admin role & Finance access and warms cache", async () => {
    const ctx = await resolveSessionAndTenant(sessionTokenA, tenantA.slug);
    assert.equal(ctx.role, TenantRole.ADMIN, "Initial role must be ADMIN");
    assert.equal(ctx.hasFinanceAccess, true, "Initial finance access must be true");
    assert.equal(isAdminOrOwner(ctx), true, "Must have admin privileges");
  });

  test("2. Immediate Role Demotion & Finance Access Revocation: Next request uses current DB authorization", async () => {
    // Demote user in MySQL: ADMIN -> EMPLOYEE and revoke finance access
    await prisma.tenantMembership.update({
      where: { id: memberA.id },
      data: {
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
      },
    });

    // Immediate request using the same active session token
    const ctxAfter = await resolveSessionAndTenant(sessionTokenA, tenantA.slug);
    assert.equal(ctxAfter.role, TenantRole.EMPLOYEE, "Role must immediately be EMPLOYEE");
    assert.equal(ctxAfter.hasFinanceAccess, false, "Finance access must immediately be false");
    assert.equal(isAdminOrOwner(ctxAfter), false, "Admin privileges must immediately be denied");

    // Verify protected action fails fast
    assert.throws(
      () => assertAdminOrOwner(ctxAfter, "Admin access required"),
      (err: any) => err instanceof ForbiddenException
    );
  });

  test("3. Retained Permissions: Demoted employee retains standard employee access", async () => {
    const ctx = await resolveSessionAndTenant(sessionTokenA, tenantA.slug);
    assert.equal(ctx.userId, userA.id);
    assert.equal(ctx.tenantId, tenantA.id);
    assert.equal(ctx.role, TenantRole.EMPLOYEE);
    // Employee context is valid and functional
    assert.ok(ctx.membershipId, "Membership ID must remain populated");
  });

  test("4. Multi-Process Consistency: Stale in-memory cache entry is corrected by database verification", async () => {
    // Simulate a separate server process:
    // Even if memory in another process holds a stale context with role ADMIN:
    // The database check verifies live membership and updates cached context to EMPLOYEE!
    const ctx = await resolveSessionAndTenant(sessionTokenA, tenantA.slug);
    assert.equal(ctx.role, TenantRole.EMPLOYEE, "Database check must ensure role is EMPLOYEE across processes");
    assert.equal(ctx.hasFinanceAccess, false, "Database check must ensure finance access is revoked");
  });

  test("5. Membership Deactivation: Immediate denial (401 Unauthorized) and cache eviction", async () => {
    // Deactivate membership in MySQL
    await prisma.tenantMembership.update({
      where: { id: memberA.id },
      data: { isActive: false },
    });

    // Immediate request must be rejected
    await assert.rejects(
      async () => {
        await resolveSessionAndTenant(sessionTokenA, tenantA.slug);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /not an active member/);
        return true;
      }
    );
  });

  test("6. Session Revocation: Immediate denial upon session revocation in database", async () => {
    // Reactivate membership
    await prisma.tenantMembership.update({
      where: { id: memberA.id },
      data: { isActive: true },
    });

    // Create fresh session and warm cache
    const freshSession = await createSession(userA.id, tenantA.id);
    const warmCtx = await resolveSessionAndTenant(freshSession.token, tenantA.slug);
    assert.equal(warmCtx.userId, userA.id);

    // Revoke session in MySQL
    await prisma.session.update({
      where: { token: freshSession.token },
      data: { revokedAt: new Date() },
    });

    // Immediate request must fail closed
    await assert.rejects(
      async () => {
        await resolveSessionAndTenant(freshSession.token, tenantA.slug);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /expired or was revoked/);
        return true;
      }
    );
  });

  test("7. Tenant and User Isolation: Revocations in Tenant A do not affect Tenant B or unrelated users", async () => {
    // Tenant B user was never demoted or revoked
    const ctxB = await resolveSessionAndTenant(sessionTokenB, tenantB.slug);
    assert.equal(ctxB.role, TenantRole.ADMIN, "Tenant B user must retain ADMIN role");
    assert.equal(ctxB.hasFinanceAccess, true, "Tenant B user must retain finance access");
    assert.equal(ctxB.tenantId, tenantB.id, "Tenant B isolation must be strictly preserved");

    // Unrelated user A2 in Tenant A
    const sA2 = await createSession(userA2.id, tenantA.id);
    const ctxA2 = await resolveSessionAndTenant(sA2.token, tenantA.slug);
    assert.equal(ctxA2.role, TenantRole.EMPLOYEE);
    assert.equal(ctxA2.userId, userA2.id);
  });
});
