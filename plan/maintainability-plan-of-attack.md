# Maintainability Plan Of Attack

Date: 2026-04-28

## Goal

Finish the MVP without letting editor-mode complexity keep growing unchecked. The plan is to preserve current behavior, close the remaining QA gaps, then refactor the editor adapter behind characterization tests.

This is not a rewrite plan. It is a stabilization and separation-of-concerns plan.

## Release Target

Near-term target:

- Personal-use MVP.

Stretch target:

- Obsidian Community plugin candidate.

Personal-use nice-to-haves that are public/community release blockers:

- Hover previews for GFM fragment links.
- Context-menu "Open in new tab" and "Open to the right" behavior.
- Press-vs-release parity with native Obsidian behavior.
- Middle-click delay and visual flash polish.
- Replacing or isolating deprecated `workspace.activeLeaf` usage in editor gesture handling.
- A solution, or clearly documented limitation, for duplicate-heading child highlighting.
- Split-pane source-path correctness.
- Full legal Markdown link parsing in Source mode. P2b common inline-link forms are MVP scope after `linkExtraction.ts` is extracted.

Mobile status:

- Not part of the personal MVP. The manifest should be narrowed to `isDesktopOnly: true` before MVP completion. Mobile can be reopened later as a public/community release decision if there is real demand.

Coverage priority:

- MVP scope is the remaining `plan/gfm-fragment-links-plan.md` work plus P1, P2a, and P2b rows in `plan/observed-behavior-matrix.md`.
- P1, P2a, and P2b rows in `plan/observed-behavior-matrix.md` are MVP scope.
- P2a covers fixture, slug, and container verification that can be closed before the refactor.
- P2b covers source-mode legal inline-link parser work and should land after `linkExtraction.ts` is extracted.
- P3 and P4 rows are public-release readiness scope.

Sequencing:

1. Finish the original MVP plan gaps and P1/P2a coverage.
2. Run the native event investigation as pre-refactor discovery.
3. Extract `linkExtraction.ts`.
4. Implement P2b parser behavior against the extracted link-extraction boundary.
5. Reorganize/refactor the rest of the editor adapter.
6. Reevaluate and implement P3/P4 public-release readiness work.
7. Prepare the public/community release candidate.

## Recommendation

Proceed with the MVP, but add one architecture-hardening step before declaring it complete:

1. Close the currently open original-plan and P1 QA rows.
2. Add and verify P1/P2a fixture coverage from `plan/observed-behavior-matrix.md`.
3. Run the native event investigation in `plan/native-event-investigation.md`.
4. Add sequence-level tests for editor gestures.
5. Extract `src/editor/linkExtraction.ts`.
6. Implement P2b parser behavior in the extracted link-extraction module.
7. Split the remaining `src/editorModeHandler.ts` concerns around gesture state, mode policy, workspace context, and retargeting.
8. Re-run unit tests, type check, and focused manual QA after each extraction.
9. Defer P3/P4 items, including hover preview, context-menu support, split panes, mobile, and full legal Markdown parsing, until public-release readiness.

The lighter path is to close the remaining existing QA rows before refactoring. Then fill the P1/P2a gaps from the observed behavior matrix. Refactoring first would move code before the current behavior surface is fully classified.

The investigation is an exception to "close QA before refactor": it should happen before the overhaul because it is read-only instrumentation intended to reveal native behavior, not product behavior.

P2b parser work is the other exception. It should not be implemented inside the current monolith. Extract `linkExtraction.ts` first, then add parser behavior and parser tests against that pure boundary.

Do not impose a hard architecture freeze after MVP. The intent is to make feature work safer by reorganizing the editor adapter, while still allowing focused feature-completeness cycles.

During the editor overhaul, handle `workspace.activeLeaf` deliberately. The installed Obsidian typings mark direct use of that field as deprecated/discouraged. Current usage should either be replaced with supported APIs or isolated behind a small workspace-context helper with a comment explaining why the fallback is necessary.

Keep a single CodeMirror extension during the overhaul. Source mode and Live Preview share the same editor event stream, and splitting them into separate extensions would make listener ordering and suppression state harder to reason about. Instead, split the internals by link surface and mode policy:

- Rendered link behavior for anchors and `data-href` elements.
- Source-text behavior for unrendered Markdown links.
- Mode policy for differences between Source mode and Live Preview source text.

The policy layer is necessary because Live Preview unrendered Ctrl-click opens a new tab, while Source mode Ctrl-click navigates in the same tab.

The public docs and installed typings do not expose Obsidian's internal native link-click implementation. They do expose likely better integration points: `editorInfoField`, `editorLivePreviewField`, `editorEditorField`, `workspace.activeEditor`, `openLinkText`, and CodeMirror event handlers. The refactor should be guided by measured native event traces rather than more inference from regressions.

Use `plan/observed-behavior-matrix.md` as the consolidated behavior reference. Use `plan/native-event-investigation.md` to fill the lower-level event/API details that the behavior matrix cannot prove.

## Phase 0: Scope Control

Behavior being protected:

- GFM fragment links navigate in Reading mode, Live Preview, and Source mode.
- Native wikilinks, tags, and external links remain native.
- Ctrl/Cmd-click and middle-click match native behavior as closely as MVP requires.
- Duplicate GFM slug suffixes land on the correct heading.

Avoid broad new feature behavior during this phase unless it is needed to close an existing QA row. Focused feature-completeness work remains acceptable when covered by a narrow test and QA row.

Smallest safe change:

- Documentation/spec only. Update the QA matrix with release-blocker status for each known follow-up.

Validation:

- No code validation needed if this is docs-only.

## Phase 1: Close Current P1 QA Rows

Files likely touched:

- `plan/QA-log.md`
- Possibly tests in `src/readingModeHandler.test.ts`
- Possibly tests in `src/editorModeHandler.test.ts`
- Runtime code only if a QA row fails

Work items:

1. ~~Verify `[empty fragment](empty-fragment.md#)` in all relevant modes.~~
2. ~~Verify external scheme rows in `test-gfm.md` and `test-native.md` in all relevant modes.~~
3. Verify wikilinks and embeds in `wikilinks.md` in all relevant modes.
4. Mark each row GREEN or document the exact failure.
5. If a row fails, add the narrowest unit test before changing runtime code.

Validation:

- `npm test`
- Manual QA rows just touched

Decision point:

- If these rows pass, the MVP is closer than the size of `createEditorExtension()` makes it feel.
- If they fail because of editor event ordering, handle that before refactoring.

## Phase 2: Add P1/P2a Fixture Coverage

Behavior being protected:

- MVP behavior listed as P1 and P2a in `plan/observed-behavior-matrix.md`.

Files likely touched:

- `plan/QA-log.md`
- `src/__tests__/fixtures/*`
- `src/slug.test.ts`
- `src/linkParser.test.ts`
- `src/editorModeHandler.test.ts`
- Runtime files only when a new failing test or manual QA row requires it.

Work items:

1. Add fixture rows for P1 gaps: file-only links, missing files, existing file with missing heading, ~~empty fragments~~, ~~external schemes~~, wikilinks, and embeds.
   - Wikilink/embed target files now exist for manual QA: `Wikilink Target.md` and `Embedded Note.md`.
2. Add fixture rows and slug tests for P2a heading targets: closing hashes, setext headings, square brackets, parentheses, escaped punctuation, links, images, HTML/entities, strikethrough, non-ASCII text, and emoji.
3. Add fixture rows for P2a containers: lists, task lists, and blockquotes.
4. Add placeholder fixture rows for P2b source parser cases, but do not implement parser behavior in the monolith.
5. Mark each P1/P2a row in `plan/observed-behavior-matrix.md` as GREEN, explicitly MVP accepted, or explicitly deferred with rationale.

Validation:

- Narrowest relevant test after each code change.
- Manual QA for each new fixture row.
- `npm test` after each completed behavior group.

Decision point:

- If a P2a row unexpectedly requires parser work, reclassify it as P2b and handle it after `linkExtraction.ts` extraction. Do not silently leave it as Unknown.

## Phase 3: Run Native Event Investigation

Behavior being protected:

- Native event-order facts observed during the investigation and current plugin behavior that must remain compatible with those facts.

Files likely touched:

- `plan/native-event-investigation.md`
- `plan/QA-log.md`
- `src/editorModeHandler.test.ts`
- Optionally a new `src/editorGesture.test-support.ts`

Smallest safe change:

- Run the event tracing procedure before adding new characterization tests. Translate each confirmed event sequence into one focused test.

Validation:

- Investigation log updated with observed native sequences.
- Characterization test cases identified for Phase 4.

Why before refactor:

- Current regressions suggest some behavior has been patched symptom by symptom. The project needs measured event order before deciding where pointerdown, mousedown, mouseup, click, auxclick, hover, and context-menu behavior belongs.

## Phase 4: Add Gesture Characterization Tests

Behavior being protected:

- The current event sequence behavior of `src/editorModeHandler.ts`.

Files likely touched:

- `src/editorModeHandler.test.ts`
- Optionally a new `src/editorGesture.test-support.ts`

Smallest safe change:

- Add test support that can invoke the exported handler helpers in realistic event order and record navigation/suppression effects. Use the Phase 3 investigation results to choose which sequences matter.

Recommended sequence tests:

1. Rendered left-click:
   `pointerdown -> mousedown -> pointerup -> mouseup -> click`

2. Rendered Ctrl/Cmd-click:
   `pointerdown(ctrl) -> mousedown(ctrl) -> pointerup(ctrl) -> mouseup(ctrl) -> click(ctrl)`

3. Rendered middle-click:
   `mousedown(button=1) -> mouseup(button=1) -> auxclick(button=1)`

4. Source Ctrl/Cmd-click:
   `mousedown(ctrl)` on source text

5. Source middle-click:
   `mousedown(button=1) -> active-leaf-change -> file-open -> mouseup(button=1) -> auxclick(button=1)`

6. Drag off rendered link:
   `pointerdown` on link, `pointerup` away from link

Validation:

- `npm test`

Why before refactor:

- These tests make the implicit state machine visible. Without them, extraction work can preserve helper outputs while changing real gesture behavior.

## Phase 5: Extract Editor Target Detection

Behavior being changed:

- No behavior change intended. This is a pure extraction.

Files likely touched:

- New `src/editor/linkExtraction.ts`
- New `src/editor/linkExtraction.test.ts` or moved tests from `src/editorModeHandler.test.ts`
- `src/editorModeHandler.ts`

Move or introduce:

- rendered link lookup: `target.closest("a, [data-href]")`
- `decideAction()` usage for rendered elements
- source href extraction from `EditorView.posAtDOM()`
- `extractMarkdownLinkHrefAtOffset()`
- Live Preview rendered-source marker check, currently `.cm-underline`

Target API:

```ts
type EditorLinkTarget =
  | { kind: "none" }
  | { kind: "rendered"; element: Element; href: string }
  | { kind: "source"; href: string };
```

Validation:

- Narrow extraction tests
- `npm test`

Why this is the smallest safe extraction:

- It separates "what link was clicked" from "what should this event do." That reduces repeated DOM/source detection across event handlers.

## Phase 6: Implement P2b Source Parser

Behavior being changed:

- Source-mode link detection should handle common legal inline Markdown forms listed as P2b in `plan/observed-behavior-matrix.md`.

Files likely touched:

- `src/editor/linkExtraction.ts`
- `src/editor/linkExtraction.test.ts`
- Possibly `src/linkParser.ts` if URL splitting or decoding needs a narrow pure helper.

Work items:

1. Choose the smallest parser strategy that covers P2b inline links without committing to full public-release Markdown parsing.
2. Add RED tests for titles, angle-bracket destinations, balanced and escaped parentheses, percent-encoded `#` in filenames, percent-encoded fragments, escaped bracket link text, and matched nested bracket link text.
3. Implement parser behavior at the link-extraction boundary.
4. Confirm existing source-mode behavior and non-interception cases still pass.

Validation:

- `npm test -- src/editor/linkExtraction.test.ts`
- `npm test`

Decision point:

- If the small parser strategy starts turning into full CommonMark parsing, stop and choose a real parser or explicitly defer the problematic P2b row with rationale. Do not let this phase recreate the `editorModeHandler.ts` complexity problem in a new file.

## Phase 7: Extract Mode Policy

Behavior being changed:

- No behavior change intended. This makes existing Source mode versus Live Preview differences explicit.

Files likely touched:

- New `src/editor/modePolicy.ts`
- New `src/editor/modePolicy.test.ts`
- `src/editorModeHandler.ts`

Represent policy explicitly:

```ts
type EditorMode = "source" | "live-preview";
type LinkSurface = "rendered" | "source-text";
type Gesture = "plain-click" | "ctrl-click" | "middle-click";

type GesturePolicy = {
  shouldNavigate: boolean;
  newLeaf: boolean;
  eventPhase: "pointerdown" | "mousedown" | "pointerup" | "mouseup" | "native-retarget";
};
```

Initial policy facts to capture:

- Source mode source-text plain click places the cursor only.
- Source mode source-text Ctrl/Cmd-click navigates in the same tab.
- Source mode source-text middle-click opens a new tab through native retargeting.
- Live Preview source-text plain click places the cursor unless the clicked source text is represented as rendered link text.
- Live Preview source-text Ctrl/Cmd-click opens a new tab.
- Live Preview source-text middle-click opens a new tab through native retargeting.
- Live Preview rendered links can navigate on ordinary clicks.

Validation:

- Policy unit tests for each known mode/surface/gesture permutation.
- Existing editor tests.
- `npm test`

Why this matters:

- It removes inline expressions such as `isLivePreview && (event.ctrlKey || event.metaKey)` from event handlers and makes native-parity decisions reviewable.

## Phase 8: Extract Gesture State And Commands

Behavior being changed:

- No behavior change intended. This is the main maintainability extraction.

Files likely touched:

- New `src/editor/gestureState.ts`
- New `src/editor/gestureState.test.ts`
- `src/editorModeHandler.ts`

Represent the state explicitly:

```ts
type PendingGesture =
  | { kind: "none" }
  | { kind: "rendered-left"; previousLeaf: WorkspaceLeaf | null; target: ResolvedTarget }
  | { kind: "middle"; previousLeaf: WorkspaceLeaf | null; target: ResolvedTarget };

type EditorCommand =
  | { kind: "ignore" }
  | { kind: "suppress" }
  | { kind: "navigate"; target: ResolvedTarget; newLeaf: boolean; options?: NavigateOptions }
  | { kind: "retarget-native-middle-click"; previousLeaf: WorkspaceLeaf | null; target: ResolvedTarget };
```

Replace independent booleans with named state:

- `handledRenderedPointerDown`
- `suppressNextRenderedClick`
- `suppressNextRenderedAuxClick`

These should become part of one gesture state object or an explicit suppression state object.

Validation:

- Gesture-state tests
- Existing editor tests
- `npm test`

Why this matters:

- Future event-order fixes should edit a transition table or command-producing function, not scatter changes across six listener methods.

## Phase 9: Extract Middle-Click Retargeting

Behavior being changed:

- No behavior change intended unless Phase 1 found a middle-click blocker. This phase should also remove or isolate direct `workspace.activeLeaf` usage.

Files likely touched:

- New `src/editor/middleClickRetarget.ts`
- New `src/editor/middleClickRetarget.test.ts`
- New `src/editor/workspaceContext.ts`
- New `src/editor/workspaceContext.test.ts`
- `src/editorModeHandler.ts`

Move:

- `retargetNativeMiddleClickTab()`
- `waitForNativeMiddleClickOpen()`
- `waitForActiveLeafChange()`
- `waitForFileOpen()`
- timeout constants

Replace or isolate:

- Current `app.workspace.activeLeaf` snapshots used as `previousLeaf`.
- Prefer supported APIs such as `getActiveViewOfType(...)`, `getLeaf(...)`, or `getMostRecentLeaf(...)` if they can preserve the gesture behavior.
- Prefer `editorInfoField.file` over `workspace.getActiveFile()` for editor source-path resolution if the investigation confirms it behaves correctly in split panes.
- If no supported API preserves the behavior, keep the deprecated access inside one helper with explicit tests and a comment tying it to Obsidian middle-click retargeting.

Add named constants:

```ts
const NATIVE_MIDDLE_CLICK_WAIT_MS = 250;
```

Validation:

- Existing retargeting tests moved intact
- `npm test`

Optional improvement:

- Record whether timeout fallback was used in tests or logs. Do not add user-facing logging for MVP unless needed.

## Phase 10: Rebuild `createEditorExtension()` As Wiring

Behavior being changed:

- No behavior change intended.

Files likely touched:

- `src/editorModeHandler.ts`
- Possibly new `src/editor/extension.ts`

Target:

- The CodeMirror ViewPlugin class should own listener lifecycle and delegate each event to a coordinator.
- It should not parse hrefs, resolve targets, decide mode-specific `newLeaf` behavior, or manage raw suppression flags inline.

Expected result:

- `createEditorExtension()` becomes roughly 80-120 lines.
- The editor directory owns the complexity in smaller files with narrower contracts.

Validation:

- `npm test`
- `npm run check`
- Manual QA for the event rows touched in Phase 1 and Phase 2

## Phase 11: Reassess CodeMirror Integration

Do this only after the behavior is characterized.

Question:

- Can any raw capture listeners move to CodeMirror ViewPlugin `eventHandlers` or `EditorView.domEventHandlers()` with high precedence?

Reason to consider it:

- CodeMirror handlers are the documented integration point, and returning `true` prevents built-in behavior from running.

Reason to be cautious:

- The current raw capture listeners appear to exist because rendered table/callout behavior required suppressing native selection early.

Validation:

- Convert one event path at a time.
- Run full tests after each conversion.
- Manually retest table and callout links immediately.

Exit criterion:

- If a documented CodeMirror handler changes native parity, keep the raw listener and document why.

## Phase 12: Decide Public-Release Hardening

These are not personal MVP blockers. They are public/community release blockers unless explicitly documented as accepted limitations.

Potential hardening work:

1. Source Markdown parsing:
   Extend beyond P2b MVP coverage to full legal Markdown links, including reference, collapsed-reference, shortcut-reference, and multiline/title forms.

2. Hover previews:
   Use the native event investigation to determine whether hover preview uses the same link metadata path as click navigation or a separate preview path. Then investigate whether Obsidian exposes a stable hook for rewritten fragment targets.

3. Context-menu opens:
   Use the native event investigation to determine whether context-menu actions provide enough link metadata to resolve GFM fragments without separate DOM interception.

4. Deprecated active leaf access:
   Replace direct `workspace.activeLeaf` usage or isolate it behind a tested helper. Treat this as part of the editor overhaul, not as incidental cleanup.

5. Split panes:
   Verify whether `editorInfoField.file` solves source-path correctness for the clicked editor. If not, find another editor-to-file source path.

6. Duplicate-heading child highlighting:
   Try to match native highlighting for fallback line navigation. If Obsidian does not expose a practical API, document the limitation.

7. Mobile behavior:
   Reopen only if public/community release needs mobile support. The personal MVP should already be marked desktop-only with `isDesktopOnly: true`.

8. Metadata timing:
   Consider a retry path when heading cache is missing or stale.

Validation:

- Add fixture-first QA rows before implementing each item.
- Add unit tests at the pure boundary for every regression.

## Proposed Near-Term Order

1. Finish the unchecked QA rows in `plan/QA-log.md` and remaining MVP items from `plan/gfm-fragment-links-plan.md`.
2. Add and verify P1/P2a fixture coverage from `plan/observed-behavior-matrix.md`.
3. Run the native event investigation in `plan/native-event-investigation.md`.
4. Add gesture sequence tests for rendered left-click, rendered middle-click, source Ctrl-click, and source middle-click.
5. Extract link detection from `src/editorModeHandler.ts`.
6. Implement P2b source parser behavior in `src/editor/linkExtraction.ts`.
7. Extract mode policy for Source mode versus Live Preview differences.
8. Extract gesture state and suppression flags.
9. Extract middle-click retargeting.
10. Run `npm test` and `npm run check`.
11. Repeat the manual QA matrix sections that cover Reading mode, Live Preview, Source mode, callouts, tables, duplicates, empty fragments, external links, and wikilinks.

## MVP Completion Gate

Personal MVP gate:

- `npm test` passes.
- `npm run check` passes.
- Manifest is narrowed to `isDesktopOnly: true` unless mobile has been explicitly investigated and accepted.
- Remaining MVP items from `plan/gfm-fragment-links-plan.md` are complete or explicitly deferred with rationale.
- All P1, P2a, and P2b rows in `plan/observed-behavior-matrix.md` are GREEN, explicitly marked MVP accepted, or explicitly deferred with rationale.
- All QA rows in `plan/QA-log.md` that correspond to P1/P2a/P2b behavior are either GREEN or explicitly marked as deferred.
- Source-mode middle-click delay has been measured with repeated samples and is either accepted for MVP with a number or fixed.
- README documents deferred limitations, including hover preview, context-menu actions, source parser limits beyond P2b, middle-click visual delay, duplicate-heading child highlighting, split panes, and desktop-only support.
- No parser-shaped or broad gesture behavior is added directly to the current `createEditorExtension()` body. Narrow P1/P2a bug fixes are acceptable only with tests and a matching QA row.

Community-plugin gate:

- Hover previews for GFM fragment links work or are explicitly accepted as a submission limitation.
- Context-menu "Open in new tab" and "Open to the right" resolve GFM fragments.
- Press-vs-release timing differences are resolved or proven harmless.
- Middle-click delay and visual flash are resolved or reduced to acceptable native-equivalent behavior.
- Direct deprecated `workspace.activeLeaf` usage is removed or isolated behind a documented helper.
- Duplicate-heading child highlighting is solved or documented as blocked by Obsidian architecture.
- Split-pane behavior verified.
- Source-mode parsing handles legal Markdown links beyond the P2b MVP subset.
- Mobile behavior is verified if mobile support is restored; otherwise desktop-only support is documented.
- Manual QA has been run on the real target Obsidian version.

## Clarifying Questions

Answered:

1. Treat the near-term release as a personal-use MVP; community plugin candidacy is a stretch goal.
2. Close remaining edge-case QA rows before refactoring; this is the lighter lift.
3. Split-pane behavior is deferred to public/community release.
4. Deprecated `workspace.activeLeaf` usage should be replaced or isolated during the editor overhaul.
5. Keep one CodeMirror extension, but split rendered-link behavior, source-text behavior, and mode-specific gesture policy.
6. Run a native event investigation before the editor overhaul.
7. Duplicate-heading child highlighting is acceptable for MVP, worth pursuing for public/community release, and may become a documented limitation.
8. Source-mode parsing should handle P2b common inline-link forms for MVP after `linkExtraction.ts` is extracted, and full legal Markdown links for public release.
9. Mobile is out of MVP scope; mark the plugin desktop-only before MVP completion.
10. The README should document deferred MVP limitations.
11. Do not use a hard architecture freeze; keep feature-completeness cycles possible.
12. Native parity versus GFM edge cases should be decided case by case when they conflict.
13. Moving to `src/editor/*` is acceptable if it improves organization.

Still open:

1. Which Markdown parser or CodeMirror/Lezer route should be used for P2b legal inline-link detection?
