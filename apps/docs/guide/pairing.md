# Pairing Devices

**On the device (login screen)** pick one of 3 modes:

- **Cashier** — sell, members
- **Scanner** — entry/exit
- **Public Kiosk** — public ticket status

Then tap **Scan QR** → point at the QR from the Host, or paste the token manually → confirm.

> **First visit?** The app runs over HTTPS (`https://<host-ip>:43118`). Your phone will show an **untrusted certificate** warning — tap **Advanced → Proceed** (once per device). The cert is self-signed for your local network and is safe. On phones, open the HTTPS address from the QR; on the Host PC itself use `http://127.0.0.1:43117`.

**Inventory** devices aren't on the login picker — get an invitation from **Owner → Devices** (employee name + **Staff** role) and scan it.

## Device lifecycle

Paired devices appear in **Owner → Devices** with employee name. The list updates **live**:

- **Connect** — device pairs/logs in → toast "A device connected" + appears in the list immediately.
- **Disconnect** — device app closes or loses network → toast "A device disconnected"; the list shows it as offline (no auto-removal).
- **Logout** — Cashier/Scanner/Kiosk taps **Logout** → device is **removed** from the list and must re-pair with a new QR to come back.
- **Revoke / Delete** — Owner-side actions kill the session; same as logout for the device.

Owner Dashboard is protected (cannot be removed).

## After repair

If Host Overview shows **Host IP changed** banner, re-show QR and re-scan on each phone (once).
