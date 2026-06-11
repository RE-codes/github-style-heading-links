# PRD: Automated E2E Gesture/Mode Parity Testing

Status: Draft — scope and decisions settled, ready for Phase 0
Owner: RE-codes
Date: 2026-06-10
Related: [`plan/QA-log.md`](./QA-log.md), [`plan/observed-behavior-matrix.md`](./observed-behavior-matrix.md), [`plan/native-event-investigation.md`](./native-event-investigation.md)

---

## 1. Problem Statement

Behavioral parity between native Obsidian and this plugin is currently verified by hand. Every issue exercises a matrix of **mode/surface × gesture × link-type × container** (roughly 4 × 3 × 15 × 5) and is recorded manually in `QA-log.md` and `observed-behavior-matrix.md`. This is:

- **Slow**: each new link-type or heading-style issue re-runs dozens of manual rows.
- **Non-regressing**: nothing re-runs the old rows when code or Obsidian changes. Obsidian updates can silently shift native behavior, which is the plugin's parity target.
- **Platform-fragmented**: rows are split across Windows and macOS runs; middle-click coverage is inconsistent because macOS has no hardware middle button.

The existing Vitest suite (~100 tests) covers pure functions and handler branching with `happy-dom` **synthetic, untrusted** events. It cannot exercise real event ordering against Obsidian's own handlers, real navigation/scroll, mode switching, or native parity — exactly the surface the manual matrix covers.

## 2. Goals

- **G1** — Convert the bulk of the manual gesture/mode/link-type matrix into automated tests that run in CI against a real, sandboxed Obsidian.
- **G2** — Test against **multiple Obsidian versions** (earliest supported + latest) to catch native-behavior drift.
- **G3** — Encode native parity as a first-class, machine-checkable assertion for the "must-not-intercept / must-match-native" rows.
- **G4** — Make the matrix **data-driven**: adding a link-type or heading-style is a new data row, not new bespoke test code.
- **G5** — Keep fast handler-logic tests (Vitest) as a separate, complementary layer; do not regress them.

## 3. Non-Goals

- **NG1** — Not replacing the Vitest unit/handler layer; E2E sits on top.
- **NG2** — Not automating subjective/timing-sensitive observations in v1: middle-click highlight *latency*, the new-tab *flicker*, and hover-preview *visual* quality remain manual (see §11).
- **NG3** — Not testing mobile. The plugin is `isDesktopOnly: true`; drop `emulateMobile` from the sample config.
- **NG4** — Not pixel/screenshot diffing in v1. Assertions are on DOM and Obsidian `app` state, not rendered pixels.

## 4. Success Metrics

- All P1 + P2a rows currently marked GREEN in `observed-behavior-matrix.md` that are *not* in the §11 manual-only carve-out have an automated test.
- The suite runs green in CI on the earliest and latest Obsidian configs on Linux, and locally on macOS.
- A deliberately introduced parity regression (e.g. making the plugin intercept an external `https://` link) fails the suite.
- Adding a new heading-style row requires only: a fixture heading/link + one data-table entry.

## 5. Chosen Approach

**WebdriverIO + [`wdio-obsidian-service`](https://github.com/jesse-r-s-hines/wdio-obsidian-service)** (v3.x), with Mocha as the runner. It is the purpose-built, actively maintained option for Obsidian plugins (vs. hand-rolling Playwright + `_electron`): it handles sandboxed multi-version Obsidian downloads, vault management, and CI out of the box. Key enablers, all confirmed against the service's sample plugin and docs:

- `browser.executeObsidian(({app, obsidian}) => …)` — runs code in the renderer with the live `app` object and the `obsidian` module. Used for setup (open file, switch mode, toggle plugin) and assertions (active file, cursor, leaf count, ephemeral state).
- `browser.executeObsidianCommand(id)` — execute Obsidian commands by id.
- `obsidianPage.resetVault(path)` — fast per-test reset of the open vault's files without rebooting Obsidian (for `beforeEach`); `browser.reloadObsidian({vault})` — full reboot when a clean Obsidian state is needed.
- `obsidianPage.loadWorkspaceLayout(name)` — restore a saved pane/mode layout from the vault's `.obsidian/workspaces.json`.
- Capabilities `plugins: ["."]` installs and enables the plugin under test; multi-version via `parseObsidianVersions(OBSIDIAN_VERSIONS)`. Sandboxed downloads, CI workflow templates included.
- **Gestures** via WebdriverIO's W3C Actions API (`browser.action('pointer')` with `button: 0|1|2`, combined with `browser.action('key')` for Ctrl/Meta). These dispatch **trusted** input through Chromium/CDP, so `isTrusted === true`, default actions fire, and the full native event sequence runs alongside the plugin's capture-phase listeners. This is the capability `happy-dom` lacks.

### 5.1 Mode control (confirmed mechanism)

Obsidian view state shape (confirmed from a saved `workspaces.json` layout):

```jsonc
{ "type": "markdown", "state": { "file": "...", "mode": "...", "source": <bool> } }
```

| Target mode/surface        | `mode`      | `source` |
|----------------------------|-------------|----------|
| Reading                    | `"preview"` | n/a      |
| Live Preview (rendered)    | `"source"`  | `false`  |
| Source mode (raw)          | `"source"`  | `true`   |

Set per-test via `executeObsidian`. A single `setViewState` both opens the file and sets the mode, so no separate `openFile` is needed:

```ts
await browser.executeObsidian(async ({app}, file, mode, source) => {
  const leaf = app.workspace.getLeaf(false);
  await leaf.setViewState({ type: "markdown", active: true, state: { file, mode, source } });
}, fixturePath, mode, source);
```

"Live Preview rendered vs unrendered link" is **not** a mode — it is whether the caret is on the link's source line. In Live Preview, place the caret away from the link (rendered) or on the link's line (unrendered/source-text) via `editor.setCursor(...)` before the gesture. This is verified in the Phase 0 spike (§9).

### 5.2 Plugin on/off for parity

```ts
await browser.executeObsidian(({app}, id) => app.plugins.disablePlugin(id), PLUGIN_ID);
// …run gesture, snapshot…
await browser.executeObsidian(({app}, id) => app.plugins.enablePlugin(id), PLUGIN_ID);
```

`enablePlugin`/`disablePlugin` are stable internal APIs widely used by the ecosystem. The Phase 0 spike confirms the editor extension and reading post-processor are cleanly torn down and re-added on toggle (they are registered via `registerEditorExtension` / `registerMarkdownPostProcessor`, so they should be), and that re-enabling reattaches to already-open editors.

Toggling the plugin per parity row is not free — each disable/enable rebuilds editor extensions. If this proves slow at matrix scale, capture the plugin-off (native) snapshot once per `{surface, gesture, fixture}` and reuse it across the parity rows that share it, rather than toggling inside every row.

### 5.3 Vault source & safety

The e2e vault is **committed in the repo** at `test/vaults/parity/`: the fixture notes plus a minimal `.obsidian/` config that enables *only* the plugin under test (no other community plugins/themes, so nothing perturbs event handling). This is the single source of truth for both the harness and CI.

- **Why committed, not the dev vault:** CI-portable with zero external dependency, reproducible from a clean clone, reviewable in PR diffs, deterministic config, and immune to incidental edits in the working environment. The dev vault stays a manual `cp` away for hands-on tinkering and is *not* wired into the harness.
- **Fixture consolidation:** the canonical fixture notes currently in `src/__tests__/fixtures/` are **relocated** (`git mv`) to `test/vaults/parity/` — a single physical copy, no `pretest` step, no drift. Nothing in the codebase reads them (Vitest globs only `src/**/*.test.ts`), so the move is safe; `src/__tests__/` is then empty and removed. Manual QA stays a trivial `cp` from `test/vaults/parity/` into the dev vault, so nothing is lost there. Update the `AGENTS.md` sync note accordingly.
- **Run safety:** the service launches with `copy: obsidianOptions.copy ?? true` ([`service.ts`](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/main/packages/wdio-obsidian-service/src/service.ts)), so Obsidian opens a per-session tmpdir copy and `resetVault` resets *that copy* — the committed `test/vaults/parity/` is never mutated by a run. Keep the default `copy: true` (the docs flag `copy: false` as unsafe); the harness sets it explicitly.

## 6. Two Assertion Kinds (critical design point)

The matrix has two fundamentally different assertion semantics. The harness must support both explicitly. In both, the snapshot (§7) includes **highlight state**, because near-perfect highlight parity is a required goal (§13), not a nice-to-have.

- **Parity rows** — plugin must *match native*. Link types: external schemes, wikilinks/embeds, tags, file-only links, missing files, and native `#Heading` fragments. **Method:** run the identical gesture twice (plugin off, then on), snapshot the outcome each time, assert `snapshot(on)` deep-equals `snapshot(off)`.
- **Divergence rows** — plugin must *intentionally do what native cannot*: resolve GFM slug fragments (`#target-heading`, `#api-v2`, `#old-new`, …). Native would do nothing or misnavigate. **Method:** assert `snapshot(on)` deep-equals a fixed `expectedOutcome` in the data table. Optionally also assert `snapshot(off)` differs from it, to prove the plugin is the reason it works.
  - **Highlight nuance:** for non-duplicate targets the plugin navigates via `openLinkText("<path>#<heading>")`, so Obsidian itself produces the heading+children highlight — parity is essentially native-delegated and should match exactly. The sole exception is **duplicate headings** (`#foo-1`, `#foo-2`): no native path disambiguates them, so the plugin uses a line fallback that highlights the heading only. These rows assert the *current MVP reality* and are tracked as a known divergence (§7, §9 Phase 4b, §11).

## 7. Outcome Snapshot Model

After a gesture, `executeObsidian` captures a normalized snapshot from the **active** view (a new-tab gesture makes the opened tab active, so the snapshot reflects the navigation target). The fields below together form the `Snapshot` type referenced in §8. Delivery is sequenced so the harness lands quickly, but **highlight is a required field, not a stretch** — the parity claim depends on it (§13).

**Core (land first — deterministic):**
- `activeFilePath` — `getActiveViewOfType(MarkdownView)?.file?.path`
- `markdownLeafCount` — `app.workspace.getLeavesOfType("markdown").length` (detects new-tab gestures)
- `mode` / `source` of the active view
- `cursorLine` / `cursorCh` — `editor.getCursor()` (detects "place cursor only" vs navigation)
- `scrolledHeading` — the heading nearest the top of the viewport, derived from `editor.getScrollInfo()`/`MarkdownView` scroll + the metadata cache, or `getEphemeralState()` where populated

**Highlight (required — needs a detection spike):**
- `highlightedHeading` — which heading received Obsidian's transient highlight.
- `highlightSpan` — whether the highlight covers the heading only or the heading **plus its children** (the section up to the next heading of equal/higher level).
- *Detection:* reverse-engineer Obsidian's flash/decoration DOM — the transient highlight class applied in Reading mode and the CM6 decoration range in editor modes. This is genuinely fiddly and mode-specific, so it gets its own spike, but the underlying *behavior* is mostly native-delegated (§6), so the risk is in **detecting** the highlight, not in the plugin producing it.
- *Known divergence:* the duplicate-heading line-fallback highlights heading-only. Those rows assert `highlightSpan: "heading-only"` today and carry a `knownDivergence` flag so the test flips to `"with-children"` automatically if/when the fallback is solved (§9 Phase 4).

Snapshots are compared structurally. The core fields gate "row covered"; highlight fields are populated as soon as the detection spike lands and then become part of parity/expected comparison for every applicable row.

## 8. Test Data Model

The matrix becomes data, not code. One generator expands rows into Mocha `it()`s.

```ts
type Surface = "reading" | "live-rendered" | "live-source" | "source";
type Gesture = "click" | "mod-click" | "middle-click";

interface MatrixRow {
  id: string;                 // stable test id
  fixture: string;            // e.g. "test-gfm.md"
  linkText: string;           // anchor/link text to locate, e.g. "same top"
  surfaces: Surface[];
  gestures: Gesture[];
  assertion:
    | { kind: "parity" }                       // compare on vs off
    | { kind: "expected"; outcome: Partial<Snapshot> }; // fixed expectation
  highlight?: "checked" | "skip";   // default "checked" once detection lands; "skip" for rows with no highlight
  knownDivergence?: {               // currently-accepted gap (e.g. duplicate-heading children highlight)
    field: keyof Snapshot; mvp: unknown; ideal: unknown; reason: string;
  };
  skip?: { surface?: Surface; gesture?: Gesture; reason: string }[]; // manual-only carve-outs
}
```

Locating the link: in rendered surfaces, query the rendered anchor by text/`data-href`; in source/unrendered surfaces, locate the source token by line. A `findLink(surface, linkText)` helper abstracts this. Gestures go through `performGesture(el, gesture)` which wraps the Actions API (left/middle button, Ctrl on Linux/Win, Meta on macOS — chosen from `process.platform`).

Initial data seeds from the relocated fixtures (now under `test/vaults/parity/`, see §5.3): `test-gfm.md` (GFM/divergence rows + parity rows), `test-native.md` (native-fragment parity), `duplicates.md`, `callout.md`, `table.md`, `wikilinks.md`, `encoded path with spaces.md`, and `Other.md`. (Until the Phase 1 move lands, these live at [`src/__tests__/fixtures/`](../src/__tests__/fixtures/).)

## 9. Phased Implementation Plan

Each phase has explicit acceptance criteria. Follow the project's TDD rule: for harness helpers, write a failing assertion first; for matrix rows, the fixture's known-GREEN manual result is the expected outcome, so a row that can't reproduce it is a real RED.

**Phase 0 — Spike / feasibility (timeboxed, ~1 day).** Prove the four load-bearing unknowns before committing to the full harness:
1. Drive Reading / Live Preview / Source via `setViewState` and read back the mode.
2. Fire a **trusted** middle-click and Ctrl/Cmd-click via the Actions API and observe the plugin's handlers run (e.g. a new tab opens).
3. Toggle the plugin off/on at runtime and confirm the editor extension + reading post-processor detach/re-attach.
4. Distinguish Live Preview rendered vs unrendered by caret position.
   - *Exit criterion:* one throwaway spec demonstrates all four. If any fails, revisit before Phase 1.

**Phase 1 — Harness foundation.** `wdio.conf.mts` (desktop only, `earliest/earliest latest/latest`, no mobile); build the committed vault by `git mv src/__tests__/fixtures → test/vaults/parity/` (then remove the now-empty `src/__tests__/`) and add a minimal `.obsidian/` enabling only the plugin; core helpers: `openInMode`, `findLink`, `performGesture`, `snapshot` (core fields), `resetWorkspace`, `withPluginDisabled`. Tests for the helpers themselves where practical.
   - *Acceptance:* `npm run test:e2e` launches Obsidian, opens a fixture, and one hand-written smoke test (Reading-mode plain click on `#target-heading` navigates + scrolls) passes on both Obsidian versions.

**Phase 2 — Data-driven generator + P1 core rows.** The `MatrixRow` model + expander. Port P1 rows: same-file GFM fragment, cross-file, file-only, missing file/heading, empty fragment, external schemes, wikilinks/tags, encoded path — across all four surfaces and three gestures, using parity vs expected per §6. Core snapshot fields only; highlight assertions arrive in Phase 4.
   - *Acceptance:* P1 rows green on both versions; flipping the plugin to intercept `https://` (temporary local edit) turns a parity row red.

**Phase 3 — P2a heading-style + container rows.** Bracketed, escaped-punctuation, setext, parenthesized, strikethrough, bold/italic/code headings; callout and table containers. Add list/task-list/blockquote fixtures (currently `Unknown` in the matrix) as new data rows.
   - *Acceptance:* all P2a heading-target rows automated; new container rows either GREEN or filed as genuine plugin gaps.

**Phase 4 — Highlight detection + parity (required).** Build the highlight-detection spike from §7 into `snapshot`: `highlightedHeading` and `highlightSpan` (heading-only vs with-children) across all four surfaces. Apply to every applicable parity/expected row.
   - *Acceptance:* highlight fields reliably populated and asserted on all four surfaces; non-duplicate rows show with-children parity; duplicate-heading rows assert the heading-only MVP reality via `knownDivergence`.

**Phase 4b — Duplicate-heading children-highlight investigation.** A plugin-behavior workstream (not harness work) that can run in parallel any time after Phase 2; the harness only *verifies* its outcome. Investigate whether children-highlight is achievable for duplicate GFM targets where native offers no path — e.g. compute the heading's block range from the metadata cache and apply Obsidian's own section highlight, or find an API to highlight a range. This is the one accepted MVP limitation the project wants closed before the marketplace release if possible. Outcome: either a fix (flip the `knownDivergence` rows to `with-children`) or a documented, tested limitation.
   - *Acceptance:* a written finding (feasible + approach, or infeasible + why); if feasible, an issue/plan to implement.

**Phase 5 — CI + maintenance.** Adapt the sample's GitHub Actions: Linux job on `earliest/earliest latest/latest`, version-cache key, optional scheduled "new Obsidian version" check. CI runs `npm run test` (unit) and `npm run test:e2e` as separate steps.
   - *Acceptance:* CI green on PR; a forced parity regression fails the PR check.

## 10. CI Integration

- Scripts in `package.json`: keep `test` as-is (`vitest run`, unit only — the fast inner loop) and add `test:e2e` (`wdio run ./wdio.conf.mts`). Splitting into an explicit `test:unit` and a combined `test` that runs both is deferred to later. Per project rules, all invocation goes through `npm run …`.
- Linux runner (headless via the service's xvfb handling) on the earliest and latest configs (`earliest/earliest latest/latest`). macOS used locally for Cmd-click and Reading/LP/Source spot checks.
- Version matrix cache keyed on resolved Obsidian versions (sample's pattern).
- E2E is slower than unit; keep it a separate job/script so the Vitest layer stays the fast inner loop.

## 11. Out of Scope / Remains Manual (v1)

Explicitly carved out via `skip` entries with reasons, so the matrix stays honest. Note what is *not* here: highlight parity (incl. heading+children) is **in scope** (§7, Phase 4), and the duplicate-heading children-highlight gap is **tracked and asserted** via `knownDivergence` + investigated in Phase 4b — it is not a manual carve-out.

- **Middle-click highlight latency** and **new-tab flicker** (the standing follow-ups): timing/visual, flaky to assert. Manual.
- **Hover preview** visual correctness: manual; may add a coarse "popover exists" check later.
- **Context menu** "Open in new tab / to the right": automatable (right-click → assert/activate menu item) but deferred to post-v1; it is a known public blocker, not MVP.
- **macOS hardware middle-click**: synthetic middle-click is exercised on Linux/Win; the matrix already maps macOS middle→Cmd-click.
- **Split panes** (P3): deferred with the rest of public-release readiness.

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Actions API doesn't reproduce the exact native event sequence the plugin depends on | High — invalidates approach | Phase 0 spike #2 proves trusted middle/Ctrl-click drives handlers before building on it |
| Live Preview rendered-vs-unrendered not controllable via caret alone | Medium — loses a surface | Spike #4; fall back to saved `workspaces.json` layouts via `loadWorkspaceLayout` |
| Obsidian internal APIs (`setViewState` shape, `plugins.enable/disable`) change across versions | Medium | The earliest-and-latest matrix surfaces drift early; isolate all internals in helpers, not test rows |
| Highlight DOM detection is brittle/mode-specific | Medium | Dedicated Phase 4 spike; land core snapshot fields first so the harness is useful before highlight detection is solved; isolate detection in one helper |
| Duplicate-heading children-highlight has no native path | Medium (marketplace gate) | Assert current MVP reality via `knownDivergence`; Phase 4b investigation decides fix vs documented limitation |
| E2E flakiness/slowness erodes trust | Medium | `resetVault` over `reloadObsidian` where possible; WDIO `waitUntil`; retries only as a last resort with logging |
| Parity "deepEquals" too strict (incidental state differs) | Low/Medium | Snapshot is a curated normalized subset, not raw app state; expand fields deliberately |

## 13. Resolved Decisions

1. **Version matrix breadth** — Adopt the maintainer's community-standard convention: test the **floor and ceiling only**, `earliest/earliest latest/latest` (+ `latest-beta/latest` when beta creds are available). `earliest` resolves to `manifest.json` `minAppVersion` (1.11.0); the `appVersion/installerVersion` pairing brackets both the plugin-API surface and the Electron/Chromium runtime. No per-year version sprawl.
2. **Highlight fidelity** — Highlight parity (incl. heading+children) is a **required goal**, not deferred. Core snapshot fields land first for fast feedback; highlight detection follows in Phase 4 and applies to all rows. Duplicate-heading children-highlight is the **single accepted exception**, asserted as the MVP reality via `knownDivergence` and investigated in Phase 4b with the aim of closing it before marketplace.
3. **CI gating** — Non-blocking through Phase 2; gate merges from Phase 3 onward.
4. **Vault source of truth** — A committed `test/vaults/parity/`, built by **relocating** (`git mv`) the canonical fixtures out of `src/__tests__/fixtures/` (single physical copy, no `pretest` step) and adding a minimal plugin-only `.obsidian/`. The dev vault is a manual `cp` for tinkering, not wired into the harness. See §5.3.

### Remaining sub-decisions
- Confirm the Live Preview rendered-vs-unrendered control method in the Phase 0 spike (caret position vs saved layout).

## 14. Appendix — Representative test sketch

Each gesture runs from a clean workspace so prior runs don't pollute `markdownLeafCount` or the active view, and the link element is re-located *after* each render (the earlier handle is stale once the view is rebuilt).

```ts
// test/specs/matrix.e2e.ts (generated shape)

// Run one gesture from a clean, single-leaf state and return the outcome snapshot.
async function runFromClean(row: MatrixRow, surface: Surface, gesture: Gesture): Promise<Snapshot> {
  await resetWorkspace();                  // detach extra leaves → one active markdown leaf
  await openInMode(row.fixture, surface);  // setViewState (+ caret for live-source)
  const el = await findLink(surface, row.linkText); // located after the view renders
  await performGesture(el, gesture);
  return snapshot();                        // reads the now-active view
}

for (const row of MATRIX) {
  for (const surface of row.surfaces) {
    for (const gesture of activeGestures(row, surface)) { // honors row.skip
      it(`${row.id} — ${surface} — ${gesture}`, async () => {
        await obsidianPage.resetVault(VAULT); // restore fixture files before each test

        if (row.assertion.kind === "parity") {
          const native = await withPluginDisabled(() => runFromClean(row, surface, gesture));
          const plugin = await runFromClean(row, surface, gesture);
          // applyKnownDivergence overlays any accepted MVP gap (e.g. duplicate-heading
          // heading-only highlight) so a tracked divergence does not fail the parity check.
          expect(plugin).toEqual(applyKnownDivergence(row, native));
        } else {
          const plugin = await runFromClean(row, surface, gesture);
          expect(plugin).toMatchObject(row.assertion.outcome);
        }
      });
    }
  }
}
```
