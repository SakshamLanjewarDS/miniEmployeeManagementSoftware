# 100% DESIGN Studio OS — Master Project Specification & Expansion Blueprint

**Project Name:** 100% DESIGN Studio OS (`100percentdesign-os`)  
**Domain:** Multi-Tenant Architecture & Design Studio Operations Management Platform  
**Current Version:** `1.0.0` (Production Hardened — Phases 0 through 6 Complete)  
**Primary Repository:** `c:\Users\ASUS\Desktop\miniEmployeeManagementSoftware`  
**Target Environment:** Node.js 20+, Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Prisma ORM 6.4, MySQL 8.0+

---

## 1. Executive Vision & Problem Space

Architectural studios and interior design practices face operational complexities that generic project management tools (Jira, Asana, Monday, ClickUp) fail to address:
1. **Field vs. Studio Operations:** Architects and site engineers frequently conduct physical site visits where GPS signals may degrade inside concrete basements or under metallic canopies. Standard tools either lack geolocation verification or drain device batteries with continuous tracking.
2. **Strict Revision Control for Drawings:** Architectural drawings evolve through explicit revisions ($R_0, R_1, R_2\dots$). An approval for revision $R_0$ must never implicitly carry forward to $R_1$.
3. **Four-Eyes Verification (No Self-Approval):** In professional design practice, the architect who prepares a drawing or task cannot approve their own deliverable. Strict reviewer gates must prevent conflict of interest.
4. **Commitment vs. Incurred Expense Segregation:** Contractor quotations represent contractual commitments, not actual money paid. Mixing them with incurred expenses distorts studio cash flow and project profitability.
5. **Multi-Partner Studio Ownership:** Architecture practices frequently operate with co-partners. Both require full Owner permissions, independent task views, and cross-delegation.
6. **Multi-Tenant SaaS Foundation:** The application is architected from the database layer up with logical isolation (`tenantId`) so multiple independent studios run securely on a shared infrastructure.

---

## 2. Technology Stack & Architectural Principles

### 2.1 Core Stack Matrix

| Layer | Technology | Version / Configuration | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.7` (`--webpack` mode) | Hybrid SSR/CSR, route groups, layout streaming |
| **Language** | TypeScript | `5.x` (Strict mode) | Type safety across server and client |
| **UI Library** | React | `19.2.8` | Modern concurrent rendering, Server & Client Components |
| **Styling** | Tailwind CSS & PostCSS | `@tailwindcss/postcss` `^4.0` | High-performance atomic styling |
| **ORM / Database** | Prisma Client & CLI | `6.4.1` with MySQL 8.0+ | Strongly-typed schema, migrations, connection pool |
| **Authentication** | `jose` + `bcryptjs` | `jose ^6.2`, `bcryptjs ^3.0` | Stateless JWTs + DB-backed revocable sessions |
| **Validation** | Zod | `^4.6.5` | Strict schema validation for API inputs |
| **Icons** | Lucide React | `^1.48.0` | Consistent, accessible iconography |
| **PWA & Offline** | Web Manifest + Service Worker | Native PWA (`manifest.ts`) | Installable desktop/mobile experience |

### 2.2 Golden Rules for Development

1. **Mandatory Tenant Isolation:** Every tenant-owned database table must include a `tenantId` column. Every database query, update, and deletion **must** explicitly filter by `tenantId`. Never query tenant data by primary key alone.
2. **Composite Keys for Natural Identifiers:** Multi-tenant entities use composite unique constraints (e.g. `@@unique([tenantId, code])` for projects, `@@unique([tenantId, employeeId])` for employees).
3. **No Self-Approval Enforcement:** A task assignee or document uploader cannot be the approver for that same item. Reviewer $\neq$ Submitter.
4. **Formula Injection Sanitization:** Any export to CSV must sanitize formula initiation characters (`=`, `+`, `-`, `@`, `\t`, `\r`) by prefixing with a single quote (`'`).
5. **Decimal Precision for Money:** Financial amounts (budgets, fees, payments, expenses, quotations) must use Prisma `Decimal(15, 2)` to prevent floating-point rounding errors.

---

## 3. Current Directory Structure & Core Modules

```
miniEmployeeManagementSoftware/
├── .env / .env.example              # Database URLs, JWT secrets, application secrets
├── prisma/
│   └── schema.prisma                # Exhaustive multi-tenant Prisma schema (30+ models)
├── scripts/
│   └── seed.ts                      # Multi-tenant studio database seed (Tenants: "100-design", "studio-alpha")
├── src/
│   ├── app/
│   │   ├── api/                     # Next.js Route Handlers
│   │   │   ├── admin/               # Studio administration, tenant export, quotas
│   │   │   ├── auth/                # Login, logout, session verification
│   │   │   ├── consultants/         # Consultant CRUD & project linking
│   │   │   ├── contractors/         # Contractor CRUD & quotations
│   │   │   ├── csv/                 # Filtered and sanitized CSV export engine
│   │   │   ├── custom-fields/       # Extensible field definitions
│   │   │   ├── drawings/            # Document upload & revision approval routes
│   │   │   ├── employees/           # Employee onboarding, updates, status toggles
│   │   │   ├── health/              # Liveness and readiness health checks
│   │   │   ├── notifications/       # Studio notification list, mark-as-read
│   │   │   ├── projects/            # Project CRUD, phases, members, finance
│   │   │   ├── storage/             # Private file upload/download proxy
│   │   │   ├── tasks/               # Tasks, checklists, comments, review gates
│   │   │   └── visits/              # Geofenced check-in/out, reviews, logs
│   │   ├── w/[workspaceSlug]/       # Workspace-scoped routing
│   │   │   ├── login/               # Workspace login page (Dual: Employee ID / Email)
│   │   │   └── (app)/               # Authenticated App Shell with Sidebar & Topbar
│   │   │       ├── layout.tsx       # Global layout fetching TenantContext
│   │   │       ├── tasks/           # Studio / Personal Kanban & Task Management
│   │   │       ├── projects/        # Project Portfolio & Phase Breakdown
│   │   │       ├── visits/          # Site Visits & GPS Geofence Check-In Console
│   │   │       ├── drawings/        # Architectural Drawings & Revision Approvals
│   │   │       ├── finance/         # Budgets, Fee Milestones, Payments, Expenses
│   │   │       ├── team/            # Employee Directory & Role Admin
│   │   │       ├── contractors/     # Contractor Directory & Quotations
│   │   │       ├── consultants/     # Consultant Directory & Project Assignments
│   │   │       ├── directory/       # Client Directory & Client Profiles
│   │   │       └── csv-hub/         # Studio Data Export & Reporting Center
│   │   ├── globals.css              # Global styles & Tailwind 4 setup
│   │   └── manifest.ts              # Web Application PWA Manifest
│   ├── components/
│   │   ├── layout/                  # AppSidebar, AppTopbar, NotificationDropdown
│   │   ├── pwa/                     # PwaInstallButton, offline banner
│   │   ├── ui/                      # Shared reusable UI primitives (Modals, Badges)
│   │   └── ...                      # Domain-specific components
│   └── server/
│       ├── auth/                    # Session management, bcrypt verification, OTP
│       ├── db/                      # Global Prisma client singleton
│       ├── modules/                 # Scoped domain service layer (business logic)
│       └── tenancy/                 # TenantContext, RBAC guards, assertion helpers
└── tests/                           # Multi-tenant isolation & security test suite
```

---

## 4. Current Pages & Feature Inventory

| Route Path | View Component | Core Functionality & Capabilities |
|---|---|---|
| `/w/[slug]/login` | `LoginPage` | Dual-identifier login: Company-scoped Employee ID or Email + Password. |
| `/w/[slug]/tasks` | `TasksClientView` | Task creation, Kanban boards, status transitions, checklists, activity history, four-eyes review gate, task delegation, and Owner/Admin/Creator task deletion with audit trails. |
| `/w/[slug]/projects` | `ProjectsClientView` | Project creation, phase breakdown (Concept, Schematic, DD, GFC, Handover), client/team/consultant assignment. |
| `/w/[slug]/visits` | `VisitsClientView` | Site visit scheduling, Haversine GPS geofence check-in/out, one-active-visit concurrency lock, supervisor review. |
| `/w/[slug]/drawings` | `DrawingsClientView` | Drawing register ($R_0, R_1, R_2$), private file attachment, revision approval workflow, supersession history. |
| `/w/[slug]/finance` | `FinanceClientView` | Category-wise project budgets, client fee milestones, milestone payment logging, studio expense approvals. |
| `/w/[slug]/team` | `TeamClientView` | Studio employee directory, employee ID assignment, department/designation, role adjustment, account activation/deactivation. |
| `/w/[slug]/contractors`| `ContractorsClientView`| Contractor directory, trades, project assignments, contractor quotation tracking per revision. |
| `/w/[slug]/consultants`| `ConsultantsClientView`| Engineering consultants (Structural, MEP, HVAC, Landscape), scopes, project associations. |
| `/w/[slug]/directory` | `DirectoryClientView` | Client directory, company names, contact info, linked projects. |
| `/w/[slug]/csv-hub` | `CsvHubClientView` | Export studio data (Employees, Tasks, Visits, Finance, Drawings) into CSV with formula injection defense. |

### 4.1 Universal Voice-to-Text & Grammar Auto-Correction Engine

The platform includes a universal input assistant active across **every text field, textarea, and form** in the entire application:
* **Real-Time Voice-to-Text:** Powered by the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Automatically attaches to any focused text field, streams live speech transcripts directly into the input, and supports spoken punctuation commands (`"period"` &rarr; `.`, `"comma"` &rarr; `,`, `"new line"` &rarr; `\n`, `"question mark"` &rarr; `?`, `"colon"` &rarr; `:`).
* **Automatic Grammar, Spelling & Formatting Engine:** Instant client-side engine with server API fallback (`/api/grammar/correct`) that detects and fixes:
  * Common English typos and architectural misspellings (e.g. `recieve` &rarr; `receive`, `archetict` &rarr; `architect`, `structral` &rarr; `structural`).
  * Architecture & engineering terminology casing (e.g. `cad` &rarr; `CAD`, `mep` &rarr; `MEP`, `hvac` &rarr; `HVAC`, `boq` &rarr; `BOQ`, `gfc` &rarr; `GFC`, `r0` &rarr; `R0`).
  * Contractions and apostrophes (`dont` &rarr; `don't`, `cant` &rarr; `can't`, `im` &rarr; `I'm`, `ive` &rarr; `I've`).
  * Sentence capitalization, pronoun `"I"` capitalization, and punctuation spacing normalization.
* **Seamless React Integration:** Uses native prototype property setters and dispatches synthetic `input` and `change` events so React state (`onChange`, `useState`, `react-hook-form`) updates reactively.
* **Global Hotkeys:**
  * <kbd>Ctrl+Shift+V</kbd> / <kbd>Cmd+Shift+V</kbd>: Toggle microphone dictation into the currently focused field.
  * <kbd>Ctrl+Shift+G</kbd> / <kbd>Cmd+Shift+G</kbd>: Run grammar auto-correction on the currently focused field.

## 5. Step-by-Step Guide: How to Add New Features, Pages & Functionality

Follow this standardized workflow whenever adding a new feature or page to maintain multi-tenant isolation, architectural consistency, and security.

### Phase 1: Database Schema Expansion (`prisma/schema.prisma`)
1. Define the model with mandatory `tenantId` and relation to `Tenant`:
   ```prisma
   model MaterialSample {
     id          String   @id @default(uuid())
     tenantId    String
     tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     projectId   String?
     project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
     title       String   @db.VarChar(191)
     brand       String?  @db.VarChar(100)
     status      String   @default("PENDING") @db.VarChar(50)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     @@index([tenantId, status])
     @@map("material_samples")
   }
   ```
2. Add the inverse relation on the `Tenant` model:
   ```prisma
   materialSamples MaterialSample[]
   ```
3. Push schema changes to the MySQL database:
   ```bash
   npm run db:push
   npm run db:generate
   ```

### Phase 2: Domain Service Layer (`src/server/modules/<module-name>/`)
1. Create a dedicated service file (e.g. `src/server/modules/materials/service.ts`).
2. Always accept `TenantContext` as the first argument.
3. Enforce the tenant filter on every query:
   ```typescript
   import { prisma } from "@/server/db/client";
   import { TenantContext, assertTenantAccess } from "@/server/tenancy/context";

   export async function listMaterialSamples(ctx: TenantContext, projectId?: string) {
     return prisma.materialSample.findMany({
       where: {
         tenantId: ctx.tenantId, // MANDATORY
         ...(projectId ? { projectId } : {}),
       },
       orderBy: { createdAt: "desc" },
     });
   }
   ```

### Phase 3: API Route Handler (`src/app/api/<route>/route.ts`)
1. Authenticate using `resolveTenantContextFromRequest`:
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { resolveTenantContextFromRequest } from "@/server/auth/service";
   import { z } from "zod";

   const CreateSchema = z.object({
     title: z.string().min(1).max(191),
     brand: z.string().optional(),
     projectId: z.string().uuid().optional(),
   });

   export async function POST(req: NextRequest) {
     try {
       const ctx = await resolveTenantContextFromRequest(req);
       if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

       const body = await req.json();
       const data = CreateSchema.parse(body);

       // Call domain service
       const item = await createMaterialSample(ctx, data);
       return NextResponse.json({ success: true, data: item });
     } catch (err: any) {
       return NextResponse.json({ error: err.message }, { status: 400 });
     }
   }
   ```

### Phase 4: Create the Next.js Page & Interactive Client View
1. Server Page: `src/app/w/[workspaceSlug]/(app)/materials/page.tsx`
   - Fetches initial data server-side or renders the client view with `workspaceSlug`.
2. Interactive Client View: `src/app/w/[workspaceSlug]/(app)/materials/MaterialsClientView.tsx`
   - Marked `"use client"`.
   - Uses Tailwind CSS v4, Lucide icons, responsive layouts, search/filter bars, and creation modals.

### Phase 5: Register in Sidebar Navigation (`src/components/layout/AppSidebar.tsx`)
1. Add the route to `navItems` with appropriate role restrictions if needed:
   ```typescript
   {
     name: "Material Library",
     href: `/w/${context.tenantSlug}/materials`,
     icon: Package, // Lucide icon
   }
   ```

### Phase 6: Automated Isolation Verification
1. Add a test case in `tests/` ensuring Tenant B cannot access or modify items belonging to Tenant A.
2. Run test suites:
   ```bash
   npm run test:all
   ```

---

## 6. Planned Features & Expansion Roadmap

The following modules represent high-impact features ready to be added to the platform:

### 6.1 Feature Blueprint 1: Client Portal & External Approvals
* **Objective:** Give clients a secure, branded external login or magic-link portal to view design progress, review drawing revisions, and formally sign off.
* **Suggested Route:** `/w/[workspaceSlug]/client-portal` (or `/portal/[clientToken]`)
* **Key Components:**
  * Project progress bar (by phases).
  * Drawing revision gallery with high-resolution PDF previewer.
  * Formal "Approve / Request Changes" client signature dialog with timestamped audit records.
  * Financial overview: Issued fee milestones, pending invoices, and payment receipts.
* **Database Models to add/extend:**
  * `ClientPortalUser`: Email, hashed password or magic token, linked `clientId`, `tenantId`.
  * `ClientApprovalLog`: Exact drawing revision ID, client user ID, IP address, user-agent, digital sign-off comment.

### 6.2 Feature Blueprint 2: Timesheets & Employee Workload Management
* **Objective:** Track billable and non-billable architectural hours per project, monitor burnout, and approve weekly timesheets.
* **Suggested Route:** `/w/[workspaceSlug]/timesheets`
* **Key Components:**
  * Weekly grid entry: Log hours against project, phase, and task with notes.
  * Partner/Manager timesheet approval view (Pending / Approved / Rejected).
  * Studio resource allocation heatmap (showing over-allocated vs under-allocated architects).
* **Database Models to add:**
  * `Timesheet`: `tenantId`, `employeeId`, `weekStartDate`, `status` (`DRAFT`, `SUBMITTED`, `APPROVED`).
  * `TimesheetEntry`: `timesheetId`, `projectId`, `phaseId`, `taskId`, `date`, `hours`, `isBillable`, `notes`.

### 6.3 Feature Blueprint 3: Interactive Gantt Chart & Milestone Timeline
* **Objective:** Visual scheduling engine showing project phases, milestone target dates, critical paths, and task dependencies.
* **Suggested Route:** `/w/[workspaceSlug]/projects/[projectId]/timeline` or `/w/[workspaceSlug]/timeline`
* **Key Components:**
  * Interactive Gantt chart (zoom by day, week, month).
  * Drag-and-drop phase date adjustments with automatic dependency shifting.
  * Milestone markers (Client approval, Municipal submission, Tender issue, Site handover).
  * Baseline vs Actual progress comparison.

### 6.4 Feature Blueprint 4: FF&E Specification & Material Sample Library
* **Objective:** Manage Furniture, Fixtures & Equipment (FF&E), material finishes (tiles, veneers, hardware, sanitary ware), vendor quotes, and physical sample approvals.
* **Suggested Route:** `/w/[workspaceSlug]/materials`
* **Key Components:**
  * Material board categorized by room/zone (e.g. Master Bedroom, Lobby, Façade).
  * Specification sheets: Brand, Model, Finish, Unit Rate, Vendor contact, Lead time.
  * Sample approval tracking: Sample Requested $\rightarrow$ Received at Studio $\rightarrow$ Client Approved $\rightarrow$ Ordered.
* **Database Models to add:**
  * `MaterialCategory`: Flooring, Wall Finishes, Lighting, Hardware, Plumbing, Fabrics.
  * `MaterialItem`: Brand, code, specs, unit cost, preferred vendor ID, photo attachment.
  * `ProjectMaterialSpec`: `projectId`, `materialItemId`, `roomLocation`, `quantity`, `approvalStatus`.

### 6.5 Feature Blueprint 5: Studio Equipment & Tool Asset Checkout
* **Objective:** Manage shared architectural tools: Total Station laser distance meters, drone cameras, VR headsets, lux meters, sample suitcases.
* **Suggested Route:** `/w/[workspaceSlug]/assets`
* **Key Components:**
  * Asset catalog with serial numbers, condition status, and calibration dates.
  * Quick Check-Out / Check-In workflow for site visits.
  * Maintenance schedule reminders and damage logs.

### 6.6 Feature Blueprint 6: Automated Invoicing & Tax (GST) Engine
* **Objective:** Convert completed fee milestones into downloadable GST-compliant PDF tax invoices with automated payment tracking.
* **Suggested Route:** `/w/[workspaceSlug]/finance/invoices`
* **Key Components:**
  * One-click "Generate Invoice" from approved `FeeMilestone`.
  * Customizable invoice layout: Studio logo, GSTIN, client billing address, SAC/HSN codes.
  * Payment status tracking (Unpaid, Overdue, Partially Paid, Settled).
  * Automated email reminders for pending milestone dues.

### 6.7 Feature Blueprint 7: Real-Time Notifications & WebSocket Live Feed
* **Objective:** Replace manual page reloads with instant in-app alerts for critical studio events.
* **Events to Stream:**
  * A colleague assigns a new task or adds a comment.
  * An architect checks in at a construction site.
  * A contractor submits a revised quotation.
  * A drawing revision is approved or rejected.
* **Architecture:** Server-Sent Events (SSE) or WebSockets via Next.js route handler connecting to the existing `Notification` and `NotificationOutbox` models.

### 6.8 Feature Blueprint 8: Offline-First PWA Mode for Remote Site Visits
* **Objective:** Enable site architects to capture notes, checklists, and photos even in basement levels or remote sites with zero connectivity.
* **Key Components:**
  * IndexedDB local queue for offline site visit check-ins and photo capture.
  * Background synchronization when network connectivity is restored.
  * Cached drawing viewer for offline review on iPad/tablet.

### 6.9 Feature Blueprint 9: AI Studio Assistant & Smart Estimator
* **Objective:** Leverage LLM capabilities to streamline architectural documentation.
* **Key Components:**
  * Audio/Voice to Site Visit Report: Convert spoken site observations into formatted structured inspection reports.
  * Scope-to-Tasks Generator: Input project brief and auto-generate standard architectural tasks across phases.
  * Drawing Discrepancy Flagging: Automated comparison of drawing metadata against consultant specifications.

---

## 7. Role-Based Access Control (RBAC) Quick Reference

| Action / Module | `OWNER` | `ADMIN` | `PROJECT_MANAGER` | `EMPLOYEE` |
|---|:---:|:---:|:---:|:---:|
| Studio Settings, Plan & Subscriptions | ✅ | ❌ | ❌ | ❌ |
| Manage Team Members & Roles | ✅ | ✅ | ❌ | ❌ |
| Create / Edit Projects & Phases | ✅ | ✅ | ✅ | View Only |
| Assign Tasks & Approve Work | ✅ | ✅ | ✅ | Self Only (No self-approval) |
| Delete Task Deliverable | ✅ | ✅ | Creator Only | Creator Only |
| Site Visit Check-in/out | ✅ | ✅ | ✅ | ✅ |
| Site Visit Supervisor Review | ✅ | ✅ | ✅ | ❌ |
| Upload Drawing Revisions | ✅ | ✅ | ✅ | ✅ |
| Approve Drawing Revisions | ✅ | ✅ | ✅ | ❌ |
| Manage Financial Budgets & Fees | ✅ | ✅ (or with flag) | ❌ | ❌ |
| View Financial Ledger | ✅ | ✅ (or with flag) | ❌ | ❌ |
| Contractor Quotation Acceptance | ✅ | ✅ | ✅ | ❌ |
| CSV Data Hub Export | ✅ | ✅ | View Only | ❌ |

---

## 8. Development & Operational Commands

### 8.1 Local Development
```bash
# Start development server with webpack
npm run dev

# Open in browser:
# http://localhost:3000/w/100-design/login
```

### 8.2 Database Operations
```bash
# Push schema updates without losing existing tenant data
npm run db:push

# Re-generate Prisma Client types
npm run db:generate

# Re-seed database with default studios (100% DESIGN & Studio Alpha)
npm run db:seed
```

### 8.3 Quality & Test Verification
```bash
# Run multi-tenant isolation and security test suite
npm run test

# Run all automated test suites
npm run test:all

# Production build verification
npm run build
```

---

## 9. Seed Workspaces & Test Accounts

The following credentials are generated by `scripts/seed.ts` for development and testing:

### Workspace 1: `100-design` (100% DESIGN Studio)
* **Partner / Co-Owner 1:**
  * Employee ID: `EMP-001` (or email: `owner@100percentdesign.com`)
  * Role: `OWNER`
  * Password: `Password123!`
* **Partner / Co-Owner 2:**
  * Employee ID: `EMP-002` (or email: `partner@100percentdesign.com`)
  * Role: `OWNER`
  * Password: `Password123!`
* **Project Manager:**
  * Employee ID: `EMP-003` (or email: `pm@100percentdesign.com`)
  * Role: `PROJECT_MANAGER`
  * Password: `Password123!`
* **Site Architect / Employee:**
  * Employee ID: `EMP-004` (or email: `architect@100percentdesign.com`)
  * Role: `EMPLOYEE`
  * Password: `Password123!`

### Workspace 2: `studio-alpha` (Studio Alpha Design Partners)
* **Owner:**
  * Employee ID: `ALPHA-001` (or email: `owner@studioalpha.com`)
  * Role: `OWNER`
  * Password: `Password123!`

---

## 10. Summary & Expansion Workflow

When ready to implement new features:
1. Refer to **Section 5 (Step-by-Step Guide)** for the standard 6-phase implementation lifecycle.
2. Select a feature from **Section 6 (Planned Features & Expansion Roadmap)** or define your custom module following the database and tenancy rules.
3. Ensure all new queries adhere strictly to **Section 2.2 (Golden Rules for Development)**.
