import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMonthlyLeaveSummary,
  minutesToDays,
  daysToMinutes,
  evaluateShortNotice,
  DEFAULT_MONTHLY_PAID_ALLOWANCE,
} from "../../src/server/modules/leave/policy";

describe("Phase 1: Leave Improvements & Policy Engine Contract Tests", () => {
  test("TEST-IMPR-LEAVE-01: 60 minutes equals 0.125 day under the eight-hour schedule", () => {
    const days = minutesToDays(60);
    assert.strictEqual(days, 0.125);

    const backToMinutes = daysToMinutes(0.125);
    assert.strictEqual(backToMinutes, 60);

    // 480 minutes equals 1 full day
    assert.strictEqual(minutesToDays(480), 1.0);
    // 240 minutes equals 0.5 half day
    assert.strictEqual(minutesToDays(240), 0.5);
  });

  test("TEST-IMPR-LEAVE-02: Notice policy measures from local session start and rejects <24h ordinary leave", () => {
    // Current time: 2026-10-10 at 12:00
    const now = new Date("2026-10-10T12:00:00+05:30");

    // Leave start tomorrow at 10:30 (full day session start).
    // Notice between Oct 10 12:00 and Oct 11 10:30 is 22.5 hours (< 24 hours)
    const tomorrow = new Date("2026-10-11T00:00:00+05:30");
    const resultOrdinary = evaluateShortNotice(
      now,
      tomorrow,
      630, // 10:30 AM in minutes
      "CASUAL",
      "Going out",
      false, // not exempt
      false, // not hourly
      "FULL_DAY"
    );

    assert.strictEqual(resultOrdinary.isShortNotice, true);
    assert.strictEqual(resultOrdinary.shouldAutoReject, true);
    assert.ok(resultOrdinary.rejectionReason?.includes("24 hours"));

    // Afternoon half day starting at 14:30.
    // Notice between Oct 10 12:00 and Oct 11 14:30 is 26.5 hours (>= 24 hours) -> Not short notice
    const resultAfternoon = evaluateShortNotice(
      now,
      tomorrow,
      870, // 14:30 PM in minutes
      "CASUAL",
      "Family function",
      false,
      false,
      "SECOND_HALF"
    );

    assert.strictEqual(resultAfternoon.isShortNotice, false);
    assert.strictEqual(resultAfternoon.shouldAutoReject, false);
  });

  test("TEST-IMPR-LEAVE-03: Sick, Emergency, and Hourly bypass automatic short-notice rejection", () => {
    // Current time: 2 hours before leave start
    const now = new Date("2026-10-10T08:30:00+05:30");
    const today = new Date("2026-10-10T00:00:00+05:30");

    // Case A: Sick leave
    const resultSick = evaluateShortNotice(
      now,
      today,
      630, // 10:30 AM
      "SICK",
      "Sudden high fever",
      false,
      false,
      "FULL_DAY"
    );
    assert.strictEqual(resultSick.isShortNotice, true);
    assert.strictEqual(resultSick.isExempt, true);
    assert.strictEqual(resultSick.shouldAutoReject, false);

    // Case B: Explicit emergency exemption checked
    const resultEmergency = evaluateShortNotice(
      now,
      today,
      630,
      "CASUAL",
      "Plumbing burst at residence",
      true, // exempt flag
      false,
      "FULL_DAY"
    );
    assert.strictEqual(resultEmergency.isShortNotice, true);
    assert.strictEqual(resultEmergency.isExempt, true);
    assert.strictEqual(resultEmergency.shouldAutoReject, false);

    // Case C: Hourly permission (e.g. 1 hour doctor visit)
    const resultHourly = evaluateShortNotice(
      now,
      today,
      630,
      "CASUAL",
      "Dental visit",
      false,
      true, // hourly flag
      "FULL_DAY"
    );
    assert.strictEqual(resultHourly.isShortNotice, true);
    assert.strictEqual(resultHourly.isExempt, true);
    assert.strictEqual(resultHourly.shouldAutoReject, false);
  });

  test("TEST-IMPR-LEAVE-04: Five approved eligible days produce exactly 2 paid + 3 unpaid days", () => {
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
    ];

    const summary = calculateMonthlyLeaveSummary(2026, 10, requests, DEFAULT_MONTHLY_PAID_ALLOWANCE);
    assert.strictEqual(summary.monthlyPaidAllowance, 2.0);
    assert.strictEqual(summary.paidLeaveDays, 2.0);
    assert.strictEqual(summary.unpaidLopDays, 3.0);
    assert.strictEqual(summary.remainingPaidAllowance, 0.0);

    const firstReq = summary.requests[0];
    assert.strictEqual(firstReq.isPaidInMonth, 2.0);
    assert.strictEqual(firstReq.isUnpaidInMonth, 3.0);
  });

  test("TEST-IMPR-LEAVE-05: Pending and rejected requests do not consume monthly paid allowance", () => {
    const requests = [
      {
        id: "req-pending",
        employeeId: "EMP-01",
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        days: 2.0,
        status: "PENDING" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T10:00:00Z",
      },
      {
        id: "req-rejected",
        employeeId: "EMP-01",
        startDate: "2026-10-08",
        endDate: "2026-10-08",
        days: 1.0,
        status: "REJECTED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-02T10:00:00Z",
      },
      {
        id: "req-approved",
        employeeId: "EMP-01",
        startDate: "2026-10-15",
        endDate: "2026-10-15",
        days: 1.0,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-03T10:00:00Z",
      },
    ];

    const summary = calculateMonthlyLeaveSummary(2026, 10, requests, DEFAULT_MONTHLY_PAID_ALLOWANCE);
    assert.strictEqual(summary.paidLeaveDays, 1.0);
    assert.strictEqual(summary.unpaidLopDays, 0.0);
    assert.strictEqual(summary.remainingPaidAllowance, 1.0);
  });

  test("TEST-IMPR-LEAVE-06: Cancelled leave releases allowance back to pool", () => {
    const requestsBeforeCancel = [
      {
        id: "req-1",
        employeeId: "EMP-01",
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        days: 2.0,
        status: "APPROVED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T10:00:00Z",
      },
    ];

    const summaryBefore = calculateMonthlyLeaveSummary(2026, 10, requestsBeforeCancel, DEFAULT_MONTHLY_PAID_ALLOWANCE);
    assert.strictEqual(summaryBefore.paidLeaveDays, 2.0);
    assert.strictEqual(summaryBefore.remainingPaidAllowance, 0.0);

    // After cancellation approval: status changes to CANCELLED
    const requestsAfterCancel = [
      {
        id: "req-1",
        employeeId: "EMP-01",
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        days: 2.0,
        status: "CANCELLED" as const,
        leaveType: "CASUAL",
        isPaidEligible: true,
        submittedAt: "2026-10-01T10:00:00Z",
      },
    ];

    const summaryAfter = calculateMonthlyLeaveSummary(2026, 10, requestsAfterCancel, DEFAULT_MONTHLY_PAID_ALLOWANCE);
    assert.strictEqual(summaryAfter.paidLeaveDays, 0.0);
    assert.strictEqual(summaryAfter.remainingPaidAllowance, 2.0);
  });
});
