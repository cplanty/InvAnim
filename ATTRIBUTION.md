# Attribution

InvAnim stands on work by several other people. Please keep these credits
intact in any fork or redistribution.

## Original map viewer — pnote.eu

InvAnim began as a fork of the **Space Invader map viewer by
[pnote.eu](https://pnote.eu/projects/invaders/map/)**. The map bootstrap,
marker/cluster handling, popup structure, the "flashed" collection tracking and
its `localStorage` backup/restore flow all originate from that project.

Everything InvAnim adds — the sprite atlas renderer, the animation engine and
the three animation modes — is built on top of that foundation.

**Thank you to the pnote.eu author for building and publishing the original.**

## Sprite artwork — delhoume/MyInvasion

The 128x128 mosaic sprites packed into the AVIF atlases in `site/assets/` are
sourced from **[delhoume/MyInvasion](https://github.com/delhoume/MyInvasion)**.

Please consult that repository for its own licence and redistribution terms
before reusing the atlases.

## Placement dates and points — invader-spotter.art

The placement dates (`date_pos`) and point values (`points`) in
`site/invaders_extra.json` are derived from
**[invader-spotter.art](https://www.invader-spotter.art)**, a community
reference maintained by its own authors and contributors.

## Mosaic locations

Mosaic locations in `site/invaders.json` are community-sourced and stored as
deliberately obfuscated coordinates (`obf_lat` / `obf_lng`).

## The mosaics themselves

The Space Invader mosaics are the artwork of the artist known as **Invader**.
InvAnim is an unofficial, non-commercial, fan-made project. It is not
affiliated with, endorsed by, or connected to the artist, and the FlashInvaders
application is not ours.

## Libraries and services

| Component | Used for |
|---|---|
| [Leaflet](https://leafletjs.com/) | map rendering |
| [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) | marker clustering |
| [Leaflet.awesome-markers](https://github.com/lvoogdt/Leaflet.awesome-markers) | marker icons |
| [Leaflet.locatecontrol](https://github.com/domoritz/leaflet-locatecontrol) | "locate me" control |
| [Font Awesome](https://fontawesome.com/) | icon glyphs |
| [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) | display font |
| [OpenStreetMap](https://www.openstreetmap.org/copyright), [Stadia Maps](https://stadiamaps.com/), [Esri](https://www.esri.com/), [BKG TopPlus](https://gdz.bkg.bund.de/) | map tiles |

## Licence scope

The InvAnim **code** is MIT licensed (see `LICENSE`). The **data and artwork
above are not** — they remain under their respective owners' terms.
