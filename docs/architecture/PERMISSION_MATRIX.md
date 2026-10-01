# Role & Permission Matrix
**100% DESIGN Studio — Multi-Tenant Architecture Project Management Platform**

## Roles Definition
- **Owner/Partner**: Full studio access across all projects, employees, settings, reviews, finance, and tenant administration.
- **Administrator**: Operational and employee administration; user management, invitation handling, project creation. Finance access requires explicit flag `hasFinanceAccess`.
- **Project Manager**: Full management of assigned projects, tasks, drawings, site visits, and approvals. Finance access requires explicit flag `hasFinanceAccess`.
- **Employee**: Assigned projects, assigned tasks, field site check-in/out, document viewing, task progress submission for review. Cannot approve own deliverables or edit captured location evidence.

## Granular Permission Grid

| Resource / Action | Owner/Partner | Administrator | Project Manager | Employee |
|---|:---:|:---:|:---:|:---:|
| **Tenant Settings & Billing** | ✅ Full | ❌ Denied | ❌ Denied | ❌ Denied |
| **Manage Employees & Invitations** | ✅ Full | ✅ Full | ❌ Denied | ❌ Denied |
| **Deactivate Member Accounts** | ✅ Full | ✅ Non-owner only | ❌ Denied | ❌ Denied |
| **Create Project** | ✅ Yes | ✅ Yes | ❌ Denied | ❌ Denied |
| **View Projects** | ✅ All in Tenant | ✅ All in Tenant | ✅ Assigned only | ✅ Assigned only |
| **Manage Project Members** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Denied |
| **Create / Assign Tasks** | ✅ Any member | ✅ Any member | ✅ In assigned project | ❌ Assigned only |
| **Submit Task for Review** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Assigned tasks |
| **Approve Task Deliverable** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Forbidden (No self-approval) |
| **Request Task Changes** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Forbidden |
| **Direct Completion Override** | ✅ Audit-logged | ✅ Audit-logged | ❌ Denied | ❌ Denied |
| **Site Check-In / Check-Out** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Own assigned visits |
| **Review Site Visit Reports** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Denied |
| **View Raw Coordinates** | ✅ Yes | ✅ Yes | ✅ In assigned project | ✅ Own visits only |
| **Upload Drawing Revision** | ✅ Yes | ✅ Yes | ✅ In assigned project | ✅ In assigned project |
| **Approve Drawing Version** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Denied |
| **Record Client Approval** | ✅ Yes | ✅ Yes | ✅ In assigned project | ❌ Denied |
| **View Project Financials** | ✅ Yes | ⚠️ If granted | ⚠️ If granted | ❌ Denied |
| **Manage Budgets & Fees** | ✅ Yes | ⚠️ If granted | ⚠️ If granted | ❌ Denied |
| **Export Audit Logs / CSV** | ✅ Yes | ✅ Operational only | ❌ Denied | ❌ Denied |

## Server-Side Enforcement Rules
1. Every Server Action, Route Handler, and Page Loader verifies session and constructs `TenantContext`.
2. UI toggles and disabled buttons are UX conveniences; the backend must independently check permissions.
3. Sensitive fields (financial amounts, audit actor details, exact coordinates of other employees) are omitted from DTOs when requested by unauthorized roles.
