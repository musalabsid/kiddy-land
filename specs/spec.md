# Kiddy Playground

> High-level product and architecture overview.

---

# Vision

Kiddy Playground is a **local-first playground management platform** designed for playground businesses.

The application is installed **once** on a Windows computer and automatically becomes the central server for the entire local network. Employees interact with the system using either the desktop application or an installable Progressive Web App (PWA) from any phone, tablet, or computer.

The system must continue operating without Internet access.

---

# Core Principles

- Local-first
- Offline-first
- One installer
- One repository
- One embedded server
- One database
- Real-time synchronization
- Thin clients
- Fat server
- Feature-oriented architecture

---

# High-Level Architecture

```
                    Embedded Server
             (Business Logic + API + Realtime)

                          │
             ┌────────────┴────────────┐
             │                         │
      Desktop Client              PWA Clients
      (Tauri + React)      (Phone, Tablet, Laptop)

                          │
                      SQLite Database
```

The embedded server is the heart of the application.

Desktop and PWA are simply different clients consuming the same APIs.

---

# Technology Stack

## Desktop

- Tauri v2
- Rust

## Frontend

- React
- TanStack Router
- TanStack Query
- Tailwind CSS
- Vite
- Progressive Web App (PWA)
- shadcn/ui

## Backend

- Hono
- Zod
- WebSocket

## Database

- SQLite
- Drizzle ORM

## Shared

- TypeScript
- Shared types & schemas

---

# Primary Features

## Playground Management

- Ticket management
- Play timer
- Entry validation
- Exit validation
- Overtime calculation
- Deposit management

## Mini POS

- Product management
- Barcode scanning
- Inventory
- Sales
- Receipt printing
- Payment processing

## Membership

- Member registration
- Member discount
- Deposit balance
- Visit history

## Reporting

- Daily sales
- Revenue
- Inventory
- Membership statistics
- Playground activity

## Administration

- User management
- Role management
- Ticket pricing
- Product management
- Backup & restore

---

# Desktop Application

The desktop application is the host and management layer of the system.

Its primary responsibility is to launch and manage the embedded server while providing access to native operating system capabilities. It is **not** the primary business interface; business features are provided through the shared React application, which is also accessible from phones, tablets, and other computers via the local network.

## Responsibilities

### Server Management

- Start embedded server
- Monitor server status
- Display local network URL
- Generate QR code for device pairing

### Native Integrations

- Receipt printer configuration
- Cash drawer integration
- Native file system access
- Auto update

### Application Settings

- Playground profile
- Logo and branding
- Theme configuration
- Business information
- Receipt template
- Language settings

### Network

- Connected device monitoring
- Local network configuration
- Server diagnostics

### Maintenance

- Database backup
- Database restore
- Export & import data
- Log viewer
- System diagnostics

# Device Modes

The PWA supports multiple operating modes.

## Desktop Cashier

- POS
- Ticket sales
- Membership
- Reports
- Administration

## Entrance Scanner

- Scan ticket
- Validate ticket
- Start play session

## Exit Scanner

- Scan ticket
- End play session
- Calculate overtime

## Public Kiosk

- Check remaining play time
- Check deposit balance
- Membership lookup

## Price Checker

- Scan barcode
- Display product price

## Inventory

- Stock counting
- Product scanning
- Inventory updates

## Owner Dashboard

- Live statistics
- Revenue
- Playground occupancy
- Reports

---

# Smartphone Strategy

Smartphones replace dedicated barcode scanners whenever possible.

Supported uses

- Ticket scanner
- Product scanner
- Membership scanner
- Inventory scanner

Supported scans

- QR ticket
- Membership card
- Product barcode

Benefits

- Unlimited scanners
- Lower hardware cost
- Better mobility
- Faster deployment

USB scanners remain optional, but will not be implemented in v1.

---

# Public Kiosk Strategy

Any tablet or computer can become a kiosk by opening the PWA in kiosk mode.

Examples

- Remaining play time
- Product price checker
- Ticket validation
- Membership lookup

No additional software installation required.

---

# Real-time System

The server is responsible for publishing live events.

Examples

- Ticket created
- Ticket activated
- Ticket expired
- Product sold
- Inventory changed
- Member updated

Clients subscribe using WebSocket.

No polling.

All connected devices remain synchronized automatically.

---

# Real-time System

The server is responsible for publishing live events.

Examples

- Ticket created
- Ticket activated
- Ticket expired
- Product sold
- Inventory changed
- Member updated

Clients subscribe using WebSocket.

No polling.

All connected devices remain synchronized automatically.

# Notification Strategy

Notifications are generated by the server. It will send notification to devices that can be configured.

There will be a configurable sound playing when notification triggered like "member_name playtime is 5 minutes left"

Possible destinations

- Desktop
- Phone
- Tablet
- Public kiosk

Examples

5 minutes remaining

- Desktop popup
- Public kiosk notification
- Voice announcement

Ticket expired

- Cashier notification
- Exit scanner notification

Inventory low

- Owner dashboard

---

# Networking

The desktop application automatically hosts the local server.

Other devices connect over Wi-Fi using:

- Local hostname (mDNS)
- Local IP
- QR Code pairing

No Internet connection is required.

---

# Repository

```
apps/
├── desktop/
└── web/

packages/
├── server/
├── db/
├── shared/
└── ui/
```

The server contains

- API
- Authentication
- Business logic
- Scheduler
- WebSocket
- Database access

Business logic must exist only inside the server.

---

# Security

Authentication

- Username/password

Authorization

- Role-based access

Roles

- Owner
- Cashier
- Staff
- Public kiosk

Public kiosk has restricted access to only publicly available endpoints.

Business logic must always be validated on the server.

---

# Design Philosophy

The embedded server is the product.

Desktop, phones, tablets, kiosks, and future clients are simply different interfaces over the same backend.

Every feature should be implemented once in the server and exposed through APIs, allowing all clients to remain synchronized in real time.

---

# Future Expansion

The architecture should support future enhancements without major redesign.

Potential expansions

- Multi-branch support
- Cloud deployment
- Birthday booking
- Capacity management
- Remote owner dashboard

---

this spec is expansions of the srs-kiddy-land.pdf file adjacent to this file. there might be some different or uncovered feature in this docs that worth discussing.
