# Hosting InvAnim

InvAnim is a plain static site: **no build step, no server code, no database.**
Application files live in `site/`.

Both versions are static entry points: `index.html` is the unchanged original,
and `mobile.html` is the isolated mobile version. Publish both with their
respective JavaScript, CSS and manifests, plus the shared data, icons and
artwork. There is no device detection or automatic redirect.

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

The current repository uses **Deploy from a branch**, with branch `main` and
folder `/ (root)`. A push to `main` triggers GitHub's branch-based Pages build.
This preserves the existing addresses:

- Original: <https://cplanty.github.io/InvAnim/site/>
- Mobile: <https://cplanty.github.io/InvAnim/site/mobile.html>

In branch mode, repository documentation is also published. The included
`.github/workflows/deploy-pages.yml` checks the selected Pages mode and skips
its artifact deployment to avoid competing with the branch-based build.

For a site-only deployment instead, change **Settings → Pages → Source** to
**GitHub Actions**, then push to `main` or manually run the workflow. It
publishes **only `site/`**, with the original app at `/InvAnim/` and mobile at
`/InvAnim/mobile.html`; update shared links if switching modes. Documentation,
tests and workflow files are not included in that artifact.

For a custom domain, set it in Pages settings. With branch-based publishing
from the repository root, its `CNAME` belongs at the repository root.

Note that GitHub Pages ignores `_headers` — that file is Cloudflare-specific.
Pages limits: 1 GB published site, soft 100 GB/month bandwidth.

## Caching strategy

Asset filenames are **not** content-hashed, so `immutable` is deliberately not
used. `site/_headers` sets:

- `site/assets/*` and `site/icons/*` — cached for 7 days
- `invaders.json`, `invaders_extra.json`, `sw.js`, `manifest.json`,
  `index.html`, `mobile.html`, `mobile-manifest.json` — `no-cache`
  (revalidate every load)

If you rebuild the atlases, returning visitors pick them up within a week; use a
cache purge if you need it sooner.

## Bandwidth

A cold, uncached visit to the original version downloads roughly 13 MB, because `initializeAtlases()`
preloads every atlas so sprites never flash white mid-animation. That is about
**8,000 full cold loads per 100 GB**.

The mobile version loads artwork on demand, with a small look-ahead instead of
preloading all 93 atlases. Its initial artwork transfer is therefore much
smaller, although a complete playback can eventually load all the artwork.
Map tile and third-party library traffic is additional in both versions.

## Third-party runtime dependencies

The browser fetches Leaflet, Font Awesome and plugins from jsDelivr / unpkg /
cdnjs, the display font from Google Fonts, and map tiles from the selected tile
provider. Self-hosting the libraries and the font is a worthwhile follow-up if
you want to minimise third-party requests (see PRIVACY.md).

## Other hosts

Any static host works: Bunny.net Storage + CDN, OVHcloud shared hosting,
Scaleway Object Storage, Netlify, alwaysdata. Upload the contents of `site/` to
the document root.
