# Scan Masuk/Keluar

**Masuk:** `scanner/entry` → scan QR → `admit` (diblokir selama grace 60m setelah tutup).

**Keluar:** `scanner/exit` → scan → logika deposit.

Grace: setelah tutup, tidak ada admit selama 60m, yang di dalam tetap main, auto-close tiap 60s.
