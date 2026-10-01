# 100% DESIGN Studio OS — Complete Technical Blueprint & Project Documentation

**A Multi-Tenant SaaS Employee and Architecture Project Management Platform**

---

## 📑 Table of Contents

1. [Executive Summary & System Vision](#1-executive-summary--system-vision)
2. [Technology Stack & System Architecture](#2-technology-stack--system-architecture)
   - [Architectural Topology](#architectural-topology)
   - [Technology Stack Matrix](#technology-stack-matrix)
   - [Architectural Decision Records (ADRs)](#architectural-decision-records-adrs)
3. [Multi-Tenant SaaS Foundation & Isolation Design](#3-multi-tenant-saas-foundation--isolation-design)
   - [Logical Tenant Isolation Model](#logical-tenant-isolation-model)
   - [Workspace Routing & Tenant Resolution](#workspace-routing--tenant-resolution)
   - [Composite Unique Keys & Anti-Collision Guards](#composite-unique-keys--anti-collision-guards)
4. [Identity, Authentication & Session Lifecycle](#4-identity-authentication--session-lifecycle)
   - [Dual Identifier Login Architecture](#dual-identifier-login-architecture)
   - [Server-Managed Revocable Sessions](#server-managed-revocable-sessions)
   - [Dual Partner (Multi-Owner) Architecture](#dual-partner-multi-owner-architecture)
   - [Session Revocation & Kill Switch](#session-revocation--kill-switch)
5. [Role-Based Access Control (RBAC) & Permission Matrix](#5-role-based-access-control-rbac--permission-matrix)
   - [Role Definitions](#role-definitions)
   - [Granular Permission Grid](#granular-permission-grid)
6. [Complete Database Schema & Entity-Relationship Model](#6-complete-database-schema--entity-relationship-model)
   - [Entity-Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
   - [Comprehensive Entity & Data Model Catalog](#comprehensive-entity--data-model-catalog)
7. [Core Business Modules & Workflow Engines](#7-core-business-modules--workflow-engines)
   - [Task Management Engine & No Self-Approval Gate](#task-management-engine--no-self-approval-gate)
   - [Site Visits & Geolocation Check-In Engine](#site-visits--geolocation-check-in-engine)
   - [Architectural Drawings & Revision-Locked Approvals](#architectural-drawings--revision-locked-approvals)
   - [Project Financials, Ledger & Commitments Separation](#project-financials-ledger--commitments-separation)
   - [Team Directory & Employee Administration](#team-directory--employee-administration)
8. [API Route Catalog & Endpoint Specification](#8-api-route-catalog--endpoint-specification)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Employee Administration Endpoints](#employee-administration-endpoints)
   - [Task Management Endpoints](#task-management-endpoints)
   - [Site Visit & Geolocation Endpoints](#site-visit--geolocation-endpoints)
9. [UI Component Hierarchy & Frontend Architecture](#9-ui-component-hierarchy--frontend-architecture)
   - [Design System & Visual Tokens](#design-system--visual-tokens)
   - [Layout & AppShell](#layout--appshell)
   - [Client Views & Interactive Experiences](#client-views--interactive-experiences)
10. [Security Model & OWASP ASVS 5.0 Verification](#10-security-model--owasp-asvs-50-verification)
    - [STRIDE Threat Model](#stride-threat-model)
    - [OWASP ASVS 5.0 Level 2 Verification](#owasp-asvs-50-level-2-verification)
    - [Formula Injection Protection (CSV Sanitization)](#formula-injection-protection-csv-sanitization)
11. [Automated Test Suite & Verification Results](#11-automated-test-suite--verification-results)
    - [Test Architecture](#test-architecture)
    - [Verified Scenarios & Automated Evidence](#verified-scenarios--automated-evidence)
12. [Local Setup, Seeding & Execution Guide](#12-local-setup-seeding--execution-guide)
    - [Prerequisites](#prerequisites)
    - [Environment Configuration](#environment-configuration)
    - [Database Push & Seeding](#database-push--seeding)
    - [Running the Application](#running-the-application)
13. [Demo Seed Accounts & Verification Credentials](#13-demo-seed-accounts--verification-credentials)
14. [Production Deployment, Backups & SaaS Lifecycle](#14-production-deployment-backups--saas-lifecycle)

---

## 1. Executive Summary & System Vision

**100% DESIGN Studio OS** is an enterprise-grade, multi-tenant Software-as-a-Service (SaaS) platform custom-engineered for architectural and design practices. While seeded with **100% DESIGN Studio** as its flagship tenant, the platform is architected from the database layer up to securely host multiple independent architectural studios on a shared, cost-effective infrastructure.

### The Problem It Solves
Architectural studios operate under unique operational conditions that generic project management software (Jira, Asana, Trello) cannot accommodate:
1. **Field vs. Studio Duality**: Field architects visit active construction sites where GPS accuracy fluctuates due to concrete structures, requiring high-accuracy check-ins without continuous battery-draining GPS tracking.
2. **Strict Revision Control**: Architectural drawings progress through sequential revisions ($R_0, R_1, R_2$). An approval granted for $R_0$ must never implicitly carry forward to $R_1$.
3. **Financial Commitments vs. Expenses**: Contractor quotes are legal commitments that must not be counted as incurred expenses, avoiding double-counting in project cash-flow calculations.
4. **Deliverable Review Gates**: Submitting architects must not be permitted to approve their own drawings or task deliverables (enforcing four-eyes verification).
5. **Multiple Studio Ownership**: Architectural practices frequently operate with co-partners who both require Owner-level control, independent task views, and cross-partner delegation.

---

## 2. Technology Stack & System Architecture

### Architectural Topology

```mermaid
graph TD
    Client[Web Browser / Mobile PWA] -->|HTTPS / WSS| Edge[Next.js App Router Shell]
    Edge -->|Canonical URL Resolution| WorkspaceRouter["/w/[workspaceSlug]/..."]
    WorkspaceRouter -->|Session Cookie| AuthGuard[Server Auth & Session Resolver]
    AuthGuard -->|Builds TenantContext| ScopedServices[Scoped Service Layer]
    
    subgraph "Core Domain Modules"
        ScopedServices --> TaskModule[Task & Kanban Engine]
        ScopedServices --> VisitModule[Site Visits & Geofence Engine]
        ScopedServices --> DocModule[Drawings & Revision Approvals]
        ScopedServices --> FinanceModule[Financial Ledger & Commitments]
        ScopedServices --> TeamModule[Team & Employee Admin]
    end
    
    ScopedServices -->|Mandatory tenantId Filter| PrismaORM[Prisma Client ORM 6.4]
    PrismaORM -->|Connection Pool| MySQL[(MySQL 5.7+ / 8.0+ Database)]
    
    VisitModule -->|Formula Injection Protection| CSVExporter[Secure CSV Exporter]
    DocModule -->|Private File Storage| PrivateFS[Private Storage Adapter]
```

### Technology Stack Matrix

| Tier | Technology | Version | Rationale |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.7` | Hybrid SSR/SSG, Server Actions, route groups, optimized performance |
| **Runtime UI** | React | `19.2.8` | Modern concurrent rendering, Server Components, client state isolation |
| **Language** | TypeScript | `^5.0.0` | End-to-end type safety across database models, DTOs, and UI views |
| **Database** | MySQL | `5.7+ / 8.0+` | ACID transactions, composite index optimization, spatial precision |
| **ORM** | Prisma ORM | `6.4.1` | Type-safe migrations, complex relational joins, schema generation |
| **Styling** | Tailwind CSS / PostCSS | `^4.0.0` | Clean design system tokens, responsive layout, minimal runtime overhead |
| **Security** | bcryptjs & jose | `^3.0.3` / `^6.2.12` | Cost-factor 10 password hashing, cryptographic session tokens |
| **Validation** | Zod | `^4.6.5` | Strict schema parsing for all mutations, API payloads, and query filters |
| **Icons** | Lucide React | `^1.48.0` | Consistent, accessible iconography across desktop and mobile views |
| **Testing** | Node.js Test Runner & TSX | Native Node / `^4.23.15` | Zero-dependency, ultra-fast test suite execution |

### Architectural Decision Records (ADRs)

- **ADR 001: Modular Monolith with Shared-Database Tenant Isolation**:
  - Implements a single unified Next.js codebase where every tenant entity is tagged with an immutable `tenantId`. Guarantees data isolation without microservice overhead.
- **ADR 002: Identity and Tenant Membership Separation**:
  - Global user credentials (`User`) are distinct from tenant-specific memberships (`TenantMembership`) and tenant-specific employee profiles (`Employee`), allowing Employee ID reuse (e.g. `EMP-001` exists in multiple workspaces).
- **ADR 003: Single-Shot Geolocation & Authoritative Server Geofencing**:
  - Geolocation is captured strictly at Check-In and Check-Out. The server computes Haversine distances against authoritative server timestamps, classifying visits into 4 unambiguous states.
- **ADR 004: Version-Locked Document Approvals**:
  - Approvals target an exact `DocumentVersion.id`. Uploading a new revision supersedes prior revisions and requires a fresh review lifecycle.
- **ADR 005: Financial Modeling & Separation of Commitments**:
  - All monetary values utilize `Decimal(15, 2)` to eliminate floating-point drift. Contractor bids are recorded as contractual commitments separate from actual expenses.
- **ADR 006: Private Object Storage & Authorized Streaming**:
  - Proprietary drawings and sensitive receipts are kept outside public web roots and streamed only through permission-checked endpoints.

---

## 3. Multi-Tenant SaaS Foundation & Isolation Design

### Logical Tenant Isolation Model

The platform enforces logical multi-tenancy at the application layer following OWASP Multi-Tenant Security standards. Every request resolves into an immutable `TenantContext` object:

```typescript
export interface TenantContext {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly tenantName: string;
  readonly userId: string;
  readonly userEmail: string;
  readonly userFullName: string;
  readonly membershipId: string;
  readonly employeeId: string | null;
  readonly role: TenantRole;
  readonly hasFinanceAccess: boolean;
  readonly timezone: string;
  readonly currency: string;
}
```

#### The Scoped Query Principle
Direct, unscoped database queries are prohibited. Every repository method accepts `TenantContext` as its primary argument and embeds `where: { tenantId: ctx.tenantId, ... }`:

```typescript
// Example: Strict tenant isolation in tasks repository
export async function findTasks(ctx: TenantContext, params: TaskFilterParams) {
  return await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId, // Mandatory scoping
      ...(params.myTasksOnly ? { assigneeId: ctx.membershipId } : {}),
      // ...
    },
  });
}
```

### Workspace Routing & Tenant Resolution

All tenant-scoped interactions reside under the canonical URL prefix:
```
/w/[workspaceSlug]/...
```

1. **URL Resolution**: When a user accesses `/w/100percentdesign/login` or `/w/100percentdesign/tasks`, the layout extracts `workspaceSlug`.
2. **Tenant Verification**: The server resolves `Tenant` where `slug = '100percentdesign'`. If the tenant is missing, suspended, or pending deletion, the system fails closed (HTTP 404 / 403).
3. **Session Verification**: The session token from the `studio_session_token` cookie is retrieved from the database. The system verifies that the session is active, unrevoked, unexpired, and linked to an active `TenantMembership` inside the target workspace.

### Composite Unique Keys & Anti-Collision Guards

To enable multiple companies to use natural codes without cross-tenant collisions, composite uniqueness constraints are defined in MySQL:

| Entity | Composite Unique Constraint | Effect |
|---|---|---|
| **Employee** | `@@unique([tenantId, employeeId])` | Allows Studio A and Studio B to both have `EMP-001` |
| **Project** | `@@unique([tenantId, code])` | Allows multiple tenants to have `PRJ-001` |
| **Membership** | `@@unique([tenantId, userId])` | Prevents duplicate user memberships within a tenant |
| **SiteVisitEvent** | `@@unique([tenantId, idempotencyKey])` | Prevents replay attacks and duplicate check-in submissions |

---

## 4. Identity, Authentication & Session Lifecycle

### Dual Identifier Login Architecture

Field employees prefer typing their concise **Employee ID** (`EMP-001`), whereas Partners and Studio Directors often use their **Work Email** (`tanya@100percentdesign.in`). The system seamlessly handles both:

```mermaid
sequenceDiagram
    autonumber
    actor User as Field Architect / Partner
    participant Web as Login Form (/w/[slug]/login)
    participant Auth as Auth Service
    participant DB as MySQL Database

    User->>Web: Submits Identifier (EMP-001 or email) & Password
    Web->>Auth: loginWithWorkspace({ workspaceSlug, identifier, password })
    Auth->>DB: Resolve Tenant by workspaceSlug
    alt Identifier contains '@'
        Auth->>DB: Query User by email + TenantMembership where tenantId & isActive
    else Identifier is Employee ID
        Auth->>DB: Query Employee where tenantId & employeeId -> includes Membership + User
    end
    Auth->>Auth: Verify bcrypt password hash
    Auth->>DB: Generate crypto random token (32 bytes) -> Insert into Session table
    Auth-->>Web: Set HttpOnly, Secure, SameSite=Lax cookie ('studio_session_token')
    Web-->>User: Redirect to /w/[workspaceSlug]/tasks (My Tasks)
```

### Server-Managed Revocable Sessions

Unlike stateless JWTs which cannot be revoked without maintaining a distributed denylist, this platform uses **server-managed revocable database sessions** stored in the `Session` model:
- **Token Generation**: 32 cryptographically secure random bytes encoded as hex (`crypto.randomBytes(32).toString('hex')`).
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, `Secure` (in production), strict `Path=/`.
- **Absolute Expiration**: Configured for 7 days (`SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000`).
- **Telemetry**: Stores `ipAddress`, `userAgent`, and `activeTenantId` on session creation.

### Dual Partner (Multi-Owner) Architecture

Many architectural partnerships have two equal partners who jointly direct the firm. The platform fully supports this model:
- Both partners hold independent user accounts with `TenantRole.OWNER`.
- Both partners have identical studio-wide administrative, financial, and project approval capabilities.
- Each partner has an independent **My Tasks** dashboard, permitting Partner A to assign deliverables to Partner B, and vice-versa.
- **Last Owner Guard**: A partner cannot deactivate themselves if they are the sole remaining active owner in the studio (`deactivateMember` verifies `activeOwnerCount > 1`).

### Session Revocation & Kill Switch

Immediate session invalidation occurs under three conditions:
1. **Explicit Logout**: Calls `/api/auth/logout`, setting `revokedAt = NOW()` on the session row and clearing the browser cookie.
2. **Account Deactivation**: When an Admin or Owner deactivates an employee via `/api/employees/deactivate`, `revokeAllUserSessions(targetUserId)` immediately marks every active session for that user as revoked.
3. **Password Change**: Resets revoke all prior sessions, preventing compromised tokens from continuing to access the studio.

---

## 5. Role-Based Access Control (RBAC) & Permission Matrix

### Role Definitions

1. **Owner / Partner (`OWNER`)**:
   - Executive studio control: all projects, finances, fee milestones, client agreements, billing settings, and employee lifecycles.
2. **Administrator (`ADMIN`)**:
   - Studio operations, office management, and employee onboarding/offboarding. Financial access is restricted unless explicitly granted `hasFinanceAccess = true`.
3. **Project Manager (`PROJECT_MANAGER`)**:
   - Leads project execution: manages project phases, assigns tasks, schedules site visits, reviews field reports, and approves drawing revisions.
4. **Employee (`EMPLOYEE`)**:
   - Field architects, draftsmen, and 3D visualizers: views assigned projects and tasks, conducts site check-ins/outs, and submits deliverables for review. Forbidden from self-approving work.

### Granular Permission Grid

| Capability / Action | Owner | Administrator | Project Manager | Employee |
|---|:---:|:---:|:---:|:---:|
| **Tenant Settings & Subscription** | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **Add / Invite New Employees** | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied |
| **Grant Owner Privileges** | ✅ Owner only | ❌ Denied | ❌ Denied | ❌ Denied |
| **Deactivate Employee Accounts** | ✅ Full (Protected) | ✅ Non-owner only | ❌ Denied | ❌ Denied |
| **Permanent Member Removal** | ✅ Unreferenced only | ✅ Unreferenced only | ❌ Denied | ❌ Denied |
| **Create New Project** | ✅ Yes | ✅ Yes | ❌ Denied | ❌ Denied |
| **View Projects** | ✅ All in Tenant | ✅ All in Tenant | ✅ Assigned only | ✅ Assigned only |
| **Create & Assign Tasks** | ✅ Any member | ✅ Any member | ✅ In assigned project | ❌ Assigned only |
| **Edit Protected Task Fields** (Priority, Due Date, Phase) | ✅ Yes | ✅ Yes | ❌ Denied | ❌ Denied |
| **Submit Task for Review** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Assigned tasks |
| **Approve Task Deliverables** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ **Forbidden (No self-approval)** |
| **Request Task Changes (Correction)** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Forbidden |
| **Direct Completion Override** | ✅ Audit reason req. | ✅ Audit reason req. | ❌ Denied | ❌ Denied |
| **Manage Contractor & Consultant Directories** | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied |
| **Read Contractor & Consultant Directories** | ✅ Full | ✅ Full | ✅ Basic + Assigned Prj | ✅ Basic + Assigned Prj |
| **View Quotation Amounts & Commercial Files** | ✅ Full | ⚠️ If `hasFinanceAccess` | ⚠️ If `hasFinanceAccess` | ❌ **Redacted / Denied** |
| **Upload Drawing Initial & New Revisions** | ✅ Yes | ✅ Yes | ✅ In assigned project | ✅ In assigned project |
| **Approve Drawing Revisions** | ✅ Yes (Not own) | ✅ Yes (Not own) | ✅ In assigned project | ❌ Denied |
| **Withdraw Own Pending Drawing Submission** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (Own draft) |
| **Delete Unsubmitted Drawing Draft** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (No review history) |
| **Record Client Drawing Approval Evidence** | ✅ Yes (Evidence req.) | ✅ Yes (Evidence req.) | ❌ Denied | ❌ Denied |
| **Protected File Streaming & Download** | ✅ Full | ✅ Full | ⚠️ Assigned projects | ⚠️ Assigned projects |
| **Site Visit Check-In / Check-Out** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Assigned visits |
| **Review Site Visit Reports** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Denied |
| **Export Site Visits CSV** | ✅ Full (Sanitized) | ✅ Full (Sanitized) | ❌ Denied | ❌ Denied |
| **View Project Financial Ledger** | ✅ Full | ⚠️ If `hasFinanceAccess` | ⚠️ If `hasFinanceAccess` | ❌ Denied |
| **Manage Budgets & Fee Milestones** | ✅ Full | ⚠️ If `hasFinanceAccess` | ⚠️ If `hasFinanceAccess` | ❌ Denied |

---

## 6. Complete Database Schema & Entity-Relationship Model

### Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    Tenant ||--o{ TenantMembership : "has members"
    Tenant ||--o{ Employee : "employs"
    Tenant ||--o{ Project : "owns"
    Tenant ||--o{ Client : "services"
    Tenant ||--o{ Consultant : "retains"
    Tenant ||--o{ Contractor : "engages"
    Tenant ||--o{ Task : "tracks"
    Tenant ||--o{ Site : "monitors"
    Tenant ||--o{ SiteVisit : "schedules"
    Tenant ||--o{ Document : "archives"
    Tenant ||--o{ Budget : "allocates"
    Tenant ||--o{ FeeMilestone : "bills"
    Tenant ||--o{ Expense : "incurs"
    Tenant ||--o{ AuditEvent : "logs"

    User ||--o{ TenantMembership : "links"
    User ||--o{ Session : "authenticates"

    TenantMembership ||--o| Employee : "profile"
    TenantMembership ||--o{ ProjectMember : "staffs"
    TenantMembership ||--o{ Task : "assigned"
    TenantMembership ||--o{ SiteVisit : "performs"

    Project ||--o{ ProjectPhase : "phases"
    Project ||--o{ ProjectMember : "team"
    Project ||--o{ ProjectConsultant : "consultants"
    Project ||--o{ ProjectContractor : "contractors"
    Project ||--o{ Task : "contains"
    Project ||--o{ Site : "locates"
    Project ||--o{ Document : "drawings"
    Project ||--o{ Budget : "budget"
    Project ||--o{ FeeMilestone : "milestones"
    Project ||--o{ Expense : "expenses"

    ProjectContractor ||--o{ Quotation : "submits"
    FeeMilestone ||--o{ FeePayment : "receives"

    Task ||--o{ TaskChecklistItem : "checklists"
    Task ||--o{ TaskComment : "comments"
    Task ||--o{ TaskActivityHistory : "audit"

    Site ||--o{ SiteVisit : "hosts"
    SiteVisit ||--o{ SiteVisitEvent : "telemetry"

    Document ||--o{ DocumentVersion : "revisions"
    DocumentVersion ||--o{ ApprovalRequest : "approvals"
```

### Comprehensive Entity & Data Model Catalog

The application database is structured across 9 domain clusters defined in [`prisma/schema.prisma`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/prisma/schema.prisma):

#### Cluster 1: Tenancy, Identity & Membership
- **`Tenant`**: The tenant root. Contains `id` (UUID), unique `slug`, `name`, `timezone` (default `Asia/Kolkata`), `currency` (`INR`), `lifecycleState` (`ACTIVE`, `SUSPENDED`, `DELETED`), and JSON `branding` / `settings`.
- **`User`**: Global user identity. Stores `email`, `passwordHash` (bcrypt), `fullName`, `accountState` (`ACTIVE`, `DISABLED`), and MFA metadata.
- **`TenantMembership`**: Binds a `User` to a `Tenant`. Holds `role` (`OWNER`, `ADMIN`, `PROJECT_MANAGER`, `EMPLOYEE`), `hasFinanceAccess` (boolean), and `isActive`.
- **`Employee`**: Tenant-scoped professional profile linked 1-to-1 with `TenantMembership`. Enforces `@@unique([tenantId, employeeId])`. Stores `department`, `designation`, `phone`, and `joinDate`.
- **`Session`**: Revocable session store. Contains `token` (unique), `userId`, `activeTenantId`, `expiresAt`, `revokedAt`, `ipAddress`, and `userAgent`.

#### Cluster 2: Projects, Phases & Directory Stakeholders
- **`Client`**: Organization client directory. Enforces `@@unique([tenantId, name])`.
- **`Consultant`**: Specialized consultants (Structural, MEP, Landscape, HVAC, Lighting).
- **`Contractor`**: General or trade contractors (Civil, Carpentry, Electrical, Plumbing, Fabrication).
- **`Project`**: Core architectural project. Stores `code` (e.g. `PRJ-001`), `name`, `typology`, `status` (`LEAD`, `PROPOSAL`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`), estimated completion date, and budget overview.
- **`ProjectPhase`**: Architectural sequence:
  1. *Client Brief & Inception*
  2. *Concept Design & Moodboards*
  3. *Detailed Architectural Design*
  4. *3D Visualization & VR Walkthrough*
  5. *Working Drawings & MEP Coordination*
  6. *Bill of Quantities (BOQ) & Tendering*
  7. *Municipal Sanctions & Liaison*
  8. *Execution & Site Supervision*
  9. *Handover & Snag List Resolution*
- **`ProjectMember`**: Association table assigning employees to projects with project-specific roles (`PROJECT_LEAD`, `PROJECT_ARCHITECT`, `INTERIOR_DESIGNER`, `SITE_ENGINEER`).

#### Cluster 3: Contractor Quotations (Commitments)
- **`ProjectContractor`**: Associates a contractor with a specific project.
- **`Quotation`**: Bids and estimates submitted by contractors. Stores `quotationNumber`, `scopeSummary`, `totalAmount` (`Decimal(15, 2)`), `taxAmount`, `status` (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`), and `validUntil`. Kept separate from actual expenses to prevent double-counting.

#### Cluster 4: Tasks, Checklists & Workflows
- **`Task`**: Unit of work. Stores `title`, `description`, `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`NOT_STARTED`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `BLOCKED`, `CANCELLED`), `startDate`, `dueDate`, `completionDate`, `estimatedHours`, and optimistic lock `version`.
- **`TaskChecklistItem`**: Sub-items within a task with `isDone` and `sortOrder`.
- **`TaskComment`**: Contextual discussion comments on a task.
- **`TaskActivityHistory`**: Immutable activity trail recording transitions, comments, and actors.

#### Cluster 5: Sites & Geolocation Site Visits
- **`Site`**: Physical project construction/survey location. Stores `name`, `latitude`, `longitude`, `radiusMeters` (default 150m), and `accuracyThresholdMeters` (default 100m).
- **`SiteVisit`**: Scheduled field trip. Stores `operationalState` (`SCHEDULED`, `ACTIVE`, `CHECKED_OUT`, `CANCELLED`), `reviewDecision` (`PENDING`, `ACCEPTED`, `NEEDS_CLARIFICATION`, `REJECTED`), `reviewComment`, and reviewer relations.
- **`SiteVisitEvent`**: Append-only telemetry log for Check-In and Check-Out. Stores `serverReceiptTime` (trusted), `clientCaptureTime` (reported), `latitude`, `longitude`, `accuracyMeters`, `calculatedDistanceMeters`, `geofenceAssessment`, and unique `idempotencyKey`.

#### Cluster 6: Architectural Drawings & Version-Locked Approvals
- **`Document`**: The conceptual document asset (e.g. "PRJ-001 Working Drawing - Ground Floor Plan").
- **`DocumentVersion`**: Immutable revision (`R0`, `R1`, `R2`). Stores file pointer, revision note, and `approvalState` (`PENDING`, `APPROVED`, `REJECTED`, `SUPERSEDED`).
- **`ApprovalRequest`**: Formal review request. Target version must be approved by designated reviewers. Also records client approvals with evidence links.

#### Cluster 7: Financial Management & Cash Position Ledger
- **`Budget`**: Category budget allocations (`ARCHITECTURAL_FEES`, `CONSULTANT_FEES`, `SITE_EXPENSES`, `PRINTING_PLOTTING`, `TRAVEL_LOGISTICS`, `CONTINGENCY`).
- **`FeeMilestone`**: Client billing milestones (`milestoneName`, `amount`, `percentageOfFee`, `status`: `UPCOMING`, `INVOICED`, `PAID`, `OVERDUE`).
- **`FeePayment`**: Realized fee receipts from clients with payment mode and transaction references.
- **`Expense`**: Incurred project expenses (`amount`, `category`, `status`: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `REIMBURSED`).

#### Cluster 8: Security, Storage & Audit
- **`PrivateFile`**: Metadata for uploaded drawings, site photos, and invoices stored in private storage.
- **`AuditEvent`**: Immutable security log for critical actions (deactivations, permission elevations, direct completion overrides, financial changes).
- **`Notification` & `NotificationOutbox`**: In-app notifications and transactional outbox for reliable delivery.

#### Cluster 9: Commercial SaaS Lifecycle
- **`Plan`**: SaaS subscription tiers (e.g. *Studio Professional* with 30 seats, 100 projects, 20GB storage).
- **`Subscription`**: Active tenant subscription linked to a plan.
- **`TenantExport`**: Snapshot archive generation for tenant data portability.
- **`DeletionRequest`**: 30-day grace period for GDPR/enterprise tenant deletion.

---

## 7. Core Business Modules & Workflow Engines

### Task Management Engine & No Self-Approval Gate

The task management engine enforces strict four-eyes verification to ensure architectural drawing deliverables and model calculations are never approved by their author.

```mermaid
stateDiagram-v2
    [*] --> NOT_STARTED: Task Created
    NOT_STARTED --> IN_PROGRESS: Assignee starts work
    IN_PROGRESS --> IN_REVIEW: Assignee submits deliverable
    
    state IN_REVIEW {
        [*] --> PendingReview
        PendingReview --> SelfApprovalCheck
        SelfApprovalCheck --> BlockSelfApproval: Assignee attempts approval
        BlockSelfApproval --> PendingReview: 403 Forbidden Exception
        SelfApprovalCheck --> Approved: Independent PM or Owner approves
    }
    
    IN_REVIEW --> IN_PROGRESS: Reviewer requests changes (mandatory comment)
    IN_REVIEW --> COMPLETED: Deliverable approved
    
    NOT_STARTED --> COMPLETED: Partner/Admin Direct Override (audit reason required)
    IN_PROGRESS --> COMPLETED: Partner/Admin Direct Override (audit reason required)
    
    COMPLETED --> [*]
```

#### Workflow Rules:
1. **Assignee Submission**: An assignee moves the task from `IN_PROGRESS` to `IN_REVIEW`.
2. **Forbidden Self-Approval**: If `task.assigneeId === ctx.membershipId` and the user is not an Owner/Partner, the server throws:
   ```typescript
   throw new ForbiddenException(
     "Self-approval is forbidden. An independent reviewer or project manager must approve your deliverable."
   );
   ```
3. **Change Request**: A reviewer can return the task to `IN_PROGRESS`, but must provide a mandatory correction comment explaining what needs revision.
4. **Direct Completion Override**: Owners or Administrators can bypass the review stage directly into `COMPLETED` (e.g. for trivial administrative tasks), but must supply a mandatory `auditReason` which is saved to `AuditEvent`.
5. **Non-Overlapping Date Partitioning**:
   - **Today**: Due date is strictly within current calendar day (`dueDate >= startOfToday && dueDate <= endOfToday`).
   - **Overdue**: Due date is strictly before current day (`dueDate < startOfToday`).
   - **Upcoming**: Due date is strictly after current day (`dueDate > endOfToday`).
6. **Task Progress Formula**:
   $$\text{Progress} = \frac{\text{Completed Active Tasks}}{\text{Total Active Tasks (Excluding Cancelled)}} \times 100$$

---

### Site Visits & Geolocation Check-In Engine

The geolocation engine captures single-point coordinates at Check-In and Check-Out. It does not perform invasive continuous tracking.

#### 1. Haversine Distance Calculation
The exact great-circle distance between user coordinates $(\phi_1, \lambda_1)$ and site anchor $(\phi_2, \lambda_2)$ is computed on the server:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad (R = 6,371,000 \text{ m})$$

#### 2. Four-State Geofence Evaluation Matrix
Given distance $d$, reported accuracy $a$, site radius $r$, and acceptable sensor threshold $t_{\text{acc}}$:

| Assessment | Mathematical Condition | Interpretation |
|---|---|---|
| **`WITHIN_RADIUS`** | $d + a \le r \quad \text{and} \quad a \le t_{\text{acc}}$ | The entire circle of accuracy falls completely inside the site boundary. |
| **`OUTSIDE_RADIUS`** | $d - a > r \quad \text{and} \quad a \le t_{\text{acc}}$ | The entire circle of accuracy is completely outside the site boundary. |
| **`UNCERTAIN`** | Circle of accuracy overlaps site perimeter, or $a > t_{\text{acc}}$ | Cannot definitively prove whether the user was inside or outside. |
| **`LOCATION_UNAVAILABLE`** | Coordinates missing, permission denied, or sensor timeout | Exception workflow triggered; mandatory employee reason required for admin review. |

```mermaid
flowchart TD
    Start[User Clicks Check-In] --> Geo[Get Browser Geolocation Snapshot]
    Geo --> CheckCoords{Coordinates Acquired?}
    
    CheckCoords -- No --> PromptReason[Prompt User for Mandatory Exception Reason]
    PromptReason --> SendUnavailable[Send Check-In with LOCATION_UNAVAILABLE]
    
    CheckCoords -- Yes --> SendPayload[Send Lat, Lon, Accuracy, IdempotencyKey]
    SendPayload --> ServerConcurrency{Has Another Active Visit?}
    
    ServerConcurrency -- Yes --> RejectConcurrency[409 Conflict: Max 1 Active Visit Allowed]
    ServerConcurrency -- No --> CalcHaversine[Server Calculates Haversine Distance d]
    
    CalcHaversine --> Eval{Evaluate Geofence}
    Eval -->|d + a <= r| Within[WITHIN_RADIUS]
    Eval -->|d - a > r| Outside[OUTSIDE_RADIUS]
    Eval -->|Overlap or a > Threshold| Uncertain[UNCERTAIN]
    
    Within --> SaveEvent[Append-only SiteVisitEvent Created]
    Outside --> SaveEvent
    Uncertain --> SaveEvent
    SendUnavailable --> SaveEvent
    
    SaveEvent --> UpdateVisit[SiteVisit operationalState = ACTIVE]
```

#### 3. Concurrency Lock: Exactly One Active Visit
A field architect cannot be at two construction sites at once. The service verifies:
```typescript
const existingActiveVisit = await prisma.siteVisit.findFirst({
  where: {
    tenantId: ctx.tenantId,
    employeeId: ctx.membershipId,
    operationalState: SiteVisitOperationalState.ACTIVE,
  },
});
if (existingActiveVisit && existingActiveVisit.id !== visitId) {
  throw new Error("Concurrency Conflict: You currently have an active site visit...");
}
```

---

### Architectural Drawings & Revision-Locked Approvals

Architectural drawings progress through strict version designations ($R_0, R_1, R_2, R_3$).
- **Revision Locking**: An approval granted to Revision $R_0$ applies exclusively to $R_0$. When $R_1$ is uploaded, it is initialized with `approvalState: PENDING`.
- **Client Approval on Behalf**: Field architects frequently receive verbal or WhatsApp approval on site. To record this, staff must flag the approval as `Recorded on behalf of client` and attach verifiable correspondence evidence.

---

### Project Financials, Ledger & Commitments Separation

The financial engine maintains strict separation between **cash receipts**, **actual expenses**, and **contractor quotations**:
- **Contractor Quotations as Commitments**: An approved contractor quotation of ₹50,00,000 is a committed liability, not an immediate cash outlay. Counting it as an expense would double-count costs when installment payments are issued.
- **Net Cash Position**: Computed strictly as:
  $$\text{Net Cash Position} = \sum \text{Fee Payments Received} - \sum \text{Approved Expenses Paid}$$
  The UI explicitly labels this as *Net Cash Position* rather than *Net Profit* to maintain accounting integrity.
- **Arbitrary Precision**: All amounts use `Decimal(15, 2)` to eliminate JavaScript floating-point errors (`0.1 + 0.2 === 0.30000000000000004`).

---

### Team Directory & Employee Administration

- **Safe Directory Views**: Non-administrative employees can view the team directory to contact colleagues, but compensation and sensitive administrative flags are stripped from the response DTO.
- **Deactivation Kill Switch**: Deactivating a team member immediately sets `isActive = false`, revokes all database sessions, and records the action in `AuditEvent`.

---

## 8. API Route Catalog & Endpoint Specification

All endpoints are hosted under `/api/` and strictly require authenticated requests bearing the `studio_session_token` cookie.

### Authentication Endpoints

#### `POST /api/auth/login`
- **Description**: Authenticates an employee or partner using their company-scoped Employee ID or Email.
- **Request Body**:
  ```json
  {
    "workspaceSlug": "100percentdesign",
    "identifier": "EMP-001",
    "password": "StudioPassword2026!"
  }
  ```
- **Responses**:
  - `200 OK`: Sets `studio_session_token` HttpOnly cookie. Returns user profile DTO.
  - `401 Unauthorized`: Returns `{ "error": "Invalid credentials or account inactive" }`.

#### `POST /api/auth/logout`
- **Description**: Revokes the active session in MySQL and invalidates the session cookie.
- **Responses**:
  - `200 OK`: `{ "success": true }`.

---

### Employee Administration Endpoints

#### `POST /api/employees/create`
- **Description**: Creates a new user identity, tenant membership, and employee profile.
- **Authorization**: `OWNER` or `ADMIN`. (Only `OWNER` can grant `OWNER` role).
- **Request Body**:
  ```json
  {
    "employeeId": "EMP-007",
    "fullName": "Kavita Rao",
    "email": "kavita@100percentdesign.in",
    "role": "EMPLOYEE",
    "department": "Landscape Architecture",
    "designation": "Landscape Designer",
    "temporaryPassword": "InitialPassword2026!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns created employee record.
  - `403 Forbidden`: Insufficient permissions.

#### `POST /api/employees/deactivate`
- **Description**: Deactivates an employee and revokes all active sessions immediately.
- **Authorization**: `OWNER` or `ADMIN` (Admins cannot deactivate Owners).
- **Request Body**:
  ```json
  {
    "membershipId": "uuid-of-membership"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "success": true }`.

---

### Task Management Endpoints

#### `POST /api/tasks/create`
- **Description**: Creates a new task assigned to an employee within a project phase.
- **Request Body**:
  ```json
  {
    "projectId": "uuid-project-id",
    "phaseId": "uuid-phase-id",
    "title": "Ground Floor Column Reinforcement Inspection",
    "description": "Cross-check spacing against Structural Drawing S-04",
    "assigneeId": "uuid-membership-id",
    "priority": "HIGH",
    "dueDate": "2026-10-05T18:00:00.000Z",
    "estimatedHours": 6
  }
  ```

#### `POST /api/tasks/status`
- **Description**: Transitions task status with workflow and self-approval validation.
- **Request Body**:
  ```json
  {
    "taskId": "uuid-task-id",
    "status": "COMPLETED",
    "comment": "All checklist items verified on site",
    "auditReason": "Partner verbal authorization"
  }
  ```
- **Responses**:
  - `200 OK`: Updated task object.
  - `403 Forbidden`: Triggered on self-approval attempt or unauthorized override.

#### `POST /api/tasks/checklist`
- **Description**: Toggles or creates checklist items within a task.

---

### Site Visit & Geolocation Endpoints

#### `POST /api/visits/check-in`
- **Description**: Records a site check-in event with Haversine distance and geofence evaluation.
- **Request Body**:
  ```json
  {
    "visitId": "uuid-visit-id",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracyMeters": 18.5,
    "clientCaptureTime": "2026-09-30T10:00:00.000Z",
    "idempotencyKey": "checkin-visit-123-attempt-1",
    "isLocationUnavailable": false
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "assessment": "WITHIN_RADIUS",
      "distanceMeters": 42.3,
      "visit": { "operationalState": "ACTIVE" }
    }
    ```
  - `409 Conflict`: Triggered if the employee already has another active visit.

#### `POST /api/visits/check-out`
- **Description**: Concludes an active visit with departure coordinates and site observations.
- **Request Body**:
  ```json
  {
    "visitId": "uuid-visit-id",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracyMeters": 15.0,
    "idempotencyKey": "checkout-visit-123-attempt-1",
    "summaryNotes": "Concrete pour completed for Grid A-D. Rebar ties inspected."
  }
  ```

#### `POST /api/visits/review`
- **Description**: Partner or PM records an administrative review decision (`ACCEPTED`, `NEEDS_CLARIFICATION`, `REJECTED`).

#### `GET /api/visits/export`
- **Description**: Streams a sanitized CSV export of all tenant site visits with formula injection protection.

---

## 9. UI Component Hierarchy & Frontend Architecture

### Design System & Visual Tokens

The user interface follows an aesthetic tailored for architectural practices:
- **Color Palette**:
  - Surface: Architectural ivory, off-white, and warm greige (`#FDFBF7`, `#F4EFEA`).
  - Text & Geometry: Deep charcoal and matte slate (`#1A1A1A`, `#2D3748`).
  - Brand Accents: Deep architectural olive (`#4B5320`, `#556B2F`) and warm brass/gold (`#D4AF37`).
- **Typography**: Crisp modern sans-serif (`Inter`, `system-ui`) paired with subtle tabular numerals for dimensional schedules.
- **Elevation**: Minimalist hairline borders (`border-stone-200`) and soft ambient shadows.

### Layout & AppShell

Every authenticated page is wrapped by the responsive [`AppShell`](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/src/components/layout/AppSidebar.tsx):
- **Sidebar Navigation**:
  - **My Tasks**: Primary landing view for field and studio staff.
  - **Projects**: Project portfolio with phase tracking, drawings, and consultant rosters.
  - **Site Visits**: Check-in center, active visit cards, GPS telemetry, and report logs.
  - **Drawings**: Drawing revision registers with approval status chips.
  - **Finance**: Permission-gated project ledgers, fee milestones, and cash-flow cards.
  - **Team Directory**: Studio roster, designations, contact cards, and admin tools.
- **Topbar**: Active workspace badge, employee role chip, current local time display, and instant logout button.

### Client Views & Interactive Experiences

1. **`TasksClientView`**:
   - **Segmented Tabs**: Filter tasks seamlessly across *Today*, *Upcoming*, *Overdue*, *In Progress*, *Waiting Review*, and *Completed*.
   - **Kanban Board & List Mode**: Toggle between tabular list mode and a dynamic 4-column drag/drop Kanban board.
   - **Interactive Modal**: View task descriptions, toggle sub-item checklists, post discussion comments, and trigger review workflows with instantaneous optimistic updates.
2. **`VisitsClientView`**:
   - **One-Tap Check-In**: Communicates with `navigator.geolocation.getCurrentPosition`, renders high-accuracy radar pulse animations, and displays real-time geofence assessment chips.
   - **Manual Exception Form**: Automatically prompts for a documented justification if GPS is disabled or denied.
   - **Review Console**: Partners and PMs can accept or reject site reports with inline comments.
3. **`TeamClientView`**:
   - **Member Management**: Modal form for adding staff members with auto-generated temporary credentials.
   - **Deactivation Dialog**: Confirmation modal with warning regarding immediate session revocation.

---

## 10. Security Model & OWASP ASVS 5.0 Verification

### STRIDE Threat Model

| Threat | Target Asset | Attack Vector | Implemented Mitigation |
|---|---|---|---|
| **Spoofing** | User Identity / Session | Stolen session cookies, brute-forced employee logins | Cryptographic 32-byte tokens in HttpOnly/Secure cookies; bcrypt hashing; instant database revocation. |
| **Tampering** | Location Coordinates / Approvals | Client-side coordinate spoofing; self-approval of tasks | Authoritative server receipt timestamps; Haversine computed on server; strict backend self-approval check. |
| **Repudiation** | Site Visits / Overrides | Employee denies missing check-in; partner denies override | Immutable append-only `SiteVisitEvent` log; required audit reason logged to `AuditEvent`. |
| **Information Disclosure** | Cross-Tenant Data | Attacker accesses Project ID of a competing studio | Rigid `where: { tenantId }` scoping on all database queries; zero unscoped repository methods. |
| **Denial of Service** | Session Floods / Massive Exports | Scripted login attacks or huge file exports | Rate-limiting ready; paginated query boundaries; streaming CSV generators. |
| **Elevation of Privilege** | Admin to Owner Escalation | Studio Admin attempts to promote themselves to Owner | Role hierarchy check in `createEmployeeService`: only existing Owners can grant Owner privileges. |

### OWASP ASVS 5.0 Level 2 Verification

- **V2: Authentication**: Secure password storage using bcrypt with 10 salt rounds. Generic error messages prevent workspace and email enumeration.
- **V3: Session Management**: State stored server-side. Immediate revocation upon deactivation or password change.
- **V4: Access Control**: Fail-closed architecture. If a session token is missing or invalid, every route immediately redirects or rejects with HTTP 401.
- **V5: Input Validation**: All payloads parsed and validated against strict Zod schemas before reaching the database.
- **V8: Data Protection**: Sensitive files (drawings, contracts) stored outside the web root and streamed through authenticated proxy routes.

### Formula Injection Protection (CSV Sanitization)

Exported CSV spreadsheets containing field site visit logs could be exploited if an attacker submits formula characters (`=`, `+`, `-`, `@`) in comment fields.

The export engine runs all cell values through a sanitizer:
```typescript
function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  // If first character is =, +, -, @, prefix with single quote '
  if (/^[=+\-@]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
```

---

## 11. Automated Test Suite & Verification Results

The application includes an exhaustive automated test suite executed via native Node.js:
```bash
npm run test:all
```

### Verified Scenarios & Automated Evidence

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

#### Detailed Test Coverage Breakdown:
1. **Multi-Tenant Logical Isolation & Collision Defense**: Verifies `EMP-001` in `100percentdesign` resolves to Tanya Mathur, while `EMP-001` in `apex-studio` resolves to Siddharth Rao with distinct passwords, tokens, and zero cross-tenant record leakage.
2. **Dual Partner Governance**: Protects dual partner accounts with shared owner privileges, partner task assignment, and blocks non-owners from promoting users to OWNER.
3. **Last Active Owner Protection**: Prevents removal, demotion, or deactivation of the last remaining active OWNER in a tenant.
4. **Historical Attribution & Safe Archival**: Protects members with historical tasks, drawings, or site visits from hard deletion, enforcing safe deactivation.
5. **Immediate Session Termination**: Proves that account deactivation immediately invalidates all active session tokens, and reactivation never restores revoked tokens.
6. **Task Dashboard & Field Permissions**: Confirms employees only view their assigned tasks, can edit permitted fields (descriptions, checklists, comments), and are strictly blocked from editing protected fields (`priority`, `dueDate`, `phaseId`) or editing tasks of others.
7. **Four-Eyes No-Self-Approval Gate**: Asserts that assignees submitting task deliverables or drawing revisions cannot approve their own work.
8. **Direct Completion Overrides**: Asserts that bypassing task review requires Partner/Admin authority and an audited rationale.
9. **Contractor & Consultant Write Denials & Commercial Redaction**: Confirms employees cannot create or edit directory records, and that financial quotation amounts and files are completely hidden from non-finance roles.
10. **Drawing Revision Allocation & Non-Inheritance**: Verifies sequential $R_0, R_1, R_2\dots$ revision creation, proves new revisions never inherit prior approval, and displays both latest and latest approved revisions.
11. **Client Approval Evidence**: Confirms client approvals require privileged roles, exact revision targets, and explicit evidence text.
12. **Safe Private Storage & Cross-Tenant File Scoping**: Validates MIME/extension enforcement, SHA-256 integrity, private streaming authorization, and cross-tenant download blocking.

---

## 12. Local Setup, Seeding & Execution Guide

### Prerequisites
- **Node.js**: Version `18.17.0+` (tested on Node v20 & v24)
- **MySQL**: Version `5.7+` or `8.0+`
- **npm** or **pnpm**

### Environment Configuration

Create a `.env` file in the project root:
```ini
DATABASE_URL="mysql://root:YourPassword@localhost:3306/studio_os_db"
SESSION_SECRET="cf6c33c3be992c68e1a12a52ef61d6bc0cf6e3557e4e84b640bebfd3434674a2"
APP_DEFAULT_TIMEZONE="Asia/Kolkata"
APP_DEFAULT_CURRENCY="INR"
NODE_ENV="development"
PORT=3000
```

### Database Push & Seeding

```bash
# 1. Install dependencies
npm install

# 2. Push schema directly to your MySQL database
npm run db:push

# 3. Seed demo tenants, employees, projects, tasks, drawings, and finances
npm run db:seed
```

### Running the Application

```bash
# Start Next.js development server with Webpack compiler
npm run dev

# Or compile and start production build
npm run build
npm run start
```

Navigate to:
- **100% DESIGN Studio**: `http://localhost:3000/w/100percentdesign/login`
- **Apex Architecture Studio**: `http://localhost:3000/w/apex-studio/login`

---

## 13. Demo Seed Accounts & Verification Credentials

All demo accounts across all workspaces share the master demonstration password:
```
StudioPassword2026!
```

### Workspace 1: 100% DESIGN Studio (`/w/100percentdesign/login`)

| Employee Name | Employee ID | Registered Email | Studio Role | Department | Key Capabilities to Test |
|---|---|---|---|---|---|
| **Tanya Mathur** | `EMP-001` | `tanya@100percentdesign.in` | Partner (`OWNER`) | Design Leadership | Full studio control, approvals, budgets, direct overrides |
| **Kabir Mehra** | `EMP-002` | `kabir@100percentdesign.in` | Partner (`OWNER`) | Operations & Projects | Co-owner privileges, partner task delegation, reviews |
| **Priya Sharma** | `EMP-003` | `admin@100percentdesign.in` | Administrator (`ADMIN`) | Studio Operations | Employee onboarding, deactivations, project creation |
| **Rohan Verma** | `EMP-004` | `rohan@100percentdesign.in` | Project Manager (`PROJECT_MANAGER`) | Architecture | Phase management, drawing approvals, task assignments |
| **Ananya Roy** | `EMP-005` | `ananya@100percentdesign.in` | Employee (`EMPLOYEE`) | Project Architect | Site check-ins, task progress, drawing uploads (No self-approval) |
| **Vikram Sen** | `EMP-006` | `vikram@100percentdesign.in` | Employee (`EMPLOYEE`) | 3D Visualization | Task deliverables, 3D render uploads, checklist completion |

### Workspace 2: Apex Architecture Studio (`/w/apex-studio/login`)

Demonstrates complete multi-tenant separation and identical Employee ID handling:

| Employee Name | Employee ID | Registered Email | Role | Verification Purpose |
|---|---|---|---|---|
| **Siddharth Rao** | `EMP-001` | `siddharth@apexstudio.in` | Owner (`OWNER`) | Proves `EMP-001` collision independence from Tanya Mathur |
| **Meera Nair** | `EMP-002` | `meera@apexstudio.in` | Employee (`EMPLOYEE`) | Proves zero data leakage between independent studio tenants |

---

## 14. Production Deployment, Backups & SaaS Lifecycle

### Point-in-Time Recovery & Backups
- **Logical Backups**: Run automated daily logical dumps using `mysqldump` with `--single-transaction` and `--quick` flags.
- **Tenant Portability**: The `TenantExport` model records full JSON data exports generated asynchronously for studios migrating to private enterprise instances.

### Quota & Tier Enforcement
The SaaS engine evaluates active counts against subscription limits defined in `Plan`:
- `maxSeats`: Verified during `/api/employees/create`.
- `maxProjects`: Verified during project initialization.
- `maxStorageMB`: Checked before streaming drawing uploads into private storage.

### Data Protection & Deletion Grace Period
When a tenant requests workspace termination, `TenantLifecycleState` transitions to `DELETION_PENDING`. A 30-day grace period is enforced before hard-cascading deletion, providing protection against accidental or malicious deletions.

---

*Authored for 100% DESIGN Studio & Enterprise Architectural Practices.*
