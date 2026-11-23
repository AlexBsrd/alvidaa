# Migrating the Alvidaa server to an always-on host

Status as of 2026-11-23: the Hisense `55A6NV` TV (browser platform name:
`55A60QUV`; firmware `V0000.09.60L.Q0623`) uses Alvidaa Home at the address
defined by `server/config.json` (`serverUrl`). The current host is the notebook,
with its LAN address configured locally. The Python server is running in a
visible Konsole window, and the watcher is enabled. The TV opens YouTube from
the launcher, and the Home button returns to Alvidaa.

## Goal

Move the server to an always-on host while retaining the same features and
watcher. Use a DHCP reservation or another stable address for the new host and,
if available, keep port 8765.

## Current notebook setup

The permanent destination has not been chosen yet, so the TV continues to use
the notebook for now. The server runs in the project's `server/venv` environment
and remains in a visible Konsole window. It listens on port 8765. A stable
address on the same network as the TV will need to be chosen for the future
dedicated host.

From the repository root, run this command to open a visible server window:

    ./server/start-visible.sh

The script reads the TV address from `server/.host` (a local, untracked file),
uses port 8765 by default, and refuses to start if the port is already in use.
The Python dependency is pinned in `server/requirements.txt` (`paho-mqtt`
2.2.0); on a new installation, recreate `server/venv` with these requirements.
The server is not configured to start automatically at login, keeping its
execution visible and avoiding a hidden instance.

The installed TV tile keeps its own URL in the TV registry. `serverUrl` in
`server/config.json` is the central source for pages, reports, and
installation/migration operations. If the host address changes, update that
field, restart the server, and open
`/migrate-alvidaa-home-url.html?migrate=confirm` on the TV to update the
persisted tile URL. Each migration creates a new backup without overwriting
earlier backups. Migration to a dedicated host is deferred; a DHCP reservation
on the router is not needed to keep using the notebook with its current
manually configured IP address.

## Information needed before migration

- Host model and operating system.
- A reserved IP address on the network.
- An SSH account or local access to the host.
- Confirmation that it will stay powered on and on the same network as the TV.
- Access to the current notebook during cutover for rollback.

Do not record passwords, tokens, or private keys in this document.

## Required files

The server entry point is `server/vidaa_server.py` (Python), with the
`paho-mqtt` dependency. The `server/keys/` directory contains the credentials
paired with this TV:
- `tokens.json`
- `vidaa_cert.pem`
- `vidaa_key.pem`

These are secrets: transfer them over SSH/SCP, restrict the directory to the
server account (files mode 0600; directory mode 0700), and never attach them to
messages or review files. Do not pair another server while the current session
is active.

Also copy `server/config.json` (watcher enabled) and the `launcher/` directory.
Exclude `.git` and the current virtual environment; recreate the environment
on the host.

## Cutover sequence

1. Reserve the host IP address on the router. Do not change the TV tile yet.
2. Copy the project, credentials, and configuration to the host.
3. Create a Python environment, install `paho-mqtt`, and prepare a startup
   service (for example, systemd on Linux).
4. Stop the notebook server. **Do not run two servers with the same
   credentials at the same time:** the TV/broker disconnects one session in
   favor of the other.
5. Start the server on the new host and verify the MQTT connection, `GET /`,
   WebSocket `/ws`, and Live status.
6. Update the `vidaa-home` entry in `/APPS/websdk/Appinfo.json` with the new URL
   and icon, preserving all other entries. The current installation used a
   dedicated FaaS module; the original installer refuses to modify an existing
   entry, so create a dedicated migration action with a backup and read-back
   verification. Do not click “Install as App” without adapting this flow.
7. On the TV, open the H tile; confirm Live status, open YouTube, press Home,
   and confirm the automatic return. Check the logs on the new host.
8. Only after verification, leave the notebook server stopped and document the
   rollback procedure.

## Automatic startup and observability

On the Linux host, run the server as a dedicated user with `Restart=always`, an
explicit working directory, output in the journal, and `systemctl enable
--now`. Document the service name, checkout path, IP/port, and how to view the
logs. Do not expose the MQTT port on the network; the host initiates an
outbound connection to the TV on port 36669. HTTP port 8765 must accept
connections from the TV on the local network.

## Rollback

Keep the current notebook checkout, configuration, and credentials unchanged
until testing is complete. If the new host fails, stop its service before
starting the notebook server (one session per TV), restore the old URL in the
`vidaa-home` entry with read-back verification, and check the tile.

## Next step

Migration to another host is pending because a destination has not yet been
chosen. In the meantime, keep the current server on the notebook and use
`server/start-visible.sh` to start it again. Once the 24/7 host is selected,
assign it a stable address, update `serverUrl` locally, and follow the cutover
and rollback sequences above. Do not publish the LAN addresses used in the
local configuration.
