# Alvidaa Home — dedicated installation for the 55A6NV

**Status:** installed and verified on 2026-11-19. The TV loaded `/`, connected to the `/ws` WebSocket, and received the launcher resources.

This procedure creates a `vidaa-home` entry in the TV's web registry and points it to the URL defined by `serverUrl` in `server/config.json`. It uses the installed Fetcher/FaaS, whose UID (`314`) owns `/APPS/websdk/Appinfo.json` on this TV. Therefore, it does not require the root `postinst` proven during the investigation.

Before opening the installer, set `serverUrl` to the HTTP origin of the host
serving Alvidaa (for example, `http://alvidaa-server.local:8765`). This value
is local to the installation and must not contain a real LAN address in
published files.

## Pages

- Install: `/install-alvidaa-home.html` on the configured server.
- Remove: `/remove-alvidaa-home.html` on the configured server.

The pages make changes only when the corresponding button is clicked (or when
the installer is opened with `?install=confirm`, as it was during this
authorized run). The installer read the current registry, created the
`/APPS/websdk/Appinfo.json.alvidaa-home.bak` backup, added one entry, and
verified it by reading the registry back. The other four apps remained
unchanged. It does not delete pre-existing apps, change the server
configuration, or reboot the TV.

## Uninstallation

The removal page deletes only the `vidaa-home` entry. If no other entries have
changed since installation, it restores the registry's original bytes and
deletes the backup. If other apps have changed since then, it preserves those
changes, removes only `vidaa-home`, and keeps the backup for manual recovery.

## Home watcher settings

In the launcher served by the external Python server, the gear icon next to the
status indicator opens `/settings.html`; use the remote's arrow keys to focus
the gear and press OK/Enter. On the settings page, the arrow keys navigate
between the field and the buttons. **Home button delay** sets how many seconds
to wait after the server detects the stock Home screen before reopening
Alvidaa (0–60; default 0). **Stop service** pauses only automatic return; HTTP,
WebSocket, and MQTT remain active. Then press Home to return to the stock Home
screen and open Alvidaa manually. Loading the launcher resumes the watcher.
These controls are not implemented by the Go bridge running on the TV.

## Status and limitations

- The Python server must be running on the host specified by `serverUrl` for
  the tile to open.
- The server watcher was enabled after installation. When it detects the
  native VIDAA Home screen, the server reopens the Alvidaa Home app. This makes
  the TV's Home button return to Alvidaa; the owner confirmed this automatic
  return after pressing the button. The server reads the setting live.
- The TV had to be power-cycled to refresh the app list. Afterward, the H tile
  appeared and opened Alvidaa.
- Before installation, `Appinfo.json` was a regular 9,667-byte file, owned by
  `314:902`, mode `0664`, with valid JSON containing four entries, no
  `vidaa-home`, and no other tiles named `Home`.
- After installation, it contains five entries, including one `vidaa-home`
  pointing to `serverUrl`; ownership remains `314:902` and mode remains
  `0664`. The backup contains the original 9,667 bytes and four entries.
- The current watcher setting is enabled
  (`server/config.json`, `watcher.enabled: true`). A previous copy is at
  `server/config.json.before-watcher-20261119-171537.bak`. To restore the
  native Home button behavior, disable `watcher.enabled` and restart the
  server. The server remains running in the Konsole window.
- The Alvidaa server was left running on the notebook so the page would remain
  available. The diagnostic receiver was stopped.
