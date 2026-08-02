# Windows deployment, packaging, and manual updates

Status: proposed v1 deployment contract

## User-facing installation

Kiddy Land is distributed as one versioned Windows installer. The venue operator installs and launches the desktop application; they do not install Bun, SQLite, Node.js, or a separate server manually.

The installer contains the Tauri desktop application and the Local Server runtime packaged as a self-contained executable. The Local Server is managed as a hidden child process by the desktop host. This is one user-facing product and one install operation, even though the installation contains two cooperating executables.

```text
Kiddy Land installer
├── KiddyLand.exe             # Tauri desktop host and shared React client
└── kiddy-land-server.exe     # supervised Local Server, HTTP/WebSocket/API
```

The Local Server is the only process that opens or mutates SQLite. Desktop and LAN PWA clients use its HTTP/WebSocket APIs and never access the database file directly.

## Runtime prerequisites

The production installer must be offline-capable. The venue machine must not need a separately installed runtime or Internet connection for normal operation.

The installer/package must carry the required Bun runtime/server payload and the Tauri WebView2 payload or a documented offline WebView2 installation path. Exact WebView2 packaging, code signing, installer elevation policy, and Windows support matrix are release-acceptance decisions.

No separate SQLite installation, SQLite CLI, compiler, Python, Visual C++ build tools, or database service is required when using Bun's embedded `bun:sqlite`.

## Data paths and ownership

Mutable operational data must be outside the installation directory and network shares, for example:

```text
%APPDATA%\KiddyLand\
├── kiddy-land.sqlite
├── kiddy-land.sqlite-wal
├── backups\
└── logs\
```

The server owns database lifecycle, schema migrations, integrity checks, and shutdown. The application binary directory may be replaced during an upgrade without replacing the venue database.

## Manual update flow

Automatic update hosting is not required for v1. A maintainer publishes a new signed/versioned installer through a release download, private distribution page, or offline USB/media channel.

The operator's update action is:

1. Download or receive the new installer.
2. Finish or pause active operations according to venue procedure.
3. Quit Kiddy Land explicitly so the Local Server closes SQLite cleanly.
4. Run the new installer over the existing installation.
5. Keep the existing app-data directory and database.
6. Launch the updated Kiddy Land application.
7. The server opens the existing database, applies ordered migrations, runs integrity/readiness checks, and only then accepts writes.

The update must replace the desktop and server binaries as one versioned release. Users must not update only one executable, copy source files, run `bun install`, or manually replace the SQLite file.

If an installer cannot replace a locked executable, it must report a clear recovery action rather than silently leaving mixed UI/server versions.

## Version compatibility

Each release has a product version and database schema version:

```text
Kiddy Land 1.1.0
UI/server API: 1.1
SQLite schema: 2
```

The server is authoritative for schema migration. Migrations are ordered, recorded in `schema_migrations`, and run before readiness. A migration failure makes the server unhealthy/write-blocked and preserves the existing database for recovery.

The desktop client must verify that the server API/schema is compatible before enabling mutations. UI and server binaries from different releases are not a supported configuration.

## Backup and rollback boundary

Before a production upgrade, the venue should have a current Verified Backup. The eventual Ticket 26 flow owns consistent SQLite snapshots, integrity verification, retention, and Staged Restore.

An upgrade must never delete the last good backup or silently overwrite the live database. Downgrade is supported only when the database schema is compatible or the operator restores a backup made for the target older release. A newer schema must not be opened by an older server without an explicit supported downgrade/restore procedure.

## Responsibilities and tickets

- **Ticket 17:** real SQLite foundation, migrations, health/readiness, server lifecycle, and app-local data ownership.
- **Ticket 19:** calendar/package records use the server-owned persistence layer; future configuration changes do not alter snapshots already committed to sales.
- **Ticket 26:** Verified Backup and Staged Restore, including upgrade safety backup and recovery behavior.
- **Ticket 28:** clean offline Windows installation, bundled runtime/WebView2, firewall, single-instance, crash recovery, and physical acceptance evidence.
- **Ticket 29:** release-gate evidence for upgrade, backup, restore, resilience, and full-day operation.

## Scope boundary

This document does not require an auto-update server. A later release may add a static update manifest or Tauri updater, but manual installer replacement remains a valid supported path.
