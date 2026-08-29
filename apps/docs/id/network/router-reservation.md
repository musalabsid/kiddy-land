# Reservasi Router (Direkomendasikan)

> Terbaik untuk venue — biarkan PC Host tetap DHCP, tapi router selalu memberi IP yang sama.

**Berlaku untuk TP-Link, IndiHome, ZTE, Huawei:**

1. Di PC Host, cari **MAC address**: `cmd` → `ipconfig /all` → **Physical Address** seperti `A4:CF:12:8B:33:01`.

2. Buka admin router: browser → `192.168.1.1` (atau `192.168.0.1`). Login.

3. Buka **DHCP → Address Reservation** (atau **LAN → DHCP → Static Lease**).

4. **Tambah:** MAC `A4:CF:12:8B:33:01` → IP `192.168.1.50` → Enable → Save. Reboot router atau reconnect WiFi Host.

5. Verifikasi: disconnect/reconnect Host → `ipconfig` harus tetap `192.168.1.50`.

Anda hanya perlu **salah satu**: IP Statis Windows *atau* Reservasi Router.
