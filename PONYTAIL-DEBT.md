# Ponytail Technical Debt Ledger

This document tracks all intentional architectural shortcuts, ceilings, and upgrade triggers in **miniEmployeeManagementSoftware (100% DESIGN Studio OS)**. Generated in compliance with the [Ponytail](.agents/skills/ponytail/SKILL.md) and [Ponytail Debt](.agents/skills/ponytail-debt/SKILL.md) specifications.

---

## Active Deferrals Ledger

| # | File & Location | Simplified Implementation | Ceiling (When it breaks) | Upgrade Trigger (Action to take) | Rot Risk |
|---|---|---|---|---|---|
| 1 | `src/server/storage/storage-adapter.ts:L8` | Local filesystem volume storage under `storage/uploads` | Single-host local disk capacity; not replicated across distributed serverless nodes | Move to S3 / Google Cloud Storage presigned URLs when moving to containerized multi-node orchestration | `tracked` |
| 2 | `src/server/modules/visits/service.ts:L13` | In-memory Haversine distance formula | Acceptable up to a few thousand inspection points per tenant in memory | Use PostGIS / MySQL `ST_Distance_Sphere` spatial index if site inspection history exceeds 100,000 coordinate points | `tracked` |
| 3 | `src/server/modules/ingest/csv.ts:L31` | Synchronous regex formula escaping | Uploads up to 25MB / 10,000 rows in a single HTTP request cycle | Move CSV parsing into background worker queue (e.g. BullMQ / Node streams) if single upload exceeds 50,000 rows | `tracked` |
| 4 | `src/server/auth/otp.ts:L53` | In-memory Map challenge & rate limit store | Single Node.js process memory; lost upon container restart | Migrate to Redis or database-backed challenge table when autoscaling across multiple serverless Next.js instances | `tracked` |
| 5 | `src/lib/realtime.ts:L21` | In-browser BroadcastChannel & throttled visibility polling | Single-client multi-tab up to 500 active workspace users | Migrate to Redis Pub/Sub or Server-Sent Events hub if concurrent studio sessions exceed 500 users | `tracked` |
| 6 | `src/app/w/[workspaceSlug]/(app)/visits/InspectionMapPreview.tsx:L64` | Equirectangular Euclidean projection approximation | Accurate within 15km local sites; slight spherical distortion on continent-spanning sites | Integrate Proj4js / MapLibre GL vector tiles if site bounding box spans across distinct UTM geographic zones | `tracked` |
| 7 | `src/app/w/[workspaceSlug]/(app)/tasks/TasksClientView.tsx:L411` | Progressive chunk rendering (24 items with Load More) | Smooth DOM rendering up to ~300 rendered cards | Switch to virtualized list windowing (`@tanstack/react-virtual`) if single studio column exceeds 500 tasks | `tracked` |

---

## Ledger Summary

- **Total Markers Tracked:** 7
- **Markers with No Trigger (Rot Risk):** 0
- **Ledger Health:** Clean, fully documented, zero silent rot.
