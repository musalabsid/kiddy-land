# Why IP matters

Your Host PC gets an IP like `192.168.1.23` from the router (DHCP). Phones connect to `https://192.168.1.23:43118`.

If DHCP gives a new IP after reboot (e.g. `.23 → .47`), old QRs stop working and the cert warning returns. The app now detects the change and shows a banner **"Host IP changed — re-scan QR"** plus auto-merges the new IP into the cert, but phones still need one re-scan.

**Fix: make IP stable** — either set Static IP on Windows/Linux *or* set DHCP Reservation in router. Do one, not both. Reservation is easier.
