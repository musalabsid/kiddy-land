# Kustomisasi

Pemilik → **Kustomisasi** →

- **Nama venue** — tampil di header, kiosk, dan laporan (maks 32 karakter). Default: Kiddy Land.
- **Logo** — PNG/JPG/webp/SVG, ≤400KB (~512×512). Tampil di samping nama venue di header dan kiosk.
- **Interval cadangan** — Off / 6 jam / 12 jam / Harian / Mingguan. Simpan 10 terbaru (lihat Backup).
- **Tema** — 5 palet merek: Monokrom, Emerald, Pastel, Ungu, Samudra. Berlaku di semua perangkat: sidebar, tombol, halaman.

Tap palet untuk pratinjau, **Simpan perubahan** untuk menerapkan ke seluruh venue. Tekan **D** di mana saja untuk toggle mode gelap per perangkat.

> Mengganti tema hanya mengubah warna — data Anda tidak tersentuh.

## Peringatan suara

Peringatkan staf saat waktu bermain anak hampir habis (default: sisa 5 menit).

- **Enable alert** — sakelar utama. Mati = tidak ada suara, tidak ada lonceng.
- **Threshold** — jumlah menit sisa yang memicu peringatan (3–10, default 5).
- **Play on devices** — perangkat mana yang mendengar: Owner, Cashier, Kiosk (default Owner mati, Cashier + Kiosk menyala).

Saat tiket melampaui ambang, perangkat memutar **lonceng** pendek, lalu suara (browser
SpeechSynthesis, Bahasa Indonesia) mengumumkan _"Tiket nomor 4, waktu bermain tinggal 5 menit lagi"_.
Jika beberapa tiket melampaui bersamaan, peringatan **berjarak 15 detik**; jika jedanya lebih lama,
peringatan berikutnya langsung berbunyi.

> Suara memerlukan browser dengan TTS (Chrome/Android). Brave di Linux mungkin tidak punya suara — gunakan Chrome untuk kasir/kiosk.
