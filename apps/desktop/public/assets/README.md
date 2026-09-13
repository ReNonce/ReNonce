# App Assets

Static files served by the ReNonce desktop app. Vite serves `public/` in dev
and copies it into `dist/` on build, so everything here is URL-ready:

- Brand: `/assets/brand/...` (see `brand/README.md`)
- Themes: `/assets/themes/...`
- Icons: `/assets/icons/...`
- Fonts: `/assets/fonts/...`
- Sounds: `/assets/sounds/...`

```html
<img src="/assets/icons/settings.svg" alt="" />
<audio src="/assets/sounds/agent_done.wav"></audio>
```

```tsx
import settingsIcon from "/assets/icons/settings.svg";
```

## Icon theming (3 groups)

The `icons/` SVGs are not uniformly theme-safe (only 2 files use
`currentColor`). The future theme loader must treat each group differently:

| Group | Files | Pattern | Rule |
|---|---|---|---|
| A. Black-only | 211 | `stroke`/`fill="black"`, root `fill="none"` | Invisible on dark backgrounds. Tint to the theme foreground (`filter: invert(1)` in dark mode, or inline SVG + `currentColor` override). |
| B. Baked light colors | 130 | hardcoded `#DCE0E5` / `#C6CAD0` / `white` | Tuned for dark backgrounds; washed out on light ones. Treat as dark-only, or recolor at build time. |
| C. Multicolor file icons | `file_icons/` brand colors | fixed per-language colors | Work on both backgrounds. Never invert or recolor. |

Upstream gets away with hardcoded colors because its renderer tints icons
at draw time; plain web `<img>` cannot do that. Optional cleanup: a one-time
build step normalizing group A to `currentColor`.

Fonts need an `@font-face` rule pointing at
`/assets/fonts/.../*.ttf`. Theme files are TypeScript `Theme` modules
(shadcn-style `background`/`foreground`/`primary`/… tokens with `light`/`dark`
variants) — reference until the theme loader lands, not imported yet.

## Contents and licenses

`brand/` is original ReNonce artwork. `icons/`, `fonts/`, and `sounds/`
are collected from an upstream open-source editor's `assets/` snapshot
(pinned commit `7960b2a`, 2026-09-12). `themes/` holds 15 theme modules
collected pure (byte-identical, colors untouched) from an upstream
open-source Tauri + React project's theme set
(pinned commit `b02a7dc`, 2026-09-13): `xcode`,
`claude`, `kanagawa`, `kanagawa-dragon`, `tokyo-night`, `catppuccin`,
`rose-pine`, `everforest`, `nord`, `gruvbox`, `dracula`, `solarized`,
`tide`, `sage`, `caffeine` (the upstream `terax-default` entry was dropped —
its variants are empty, colors live in upstream CSS we did not vendor).
No upstream app code is included.

Each collected directory keeps its upstream `LICENSE`/`LICENSES`/`OFL.txt`
files — **do not delete them**, they are the attribution required by the
licenses.

| Directory | Contents | License |
|---|---|---|
| `themes/` | 15 `.ts` theme modules (see list above) | Apache-2.0 (upstream repo license — compatible with this repo). Files are byte-identical copies; do not edit colors. They import a `Theme` type from a sibling module not vendored here, so treat them as data, not compilable sources. |
| `icons/` | ~300 UI/file-type `.svg` icons | ISC for Lucide portions (see `icons/LICENSES`). Upstream-original icons without a separate license file fall under the upstream GPL-3.0-or-later. Upstream-prefixed filenames were renamed to neutral names. |
| `fonts/` | Lilex + IBM Plex Sans (`.ttf`) | OFL (see `fonts/lilex/OFL.txt`, `fonts/ibm-plex-sans/license.txt`). |
| `sounds/` | 8 call/agent `.wav` effects | Upstream GPL-3.0-or-later (no separate license file). |

Licensing posture: MIT/ISC/OFL parts are permissive and compatible with this
repo's Apache-2.0. The GPL-3.0-or-later parts stay under GPL as separable
runtime data files (aggregation, not linked code) — keep them as files, keep
their notices, do not relicense them.

## Refreshing the collected assets

```sh
# icons / fonts / sounds
git clone --depth 1 --filter=blob:none --sparse \
  <upstream-editor-repo> /tmp/collect-src
git -C /tmp/collect-src sparse-checkout set \
  assets/themes assets/icons assets/fonts assets/sounds
cp -r /tmp/collect-src/assets/{icons,fonts,sounds} \
  apps/desktop/public/assets/

# themes (separate upstream, TypeScript modules)
git -C /tmp/collect-src2 show \
  <pinned-commit>:src/modules/theme/themes/<name>.ts \
  > apps/desktop/public/assets/themes/<name>.ts
```

Then re-apply the scrubbing on icons (rename upstream-prefixed files),
verify themes are still byte-identical (`cmp` against upstream blobs),
update the pinned commits above, and re-check the license table —
upstream may add files under different terms.

## Rules

- Do not remove or edit upstream `LICENSE`/`LICENSES`/`OFL.txt` files.
- Do not copy GPL-licensed files into `src/` as inlined/compiled-in code
  without checking implications first; prefer loading them as runtime files.
- Prefer ReNonce brand assets (`brand/`) for product UI;
  collected assets are reference/fallback material.
- Do not use transparent artwork on light backgrounds
  (see `brand/README.md`).
