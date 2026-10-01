# Architecture Decision Records (ADRs)
**100% DESIGN Studio — Multi-Tenant SaaS Employee & Architecture Project Management Platform**

---

## ADR 001: Modular Monolith with Shared-Database Tenant Isolation

- **Status**: Accepted
- **Context**: The studio requires a complete employee and architecture project management platform, starting with 100% DESIGN Studio as the flagship customer, but architected as a true multi-tenant SaaS ready for multiple architectural practices.
- **Decision**: Implement a modular monolith using Next.js App Router (React 19, TypeScript), MySQL, and Prisma ORM. Isolation is enforced at the application/service/repository layer via a mandatory, immutable `tenant_id` present on every tenant-owned record and validated in every query context.
- **Rationale**: 
  - Prevents premature operational complexity of microservices or database-per-tenant while guaranteeing strict data isolation.
  - Aligns with OWASP Multi-Tenant Security Cheat Sheet guidance.
  - Future database-per-tenant migration can be implemented per tenant using connection routing when enterprise scale demands it.
- **Consequences**: Every repository method must require `TenantContext` and include `where: { tenantId }` in all SELECT, UPDATE, DELETE, and nested relation operations.

---

## ADR 002: Authentication, Identity, and Tenant Membership Separation

- **Status**: Accepted
- **Context**: 
  - Employees sign in using their company-assigned Employee ID (e.g., `EMP-001`) and password.
  - Partners/owners may also sign in using their registered work email.
  - Multiple tenants may issue identical Employee IDs (e.g. Studio A and Studio B both have `EMP-001`).
  - Employees must never cross-register into arbitrary tenants.
  - Both studio partners need independent owner accounts with identical organization-wide privileges and separate personal task views.
- **Decision**: 
  - Separate global user identity (`User`) from tenant-specific membership (`TenantMembership`) and tenant-specific employee profiles (`Employee`).
  - Route authentication through `/w/{workspaceSlug}/login` where the `workspaceSlug` resolves the target tenant.
  - Validate Employee ID uniquely within that tenant: `@@unique([tenantId, employeeId])`.
  - Maintain server-managed revocable sessions (`Session` table) with secure HttpOnly cookies, session rotation on privilege change, and instant invalidation on deactivation.
- **Consequences**: No reliance on client-supplied claims. Acting identity, role, and tenant context are always derived from verified server session records.

---

## ADR 003: Geolocation Check-In Architecture & Geofence Heuristics

- **Status**: Accepted
- **Context**: Field employees visit construction and client sites. Location snapshot must be captured at Check-In and Check-Out. No continuous tracking, no false certainty, and no spoofing immunity claims.
- **Decision**: 
  - Single-shot browser location capture using `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })`.
  - Client sends coordinates, reported accuracy, client capture time, and an idempotency key.
  - Server calculates authoritative Haversine distance, logs authoritative `serverReceiptTime`, and evaluates the geofence using four distinct states:
    1. `WITHIN_RADIUS`: $d + a \le r$ (distance plus accuracy radius is completely inside site radius).
    2. `OUTSIDE_RADIUS`: $d - a > r$ (distance minus accuracy radius is completely outside site radius).
    3. `UNCERTAIN`: Accuracy circle overlaps site boundary or accuracy exceeds threshold ($a > \text{threshold}$).
    4. `LOCATION_UNAVAILABLE`: Device denied permission or sensor failed; requires explicit user reason for admin review.
  - Enforce concurrency: Exactly 1 active visit per employee at any given time using transactional locks.
- **Consequences**: Raw evidence is append-only in `SiteVisitEvent`. Server receipt time is trusted; client timestamp is stored as untrusted telemetry.

---

## ADR 004: Version-Locked Document Approvals and Drawing Revisions

- **Status**: Accepted
- **Context**: Architectural drawings undergo frequent revisions (R0, R1, R2). Approvals must apply strictly to exact revisions.
- **Decision**:
  - `Document` represents the conceptual asset (e.g., "Ground Floor Electrical Layout").
  - `DocumentVersion` represents an exact immutable revision with a private file reference.
  - Approvals (`ApprovalRequest` & `ApprovalDecision`) target the exact `DocumentVersion.id`.
  - Uploading a new revision supersedes prior revisions and requires a distinct approval lifecycle. Approvals are never inherited.
  - External client approvals recorded by studio staff are flagged as `recorded on behalf of client` with verification evidence.

---

## ADR 005: Financial Modeling & Separation of Commitments vs. Expenses

- **Status**: Accepted
- **Context**: Architects manage project budgets, client fee milestones, fee receipts, and contractor quotations.
- **Decision**:
  - Use exact `Decimal(15, 2)` types for all monetary values. Never use floating-point numbers.
  - Keep contractor quotation commitments separate from recorded project expenses to prevent double-counting.
  - Fee receipts minus expenses is labeled as "Net Cash Position", never claimed as "Audited Profit".
  - Finance endpoints are strictly permission-gated (Owner/Partner, or Admins/PMs with explicit finance grant).

---

## ADR 006: Private Object Storage & Authorized Streaming

- **Status**: Accepted
- **Context**: Architectural drawings, contractor quotations, and site photos are confidential intellectual property and must never be exposed via public static directories.
- **Decision**:
  - Implement a private file storage adapter. In development, files are stored outside the public directory (under `storage/uploads/`).
  - File access is mediated through an authorized route (`/api/storage/files/[fileId]`) that checks the session, tenant membership, and project access permissions before streaming bytes.
  - Store metadata (file name, MIME, byte size, SHA-256 hash, quarantine status) in the MySQL database.
