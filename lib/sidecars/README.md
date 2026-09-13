# lib/sidecars/

Sources for audit tools bundled as Tauri sidecars and spawned by the Rust
backend. **No tools are implemented yet** — this folder currently defines the
convention so the first tool lands cleanly.

## Convention

- One folder per tool: `slither/`, `semgrep/`, ... each with its own
  `README.md` (tool version, source, license, build notes) and a build script
  producing a standalone binary.
- Labeled JSON over stdout is the contract: `{ "findings": [...] }`
  (exact schema to be frozen in a future `lib/shared/` box).
- Long-running tools must stream progress lines; the backend relays them as
  frontend events.

## Wiring a new tool (checklist)

1. Build per-platform binaries named with the Tauri triplet suffix, e.g.
   `slither-x86_64-unknown-linux-gnu`, `slither-x86_64-apple-darwin`,
   `slither-x86_64-pc-windows-msvc.exe`.
2. Declare them in `lib/desktop/src-tauri/tauri.conf.json`:
   `"bundle": { "externalBin": ["binaries/slither"] }` (paths relative to
   `src-tauri`, binaries placed under `src-tauri/binaries/`).
3. Scope execution in `lib/desktop/src-tauri/capabilities/default.json`
   (verified against the Tauri v2 shell plugin docs):
   ```json
   {
     "identifier": "shell:allow-spawn",
     "allow": [
       {
         "name": "slither",
         "cmd": "slither",
         "args": [{ "validator": "\\S+" }],
         "sidecar": true
       }
     ]
   }
   ```
   Add `shell:allow-stdin-write` / `shell:allow-kill` only if the tool needs them.
4. Spawn from Rust with `ShellExt::sidecar("slither")`, parse stdout JSON,
   forward progress as events. No Python runtime is bundled — ship
   self-contained binaries (PyInstaller onefile or native ports).

## Status

- [x] `tauri-plugin-shell` initialized in `run()` (no binaries, no scopes yet)
- [ ] First tool (Slither probe proposed)
- [ ] `lib/shared/` finding schema
