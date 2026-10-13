import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDailyRate,
  calculateEmployeePayroll,
} from "../../src/server/modules/payroll/engine";

describe("Payroll Calculation Engine Tests (Tests 13–15)", () => {
  // Test 13: With INR 30,000 base, fixed-30 mode, 5 approved eligible leave days (2 paid, 3 unpaid):
  // rate INR 1,000, LOP INR 3,000, net INR 27,000.
  test("TEST-PAY-13: Fixed-30 mode with 3 unpaid LOP days", () => {
    const result = calculateEmployeePayroll(
      {
        employeeId: "EMP-01",
        baseSalary: 30000,
        rateCalculationMode: "FIXED_30",
        approvedUnpaidLopDays: 3.0,
        totalApprovedLeaveDays: 5.0,
        paidLeaveDays: 2.0,
      },
      2026,
      10 // October 2026
    );

    assert.equal(result.dailyRate, 1000.0);
    assert.equal(result.lopDeductionAmount, 3000.0);
    assert.equal(result.grossSalary, 30000.0);
    assert.equal(result.totalDeductions, 3000.0);
    assert.equal(result.netPayable, 27000.0);
    assert.equal(result.excessDeductionLiability, 0.0);
  });

  // Test 14: Calendar mode handles leap years (Feb 2024 = 29 days, Feb 2025 = 28 days), working days rejects 0
  test("TEST-PAY-14: Calendar mode leap year math & working days denominator validation", () => {
    // Feb 2024: 29 days
    const rateLeapYear = calculateDailyRate(29000, "CALENDAR_DAYS", 2024, 2);
    assert.equal(rateLeapYear, 1000.0);

    // Feb 2025: 28 days
    const rateNonLeap = calculateDailyRate(28000, "CALENDAR_DAYS", 2025, 2);
    assert.equal(rateNonLeap, 1000.0);

    // Working days mode
    const rateWorking = calculateDailyRate(26000, "WORKING_DAYS", 2026, 10, 26);
    assert.equal(rateWorking, 1000.0);

    // Rejects zero-denominator
    assert.throws(() => {
      calculateDailyRate(30000, "WORKING_DAYS", 2026, 10, 0);
    }, /Working days denominator cannot be zero or negative/);
  });

  // Test: Excess deduction liability when deductions exceed gross
  test("TEST-PAY-EXTRA: Clamping net payable to zero preserves excess deduction liability", () => {
    const result = calculateEmployeePayroll(
      {
        employeeId: "EMP-01",
        baseSalary: 10000,
        rateCalculationMode: "FIXED_30",
        approvedUnpaidLopDays: 0,
        totalApprovedLeaveDays: 0,
        paidLeaveDays: 0,
        advanceRecovery: 12000, // Exceeds base salary!
      },
      2026,
      10
    );

    assert.equal(result.grossSalary, 10000.0);
    assert.equal(result.totalDeductions, 12000.0);
    assert.equal(result.netPayable, 0.0);
    assert.equal(result.excessDeductionLiability, 2000.0);
  });
});
