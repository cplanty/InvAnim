# Privacy

InvAnim is a static site. There is no backend, no account, no database and no
server-side logging under our control.

## No analytics, no cookies

InvAnim ships **no analytics, no tracking pixels and no advertising**. It sets
**no cookies**.

## What is stored, and where

Everything InvAnim remembers is kept in your browser's `localStorage`, on your
device only. It is never transmitted to us.

| Key | Contents | Set when |
|---|---|---|
| `collectedIds` | IDs of mosaics you marked as flashed | you mark a mosaic, or restore a backup |
| `hideCollected` | display preference | you toggle it in Settings |
| `hideDestroyed` | display preference | you toggle it in Settings |
| `tileset` | chosen map background | you pick one in Settings |
| `animFrom`, `animTo` | date range limiting the animations | you set them in Settings |
| `uid` | your FlashInvaders user ID | only if you type one into Settings |

Clearing your browser's site data erases all of it. Because it is local, it is
not synced between devices — use Settings to download a backup file.

## Third-party requests

Loading the map necessarily contacts third parties, each of which will see your
IP address and receives its own privacy policy:

- **Map tile providers** — Esri (satellite) by default; OpenStreetMap, Stadia
  Maps or BKG if you pick another background in Settings or via `?tileset=`.
- **CDNs** — jsDelivr, unpkg and cdnjs for Leaflet, Font Awesome and plugins.
- **Google Fonts** — for the *Press Start 2P* display font.
- **api.space-invaders.com** — **only** if you enter a `uid`. Your `uid` is
  sent to the official FlashInvaders gallery endpoint to retrieve your own
  flashed list. This happens on "Restore from app" and on "My".

InvAnim never sends your `uid`, your collection, or your location anywhere
else.

## Geolocation

The "locate me" control asks for your position through the browser's standard
permission prompt. The result is used to centre the map and is never stored or
transmitted.

## Hosting

The deployed site is served as static files by the host chosen by whoever
deploys it (for example Cloudflare Pages or GitHub Pages). That host will
process request metadata such as IP addresses under its own policy.
