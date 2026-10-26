# 100% DESIGN Studio OS — Owner & Administrator Action Items

**Target Project:** 100% DESIGN Studio OS / miniEmployeeManagementSoftware  
**Assessment Date:** October 2026  
**Audience:** Studio Principal / Workspace Owner, System Administrators, Security Officers  
**Classification:** Confidential Operational Security Runbook  

---

## Executive Summary

While all code vulnerabilities have been remediated locally and verified through automated test suites against isolated test targets, the security posture of the live production environment depends on specific operational actions that can only be completed by the business owner and infrastructure administrators.

Removing hardcoded credentials and web backdoors from source code **does not invalidate previously exposed credentials**. The actions below are required to establish a secure production baseline.

---

## 1. Google Apps Script Live Deployment (Action Required)

The repository includes a hardened integration script at [GoogleAppsScript_TwoWaySync.js](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/scripts/GoogleAppsScript_TwoWaySync.js). This update fixes the critical vulnerability where administrative approval links (`doGet`) mutated database state upon being pre-fetched by email antivirus scanners.

### Deployment Steps:
1. Open the Google Spreadsheet bound to your studio's synchronization project.
2. In the top menu, navigate to **Extensions > Apps Script**.
3. Replace the contents of `Code.gs` with the updated code from [GoogleAppsScript_TwoWaySync.js](file:///c:/Users/ASUS/Desktop/miniEmployeeManagementSoftware/scripts/GoogleAppsScript_TwoWaySync.js).
4. In the Apps Script editor, open **Project Settings** (gear icon on the left sidebar).
5. Scroll down to **Script Properties** and click **Edit script properties**:
   - `STUDIO_URL`: The production URL of your Studio OS instance (e.g. `https://studio.100percentdesign.in`).
   - `STUDIO_WEBHOOK_SECRET`: A high-entropy 64-character secret shared with Studio OS.
   - `DECISION_SECRET`: A high-entropy 64-character secret used to generate HMAC-SHA256 single-use decision tokens.
   - `WORKSPACE_SLUG`: The studio workspace identifier (default: `100percentdesign`).
6. Click **Save script properties**.
7. Click **Deploy > Manage deployments > Edit > New version**, and save.

> [!NOTE]
> The updated script converts `doGet` into a safe confirmation landing page that validates the HMAC token and requires a human click to trigger `doPost`. Antivirus scanners following email links will no longer accidentally approve leave or expense requests.

---

## 2. Immediate Credential Rotation & Session Invalidation Checklist

> [!WARNING]
> Because previous iterations of the repository and legacy documentation contained default passwords and development bypasses, any active systems using these strings must be rotated immediately.

### 2.1 Rotate Production Administrator Password
1. In your production server terminal or container shell:
   ```bash
   export RECOVERY_ADMIN_PASSWORD="StrongUniquePassphrase2026!"
   npx tsx scripts/restore-admin.ts "admin@100percentdesign.in" "100percentdesign"
   unset RECOVERY_ADMIN_PASSWORD
   ```
2. The script resets the password hash using bcrypt-12, logs an immutable `AuditEvent`, and automatically revokes all existing sessions for that user.

### 2.2 Global Session Invalidation
To force all connected devices, stale tokens, and unauthorized sessions to re-authenticate across the entire workspace, run the following SQL query on the production database:
```sql
UPDATE sessions SET revokedAt = NOW() WHERE revokedAt IS NULL;
```

### 2.3 Generate Production Cryptographic Secrets
Generate high-entropy secrets in your terminal using Node.js:
```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('OPERATOR_RECOVERY_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('STUDIO_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DECISION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```
Populate these keys into your hosting provider's environment variables (e.g. Render, Railway, AWS SSM).

### 2.4 Create Dedicated Non-Root Database Application Account
```sql
-- Runtime application account (minimal privileges)
CREATE USER 'studio_app'@'%' IDENTIFIED BY 'STRONG_RANDOM_PASSWORD_HERE';
GRANT SELECT, INSERT, UPDATE, DELETE ON studio_os_db.* TO 'studio_app'@'%';

-- Schema migration account (administrative privileges)
CREATE USER 'studio_migrate'@'%' IDENTIFIED BY 'STRONG_MIGRATE_PASSWORD_HERE';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON studio_os_db.* TO 'studio_migrate'@'%';

FLUSH PRIVILEGES;
```

---

## 3. Google Drive & Spreadsheet Access Permissions Audit

Because Google Drive permissions cannot be verified from local source code alone, the workspace owner must audit external file sharing settings:

1. **Leave Management & Vendor Google Sheets:**
   - Open the configured Google Sheets linked to Studio OS.
   - Click **Share** (top-right corner).
   - **Ensure "General access" is NOT set to "Anyone with the link".**
   - Restrict access strictly to designated studio administrative email accounts.
2. **Apps Script Webhook Deployment Access:**
   - In Apps Script deployment settings, verify "Who has access" is set appropriately. If set to "Anyone", ensure `DECISION_SECRET` and `STUDIO_WEBHOOK_SECRET` are configured so unauthorized requests are rejected immediately.

---

## 4. Production Domain TLS & Edge Firewall (WAF) Setup

1. **Enforce Modern TLS:** Ensure your reverse proxy (Cloudflare, Nginx, or AWS CloudFront) terminates traffic with TLS 1.3 (TLS 1.2 minimum) and HTTP-to-HTTPS 301 redirection.
2. **Verify HSTS Preload:** Verify that `Strict-Transport-Security` header (`max-age=63072000; includeSubDomains; preload`) is delivered on all responses.
3. **Configure Rate Limiting:**
   - `/api/auth/*`: 20 requests/minute per IP.
   - `/api/storage/*`: 100 requests/minute per IP.
   - General API routes: 300 requests/minute per IP.
