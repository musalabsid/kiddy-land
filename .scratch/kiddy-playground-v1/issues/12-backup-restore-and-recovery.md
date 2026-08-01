# Define backup, restore, and recovery behavior

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 11
Map: ../map.md

## Question

What backup, restore, export/import, corruption recovery, data-retention, and diagnostic-log behavior is required for an owner to safely operate one venue on one Windows host?

## Comments

## Answer

V1 creates a configurable daily automatic backup and also exposes Owner-only **Back up now**. The default destination is the application's data area, with an Owner-configurable folder or removable drive available for a second/separate copy. The UI reports destination health and backup age.

Backups are Verified Backups: the server creates a consistent SQLite snapshot, runs integrity checks, and records app/schema version, timestamp, size, and verification status. Retention is a configurable count with a safe minimum; pruning happens only after a newer backup has verified successfully and never removes the last good copy because a new attempt failed.

Restore is an Owner-only Staged Restore. The Owner reviews the selected backup metadata, the system creates a safety backup of current data, blocks writes/stops the server, requires explicit confirmation, restores the verified snapshot, runs integrity checks, and restarts only after validation. If the live database fails integrity checks, the server becomes unhealthy, blocks writes, preserves diagnostics, and guides the Owner through this restore flow; it does not silently auto-restore or repair the live database.

Data Export is for analysis and sharing: reports and selected views export as CSV/PDF. V1 does not provide arbitrary data import or portable database migration; full recovery uses Verified Backup and restore.
