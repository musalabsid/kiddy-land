# Linux Static IP

Ubuntu/Debian with NetworkManager (Host PC):

1. Open **Settings → Network** (or `nm-connection-editor`).
2. Click gear on **Wired** → **IPv4** tab → **Manual**.
3. **Add:**
   - **Address:** `192.168.1.50` / **Netmask:** `255.255.255.0` / **Gateway:** `192.168.1.1`
   - **DNS:** `192.168.1.1,1.1.1.1`
4. Save → toggle connection off/on.

Terminal check: `ip -4 addr show` → should list `192.168.1.50/24`.

Same QR re-scan note as Windows page.
