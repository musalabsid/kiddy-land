# Define local-network, pairing, and reconnect behavior

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

How do the Windows host and local clients discover one another, pair and revoke devices, recover from Wi-Fi or server interruptions, display connection state, and protect data when a device reconnects?

## Comments

## Answer

The Local Server on the Windows host is the source of truth. New clients use the Owner-displayed QR as the normal path; the QR carries a short-lived one-time Device Enrollment token plus the local server endpoint. mDNS/local hostname and numeric IP remain recovery and diagnostic fallbacks. Pairing binds the client to the venue/server identity rather than permanently trusting one DHCP address.

Private devices are enrolled with a Device Mode and then require Username + password staff login. Public Kiosks receive a restricted device credential and no staff login. The Owner can revoke a device immediately: its token is invalidated, active sessions and WebSocket connections close, and a new enrollment QR is required.

When the host IP changes, paired clients try the venue's mDNS identity and refresh the endpoint; the Owner can display a new QR or numeric URL if discovery fails. The deployment must provide offline HTTPS on the host so phone browsers can request camera permission on the LAN.

If a client loses the Local Server or LAN connection, it shows a clear disconnected state and may retain its shell or last safe view, but it cannot perform sales, payments, ticket scans, inventory writes, or other mutations. It does not queue transactions. On reconnect it refreshes authoritative state before enabling writes.

If the router/Wi-Fi is unavailable while the Windows host is running, the host desktop and Local Server continue locally. Phones and tablets wait for LAN recovery; v1 does not require the host to create a hotspot.
