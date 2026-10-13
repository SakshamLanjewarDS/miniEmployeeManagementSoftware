# 100% DESIGN Studio OS — Role & Capability Matrix

## 1. Role Standardization Overview

The platform enforces a strict three-role hierarchy:
1. **OWNER** (Studio Partner / Managing Principal): Sovereign tenant authority. Exclusively controls billing, workspace deletion, master external integrations, financial period locks, and emergency overrides.
2. **ADMIN** (Studio Practice Manager / Operations Lead): Operational administrator. Manages day-to-day employee onboarding/offboarding, task assignment, site issues, attendance adjustments, drawing approvals, and performance metrics. **Cannot self-escalate, edit billing subscriptions, or delete the tenant.**
3. **EMPLOYEE** (Architect / Interior Designer / Drafter): Practice practitioner. Scoped strictly to assigned projects and tasks, personal leaves, personal attendance punches, and deliverable submissions.

### Legacy Role Migration (`PROJECT_MANAGER`)
Historical databases or seeds containing `PROJECT_MANAGER` are safely mapped to `EMPLOYEE` with explicit project assignment capabilities and reviewer designation on governed deliverables. Legacy users are **never** automatically promoted to `ADMIN` or `OWNER`.

---

## 2. Granular Capability Matrix

| Capability ID | Description | OWNER | ADMIN | EMPLOYEE | Enforcing Module |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`tenant.manage_billing`** | Modify subscription, plan, and invoices | ✅ | ❌ | ❌ | `src/server/tenancy/permissions.ts` |
| **`tenant.delete_workspace`** | Request or execute studio deletion | ✅ | ❌ | ❌ | `src/server/tenancy/permissions.ts` |
| **`tenant.manage_integrations`** | Configure root Google Service accounts & API keys | ✅ | ❌ | ❌ | `src/server/tenancy/permissions.ts` |
| **`finance.period_lock`** | Finalize & permanently lock payroll/financial periods | ✅ | ❌ | ❌ | `src/server/tenancy/permissions.ts` |
| **`finance.view`** | View project budgets, fee milestones, and cash flow | ✅ | ✅* | ❌ | `src/server/modules/projects/finance.ts` |
| **`finance.manage`** | Record expenses, issue invoices, manage fee stages | ✅ | ✅* | ❌ | `src/server/modules/projects/finance.ts` |
| **`payroll.view`** | View studio salary sheets and disbursements | ✅ | ✅* | ❌ | `src/server/modules/payroll/service.ts` |
| **`payroll.prepare`** | Calculate monthly payroll, run Lop deductions | ✅ | ✅* | ❌ | `src/server/modules/payroll/service.ts` |
| **`employees.manage`** | Onboard, edit designations, and offboard staff | ✅ | ✅ | ❌ | `src/server/modules/employees/lifecycle.ts` |
| **`employees.view_directory`** | View studio team roster and contact directory | ✅ | ✅ | ✅ | `src/server/modules/employees/service.ts` |
| **`leave.approve`** | Review and decide staff leave requests | ✅ | ✅ | ❌ | `src/server/modules/leave/service.ts` |
| **`leave.request`** | Submit personal casual, sick, or hourly leave | ✅ | ✅ | ✅ | `src/server/modules/leave/service.ts` |
| **`leave.adjust_ledger`** | Post audited credit/debit adjustments with reasons | ✅ | ✅ | ❌ | `src/server/modules/leave/ledger.ts` |
| **`attendance.adjust`** | Make immutable manual punch corrections | ✅ | ✅ | ❌ | `src/server/modules/attendance/service.ts` |
| **`attendance.punch`** | Record personal morning punch-in & evening punch-out | ✅ | ✅ | ✅ | `src/server/modules/attendance/service.ts` |
| **`tasks.create`** | Create tasks and define acceptance criteria | ✅ | ✅ | ❌ | `src/server/modules/tasks/repository.ts` |
| **`tasks.assign`** | Assign multi-assignee task checklists | ✅ | ✅ | ❌ | `src/server/modules/tasks/repository.ts` |
| **`tasks.approve_governed`** | Independent review of governed deliverables (Four-Eyes) | ✅ | ✅ | ❌ | `src/server/modules/tasks/governance.ts` |
| **`tasks.work`** | Complete operational items & submit governed deliverables | ✅ | ✅ | ✅ | `src/server/modules/tasks/repository.ts` |
| **`drawings.approve`** | Review drawing revisions (No self-approval allowed) | ✅ | ✅ | ❌ | `src/server/modules/drawings/repository.ts` |
| **`drawings.upload`** | Upload new drawing revisions (R0, R1, R2...) | ✅ | ✅ | ✅ (Assigned) | `src/server/modules/drawings/repository.ts` |
| **`materials.approve`** | Approve physical finish/sample boards | ✅ | ✅ | ❌ | `src/server/modules/materials/service.ts` |
| **`materials.submit`** | Submit physical samples for review | ✅ | ✅ | ✅ (Assigned) | `src/server/modules/materials/service.ts` |
| **`rfis.manage`** | Respond to and formally close project RFIs | ✅ | ✅ | ❌ | `src/server/modules/rfis/service.ts` |
| **`rfis.submit`** | Raise formal Request for Information on project | ✅ | ✅ | ✅ (Assigned) | `src/server/modules/rfis/service.ts` |
| **`performance.view`** | Access studio-wide Employee Performance KPI dashboard | ✅ | ✅ | ❌ | `src/server/modules/performance/service.ts` |
| **`performance.view_details`**| Drill down into individual employee delivery analytics | ✅ | ✅ | ❌ | `src/server/modules/performance/service.ts` |
| **`performance.export`** | Download formula-sanitized, audited CSV performance data | ✅ | ✅ | ❌ | `src/app/api/performance/export/route.ts` |
| **`inbox.view`** | Unified Decision Inbox access | ✅ | ✅ | ❌ | `src/server/modules/inbox/service.ts` |

*\*Requires `hasFinanceAccess: true` flag on TenantMembership if Admin.*

---

## 3. Four-Eyes Principle & Self-Approval Prevention

The platform enforces strict independent peer review on all governed deliverables:
1. **Governed Tasks (`REVIEW_REQUIRED`)**: The submitter of a deliverable cannot approve their own submission, even if they hold the `OWNER` or `ADMIN` role.
2. **Drawing Revisions**: The uploader of a drawing revision cannot act as the reviewer.
3. **Material Samples**: The person submitting a material sample cannot approve the sample.
4. **Delegation**: A delegated reviewer cannot use delegated authority to approve their own work.
