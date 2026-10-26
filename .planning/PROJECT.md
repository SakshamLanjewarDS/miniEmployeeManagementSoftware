# 100% DESIGN Studio OS — Master Project Specification & Architecture Manual

**Project Name:** 100% DESIGN Studio OS (`miniEmployeeManagementSoftware`)  
**Domain:** Multi-Tenant Architecture, Interior Design & Studio Employee Operations Platform  
**Current Version:** `3.5.0` (Production Enterprise Hardened — Security Remediated, Governed Task & Deliverable Lifecycle, Unified Hiring & Compliance Records Hub, HR Letterhead Engine, Studio Meetings & MoM Governance, Multi-Participant Site Journey Protocol, Live Two-Way Google Sheets Sync, 24-Hour Advance Leave Policy, Indian Payroll & Multi-Bank Payouts, Disposable Test DB Runner & Multi-Tenant Studio Isolation)  
**Primary Repository:** `c:\Users\ASUS\Desktop\miniEmployeeManagementSoftware`  
**Target Environment:** Node.js 20+, Next.js 16 (App Router in Webpack mode), React 19, TypeScript 5 (Strict), Tailwind CSS v4, Prisma ORM 6.4, MySQL 8.0+, Docker Engine with ClamAV 1.4

---

## 1. Executive Vision, Problem Space & Studio Tenets

Architectural practices and interior design studios operate under distinct operational workflows that generic project management suites (Jira, Asana, Monday, ClickUp) cannot satisfy without awkward workarounds:

1. **Field vs. Studio Duality:** Site architects and project engineers constantly move between studio drafting tables and active construction sites where GPS accuracy fluctuates inside concrete basements or under steel structures. Operations require rapid geofenced check-in/out verification and multi-participant journey tracking without battery-draining continuous background tracking.
2. **Strict Revision Control for Drawings:** Architectural drawings evolve through explicit, immutable revisions ($R_0, R_1, R_2, \dots$). Approval for $R_0$ must never implicitly carry forward to $R_1$.
3. **Four-Eyes Quality Gates (No Self-Approval):** Professional design governance requires that an architect or engineer who creates a drawing, delivers a specification, requests a scope change, or submits a task deliverable cannot approve their own submission. Reviewer $\neq$ Submitter. In v3.5.0, this rule is strictly enforced across all roles (including Owners) for HR documents, payroll letters, and deliverable approvals.
4. **Governed Deliverable & Task Lifecycle:** Deliverables contain multiple checklist items assigned across different team members. Items progress through a rigorous 8-stage lifecycle: Assignment $\to$ Versioned Acknowledgement $\to$ Dependency-Checked Start $\to$ Clarification / Blocker Handling $\to$ Deadline Extension Gate $\to$ Versioned Snapshot Submission $\to$ Four-Eyes Review & Requested Changes $\to$ Automatic Deliverable Completion & Leadership-Only Reopen.
5. **Configurable Employee Self-Completion Access:** Configured via `ALLOW_EMPLOYEE_SELF_COMPLETION = true` in [`src/server/modules/tasks/repository.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/tasks/repository.ts). Employees and assignees can directly set their tasks and checklist items to `COMPLETED` from the Kanban board, status dropdowns, and Employee Dashboard "Mark Complete" shortcuts. This access can be toggled back to strict Four-Eyes leadership approval when required.
6. **Reopened Task Alert System:** When a deliverable is reopened by Studio Leadership, affected employees receive a high-priority banner and modal dialog ([`ReopenedTaskAlertModal.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/dashboard/ReopenedTaskAlertModal.tsx)) with revision context and mandatory acknowledgment tracking persisted to the database and `localStorage`. Assignees must explicitly re-acknowledge reopened tasks before proceeding.
7. **Unified Hiring & Compliance Records Hub:** Specialized management portal ([`/hiring`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/w/%5BworkspaceSlug%5D/%28app%29/hiring/page.tsx)) for employee identity verification (Aadhaar, Degree, Bank Passbook) with quarantine virus scanning states (`DocumentScanStatus`: `PENDING`, `SCANNING`, `CLEAN`, `INFECTED`, `QUARANTINED`) and verified metadata extraction.
8. **Automated HR Letterhead Engine:** Full-lifecycle employment letter generation supporting 13 standard architectural studio templates (Offer, Appointment, Probation Confirmation, Salary Revision, Relieving, Experience Certificate) with letterhead asset margins, version chains (`supersedesId`), and immutable rendered PDF storage.
9. **Studio Meetings & MoM Governance:** Complete studio meeting lifecycle management ([`src/server/modules/executive/meetings.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/executive/meetings.ts)). Features attendee-scoped visibility (employees only see meetings they are invited to or all-studio meetings), Four-Eyes private draft minutes (MoM) withholding, and 1-click conversion of action items into tracked `ExecutiveTask` items.
10. **Multi-Participant Site Journey Protocol:** Field inspection travel state machine tracking team journeys from office departure to site arrival, inspection execution, snag logging with photo evidence, and office return.
11. **Live Two-Way Google Sheets Synchronization:** Bidirectional integration with external Google Sheets (`Form Responses 1`). Google Forms submissions dynamically sync into the system while in-app decisions (approvals, rejections, soft deletions with strikethrough, cancellations) push back to the live sheet via HMAC-SHA256 authenticated webhooks.
12. **24-Hour Advance Leave Notice Policy:** Automated enforcement where Casual and Half-Day leave requests must be submitted at least 24 hours prior to 10:30 AM IST on the start date. Short-notice applications are auto-rejected with automated employee notifications, while Sick Leave, Emergency Leave, and Hourly Leave are exempt.
13. **Indian Payroll & Multi-Bank Net Banking Compliance:** Automated 2.0 days/month leave accrual, Loss of Pay (LOP) calculations, financial locks on finalized payroll periods, and HDFC/ICICI/SBI compliant net banking CSV payout generation with OWASP formula injection protection.
14. **Zero-Trust Multi-Tenant SaaS Isolation & Security Hardening:** Logical tenant isolation (`tenantId`) enforced on every database query, zero cross-tenant IDOR leak paths, authenticated and sandboxed private file streaming vault, sanitized spreadsheet exports, and a disposable test database runner (`studio_os_test`) with production-database safety guards.

---

## 2. Technology Stack Matrix

| Layer | Technology | Version / Configuration | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.7` (`--webpack` mode) | Hybrid SSR/CSR, route groups, layout streaming, Server Actions, NTFS junction support |
| **Language** | TypeScript | `5.x` (Strict Mode) | End-to-end type safety across database, services, APIs, and client views |
| **UI Library** | React | `19.2.8` | Concurrent rendering, Server Components, client state hooks |
| **Styling** | Tailwind CSS & PostCSS | `@tailwindcss/postcss` `^4.0` | Modern CSS-first atomic styling, CSS variables, dark/light accents |
| **Design System** | Studio Blueprint Design System (SBDS) | Documented in [`DESIGN.md`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/DESIGN.md) | Architectural precision tokens, container queries, high data density |
| **ORM / Database** | Prisma Client & CLI | `6.4.1` with MySQL 8.0+ | Strongly typed relational schema, connection pooling (`limit=25`, `timeout=20`) |
| **Antivirus Scanner** | ClamAV Daemon | `clamav/clamav:1.4.1` | Asynchronous file upload malware and virus quarantine engine |
| **External Integration** | Google Apps Script (V8 Engine) | Webhook Two-Way Sync + HMAC | Bidirectional form ingestion, tamper-proof email approvals (`doGet`/`doPost`) |
| **Authentication** | `jose` + `bcryptjs` | `jose ^6.2`, `bcryptjs ^3.0` | Stateless JWT tokens + DB-backed revocable sessions with role checks |
| **Validation** | Zod | `^4.6.5` | Strict schema validation for all API request bodies and query parameters |
| **Icons** | Lucide React | `^1.48.0` | Consistent, accessible architectural and operations iconography |
| **Push Notifications** | `web-push` | `^3.6.7` | Web push notification subscription and dispatch engine |
| **PWA & Offline** | Web Manifest + Service Worker | Native PWA (`manifest.ts`) | Installable desktop and mobile app experience |
| **Speech & Audio** | Web Speech API | Custom Speech-to-Text Engine | Hands-free on-site observation dictation throttled via `requestAnimationFrame` |
| **Geofencing & Mapping** | Haversine Formula + SVG Spatial Plot + OSM | Custom Math Engine + Vector Canvas | Mathematical great-circle distance calculation, in-app boundary plots, reverse-geocoding |

---

## 3. Performance Engineering & System Acceleration

To resolve page transition lag, slow app cold-starts, and CPU spikes on Windows environments, the platform features a comprehensive performance optimization architecture:

### 3.1 Webpack Runtime Mode for NTFS Junction Boundaries
* **Issue Solved:** Turbopack panics (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`) when Windows NTFS junctions link `node_modules` across directories.
* **Architecture:** Configured `npm run dev` and `npm run build` to execute `next dev --webpack` with Webpack `watchOptions.ignored: ["**/node_modules/**"]`. Webpack resolves NTFS junctions natively without boundary panic or excessive file system scans.

### 3.2 Elimination of SSR Redirect Bounce Loops
* **Issue Solved:** Root route `/` previously forced an unauthenticated client redirect to `/login`, causing dual server render cycles and page flickering.
* **Architecture:** [`src/app/page.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/page.tsx) evaluates the server-side session cookie directly. Authenticated users are forwarded immediately to `/w/${membership.tenant.slug}/dashboard` in a single SSR pass.

### 3.3 Prefetch Storm Elimination & Debounced Navigation
* **Issue Solved:** Next.js default `Link` components aggressively prefetched and compiled 20+ routes whenever the mouse hovered over the sidebar, overwhelming the compilation server.
* **Architecture:**
  - Sidebar navigation links in [`AppSidebar.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/layout/AppSidebar.tsx) set `prefetch={false}`.
  - The [`NavigationProgressBar`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/layout/NavigationProgressBar.tsx) applies an 80ms mouse-hover debounce with an LRU cache before warming routes.

### 3.4 Parallelized SQL Query Waterfalls
* **Issue Solved:** Sequential `await` calls generated 8 to 11 consecutive database round trips on every dashboard load.
* **Architecture:** All dashboard services ([`src/server/modules/dashboard/service.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/dashboard/service.ts)) parallelize queries using `Promise.all`:
  - **Owner Dashboard:** 10 queries executed concurrently (projects, team metrics, financials, site visits, pending deliverables).
  - **Admin Dashboard:** 8 queries executed concurrently (staff headcounts, attendance, asset logs, outbox queue).
  - **Employee Dashboard:** 11 queries executed concurrently (active tasks, timer metrics, leave quotas, site logs, reopened alerts).

### 3.5 In-Memory Multi-Assignee Search Caching
* **Issue Solved:** Searching multi-assigned team tasks required full table scans on unindexed JSON columns.
* **Architecture:** [`tasks/repository.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/tasks/repository.ts) implements an in-memory cache with a 10-second TTL (`multiAssignedCache`). Repetitive assignee lookups return in sub-millisecond time.

### 3.6 Connection Pool & Hardware Resource Tuning
* **Database Pool:** Optimized connection string parameters `connection_limit=25&pool_timeout=20` to prevent MySQL connection starvation under concurrent studio loads.
* **Speech Assistant:** Global speech capture and modal position calculations are throttled using `requestAnimationFrame`, eliminating UI thread lag during page scrolling.

---

## 4. Comprehensive Security Architecture & Hardening (v3.5.0)

A comprehensive application security audit, threat-modeling analysis, and full-stack code remediation (SEC-01 through SEC-14) were executed and validated in source code and automated test suites:

```mermaid
graph TD
    Client[Web & Mobile Client] -->|HTTPS + Security Headers| NGINX[Next.js App Router Webpack]
    NGINX -->|Stateless JWT / HttpOnly Cookie| AuthMiddleware[Auth & Tenancy Guard]
    AuthMiddleware -->|Validate tenantId & Role| TenancyContext[Tenant Context]
    TenancyContext -->|assertCannotSelfReview| FourEyes[Four-Eyes Governance Engine]
    TenancyContext -->|assertTenantScope| DBService[Prisma DB Service / MySQL 8.0]
    Client -->|Private File Access| StorageVault[/api/storage/files/:id]
    StorageVault -->|X-Content-Type-Options: nosniff + CSP| StorageEngine[Encrypted Storage Engine]
    StorageEngine -->|Scan Status Check| ClamAV[ClamAV 1.4 Daemon]
    GoogleSheet[Google Sheets Webhook] -->|HMAC-SHA256 Token Verify| SyncEngine[/api/integrations/google-sheets/sync]
```

### 4.1 Remediated Security Matrix (SEC-01 to SEC-14)

| Finding ID | Severity | Category | Vulnerability & Remediation Implementation |
|---|---|---|---|
| **SEC-01** | **Priority 0** | **Backdoor Removal** | Disabled `/api/admin/restore-admin` route in production (returns 404); blocked GET mutations (returns 405); required `OPERATOR_RECOVERY_TOKEN` in non-prod; provided audited host CLI script [`scripts/restore-admin.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/scripts/restore-admin.ts). |
| **SEC-02** | **Critical** | **Authentication / 2FA** | Removed `otpPreview` from login responses; implemented 5-minute single-use OTP token consumption and 3-attempt brute-force throttling in [`src/server/auth/service.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/auth/service.ts). |
| **SEC-03** | **Critical** | **Secret Hygiene** | Purged hardcoded developer passwords and personal email fallbacks across auth services and bootstrap seeds. Admin credentials strictly require environment variables (`INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`). |
| **SEC-04** | **High** | **Multi-Tenancy / IDOR** | Added explicit `tenantId: ctx.tenantId` verification to `reviewSiteVisit`, `reviewInspectionReport`, and site parameter overrides in [`src/server/modules/visits/service.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/visits/service.ts). |
| **SEC-05** | **High** | **Authorization / HR RBAC** | Restricted `canManageHR` and `canManageFinance` in [`src/server/tenancy/context.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/tenancy/context.ts) so general administrators without explicit flags (`hasHrAccess`, `hasFinanceAccess`) cannot access confidential staff records. |
| **SEC-06** | **High** | **Governance / Four-Eyes** | Removed Owner exemption from `assertCannotSelfReview`, enforcing Four-Eyes approval universally across all roles for HR documents, employee compliance, and salary letters. |
| **SEC-07** | **High** | **Storage & Sandbox** | Restricted file access in [`src/app/api/storage/files/[fileId]/route.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/api/storage/files/%5BfileId%5D/route.ts) to document owner, studio owner, or authorized HR leads; added universal `X-Content-Type-Options: nosniff` and CSP sandboxing `Content-Security-Policy: default-src 'none'; sandbox`. |
| **SEC-08** | **Medium** | **HTTP Semantics** | Disallowed state mutations on HTTP GET requests in [`src/app/api/integrations/google-sheets/sync/route.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/api/integrations/google-sheets/sync/route.ts). Made GET strictly read-only diagnostics; mutations require authenticated POST/PUT. |
| **SEC-09** | **Medium** | **Task Reopen Logic** | Decoupled `acknowledgedVersion` from `reopenCount`. Mandated assignee re-acknowledgment upon reopening deliverable. Added database persistence to `TaskAssignment` (`acknowledgedAt`). |
| **SEC-10** | **Medium** | **CSV Formula Injection** | Fixed spreadsheet formula injection bypass where tabs (`\t`) and CR/LF were stripped before regex evaluation in [`src/server/modules/ingest/csv.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/ingest/csv.ts). Preserves RFC 4180 bank export formatting. |
| **SEC-11** | **Low** | **Defense-in-Depth** | Added global HTTP security headers (HSTS, X-Frame-Options: DENY, Referrer-Policy, nosniff) in [`next.config.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/next.config.ts), created [`src/app/robots.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/robots.ts) blocking private routes, and added `noindex, nofollow` metadata in [`src/app/layout.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/app/layout.tsx). |
| **SEC-12** | **High** | **Apps Script Integration** | Added HMAC-SHA256 signed decision tokens to email approvals; converted `doGet` into a safe confirmation landing page with zero state mutation; required `doPost` with valid cryptographic signature. |
| **SEC-13** | **Critical** | **Test DB Isolation** | Switched test target from development DB (`studio_os_db`) to dedicated disposable database (`studio_os_test`) with fatal safety guard `assertSafeTestDatabase()`. |
| **SEC-14** | **Medium** | **DevSecOps Runbook** | Pinned ClamAV to `clamav/clamav:1.4.1` on private Docker network; bound MySQL strictly to `127.0.0.1:3307:3306`; separated multi-stage Dockerfile; created non-destructive restore engine [`scripts/restore-db.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/scripts/restore-db.ts). |

---

## 5. Bidirectional Live Google Sheets Synchronization Engine

The platform features an enterprise-grade bidirectional sync pipeline connecting the Studio OS database with Google Sheets (`Form Responses 1`):

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Staff Member
    participant Form as Google Form
    participant Sheet as Google Sheet (Form Responses 1)
    participant GAS as Apps Script (Code.gs)
    actor Admin as Studio Admin / Owner
    participant Studio as Studio OS Web App
    participant DB as MySQL Database

    Employee->>Form: Submit Leave / Task / Expense
    Form->>Sheet: Append new row
    Sheet->>GAS: onFormSubmit Trigger
    GAS->>Studio: POST /api/integrations/google-sheets/sync (Payload + Auth Token)
    Studio->>DB: Parse Indian Date (DD/MM/YYYY) & Upsert Record
    Studio-->>GAS: 200 OK (Row ID Synced)
    
    Admin->>Studio: In-App Decision (Approve / Reject / Soft Delete)
    Studio->>DB: Update Record State & Audit Log
    Studio->>GAS: Outbound POST Webhook (Status, Color Code, Strikethrough)
    GAS->>Sheet: Update Row Fill Color & Apply Strikethrough
```

### 5.1 Smart Indian Date Parser (`DD/MM/YYYY`)
Google Forms in India submits timestamps in `DD/MM/YYYY HH:mm:ss` format. Standard JavaScript `Date.parse()` incorrectly swaps day and month for values where day $\le 12$. The ingestion engine implements an explicit regex parser:
```typescript
const match = rawDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
if (match) {
  const [_, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
```

### 5.2 Cryptographically Signed Email Approvals
When a leave request or expense is ingested, Apps Script generates an interactive approval email sent to the Studio Owner. The email includes dynamic action links signed with HMAC-SHA256:
- **Zero-Mutation Landing Page (`doGet`):** Clicking "Approve" opens a secured web page displaying the employee's request details and a "Confirm Decision" CTA button. No database state is modified on GET requests (preventing email pre-fetch scanner auto-approvals).
- **Signed Action Dispatch (`doPost`):** Clicking "Confirm Decision" dispatches a POST request with the HMAC signature to the Studio OS API, executing the state mutation.

---

## 6. Governed Task & Deliverable Lifecycle

The platform models design studio tasks as rigorous deliverables containing multiple checklist items assigned across team members.

### 6.1 The 8-Stage State Machine
```
[ASSIGNED] 
    │
    ▼ (Mandatory Assignee Acknowledgment)
[ACKNOWLEDGED]
    │
    ▼ (Dependency Pre-requisite Check)
[IN_PROGRESS]
    ├──► [BLOCKER_DECLARED] (Leadership Notification & Pause)
    ├──► [DEADLINE_EXTENSION_REQUESTED] (Owner Inbox Gate)
    │
    ▼ (Upload Required Drawing / Deliverable File)
[IN_REVIEW] (Four-Eyes Gate: Submitter != Reviewer)
    ├──► [CHANGES_REQUESTED] (Returns to IN_PROGRESS with Comments)
    │
    ▼ (Review Approved)
[COMPLETED]
    │
    ▼ (Owner / Leadership Exception Only)
[REOPENED] (Triggers High-Priority Modal Alert to Assignees)
```

### 6.2 Employee Self-Completion Mode
* **Configuration:** Controlled by `ALLOW_EMPLOYEE_SELF_COMPLETION = true` in [`src/server/modules/tasks/repository.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/tasks/repository.ts).
* **Behavior:** When enabled, employees can mark tasks directly as `COMPLETED` from the Kanban board, Task Details view, and the Employee Dashboard Focus widget without awaiting Four-Eyes review approval. When disabled, tasks must transition through `IN_REVIEW` for leadership sign-off.

### 6.3 Reopened Task Alert System
When a deliverable is reopened:
1. The server resets `acknowledgedAt: null` on all `TaskAssignment` records.
2. The employee's dashboard displays a prominent alert banner and launches [`ReopenedTaskAlertModal.tsx`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/dashboard/ReopenedTaskAlertModal.tsx).
3. The modal displays a carousel of all reopened deliverables with revision context, past submission notes, and leadership feedback.
4. Dismissing the alert requires clicking "Acknowledge Reopened Deliverable", which issues a `POST` request to `/api/employee/reopened-tasks` to record acknowledgment.

---

## 7. Studio Meetings & Executive MoM Governance

Architectural and interior studios hold extensive client presentations, contractor coordination reviews, and internal partner strategy sessions. The platform provides a full-featured studio meetings module ([`src/server/modules/executive/meetings.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/executive/meetings.ts)):

### 7.1 Attendee-Scoped Visibility & Authorization
- **Owner & Admin Access:** Full visibility across all historical and upcoming studio meetings, including draft minutes (MoM) and private internal notes.
- **Employee Access:** Server-side filtering strictly restricts meeting visibility to meetings where the employee is an explicit attendee (`attendeeEmployeeIds`) or where `allEmployees: true` is configured.
- **Four-Eyes MoM Withholding:** Minutes of meetings remain strictly hidden from general employees until an Owner or Admin toggles `isMinutesPublished: true`.

### 7.2 Action Item to Executive Task Conversion
Every meeting minute includes structured action points. With 1-click, studio leaders can convert any action item into a tracked `ExecutiveTask`:
- Automatically inherits meeting title, agenda context, and linked project.
- Assigns to the designated team member with deadline tracking.
- Dispatches multi-channel notifications (in-app, Web Push, and email outbox).

---

## 8. Unified Hiring, Compliance & HR Letters Studio

Employee onboarding and statutory compliance are managed through the centralized `/hiring` portal:

### 8.1 Employee Compliance Document Vault
- **Supported Statutory Documents:** Aadhaar Card, Degree Certificate, Bank Passbook / Cancelled Cheque, PAN Card, Relieving Letters.
- **Quarantine Pipeline:** All file uploads are routed through ClamAV antivirus scanning with states: `PENDING` $\to$ `SCANNING` $\to$ `CLEAN` / `INFECTED` / `QUARANTINED`.
- **RBAC Confidentiality:** Compliance records are restricted strictly to the employee, Studio Owner, and administrators with explicit `hasHrAccess: true`.

### 8.2 HR Letterhead & Document Studio
The letter engine generates 13 standard employment letter templates:
1. Offer Letter
2. Letter of Appointment
3. Probation Confirmation Letter
4. Performance Review & Appraisal Letter
5. Salary Revision / Increment Letter
6. Promotion Letter
7. Transfer / Site Deputation Letter
8. Warning / Disciplinary Action Letter
9. Show Cause Notice
10. Resignation Acceptance Letter
11. Relieving Letter
12. Work Experience Certificate
13. Full and Final Settlement (FnF) Clearance

* **Version Chains:** Each revised letter links to its predecessor via `supersedesId`.
* **Dynamic Interpolation:** Templates support live tags (`{{employeeName}}`, `{{designation}}`, `{{joiningDate}}`, `{{monthlySalary}}`, `{{effectiveDate}}`).
* **Letterhead Formatting:** Visual header and footer margin calibrator matching pre-printed architectural studio bond paper.

---

## 9. Multi-Participant Site Journey Protocol & Haversine Geofencing

Construction and interior site inspections require coordinated multi-member teams (Project Architect, MEP Engineer, Site Supervisor).

### 9.1 The 7-Stage Journey State Machine
```
[ASSIGNED] ──► [EN_ROUTE] ──► [ON_SITE] ──► [INSPECTING] ──► [REPORT_FILED] ──► [RETURNING] ──► [AT_STUDIO]
```

### 9.2 Haversine Geofencing Engine
Mathematical great-circle distance is calculated between the mobile device coordinates and the registered project site latitude/longitude:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- If distance $\le$ site geofence radius (default 150m): Status is marked `WITHIN_RADIUS` (emerald badge).
- If distance $>$ radius: Status is marked `OUTSIDE_RADIUS` (rose badge). Site check-in requires explicit reason logging when outside geofence.

### 9.3 Hands-Free Voice Dictation
Architects on construction sites inspect scaffolding, rebar, and finishes while wearing gloves. The observation field integrates the Web Speech API with throttled animation frames and domain autocorrect for architectural terms (e.g., "GFC", "BOQ", "Screed", "Damp-proof course").

---

## 10. Leave Policy & Statutory Accrual Engine

### 10.1 24-Hour Advance Notice Policy
* **Enforced Leave Types:** `CASUAL_LEAVE` and `HALF_DAY`.
* **Validation Rule:** Must be submitted at least 24 hours prior to 10:30 AM IST on the requested start date.
* **Auto-Rejection:** Applications submitted with $< 24\text{h}$ notice are immediately rejected by the server with reason `"Short Notice: Casual leaves require 24h advance notice"`.
* **Exempt Types:** `SICK_LEAVE`, `EMERGENCY_LEAVE`, and `HOURLY_LEAVE` can be submitted same-day.

### 10.2 Statutory Leave Accrual & Loss of Pay (LOP)
* **Monthly Accrual:** Employees automatically accrue 2.0 days of paid leave per active month of service.
* **LOP Calculation:** If an employee exceeds their available balance, excess days are automatically deducted as Loss of Pay from their monthly payroll:
$$\text{LOP Deduction} = \frac{\text{Base Salary}}{\text{Days in Month}} \times \text{LOP Days}$$

---

## 11. Indian Payroll & Multi-Bank Payout Engine

### 11.1 Payroll Lifecycle & Financial Freeze
1. **Drafting:** Attendance, approved leaves, and overtime calculations are compiled for the pay period.
2. **Review:** Discrepancies and LOP adjustments are verified by Studio HR/Finance.
3. **Financial Lock:** Once marked `FINALIZED`, the payroll month is locked. No past attendance or leave modifications can alter finalized figures.

### 11.2 Multi-Bank Net Banking Payout Export
Supports 1-click batch payout CSV generation for major Indian corporate banking portals:
- **HDFC Bank CMS:** `Beneficiary Code`, `Account Number`, `Amount`, `Payee Name`, `IFSC`, `Narration`.
- **ICICI Bank PayLink:** Strict 16-column corporate disbursement format.
- **State Bank of India (SBI Direct Credit):** Standard SBI corporate clearing structure.
- **OWASP Formula Injection Protection:** Every cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a single quote (`'`) to protect finance officers opening CSVs in Microsoft Excel or Google Sheets.

---

## 12. Comprehensive REST API Endpoint Catalog

The platform exposes 35+ specialized API route groups:

| Route Group | Base Endpoint | Description & Access Control |
|---|---|---|
| **Admin** | `/api/admin/restore-admin` | Audited non-destructive emergency recovery (disabled in production) |
| **Auth** | `/api/auth/login`, `/api/auth/logout`, `/api/auth/verify-2fa` | Stateless JWT authentication, 5-min single-use 2FA |
| **Clients** | `/api/clients` | Client directory, linked projects, and stakeholder contacts |
| **Consultants** | `/api/consultants` | Structural, MEP, and landscape consultant registers |
| **Contractors** | `/api/contractors` | Contractor bids, commitments, and milestone verification |
| **CSV** | `/api/csv/import`, `/api/csv/export` | Staged CSV imports and sanitized data export engines |
| **Custom Fields** | `/api/custom-fields` | Dynamic metadata schema management per studio |
| **Documents** | `/api/documents` | Compliance document vault, scan verification, upload |
| **Drawings** | `/api/drawings` | Drawing sheet revisions ($R_n$), transmittals, GFC approvals |
| **Employee** | `/api/employee/reopened-tasks` | Employee active tasks, timers, and reopened alerts |
| **Employees** | `/api/employees` | Studio personnel directory, designations, compensation |
| **Executive** | `/api/executive` | Executive dashboards, KPI metrics, portfolio summaries |
| **Executive Tasks**| `/api/executive-tasks` | Strategic executive tasks, delegation, meeting conversions |
| **Form Fields** | `/api/form-fields` | Configurable form attributes and validation schemas |
| **Grammar** | `/api/grammar` | Architectural terminology spelling & grammar corrections |
| **Health** | `/api/health` | Sub-5ms ping endpoint for 24/7 uptime monitoring |
| **Hiring** | `/api/hiring` | Recruitment candidates, interview pipelines, compliance files |
| **Inbox** | `/api/inbox` | Unified Owner Decision Inbox for Four-Eyes approvals |
| **Integrations** | `/api/integrations/google-sheets/sync` | Bidirectional Google Sheets sync webhook endpoints (HMAC) |
| **Leave** | `/api/leave` | Leave applications, 24h advance validation, balances |
| **Letters** | `/api/letters` | HR letterhead management, template generation, PDF issue |
| **Materials** | `/api/materials` | Material sample board, BOQ procurement tracking |
| **Meetings** | `/api/meetings` | Studio meetings, minutes (MoM), attendee scoping, action items |
| **Notifications** | `/api/notifications` | In-app notification center and push notifications |
| **Payroll** | `/api/payroll` | Salary periods, LOP calculations, net banking CSVs |
| **Performance** | `/api/performance` | Employee velocity, turnaround tracking, reviews |
| **Profile** | `/api/profile` | 3-tier profile management and official change requests |
| **Projects** | `/api/projects` | Project lifecycle (`DRAFT` $\to$ `ACTIVE` $\to$ `COMPLETED`) |
| **Realtime** | `/api/realtime` | Server-sent events and live notification feeds |
| **Reminders** | `/api/reminders` | Scheduled deadline reminders and quiet-hours dispatches |
| **Reports** | `/api/reports` | Studio delivery metrics, financial audits, transmittals |
| **RFIs** | `/api/rfis` | Requests for Information coordination with consultants |
| **Site Issues** | `/api/site-issues` | Field snag registers, contractor assignments, photos |
| **Storage** | `/api/storage/files/[fileId]` | Encrypted private file streaming with nosniff and CSP |
| **Tasks** | `/api/tasks` | Deliverable lifecycle, checklist items, blockers, self-complete |
| **Team** | `/api/team` | Team memberships, role delegations, status updates |
| **Templates** | `/api/templates` | Standard architectural project and deliverable templates |
| **Vendors** | `/api/vendors` | Trade vendors, private ratings, linked projects |
| **Visits** | `/api/visits` | Multi-participant site visits, GPS tracking, inspection reports |

---

## 13. Local Development, Docker Deployment & Operational Runbook

### 13.1 Prerequisites
* Node.js `20.x` or `22.x`
* MySQL `8.0+` running locally on port `3306` (or Docker port `3307`)
* ClamAV daemon running on port `3310` (optional for local mock mode)

### 13.2 Environment Configuration (`.env`)
```env
# Database & Pool Configuration
DATABASE_URL="mysql://root:Saksham%40123@localhost:3306/studio_os_db?connection_limit=25&pool_timeout=20"
TEST_DATABASE_URL="mysql://root:Saksham%40123@localhost:3306/studio_os_test?connection_limit=10&pool_timeout=15"

# Security & Session Authentication
JWT_SECRET="studio_super_secret_jwt_key_2026_production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Initial Bootstrap Credentials (Required for first-time setup)
INITIAL_ADMIN_EMAIL="designadmin08@gmail.com"
INITIAL_ADMIN_PASSWORD="ReplaceWithStrongPassword2026!"

# Google Sheets Live Webhook Integration
GOOGLE_SHEETS_LEAVE_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbyzqlxv43RAdfl-R0r1MSjCXtODP80J5W0pUSvYpoayXlvyemivDUA737ZQLaQAEdmy8w/exec"
GOOGLE_SHEETS_SYNC_SECRET="replace_with_hmac_secret_key"

# Antivirus & File Quarantine Engine
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT="3310"
```

### 13.3 Development & Build Commands
```powershell
# 1. Install Dependencies
npm install

# 2. Database Schema Sync
npx prisma db push

# 3. Seed Workspaces & Accounts
npm run db:seed

# 4. Start Development Server (Webpack Junction-Safe Mode)
npm run dev

# 5. Production Build (Webpack Mode)
npm run build:webpack
```

### 13.4 Database Maintenance & Recovery Scripts
```powershell
# Automated database backup (stored in ./backups/)
npm run db:backup

# Non-destructive verified database restore
npx tsx scripts/restore-db.ts ./backups/studio_os_db_2026-10-22.sql

# Non-destructive admin restoration CLI (Host-only execution)
npx tsx scripts/restore-admin.ts designsaksham1@gmail.com
```

---

## 14. Test Suite & Verification Matrix

The repository features 28 automated test suites executed via native Node.js Test Runner and `tsx` against the isolated `studio_os_test` database:

```powershell
# Run primary workflow test suite
npm run test

# Run dedicated security & authorization audit suite
npm run test:security

# Run all test suites
npm run test:all
```

| Test Suite | File Path | Focus |
|---|---|---|
| **Security Audit & Isolation** | `tests/security-audit-and-isolation.test.ts` | SEC-01 to SEC-14 verification, IDOR prevention, 2FA throttling, CSP headers |
| **Employee Task Workflow** | `tests/employee-task-workflow.test.ts` | 8-stage task lifecycle, self-completion, submittal |
| **Permission Revocation** | `tests/permission-revocation.test.ts` | Immediate session invalidation on role demotion |
| **Assignment Upgrades** | `tests/assignment-upgrades.test.ts` | Multi-assignee caching and JSON array sync |
| **First Batch Reproduction** | `tests/first-batch-reproduction.test.ts` | Regression tests for foundational bug fixes |
| **Concurrency & Race Conditions**| `tests/concurrency-and-race-conditions.test.ts` | Atomic database locks and simultaneous check-ins |
| **Tenant Isolation & Auth** | `tests/tenant-isolation-and-auth.test.ts` | Cross-tenant data bleed prevention |
| **Role Authorization** | `tests/role-authorization-and-features.test.ts`| Four-Eyes enforcement and role-based route guards |
| **Project Lifecycle** | `tests/project-lifecycle-and-profiles.test.ts`| `DRAFT` $\to$ `ACTIVE` $\to$ `ON_HOLD` $\to$ `COMPLETED` gates |
| **Site Visits Protocol** | `tests/site-visits-and-workflows.test.ts` | Haversine distance and single active visit lock |
| **Owner Decision Inbox** | `tests/modules/owner-decision-inbox.test.ts` | Consolidated review queue and self-approval block |
| **Payroll Engine** | `tests/modules/payroll-engine.test.ts` | LOP deduction formulas and Net Banking CSV sanitization |
| **Leave Policy Engine** | `tests/modules/leave-policy-engine.test.ts` | 24-hour advance leave rule and auto-rejections |
| **Drawings & Site Issues** | `tests/modules/drawings-and-site-issues.test.ts`| Immutable revisions ($R_n$) and snag tracking |
| **Capacity Planning** | `tests/modules/capacity-planning.test.ts` | Resource allocation and prerequisite circularity checks |
| **Backup & Recovery** | `tests/modules/backup-and-recovery.test.ts` | Database dump and verified restore execution |
