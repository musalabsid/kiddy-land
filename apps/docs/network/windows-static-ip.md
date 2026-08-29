# Windows Static IP

> Easiest for venue PC. No router admin needed. 30 seconds.

::: info Screenshot spots
Take 1280x720 screenshots and place in `apps/docs/public/network/windows-*.png` to show each step.
:::

**Steps:**

1. **Settings → Network & Internet → Ethernet** (or **Wi-Fi** if on WiFi). Click your connected network.

2. **Edit** next to **IP assignment** → Change `Automatic (DHCP)` → `Manual` → toggle **IPv4** ON.

3. **Fill:**
   - **IP address:** `192.168.1.50` (pick a free one — .50 is usually free. Check router's DHCP range first)
   - **Subnet mask:** `255.255.255.0`
   - **Gateway:** `192.168.1.1` (your router — often printed on router sticker)
   - **Preferred DNS:** `192.168.1.1` (or `1.1.1.1`)
   - **Alternate DNS:** `8.8.8.8` (optional)

4. **Save** → no reboot. Test: open `cmd` → `ipconfig` → should show `192.168.1.50`.

**How to find Gateway / free IP:**

- Gateway: `cmd` → `ipconfig` → **Default Gateway** line.
- Free IP: in router admin `192.168.1.1` → DHCP → see used IPs, pick outside range or use the app's banner after change (it tells new IP).

**Undo:** Set back to **Automatic (DHCP)** anytime.

**When you change IP, re-scan QR:** Host Overview will show banner **Host IP changed — Was .23 → now .50. Re-scan QR** → show QR again → phones re-pair (30s).
