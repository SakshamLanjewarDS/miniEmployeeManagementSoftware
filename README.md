# 100% DESIGN Studio — Multi-Tenant Architecture Project Management Platform

A complete, production-grade, multi-tenant SaaS employee and architecture project management application built for **100% DESIGN Studio** (and scalable to multiple architectural practices).

Built with **Next.js App Router (React 19, TypeScript)**, **MySQL 5.7+ / 8.0+**, **Prisma ORM**, and **Tailwind CSS**.

> 📖 **Comprehensive Documentation**: For the exhaustive technical manual, ERD diagrams, API route specifications, RBAC matrix, and mathematical formulas, please see [**PROJECT_DOCUMENTATION.md**](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/PROJECT_DOCUMENTATION.md).

---

## 🏛 Key Capabilities & Workflows

1. **Multi-Tenant SaaS Architecture & Isolation**:
   - Application-enforced logical tenant isolation (`tenant_id` on every tenant-owned entity).
   - Canonical workspace routing (`/w/[workspaceSlug]/...`).
   - Distinct customer organizations (seeded with `100percentdesign` and `apex-studio`).
   - Isolated employee IDs and project codes across tenants (e.g. `EMP-001` in 100% DESIGN vs. Apex Studio resolve to distinct identities).

2. **Role-Based Access Control (RBAC) & Central Server Authorization**:
   - **OWNER (Partner / Boss)**: Full company-wide governance across all modules (employees, projects, finances, drawings, contracts). Dual Partners retain separate accounts, shared company-wide privileges, personal task views, and partner-to-partner task delegation without a "Boss-switch" control.
   - **ADMIN (Administrator)**: Full operational control across projects, tasks, employees, directories, and drawings; financial access gated by `hasFinanceAccess`.
   - **EMPLOYEE**: Personal task dashboard, assigned task execution, assigned project context, read-only Contractor & Consultant directory access, and collaborative drawing contributions within assigned projects.
   - Server-enforced authorization across every API route, upload handler, file stream, and data service.

3. **Employee Administration & Lifecycle Protection**:
   - Search, role, and active/inactive status filtering with pagination.
   - Add Employee and Edit Employee forms with secure initial password setup.
   - **Last Active OWNER Protection**: The last remaining active Owner cannot be demoted, deactivated, or deleted.
   - **Historical Attribution Preservation**: Employees with associated tasks, drawings, site visits, approvals, or financial records cannot be hard deleted; deactivation/archival preserves full audit history.
   - Immediate session invalidation upon deactivation; reactivation does not restore revoked sessions.

4. **Professional Employee Task Dashboard**:
   - Timezone-aware personal greeting and date header.
   - 5 interactive summary metric cards: *Due Today*, *Overdue*, *In Progress*, *Waiting for Review*, and *Completed*.
   - **Independent Filter Dimensions**: Due-date categories (*Today*, *Upcoming*, *Overdue*) and status categories (*In Progress*, *In Review*, *Completed*) operate independently and overlap accurately. Overdue excludes completed and cancelled tasks.
   - Interactive List and Kanban board views with smooth drag-and-drop.
   - Task detail slide-over drawer with project context, checklist management, rich comments feed, and chronological activity history.
   - **Field-Level Protection**: Employees can only update progress, descriptions, checklists, and comments on their assigned tasks. Protected fields (assignee, priority, due date, phase) are locked against non-admin edits.
   - **No Self-Approval Gate**: Assignees submitting work cannot approve their own deliverables (`IN_REVIEW` → `COMPLETED` requires an independent reviewer).
   - Reviewer change request requires a mandatory correction comment.
   - Direct completion override requires Partner/Admin authority and an audited reason.

5. **Contractor & Consultant Directories**:
   - Dedicated Contractor and Consultant directory pages with search, trade/discipline filters, and contact details.
   - **Many-to-Many (M:N) Project Relationships**: Professionals associate across multiple projects; projects connect multiple trade specialists.
   - **Employee Read-Only Access & Financial Shielding**: Employees view basic directory details and assigned project links. Quotations, commercial amounts, and contract files are completely redacted from non-finance roles.
   - Strict separation between contractor quotations (commitments) and recorded project expenses to prevent double-counting.

6. **Collaborative Drawing & Blueprint Management**:
   - Company-wide Drawing Library for Owners/Admins; assigned-project library for Employees.
   - Dedicated **Drawings** tab within project workspaces.
   - **Atomic Revision Tracking ($R_0, R_1, R_2\dots$)**: Sequential revision allocation in atomic transactions preventing duplicate revision numbers.
   - **Non-Inheriting Approvals**: A new revision starts in `DRAFT` and never inherits previous approvals. The interface displays both the *Latest Revision* and *Latest Approved Revision* simultaneously.
   - **Approval Workflow**: Draft → Submitted for Review → Internally Approved or Changes Requested (with mandatory architectural correction comment).
   - **No Self-Approval Gate**: Drafters cannot approve their own drawing revisions.
   - **Client Approval Evidence**: Owners/Admins record client approvals with explicit verification evidence (e.g. email reference, physical stamp) and timestamp.
   - Draft deletion allowed only for unsubmitted drafts without dependent review history.

7. **Safe Private Storage & Protected File Streaming**:
   - File uploads stored in private tenant-isolated storage (`storage/uploads/tenant-[id]/`).
   - Extension and MIME validation (PDF, DWG, DXF, JPG, PNG, WebP) with SHA-256 checksum calculation.
   - Protected streaming via `/api/storage/files/[fileId]` requiring authenticated tenant context, assigned project membership for drawings, and finance authority for commercial quotations.
   - In-browser interactive sheet viewer for PDF and architectural images.

8. **Site Visits & Geolocation Check-In**:
   - Single-snapshot location capture at Check-In and Check-Out (`enableHighAccuracy: true`).
   - Server-calculated Haversine distance and geofence evaluation (`WITHIN_RADIUS`, `OUTSIDE_RADIUS`, `UNCERTAIN`, `LOCATION_UNAVAILABLE`).
   - Strict visit concurrency lock: maximum 1 active visit per employee studio-wide.
   - CSV export with CSV Formula Injection Protection (`=`, `+`, `-`, `@` escaped).

---

## 🔑 Admin Account & Credentials

All dummy data and test users have been cleared. The studio is initialized with a single primary Administrator account:

### Workspace: 100% DESIGN Studio (`/w/100percentdesign/login`)
| Employee Name | Employee ID | Email | Role | Designation |
|---|---|---|---|---|
| **Saksham Lanjewar** | `EMP-001` | `admin@100percentdesign.in` | `OWNER` (Admin & Boss Governance) | Studio Administrator & Owner |

* **Login ID**: `admin@100percentdesign.in`, `EMP-001`, or `saksham`
* **Password**: `StudioPassword2026!` (or `Saksham@123`)
* **Note**: As `OWNER`, you have full permissions to generate your Boss and Employees directly from the **Team** tab.


---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- MySQL 5.7+ or 8.0+

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your database connection string:
```ini
DATABASE_URL="mysql://root:YourPassword@localhost:3306/studio_os_db"
SESSION_SECRET="your-64-character-cryptographic-secret"
APP_DEFAULT_TIMEZONE="Asia/Kolkata"
APP_DEFAULT_CURRENCY="INR"
```

### 3. Database Push & Seed
```bash
# Push schema to MySQL
npm run db:push

# Seed two isolated tenants with projects, tasks, sites, drawings, contractors, and members
npm run db:seed
```

### 4. Run Automated Test Suite
```bash
# Run all automated tests (tenancy, auth, geofence, concurrency, workflows, directories, drawings, storage)
npm run test:all
```

### 5. Start Development Server
```bash
npm run dev
```
Navigate to: [http://localhost:3000/w/100percentdesign/login](http://localhost:3000/w/100percentdesign/login)

---

## 🧪 Automated Test Suite & Verification Results

All 36 automated tests across 9 test suites execute cleanly with 100% pass rate:

```
> 100percentdesign-os@1.0.0 test:all
> node --import tsx --test tests/*.test.ts

▶ Phase 4, 5 & 6: Full Role Authorization, Task Dashboard, Directories & Collaborative Drawings
  ▶ 1. Central Server Authorization & Employee Administration
    ✔ OWNER & ADMIN can access employee list with full metadata; Employees get sanitized view (18.7ms)
    ✔ EMPLOYEE cannot create new employees (Server-side 403 Forbidden) (1.7ms)
    ✔ ADMIN cannot create or promote anyone to OWNER (Dual Partner protection) (4.5ms)
    ✔ Last active OWNER protection: cannot demote, deactivate, or delete the last OWNER (13.7ms)
    ✔ Historical attribution preservation: cannot delete employee with associated tasks/visits (10.2ms)
    ✔ Clean removal succeeds only for unreferenced members and revokes active sessions (198.3ms)
  ✔ 1. Central Server Authorization & Employee Administration (249.5ms)
  ▶ 2. Employee Task Dashboard & Field Restrictions
    ✔ Employees only view tasks assigned to them (53.3ms)
    ✔ Employees CAN update permitted fields: description, checklist, comments (38.3ms)
    ✔ Employees CANNOT modify protected task fields (priority, dueDate, phaseId) (17.5ms)
    ✔ Employees CANNOT update tasks assigned to other employees (15.1ms)
    ✔ Workflow & Self-Approval Prevention: Assignee cannot approve their own deliverable (62.7ms)
    ✔ Direct completion override requires Admin/Partner authority and audit reason (38.8ms)
  ✔ 2. Employee Task Dashboard & Field Restrictions (235.3ms)
  ▶ 3. Contractor & Consultant Directories
    ✔ Employees are DENIED write access to Contractor & Consultant directories (1.8ms)
    ✔ OWNER/ADMIN can create contractors & consultants with M:N project associations (25.6ms)
    ✔ Commercial quotation data and amounts are completely hidden from non-finance Employees (15.2ms)
  ✔ 3. Contractor & Consultant Directories (43.3ms)
  ▶ 4. Drawing & Blueprint Management
    ✔ Employees CANNOT add drawings to projects they are not assigned to (3.5ms)
    ✔ Employees CAN create drawings on assigned projects (Atomic R0 initial revision) (20.7ms)
    ✔ Drawing Approval Workflow: Drafter CANNOT approve their own revision (No Self-Approval) (49.6ms)
    ✔ Partner/Admin approves R0; New Revision R1 is uploaded and DOES NOT inherit approval (53.9ms)
    ✔ Changes Requested requires mandatory architectural correction comment (30.4ms)
    ✔ Draft deletion allowed only for unsubmitted drafts without history (25.4ms)
    ✔ Client Approval Evidence: Only Owner/Admin can record client approval with evidence (11.5ms)
  ✔ 4. Drawing & Blueprint Management (196.1ms)
  ▶ 5. Safe Private Storage & Cross-Tenant File Isolation
    ✔ Rejects unsafe file formats (e.g. .exe, .sh, .bat) (0.5ms)
    ✔ Cross-Tenant storage isolation: Tenant 2 cannot access private files of Tenant 1 (1.9ms)
  ✔ 5. Safe Private Storage & Cross-Tenant File Isolation (2.7ms)
  ▶ 6. Session Revocation on Deactivation
    ✔ Deactivation immediately revokes active session; reactivation does not restore it (344.3ms)
  ✔ 6. Session Revocation on Deactivation (344.6ms)
✔ Phase 4, 5 & 6: Full Role Authorization, Task Dashboard, Directories & Collaborative Drawings (1151.2ms)
▶ Phase 2 & Phase 3: Site Visits Geofence, Concurrency, and Task Workflow Tests
  ✔ 1. Haversine Distance Calculation & Geofence Heuristics (2.7ms)
  ✔ 2. Concurrency Lock: Exactly 1 active visit per employee at any time (78.2ms)
  ✔ 3. Task Workflow & Forbidden Self-Approval (31.8ms)
  ✔ 4. Formula Injection Protection on CSV Export (15.4ms)
✔ Phase 2 & Phase 3: Site Visits Geofence, Concurrency, and Task Workflow Tests (304.3ms)
▶ Phase 1: SaaS Foundation & Multi-Tenant Isolation Tests
  ✔ 1. Company-scoped Employee ID Login (EMP-001 collision resolves to distinct users) (315.9ms)
  ✔ 2. Work Email Login for Admin & Boss (288.3ms)
  ✔ 3. Team Structure: Exactly 1 Boss, 1 Admin, and 3 Employees in 100% DESIGN (16.0ms)
  ✔ 4. Cross-Tenant Data Isolation (Tenant A cannot see Tenant B records) (15.9ms)
  ✔ 5. Account Deactivation immediately invalidates active sessions (181.2ms)
  ✔ 6. Authorization Gate: Non-admin employees cannot create employees (0.9ms)
  ✔ 7. Employee Task Delegation & Editing Functionality (106.7ms)
✔ Phase 1: SaaS Foundation & Multi-Tenant Isolation Tests (974.4ms)

ℹ tests 36
ℹ suites 9
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2440.3ms
```
