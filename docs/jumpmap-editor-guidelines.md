# Jumpmap Editor Refactor Guidelines

Date: 2026-02-06
Scope: `public/jumpmap-editor/*`, `docs/*`

## 1) Goal
- Stabilize the current map editor and finish jump-map production workflow.
- Refactor safely without breaking existing editor behavior.

## 2) Non-Negotiables
- Do not change behavior in early refactor phases unless explicitly requested.
- Keep edits scoped to jumpmap files only.
- Update docs with every meaningful structural change.
- Preserve rollback points by phase-level commits.

## 3) Refactor Guardrails
- Phase 1-2: move code only (function extraction / file split), no logic change.
- Keep a single shared `state` object until phase 4.
- No large renaming across the entire file in one step.
- Split by feature boundaries, not by arbitrary line counts.

## 4) Asset Safety Rules
- Never overwrite source assets in `quiz_plate` directly.
- Generate normalized assets into a separate derived folder.
- Keep metadata in JSON profile files; avoid hardcoding per-sprite magic values.
- If asset pipeline changes, record backup path and script path in status doc.

## 5) Validation Rules (Every Phase)
- Run syntax check: `node --check public/jumpmap-editor/editor.js` (or equivalent module entry files).
- Manual smoke test:
  - place object
  - select object/hitbox/player separately
  - crop object and player
  - move/resize hitbox
  - save and load map
  - run test mode and basic jump/move
- If any check fails, do not continue to next phase.

## 6) Known Risk Areas
- Pointer state collisions (`dragState`, `hitboxDrag`, `cropDrag`, `playerHitboxDrag`, `objectTransform`).
- Full rerender during drag causing flicker/perf issues.
- Test runtime and editor render mismatch for crop/transform.
- Load-time schema safety (missing/invalid fields).

## 7) Completion Criteria
- Modularized structure with clear ownership:
  - geometry/collision utilities
  - map serialization and validation
  - editor render and selection
  - test runtime
- Preset-first workflow:
  - sprite normalized crop profile
  - saved hitbox presets
  - one-click placement from confirmed palette
- Docs synchronized:
  - plan reflects actual architecture
  - status reflects exact progress and remaining tasks
