# 100% DESIGN Studio OS — Secret & Credential Rotation Procedure

**Document ID:** SEC-04-ROTATION  
**Version:** 3.4.0  
**Target Environments:** Staging, Production

---

## 1. Scope of Credentials

| Credential Type | Variable Name | Rotation Frequency | Invalidation Impact |
| :--- | :--- | :--- | :--- |
| **Session Secret** | `SESSION_SECRET` | 90 days or upon incident | Invalidates all active user sessions; requires re-login |
| **Database Runtime Account** | `DATABASE_URL` | 180 days or upon departure | Requires zero-downtime dual-user rotation |
| **Google Sheets Webhook Secret**| `GOOGLE_SHEETS_WEBHOOK_SECRET` | 90 days | Requires updating Apps Script Script Properties |
| **SMTP Mail Transport** | `SMTP_PASSWORD` | 180 days | Temporary mail queue pause in outbox until updated |

---

## 2. Zero-Downtime Session Secret Rotation

1. **Generate New Strong Secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Deploy Dual-Key Support (Grace Period)**:
   - Configure `SESSION_SECRET_OLD` alongside `SESSION_SECRET_NEW`.
   - The application signs with `NEW` while accepting valid unexpired cookies signed by `OLD`.
3. **Emergency Revocation (If Compromised)**:
   - To force immediate logout across all users:
   ```sql
   UPDATE sessions SET revokedAt = NOW() WHERE revokedAt IS NULL;
   ```
   - Restart all Node.js / Next.js server instances to flush in-memory session caches.

---

## 3. Database Credential Rotation (Least-Privilege Dual User)

1. Provision secondary database runtime user with minimal DML privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on `mini_employee_db`:
   ```sql
   CREATE USER 'studio_app_v2'@'%' IDENTIFIED BY '<strong-random-password>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON mini_employee_db.* TO 'studio_app_v2'@'%';
   FLUSH PRIVILEGES;
   ```
2. Update application deployment environment `DATABASE_URL` to point to `studio_app_v2`.
3. Perform rolling application restart. Verify `/api/health` reports status `UP`.
4. Decommission legacy database user `studio_app_v1` after 24-hour verification window:
   ```sql
   REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'studio_app_v1'@'%';
   DROP USER 'studio_app_v1'@'%';
   ```

---

## 4. Google Sheets Webhook Secret Rotation

1. Generate a new HMAC token in Studio OS Settings $\to$ Integrations.
2. In Google Apps Script $\to$ Project Settings $\to$ Script Properties:
   - Set `STUDIO_WEBHOOK_SECRET` = `<new_token>`.
3. Save script properties and trigger a test sync ping from Studio OS Integration Console.
4. Verify HTTP 200 acknowledgment in `StudioSyncRun` table.

> [!IMPORTANT]
> Removing or updating a credential in source code or local files does **NOT** count as rotating the live operational credential. Live credentials must be updated in hosting secret managers (e.g., Railway, AWS Secrets Manager, Vercel Environment Variables) and verified.
