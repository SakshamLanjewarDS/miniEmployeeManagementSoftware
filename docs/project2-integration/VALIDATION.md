# Project 2 Integration — Master Validation & Acceptance Plan (`VALIDATION.md`)

> **Verification Standard**: Section 14 Concrete Acceptance Cases (Tests 1 through 23)  
> **Environment**: Isolated Multi-Tenant Test Fixtures (`Tenant A`, `Tenant B`, `Owner`, `Admin`, `Employee A`, `Employee B`, `Revoked User`)  
> **Rule**: Never mutate production financial records; record actual commands and outcomes truthfully.

---

## 1. Concrete Acceptance Test Specification

### Pillar A: Access Control & Tenant Boundaries (Tests 1–6)
| Test ID | Objective | Test Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-ACC-01** | Owner and Admin Parity | Log in as Owner, perform leave approval, executive task edit, payroll review. Repeat independently as Admin. | Both roles succeed with 200 OK across all operations. Admin can edit tasks assigned to Owner. | Planned |
| **TEST-ACC-02** | Employee Mutation & Restricted Route Denial | Log in as Employee A, request POST/PUT/DELETE on `/api/leave/*`, `/api/payroll/*`, `/api/tm/*`, `/api/vendors/*`. | Direct denial with 403 Forbidden on all mutation endpoints and administrative views. | Planned |
| **TEST-ACC-03** | Cross-Employee & Cross-Tenant IDOR Protection | Employee A attempts to fetch Employee B's leave or Tenant B's leave/dossier by manipulating IDs and URL params. | Fails closed with 403 Forbidden or 404 Not Found. Zero data leakage, zero metadata leakage. | Planned |
| **TEST-ACC-04** | Revoked, Inactive & Wrong-Tenant Sessions | Session token belongs to inactive/revoked user, or tenant slug does not match membership. | Fails closed with 401 Unauthorized or 403 Forbidden across APIs, pages, and SSE streams. | Planned |
| **TEST-ACC-05** | Employee Vendor Directory Private Field Sanitization | Employee A fetches `/api/vendors/directory`. Inspect raw JSON response, HTML hydration, and cache. | Only allowlisted fields present (`id`, `name`, `company`, `designation`, `industry`, `phone`, `email`, `website`, `status`). Zero private notes, ratings, or visits. | Planned |
| **TEST-ACC-06** | Preserved Project 1 Employee Workflows | Employee A accesses existing Project 1 task checklist, submission, and drawing approvals. | Unaffected: existing task assignment $\rightarrow$ work $\rightarrow$ submission $\rightarrow$ review workflow operates normally. | Planned |

---

### Pillar B: Leave Engine & Mathematical Precision (Tests 7–12)
| Test ID | Objective | Test Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-LEAVE-07** | 5 Approved Days in One Month | Submit 5 approved eligible days in October. Calculate paid vs unpaid days. Check pending/rejected impact. | Exactly 2.0 Paid Days, 3.0 Unpaid LOP Days. Pending, Rejected, Cancelled requests consume 0.0 allowance. | Planned |
| **TEST-LEAVE-08** | Explicit Unpaid Day + 2 Approved Eligible Days | Submit 1 explicitly unpaid day (`is_paid = false`) followed by 2 approved eligible days in the same month. | 1.0 Unpaid Day, 2.0 Paid Days. Total allowance consumed = 2.0 days; remaining balance = 0.0 days. | Planned |
| **TEST-LEAVE-09** | Partial & Hourly Leave Quantities | Submit 60 minutes, 120 minutes, and 240 minutes (half day) leave requests. | 60 mins = 0.125 days, 120 mins = 0.25 days, 240 mins = 0.5 days. Display and payroll preserve quantities without rounding error. | Planned |
| **TEST-LEAVE-10** | Cross-Month Proportional Allocation | Submit leave from Sep 29 to Oct 2 (4 calendar days, 4 requested days). | September: exactly 2.0 days. October: exactly 2.0 days. Sum of month allocations equals requested total (4.0). | Planned |
| **TEST-LEAVE-11** | Deterministic Chronological Tie-Breaking | Ingest requests out of order with identical start dates. Recalculate allowance. | Deterministic consumption order: `(start_date ASC, submitted_at ASC, id ASC)`. Stable results across re-runs. | Planned |
| **TEST-LEAVE-12** | Short Notice Notice & Exemption | Submit request at 23h59m before start vs 24h01m before start. Test Sick/Emergency exemptions. | < 24h triggers short-notice flag. Sick/Emergency reasons are exempted. Historical records are never retroactively rejected. | Planned |

---

### Pillar C: Payroll & Financial Calculations (Tests 13–16)
| Test ID | Objective | Test Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-PAY-13** | Fixed-30 Rate & LOP Deduction | Base salary ₹30,000, Fixed-30 mode, 5 approved eligible leave days (2 paid, 3 unpaid LOP). | Per-day rate: ₹1,000.00. LOP deduction: ₹3,000.00. Net payable: ₹27,000.00. | Planned |
| **TEST-PAY-14** | Calendar Days (Leap Year) & Working Days Modes | Test February 2024 (29 days) and February 2025 (28 days). Test working days excluding configured holidays/Sundays. | Accurate daily rates. Working days denominator rejects 0 days. Zero double-exclusion of holidays falling on Sundays. | Planned |
| **TEST-PAY-15** | Missing Compensation & Idempotent Loan Recovery | Preview payroll for employee with missing salary. Run preview twice for employee with ₹5,000 advance loan. | Missing salary displays blocking warning (never ₹25,000 fallback). Loan recovered once upon finalization, not on preview. | Planned |
| **TEST-PAY-16** | Locked Payroll Immutability & Safe Export | Lock payroll period. Attempt modification via leave sync or edit endpoints. Export bank payout CSV. | Locked records reject mutation with 400/409 error. Exporting CSV never marks payment status as `Paid`. | Planned |

---

### Pillar D: Integrations, Tasks & Resilience (Tests 17–23)
| Test ID | Objective | Test Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-INT-17** | CSV Ingestion & Idempotent Re-Import | Upload same CSV batch twice. Check duplicate handling, ambiguous dates, leading-zero bank accounts. | Zero duplicate records. Ambiguous dates flagged for manual review. String account numbers preserve leading zeros (`0012...`). | Planned |
| **TEST-INT-18** | Bidirectional Sync Conflict Resolution | Simulate concurrent edit in sheet and app. Test tombstone deletions and locked payroll isolation. | Application-owned review decisions take precedence. Deletions do not resurrect. Locked payroll periods never mutate. | Planned |
| **TEST-INT-19** | Joint Executive Assignment & Action Item Conversion | Assign executive deliverable to both Owner and Admin. Convert meeting action item to task repeatedly. | Creates 1 task + 2 assignment rows. Global KPI counts task once. Action item conversion is idempotent (returns existing task). | Planned |
| **TEST-INT-20** | Domain Isolation & Confidentiality | Create executive task and meeting with confidential minutes. Inspect leave balances and employee task lists. | Zero impact on leave balance. Confidential meeting minutes never leak to employee task dockets. | Planned |
| **TEST-INT-21** | Transactional Outbox & SMTP Retry Resilience | Mock SMTP outage during leave approval. Verify database commit and outbox retry schedule. | Leave approval commits successfully. Outbox entry enqueued with quadratic backoff delay. Simulated emails explicitly flagged. | Planned |
| **TEST-INT-22** | Sheets Connector Outage & Worker Lease | Simulate connector network failure during scheduled sync. Simulate multi-instance execution. | Stale data preserved with visible error banner. Distributed lease prevents concurrent duplicate sync runs. | Planned |
| **TEST-INT-23** | Security Hardening & Input Sanitization | Test formula injection in CSV exports (`=cmd`), path traversal in attachments (`../../`), and oversize files. | Formula characters sanitized with leading quote. Non-whitelisted file types rejected. Safe server filenames generated outside webroot. | Planned |

---
