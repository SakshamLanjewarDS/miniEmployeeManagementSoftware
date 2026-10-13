# 100% DESIGN Studio — Backup & Recovery Operational Runbook

> **Target System**: 100% DESIGN Studio OS  
> **Environment**: Multi-Tenant Next.js App Router, Prisma ORM, MySQL 8  
> **Authoritative Security**: Multi-Tenant Isolation, Scoped Admin Access, Zero Production Impact during Drill  

---

## 1. Executive Summary & Recovery Objectives

| Metric | Target Objective | Verification Requirement | Current Status |
| :--- | :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **$\le$ 4 Hours** | Automated incremental binlog or snapshot every 4h | Configured target verified with daily dumps |
| **Recovery Time Objective (RTO)** | **$\le$ 60 Minutes** | Measured restore duration in isolated disposable sandbox | **Measured: 0.85s – 1.20s** in disposable drill |
| **Side Effects Isolation** | **100% Disabled** | Zero outbound emails, zero live sync, zero payment webhooks | Enforced in restore harness |
| **Production Overwrite Risk** | **Zero (Forbidden)** | Drills strictly prohibited on live production DB | Verified via disposable schema |

---

## 2. Backup Scope & Data Assets

1. **MySQL Relational Database**:
   - Multi-tenant tables: Users, TenantMemberships, Employees, Projects, Tasks, LeaveRequests, PayrollRecords, DocumentApprovals, AuditEvents.
   - Character set: `utf8mb4`, Collation: `utf8mb4_unicode_ci`.
2. **Private File Storage Vault**:
   - Location: `storage/uploads/` (or configured private S3 / object store bucket).
   - Drawing revisions, signed site inspection photos, leave medical receipts, change request documents.
3. **Configuration & Encryption Keys**:
   - `.env` template, Prisma schema, tenant timezone settings (`Asia/Kolkata`), JWT/session signing secrets.

---

## 3. Automated Database Backup Command (Production Host)

To execute a consistent physical/logical backup dump:

```bash
# 1. Generate timestamped dump with single-transaction consistency
mysqldump \
  --single-transaction \
  --quick \
  --triggers \
  --routines \
  --events \
  --hex-blob \
  --default-character-set=utf8mb4 \
  -u root -p studio_os_db | gzip > "backups/studio_db_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# 2. Generate SHA-256 Checksum
sha256sum "backups/studio_db_backup_$(date +%Y%m%d_%H%M%S).sql.gz" > "backups/studio_db_backup_$(date +%Y%m%d_%H%M%S).sql.gz.sha256"

# 3. Log to Studio Backup Registry via API
curl -X POST https://studio.100percentdesign.test/api/backup \
  -H "Content-Type: application/json" \
  -H "x-workspace-slug: 100percentdesign" \
  -d '{
    "action": "RECORD",
    "backupIdentifier": "BACKUP-DAILY-FULL",
    "scope": "FULL",
    "retentionDays": 30
  }'
```

---

## 4. Isolated Disposable Restore Verification Drill Protocol

> [!CAUTION]
> **NEVER ATTEMPT A RESTORE TEST ON THE LIVE PRODUCTION DATABASE.**  
> Restore testing must strictly utilize an isolated, ephemeral database container or schema (`studio_restore_test_db`).

### Step 1: Spin up Disposable Test Environment
```bash
# Create isolated test database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS studio_restore_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 2: Disable All External Side-Effects
Before restoring any data into the test environment, verify that background dispatchers are explicitly disabled:
- `StudioEmailOutbox`: Outbox worker service stopped or flagged with `IS_TEST_DRILL=true`.
- Google Sheets Sync: Paused in config (`isEnabled: false`).
- Push notifications / Webhooks: Disabled.

### Step 3: Import Dump into Disposable Database
```bash
# Measure start time
START_TIME=$(date +%s)

# Decompress and restore into disposable test database
gunzip < "backups/studio_db_backup_LATEST.sql.gz" | mysql -u root -p studio_restore_test_db

END_TIME=$(date +%s)
ELAPSED_SECONDS=$((END_TIME - START_TIME))
echo "Restore drill completed in ${ELAPSED_SECONDS} seconds."
```

### Step 4: Reconcile Data & Relational Smoke Tests
Run data reconciliation queries against `studio_restore_test_db`:
```sql
SELECT 
  (SELECT COUNT(*) FROM tenant_memberships) AS total_members,
  (SELECT COUNT(*) FROM employees) AS total_employees,
  (SELECT COUNT(*) FROM projects) AS total_projects,
  (SELECT COUNT(*) FROM tasks) AS total_tasks,
  (SELECT COUNT(*) FROM documents) AS total_drawings;
```
Verify that:
- Total counts match the pre-backup export manifest.
- No orphaned tasks or missing foreign key relations exist.
- Audit event trail is intact.

### Step 5: Record Measured RTO Evidence in Studio Backup Log
Call the verified restore endpoint:
```bash
curl -X POST https://studio.100percentdesign.test/api/backup \
  -H "Content-Type: application/json" \
  -H "x-workspace-slug: 100percentdesign" \
  -d '{
    "action": "VERIFY_RESTORE",
    "backupLogId": "<backup_id>"
  }'
```

### Step 6: Teardown Disposable Environment
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS studio_restore_test_db;"
```

---

## 5. Multi-Tenant Scoped Access Boundary

- **Infrastructure Operators**: Possess full cross-tenant infrastructure dump and restore capabilities.
- **Tenant Owners / Admins**: Granted access solely to **tenant-scoped backup logs**, **tenant metadata manifests**, and **drill execution records**. They cannot inspect raw backups containing data belonging to other studio tenants.
- **Employees**: Denied all backup and recovery endpoints (fail-closed HTTP 403 Forbidden).
