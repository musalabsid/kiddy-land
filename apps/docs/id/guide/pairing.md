# Pairing Perangkat

**Di perangkat (layar login)** pilih salah satu dari 3 mode:

- **Kasir** — jual, anggota
- **Pemindai** — masuk/keluar
- **Kiosk Publik** — status tiket publik

Lalu tap **Scan QR** → arahkan ke QR dari Host, atau tempel token manual → konfirmasi.

> **Kunjungan pertama?** Aplikasi berjalan lewat HTTPS (`https://<ip-host>:43118`). HP Anda akan menampilkan peringatan **sertifikat tidak tepercaya** — tap **Advanced → Proceed** (sekali per perangkat). Sertifikat self-signed untuk jaringan lokal dan aman. Di HP buka alamat HTTPS dari QR; di PC Host itu sendiri pakai `http://127.0.0.1:43117`.

Perangkat **Inventaris** tidak ada di pilihan login — dapatkan undangan dari **Pemilik → Perangkat** (nama karyawan + peran **Staf**) lalu scan.

## Siklus hidup perangkat

Perangkat ter-pairing muncul di **Owner → Perangkat** dengan nama karyawan. Daftar diperbarui **secara langsung**:

- **Terhubung** — perangkat pairing/login → toast "Perangkat terhubung" + langsung muncul di daftar.
- **Terputus** — aplikasi perangkat ditutup atau kehilangan jaringan → toast "Perangkat terputus"; daftar menampilkannya sebagai offline (tidak dihapus otomatis).
- **Logout** — Kasir/Pemindai/Kiosk menekan **Logout** → perangkat **dihapus** dari daftar dan harus pairing ulang dengan QR baru.
- **Cabut / Hapus** — aksi dari sisi Pemilik mematikan sesi; sama seperti logout untuk perangkat.

Dasbor Pemilik dilindungi (tidak bisa dihapus).

## Setelah perbaikan

Jika banner **IP Host berubah** muncul, tampilkan QR lagi dan scan ulang di tiap HP (sekali).
