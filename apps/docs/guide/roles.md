# Roles & Permissions

Every paired device has a **mode**; every employee has a **role**. Both are fixed at pairing time.

## Device modes

| Mode | What the device does | How it is paired |
|---|---|---|
| **Cashier** | Sell tickets, add products, members, today's sales | Login page (device picks Cashier) |
| **Scanner** | Entry/exit scan, recovery, collect charges | Login page (device picks Scanner) |
| **Inventory** | Stock counts, product catalog | Host → Devices → Pair (Staff role) |
| **Public Kiosk** | Public self-service — ticket status lookup only | Login page (device picks Kiosk) |
| **Owner Dashboard** | Host PC — server control + all Owner pages | First-time host setup (password) |

## Roles

| Role | Compatible modes | Can access |
|---|---|---|
| **Owner** | Any mode | Everything: Calendar, Reports, Backups, Devices, Packages, Memberships |
| **Cashier** | Cashier only | Sell, members |
| **Staff** | Scanner or Inventory | Scan, stock operations |

Owner-only pages are protected by the server, not just hidden in the sidebar — a device with the wrong role cannot see them at all.

**Pairing:** On the login screen the device picks **Cashier / Scanner / Kiosk** (3 options). Inventory devices require an invitation from **Owner → Devices** with the **Staff** role. The Owner Dashboard is created during first-time host setup, not by pairing.

**Change role/mode?** Revoke the device and create a new pairing with the desired mode/role.
