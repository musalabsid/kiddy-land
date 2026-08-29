# IP Statis Windows

> Paling mudah untuk PC venue. Tidak perlu admin router. 30 detik.

**Langkah:**

1. **Settings → Network & Internet → Ethernet** (atau **Wi-Fi** jika pakai WiFi). Klik jaringan terhubung.

2. **Edit** di sebelah **IP assignment** → ubah `Automatic (DHCP)` → `Manual` → nyalakan **IPv4**.

3. **Isi:**
   - **IP address:** `192.168.1.50` (pilih yang kosong — .50 biasanya kosong)
   - **Subnet mask:** `255.255.255.0`
   - **Gateway:** `192.168.1.1` (router Anda)
   - **Preferred DNS:** `192.168.1.1` (atau `1.1.1.1`)

4. **Save** → tanpa reboot. Tes: buka `cmd` → `ipconfig` → harus `192.168.1.50`.

**Batalkan:** kembalikan ke **Automatic (DHCP)** kapan saja. Jika IP berubah, scan ulang QR di Host Overview.
