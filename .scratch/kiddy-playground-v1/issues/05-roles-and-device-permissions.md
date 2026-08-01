# Define roles and device-mode permissions

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

Which actions may Owner, Cashier, Staff, and Public Kiosk users perform, how are device modes assigned or changed, and which actions require attribution, confirmation, or owner approval?

## Comments

## Answer

V1 uses fixed roles with an extensible model for future custom roles. The server is authoritative for permissions; Device Mode selects the workflow and client scope but is not a second independent role matrix.

- **Owner:** unrestricted access, including user/role administration, device enrollment and revocation, package/product pricing and Deposit Policies, full reports and dashboards, backups/restores, settings, stock-count approvals, and out-of-stock overrides.
- **Cashier:** Cashier mode for ticket/product sales, payment confirmation, optional member registration, ticket/deposit sale entry, cashier-authorized refunds and Price Overrides with reasons, and an own-current-day summary. Cashier cannot open the full reports, administration, pairing, backup, or pricing areas.
- **Staff:** Entrance Scanner, Exit Scanner, and Inventory modes. Staff may admit/exit tickets, record the narrowly scoped deterministic package settlement at exit, operate playtime workflows, perform stock counts/intake as allowed, and submit inventory variances, but cannot perform sales, general refunds, Price Overrides, charge waivers, or other financial overrides.
- **Public Kiosk:** a paired restricted device with no staff login. It may validate a ticket and show remaining time, or scan a product and show its public price. It cannot look up memberships, sell, edit, show private history, access deposits, or open reports.

The Owner creates a short-lived one-time Device Enrollment QR. Scanning it registers the client and assigns its mode; the QR is not a permanent role credential. Private devices then require Username + password login, so every action records Staff User, Paired Device, and Device Mode. A device's effective access is the intersection of the logged-in Role and its assigned mode. The Owner can revoke or reassign a device. Public Kiosk uses its restricted device credential instead of staff credentials.

Cashiers do not see full business reporting. They see only their own current-day sales/payment summary and ticket count; the Owner sees all historical, financial, inventory, membership, and cross-cashier reports.
