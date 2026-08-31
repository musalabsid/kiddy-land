# Instalasi

Unduh dari **[GitHub Releases](https://github.com/musalabsid/kiddy-land/releases)** — pilih sesuai OS.

## Windows

1. Unduh `desktop_<version>_x64-setup.exe` (installer NSIS) — atau `.msi` jika ada.
2. Klik dua kali → install. Ikon desktop muncul: **Kiddy Land — Local Operation Center**.
3. Buka. Saat pertama kali dijalankan, dibuat folder data `%APPDATA%\KiddyLand` dan sertifikat HTTPS.
4. Buat akun Owner (saat pertama kali) → masuk ke Host Overview.

## Linux (Ubuntu/Debian)

```bash
sudo apt install ./desktop_<version>_amd64.deb
```

Lalu buka dari app launcher.

## Setelah install — lakukan Setup Jaringan!

> Jika ponsel menunjukkan "untrusted cert", ketuk **Advanced → Proceed** sekali.
> Sertifikat self-signed untuk jaringan lokal Anda, aman.

> **Catatan:** aplikasi desktop sudah menyertakan **server tertanam** (binary sidecar) —
> otomatis berjalan saat aplikasi dibuka. Tidak perlu instal server terpisah di PC Host.
