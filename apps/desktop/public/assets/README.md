# App Assets

Static files served by the ReNonce desktop app. Vite serves `public/` in dev
and copies it into `dist/` on build, so everything here is URL-ready:

- Brand: `/assets/brand/...` (see `brand/README.md`)
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
`currentColor`). The future icon loader must treat each group differently:

| Group | Files | Pattern | Rule |
|---|---|---|---|
| A. Black-only | 211 | `stroke`/`fill="black"`, root `fill="none"` | Invisible on dark backgrounds. Tint to the theme foreground (`filter: invert(1)` in dark mode, or inline SVG + `currentColor` override). |
| B. Baked light colors | 130 | hardcoded `#DCE0E5` / `#C6CAD0` / `white` | Tuned for dark backgrounds; washed out on light ones. Treat as dark-only, or recolor at build time. |
| C. Multicolor file icons | `file_icons/` brand colors | fixed per-language colors | Work on both backgrounds. Never invert or recolor. |

Upstream gets away with hardcoded colors because its renderer tints icons
at draw time; plain web `<img>` cannot do that. Optional cleanup: a one-time
build step normalizing group A to `currentColor`.

Fonts are loaded by `src/styles/fonts.css` (`@font-face` rules pointing at
`/assets/fonts/.../*.ttf`). Themes are **not** served from here anymore: the
theme palettes live as compiled modules in `src/theme/themes/` (see that
directory's README) and feed the registry in `src/theme/registry.ts`.

## Contents and licenses

`brand/` is original ReNonce artwork. `icons/`, `fonts/`, and `sounds/`
are collected from an upstream open-source editor's `assets/` snapshot
(pinned commit `7960b2a`, 2026-09-12). The theme palettes were collected from
a separate upstream (see `src/theme/themes/README.md`) and now live under
`src/`. No upstream app code is included.

Each collected directory keeps its upstream `LICENSE`/`LICENSES`/`OFL.txt`
files — **do not delete them**, they are the attribution required by the
licenses.

| Directory | Contents | License |
|---|---|---|
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

# themes (separate upstream, TypeScript modules) — they now target src/
git -C /tmp/collect-src2 show \
  <pinned-commit>:src/modules/theme/themes/<name>.ts \
  > apps/desktop/src/theme/themes/<name>.ts
```

Then re-apply the scrubbing on icons (rename upstream-prefixed files),
verify themes are still byte-identical (`cmp` against upstream blobs),
update the pinned commits above, and re-check the license table —
upstream may add files under different terms.

## Rules

- Do not remove or edit upstream `LICENSE`/`LICENSES`/`OFL.txt` files.
- Do not copy GPL-licensed files into `src/` as inlined/compiled-in code
  without checking implications first; prefer loading them as runtime files.
- Do not edit theme palettes; they are byte-identical upstream copies
  under `src/theme/themes/`.
- Prefer ReNonce brand assets (`brand/`) for product UI;
  collected assets are reference/fallback material.
- Do not use transparent artwork on light backgrounds
  (see `brand/README.md`).
