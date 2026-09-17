# ReNonce Brand Assets

The official logo and icon set for ReNonce used by this desktop app.
Original source: `/home/oxastarots/Pictures/ReNonce Brand Asset`
(repo: `https://github.com/FajarArrizki/ReNonce-Brand-Asset.git` — same contents).

Total: 18 folders, 162 image files + this README.

> Vite note: this library lives in `public/assets/brand/`, so files are served
> at `/assets/brand/...` in dev and copied into `dist/` on build. Import-based
> shortcuts for components live in `src/assets/` (see below).

## The 4 variants — pick the right one

| Variant | Folders | Look | Use for |
|---|---|---|---|
| **Icon** | `ReNonce-Icon-*` | White logo on an **opaque black square** (not transparent) | OS app icon, favicon, avatar — safe on any background |
| **Icon-only** | `ReNonce-Icon-only-*` | White logo alone, **transparent background** | UI, usually through `<Logo>` (raw `<img>` use is dark-background only — the component inverts it on light themes). |
| **Lockup** | `ReNonce-icon-type` | Icon + "ReNonce" wordmark, white on transparent | Header / splash screen on dark backgrounds |
| **Wordmark** | `ReNonce-Type` | "ReNonce" text only, white on transparent | Next to an icon in dark layouts |

> All artwork is **white**. Never use the transparent variants (`Icon-only`,
> `icon-type`, `Type`) on a light background.

## Folder structure

```
brand/
├── ReNonce-Icon-16x16/ | 32x32 | 64x64 | 128x128 | 256x256 | 512x512 | 1024x1024/
├── ReNonce-Icon-only-16x16/ | 32x32 | 64x64 | 128x128 | 256x256 | 512x512 | 1024x1024/
├── ReNonce-Icon-original/          <- full icon, original size
├── ReNonce-Icon-only-original/    <- mark only, original size
├── ReNonce-icon-type/             <- icon + wordmark
└── ReNonce-Type/                  <- wordmark only
```

Each folder holds 9 files following `{Asset-Name}-{scale}.{ext}`:

```
ReNonce-Icon-128x128-1x.png  -2x.png  -3x.png  -4x.png
ReNonce-Icon-128x128-1x.jpg  -2x.jpg  -3x.jpg  -4x.jpg
ReNonce-Icon-128x128.svg
```

## Actual `-1x.png` dimensions (measured, not taken from folder names)

> Watch out: two folders are misnamed — `ReNonce-Icon-16x16/-1x.png` is really
> **32×32 px**, and `ReNonce-Icon-32x32/-1x.png` is really **40×40 px**.
> Everything else matches its name. `-2x` = 2× the `-1x` size, and so on.

| Folder | `-1x.png` size |
|---|---|
| `ReNonce-Icon-16x16` | 32×32 px |
| `ReNonce-Icon-32x32` | 40×40 px |
| `ReNonce-Icon-64x64` | 64×64 px |
| `ReNonce-Icon-128x128` | 128×128 px |
| `ReNonce-Icon-256x256` | 256×256 px |
| `ReNonce-Icon-512x512` | 512×512 px |
| `ReNonce-Icon-1024x1024` | 1024×1024 px |
| `ReNonce-Icon-only-16x16` | 16×16 px |
| `ReNonce-Icon-only-32x32` | 32×32 px |
| `ReNonce-Icon-only-64x64` | 64×64 px |
| `ReNonce-Icon-only-128x128` | 128×128 px |
| `ReNonce-Icon-only-256x256` | 256×256 px |
| `ReNonce-Icon-only-512x512` | 512×512 px |
| `ReNonce-Icon-only-1024x1024` | 1024×1024 px |
| `ReNonce-Icon-original` | 253×251 px |
| `ReNonce-Icon-only-original` | 213×193 px |
| `ReNonce-icon-type` | 820×193 px |
| `ReNonce-Type` | 587×100 px |

## Formats — when to use which

- **SVG** (1 per folder): vector, sharp at every size. **First choice for UI.**
- **PNG** (`-1x` to `-4x`): raster + transparency (except the `Icon` variant,
  which is opaque). Pick the scale nearest above the display size,
  e.g. a 24 px icon → the 32 px `-1x.png`.
- **JPG** (`-1x` to `-4x`): no transparency. Only for documents/print targets
  without transparency support. Not for UI.

## Using them in this project

By URL (served from `public/`):

```html
<!-- App icon (opaque, safe on any background) -->
<img src="/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024.svg" alt="ReNonce logo" />

<!-- Icon + wordmark lockup (dark backgrounds only) -->
<img src="/assets/brand/ReNonce-icon-type/ReNonce-icon-type.svg" alt="ReNonce" />

<!-- Wordmark only (dark backgrounds only) -->
<img src="/assets/brand/ReNonce-Type/ReNonce-Type.svg" alt="ReNonce" />
```

Preferred in-app accessor: the `Logo` component
(`src/components/brand/logo/Logo.tsx`) — it maps all four variants to their SVG paths,
scales by `size`, and inverts the transparent variants on a light theme (a
render-time tint driven by `:root[data-mode="light"]` in `Logo.css`; the files
themselves stay white), so the mark stays readable on either background:

```tsx
<Logo variant="lockup" size={32} />
```

By import in React components (shortcuts in `src/assets/`, duplicates of 2 SVGs
above kept so imports stay short):

```tsx
import renonceIcon from "./assets/renonce-icon.svg";
import renonceLockup from "./assets/renonce-lockup.svg";
```

- `src/assets/renonce-icon.svg` = `ReNonce-Icon-1024x1024.svg`
- `src/assets/renonce-lockup.svg` = `ReNonce-icon-type.svg`

To regenerate the **OS app icons** (`src-tauri/icons/`) from the opaque master
if the logo ever changes:

```sh
./node_modules/.bin/tauri icon public/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024-1x.png
```

## Rules

- Do not stretch, recolor, rotate, add effects to, or otherwise modify the artwork.
- Do not use transparent variants on light backgrounds.
- Do not use JPG for UI.
- Need a size missing from the table? Scale down from SVG, never upscale a small PNG.

## License

Copyright 2026 ReNonce.

All artwork in this directory — including the `renonce-icon.svg` /
`renonce-lockup.svg` import shortcuts in `src/assets/` (exact copies of two
SVGs above) — is licensed under the Apache License, Version 2.0, same as the
rest of this repository. See [`LICENSE`](./LICENSE) in this directory
(identical to the root `LICENSE`) for the full text.
