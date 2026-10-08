# Data files

Both data files live in `site/` and are fetched at startup. They are static
snapshots — InvAnim has no backend and never writes them back.

## `invaders.json`

A JSON array of every known mosaic. Source of all map markers.

```json
{
  "id": "AIX_01",
  "status": "OK",
  "hint": null,
  "instagramUrl": "https://www.instagram.com/explore/tags/aix_01/",
  "obf_lat": 43.5285840236,
  "obf_lng": 5.4431859342
}
```

| Field | Meaning |
|---|---|
| `id` | unique mosaic ID |
| `status` | `OK`, `damaged`, `destroyed` or `hidden` — drives marker icon/colour |
| `hint` | optional free-text hint |
| `instagramUrl` | optional link |
| `obf_lat` / `obf_lng` | **deliberately obfuscated** coordinates |

Coordinates are intentionally imprecise: they place a mosaic on the right
street without giving an exact position.
New locations in the 2026-10-08 update are snapped to a 20 m grid. Latitude
uses a step of `degrees(20 / 6371008.8)`; longitude uses
`degrees(20 / (6371008.8 * cos(snapped_latitude)))`, so the grid spacing stays
approximately 20 m at each latitude. Existing locations are unchanged.

## `invaders_extra.json`

A JSON object keyed by mosaic ID, used by the "InvAnim" mode and the stats
overlay.

```json
{
  "PA_01":   { "date_pos": "1998-01-15", "points": 10 },
  "GRTI_01": { "date_pos": "2015-06-20", "points": 30 }
}
```

| Field | Meaning |
|---|---|
| `date_pos` | placement date, ISO 8601 — the sort order for "InvAnim" |
| `points` | point value; `0` means unknown |
| `default_lat` / `default_lng` | optional city-level fallback when no exact location exists |

19 mosaics are listed with unknown points upstream and are stored as
`points: 0`: BGK_22, IST_03, IST_19, LDN_117, MBSA_09, MIA_77, MIA_83, MPL_20,
NY_83, NY_85, NY_128, NY_132, NY_139, NY_140, NY_143, NY_144, SD_09, SPACE_01,
VRS_29.

## Sprite atlases — `site/assets/`

Sprites are packed into AVIF atlases to keep request counts low.

- Each atlas is up to 2560x2560 and holds up to 400 sprites of 128x128 in a
  20x20 grid.
- Per-atlas JSON uses the PixiJS spritesheet shape: `frames[id] = {frame: {x, y, w, h}}`.
- **`assets/all_atlases.json`** merges every atlas into one lookup and is the
  only atlas file fetched at startup:

```json
{
  "atlasFiles": ["PA_00", "PA_01", "..."],
  "sprites": { "PA_0001": { "atlas": "PA_00", "frame": { "x": 0, "y": 0, "w": 128, "h": 128 } } }
}
```

Sprites are drawn with CSS `background-image` plus percentage
`background-position`, so they scale smoothly during the flight animation.

## ID conventions

- IDs are `PREFIX_NUMBER`, e.g. `PA_1234`, `LDN_42`, `FTBL_01`.
- The city prefix is extracted with `^(.+?)_\d+$`, falling back to the whole ID
  for edge cases such as `SPACE2ISS`, which has no numeric suffix.
- Each newly encountered prefix during an animation awards a +100 city bonus.
- The ISS aliases `SPACE_02` and `SPACE2ISS_NaN` refer to `SPACE2ISS`.
  Its existing placement date, `2015-03-12`, is preserved, with one animation
  entry rather than duplicate mosaics.

## Updating the data

The data files are snapshots of public community sources. The deployed site is
standalone and needs no backend or external tooling service.
The tooling used to aggregate this info is not part of this repository. 
To refresh the site, replace `invaders.json`, `invaders_extra.json`
and the contents of `assets/`, then redeploy.

Placement dates, points, current statuses and new sprite artwork come from
[Invader Spotter](https://www.invader-spotter.art). Placement dates can be
retrieved by POSTing `mode=date&date=2026&page=1` to its `listing.php`, with
`dates.php` as the Referer; listings contain 16 results per page. Status update
dates must not be treated as placement dates.

Retrieve sources serially, space requests by at least three seconds, cache
responses, and download only missing artwork. Merge new locations rather than
overwriting existing ones, snap new coordinates to the grid above, and retain
known dates and point values. Repack changed sprite atlases, regenerate the
combined `assets/all_atlases.json` lookup, then redeploy the static files.

The 2026-10-08 snapshot adds 97 locations, including PA_1594, PA_1598 and all
19 Stockholm mosaics, plus 20 new sprites. STK_13 is marked destroyed.
