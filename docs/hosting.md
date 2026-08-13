# Hosting InvAnim

InvAnim is a plain static site: **no build step, no server code, no database.**
Everything that gets published lives in `site/`.

- **Size:** ~13 MB across ~200 files (10.8 MB of that is the AVIF atlases)
- **Requirement:** static file serving over **HTTPS** (needed for the service
  worker and for browser geolocation)
- **No URL rewriting needed** — `?id=` and `#zoom=` are handled client-side

## MIME types

Most hosts get these right, but if sprites fail to render, check:

| Extension | Type |
|---|---|
| `.avif` | `image/avif` |
| `.json` | `application/json` |
| `.js` | `text/javascript` |
| `.webmanifest` / `.json` manifest | `application/manifest+json` |

## Cloudflare Pages (recommended)

1. Connect the repository.
2. **Build command:** *(leave empty)*
3. **Build output directory:** `site`
4. Add your custom domain; HTTPS is issued automatically.

`site/_headers` is picked up automatically for caching and security headers.

Relevant free-plan limits: 20,000 files per site and 25 MiB per file. InvAnim
uses ~200 files with a largest file of ~1.3 MB, so there is a wide margin.

## GitHub Pages

`.github/workflows/deploy-pages.yml` is included and publishes **only `site/`**,
so docs and workflow files are never served.

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`.
3. For a custom domain, set it in Settings → Pages and commit a `site/CNAME`
   file containing the domain.

Note that GitHub Pages ignores `_headers` — that file is Cloudflare-specific.
Pages limits: 1 GB published site, soft 100 GB/month bandwidth.

## Caching strategy

Asset filenames are **not** content-hashed, so `immutable` is deliberately not
used. `site/_headers` sets:

- `site/assets/*` and `site/icons/*` — cached for 7 days
- `invaders.json`, `invaders_extra.json`, `sw.js`, `manifest.json`,
  `index.html` — `no-cache` (revalidate every load)

If you rebuild the atlases, returning visitors pick them up within a week; use a
cache purge if you need it sooner.

## Bandwidth

A cold, uncached visit downloads roughly 13 MB, because `initializeAtlases()`
preloads every atlas so sprites never flash white mid-animation. That is about
**8,000 full cold loads per 100 GB**.

If traffic ever makes this a concern, the preload loop in `initializeAtlases()`
is the single place to change — atlases could be fetched lazily per city.

## Third-party runtime dependencies

The browser fetches Leaflet, Font Awesome and plugins from jsDelivr / unpkg /
cdnjs, the display font from Google Fonts, and map tiles from the selected tile
provider. Self-hosting the libraries and the font is a worthwhile follow-up if
you want to minimise third-party requests (see PRIVACY.md).

## Other hosts

Any static host works: Bunny.net Storage + CDN, OVHcloud shared hosting,
Scaleway Object Storage, Netlify, alwaysdata. Upload the contents of `site/` to
the document root.
