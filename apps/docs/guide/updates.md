# Updates

Download the newest installer from **[GitHub Releases](https://github.com/musalabsid/kiddy-land/releases)** and install it over the old one.

- **Windows** — run the new `desktop_<version>_x64-setup.exe` (or `.msi`). Replaces the app; data preserved.
- **Linux** — `sudo apt install ./desktop_<new-version>_amd64.deb`.

No need to re-pair devices unless the **Host IP changed** (see Network Setup).

## Where your data lives (survives updates)

- Windows: `%APPDATA%\KiddyLand\`
- Linux: `~/.local/share/KiddyLand/`

Containing the database, backups, TLS certs and product images. Uninstalling/reinstalling
does **not** delete this folder.

## Auto-update

Not yet — updates are manual (download + install). Auto-update (in-app notification +
one-click install) is planned.
