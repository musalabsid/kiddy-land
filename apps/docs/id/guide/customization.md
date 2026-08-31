# Kustomisasi

Pemilik → **Kustomisasi** →

- **Nama venue** — tampil di header, kiosk, dan laporan (maks 32 karakter). Default: Kiddy Land.
- **Logo** — PNG/JPG/webp/SVG, ≤400KB (~512×512). Tampil di samping nama venue di header dan kiosk.
- **Interval cadangan** — Off / 6 jam / 12 jam / Harian / Mingguan. Simpan 10 terbaru (lihat Backup).
- **Tema** — 5 palet merek: Monokrom, Emerald, Pastel, Ungu, Samudra. Berlaku di semua perangkat: sidebar, tombol, halaman.

Tap palet untuk pratinjau, **Simpan perubahan** untuk menerapkan ke seluruh venue. Tekan **D** di mana saja untuk toggle mode gelap per perangkat.

> Mengganti tema hanya mengubah warna — data Anda tidak tersentuh.

## Peringatan suara

Dua jenis peringatan, keduanya diucapkan (browser SpeechSynthesis, Bahasa Indonesia) dengan **lonceng** pendek sebelum setiap peringatan.
Jika beberapa peringatan berbunyi bersamaan, mereka **berjarak 15 detik**; jika jedanya lebih lama, peringatan berikutnya langsung berbunyi.

**Pengaturan global** (berlaku untuk kedua peringatan):

- **Play on devices** — perangkat mana yang mendengar: Owner, Cashier, Kiosk (default Owner mati, Cashier + Kiosk menyala).
- **Call child by name** — wajibkan nama anak saat pembelian di kasir, dan pakai nama itu di suara, bukan nomor tiket.

**Peringatan hampir habis** — peringatkan saat waktu bermain hampir habis (default: sisa 5 menit).

- **Enable** — sakelar utama untuk peringatan ini.
- **Threshold** — menit sisa yang memicu peringatan (3–10, default 5).
- **Default text** — diucapkan tanpa nama, mis. `Tiket nomor {number}, waktu bermain tinggal {duration} menit lagi.`
- **Name text** — diucapkan saat nama ada, mis. `Anak {name}, waktu bermain tinggal {duration} menit lagi.`

**Peringatan waktu habis** — peringatkan tepat saat waktu bermain habis (anak masih di dalam, tanpa masa tenggang).

- **Enable** — sakelar utama untuk peringatan ini.
- **Default text** — mis. `Waktu bermain habis untuk tiket {number}.`
- **Name text** — mis. `Waktu bermain habis untuk {name}.`

**Placeholder:** `{number}` dikonversi ke kata ("0004" → "empat"), `{name}` nama anak, `{duration}` menit sisa.

> Suara memerlukan browser dengan TTS (Chrome/Android). Brave di Linux mungkin tidak punya suara — gunakan Chrome untuk kasir/kiosk.

## Pembelian tiket massal

Atur berapa banyak tiket yang bisa dibeli kasir per transaksi.

- **Allow bulk buy** — tampilkan input jumlah tiket di kasir.
- **Max tickets per sale** — total per transaksi (2–12, default 12). Server juga menegakkannya.

Jika **bulk buy mati**, kasir menambah satu tiket per klik (batas per transaksi tetap berlaku).
