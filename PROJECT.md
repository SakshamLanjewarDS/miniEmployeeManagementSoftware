# 100% DESIGN Studio OS — Master Project Specification & Architecture Manual

**Project Name:** 100% DESIGN Studio OS (`miniEmployeeManagementSoftware`)  
**Domain:** Multi-Tenant Architecture, Interior Design & Employee Operations Platform  
**Current Version:** `3.3.0` (Production Enterprise Ready — High-Performance Engine, Live Two-Way Google Sheets Integration, 24-Hour Advance Leave Policy, Financial Locks, Indian Payroll Compliance & Multi-Tenant Studio Governance)  
**Primary Repository:** `c:\Users\ASUS\Desktop\miniEmployeeManagementSoftware`  
**Target Environment:** Node.js 20+, Next.js 16 (App Router with Webpack mode), React 19, TypeScript 5 (Strict), Tailwind CSS v4, Prisma ORM 6.4, MySQL 8.0+

---

## 1. Executive Vision & System Purpose

Architectural practices and interior design studios operate under distinct operational workflows that generic project management suites (Jira, Asana, Monday, ClickUp) cannot satisfy without awkward workarounds:

1. **Field vs. Studio Duality:** Site architects and project engineers constantly move between studio drafting tables and active construction sites where GPS accuracy fluctuates inside concrete basements or under steel structures. Operations require rapid geofenced check-in/out verification without battery-draining continuous background tracking.
2. **Strict Revision Control for Drawings:** Architectural drawings evolve through explicit, immutable revisions ($R_0, R_1, R_2, \dots$). Approval for $R_0$ must never implicitly carry forward to $R_1$.
3. **Four-Eyes Quality Gates (No Self-Approval):** Professional design governance requires that an architect or engineer who creates a drawing, delivers a specification, requests a scope change, or submits a task deliverable cannot approve their own submission. Reviewer $\neq$ Submitter.
4. **Governed Deliverable & Task Lifecycle:** Deliverables contain multiple checklist items assigned across different team members. Items progress through a rigorous 8-stage lifecycle: Assignment $\to$ Versioned Acknowledgement $\to$ Dependency-Checked Start $\to$ Clarification / Blocker Handling $\to$ Deadline Extension Gate $\to$ Versioned Snapshot Submission $\to$ Four-Eyes Review & Requested Changes $\to$ Automatic Deliverable Completion & Leadership-Only Reopen.
5. **Configurable Employee Self-Completion Access:** Currently configured via `ALLOW_EMPLOYEE_SELF_COMPLETION = true` in [`src/server/modules/tasks/repository.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/tasks/repository.ts#L826). Employees and assignees can directly set their tasks and checklist items to `COMPLETED` from the Kanban board, status dropdowns, and Employee Dashboard "Mark Complete" shortcuts.
6. **Live Two-Way Google Sheets Synchronization:** Complete bidirectional integration with external Google Sheets (`Form Responses 1`). Google Forms submissions dynamically sync into the system while in-app decisions (approvals, rejections, soft deletions with strikethrough, cancellations) push back to the live sheet via outbound webhooks.
7. **24-Hour Advance Leave Notice Policy:** Automated enforcement where Casual and Half-Day leave requests must be submitted at least 24 hours prior to 10:30 AM IST on the start date. Short-notice applications are auto-rejected with automated employee notifications, while Sick Leave, Emergency Leave, and Hourly Leave are exempt.
8. **Indian Payroll & Net Banking Compliance:** Automated 2.0 days/month leave accrual, Loss of Pay (LOP) calculations, financial locks on finalized payroll periods, and HDFC/ICICI/SBI compliant net banking CSV payout generation with OWASP formula injection protection.
9. **Multi-Tenant SaaS Foundation:** Built from the database schema up with logical tenant isolation (`tenantId`). Multiple studios operate securely on shared infrastructure with zero data bleed.

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
| **External Integration** | Google Apps Script (V8 Engine) | Webhook Two-Way Sync | Bidirectional form ingestion, 1-click email approvals (`doGet`), live write-backs (`doPost`) |
| **Authentication** | `jose` + `bcryptjs` | `jose ^6.2`, `bcryptjs ^3.0` | Stateless JWT tokens + DB-backed revocable sessions with role checks |
| **Validation** | Zod | `^4.6.5` | Strict schema validation for all API request bodies and query parameters |
| **Icons** | Lucide React | `^1.48.0` | Consistent, accessible architectural and operations iconography |
| **PWA & Offline** | Web Manifest + Service Worker | Native PWA (`manifest.ts`) | Installable desktop and mobile app experience |
| **Speech & Audio** | Web Speech API | Custom Speech-to-Text Engine | Hands-free on-site observation dictation throttled via `requestAnimationFrame` |
| **Geofencing & Mapping** | Haversine Formula + SVG Spatial Plot + OSM | Custom Math Engine + Vector Canvas | Mathematical great-circle distance calculation, in-app boundary plots, reverse-geocoding |

---

## 3. Performance Engineering & System Acceleration

To resolve page transition lag, slow app cold-starts, and CPU spikes on Windows environments, the platform features a comprehensive performance optimization architecture:

### 3.1 Webpack Runtime Mode for NTFS Junction Boundaries
* **Issue Solved:** Turbopack panics (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`) when Windows NTFS junctions link `node_modules` across directories.
* **Architecture:** Configured `npm run dev` to execute `next dev --webpack` with Webpack `watchOptions.ignored: ["**/node_modules/**"]`. Webpack resolves NTFS junctions natively without boundary panic or excessive file system scans.

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
  - **Employee Dashboard:** 11 queries executed concurrently (active tasks, timer metrics, leave quotas, site logs).

### 3.5 In-Memory Multi-Assignee Search Caching
* **Issue Solved:** Searching multi-assigned team tasks required full table scans on unindexed JSON columns.
* **Architecture:** [`tasks/repository.ts`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/server/modules/tasks/repository.ts) implements an in-memory cache with a 10-second TTL (`multiAssignedCache`). Repetitive assignee lookups return in sub-millisecond time.

### 3.6 Connection Pool & Hardware Resource Tuning
* **Database Pool:** Optimized connection string parameters `connection_limit=25&pool_timeout=20` to prevent MySQL connection starvation under concurrent studio loads.
* **Speech Assistant:** Global speech capture and modal position calculations are throttled using `requestAnimationFrame`, eliminating UI thread lag during page scrolling.

---

## 4. 24/7 Live Two-Way Google Sheets Synchronization Engine

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

    rect rgb(240, 248, 255)
    Note over Employee, GAS: 1. Form Ingestion & 24-Hour Policy Gate
    Employee->>Form: Submits Leave Application
    Form->>Sheet: Records row in Columns A-M
    Sheet->>GAS: onFormSubmit(e) Trigger
    alt Under 24h Notice (Casual / Half-Day)
        GAS->>Sheet: Status: "Auto Rejected - 24 Hour Rule"
        GAS->>Employee: Auto-Rejection Policy Email Sent
    else Valid Request / Exempt Leave
        GAS->>Sheet: Status: "Pending"
        GAS->>Admin: 1-Click Approval Email Sent
        GAS->>Employee: Confirmation Email Sent
    end
    end

    rect rgb(245, 255, 245)
    Note over Admin, Sheet: 2. Out-of-App Email Decisions (doGet)
    Admin->>GAS: Clicks Approve/Reject in Email (doGet)
    GAS->>Sheet: Updates Column N (Status), O (Admin), P (Date)
    GAS->>Employee: Decision Notification Email Sent
    end

    rect rgb(255, 250, 240)
    Note over Studio, Sheet: 3. In-App Studio OS Live Decisions (doPost)
    Studio->>DB: Admin approves/rejects/deletes on Webpage
    Studio->>GAS: pushLeaveActionToGoogleSheet (POST Webhook)
    GAS->>Sheet: Matches row & updates Col N, O, P (Strikethrough on Delete)
    GAS->>Employee: Decision Notification Email Sent
    end
```

### 4.1 Spreadsheet Column Structure (Columns A – P)

| Col | Field | Index | Purpose |
|---|---|---|---|
| **A** | `Timestamp` | 0 | Google Form submission timestamp |
| **B** | `Employee Name` | 1 | Full name of applicant |
| **C** | `Department` | 2 | Studio department (Architecture, Interior, MEP, 3D) |
| **D** | `Leave Type` | 3 | Normalized leave classification |
| **E** | `Reason for Leave` | 4 | Justification for regular multi-day leave |
| **F** | `From Date` | 5 | Starting date (`DD/MM/YYYY`) |
| **G** | `To Date` | 6 | Ending date (`DD/MM/YYYY`) |
| **H** | `Medical Certificate` | 7 | Link to attachment if applicable |
| **I** | `Email Address` | 8 | Employee corporate email address |
| **J** | `Hourly Reason` | 9 | Justification for few hours leave |
| **K** | `Leave Date` | 10 | Target date for hourly leave |
| **L** | `From Time` | 11 | Start time (e.g. `10:30 AM`) |
| **M** | `To Time` | 12 | End time (e.g. `01:30 PM`) |
| **N** | `Status` | 13 | `Pending`, `Approved`, `Rejected`, `Auto Rejected - 24 Hour Rule`, `[DELETED IN STUDIO]` |
| **O** | `Processed By` | 14 | Identity of reviewer or system tag |
| **P** | `Action Date` | 15 | Formal decision timestamp |

### 4.2 Smart Indian Date Parser (`parseSheetDate` / `parseSmartDate`)
* Solves the common internationalization failure where standard JavaScript `new Date("14/10/2026")` returns `NaN` or swaps days and months.
* Accurately parses:
  - `DD/MM/YYYY` (Standard Indian Google Sheets format)
  - `DD-MM-YYYY`
  - `YYYY-MM-DD` (ISO strings)
  - Google Apps Script native `Date` objects

### 4.3 24-Hour Advance Submission Notice Rule
* Company workday starts at **10:30 AM IST**.
* For **Casual Leave** and **Half-Day Leave**, the application must be submitted at least 24 hours prior to 10:30 AM on the start date:
  $$\Delta t = \text{Leave Start Date (10:30 AM)} - \text{Submission Timestamp} \ge 24\text{ hours}$$
* If $\Delta t < 24$ hours:
  - Column N is automatically marked `"Auto Rejected - 24 Hour Rule"`.
  - Column O is marked `"System - 24 Hour Rule"`.
  - An instant auto-rejection notification email is dispatched to the employee detailing the policy requirement.
  - Leadership approval buttons are withheld.
* **Exemptions:** **Sick Leave**, **Emergency Leave**, and **Few Hours Leave** bypass the 24-hour rule.

### 4.4 Data Protection Shields
* **Tombstone Protection:** When a leave request is deleted inside Studio OS (`deletedAt != null`), subsequent sheet re-syncs will never recreate or resurrect the record.
* **Local Authority Shield:** Once a request is decided (`APPROVED` or `REJECTED`) inside Studio OS, background sync will never overwrite the record back to `PENDING` from stale sheet data.

---

## 5. Master Database Schema Specification (Prisma Data Dictionary)

The database schema ([`prisma/schema.prisma`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/prisma/schema.prisma)) defines **46 models** across 9 operational domains:

### 5.1 Tenancy & Identity Domain
1. **`Tenant`** (`tenants`): Master tenant record. Includes `id`, `slug`, `name`, `timezone`, `currency`, `branding`, `lifecycleState` (`PROVISIONING`, `ACTIVE`, `SUSPENDED`, `DELETED`), and `settings`.
2. **`User`** (`users`): Global identity credentials. Includes `id`, `email`, `passwordHash`, `fullName`, `accountState` (`ACTIVE`, `DISABLED`), `mfaSecret`, `mfaEnabled`, `mfaRecoveryCodes`.
3. **`TenantMembership`** (`tenant_memberships`): Pivot linking user to tenant with authorization role: `role` (`OWNER`, `ADMIN`, `PROJECT_MANAGER`, `EMPLOYEE`), `status` (`ACTIVE`, `INACTIVE`), `joinedAt`.
4. **`Employee`** (`employees`): Studio personnel employment record. Linked to membership. Stores `employeeId` (unique per tenant), `designation`, `department`, `joiningDate`, `emergencyContact`, `sensitiveNotes` (management-only).
5. **`Session`** (`sessions`): Revocable user sessions with sliding expiry and IP/agent tracking.
6. **`TenantInvitation`** (`tenant_invitations`): Secure tokenized member invites with expiry.

### 5.2 Projects & Project Delivery Structure
7. **`Project`** (`projects`): Core project entity. Stores `code` (e.g. `PRJ-01`, unique per tenant), `name`, `status` (`DRAFT`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `ARCHIVED`), `holdReason`, `cancellationReason`, `workDisposition`, `handoverDossier`, `clientSignedAt`.
8. **`ProjectMember`** (`project_members`): Staff assigned to project with role definitions.
9. **`ProjectPhase`** (`project_phases`): Delivery phases (Concept, Schematic, DD, GFC, Handover).
10. **`ProjectConsultant`** (`project_consultants`): Consultant contracts attached to project.
11. **`ProjectContractor`** (`project_contractors`): Contractor appointments per project.
12. **`Quotation`** (`quotations`): Contractor quotes and commitment sums.
13. **`ProjectChangeRequest`** (`project_change_requests`): Formal Scope Change Requests with impact analysis and Four-Eyes decision logs.
14. **`ProjectMilestone`** (`project_milestones`): Delivery milestones tracked against timelines.
15. **`ProjectTemplate`** (`project_templates`): Standardized architectural phase and task templates.

### 5.3 Tasks, Deliverables & Workflow Governance
16. **`Task`** (`tasks`): Operational deliverable. Stores `title`, `description`, `status` (`NOT_STARTED`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `CANCELLED`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `assigneeId`, `assignedMemberIds` (JSON multi-assignee array), `reviewerId`, `dueDate`, `version`, `completionDate`.
17. **`TaskChecklistItem`** (`task_checklist_items`): Granular deliverable breakdown assigned to specific members with prerequisite dependency tracking and blocker flags.
18. **`TaskAssignment`** (`task_assignments`): Member assignment metadata with versioned acknowledgement timestamps (`acknowledgedAt`, `acknowledgedVersion`).
19. **`TaskSubmission`** (`task_submissions`): Versioned snapshot submitted for review.
20. **`TaskClarificationRequest`** (`task_clarification_requests`): Submitter clarification or blocker raised on task.
21. **`TaskDeadlineExtensionRequest`** (`task_deadline_extension_requests`): Formal deadline extension gate.
22. **`TaskComment`** (`task_comments`): Structured team feedback on deliverables.
23. **`TaskActivityHistory`** (`task_activity_history`): Immutable audit trail of every status transition, review decision, and assignment modification.

### 5.4 Drawings, Revisions & Documents
24. **`Document`** (`documents`): Root architectural drawing or document container. Stores `drawingNumber` (e.g. `A-101`), `title`, `category` (`ARCHITECTURAL`, `STRUCTURAL`, `MEP`, `INTERIOR`, `SPECIFICATION`), `currentRevision`.
25. **`DocumentVersion`** (`document_versions`): Immutable drawing revisions ($R_0, R_1, R_2$) with file hashes, upload metadata, and approval statuses (`PENDING`, `APPROVED`, `REJECTED`, `SUPERSEDED`).
26. **`DrawingApproval`** (`drawing_approvals`): Formal Four-Eyes sign-off records with GFC release stamps.
27. **`DrawingTransmittal`** (`drawing_transmittals`): Official transmittal packages issued to clients and contractors.
28. **`DrawingTransmittalItem`** (`drawing_transmittal_items`): Individual drawing versions bundled inside a transmittal.

### 5.5 Site Visits & Geofence GPS Inspections
29. **`SiteVisit`** (`site_visits`): Master inspection log. Stores `operationalState` (`SCHEDULED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`), `scheduledTime`, `reviewDecision` (`PENDING`, `AUDITED_VALID`, `AUDITED_FLAGGED`), `notes`.
30. **`SiteVisitTrackingEvent`** (`site_visit_tracking_events`): Spatial verification breadcrumbs storing GPS latitude, longitude, calculated Haversine distance, accuracy in meters, and geofence assessment (`WITHIN_RADIUS`, `OUTSIDE_RADIUS`, `UNVERIFIABLE`).
31. **`SiteIssue`** (`site_issues`): Field snags and safety hazards flagged during visits.
32. **`SiteIssueComment`** (`site_issue_comments`): Contractor remediation notes on snags.

### 5.6 Leave, Attendance & Two-Way Sync
33. **`StudioLeaveRequest`** (`studio_leave_requests`): Master leave and hourly permission record. Stores `startDate`, `endDate`, `startMinutes`, `endMinutes`, `totalMinutes`, `days`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `leaveType` (`CASUAL`, `SICK`, `EMERGENCY`, `ANNUAL`, `HALF_DAY`, `HOURLY`), `sourceSystem` (`STUDIO_OS`, `GOOGLE_SHEETS`), `sourceRecordId`.
34. **`StudioLeaveBalance`** (`studio_leave_balances`): Yearly leave quotas and consumed days.
35. **`StudioSyncConfig`** (`studio_sync_configs`): Configuration for Google Sheets sync (`sheetId`, `sheetTabName`, `webhookUrl`, `isEnabled`, `lastSyncAt`).

### 5.7 Payroll & Financial Governance
36. **`StudioPayrollPeriod`** (`studio_payroll_periods`): Monthly salary computation period. Stores `periodKey` (`YYYY-MM`), `isLocked` (financial freeze), `totalDisbursed`.
37. **`StudioPayrollRecord`** (`studio_payroll_records`): Individual employee salary slip breakdown (base salary, allowances, LOP deductions, net pay).
38. **`Budget`** (`budgets`): Project financial budget envelopes.
39. **`BudgetItem`** (`budget_items`): Line item breakdown per trade.
40. **`Expense`** (`expenses`): Actual incurred studio expenditures.
41. **`FeeMilestone`** (`fee_milestones`): Contractual architectural fee stages.
42. **`MilestonePayment`** (`milestone_payments`): Client fee collection receipts.

### 5.8 Communications, Reminders & Audit Logs
43. **`StudioEmailOutbox`** (`studio_email_outbox`): Transactional email queue with idempotency keys and retry counters.
44. **`ReminderLog`** (`reminder_logs`): Scheduled deadline reminder dispatches.
45. **`AuditLog`** (`audit_logs`): Append-only tenant security audit trail.
46. **`CustomFieldDefinition`** (`custom_field_definitions`): Dynamic studio metadata schemas.

---

## 6. Local Development & Operational Runbook

### 6.1 Prerequisites
* Node.js `20.x` or `22.x`
* MySQL `8.0+` running locally on port `3306`
* Local database created: `CREATE DATABASE studio_os_db;`

### 6.2 Environment Configuration (`.env`)
```env
DATABASE_URL="mysql://root:Saksham%40123@localhost:3306/studio_os_db?connection_limit=25&pool_timeout=20"
JWT_SECRET="studio_super_secret_jwt_key_2026_production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_SHEETS_LEAVE_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbyzqlxv43RAdfl-R0r1MSjCXtODP80J5W0pUSvYpoayXlvyemivDUA737ZQLaQAEdmy8w/exec"
```

### 6.3 Setup & Startup Commands
```powershell
# 1. Install Dependencies
npm install

# 2. Database Schema Sync
npx prisma db push

# 3. Seed Workspaces & Administrative Accounts
npm run db:seed

# 4. Global Typecheck
npx tsc --noEmit

# 5. Start Development Server (Webpack Junction-Safe Mode)
npm run dev
```

### 6.4 Verification Credentials
* **Workspace URL:** `http://localhost:3000/w/100percentdesign`
* **Principal Architect / Owner:** `EMP-001` (`designadmin08@gmail.com`) | Password: `Password123!`
* **Co-Owner / Partner:** `EMP-002` | Password: `Password123!`
* **Studio Administrator:** `EMP-003` | Password: `Password123!`
* **Project Architects:** `EMP-004`, `EMP-005` | Password: `Password123!`
