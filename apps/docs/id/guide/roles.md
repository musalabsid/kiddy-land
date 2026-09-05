# Peran & Hak Akses

Setiap perangkat yang di-pair memiliki **mode**; setiap karyawan memiliki **peran**. Keduanya ditetapkan saat pairing.

## Mode perangkat

| Mode               | Fungsi perangkat                                       | Cara pairing                           |
| ------------------ | ------------------------------------------------------ | -------------------------------------- |
| **Kasir**          | Jual tiket, tambah produk, anggota, penjualan hari ini | Layar login (perangkat pilih Kasir)    |
| **Pemindai**       | Scan masuk/keluar, pemulihan, tagihan                  | Layar login (perangkat pilih Pemindai) |
| **Inventaris**     | Stok, katalog produk                                   | Host → Perangkat → Pair (peran Staf)   |
| **Kiosk Publik**   | Layanan mandiri publik — cek status tiket saja         | Layar login (perangkat pilih Kiosk)    |
| **Dasbor Pemilik** | PC Host — kontrol server + semua halaman Pemilik       | Setup host pertama kali (kata sandi)   |

## Peran

| Peran       | Mode yang cocok          | Akses                                                           |
| ----------- | ------------------------ | --------------------------------------------------------------- |
| **Pemilik** | Mode apa pun             | Semua: Kalender, Laporan, Backup, Perangkat, Paket, Keanggotaan |
| **Kasir**   | Kasir saja               | Jual, anggota                                                   |
| **Staf**    | Pemindai atau Inventaris | Scan, operasi stok                                              |

Halaman khusus Pemilik dilindungi oleh server, bukan hanya disembunyikan di sidebar — perangkat dengan peran yang salah tidak bisa melihatnya sama sekali.

**Pairing:** Di layar login perangkat memilih **Kasir / Pemindai / Kiosk** (3 pilihan). Perangkat Inventaris butuh undangan dari **Pemilik → Perangkat** dengan peran **Staf**. Dasbor Pemilik dibuat saat setup host pertama, bukan via pairing.

**Ganti peran/mode?** Cabut perangkat lalu buat pairing baru dengan mode/peran yang diinginkan.

**Logout** di Kasir/Pemindai/Kiosk menghapus perangkat dari daftar perangkat Pemilik (harus pairing ulang dengan QR baru). Menutup aplikasi hanya memutuskan koneksi — perangkat tetap terdaftar.
