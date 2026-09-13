# ReNonce

ReNonce is a planned AI audit platform, shipped as a desktop app.
This repository currently holds the empty Tauri + React scaffold — no audit
features or custom UI yet.

## Tech stack

- [Tauri 2](https://tauri.app/) — desktop shell (Rust backend + web frontend)
- [React 19](https://react.dev/) + TypeScript + [Vite](https://vite.dev/) frontend
- Rust backend with `tauri-plugin-shell` initialized sidecar-ready (no binaries yet)
- npm + Cargo for package management

App identity: `productName "ReNonce"`, identifier `com.renonce.app`.

## Prerequisites

- Node.js + npm
- Rust + Cargo
- Tauri system dependencies for Linux (webkit2gtk et al. — see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/))

## Getting started

```sh
cd renonce/lib/desktop
npm install
npm run tauri dev
```

Web-only dev (no desktop shell): `npm run dev`. Release bundle:

```sh
npm run tauri build
```

Typecheck without building:

```sh
npx tsc --noEmit
```

Regenerate the OS app icons from the brand master:

```sh
./node_modules/.bin/tauri icon public/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024-1x.png
```

## Project structure

```
renonce/
├── lib/
│   └── desktop/              # Tauri desktop app (all commands run here)
│   │   ├── index.html        # blank shell, React mounts into #root
│   │   ├── vite.config.ts    # React plugin + Tauri dev server (port 1420)
│   │   ├── src/              # React frontend (main.tsx, blank App.tsx, App.css)
│   │   ├── public/assets/brand/  # full ReNonce brand library (see its README)
│   │   └── src-tauri/        # Rust backend + config
│   │       ├── tauri.conf.json   # borderless window (decorations: false)
│   │       ├── capabilities/ # (no shell scopes yet)
│   │       └── icons/        # generated OS icons (do not hand-edit)
├── .github/                  # CI workflow, issue templates, PR template
├── README.md
└── AGENT.md                  # contributor guide for AI agents
```

## Brand assets

All ReNonce logos/icons live in `lib/desktop/public/assets/brand/`
(URL: `/assets/brand/...`) plus import shortcuts in `lib/desktop/src/assets/`.
Variants, actual pixel sizes, format guidance and usage rules are documented in
[`lib/desktop/public/assets/brand/README.md`](lib/desktop/public/assets/brand/README.md).
OS icons in `src-tauri/icons/` were generated from
`ReNonce-Icon-1024x1024-1x.png` via `tauri icon`.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
