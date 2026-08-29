# Kenapa IP Penting

PC Host Anda mendapat IP seperti `192.168.1.23` dari router (DHCP). HP terhubung ke `https://192.168.1.23:43118`.

Jika DHCP memberi IP baru setelah reboot (mis. `.23 → .47`), QR lama tidak berfungsi dan peringatan sertifikat muncul lagi. Aplikasi sekarang mendeteksi perubahan dan menampilkan banner **"IP Host berubah — scan ulang QR"** plus menggabungkan IP baru ke sertifikat, tapi HP tetap perlu scan ulang sekali.

**Solusi: buat IP stabil** — set IP Statis di Windows/Linux *atau* Reservasi DHCP di router. Lakukan satu, jangan keduanya. Reservasi lebih mudah.
