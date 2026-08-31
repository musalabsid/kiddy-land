# Customization

Owner → **Customization** →

- **Venue name** — shown in header, kiosk and reports (max 32 chars). Default: Kiddy Land.
- **Logo** — PNG/JPG webp SVG, ≤400KB (~512×512). Shown next to venue name in header and kiosk.
- **Backup interval** — Off / 6h / 12h / Daily / Weekly. Keeps 10 latest (see Backups).
- **Theme** — 5 brand palettes: Monochrome, Emerald, Pastel, Violet, Ocean. Applies to every device: sidebar, buttons, pages.

Tap a palette to preview, **Save changes** to apply venue-wide. Press **D** anywhere toggles dark mode per device.

> Changing theme only affects colors — your data is untouched.

## Sound alert

Warn staff when a child's play time is almost over (default: 5 min left).

- **Enable alert** — master switch. Off = no voice, no bell.
- **Threshold** — number of minutes remaining that triggers the alert (3–10, default 5).
- **Play on devices** — which devices hear it: Owner, Cashier, Kiosk (default Owner off, Cashier + Kiosk on).

When a ticket crosses the threshold, devices play a short **bell**, then a voice (browser
SpeechSynthesis, Indonesian) announces _"Tiket nomor 4, waktu bermain tinggal 5 menit lagi"_.
If several tickets cross at once, alerts are **staggered 15s apart**; if the gap is longer,
the next alert fires immediately.

> Voice requires a browser with TTS (Chrome/Android). Brave on Linux may return no voices — use Chrome for cashier/kiosk.
