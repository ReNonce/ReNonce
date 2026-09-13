## Summary

<!-- What does this PR change and why? Link issues with `Closes #NNN`. -->

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor / chore
- [ ] Docs / CI

## Testing

<!-- How was this verified? e.g. `npm run tauri dev` from lib/desktop, `npx tsc --noEmit`, CI run link. -->

## Checklist

- [ ] NatSpec docs added/updated (`@title`/`@notice`/`@dev`, plus `@param`/`@return`)
- [ ] `npx tsc --noEmit` and `cargo fmt --check` pass locally (from `lib/desktop[/src-tauri]`)
- [ ] No hand-edited files in `src-tauri/icons/` (use `tauri icon`)
- [ ] No transparent brand assets on light backgrounds
- [ ] No cross-box relative imports (see `lib/README.md`)
- [ ] Docs updated (`README.md`, brand `README.md`, `AGENT.md` if conventions changed)
