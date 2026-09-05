# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-09-05

### Added

- Paired-devices list updates **live** on the Owner dashboard: shows connect,
  disconnect (app close / network loss), and removal toasts.
- Logout on Cashier / Scanner / Kiosk now removes the device from the Owner's
  device list (device must re-pair with a new QR).
- YouTube tutorial link in the docs nav and Quick Start (EN + ID).

### Fixed

- SPA refresh on `/sales` and `/members` no longer shows 401/403 — page loads
  restore the session client-side (header-less GETs serve the SPA).
- Paired-devices list (Owner) now refreshes without navigating away/back.
- Report download shows a success toast, or an error toast if export fails.
- Native `<select>` date picker in Reports and Calendar closes on choosing a
  date (was leaving the dropdown open).

## [0.1.3] - 2026-09-05

### Changed

- Closing the desktop window (X) quits the app + server (was: hide to tray
  with no tray icon).

## [0.1.2] - 2026-09-01

### Added

- LAN binding (`0.0.0.0`) so phones can reach the host over HTTPS — **was: localhost-only**.
- Web dist served from the installed bundle (fixes 404 when opening from a phone).

### Fixed

- Dark-mode native `<select>` dropdowns now render dark (color-scheme).
- Host Overview shows the LAN IP instead of `127.0.0.1`.

## [0.1.1] - 2026-08-31

### Fixed

- Data dir now pinned to the user app-data dir (`KIDDY_LAND_DATA_DIR`) so the
  embedded server persists state correctly — first-run Owner setup now appears.

### Changed

- App display name is **Kiddy Land** (was `desktop`).

## [0.1.0] - 2026-08-31

### Added

- Initial release: venue management (ticketing, scanning, kiosk, cashier,
  reports, memberships, inventory, backups) with local-first server.
- Sound alerts (bell + Indonesian voice) with custom text templates,
  child-name calling, and session-ended alert.
- Tauri desktop app (Linux .deb) with embedded server sidecar.
- Docs site (EN + ID) deployed to GitHub Pages.
- GitHub Actions: release workflow (Linux deb + Windows NSIS), docs deploy.

[Unreleased]: https://github.com/musalabsid/kiddy-land/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/musalabsid/kiddy-land/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/musalabsid/kiddy-land/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/musalabsid/kiddy-land/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/musalabsid/kiddy-land/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/musalabsid/kiddy-land/releases/tag/v0.1.0
