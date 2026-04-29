# Codebase Architecture Analysis

Date: 2026-04-28

## Executive Summary

The repo is not broadly over-engineered. The pure domain layer is small, tested, and close to the original MVP plan. The real complexity is concentrated in one adapter: `createEditorExtension()` and the helper functions in `src/editorModeHandler.ts`.

That complexity is partly justified. The plugin is trying to preserve native Obsidian behavior across Reading mode, Live Preview rendered links, Live Preview source text, Source mode, normal clicks, Ctrl/Cmd-clicks, middle-clicks, duplicate headings, table cells, and callouts. The QA log and commit history show that the hard problem is not GFM slug resolution; it is event ordering and native parity inside Obsidian's CodeMirror editor.

My recommendation is not a full pivot. Continue the MVP, but stop adding behavior directly to `src/editorModeHandler.ts`. Treat the current behavior as a characterized baseline, close the remaining QA rows, then refactor the editor adapter into explicit gesture, target-extraction, and navigation-coordination concerns before expanding scope.

## Product Direction

Near-term target:

- Personal-use MVP.

Stretch target:

- Obsidian Community plugin candidate.

Current release decisions:

- MVP scope is the remaining original plan work plus P1/P2 rows in `plan/observed-behavior-matrix.md`.
- Close the remaining unchecked QA rows before refactoring. That is the lighter lift because those rows are already fixture-scoped and may only require verification or narrow fixes.
- Before the editor overhaul, run a native event investigation. Public docs and typings expose useful primitives, but they do not expose Obsidian's internal native link-click implementation. The project should measure native event order instead of continuing to infer it from regressions.
- Split-pane behavior is deferred to public/community release.
- `workspace.activeLeaf` is deprecated/discouraged in the installed Obsidian typings. Current use in middle-click retargeting is acceptable only as MVP technical debt and should be replaced or isolated during the editor overhaul.
- Keep one CodeMirror editor extension, but split the internals by link surface and mode policy. Live Preview is a hybrid editor/viewer, and its unrendered source text does not behave the same as Source mode source text.
- Duplicate-heading child highlighting is acceptable for MVP. It is worth pursuing before public/community release, but may become a documented limitation if Obsidian does not expose a practical path.
- Source-mode parsing needs two stages: P2 covers common legal inline forms for MVP, while full legal Markdown coverage is public-release readiness. The current regex detector is acceptable only as a temporary stepping stone.
- Mobile support implications are unknown. Because the plugin currently sets `isDesktopOnly: false`, mobile behavior needs an explicit public-release decision.
- The MVP README should document deferred limitations.
- Do not impose a hard architecture freeze after MVP. Refactoring should make feature work safer, not block all feature work.
- Native Obsidian parity is the goal where it can be matched. If parity conflicts with GFM edge cases, decide case by case based on user value and implementation risk.

## Inputs Reviewed

- `plan/gfm-fragment-links-plan.md`
- `plan/QA-log.md`
- `src/main.ts`
- `src/slug.ts`
- `src/linkParser.ts`
- `src/resolver.ts`
- `src/navigation.ts`
- `src/readingModeHandler.ts`
- `src/editorModeHandler.ts`
- Unit tests across parser, slug, resolver, navigation, reading mode, and editor mode
- Commit history, especially commits touching `plan/QA-log.md`
- Obsidian API documentation through Context7
- CodeMirror 6 view documentation through Context7
- Local installed typings in `node_modules/obsidian/obsidian.d.ts` and `node_modules/@codemirror/view/dist/index.d.ts`

Validation run before this analysis:

- `npm test`: 6 test files passed, 78 tests passed.

## Current Architecture

Observed module boundaries:

| Concern | Current file | Assessment |
|---|---|---|
| GFM slug generation | `src/slug.ts` | Good. Pure, small, covered. |
| Href parsing | `src/linkParser.ts` | Good for MVP. Pure, small, covered. |
| Obsidian file and heading resolution | `src/resolver.ts` | Good boundary. Some navigation policy leaks in through `requiresLineFallback`, but it is still manageable. |
| Opening files and heading fallback | `src/navigation.ts` | Good extraction. This was the right response to duplicate-heading behavior. |
| Reading mode DOM links | `src/readingModeHandler.ts` | Simple and maintainable. It has a reusable `decideAction()` that editor mode also uses. |
| Editor mode event handling | `src/editorModeHandler.ts` | Over-concentrated. This is now a gesture-state adapter, source-link detector, rendered-link detector, native event suppressor, and middle-click retargeter in one file. |
| Plugin wiring | `src/main.ts` | Good. Thin and clear. |

The core domain is in good shape. The risk sits at the integration boundary between Obsidian's rendered/editor modes and CodeMirror's DOM event pipeline.

## Documentation Alignment

Context7 and the installed typings support the main architectural choices:

- Obsidian exposes `registerMarkdownPostProcessor()` for rendered Reading mode DOM processing.
- Obsidian exposes `registerEditorExtension(extension: Extension)` for CodeMirror 6 editor extensions.
- Obsidian exposes `editorInfoField`, which gives editor-associated Markdown file information from editor state. That is a better source-path candidate than workspace-global state for editor clicks.
- Obsidian exposes `editorLivePreviewField`, which identifies whether the editor is in Live Preview.
- Obsidian exposes `workspace.activeEditor`, which may be useful as a comparison point during tracing, but the editor state fields should be preferred inside CodeMirror extensions.
- Obsidian exposes `metadataCache.getFirstLinkpathDest(linkpath, sourcePath)` and `metadataCache.getFileCache(file)` for file and heading resolution.
- Obsidian exposes `workspace.openLinkText(linktext, sourcePath, newLeaf?)` for native link opening.
- Obsidian's installed typings mark `workspace.activeLeaf` as deprecated/discouraged. The documented alternatives are `workspace.getActiveViewOfType(...)` for current-view information and `workspace.getLeaf(...)` for opening or navigating views. `workspace.getMostRecentLeaf(...)` may be relevant when the most recent root-split leaf is needed.
- CodeMirror exposes `EditorView.domEventHandlers()` and ViewPlugin `eventHandlers`; handlers are ordered by extension precedence, and the first handler returning `true` is treated as handled so built-in behavior does not run.

The current implementation uses raw capture-phase listeners on `view.dom` instead of CodeMirror `eventHandlers`. That is a maintainability cost, but it may be justified by the QA findings around table/callout selection and event ordering. It should be treated as a deliberate adapter-level decision, not incidental style.

There is no public source in the reviewed docs showing Obsidian's internal native link-click implementation. The available evidence is API shape plus observed behavior. The next architecture step should therefore be an event-tracing investigation, documented in `plan/native-event-investigation.md`, to determine whether native navigation is driven by pointerdown, mousedown, mouseup, click, auxclick, contextmenu, hover, or later workspace events.

## Commit History Signal

The recent history shows escalating editor-mode complexity:

- `e016507` added the first full reading/editor behavior set: 591 editor tests and 429 editor-handler production lines.
- `ea24ec5` added edge-case fixtures and duplicate fallback: 400 insertions across fixtures, navigation, resolver, handler tests, and handler code.
- `2501cf9` added encoded path, callout, table, and rendered click handling: 272 production lines and 426 editor-test lines, concentrated in `src/editorModeHandler.ts` and `src/editorModeHandler.test.ts`.

That pattern is a warning. The next behavioral edge case is likely to add more state flags unless the editor adapter is split around a clear model of gestures and event phases.

## Strengths

1. The domain model is mostly pure.

   `slug.ts`, `linkParser.ts`, and most of `resolver.ts` are deterministic and easy to test. This is exactly where the project should stay conservative.

2. Obsidian-specific work is mostly isolated.

   The resolver and navigation modules hold the main Obsidian API calls. The reading and editor handlers are adapters.

3. The test suite is meaningful.

   There are 78 passing tests, and many of the editor tests were written as regression coverage for real QA discoveries.

4. The QA log is valuable.

   It documents native parity in a way that code alone cannot. For this plugin, that log is part of the product spec.

5. Duplicate-heading handling has a defensible design.

   `buildOpenLinkText()` uses native heading navigation when possible and falls back to line navigation for duplicate GFM slug suffixes. That is a pragmatic compromise around Obsidian's exact-heading model.

## Main Maintainability Problems

### 1. `createEditorExtension()` Owns Too Many Concerns

`src/editorModeHandler.ts` is 648 lines. The `createEditorExtension()` factory itself spans lines 27-268 and owns:

- pending rendered click state
- pending middle-click state
- suppression flags for later `click` and `auxclick`
- pointerdown, mousedown, pointerup, mouseup, click, and auxclick listeners
- source-vs-rendered branching
- Live Preview detection
- active file lookup
- middle-click native tab retargeting
- listener registration and teardown

The extracted helper functions reduce function size below the factory, but they do not yet reduce the conceptual load of the factory. The class still acts as an implicit finite state machine.

### 2. Event State Is Implicit

The fields:

- `pendingMiddleClick`
- `pendingRenderedClick`
- `handledRenderedPointerDown`
- `suppressNextRenderedClick`
- `suppressNextRenderedAuxClick`

encode a gesture protocol, but the protocol is not represented directly. A future maintainer has to infer which states are valid after each event.

This is why small behavior changes are expensive. There is no central "given event X in state Y, produce command Z" model.

The current code also mixes three different concepts that should be named separately:

- Link surface: rendered anchor/data-href versus source-text Markdown.
- Editor mode: Live Preview versus Source mode.
- Gesture policy: plain click, Ctrl/Cmd-click, middle-click, event phase, and whether navigation opens a new leaf.

This matters because Live Preview source-text links and Source mode source-text links are both unrendered Markdown, but their native Ctrl-click behavior differs. Live Preview unrendered Ctrl-click opens a new tab, navigates, and highlights the target section; Source mode Ctrl-click stays in the same tab, navigates, and highlights. That difference should live in a policy table or policy function, not as an inline boolean expression.

### 3. Tests Are Strong but Close to Implementation

The editor tests cover many helper functions, which is good. The gap is that the most fragile part is not any one helper; it is sequences of browser events.

The repo needs more tests shaped like:

- rendered link: pointerdown -> mousedown -> pointerup -> mouseup -> click
- rendered middle-click: mousedown -> mouseup -> auxclick
- source middle-click: mousedown -> native leaf change -> file-open -> mouseup -> auxclick
- unrendered Live Preview Ctrl-click
- drag off rendered link before release

Some of this is present in small pieces, but the state machine itself is not tested as a state machine.

### 4. Source Path And Leaf Selection Need Hardening

Editor mode currently uses:

```ts
app.workspace.getActiveFile()?.path ?? ""
```

for editor clicks. The original plan already called this out as pragmatic but potentially weak for split panes. If the clicked editor is not yet the active file at the event phase being handled, resolution can be wrong.

This is not proven broken from the current repo facts, but it is a real risk for Obsidian parity. It should be tested before community release.

The editor handler also snapshots `app.workspace.activeLeaf` for middle-click retargeting. In the installed Obsidian API typings, `activeLeaf` is deprecated and its direct use is discouraged. That should be treated as explicit technical debt. During the editor overhaul, replace it with a supported alternative if possible, or isolate it behind a helper such as `getCurrentWorkspaceLeafForGesture()` with comments explaining why no better API was sufficient.

The likely better source-path path is to read `editorInfoField` from the clicked editor's `EditorView` state. That should be validated during the native event investigation, especially against split panes, because it may solve source-path correctness without relying on `workspace.getActiveFile()`.

### 5. Middle-Click Retargeting Is Timing-Sensitive

`retargetNativeMiddleClickTab()` waits for active leaf and file-open events with 250 ms fallbacks. The QA log already notes:

- middle-click highlighting has a slight delay
- Source mode middle-click has noticeable delay
- Live Preview unrendered and Source mode middle-click show a visual flash in some cases

This is likely the most fragile behavior in the implementation. It may be acceptable for a personal MVP, but it is not yet a robust public-plugin interaction.

This area should not be refactored solely from current assumptions. The native event investigation should log the full middle-click sequence, workspace events, active editor, active file, current editor file, and leaf changes. If Obsidian's native path can be understood well enough, it may reduce or eliminate the current retargeting workaround.

### 6. Native Behavior Is Under-Instrumented

Each editor regression response has been driven by manual QA observations, then patched into the event handler. That was reasonable for an MVP, but it is not a solid basis for public-release behavior.

Specific unknowns:

- Which event phase native rendered-link navigation actually uses.
- Whether Live Preview rendered links and unrendered source-text links enter the same native path.
- Whether Source mode Ctrl-click is handled through CodeMirror syntax/link extensions, Obsidian workspace events, or both.
- Whether native middle-click opens a leaf before or after `auxclick`.
- Whether context-menu actions expose enough metadata to resolve GFM fragments without separate DOM interception.
- Whether hover preview uses the same link metadata as click navigation or a separate preview path.
- Whether `editorInfoField.file` solves split-pane source-path lookup.

The practical opportunity is that better alignment with native event flow may unlock cleaner support for context menu, split panes, and hover preview. It may not, but the project should find out before layering more workarounds onto `src/editorModeHandler.ts`.

### 7. Source Markdown Link Detection Is Below P2 MVP Scope

`extractMarkdownLinkHrefAtOffset()` uses:

```ts
/\[[^\]]*\]\(([^)]+)\)/g
```

That was consistent with the initial MVP plan, but the priority matrix now classifies several common legal inline-link forms as P2 MVP scope: titles, angle-bracket destinations, balanced or escaped parentheses in destinations, percent-encoded fragments, and bracketed link text. The current regex is therefore below the updated MVP target for Source mode.

Full legal Markdown coverage, including reference links and multiline forms, remains public-release readiness rather than personal MVP scope.

### 8. Known QA Rows Remain Open

`plan/QA-log.md` still has unchecked RED rows for:

- empty fragments
- external links in `external.md`
- wikilinks and embeds in `wikilinks.md`

There are also follow-up items for hover previews, context-menu open actions, press-vs-release timing, and visual flash/delay.

The open rows matter more than file length. Before calling the MVP complete, the team needs to explicitly choose which follow-ups are release blockers and which are documented limitations.

## Risk Ranking

High risk:

- Event ordering in editor mode.
- Middle-click retargeting.
- Split-pane source-path correctness.
- Deprecated `workspace.activeLeaf` usage in middle-click gesture tracking.
- Building more behavior before measuring native event order.
- Adding more behavior directly into `createEditorExtension()`.

Medium risk:

- Source-mode Markdown regex limitations.
- Hover preview and context-menu behavior.
- Duplicate-heading highlight differences between native and fallback navigation.
- Metadata cache timing after file edits.

Low risk:

- GFM slug generation.
- Href parsing for MVP-supported links.
- Reading mode link interception.
- Main plugin wiring.

## Should The Plan Pivot?

No full pivot is needed. The current architecture got the important split mostly right:

- parse and slug as pure code
- resolve against Obsidian metadata
- navigate through Obsidian workspace APIs
- adapt separately for Reading mode and editor mode

The required pivot is narrower:

1. Stop treating `src/editorModeHandler.ts` as the place where all new edge cases go.
2. Close P1/P2 rows in `plan/observed-behavior-matrix.md` or explicitly defer them with rationale.
3. Run the native event investigation in `plan/native-event-investigation.md`.
4. Add characterization coverage for full gesture sequences.
5. Extract the editor-mode state machine into named concepts.
6. Freeze nonessential editor behavior until the current QA matrix is closed.

The MVP is still reachable, but a community-ready version needs an editor-adapter hardening pass.

Given the current release direction, finish the remaining original-plan gaps and P1/P2 QA and fixture rows before the editor refactor. The refactor is still important, but doing it first would move a behavior surface that is not fully classified yet.

The one exception is investigation instrumentation. Instrumentation should happen before the refactor because it informs whether the refactor is aligning with Obsidian's actual event model or preserving current workarounds.

## Target Shape

The target architecture should make `createEditorExtension()` boring. It should register listeners and delegate to small modules:

```text
src/editor/
  extension.ts              # CodeMirror/DOM listener wiring only
  gestureState.ts           # pending click state and transitions
  modePolicy.ts             # Source vs Live Preview gesture policy
  renderedLinkEvents.ts     # rendered anchor/data-href behavior
  sourceTextEvents.ts       # unrendered Markdown source-text behavior
  linkExtraction.ts         # DOM anchor and source markdown href extraction
  workspaceContext.ts       # current file/leaf lookup; isolates activeLeaf replacement
  middleClickRetarget.ts    # native tab wait/retarget behavior
```

The key is not file count. The key is that each module has one reason to change:

- link extraction changes when Obsidian DOM or Markdown syntax changes
- mode policy changes when Source mode and Live Preview gesture parity changes
- workspace context changes when Obsidian leaf/view APIs change
- gesture policy changes when native parity rules change
- middle-click retargeting changes when workspace timing changes
- extension wiring changes when CodeMirror integration changes

The important split is not "one Source mode extension and one Live Preview extension." Both modes share CodeMirror's event stream, and duplicate listener state would make suppression harder. The better split is one extension with separate rendered-link handling, source-text handling, and mode-specific policy.

## Clarifying Questions

Answered:

1. Near-term target is personal-use MVP; community plugin candidacy is a stretch goal.
2. Hover preview, context-menu open actions, press-vs-release parity, and middle-click visual polish are nice-to-have for personal use but blockers for public/community release.
3. Split-pane behavior is deferred to public/community release.
4. Deprecated `workspace.activeLeaf` usage should be handled during the editor overhaul.
5. The editor overhaul should keep one CodeMirror extension but split rendered-link handling, source-text handling, and mode-specific gesture policy.
6. Run a native event investigation before the editor overhaul so the refactor is based on measured Obsidian behavior.
7. Duplicate-heading child highlighting is acceptable for MVP, worth pursuing for public/community release, and may become a documented limitation if Obsidian architecture blocks it.
8. Source-mode parsing should handle P2 common legal inline-link forms for MVP; full legal Markdown parsing remains public-release readiness.
9. Mobile implications are unknown and need investigation before public/community release because `isDesktopOnly` is currently `false`.
10. The README should document deferred limitations for MVP.
11. No hard architecture freeze is desired; refactoring should preserve the ability to keep working on feature completeness.
12. Native parity versus GFM edge cases should be decided case by case when they materially conflict.

Still open:

1. Should the personal MVP remain `isDesktopOnly: false`, or should the manifest become desktop-only until mobile behavior is understood?
2. Which legal Markdown link parser should be used or adapted for public release?
