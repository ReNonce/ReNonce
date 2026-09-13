# lib/

Container for ReNonce code boxes. Each box is self-contained with its own
toolchain and docs.

| Box | Contents | Toolchain |
|---|---|---|
| `desktop/` | Tauri desktop app (React frontend + Rust backend) | npm + Cargo |
| `sidecars/` | Audit tool sources bundled as Tauri sidecars (no Python tools yet — convention only) | per-tool |

Rules: boxes never import across each other by relative path. Shared contracts
(JSON schemas, finding types) will live in a future `shared/` box and be
consumed by copy or package, not by `../../` imports.
