# Router Reservation (Recommended)

> Best for venues — leave Host PC on DHCP, but router always gives it the same IP. No manual IP on PC, phones never break.

**Works on TP-Link, IndiHome, ZTE, Huawei, etc.:**

1. On Host PC, find **MAC address**: `cmd` → `ipconfig /all` (Windows) or `ip link` (Linux) → **Physical Address** like `A4:CF:12:8B:33:01`.

2. Open router admin: browser → `192.168.1.1` (or `192.168.0.1` / `192.168.100.1` — check sticker). Login (`admin/admin` or sticker).

3. Go to **DHCP → Address Reservation** (or **LAN → DHCP → Static Lease** / **IP & MAC Binding**).

4. **Add:** MAC `A4:CF:12:8B:33:01` → IP `192.168.1.50` → Enable → Save. Reboot router or reconnect Host WiFi.

5. Verify: disconnect/reconnect Host → `ipconfig` should still be `192.168.1.50`.

::: tip Screenshots
Add for each router brand: `public/network/router-tplink.png`, `router-indihome.png`.
:::

**You only need ONE of:** Windows Static IP _or_ Router Reservation. Pick one.
