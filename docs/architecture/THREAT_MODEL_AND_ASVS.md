# Threat Model & OWASP ASVS 5.0 Level 2 Verification Mapping

## 1. System Threat Model (STRIDE)

| Threat Category | Asset at Risk | Potential Vector | Mitigation Implemented |
|---|---|---|---|
| **Spoofing** | User Identity, Session | Stolen session token, forged employee credentials | Revocable DB sessions, bcrypt hash, secure HttpOnly cookie, IP/UserAgent tracking |
| **Tampering** | Location Evidence, Approvals | Client-side coordinate fabrication, self-approval | Authoritative server receipt time, Haversine server-side calculation, raw event append-only, separate reviewer constraint |
| **Repudiation** | Actions, Overrides, Site Visits | Denial of task completion, missed checkout | Immutable `AuditEvent` log with actor ID, timestamp, and entity reference; append-only `SiteVisitEvent` |
| **Information Disclosure** | Cross-tenant data, precise GPS | Attacker accesses `/api/projects/[id]` of another tenant | Tenant-scoped repositories, DTO filtering, no raw coordinate serialization to general users |
| **Denial of Service** | Login, Exports, File Storage | Brute force login, massive export requests | Rate limiter on `/login`, paginated queries, file size limits, async job processing |
| **Elevation of Privilege** | Tenant Admin -> Owner | Admin alters owner permissions, promotes self | Strict role hierarchy in `canModifyMember()` service: admins cannot modify owner accounts |

## 2. OWASP ASVS 5.0 Verification Mapping

- **V2: Authentication**:
  - Secure password hashing using `bcryptjs` (salt rounds 10).
  - Rate limiting on login attempts to resist credential stuffing.
  - Server-managed sessions with explicit expiration and revocation.
  - Session invalidation upon password change or account deactivation.
- **V3: Session Management**:
  - HttpOnly, Secure, SameSite=Lax/Strict cookies.
  - Session IDs generated with cryptographically secure random bytes.
  - Periodic session expiration and absolute timeout.
- **V4: Access Control**:
  - Deny by default: unauthenticated or unmatched tenant requests fail closed.
  - Multi-tenant boundary checks on every database read/write.
  - Inability for non-privileged roles to approve drawings or access financial summaries.
- **V5: Validation & Sanitization**:
  - Strict input validation using Zod on every mutation.
  - CSV export formula injection mitigation (prefixing `=`, `+`, `-`, `@` with apostrophe `'`).
- **V8: Data Protection**:
  - Private storage adapter: files not accessible in web root.
  - Strict access authorization before streaming private files.
