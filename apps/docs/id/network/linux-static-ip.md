# IP Statis Linux

Ubuntu/Debian dengan NetworkManager:

1. Buka **Settings → Network** (atau `nm-connection-editor`).
2. Klik roda gigi **Wired** → tab **IPv4** → **Manual**.
3. **Tambahkan:**
   - **Address:** `192.168.1.50` / **Netmask:** `255.255.255.0` / **Gateway:** `192.168.1.1`
   - **DNS:** `192.168.1.1,1.1.1.1`
4. Save → matikan/nyalakan koneksi.

Tes: `ip -4 addr show` → harus `192.168.1.50/24`.
