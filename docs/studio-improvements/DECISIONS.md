# 100% DESIGN Studio Improvements — Architectural Decision Records (`DECISIONS.md`)

> **Programme**: Complete Studio OS Improvements  
> **Status**: Approved & Authoritative  

---

## ADR-09: Employee Leave Application & Cancellation Workflow

- **Context**: Project 2 originally restricted employees to read-only access on My Leave. The new improvement mandate supersedes this by allowing employees to submit their own leave applications, edit/withdraw their own pending requests, and request cancellation of their approved leaves.
- **Decision**: 
  - Employees derive identity strictly from session context (`membershipId`).
  - Employees can edit or withdraw requests *only while the status is PENDING*. Editing increments the record `version` and records an audit log.
  - Approved leave cancellation requires a separate `StudioLeaveCancellationRequest` entity. While pending or rejected, the original leave remains approved and affects balances. Upon approval by an Owner/Admin, the original leave is updated to `CANCELLED` and monthly allowances are recalculated transactionally.
- **Consequences**: Strict prevention of self-approval. Zero direct cancellation or allowance manipulation by employees.

---

## ADR-10: 24-Hour Notice Policy & Automatic Rejection

- **Context**: Business rules specify that non-exempt leave requests submitted less than 24 hours before the local leave-start time must be automatically rejected, while Sick/Emergency/Hourly leave bypasses the threshold.
- **Decision**:
  - Notice is evaluated from the exact local datetime of the leave start:
    - Full day: 10:30 AM of `startDate`
    - Half day: 10:30 AM (morning session) or 14:30 PM (afternoon session)
    - Hourly: selected start time
  - If `submittedAt` is within 24 hours of start and the leave is not exempt (Sick, Emergency, Hourly), the request status is automatically set to `REJECTED` upon creation with `rejectionReason: "Auto-rejected: Ordinary leave requires at least 24 hours advance notice."` and `reviewedById: "SYSTEM"`.
  - Historical approved requests remain untouched.

---

## ADR-11: Unified Approval Inbox Architecture

- **Context**: Leadership currently has scattered approval surfaces across tasks, profile changes, and scope changes, with leaves handled on a separate page.
- **Decision**:
  - Extend `getOwnerDecisionInbox` to aggregate all pending leadership action items:
    1. Deliverable Submissions (`DELIVERABLE_SUBMISSION`)
    2. Deadline Extensions (`DEADLINE_EXTENSION`)
    3. Scope Changes (`SCOPE_CHANGE`)
    4. Profile Changes (`PROFILE_CHANGE`)
    5. Drawing Revisions (`DRAWING_REVISION`)
    6. Site Visits (`SITE_VISIT`)
    7. Leave Applications (`LEAVE_APPLICATION`)
    8. Leave Cancellations (`LEAVE_CANCELLATION`)
  - Keep domain-specific approval services to prevent generic authorization bypasses.
  - Implement concurrent decision guards returning an explicit "already reviewed" result.

---

## ADR-12: Drawing Revision Control & Site-Facing Guarantee

- **Context**: Architecture drawings require revision history. Site personnel must always view the latest *approved* revision, not an unapproved work-in-progress draft.
- **Decision**:
  - Retain `Document` and `DocumentVersion`.
  - When a new revision is uploaded, it is created in `DRAFT` or `SUBMITTED` state. It never replaces the `latestApprovedVersion` reference.
  - When leadership approves a revision, the previous approved revision is marked `supersededById` atomically.
  - Site views default strictly to `latestApprovedVersion`, showing a prominent yellow banner if the user inspects an older/superseded revision.

---

## ADR-13: Site Issue Tracking Lifecycle

- **Context**: Site inspections require structured defect and issue tracking linked to project locations, drawings, contractors, and resolution evidence.
- **Decision**:
  - Implement `StudioSiteIssue` with lifecycle: `OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `READY_FOR_VERIFICATION` $\rightarrow$ `CLOSED`.
  - Resolution requires evidence photos and notes.
  - Only an authorized verifier (Owner/Admin or designated Project Manager) can close the issue.
  - Reopening requires an explicit reason and preserves past resolution history.

---

## ADR-14: Workload & Capacity Planning Math

- **Context**: Capacity planning must calculate true studio capacity from working hours minus approved leaves and holidays, compared against estimated task demand.
- **Decision**:
  - Standard work schedule: 8 hours (480 minutes) per workday, excluding Sundays and studio holidays.
  - Available capacity for employee $E$ in window $W$:
    $$\text{Capacity}(E, W) = \sum_{d \in W, \text{working}} \Big(8\text{ hrs} - \text{ApprovedLeaveHours}(E, d)\Big)$$
  - Demand is calculated from tasks with `estimatedHours` spanning the window, divided across assignees. If a task has no estimate, it is flagged as "Estimate Incomplete" rather than assuming arbitrary hours.
  - Visual indicators show $< 80\%$ (underallocated), $80–100\%$ (optimal), $> 100\%$ (overallocated).

---

## ADR-15: Reusable Project & Checklist Templates

- **Context**: New architectural projects frequently reuse standard phases (Concept, Schematic, Design Development, GFC, Handover) and milestone checklists.
- **Decision**:
  - Implement `StudioProjectTemplate` with Draft, Published, and Archived states.
  - Applying a template creates an immutable snapshot inside the active project.
  - Master template modifications never mutate already-applied project instances.
  - Template dependency validation prevents circular prerequisites before saving or applying.

---

## ADR-16: Isolated Backup Verification Protocol

- **Context**: Real backups and restore verification must be distinct states. A restore test must never overwrite production or trigger external side effects (emails, syncs, webhooks).
- **Decision**:
  - Track backups via `StudioBackupLog` (identifier, timestamp, scope, size, checksum, status).
  - Restore verification is executed in an isolated disposable schema/database with outbound email and sync disabled.
  - Record the verified restore timestamp and execution duration.
