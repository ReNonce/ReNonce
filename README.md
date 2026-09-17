# ReNonce

ReNonce is a desktop workspace for code and AI agents: a VS Code-shaped shell for
reading and editing a project, driving git, and running the coding-agent CLIs
already installed on the machine.

## Features

| Area | What it does |
|---|---|
| **Editor** | CodeMirror 6 surface with a line gutter, selection, Ctrl/Cmd+S saving, and syntax highlighting for everything CodeMirror ships — JSX/TSX, JSON, Markdown, Rust, Python, Go, Java, PHP, C/C++, C#, Ruby, SQL, YAML, TOML, Dockerfile, shell, dotfiles and lock files, plus community grammars for Svelte, Nix, Terraform, Zig, Elixir, Make and Solidity. Each grammar is fetched only for the file that needs it. Markdown files switch between code and rendered preview, and fences highlight the language they name. |
| **Files** | File tree with its own search, context menu (new file/folder, rename, delete, reveal), and a folder breadcrumb in the bottom bar that shows the 3 deepest levels plus `…` and `+` to move up and down. |
| **Git history** | Left panel replaces the explorer with the commit history, grouped under day headings with author avatar, name and commit message. Selecting a commit opens its patch in the center. |
| **Git commit / push** | Opposite panel for staging and committing: tracked/untracked list, commit message that grows and expands, pinned compose, and a Push mode listing what has not been pushed yet. |
| **Git operations** | Fetch, Fetch from, Pull, Pull (rebase), Push, Push to, Force push (always `--force-with-lease`), remotes, branch switching, and one of Amend / Sign off / Skip hooks. |
| **Diff viewer** | Patch in the center with a single editor-style line-number gutter and a collapse chevron per file, animated like the sidebar. |
| **Agents** | New session picker over the CLIs this machine actually has, terminal launched straight into the agent, a session row per run, inline rename, and a right-click menu (rename, close, close others, close all). A terminal closes itself when its CLI exits and the row goes with it. |
| **Agent usage** | One button reveals each agent's account limits, read from that provider's own source (local files, OAuth usage endpoint, CLI statusline mirror, or console API). Values that cannot be read are not shown. |
| **Credential settings** | Providers whose limits live behind a web session (MiniMax, opencode) take a pasted cookie in Settings, stored on this machine only. |
| **Terminal** | Tabs with a right-click menu (close, close others, close all), shell picker, theme-aware ANSI palette, and PTY session lifecycle. |
| **Themes** | 15 built-in themes (catppuccin, dracula, gruvbox, nord, rose-pine, solarized, tokyo-night, xcode and more) with light/dark/system modes. |
| **Keymap** | Every shortcut is a rebindable action, shown inline in search fields. |
| **Layout** | Three-column workspace (sidebar, center tabs, view switcher), collapsible panels with a shared collapse animation, and full-width settings screens. |

## Tech stack

- [Tauri 2](https://tauri.app/) — desktop shell (Rust backend + web frontend)
- [React 19](https://react.dev/) + TypeScript + [Vite](https://vite.dev/) frontend
- CodeMirror 6 (editor) and xterm.js (terminal) on the frontend
- Rust backend: PTY sessions, git plumbing, and provider usage readers
- npm + Cargo for package management

App identity: `productName "ReNonce"`, identifier `com.renonce.app`.

## Prerequisites

- Node.js v22 or newer + npm
- Rust + Cargo
- Tauri system dependencies for Linux (webkit2gtk et al. — see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/))
- Git on `PATH` for the git panels

## Getting started

```sh
cd renonce/apps/desktop
npm install
npm run tauri dev
```

Repetitive workflows have wrappers in `script/` (runnable from anywhere):

| Script | Does |
|---|---|
| `script/dev.sh` | dev window with hot-reload |
| `script/build.sh` | production bundle |
| `script/check.sh` | tsc + cargo fmt (fast CI gates) |
| `script/install.sh` | `npm ci` in apps/desktop |
| `script/icons.sh` | regenerate OS icons from brand master |
| `script/clean.sh` | remove `dist/` + Rust `target/` |

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

## Agent CLIs

The New session picker lists a CLI only when it is installed, and the usage reader
lists a provider only when its limits can actually be read. Agents the app knows
about: Claude Code, Codex CLI, Gemini CLI, Grok CLI, opencode, Copilot CLI, Kimi
Code, MiniMax Code (`mcode`), Antigravity (`agy`), Crush, Command Code, and
Hermes. Adding another is one entry in
`apps/desktop/src/agent/agents.ts` plus a usage reader on the Rust side.

## Project structure

```
renonce/
├── apps/
│   └── desktop/              # Tauri desktop app (all commands run here)
│       ├── index.html        # shell React mounts into #root
│       ├── vite.config.ts    # React plugin + Tauri dev server
│       ├── public/assets/    # brand/, themes/, icons/, fonts/, sounds/
│       ├── src/              # React frontend
│       │   ├── agent/        # agent catalogue, sessions, usage client
│       │   ├── components/   # layout, editor, git, terminal, agent, settings, ui
│       │   ├── files/        # path helpers
│       │   ├── git/          # frontend git client
│       │   ├── keymap/       # rebindable actions
│       │   ├── terminal/     # tab model
│       │   └── workspace/    # open folder state
│       └── src-tauri/        # Rust backend
│           ├── src/          # pty.rs, git.rs, usage.rs, fs commands
│           ├── tauri.conf.json
│           └── icons/        # generated OS icons (do not hand-edit)
├── script/                   # dev/build/check/install/icons/clean wrappers
├── README.md
└── AGENT.md                  # contributor guide for AI agents
```

## Brand assets

All ReNonce logos/icons live in `apps/desktop/public/assets/brand/`
(URL: `/assets/brand/...`) plus import shortcuts in `apps/desktop/src/assets/`.
Variants, actual pixel sizes, format guidance and usage rules are documented in
[`apps/desktop/public/assets/brand/README.md`](apps/desktop/public/assets/brand/README.md).
OS icons in `src-tauri/icons/` were generated from
`ReNonce-Icon-1024x1024-1x.png` via `tauri icon`.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
