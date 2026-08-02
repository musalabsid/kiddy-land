# Ubuntu Headless Deployment Profile

Status: future candidate — not part of Kiddy Playground v1
Type: architecture/product design note

## Purpose

Define a future deployment profile in which the Kiddy Playground Local Server runs on an Ubuntu Server machine without a graphical desktop, while staff and owners operate the product through the local-network PWA.

This document is preparation for a later Wayfinder or `/grill-with-docs` effort. It is not an implementation plan, does not change the current Windows-host v1 contract, and does not authorize implementation yet.

## Current v1 boundary

Kiddy Playground v1 currently targets:

- one Windows host;
- a Tauri desktop host that supervises the Local Server executable;
- a host-owned SQLite database using Bun's embedded `bun:sqlite` adapter;
- local-network PWA clients; and
- PDF-canonical artifacts with visible browser/WebView printing.

Ubuntu headless hosting is a future deployment option. It must not be advertised as a supported v1 installation until its package, service lifecycle, security, onboarding, recovery, and acceptance decisions are resolved and tested.

## Desired future outcome

An operator installs a versioned Debian package on a supported Ubuntu Server machine. The package installs and starts the Local Server as a supervised `systemd` service. The machine does not need a desktop environment, Tauri window, monitor, keyboard, or separately installed Node runtime.

Once the service is ready:

1. The Local Server owns SQLite, business rules, authentication, artifacts, backups, and WebSocket events.
2. A staff laptop, phone, tablet, or kiosk on the venue LAN opens the PWA over the trusted local HTTPS origin.
3. The Owner completes pairing, administration, reporting, backup, and recovery through an authenticated browser workflow or a documented headless setup tool.
4. Cashier, Entrance Scanner, Exit Scanner, Inventory, Public Kiosk, and Owner Dashboard behavior remains the same as the Windows-host profile.
5. The venue can operate without Internet access, subject to the same local-network and prepared-device assumptions as v1.

## Compatibility principle

The Local Server application interface remains the highest seam. Ubuntu headless support should reuse the existing server commands, queries, domain rules, SQLite model, WebSocket event contract, PDF/artifact contract, authorization model, and Maintainer Checklist scenarios. The current Bun/Hono server should be packaged as a self-contained Linux executable or bundled runtime; no globally installed Bun/Node runtime should be required on the venue machine.

The future work should add a Linux host adapter rather than fork business behavior:

- Windows profile: Tauri supervises and presents the Local Server.
- Ubuntu profile: `systemd` supervises the Local Server and browser clients provide host administration.

No domain rule should depend on Tauri, Windows, WebView2, a Windows printer queue, or a graphical host window.

## Proposed deployment shape

### Debian package

The future package should contain or install:

- the self-contained Local Server runtime and server executable;
- the built PWA/static assets;
- database migration and health-check assets;
- a `systemd` service definition;
- documented app-local data, backup, log, and runtime directories;
- upgrade and rollback metadata; and
- a setup/diagnostic entry point that works without a graphical session.

The package should not require a globally installed Node runtime, a desktop environment, or Internet access during normal operation. Exact Ubuntu release, CPU architecture, package dependencies, signing, repository/channel, and offline dependency policy remain future decisions.

### Service lifecycle

The headless service should:

- run as a dedicated non-root service identity;
- use explicit data and configuration paths;
- start after required local networking is available;
- expose bounded readiness and health diagnostics;
- restart according to a bounded crash policy;
- stop accepting writes before controlled shutdown;
- preserve SQLite integrity during shutdown and restart;
- write credential-safe structured logs; and
- provide a documented status, restart, diagnostic, and recovery path for an Owner or Maintainer.

Whether the service starts automatically after boot, how it behaves across sleep/logoff/reboot, and how upgrades are rolled back must be resolved before the profile is release-ready.

### Network, HTTPS, and discovery

The profile should preserve the current trusted-origin principles:

- one authenticated HTTPS origin for PWA, HTTP API, and WebSocket;
- a stable human-readable local hostname as the preferred trusted origin;
- mDNS/DNS-SD through the Ubuntu host's local discovery service where available;
- per-venue certificate authority and prepared-device trust for camera scanning;
- short-lived one-time enrollment tokens rather than permanent QR credentials;
- private/domain-equivalent firewall exposure only; and
- no certificate-warning bypass for phone camera access.

A headless host has no Windows desktop recovery surface. Future design must therefore define a safe recovery path when mDNS fails, the hostname changes, the local CA expires, or the Owner cannot display an enrollment QR. Numeric-IP access must not silently become a trusted camera-scanning path.

### Browser-only administration

The Ubuntu Server profile should provide the Owner's operational and administrative workflows through the PWA, including:

- host readiness and diagnostics;
- Device Enrollment and revocation;
- user and Role administration;
- Venue Calendar and Ticket Package configuration;
- Product, inventory, and membership configuration;
- reports and exports;
- Verified Backup and Staged Restore; and
- language, notification, and local-device settings.

A command-line or local setup utility may be needed for first-run bootstrap, certificate trust provisioning, service recovery, and emergency diagnostics. Its interface and permission model are future design questions.

### Printing and artifacts

The PDF-canonical artifact-first decision should make the headless profile viable:

- the server creates Receipt and Ticket PDFs from committed snapshots;
- the PWA exposes `Print tickets`, `Print receipt`, `Open/download PDF`, and `Show QR`;
- printing is initiated through the browser/WebView print flow available to the operating device;
- a printer driver or native Linux printer integration is not required for core transaction correctness;
- print attempts remain separate from Sale/Ticket commits; and
- native Linux printer integration is a future venue-triggered decision, not an implicit requirement of the `.deb` package.

If a printer is attached to the Ubuntu host, the future profile must decide whether it remains browser-mediated or gains a narrowly scoped Linux print adapter. It must not introduce a second document-rendering truth.

## Required future decisions

A later Wayfinder/grilling effort should resolve at least these questions:

1. Which Ubuntu Server LTS release(s) and CPU architectures are supported?
2. Is the package x64-only, or must it support ARM64 hardware as well?
3. Is the deployment artifact a standalone `.deb`, an offline bundle of `.deb` dependencies, or a private package repository?
4. Which service user, filesystem paths, permissions, and backup ownership rules are required?
5. Does the service start automatically after boot, and what happens after reboot, sleep, logoff, or power loss?
6. How are upgrades, downgrades, schema migrations, rollback, and interrupted upgrades handled?
7. How does a headless first-run setup create the Owner, venue identity, local CA, hostname, and enrollment QR?
8. How does a browser client safely recover if mDNS is unavailable or the canonical hostname changes?
9. Which discovery service and firewall tooling are supported, and how are isolated or guest networks diagnosed?
10. Which device classes receive local-CA trust, and how does a Maintainer rotate the CA without unsafe certificate bypasses?
11. How are logs, health, service status, and recovery exposed to a non-admin Owner without SSH access?
12. What resource budget and full-day soak thresholds must the low-power Ubuntu host meet?
13. How are backups stored, copied off-host, and restored when the host has no desktop UI?
14. Does the venue require host-attached printing, or is browser/PDF printing sufficient?
15. If host-attached printing is required, which Linux print adapter and acceptance class are supported?
16. Is a Tauri Linux desktop package also desired for Ubuntu Desktop, or is the future profile strictly headless?

## Future acceptance outline

A supported Ubuntu headless release should pass at least:

- offline `.deb` installation on a clean supported Ubuntu Server host;
- no dependency on a graphical session or globally installed Node runtime;
- service start, readiness, health, bounded restart, clean shutdown, and reboot recovery;
- app-local SQLite, logs, backups, permissions, and retention behavior;
- PWA access from a LAN laptop, prepared Android scanner, tablet Kiosk, and Owner device;
- trusted HTTPS, local CA provisioning, mDNS discovery, and safe no-mDNS recovery;
- all existing Ticket, Sale, Play Session, Product, Member, report, notification, backup, and restore scenarios;
- PDF artifact generation, browser print attempts, digital QR fallback, and no duplicate business records after print failure;
- resource, responsiveness, and full-day soak testing on the low-power host; and
- the complete bilingual Maintainer Checklist with evidence that identifies the Ubuntu deployment profile.

Exact host model, storage, network equipment, scanner, printer, media, and Ubuntu build remain acceptance fixtures. Passing one Ubuntu device does not automatically establish universal Linux support.

## Sequencing recommendation

Finish and stabilize the Windows-host v1 product first. Then use this document as the input to a dedicated Wayfinder/grilling effort that resolves the headless service, package, onboarding, security, recovery, and acceptance questions before creating implementation tickets.
