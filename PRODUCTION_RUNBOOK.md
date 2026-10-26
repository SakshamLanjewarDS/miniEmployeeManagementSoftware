# 100% DESIGN Studio OS — Production Deployment & Operations Runbook

**Document Version:** 4.0.0 (Hardened & Audited)  
**Target Architecture:** Multi-Tenant Next.js 16 (App Router) + Prisma ORM 6.4 + MySQL 8.0  
**Audience:** DevSecOps Engineers, Database Administrators, System Operators  
**Tested Revision:** Git commit `f3cb8614b107f0503250b24c11b0d11777491fff` + uncommitted hardening  

---

## 1. Production Architecture Overview

100% DESIGN Studio OS is an enterprise multi-tenant operating system handling architectural deliverables, confidential identity documents, bank accounts, monthly payroll, site inspection tracks, and two-way Google Sheets synchronization.

The production deployment architecture consists of:
- **Application Runtime:** Next.js 16.3.7 running on Node.js v20+ / v24 LTS within a hardened non-root container (`nextjs:nodejs`, UID 1001).
- **Database Engine:** MySQL 8.0+ (or TiDB Serverless) with InnoDB engine, UTF8MB4 charset, and READ COMMITTED transaction isolation.
- **ORM / Schema:** Prisma 6.4.1 managing relational models across tenants.
- **Private Malware Scanner:** ClamAV daemon container pinned to `clamav/clamav:1.4.1` on an internal private network (port 3310 never published to host).
- **Private Storage:** Tenant-partitioned local filesystem volume at `./storage/uploads/tenant-{id}/` with non-root ownership (`1001:1001`).

---

## 2. Pre-Deployment Configuration & Secrets Checklist

Configure the following environment variables in your production secret manager (AWS Secrets Manager, HashiCorp Vault, Render/Railway Environment Variables). **Never commit credentials to version control or CLI commands.**

| Environment Variable | Required | Production Security Guidance |
| :--- | :--- | :--- |
| `NODE_ENV` | **YES** | Must be strictly `production`. Disables `/api/admin/restore-admin` (returns 404) and development fallbacks. |
| `DATABASE_URL` | **YES** | Format: `mysql://studio_app:STRONG_PASSWORD@db-host:3306/studio_os_db?sslmode=require&connection_limit=25`. Requires valid Prisma MySQL TLS parameters. |
| `DATABASE_MIGRATION_URL` | Optional | Dedicated migration user URL with `CREATE, ALTER, DROP, INDEX` permissions for schema upgrades. |
| `SESSION_SECRET` | **YES** | Cryptographically random string (minimum 64 hex characters: `openssl rand -hex 32`). |
| `INITIAL_ADMIN_EMAIL` | Optional | Designated studio administrator email (defaults safely to `admin@100percentdesign.in`). Never uses developer personal accounts. |
| `INITIAL_ADMIN_PASSWORD` | Optional | Password for initial studio setup. Once bootstrapped, accounts are never overwritten. |
| `OPERATOR_RECOVERY_KEY` | Optional | High-entropy token for emergency recovery. In production, recovery is performed via offline CLI. |
| `CLAMAV_HOST` | Optional | Internal network hostname of ClamAV daemon (`clamav`). |
| `CLAMAV_PORT` | Optional | ClamAV INSTREAM port (default: `3310`). |
| `CLAMAV_ENABLED` | Optional | Set to `"true"` to mandate antivirus scanning before file storage. |

---

## 3. Database Deployment, Accounts & TLS Configuration

### 3.1 Principle of Least Privilege: Database Accounts
Separate runtime application privileges from schema migration privileges:
1. **Application Runtime Account (`studio_app`):**
   ```sql
   CREATE USER 'studio_app'@'%' IDENTIFIED BY 'STRONG_RUNTIME_PASSWORD';
   GRANT SELECT, INSERT, UPDATE, DELETE ON studio_os_db.* TO 'studio_app'@'%';
   FLUSH PRIVILEGES;
   ```
2. **Schema Migration Account (`studio_migrate`):**
   ```sql
   CREATE USER 'studio_migrate'@'%' IDENTIFIED BY 'STRONG_MIGRATE_PASSWORD';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON studio_os_db.* TO 'studio_migrate'@'%';
   FLUSH PRIVILEGES;
   ```

### 3.2 Prisma MySQL TLS Handshake Configuration
Prisma 6.4 uses MySQL drivers that support the following TLS parameters in `DATABASE_URL`:
- `sslmode=require`: Mandates TLS encryption in transit. Rejects unencrypted plaintext connections.
- `sslmode=prefer`: Attempts TLS encryption, falling back to plaintext if the server does not support TLS (for local dev only).
- `sslcert=/path/to/ca.pem`: Specifies the path to a custom Certificate Authority root bundle.

> [!WARNING]
> **DO NOT USE `sslaccept=strict`**: This is a PostgreSQL-only parameter and is invalid for Prisma MySQL datasource URLs. Use `sslmode=require` with optional `sslcert`.

**Example Verified TLS URL:**
```text
DATABASE_URL="mysql://studio_app:SecretPass@db.production.internal:3306/studio_os_db?sslmode=require&sslcert=/app/certs/ca-bundle.pem&connection_limit=25"
```

### 3.3 Container Startup & Schema Synchronization
In production containers, schema synchronization must use pre-installed binaries without downloading packages from the npm registry:
```bash
# Executed by scripts/entrypoint.sh inside the container:
./node_modules/.bin/prisma db push --skip-generate
```

---

## 4. Emergency Administrative Account Recovery

Emergency administrator recovery must NEVER accept passwords as command-line arguments to avoid exposure in process tables (`ps aux`) and shell history.

### Safe CLI Recovery Procedure
1. Access the application container via secure shell:
   ```bash
   docker exec -it studio_os_app sh
   ```
2. Set the recovery password securely in the process environment:
   ```bash
   export RECOVERY_ADMIN_PASSWORD="StrongNewPassword2026!"
   ```
3. Run the audited recovery script:
   ```bash
   npx tsx scripts/restore-admin.ts "admin@100percentdesign.in" "100percentdesign"
   ```
4. Clear the environment variable immediately:
   ```bash
   unset RECOVERY_ADMIN_PASSWORD
   ```

### Recovery Guarantees
- The script rejects passwords passed in `process.argv` with a fatal error.
- Updates the user's password hash using bcrypt-12.
- Automatically revokes all existing sessions for the recovered user (`prisma.session.deleteMany`).
- Logs an immutable `AuditEvent` (`CLI_ADMIN_RECOVERED`) containing the timestamp and operator context.

---

## 5. Session Revocation Operations

### Scope 1: Single User Session Revocation
When an employee resigns, a device is lost, or credentials are changed:
```typescript
import { revokeAllUserSessions } from "@/server/auth/session";

// Revokes all active sessions for the specific user across all devices
await revokeAllUserSessions(targetUserId);
```
Or via direct SQL query:
```sql
UPDATE sessions SET revokedAt = NOW() WHERE userId = 'TARGET_USER_ID' AND revokedAt IS NULL;
```

### Scope 2: Tenant-Wide Session Invalidation
When an organization-wide credential rotation occurs:
```typescript
import { revokeAllTenantSessions } from "@/server/auth/session";

// Revokes all active sessions for all users belonging to the tenant
await revokeAllTenantSessions(targetTenantId);
```
Or via direct SQL query:
```sql
UPDATE sessions SET revokedAt = NOW() WHERE activeTenantId = 'TARGET_TENANT_ID' AND revokedAt IS NULL;
```

---

## 6. Private Antivirus Scanner (ClamAV) Management

1. **Private Docker Networking:**
   ClamAV daemon must listen only on the internal Docker network. In `docker-compose.yml`, specify `expose: ["3310"]` (never `ports: ["3310:3310"]`).
2. **Pinned Image Tag:**
   Pin the image to `clamav/clamav:1.4.1` to prevent unreviewed major version upgrades.
3. **Signature Freshness & Healthcheck:**
   Mount persistent volume `clamav_db:/var/lib/clamav` so signatures persist across restarts. ClamAV automatically runs `freshclam` in the background.
   Verify scanner health:
   ```bash
   docker exec studio_os_clamav clamdscan --ping 3
   # Expected output: PONG
   ```

---

## 7. Isolated Backup & Restore Procedure

### 7.1 Automated Snapshot Creation
The snapshot engine (`scripts/backup-db.ts`) compresses the database and generates a SHA-256 verification digest without exposing passwords in CLI arguments:

```bash
# Execute audited backup:
npx tsx scripts/backup-db.ts
```

**Verification Output:**
```text
Archive  : backups/pre_deploy_backup_20261024_085211.sql.gz (299.58 KB)
Checksum : 521a206489542195038850c3f0ba6275b1e25f8348eedf1141574f5b649dca19
Companion: backups/pre_deploy_backup_20261024_085211.sql.gz.sha256
```

### 7.2 Non-Destructive Restore Validation Drill
Quarterly restore verification must NEVER be performed on production or development databases (`studio_os_db`). Validate snapshots in a dedicated disposable database (`studio_os_test`):

```bash
# Execute non-destructive restore drill:
npx tsx scripts/restore-db.ts backups/pre_deploy_backup_20261024_085211.sql.gz
```

**Automated Validation Steps:**
1. Validates archive SHA-256 hash against `.sha256` companion file.
2. Refuses `studio_os_db` unless explicit confirmation flag is passed.
3. Streams decompressed SQL into `studio_os_test` using `MYSQL_PWD`.
4. Inspects schema to confirm all **81 tables** are populated and intact.

---

## 8. Rollback Procedures

### Scenario A: Application Container Regression
If a new release introduces runtime issues:
1. Revert container image to previous tag:
   ```bash
   docker-compose stop app
   docker-compose up -d --no-deps app
   ```
2. Review migration status: `npx prisma migrate status`.
3. If schema changes were additive (new columns/tables), the previous container will run safely against the forward-compatible schema.

### Scenario B: Database Schema Rollback
1. Stop the application container immediately: `docker-compose stop app`.
2. Review the latest backup archive and verify SHA-256 integrity.
3. Restore the verified snapshot into staging to confirm data integrity before production restoration.
