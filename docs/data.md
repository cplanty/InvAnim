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

## `invaders_extra.json`

A JSON object keyed by mosaic ID, used by the "Animate All" mode and the stats
overlay.

```json
{
  "PA_01":   { "date_pos": "1998-01-15", "points": 10 },
  "GRTI_01": { "date_pos": "2015-06-20", "points": 30 }
}
```

| Field | Meaning |
|---|---|
| `date_pos` | placement date, ISO 8601 — the sort order for "Animate All" |
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

## Updating the data

The data files are snapshots produced by a separate private tooling pipeline
that scrapes public sources and rebuilds the atlases. That tooling is not part
of this repository. To refresh the site, replace `invaders.json`,
`invaders_extra.json` and the contents of `assets/`, then redeploy.
