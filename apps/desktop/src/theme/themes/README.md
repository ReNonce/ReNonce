# Theme Modules

The 15 color palettes used by the app, collected **byte-identical** (colors
untouched) from an upstream open-source Tauri + React project's theme set
(pinned commit `b02a7dc`, 2026-09-13):

`xcode`, `claude`, `kanagawa`, `kanagawa-dragon`, `tokyo-night`, `catppuccin`,
`rose-pine`, `everforest`, `nord`, `gruvbox`, `dracula`, `solarized`, `tide`,
`sage`, `caffeine`.

The upstream `terax-default` entry was dropped — its variants are empty and its
colors live in upstream CSS we did not vendor. No upstream app code is included.

## How they fit the app

- Every module imports `import type { Theme } from "../types"` — the vendored
  contract in `src/theme/types.ts` that mirrors the upstream type.
- `src/theme/registry.ts` imports all of them and powers `<ThemeProvider>` /
  `useTheme()`; colors are applied as CSS variables on `<html>`.
- Treat these files as upstream copies: **do not edit their colors**. Shape
  mismatches are fixed in `../types.ts`; a new theme means dropping the module
  here plus one import and one entry in `registry.ts`.

## License

Apache-2.0 (the upstream repository's license), compatible with this repo's
Apache-2.0. Unlike the GPL-collected assets in `public/assets/` (icons,
sounds), these are safe to compile into the bundle as regular source modules.

## Refreshing from upstream

```sh
git -C /tmp/collect-src2 show \
  <pinned-commit>:src/modules/theme/themes/<name>.ts \
  > apps/desktop/src/theme/themes/<name>.ts
```

Then verify the copies are still byte-identical against the upstream blobs and
update the pinned commit above.
