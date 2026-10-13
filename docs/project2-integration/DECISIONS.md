# Project 2 Integration — Architecture & Policy Decision Records (`DECISIONS.md`)

> **Document Status**: Approved Baseline Architecture  
> **Target System**: 100% DESIGN Studio OS (`miniEmployeeManagementSoftware`)  
> **Author**: Senior Software Architect, Security Engineer & QA Lead  
> **Last Updated**: October 2026  

---

## 1. Classification Framework

Every statement, model, and service in this integration belongs to one of five categories:
1. **Documented Fact**: Explicitly specified in Project 2 specification (`PROJECT.md` / `DESIGN.md` v2.5.0) or user integration prompt.
2. **Inspected Code**: Verified directly in Project 1 source code (`miniEmployeeManagementSoftware`).
3. **Implementation Choice**: Engineering architectural decision made to align target stack (Next.js 16, Prisma, MySQL) with functional specifications while preserving tenant isolation.
4. **Unresolved Policy Conflict**: Genuine business ambiguity identified between legacy documents and target enterprise rules; handled via versioned policy flags.
5. **Externally Unverified Integration**: External 3rd-party services (e.g. live Google Sheets OAuth API, live banking clearing networks, hardware biometric punch clocks) requiring runtime credentials or physical hardware.

---

## 2. Master Architectural Decision Records (ADRs)

### ADR-01: Single Unified Identity & Role Model
- **Category**: Documented Fact & Implementation Choice
- **Context**: Project 2 used a standalone Python FastAPI/PyJWT stack with `boss` (`BOSS-01`, `BOSS-02`) and `admin` roles, denying admins access to executive deliverables and payroll.
- **Decision**: Reject dual authentication systems or boss-switcher dropdowns. Project 1's existing `User`, `TenantMembership` (`OWNER`, `ADMIN`, `EMPLOYEE`), and `Session` database records are the sole source of identity.
- **Rule**: Within their tenant, **both `OWNER` and `ADMIN` have full functional access** to all Project 1 and imported Project 2 modules (leave review, executive tasks, payroll lifecycle, and vendor CRM).
- **Employee Boundary**: `EMPLOYEE` role retains existing Project 1 access and receives **ONLY**:
  1. Read-only view of their own leave requests, monthly paid/unpaid allocation, and balance (`/leave/my-leave`).
  2. Read-only view of the vendor directory with strict public-to-staff allowlisted fields (`/vendors/directory`).

---

### ADR-02: Isolated Executive Task Domain vs Employee Tasks
- **Category**: Inspected Code & Implementation Choice
- **Context**: Project 1 already features a comprehensive architectural task workflow (`Task`, `TaskAssignment`, `TaskSubmission`, `TaskChecklistItem`) for project delivery teams. Project 2 introduces partner-level executive tasks and deliverables (`ManagedTask`, `tm_tasks`).
- **Decision**: Maintain strict domain separation. Do not overload Project 1's employee task tables with executive partner deliverables.
- **Model**: Introduce `ExecutiveTask`, `ExecutiveTaskAssignment`, `ExecutiveTaskComment`, `ExecutiveTaskAttachment`, and `ExecutiveTaskActivity`.
- **Assignment Architecture**: A task assigned jointly to two leaders produces **one `ExecutiveTask` record and two `ExecutiveTaskAssignment` rows**. Global KPI metrics count the task once; individual leader workload dockets count it under each assignee.
- **Isolation Guarantee**: Executive task state transitions never alter leave balances or employee tasks.

---

### ADR-03: Leave Policy & Mathematical Calculation Engine
- **Category**: Documented Fact & Implementation Choice
- **Context**: Studio policy mandates 2.0 eligible paid leave days per calendar month, chronological allowance consumption, unpaid Loss of Pay (LOP) for excess days, cross-month proportional allocation, and minute-accurate partial leave.
- **Decision**: Centralize all leave math in a single TypeScript calculation engine (`src/server/modules/leave/policy.ts`) shared by list views, employee dossiers, employee self-service, calendar summaries, and payroll deductions.
- **Rules**:
  1. **Monthly Paid Allowance**: Default `2.0` days per calendar month, stored per tenant in `StudioLeavePolicy` / tenant settings.
  2. **Consumption Order**: Approved eligible requests consume allowance strictly ordered by `(start_date ASC, submitted_at ASC, id ASC)`.
  3. **Non-Consuming States**: `Pending`, `Rejected`, `Cancelled`, and soft-deleted requests do not consume paid allowance. Explicitly unpaid requests remain unpaid.
  4. **Proportional Cross-Month Allocation**:
     $$\text{Month Allocation} = \text{Total Requested Days} \times \frac{\text{Calendar Days in Month}}{\text{Total Calendar Days Spanned}}$$
     Preserve total requested days exactly; residual fractional minutes are rounded to the nearest integer minute on the terminal month to prevent float drift.
  5. **Working Minute Conversions**:
     - 480 working minutes = 1.0 day
     - 240 working minutes = 0.5 day (half-day)
     - 120 working minutes = 0.25 day
     - 60 working minutes = 0.125 day
  6. **Short Notice Conflict**: Configurable tenant policy option (`flag_short_notice` vs `reject_short_notice`). Flag requests submitted < 24h before leave start with automatic exemption for Sick/Medical and Emergency reasons.

---

### ADR-04: Multi-Mode Payroll & Immutable Financial Snapshots
- **Category**: Documented Fact & Implementation Choice
- **Context**: Payroll deductions consume approved unpaid leave days (LOP) using one of three studio daily-rate modes.
- **Calculation Modes**:
  1. **Fixed 30**: $\text{Daily Rate} = \frac{\text{Base Monthly Salary}}{30.0}$
  2. **Calendar Days**: $\text{Daily Rate} = \frac{\text{Base Monthly Salary}}{\text{Total Days in Month}}$
  3. **Working Days**: $\text{Daily Rate} = \frac{\text{Base Monthly Salary}}{\text{Configured Working Days (excluding Sundays/holidays)}}$ (zero-denominator rejected).
- **Formulas**:
  - $\text{LOP Deduction} = \text{Daily Rate} \times \text{Approved Unpaid Leave Days}$
  - $\text{Gross Salary} = \text{Base} + \text{Allowances} + \text{Bonus}$
  - $\text{Total Deductions} = \text{LOP} + \text{Statutory (PF/PT)} + \text{Advance Recovery} + \text{Loan Recovery} + \text{Custom Deductions}$
  - $\text{Net Payable} = \max(0.0, \text{Gross} - \text{Total Deductions})$
  - Any excess deduction liability exceeding Gross is retained as a separate uncollected liability record; never erased.
- **Lifecycle**: `Draft/Open` $\rightarrow$ `Submitted` $\rightarrow$ `Approved` $\rightarrow$ `Finalized/Locked`.
- **Financial Immutability**: Once `Finalized/Locked`, records are strictly immutable. Post-lock leave adjustments generate distinct reviewable adjustment vouchers in subsequent periods.

---

### ADR-05: Strict Database-Level Multi-Tenant Scoping
- **Category**: Inspected Code & Implementation Choice
- **Context**: Project 1 is a multi-tenant platform where every data query and mutation must respect tenant boundaries.
- **Decision**: Every imported entity (`StudioLeaveRequest`, `StudioAttendanceRecord`, `StudioPayrollRecord`, `ExecutiveTask`, `StudioMeeting`, `StudioVendor`, `StudioEmailOutbox`) includes a mandatory `@relation` to `Tenant` with `tenantId String`.
- **Constraints**:
  - Every composite unique constraint includes `tenantId`.
  - Composite indexes `[tenantId, status]`, `[tenantId, employeeId]`, `[tenantId, createdAt]` are enforced.
  - Foreign keys between entities (e.g., employee to leave, task to project) are verified server-side to guarantee both entities belong to the same `tenantId`.

---

### ADR-06: Strict Allowlisted Employee Vendor Serialization
- **Category**: Documented Fact & Security Invariant
- **Context**: Employees must have read access to studio vendors for architectural procurement, but private business terms must never leak.
- **Decision**: Restrict employee directory queries at the database query level (`select: { id: true, name: true, companyName: true, designation: true, industryType: true, phoneNumber: true, email: true, websiteUrl: true, status: true }`).
- **Enforcement**: Private fields (`notes`, `purposeOfVisit`, `visitHistoryJson`, `rating`, `pricing`, `followupDate`, internal project links) are excluded from SQL queries, response DTOs, HTML hydration payloads, and search suggestions.

---

### ADR-07: Resilient Transactional Email Outbox & Job Retries
- **Category**: Documented Fact & Implementation Choice
- **Context**: Leave approvals and executive task assignments dispatch email alerts via Gmail SMTP SSL (port 465).
- **Decision**: Decouple email dispatch from domain mutations using a durable outbox table `StudioEmailOutbox`.
- **Rule**: Domain transactions commit first; email records are enqueued inside the same transaction. If SMTP transmission fails, the business record remains committed.
- **Retry Formula**: Quadratic delay with 1-hour cap:
  $$\text{Delay Seconds} = \min(3600, \text{attempts}^2 \times 60)$$
- **Audit States**: `Pending`, `Processing`, `Sent`, `Failed`, and `Simulated`. Delivery simulation is explicitly labeled and never recorded as `Sent`.

---

### ADR-08: Design System Integrity & Visual System
- **Category**: Inspected Code & Precedence Rule
- **Context**: Project 2 used Plus Jakarta Sans and an Iris/Lavender palette (`#5B6AEA`, `#1E1F35`). Project 1 uses Inter typography and the Studio Blueprint palette (`#F8F9FD`, `#0B122B`, `#5A81FA`, `#E2E6F0`).
- **Decision**: Retain Project 1's established Studio Blueprint design tokens, Inter typography, compact table headers, and layout shell. Adapt Project 2's information hierarchy, stacked timestamp cells, and metric card structures without introducing conflicting global styles.
