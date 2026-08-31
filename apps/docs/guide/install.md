# Install

Download from **[GitHub Releases](https://github.com/musalabsid/kiddy-land/releases)** — pick your OS.

## Windows

1. Download `desktop_<version>_x64-setup.exe` (NSIS installer) — or the `.msi` if present.
2. Double-click → install. Desktop icon appears: **Kiddy Land — Local Operation Center**.
3. Open it. First run creates data folder `%APPDATA%\KiddyLand` and HTTPS cert.
4. Create Owner account (on first launch) → you are in Host Overview.

## Linux (Ubuntu/Debian)

```bash
sudo apt install ./desktop_<version>_amd64.deb
```

Then open from app launcher.

## After install — do Network Setup next!

> If phones show "untrusted cert", tap **Advanced → Proceed** once. The cert is self-signed for your local network and is safe.

> **Note:** the desktop app ships the **server embedded** (sidecar binary) — it starts
> automatically on app launch. No separate server install needed on the Host machine.
