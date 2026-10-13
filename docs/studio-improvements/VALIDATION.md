# 100% DESIGN Studio Improvements — Validation & Acceptance Test Plan (`VALIDATION.md`)

> **Programme**: Complete Studio OS Improvements  
> **Target System**: 100% DESIGN Studio OS  

---

## 1. Acceptance Test Matrix

| Test ID | Capability | Description & Assertions | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TEST-IMPR-LEAVE-01** | Session-Derived Identity | Employee submits leave without providing arbitrary `employeeId` | Uses authenticated session identity; ignores any forged payload IDs |
| **TEST-IMPR-LEAVE-02** | Pending Edit & Withdrawal | Employee edits or withdraws own pending leave request | Version increments, edits preserved; withdrawal marks WITHDRAWN without deleting |
| **TEST-IMPR-LEAVE-03** | 24-Hour Notice Policy | Request submitted $<24$h before local start time without exemption | Auto-rejected immediately with system rejection reason; Sick/Emergency/Hourly accepted as Pending |
| **TEST-IMPR-LEAVE-04** | Leave Cancellation Workflow | Employee requests cancellation of approved leave | Pending cancellation preserves approved allocation; approved cancellation releases quota once |
| **TEST-IMPR-INBOX-01** | Unified Decision Inbox | Owner/Admin queries unified decision inbox | Aggregates pending leave applications, cancellations, task reviews, extensions, drawings, scope changes |
| **TEST-IMPR-PLAN-01** | Leave-Aware Planning | Task assigned overlapping approved leave | Availability collision warning returned; task created without auto-shifting deadlines |
| **TEST-IMPR-DASH-01** | Daily Employee Dashboard | Employee queries "My Work Today" | Actionable vs waiting separated; only assigned tasks and own leave returned |
| **TEST-IMPR-REMIND-01** | Reminders & Quiet Hours | Reminder worker evaluates deadlines | Deduplicates occurrences; respects quiet hours and tenant timezone |
| **TEST-IMPR-DRAW-01** | Drawing Revision Control | New draft uploaded on drawing | Site queries return latest approved revision; draft marked pending review |
| **TEST-IMPR-SITE-01** | Site Issue Tracking | Defect reported on site | Lifecycle progresses Open $\rightarrow$ Ready $\rightarrow$ Closed; closure requires authorized verifier |
| **TEST-IMPR-CAP-01** | Capacity Planning Math | Employee with 2 days approved leave in a 5-day week | Capacity computed as $(5 \times 8) - (2 \times 8) = 24$ hours available |
| **TEST-IMPR-TEMP-01** | Template Cycle Validation | Template with circular dependency ($A \rightarrow B \rightarrow A$) | Rejected with circular dependency validation error; valid template applies snapshot |
| **TEST-IMPR-SCOPE-01** | Scope-Change Approval | Leadership approves scope change request | Budget and schedule updated; linked deliverables created transactionally |
| **TEST-IMPR-INT-01** | Integration Health | Integration health dashboard queried | Displays status, last attempt/success, fresh/stale indicator, sanitized error logs |
| **TEST-IMPR-AUTH-01** | Offboarding & Last Owner | Attempt to deactivate sole active owner | Prevented with last active owner exception; standard employee deactivation revokes sessions |
| **TEST-IMPR-BACK-01** | Backup Log & Restore | Backup record logged and restore tested | Backup status tracked; restore verification logged in isolated test environment |

---

## 2. Baseline Test Verification
Before implementing new changes, existing tests must pass:
```bash
node --import tsx --test tests/modules/leave-policy-engine.test.ts tests/modules/payroll-engine.test.ts tests/modules/project2-integration.test.ts
```
**Baseline Result**: 17 / 17 tests passed (100% pass rate).
