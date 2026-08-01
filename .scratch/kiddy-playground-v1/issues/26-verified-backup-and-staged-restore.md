# 26 — Verified Backup and Staged Restore

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

An Owner can create and verify daily or on-demand SQLite recovery snapshots, review backup health, and restore a selected Verified Backup through a guarded Staged Restore flow without silently overwriting the current database.

## Blocked by

- 17 — Host runtime and Local Server foundation
- 18 — Local identity, pairing, Device Modes, and reconnect

## Acceptance criteria

- [ ] The system creates a consistent SQLite snapshot, runs integrity checks, and records app/schema version, timestamp, size, destination, and verification status.
- [ ] Owner can trigger Back up now and see backup age, destination health, and failure guidance.
- [ ] Retention pruning never removes the last good backup and occurs only after a newer backup verifies successfully.
- [ ] Owner-only Staged Restore reviews selected metadata, creates a safety backup, blocks writes/stops the server, requires explicit confirmation, restores, validates, and restarts only after success.
- [ ] Integrity failure makes the server unhealthy and write-blocked, preserves diagnostics, and guides the Owner to recovery rather than silently repairing or restoring.
- [ ] Non-Owner roles and disconnected clients cannot start, restore, delete, or replace recovery data.
