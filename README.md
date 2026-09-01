# InvAnim

An interactive map of **Space Invader** street art mosaics worldwide, with
animated fly-throughs that replay the invasion — by number, by placement date,
or by your own flashed collection.

Forked from and credited to the original Space Invader map viewer by
**[pnote.eu](https://pnote.eu/projects/invaders/map/)** — see
[ATTRIBUTION.md](ATTRIBUTION.md).

> Unofficial, non-commercial fan project. Not affiliated with the artist or
> with the FlashInvaders app.

## Features

### Map
- Interactive Leaflet map with marker clustering
- Sprite artwork in popups, rendered from AVIF atlases
- Eight backgrounds — satellite (default), street, grey, dark, toner,
  watercolour, topographic or none — chosen in Settings and remembered
- "locate me" control
- Zoom is capped at roughly a 500 m scale: the published positions are
  deliberately approximate, so a closer view would only suggest false precision
- Deep links: `?id=PA_1234` (opens that mosaic on the plain map instead of
  starting the animation), and `#zoom=13&lat=48.86&lng=2.35`

### Collection tracking
- Mark mosaics as flashed; stored locally in your browser
- Download / restore your collection as a JSON backup
- Optionally import your flashed list from the FlashInvaders app via your `uid`

### Animations
The site opens straight into the **InvAnim** animation. Three modes replay the
mosaics as sprites flying from off-screen onto their map position, with a live
stats overlay (distance, points, city count, dates):

| Mode | Order | Extra |
|---|---|---|
| **InvAnim** | every mosaic by historical placement date | placement date |
| **Paris** | Paris mosaics by number | — |
| **My** | your flashed mosaics by flash date | points, cities, flash date |

The map auto-pans between cities, with a "+100 PTS" bonus banner the first time
each new city appears. When a date range is set, cities already explored before
the range are not celebrated again — only genuine first visits count.

A progress bar along the bottom shows how far the animation has got and the date
it has reached. Drag it to jump anywhere in the sequence — the map is rebuilt to
show exactly what had been placed at that point.

Settings can also limit an animation to a **date range**, which is handy for
replaying a single trip instead of the whole collection. It filters on placement
date, or on flash date in **My** mode.

Clicking the animation that is running pauses it, and clicking it once more
resumes from the same point; clicking a different one switches to it.

## Running locally

No build step, no dependencies — it is plain static files.

```bash
git clone https://github.com/cplanty/invanim.git
cd invanim/site
python -m http.server 8000
```

Then open <http://localhost:8000>.

Example: <http://localhost:8000/?tileset=dark&id=PA_01#zoom=14&lat=48.8583&lng=2.3477>

## URL parameters

| Parameter | Values |
|---|---|
| `?tileset=` | `satellite` (default), `osm`, `grayscale`, `dark`, `toner`, `watercolor`, `topo`, `none`. Overrides the Settings choice; the older `st` and `grau` keys still work. |
| `?id=` | mosaic ID, e.g. `PA_1234` — centres the map, opens its popup, and skips the opening animation |
| `#zoom=&lat=&lng=` | initial view |

## Project layout

```
site/                 the deployable static site (this is all that gets published)
  index.html          markup, modals, UI
  map.js              map, markers, popups, sprite rendering, animation engine
  map.css             styling and animation keyframes
  sw.js               minimal service worker (PWA)
  manifest.json       PWA manifest
  icons/              PWA icons
  invaders.json       mosaic locations + status (obfuscated coordinates)
  invaders_extra.json placement dates + point values
  assets/             AVIF sprite atlases + atlas metadata
  _headers            caching / security headers (Cloudflare Pages)
  404.html            required so Pages does not treat the site as an SPA
docs/                 hosting and data notes
```

See [docs/data.md](docs/data.md) for the data formats and
[docs/hosting.md](docs/hosting.md) for deployment.

## Deployment

The site is ~13 MB across ~200 files and needs only static hosting with HTTPS.
Cloudflare Pages (output directory `site`) and GitHub Pages (workflow included)
are both supported out of the box — see [docs/hosting.md](docs/hosting.md).

## Privacy

No analytics, no cookies, no tracking. Your collection and `uid` never leave
your browser. See [PRIVACY.md](PRIVACY.md).

## Licence

Code is MIT (see [LICENSE](LICENSE)). The mosaic **data and sprite artwork are
not covered by it** and remain under their original terms — see
[ATTRIBUTION.md](ATTRIBUTION.md).
