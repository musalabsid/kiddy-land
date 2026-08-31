# Customization

Owner → **Customization** →

- **Venue name** — shown in header, kiosk and reports (max 32 chars). Default: Kiddy Land.
- **Logo** — PNG/JPG webp SVG, ≤400KB (~512×512). Shown next to venue name in header and kiosk.
- **Backup interval** — Off / 6h / 12h / Daily / Weekly. Keeps 10 latest (see Backups).
- **Theme** — 5 brand palettes: Monochrome, Emerald, Pastel, Violet, Ocean. Applies to every device: sidebar, buttons, pages.

Tap a palette to preview, **Save changes** to apply venue-wide. Press **D** anywhere toggles dark mode per device.

> Changing theme only affects colors — your data is untouched.

## Sound alert

Two alerts, both spoken (browser SpeechSynthesis, Indonesian) with a short **bell** before each.
If several alerts fire at once they are **staggered 15s apart**; if the gap is longer the next
alert fires immediately.

**Global settings** (apply to both alerts):

- **Play on devices** — which devices hear it: Owner, Cashier, Kiosk (default Owner off, Cashier + Kiosk on).
- **Call child by name** — require a child name at cashier entry, and use it in the voice instead of the ticket number.

**Almost done alert** — warn when play time is nearly over (default 5 min left).

- **Enable** — master switch for this alert.
- **Threshold** — minutes remaining that triggers it (3–10, default 5).
- **Default text** — spoken without a name, e.g. `Tiket nomor {number}, waktu bermain tinggal {duration} menit lagi.`
- **Name text** — spoken when a name is set, e.g. `Anak {name}, waktu bermain tinggal {duration} menit lagi.`

**Session ended alert** — warn the moment play time is up (child still inside, no grace).

- **Enable** — master switch for this alert.
- **Default text** — e.g. `Waktu bermain habis untuk tiket {number}.`
- **Name text** — e.g. `Waktu bermain habis untuk {name}.`

**Placeholders:** `{number}` is converted to Indonesian words ("0004" → "empat"), `{name}` is the
child's name, `{duration}` is the minutes left.

> Voice requires a browser with TTS (Chrome/Android). Brave on Linux may return no voices — use Chrome for cashier/kiosk.

## Bulk ticket buy

Control how many tickets a cashier can add per sale.

- **Allow bulk buy** — show the ticket count input at cashier.
- **Max tickets per sale** — total per transaction (2–12, default 12). Server enforces it too.

When **bulk buy is off**, cashier adds one ticket per click (the max per sale still applies).
