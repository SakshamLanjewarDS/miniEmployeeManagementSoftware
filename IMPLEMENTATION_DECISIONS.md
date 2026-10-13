# 100% DESIGN Studio OS — Architecture & Implementation Decisions

**Document Version:** 1.0.0  
**Date:** 2026-10-09  

---

## 1. Foundation Decisions

### D-F1: Automated Test Isolation Pattern
- **Decision:** All test suites run through a test harness `tests/helpers/test-db.ts` that:
  1. Inspects the effective database connection.
  2. Rejects operational/production database targets by inspecting the hostname and database name.
  3. Supports `TEST_DATABASE_URL` as the primary connection if specified, or ensures `ALLOW_TEST_MUTATIONS=true` is set on localhost databases.
  4. Automatically cleans up test-generated records using explicit unique test prefixes (`TEST-` or timestamped slugs) so that tests leave no dirty residual state in shared environments.
- **Rationale:** Prevents regression test suites from contaminating live or demonstration studio data, guaranteeing test repeatability and data hygiene.

### D-F2: Concurrency & Race-Condition Protection
- **Decision:** Replace read-then-write checks with atomic conditional updates inside database transactions:
  - **Site Check-In:** Validate active visits inside `prisma.$transaction`, and conditionally update `operationalState` where `id = visitId AND operationalState != 'ACTIVE'`.
  - **Task Submission Review:** Conditional update `taskSubmission.updateMany({ where: { id: submissionId, status: 'PENDING' } })`. Only the transaction observing `count === 1` proceeds with side-effects (marking checklist items completed, notifying submitter). Competing requests throw a concurrency conflict.
  - **Deadline Extensions:** Conditional update `taskExtensionRequest.updateMany({ where: { id: requestId, status: 'PENDING' } })` AND check that checklist item `dueDate` matches `currentDueDate` at execution time.
  - **Project Resume:** Conditional update `project.updateMany({ where: { id: projectId, status: 'ON_HOLD' } })` to ensure date adjustments cannot be applied multiple times.
- **Rationale:** Ensures strict four-eyes and transactional consistency under high-frequency or simultaneous network submissions without relying on client-side sequencing.

### D-F3: Environment & Seed Safety Gates
- **Decision:**
  - `scripts/seed.ts` requires explicit `ALLOW_DEVELOPMENT_SEED=true` environment variable and fails immediately if `NODE_ENV === 'production'`.
  - Production initialization is separated into `scripts/init-production.ts`, which sets up essential SaaS plans and tenant metadata without destroying existing tables or seeding known demo credentials.
- **Rationale:** Guarantees that accidental execution of seeding scripts in deployed environments cannot overwrite legitimate client projects or inject demo credentials.

### D-F4: Project Archival & Completion Model
- **Decision:**
  - `ProjectStatus` lifecycle enum remains canonical: `[DRAFT, PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED]`.
  - `isArchived` is a boolean visibility filter used to exclude completed or cancelled projects from daily operational lists.
  - Reopening a project preserves all prior milestone achievements, checklist completion timestamps, and audit history.
- **Rationale:** Prevents destructive state changes while providing clean search/filtering across historical and active projects.

---

## 2. 20-Module System Architecture Decisions

### D-M1: Owner Decision Inbox
- Aggregates actionable pending items directly from domain records (`TaskSubmission`, `TaskExtensionRequest`, `ProjectChangeRequest`, `ProfileChangeRequest`, `SiteVisit`, `ApprovalRequest`).
- Avoids a duplicate shadow approval table; domain records remain the single source of truth.

### D-M2: Employee Daily Workspace
- Prioritizes work using algorithmic urgency: Blocking items $\to$ Changes Requested $\to$ Urgent/Overdue Tasks $\to$ Ready Dependency Tasks $\to$ Scheduled Site Visits.
- Respects project-level hold flags to prevent starting work on paused projects.

### D-M3: Review Management
- Enforces strict Four-Eyes principle (submitter $\neq$ reviewer).
- Records immutable review snapshot with acceptance criteria snapshot and diff feedback.

### D-M4: Notifications & Reminders
- Extends durable `Notification` and `NotificationOutbox` models.
- Handles user quiet hours, digest aggregation, and deduplication keys to prevent spam.

### D-M5 to D-M20: Module Architecture Contracts
- Preserves the Studio Blueprint design tokens (`#3562E8` primary accent, `#505869` accessible text, fine borders, Inter typography).
- Reuses existing shared services and avoids code duplication across routes.
