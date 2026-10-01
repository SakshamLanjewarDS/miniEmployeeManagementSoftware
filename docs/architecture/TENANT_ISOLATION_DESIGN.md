# Multi-Tenant SaaS Isolation Design

## 1. Architectural Strategy
The platform employs a shared database with application-enforced logical tenant isolation, adhering to the OWASP Multi-Tenant Security Cheat Sheet principles.

### Key Tenets
1. **Mandatory Tenant Key**: Every tenant-scoped entity contains `tenantId` as a foreign key referencing `tenants.id`.
2. **Immutable TenantContext**: Every incoming request (Server Action, Route Handler, Background Job) constructs an immutable `TenantContext`:
   ```typescript
   export interface TenantContext {
     readonly tenantId: string;
     readonly tenantSlug: string;
     readonly userId: string;
     readonly membershipId: string;
     readonly role: TenantRole;
     readonly hasFinanceAccess: boolean;
     readonly timezone: string;
     readonly currency: string;
   }
   ```
3. **Repository-Enforced Scoping**: Business services do not perform raw unrestricted queries. All database access routes through scoped repository functions where `where: { tenantId: ctx.tenantId, ... }` is strictly enforced.
4. **Composite Unique Keys & Indexes**:
   - `tenants`: `id` (UUID), `slug` (unique)
   - `employees`: `@@unique([tenantId, employeeId])`
   - `projects`: `@@unique([tenantId, code])`
   - `tenant_memberships`: `@@unique([tenantId, userId])`
   - `site_visit_events`: `@@unique([tenantId, idempotencyKey])`

## 2. Workspace Routing & Resolution
- Canonical URL pattern: `/w/{workspaceSlug}/...`
- When a user accesses `/w/{workspaceSlug}/login`:
  1. The server resolves the tenant by `slug`.
  2. If tenant does not exist or is Suspended/Deleted, access is rejected immediately.
  3. The employee logs in using their Employee ID + Password.
  4. The server queries `Employee` where `tenantId = resolvedTenant.id AND employeeId = inputEmployeeId`.
  5. The server retrieves the linked `User` and verifies `passwordHash`.
  6. A revocable session is created in the database, setting a secure HttpOnly cookie.
  7. The user is redirected to `/w/{workspaceSlug}/tasks` (My Tasks).

## 3. Defense-in-Depth Verification Matrix
| Boundary | Enforcement Point | Failure Mode |
|---|---|---|
| Route & URL | Middleware & Layout loader | 404 / 403 Redirect to login |
| Server Action / API | `requireTenantContext(request)` | Throws `UnauthorizedException` / `TenantMismatchException` |
| Database Layer | Scoped Repository methods with `tenantId` filter | Returns null or empty set; zero leakage |
| File Storage | `/api/storage/files/[id]` with membership check | 403 Forbidden |
| Cache & Memory | Tenant-prefixed keys `tenant:{id}:...` | Partitioned cache spaces |

## 4. Cross-Tenant Attack Resistance
- **Guessed IDs**: An attacker in Tenant A trying to access `/api/projects/PRJ-TENANT-B-UUID` fails because the repository queries `where: { id: targetId, tenantId: ctx.tenantId }`.
- **Nested Relation Hijacking**: Connecting a task to a project or site requires verifying that the target project belongs to `ctx.tenantId`.
- **Global User Multi-Membership**: A single user with memberships in both Tenant A (EMPLOYEE) and Tenant B (OWNER) maintains completely isolated session and role contexts.
