# Pairing Perangkat

**Di perangkat (layar login)** pilih salah satu dari 3 mode:

- **Kasir** — jual, anggota
- **Pemindai** — masuk/keluar
- **Kiosk Publik** — status tiket publik

Lalu tap **Scan QR** → arahkan ke QR dari Host, atau tempel token manual → konfirmasi.

> **Kunjungan pertama?** Aplikasi berjalan lewat HTTPS (`https://<ip-host>:43118`). HP Anda akan menampilkan peringatan **sertifikat tidak tepercaya** — tap **Advanced → Proceed** (sekali per perangkat). Sertifikat self-signed untuk jaringan lokal dan aman. Di HP buka alamat HTTPS dari QR; di PC Host itu sendiri pakai `http://127.0.0.1:43117`.

Perangkat **Inventaris** tidak ada di pilihan login — dapatkan undangan dari **Pemilik → Perangkat** (nama karyawan + peran **Staf**) lalu scan.

Perangkat ter-pairing muncul di **Owner → Perangkat** dengan nama karyawan. Cabut vs Hapus sama-sama mematikan sesi; Dasbor Pemilik dilindungi (tidak bisa dihapus).

Jika banner **IP Host berubah** muncul, tampilkan QR lagi dan scan ulang di tiap HP (sekali).
