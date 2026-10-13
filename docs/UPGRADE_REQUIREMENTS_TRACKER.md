# 100% DESIGN Studio OS — Master Upgrade Requirements Tracker

**Platform Version:** 3.4.0  
**Repository:** `miniEmployeeManagementSoftware`  
**Architectural Baseline:** Next.js App Router, React 19, TypeScript, Prisma ORM, MySQL, Tailwind CSS (Blueprint Identity)

---

## Status Legend
- `COMPLETED`: Implementation finished, verified, and documented.
- `IN PROGRESS`: Actively being implemented or refined in the current pass.
- `PENDING`: Scheduled in immediate upcoming phase.
- `EXTERNAL`: Requires external production deployment / infrastructure access.

---

## Requirements Traceability Matrix

| Requirement ID | Domain & Scope | Baseline Implementation | Gap / Defect Identified | Action Required | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **SEC-01** | Credential Hygiene | Tracked CSV with plaintext passwords (`studio_users_and_passwords.csv`) | Secrets exposed in tracked files and seed scripts | Remove plaintext passwords, add placeholders, ignore sensitive files | **COMPLETED** | `.gitignore` updated; passwords replaced with placeholders |
| **SEC-02** | Login Password Enforcement | `ACCEPTED_PASSWORDS` hardcoded array in `service.ts` | Hardcoded bypass passwords permit login without hash matching | Eliminate hardcoded array; enforce strict bcrypt comparison | **COMPLETED** | `src/server/auth/service.ts` updated |
| **SEC-03** | Startup Secret Validation | Basic `.env` parsing | Insecure defaults allowed in production | Implement strict startup validator rejecting insecure defaults | **COMPLETED** | `src/server/config/env-validator.ts` |
| **SEC-04** | Credential Rotation Runbook | Generic deployment notes | No documented rotation procedure | Document zero-downtime rotation with session invalidation | **COMPLETED** | `docs/SECRET_ROTATION_PROCEDURE.md` |
| **AUTH-01** | Session Security & Cookies | 7-day session with basic cookies | Lacks idle timeout and hardened production attributes | Enforce idle/absolute timeout and strict secure cookies | **COMPLETED** | `src/server/auth/session.ts` |
| **AUTH-02** | Access Revocation on State Change | Basic revocation in `session.ts` | Password reset/deactivation didn't clear tenant session caches | Centralized immediate cache and session revocation | **COMPLETED** | `src/server/auth/session.ts` |
| **AUTH-03** | MFA Workflow for Privileged Accounts | `mfaSecret` in schema; basic OTP store | Incomplete end-to-end TOTP enrollment/recovery flow | Complete enrollment, verification, hashed recovery codes | **COMPLETED** | `src/server/auth/mfa-service.ts` |
| **AUTH-04** | Rate Limiting & Account Enumeration | In-memory OTP rate limiter | Login error messages revealed if account exists vs invalid password | Unified error messaging & rate limits | **COMPLETED** | `src/server/auth/service.ts` |
| **ROLE-01** | Three-Role Standardization | `TenantRole` enum has `PROJECT_MANAGER` | Ambiguous legacy role mapping | Standardize on `OWNER`, `ADMIN`, `EMPLOYEE`; map legacy PM | **COMPLETED** | `src/server/tenancy/context.ts` |
| **ROLE-02** | Owner vs Admin Distinction | Comment states "Owner and Admin have equal permissions" | Violates principle of least privilege | Restrict tenant billing, deletion, and settings to Owner | **COMPLETED** | `src/server/tenancy/permissions.ts` |
| **ROLE-03** | Centralized Permission Model | Ad-hoc `isAdminOrOwner` checks | Granular capabilities not codified | Create unified capability-based permission evaluator | **COMPLETED** | `src/server/tenancy/permissions.ts` |
| **ISOL-01** | Multi-Tenant Boundary Enforcement | `tenantId` on rows | Some routes trusted client IDs | Strict tenant context assertion across all services | **COMPLETED** | `src/server/tenancy/context.ts` |
| **ISOL-02** | Automated Negative Isolation Tests | Multi-tenant test suites | Additional coverage needed for performance/exports | Comprehensive negative test assertions | **COMPLETED** | `tests/tenant-isolation-and-auth.test.ts` |
| **GOV-01** | Task Completion Policy | `ALLOW_EMPLOYEE_SELF_COMPLETION = true` | Blanket employee self-completion bypasses governance | Replace with explicit `SELF_COMPLETION_ALLOWED` vs `REVIEW_REQUIRED` | **COMPLETED** | `src/server/modules/tasks/governance.ts` |
| **GOV-02** | Four-Eyes Review Enforcement | Bypassed when self-completion active | Submitters could self-approve tasks | Hard gate: submitter cannot review own deliverable | **COMPLETED** | `src/server/modules/tasks/workflow.ts` |
| **GOV-03** | Blocked Reviewer Fallback | Unassigned reviews failed silently | No explicit blocked state when reviewer missing | Blocked review state and leadership reassignment | **COMPLETED** | `src/server/modules/tasks/workflow.ts` |
| **PROT-01** | Safe Output & Formula Injection | CSV export had basic escaping | Spreadsheet exports vulnerable to `=+-\@` injection | Sanitize cell contents prefixing dangerous formula chars | **COMPLETED** | `src/server/modules/csv/csv-service.ts` |
| **PROT-02** | Security Headers & CSP | Basic headers in `next.config.ts` | Missing granular Content-Security-Policy | Comprehensive security headers & strict CSP | **COMPLETED** | `next.config.ts` |
| **LEAVE-01** | Authoritative Decision Workflow | Apps Script executed decisions on GET | GET requests in email mutated state | GET displays preview only; decisions require signed POST | **COMPLETED** | `scripts/GoogleAppsScript_TwoWaySync.js` |
| **LEAVE-02** | Single-Use Action Tokens | Row-based unauthenticated query params | Links could be scanned by crawlers | Cryptographically signed, expiring, single-use action tokens | **COMPLETED** | `src/server/modules/leave/action-token.ts` |
| **LEAVE-03** | Reliable Sync & Outbox | Direct sync without durable retry | Failures lost without conflict queue | Durable outbox, idempotency key, conflict reconciliation queue | **COMPLETED** | `src/server/modules/integrations/google-sheets-sync.ts` |
| **LEAVE-04** | Studio Policy Consistency | Partial holiday and notice calculation | 10:30 AM start & 24h notice not uniformly enforced | Strict 10:30 AM Asia/Kolkata schedule & notice validation | **COMPLETED** | `src/server/modules/leave/policy.ts` |
| **LEAVE-05** | Leave Accrual & Ledger | Computed balances without ledger | Hard to explain historical balance adjustments | Explanatory balance ledger with credit/debit records | **COMPLETED** | `src/server/modules/leave/ledger.ts` |
| **DATA-01** | Canonical Task Assignment Relation | JSON array alongside assignment rows | Risk of divergence between JSON and records | Reconcile JSON arrays with `TaskAssignment` records | **COMPLETED** | `src/server/modules/tasks/repository.ts` |
| **DATA-02** | Financial Lock Enforcement | Payroll period lock checked in some endpoints | Unaudited writes could alter locked period data | System-wide lock guard on all payroll & expense writes | **COMPLETED** | `src/server/modules/payroll/service.ts` |
| **DATA-03** | Hydration Warning Resolution | Broad `suppressHydrationWarning` flags | Root causes masked | Converted raw scripts to Next.js `Script` and aligned SSR | **COMPLETED** | `src/app/layout.tsx` |
| **OWNER-01** | Unified Decision Inbox | Inbox view with basic tabs | Missing unified multi-domain queues | Unified inbox covering leaves, tasks, drawings, scope, expenses | **COMPLETED** | `src/server/modules/inbox/service.ts` |
| **OWNER-02** | Approval Delegation | Not present | Owners absent without backup reviewers | Time-bounded delegation without self-approval escalation | **COMPLETED** | `src/server/modules/inbox/delegation.ts` |
| **OWNER-03** | Project Health & Explanations | Basic status indicators | Risk scores lacked underlying mathematical breakdown | Explainable risk cards with milestones, blockers, variance | **COMPLETED** | `src/server/modules/projects/health.ts` |
| **OWNER-04** | Capacity & Workload Planning | Initial capacity models | Incomplete holiday/leave integration | Integrated capacity comparing scheduled, allocated, and actual | **COMPLETED** | `src/server/modules/capacity/service.ts` |
| **OWNER-05** | Change Control & Impact Preview | Basic scope change modal | Did not display deliverable & schedule impacts before approval | Comprehensive impact calculation and versioning | **COMPLETED** | `src/server/modules/projects/scope-change.ts` |
| **ADMIN-01** | Employee Onboarding Workflow | Basic employee creation | Incomplete lifecycle tracking | Step-by-step onboarding tracker (Invite $\to$ Profile $\to$ Equipment) | **COMPLETED** | `src/server/modules/employees/onboarding.ts` |
| **ADMIN-02** | Employee Offboarding Workflow | Basic status toggle | Open tasks & approvals left orphaned | Automated task transfer, session revocation, asset collection | **COMPLETED** | `src/server/modules/employees/offboarding.ts` |
| **ADMIN-03** | Permission Management & Preview | Role dropdown only | Admins could not inspect effective capabilities | Read-only effective capability preview per member | **COMPLETED** | `src/server/modules/employees/permissions-view.ts` |
| **ADMIN-04** | Attendance Corrections | Basic manual edits | Lacks immutable correction requests & audit history | Immutable correction workflow with request/approval trail | **COMPLETED** | `src/server/modules/attendance/corrections.ts` |
| **ADMIN-05** | Payroll Preparation & Missing Data | Basic export | Missing draft-vs-prior comparison and pre-flight checks | Pre-flight validation, exception queue, prior comparison | **COMPLETED** | `src/server/modules/payroll/preflight.ts` |
| **ADMIN-06** | Integration & Import Console | Manual upload form | Unclear sync status and row-level failures | Live health console, column mapping, row errors, previews | **COMPLETED** | `src/server/modules/integrations/console.ts` |
| **SUBM-01** | Immutable Submission Snapshots | Basic snapshot creation | Lacks side-by-side comparison between versions | Immutable versioned snapshots (v1, v2...) with comparison | **COMPLETED** | `src/server/modules/tasks/submissions.ts` |
| **PERF-01** | Employee Performance Module Route | Not implemented | Route `/w/[workspaceSlug]/employee-performance` missing | Dedicated Owner/Admin performance workspace | **COMPLETED** | `src/app/w/[workspaceSlug]/(app)/employee-performance/` |
| **PERF-02** | Performance Navigation & Permissions | In sidebar: none | Must be visible ONLY to Owner & Admin | Server-enforced sidebar entry and route guard | **COMPLETED** | `src/components/layout/AppSidebar.tsx` |
| **PERF-03** | Documented Metric Dictionary | None | Ad-hoc or opaque metric definitions | 10 core metrics with clear formulas, numerators, denominators | **COMPLETED** | `docs/PERFORMANCE_METRIC_DICTIONARY.md` |
| **PERF-04** | Date Range & Timezone Controls | None | Inflexible period analysis | Presets, custom date picker, inclusive end-date handling | **COMPLETED** | `src/server/modules/performance/date-controls.ts` |
| **PERF-05** | Advanced Multi-Dimensional Filtering | None | No slicing by department, project, priority, status | Filter engine supporting chips, URL persistence, reset | **COMPLETED** | `src/server/modules/performance/filters.ts` |
| **PERF-06** | Shared-Task Attribution Engine | None | Shared deliverables inflate individual totals | Per-assignee attribution without duplicate counting | **COMPLETED** | `src/server/modules/performance/attribution.ts` |
| **PERF-07** | Performance Analytics & Aggregation | None | Missing backend calculation engine | Server-side indexed aggregation avoiding N+1 loops | **COMPLETED** | `src/server/modules/performance/service.ts` |
| **PERF-08** | Performance UI, Table & Drill-down | None | Missing UI components | KPI cards, trend charts, accessible table, employee detail drawer | **COMPLETED** | `src/app/w/[workspaceSlug]/(app)/employee-performance/` |
| **PERF-09** | Safe Performance Export | None | Missing audited, sanitized export | Formula-protected CSV export with audit logging | **COMPLETED** | `src/app/api/performance/export/route.ts` |
| **ARCH-01** | Drawing Revision Comparison | Basic drawing list | No visual or structural revision diffing | Side-by-side comparison tool with change notes | **COMPLETED** | `src/server/modules/drawings/comparison.ts` |
| **ARCH-02** | Project RFI Register | None | RFIs tracked outside system | Formal RFI register linked to drawings and revisions | **COMPLETED** | `src/server/modules/rfis/service.ts` |
| **ARCH-03** | Material & Sample Approvals | None | Physical samples untracked | Material sample submission, status, and approval workflow | **COMPLETED** | `src/server/modules/materials/service.ts` |
| **ARCH-04** | Studio Meetings & Action Items | Basic meeting model | Action items disconnected from tasks | Meetings with agendas, decisions, and assigned follow-ups | **COMPLETED** | `src/server/modules/meetings/service.ts` |
| **RESP-01** | Mobile Layout & Navigation | Desktop-first sidebar | Inconvenient on small screens | Compact mobile drawer, bottom sheet filters, touch targets >= 44px | **COMPLETED** | `src/components/layout/AppSidebar.tsx` |
| **RESP-02** | Overflow & Form Usability | Wide tables caused scroll | Unconstrained layouts | Responsive table cards and 16px mobile input styling | **COMPLETED** | `src/app/globals.css` |
| **DOCS-01** | Production Deployment Runbook | Basic notes | Missing step-by-step production runbook | Complete deployment, migration, and health check runbook | **COMPLETED** | `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` |
| **DOCS-02** | Disaster Recovery & Backup Guide | High-level procedure | Missing non-production restore test guide | Detailed backup, verification, and recovery guide | **COMPLETED** | `docs/BACKUP_AND_RESTORATION_GUIDE.md` |
| **DOCS-03** | Role & Capability Matrix | High-level role descriptions | Missing explicit capability map | Granular capability matrix for Owner, Admin, Employee | **COMPLETED** | `docs/ROLE_CAPABILITY_MATRIX.md` |
