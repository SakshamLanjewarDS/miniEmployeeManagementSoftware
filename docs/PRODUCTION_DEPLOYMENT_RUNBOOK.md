# 100% DESIGN Studio OS — Production Deployment Runbook

## 1. Pre-Deployment Environment Validation

Before commencing any build or deployment, execute the environment validator:

```bash
# Validates required secrets and rejects insecure defaults (e.g. dev secrets in production)
npm run check:env
# or run programmatic validation via node:
npx tsx src/server/config/env-validator.ts
```

### Critical Environment Variables Checklist
- `DATABASE_URL`: Must connect via least-privilege runtime MySQL user (e.g. `studio_app_rw`). DDL migration privileges must be isolated to CI/CD pipeline user `studio_deployer`.
- `SESSION_SECRET`: Minimum 32-character high-entropy secret. Defaults like `dev-secret` or `change-me` will trigger an immediate fatal startup error in `NODE_ENV=production`.
- `APP_URL`: Canonical public HTTPS URL of the studio instance (e.g. `https://studio.100percentdesign.com`).
- `ENABLE_SWAGGER`: Must be set to `false` in production.
- `STORAGE_BACKEND`: `S3` or private encrypted storage.

---

## 2. Versioned Database Migrations

**Zero Unreviewed Schema Pushes Against Production Data:**
`prisma db push` is strictly forbidden in production. All schema evolutions must use explicit versioned Prisma migrations:

```bash
# 1. Inspect pending migrations without applying
npx prisma migrate status

# 2. Apply pending versioned migrations safely
npx prisma migrate deploy

# 3. Validate migration state against schema
npx prisma validate
```

### Data Backfills & Safe Field Additions
1. New columns must be either `nullable` or include a deterministic database default.
2. Backfill scripts must run as separate, idempotent jobs in transactions using batches of 500 records to avoid long table locks.
3. If an index addition is required on high-volume tables (`studio_attendance_records`, `task_submissions`), deploy the index concurrently.

---

## 3. Production Build & Health Checks

### Build Command
```bash
# Typecheck, lint, and build production Next.js bundle
npm run build
```

### Process Management & Startup
```bash
# Start Next.js production server on assigned port
npm run start -- -p 3000
```

### Health & Readiness Probes
The container/VM orchestrator must monitor the following endpoints:
- **Liveness Probe**: `GET /api/health/liveness` (returns `200 OK` if Node.js process is responsive).
- **Readiness Probe**: `GET /api/health/readiness` (returns `200 OK` only if MySQL connection pool is healthy and tenant cache is reachable).

---

## 4. Background Job & Integration Failure Monitoring

### Scheduled Crons
- **Leave Accrual & Balance Rollover**: Runs 1st of every month at `00:05 IST`.
- **Two-Way Sheets Sync Worker**: Runs every 5 minutes.
- **Attendance Auto-Checkout & Anomaly Detection**: Runs daily at `23:30 IST`.

### Failure Monitoring & Alerting
1. **Sync Run Failures**: Check `studio_sync_runs` where `status = 'FAILED'`. Any continuous failure beyond 3 attempts triggers high-priority email outbox alert to studio administrator.
2. **Email Outbox Retries**: Check `studio_email_outbox` where `status = 'FAILED'` or `attempts > 3`.
3. **Dead-Letter Audit**: Inspected via `/w/[slug]/integrations` health dashboard.

---

## 5. Backup Ownership, Retention, and Recovery Targets

### Recovery Targets
- **Recovery Point Objective (RPO)**: < 15 minutes (Point-in-Time binary logs enabled).
- **Recovery Time Objective (RTO)**: < 60 minutes for full snapshot restoration.

### Retention Schedule
- Hourly binary log archives: 7 days.
- Daily full logical dumps (`mysqldump` / RDS automated snapshots): 30 days.
- Monthly cold storage archives: 365 days (encrypted at rest with AES-256).

---

## 6. Demonstrated Non-Production Restore Procedure

To verify backup validity without risking production data:

```bash
# 1. Provision isolated staging database
mysql -u root -p -e "CREATE DATABASE studio_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Stream latest encrypted backup snapshot into test database
gunzip < /backups/studio_daily_latest.sql.gz | mysql -u studio_deployer -p studio_restore_test

# 3. Run validation integrity check
npx prisma migrate status --schema=./prisma/schema.prisma

# 4. Verify tenant record count and isolation
mysql -u studio_deployer -p studio_restore_test -e "SELECT id, slug, name FROM tenants; SELECT COUNT(*) FROM studio_leave_requests;"

# 5. Clean up test database after verification
mysql -u root -p -e "DROP DATABASE studio_restore_test;"
```

> [!IMPORTANT]
> A backup is only as good as its last verified restore. Document the verification timestamp in `studio_backup_logs` after completing this exercise.

---

## 7. Application Rollback & Database Recovery Limitations

### Application Rollback
- If a deployment failure occurs post-traffic cutover, immediately roll back the application container / PM2 process to the previous immutable release tag (`v1.x.previous`).
- Ensure reverse-proxy routing drains active long-running requests gracefully.

### Database Recovery Limitations
- Downward migrations that drop columns or tables are destructive and cannot be rolled back without data loss.
- Always implement expanding migrations (add new fields, dual-write) before contracting migrations (removing deprecated columns).
