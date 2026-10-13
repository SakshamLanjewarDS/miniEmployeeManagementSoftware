import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMonthlyLeaveSummary,
  allocateDaysAcrossMonths,
  minutesToDays,
  daysToMinutes,
  evaluateShortNotice,
  DEFAULT_MONTHLY_PAID_ALLOWANCE,
} from "../../src/server/modules/leave/policy";

describe("Leave Policy Engine & Mathematical Precision (Tests 7–12)", () => {
  // Test 7: 5 approved eligible days in one month produce 2 paid and 3 unpaid days;
  // Pending, Rejected, Cancelled requests do not consume allowance.
  test("TEST-LEAVE-07: 5 approved eligible days produce exactly 2 paid and 3 unpaid LOP days", () => {
    const requests = [
      {
        id: "req-1",
        employeeId: "EMP-01",
        startDate: "2026-10-05",
        endDate: "2026-10-09",
        days: 5.0,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T10:00:00Z",
      },
      {
        id: "req-2",
        employeeId: "EMP-01",
        startDate: "2026-10-12",
        endDate: "2026-10-12",
        days: 1.0,
        status: "PENDING" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-02T10:00:00Z",
      },
      {
        id: "req-3",
        employeeId: "EMP-01",
        startDate: "2026-10-15",
        endDate: "2026-10-15",
        days: 1.0,
        status: "REJECTED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-03T10:00:00Z",
      },
      {
        id: "req-4",
        employeeId: "EMP-01",
        startDate: "2026-10-20",
        endDate: "2026-10-20",
        days: 1.0,
        status: "CANCELLED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-04T10:00:00Z",
      },
    ];

    const summary = calculateMonthlyLeaveSummary(2026, 10, requests, DEFAULT_MONTHLY_PAID_ALLOWANCE);

    assert.equal(summary.totalApprovedDays, 5.0);
    assert.equal(summary.paidLeaveDays, 2.0);
    assert.equal(summary.unpaidLopDays, 3.0);
    assert.equal(summary.remainingPaidAllowance, 0.0);
    assert.equal(summary.pendingRequestsCount, 1);
    assert.equal(summary.pendingDays, 1.0);
    // Total requests intersecting October: 4
    assert.equal(summary.totalRequests, 4);
  });

  // Test 8: One explicit unpaid day plus two approved eligible days produces 1 unpaid and 2 paid days
  test("TEST-LEAVE-08: Explicit unpaid day does not consume paid allowance", () => {
    const requests = [
      {
        id: "req-unpaid",
        employeeId: "EMP-01",
        startDate: "2026-10-02",
        endDate: "2026-10-02",
        days: 1.0,
        status: "APPROVED" as const,
        leaveType: "LOSS_OF_PAY",
        isPaidEligible: false,
        submittedAt: "2026-10-01T08:00:00Z",
      },
      {
        id: "req-paid",
        employeeId: "EMP-01",
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        days: 2.0,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T09:00:00Z",
      },
    ];

    const summary = calculateMonthlyLeaveSummary(2026, 10, requests, DEFAULT_MONTHLY_PAID_ALLOWANCE);

    assert.equal(summary.totalApprovedDays, 3.0);
    assert.equal(summary.paidLeaveDays, 2.0);
    assert.equal(summary.unpaidLopDays, 1.0);
    assert.equal(summary.remainingPaidAllowance, 0.0);
  });

  // Test 9: 60 minutes = 0.125 days; 120 = 0.25; half day = 0.5. Display and payroll preserve quantities.
  test("TEST-LEAVE-09: Minute accurate conversions (60m=0.125d, 120m=0.25d, 240m=0.5d)", () => {
    assert.equal(minutesToDays(60), 0.125);
    assert.equal(minutesToDays(120), 0.25);
    assert.equal(minutesToDays(240), 0.5);
    assert.equal(minutesToDays(480), 1.0);

    assert.equal(daysToMinutes(0.125), 60);
    assert.equal(daysToMinutes(0.25), 120);
    assert.equal(daysToMinutes(0.5), 240);
    assert.equal(daysToMinutes(1.0), 480);
  });

  // Test 10: Sep 29–Oct 2 with 4 requested days allocates 2 days to each month in source proportional mode;
  // Month allocations sum exactly to requested total.
  test("TEST-LEAVE-10: Sep 29–Oct 2 cross-month allocation splits 2 days each and preserves total", () => {
    const allocations = allocateDaysAcrossMonths("2026-09-29", "2026-10-02", 4.0);

    assert.equal(allocations.length, 2);
    const sep = allocations.find((a) => a.monthKey === "2026-09");
    const oct = allocations.find((a) => a.monthKey === "2026-10");

    assert.ok(sep);
    assert.ok(oct);
    assert.equal(sep.allocatedDays, 2.0);
    assert.equal(oct.allocatedDays, 2.0);
    assert.equal(sep.allocatedDays + oct.allocatedDays, 4.0);
  });

  // Test 11: Chronological allocation remains deterministic under tied dates, out-of-order imports, and cancellations
  test("TEST-LEAVE-11: Chronological consumption order is strictly deterministic", () => {
    // 3 requests on same day: req-B submitted earlier should consume first
    const requests = [
      {
        id: "req-A",
        employeeId: "EMP-01",
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        days: 1.5,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-02T12:00:00Z",
      },
      {
        id: "req-B",
        employeeId: "EMP-01",
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        days: 1.0,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T12:00:00Z", // Earlier submission!
      },
    ];

    const summary = calculateMonthlyLeaveSummary(2026, 10, requests, 2.0);

    // req-B (1.0 day) should be 100% paid
    // req-A (1.5 days) should get remaining 1.0 paid and 0.5 unpaid LOP
    const reqBResult = summary.requests.find((r) => r.id === "req-B");
    const reqAResult = summary.requests.find((r) => r.id === "req-A");

    assert.equal(reqBResult?.isPaidInMonth, 1.0);
    assert.equal(reqBResult?.isUnpaidInMonth, 0.0);

    assert.equal(reqAResult?.isPaidInMonth, 1.0);
    assert.equal(reqAResult?.isUnpaidInMonth, 0.5);

    assert.equal(summary.paidLeaveDays, 2.0);
    assert.equal(summary.unpaidLopDays, 0.5);
  });

  // Test 12: Short-notice evaluation: 24h threshold, Sick/Emergency exemption
  test("TEST-LEAVE-12: Short notice threshold (<24h) and medical/emergency exemptions", () => {
    // Leave starts 2026-10-10 at 10:30 AM
    // Submitted 2026-10-09 at 11:00 AM -> 23.5 hours before start -> short notice
    const res1 = evaluateShortNotice(
      "2026-10-09T11:00:00Z",
      "2026-10-10",
      630, // 10:30 AM
      "CASUAL",
      "Family function"
    );
    assert.equal(res1.isShortNotice, true);
    assert.equal(res1.isExempt, false);

    // Submitted 2026-10-09 at 11:00 AM with Sick reason -> short notice but EXEMPT
    const res2 = evaluateShortNotice(
      "2026-10-09T11:00:00Z",
      "2026-10-10",
      630,
      "SICK",
      "Severe fever"
    );
    assert.equal(res2.isShortNotice, true);
    assert.equal(res2.isExempt, true);

    // Submitted 2026-10-08 at 09:00 AM -> > 24 hours -> not short notice
    const res3 = evaluateShortNotice(
      "2026-10-08T09:00:00Z",
      "2026-10-10",
      630,
      "CASUAL",
      "Planned travel"
    );
    assert.equal(res3.isShortNotice, false);
  });
});
