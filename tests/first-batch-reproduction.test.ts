import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, assertSafeTestDatabase } from "./helpers/test-db";
import { TenantContext, ForbiddenException, UnauthorizedException } from "../src/server/tenancy/context";
import { TenantRole } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { finalizeAndLockPayrollPeriod, getMonthlyPayrollPreview } from "../src/server/modules/payroll/lifecycle";
import { getBackupVerificationOverview } from "../src/server/modules/storage/backup";
import { calculateEmployeePayroll } from "../src/server/modules/payroll/engine";
import { GET as calculateGet } from "../src/app/api/payroll/calculate/route";
import { GET as backupGet } from "../src/app/api/backup/route";
import { NextRequest } from "next/server";

describe("First Batch Audit Validation & Verification Suite", () => {
  assertSafeTestDatabase();

  const T_SLUG_A = `audit-tenant-a-${Date.now()}`;
  const T_SLUG_B = `audit-tenant-b-${Date.now()}`;
  let tenantA: any;
  let tenantB: any;
  let ownerCtxA: TenantContext;
  let ownerCtxB: TenantContext;
  let employeeCtxA: TenantContext;
  let empA: any;
  let empB: any;
  let loanA: any;
  let loanB: any;

  before(async () => {
    // 1. Setup Tenant A
    tenantA = await prisma.tenant.create({
      data: {
        slug: T_SLUG_A,
        name: "Audit Tenant A",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    const userA = await prisma.user.create({
      data: {
        email: `ownerA-${Date.now()}@audit-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Owner Tenant A",
      },
    });

    const membershipA = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantA.id,
        userId: userA.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
      },
    });

    ownerCtxA = {
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
      tenantName: tenantA.name,
      userId: userA.id,
      userEmail: userA.email,
      userFullName: userA.fullName,
      membershipId: membershipA.id,
      employeeId: "EMP-A-01",
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    const regularUserA = await prisma.user.create({
      data: {
        email: `empA-${Date.now()}@audit-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Employee Tenant A",
      },
    });

    const regularMembershipA = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantA.id,
        userId: regularUserA.id,
        role: TenantRole.EMPLOYEE,
        hasFinanceAccess: false,
      },
    });

    employeeCtxA = {
      tenantId: tenantA.id,
      tenantSlug: tenantA.slug,
      tenantName: tenantA.name,
      userId: regularUserA.id,
      userEmail: regularUserA.email,
      userFullName: regularUserA.fullName,
      membershipId: regularMembershipA.id,
      employeeId: "EMP-A-02",
      role: TenantRole.EMPLOYEE,
      hasFinanceAccess: false,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    empA = await prisma.employee.create({
      data: {
        tenantId: tenantA.id,
        membershipId: membershipA.id,
        employeeId: "EMP-A-01",
        designation: "Principal Architect",
        department: "Executive",
        joinDate: new Date("2026-01-01"),
      },
    });

    await prisma.studioEmployeeCompensation.create({
      data: {
        tenantId: tenantA.id,
        employeeId: empA.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(50000),
        rateCalculationMode: "FIXED_30",
        bankName: "HDFC Bank",
        accountNumber: "001122334455",
        ifscCode: "HDFC0001234",
        isCurrent: true,
      },
    });

    loanA = await prisma.studioAdvanceLoan.create({
      data: {
        tenant: { connect: { id: tenantA.id } },
        employee: { connect: { id: empA.id } },
        approvedBy: { connect: { id: membershipA.id } },
        type: "ADVANCE",
        principalAmount: new Decimal(5000),
        monthlyRecoveryAmount: new Decimal(1000),
        recoveredAmount: new Decimal(0),
        balanceAmount: new Decimal(5000),
        status: "ACTIVE",
        disbursedDate: new Date("2026-09-01"),
      },
    });

    // 2. Setup Isolated Tenant B for Tenant-Scope Tests
    tenantB = await prisma.tenant.create({
      data: {
        slug: T_SLUG_B,
        name: "Audit Tenant B",
        timezone: "Asia/Kolkata",
        currency: "INR",
        lifecycleState: "ACTIVE",
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: `ownerB-${Date.now()}@audit-test.internal`,
        passwordHash: "$2b$10$e5XqN/K3xS/Z2Z0B7T9Y0.zD5w0Zk1e5XqN/K3xS/Z2Z0B7T9Y0.",
        fullName: "Owner Tenant B",
      },
    });

    const membershipB = await prisma.tenantMembership.create({
      data: {
        tenantId: tenantB.id,
        userId: userB.id,
        role: TenantRole.OWNER,
        hasFinanceAccess: true,
      },
    });

    ownerCtxB = {
      tenantId: tenantB.id,
      tenantSlug: tenantB.slug,
      tenantName: tenantB.name,
      userId: userB.id,
      userEmail: userB.email,
      userFullName: userB.fullName,
      membershipId: membershipB.id,
      employeeId: "EMP-B-01",
      role: TenantRole.OWNER,
      hasFinanceAccess: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
    };

    empB = await prisma.employee.create({
      data: {
        tenantId: tenantB.id,
        membershipId: membershipB.id,
        employeeId: "EMP-B-01",
        designation: "Managing Partner",
        department: "Executive",
        joinDate: new Date("2026-01-01"),
      },
    });

    await prisma.studioEmployeeCompensation.create({
      data: {
        tenantId: tenantB.id,
        employeeId: empB.id,
        effectiveFrom: new Date("2026-01-01"),
        baseMonthlySalary: new Decimal(60000),
        rateCalculationMode: "FIXED_30",
        bankName: "ICICI Bank",
        accountNumber: "998877665544",
        ifscCode: "ICIC0001234",
        isCurrent: true,
      },
    });

    loanB = await prisma.studioAdvanceLoan.create({
      data: {
        tenant: { connect: { id: tenantB.id } },
        employee: { connect: { id: empB.id } },
        approvedBy: { connect: { id: membershipB.id } },
        type: "ADVANCE",
        principalAmount: new Decimal(10000),
        monthlyRecoveryAmount: new Decimal(2000),
        recoveredAmount: new Decimal(0),
        balanceAmount: new Decimal(10000),
        status: "ACTIVE",
        disbursedDate: new Date("2026-09-01"),
      },
    });
  });

  after(async () => {
    try {
      for (const t of [tenantA, tenantB]) {
        if (!t?.id) continue;
        await prisma.studioAdvanceLoan.deleteMany({ where: { tenantId: t.id } });
        await prisma.studioPayrollRecord.deleteMany({ where: { tenantId: t.id } });
        await prisma.studioPayrollPeriod.deleteMany({ where: { tenantId: t.id } });
        await prisma.studioEmployeeCompensation.deleteMany({ where: { tenantId: t.id } });
        await prisma.employee.deleteMany({ where: { tenantId: t.id } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: t.id } });
        await prisma.tenant.delete({ where: { id: t.id } });
      }
    } catch {
      // Cleanup best-effort
    }
  });

  test("A.1 & A.2: First finalization applies correct deduction; repeated call is rejected without re-deducting", async () => {
    // Initial balance: 5000
    const initialLoan = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(initialLoan?.balanceAmount), 5000);
    assert.equal(Number(initialLoan?.recoveredAmount), 0);

    // 1. First finalization for October 2026 (2026-10)
    const lock1 = await finalizeAndLockPayrollPeriod(ownerCtxA, 2026, 10);
    assert.equal(lock1.isLocked, true);

    const loanAfterLock1 = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(loanAfterLock1?.balanceAmount), 4000, "Loan balance must decrease by 1000 after 1st lock");
    assert.equal(Number(loanAfterLock1?.recoveredAmount), 1000, "Recovered amount must be 1000 after 1st lock");

    // 2. Repeated finalization for October 2026 MUST fail with 'already finalized and locked'
    await assert.rejects(
      async () => {
        await finalizeAndLockPayrollPeriod(ownerCtxA, 2026, 10);
      },
      /already finalized and locked/
    );

    // Verify loan was NOT deducted again
    const loanAfterRepeat = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(loanAfterRepeat?.balanceAmount), 4000, "Loan balance must strictly remain 4000");
    assert.equal(Number(loanAfterRepeat?.recoveredAmount), 1000, "Recovered amount must strictly remain 1000");
  });

  test("A.3: Real database lock contention: competing finalizeAndLockPayrollPeriod calls with controlled overlap", async () => {
    // We target November 2026 (2026-11)
    const loanBefore = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    const balanceBefore = Number(loanBefore?.balanceAmount); // 4000

    // Wrap prisma.$transaction to hold worker 1's transaction open briefly so worker 2
    // is guaranteed to enter its real database transaction and hit MySQL InnoDB FOR UPDATE row lock contention
    const origTx = prisma.$transaction.bind(prisma);
    let callIndex = 0;
    (prisma as any).$transaction = async function (fn: any, ...args: any[]) {
      if (typeof fn === "function") {
        callIndex++;
        const myIndex = callIndex;
        return origTx.call(this, async (tx: any) => {
          const res = await fn(tx);
          if (myIndex === 1) {
            // Give worker 2 time to reach and block on MySQL InnoDB row lock before worker 1 commits
            await new Promise((r) => setTimeout(r, 60));
          }
          return res;
        }, ...args);
      }
      return (origTx as any)(fn, ...args);
    };

    let res1: PromiseSettledResult<any>;
    let res2: PromiseSettledResult<any>;
    try {
      [res1, res2] = await Promise.allSettled([
        finalizeAndLockPayrollPeriod(ownerCtxA, 2026, 11),
        finalizeAndLockPayrollPeriod(ownerCtxA, 2026, 11),
      ]);
    } finally {
      (prisma as any).$transaction = origTx;
    }

    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1, "Exactly one concurrent finalizeAndLockPayrollPeriod call must succeed");
    assert.equal(rejected.length, 1, "Exactly one concurrent finalizeAndLockPayrollPeriod call must be rejected");

    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    assert.match(rejection.message, /already finalized and locked/);

    // Verify loan was deducted exactly once across concurrent contenders
    const loanAfter = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(loanAfter?.balanceAmount), balanceBefore - 1000, "Loan balance must decrease by exactly 1 monthly deduction");
    assert.equal(Number(loanAfter?.recoveredAmount), 2000, "Recovered amount must be exactly 2000");
  });

  test("A.4: Forced transaction failure within finalizeAndLockPayrollPeriod rolls back period, records, and loan balances", async () => {
    // Target December 2026 (2026-12)
    const periodKey = "2026-12";
    const loanBefore = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    const balanceBefore = Number(loanBefore?.balanceAmount); // 3000

    // Wrap prisma.$transaction to trigger a failure within finalizeAndLockPayrollPeriod
    // AFTER financial writes to studioAdvanceLoan have executed in the active transaction
    const origTx = prisma.$transaction.bind(prisma);
    (prisma as any).$transaction = async function (fn: any, ...args: any[]) {
      if (typeof fn === "function") {
        return origTx.call(this, async (tx: any) => {
          const origLoanUpdate = tx.studioAdvanceLoan.update.bind(tx.studioAdvanceLoan);
          tx.studioAdvanceLoan.update = async (...loanArgs: any[]) => {
            // Execute real financial write in MySQL InnoDB transaction
            await origLoanUpdate(...loanArgs);
            // Immediately force an unexpected failure mid-transaction
            throw new Error("Simulated failure after financial writes started");
          };
          return await fn(tx);
        }, ...args);
      }
      return (origTx as any)(fn, ...args);
    };

    try {
      await assert.rejects(
        async () => {
          await finalizeAndLockPayrollPeriod(ownerCtxA, 2026, 12);
        },
        /Simulated failure after financial writes started/
      );
    } finally {
      (prisma as any).$transaction = origTx;
    }

    // Assert complete rollback across all tables:
    // 1. Period status must not be locked
    const periodAfter = await prisma.studioPayrollPeriod.findUnique({
      where: { tenantId_periodKey: { tenantId: ownerCtxA.tenantId, periodKey } },
    });
    assert.ok(!periodAfter || !periodAfter.isLocked, "Period must not be marked locked after aborted transaction");

    // 2. Payroll records must be rolled back
    const recordsAfter = await prisma.studioPayrollRecord.findMany({
      where: { tenantId: ownerCtxA.tenantId, period: { periodKey } },
    });
    assert.equal(recordsAfter.length, 0, "Payroll records created in aborted transaction must be rolled back");

    // 3. Loan deduction must be rolled back completely
    const loanAfter = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(loanAfter?.balanceAmount), balanceBefore, "Loan balance must strictly roll back to 3000");
    assert.equal(Number(loanAfter?.recoveredAmount), 2000, "Recovered amount must strictly roll back to 2000");
  });

  test("A.5: Tenant scoping: Finalizing Tenant A preserves Tenant B isolation", async () => {
    // Tenant B has an active loan with 10,000 balance
    const loanBBefore = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanB.id } });
    assert.equal(Number(loanBBefore?.balanceAmount), 10000);

    // Verify October 2026 is locked for Tenant A (from test A.1), but completely unfinalized for Tenant B
    const previewB = await getMonthlyPayrollPreview(ownerCtxB, 2026, 10);
    assert.equal(previewB.isLocked, false, "Tenant B period 2026-10 must not be locked by Tenant A");

    // Finalize Tenant B independently
    const lockB = await finalizeAndLockPayrollPeriod(ownerCtxB, 2026, 10);
    assert.equal(lockB.isLocked, true);

    // Verify Tenant B's loan is deducted (10000 -> 8000), while Tenant A's loan is untouched
    const loanBAfter = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanB.id } });
    assert.equal(Number(loanBAfter?.balanceAmount), 8000);
    assert.equal(Number(loanBAfter?.recoveredAmount), 2000);

    const loanAAfter = await prisma.studioAdvanceLoan.findUnique({ where: { id: loanA.id } });
    assert.equal(Number(loanAAfter?.balanceAmount), 3000, "Tenant A loan must not be affected by Tenant B finalization");
  });

  test("B: Payroll input validation rejects malformed, fractional month, and out-of-range values", async () => {
    async function testQuery(params: Record<string, string>) {
      const q = new URLSearchParams({ workspaceSlug: tenantA.slug, ...params });
      const req = new NextRequest(`http://localhost:3000/api/payroll/calculate?${q.toString()}`);
      const res = await calculateGet(req);
      const data = await res.json();
      return { status: res.status, data };
    }

    // 1. month = 0 -> 400
    const res0 = await testQuery({ month: "0" });
    assert.equal(res0.status, 400, "month=0 should return 400");
    assert.match(res0.data.error, /Month must be between 1 and 12/);

    // 2. month = 13 -> 400
    const res13 = await testQuery({ month: "13" });
    assert.equal(res13.status, 400, "month=13 should return 400");
    assert.match(res13.data.error, /Month must be between 1 and 12/);

    // 3. month = abc -> 400
    const resAbc = await testQuery({ month: "abc" });
    assert.equal(resAbc.status, 400, "month=abc should return 400");
    assert.match(resAbc.data.error, /Month must be an integer/);

    // 4. month = 2abc -> 400
    const res2abc = await testQuery({ month: "2abc" });
    assert.equal(res2abc.status, 400, "month=2abc should return 400");
    assert.match(res2abc.data.error, /Month must be an integer/);

    // 5. month = 1.5 -> 400 (fractional months are invalid)
    const res1point5 = await testQuery({ month: "1.5" });
    assert.equal(res1point5.status, 400, "month=1.5 should return 400");
    assert.match(res1point5.data.error, /Month must be an integer/);

    // 6. year = abc -> 400
    const resYearAbc = await testQuery({ year: "abc" });
    assert.equal(resYearAbc.status, 400, "year=abc should return 400");
    assert.match(resYearAbc.data.error, /Year must be a 4-digit integer/);

    // 7. year = 99 (not 4-digit syntax) -> 400
    const resYear99 = await testQuery({ year: "99" });
    assert.equal(resYear99.status, 400, "year=99 should return 400");
    assert.match(resYear99.data.error, /Year must be a 4-digit integer/);

    // 8. year = 2026.5 (fractional year) -> 400
    const resYearFractional = await testQuery({ year: "2026.5" });
    assert.equal(resYearFractional.status, 400, "year=2026.5 should return 400");
    assert.match(resYearFractional.data.error, /Year must be a 4-digit integer/);

    // 9. year = 1999 (valid 4-digit calendar year passes validation and reaches auth step -> 401)
    const resYear1999 = await testQuery({ year: "1999" });
    assert.equal(resYear1999.status, 401, "year=1999 passes schema validation and reaches auth");

    // 9. workingDays = 0 or 32 -> 400
    const resWd0 = await testQuery({ workingDays: "0" });
    assert.equal(resWd0.status, 400, "workingDays=0 should return 400");
    const resWd32 = await testQuery({ workingDays: "32" });
    assert.equal(resWd32.status, 400, "workingDays=32 should return 400");

    // 10. Valid fractional working days: workingDays = 21.5 passes query schema validation
    // (Notice: without session, reaches auth step and returns 401, NOT 400 validation error)
    const resWdFractional = await testQuery({ workingDays: "21.5" });
    assert.equal(resWdFractional.status, 401, "workingDays=21.5 must pass validation and reach auth");

    // 11. Engine level: calculateEmployeePayroll supports fractional working days accurately
    const calc = calculateEmployeePayroll(
      {
        employeeId: "TEST",
        baseSalary: 60000,
        rateCalculationMode: "WORKING_DAYS",
        approvedUnpaidLopDays: 0,
        totalApprovedLeaveDays: 0,
        paidLeaveDays: 0,
      },
      2026,
      10,
      21.5 // Fractional working days
    );
    assert.equal(calc.divisor, 21.5, "Engine must accurately use 21.5 as divisor");
    assert.equal(calc.grossSalary, 60000);
  });

  test("C: Backup authorization response maps ForbiddenException to 403 and Unauthorized to 401", async () => {
    // 1. Non-admin/owner context calling getBackupVerificationOverview throws ForbiddenException
    await assert.rejects(
      async () => {
        await getBackupVerificationOverview(employeeCtxA);
      },
      (err: any) => {
        return err instanceof ForbiddenException && err.name === "ForbiddenException";
      }
    );

    // 2. Calling GET /api/backup with unauthenticated session returns 401
    const unauthReq = new NextRequest(`http://localhost:3000/api/backup?workspaceSlug=${tenantA.slug}`);
    const unauthRes = await backupGet(unauthReq);
    assert.equal(unauthRes.status, 401, "Unauthenticated request should return 401");

    // 3. Calling GET /api/backup missing workspaceSlug returns 400
    const badReq = new NextRequest("http://localhost:3000/api/backup");
    const badRes = await backupGet(badReq);
    assert.equal(badRes.status, 400, "Missing workspaceSlug should return 400");
  });
});
