# Native Event Investigation

Date: 2026-04-28

## Purpose

The current editor handler has grown through regression fixes. Several fixes may be workarounds for not knowing exactly how Obsidian handles native link gestures. Before the editor overhaul, measure native behavior directly and use those traces to design the mode policy, gesture state, workspace context, context-menu support, hover preview behavior, and split-pane source-path strategy.

This document is an investigation procedure, not an implementation plan.

## Questions To Answer

Primary questions:

1. Which DOM event actually drives native navigation for each mode and link surface?
2. Which event phase does native behavior use: `pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`, `auxclick`, `contextmenu`, hover/pointer movement, or later workspace events?
3. Does Live Preview rendered-link behavior use a different path from Live Preview unrendered source-text behavior?
4. Does Source mode Ctrl-click use CodeMirror syntax/link handling, Obsidian workspace handling, or both?
5. Does native middle-click open a leaf before or after `auxclick`?
6. Can `editorInfoField.file` replace `workspace.getActiveFile()` for clicked-editor source-path resolution?
7. Can a supported API replace direct `workspace.activeLeaf` snapshots for middle-click retargeting?
8. Does context-menu "Open in new tab/right" expose enough link metadata to resolve GFM fragments?
9. Does hover preview use the same link metadata path as click navigation, or a separate preview path?
10. Does split-pane behavior require editor-local context rather than workspace-global context?

Expected output:

- A table of native event sequences by mode, link surface, gesture, and fixture.
- A list of APIs that are reliable for source file, current editor, current leaf, and new leaf detection.
- Concrete rules for `modePolicy.ts`.
- A decision on whether raw capture listeners are necessary, or whether CodeMirror `eventHandlers` can handle some paths.

Seed the investigation from `plan/observed-behavior-matrix.md`, which consolidates the behavior-level observations already present in the QA log. This investigation should fill the lower-level event and API gaps that the observed matrix cannot answer.

## Known API Clues

Facts from installed typings and official docs:

- `editorInfoField` provides Markdown editor information, including the associated file.
- `editorLivePreviewField` reports whether Live Preview is active.
- `editorEditorField` gives access to the CodeMirror `EditorView`.
- `workspace.activeEditor` exists and may be useful for comparison, but editor state fields are likely better inside CodeMirror extensions.
- `workspace.activeLeaf` is deprecated/discouraged and should not remain as direct production usage unless isolated and justified.
- `workspace.openLinkText(linktext, sourcePath, newLeaf?)` is the native file/link opening API.
- CodeMirror `EditorView.domEventHandlers()` and ViewPlugin `eventHandlers` are documented integration points. Returning `true` means the event is handled and built-in behavior will not run.

Inference:

- `editorInfoField.file` is likely the best candidate for source-path correctness in editor mode, especially for split panes.
- Raw capture listeners may be needed for some rendered Live Preview interactions, such as table/callout selection suppression, but this should be proven by traces.

Unknown:

- Obsidian's internal native link-click implementation is not public in the reviewed docs.

## Fixture Matrix

Use the existing fixtures first:

- `reading.md`
- `Other.md`
- `duplicates.md`
- `callout.md`
- `table.md`
- `empty-fragment.md`
- `external.md`
- `wikilinks.md`

Add investigation-only fixture rows if needed:

- A simple same-file Obsidian-native heading link.
- A simple cross-file Obsidian-native heading link.
- A simple GFM same-file fragment link.
- A simple GFM cross-file fragment link.
- A markdown link with a context-menu test target.
- A link in split panes where source file and active file intentionally differ.

## Mode And Gesture Matrix

Modes:

- Reading mode.
- Live Preview rendered link.
- Live Preview unrendered source-text link.
- Source mode source-text link.

Gestures:

- Plain left click.
- Ctrl-click on Windows/Linux or Cmd-click on macOS.
- Middle-click.
- Right-click/context menu.
- Hover preview.

For each row, record:

- Whether native Obsidian navigates.
- Whether it opens the same tab or a new tab.
- Whether it highlights heading only or heading plus children.
- Whether cursor placement changes before navigation.
- Whether selection/table/callout behavior changes.
- Whether a workspace leaf changes.
- Whether a file-open event fires.
- Whether native behavior happens before or after `click`/`auxclick`.

## Instrumentation Strategy

Create a temporary investigation branch or local-only patch. Do not ship this tracer.

Recommended shape:

```text
src/investigation/
  nativeEventTracer.ts
```

Register a temporary editor extension and optional reading-mode listeners. The tracer should not call `preventDefault()`, `stopPropagation()`, or `stopImmediatePropagation()`.

For clean native timing, attach DOM listeners at `window` in capture phase where possible, and use `{ passive: true }` for event types that allow it. Avoid synchronous DOM reads beyond the compact fields listed below.

Run traces in a clean signal environment:

- Minimum reproduction vault.
- Default theme.
- No other community plugins enabled.
- Devtools closed during gesture capture and opened only after capture for log inspection.
- Same Obsidian version recorded for every run.

Trace these DOM events in capture and bubble phases:

- `pointerdown`
- `mousedown`
- `pointerup`
- `mouseup`
- `click`
- `auxclick`
- `contextmenu`
- `mouseover`
- `mouseenter`
- `mousemove` only if needed for hover preview

Trace these workspace events:

- `active-leaf-change`
- `file-open`
- `layout-change`
- `editor-menu`

Trace timing:

- Use `performance.now()` for event ordering.
- Assign a gesture id on `pointerdown`/`mousedown` and carry it through follow-up events when possible.
- Capture at least three samples for timing-sensitive rows, especially middle-click and press-vs-release gestures.
- Treat sub-millisecond differences as concurrent unless event order is stable across samples.

## Data To Log Per DOM Event

Log a compact structured object, not prose:

```ts
{
  t,
  gestureId,
  eventType,
  phase,
  button,
  buttons,
  ctrlKey,
  metaKey,
  shiftKey,
  altKey,
  defaultPrevented,
  eventTargetTag,
  closestAnchorHref,
  closestAnchorDataHref,
  closestAnchorClasses,
  closestDataHref,
  targetClasses,
  cmLineText,
  cmOffset,
  extractedMarkdownHref,
  isLivePreview,
  editorInfoFile,
  workspaceActiveFile,
  workspaceActiveEditorFile,
  activeLeafId,
  mostRecentLeafId,
  selectionHead,
  selectionAnchor
}
```

Keep logs copyable. Console tables are useful for quick inspection, but JSON lines are better for comparing runs.

## Data To Log Per Workspace Event

Log:

```ts
{
  t,
  gestureId,
  workspaceEvent,
  openedFile,
  activeFile,
  activeEditorFile,
  activeLeafId,
  mostRecentLeafId,
  leafViewType,
  leafFile
}
```

## Exact Procedure

1. Create a temporary tracer.

   Add a local-only investigation module and wire it in `main.ts` behind a constant or environment flag. Do not mix tracer output with production behavior.

2. Disable plugin navigation behavior.

   For the cleanest native trace, run with the GFM navigation handlers disabled and only the tracer active. The direct options are: comment out `registerEditorExtension(...)` and `registerMarkdownPostProcessor(...)` in `main.ts` on the temporary branch, or add a local-only `TRACER_ONLY` flag that registers the tracer and skips production handlers.

3. Confirm tracer is passive.

   Verify every traced listener returns without preventing default or stopping propagation. Confirm passive listeners do not produce browser warnings.

4. Record baseline native Obsidian links.

   In each mode, test Obsidian-native links that already work without this plugin. This establishes true native event order.

5. Record current GFM links with plugin handling disabled.

   This shows how Obsidian behaves when it sees unsupported GFM fragments.

6. Record GFM links with current plugin handling enabled.

   This identifies where the plugin diverges from native event order.

7. Run the gesture matrix.

   For each fixture and mode, perform plain click, Ctrl/Cmd-click, middle-click, right-click/context-menu, and hover preview.

8. Run split-pane tests.

   Open two panes with different files. Click a link in the non-active pane and compare `editorInfoField.file`, `workspace.getActiveFile()`, `workspace.activeEditor?.file`, and leaf information.

   Decision rule: if `editorInfoField.file` equals the file in the pane that received the click, source-path correctness is solved by switching editor-mode source lookup to that field. If it does not, continue testing `activeEditor`, leaf view state, and DOM-to-view context.

9. Run context-menu tests.

   Right-click rendered and source-text links. Select native "Open in new tab" and "Open to the right" where available. Record whether `editor-menu` exposes the editor and file context, and whether DOM/context state exposes the href.

10. Run hover preview tests.

   Hover native links and GFM links in Reading mode, Live Preview rendered links, and Live Preview source text. Record which events fire and whether any accessible hover parent or popover context includes the href. Also instrument likely API targets if exposed: workspace `hover-link` events, `MarkdownView.previewMode`, and Component-based hover popover registration paths.

11. Summarize event sequences.

   Fill the results table below. Do not rely on memory; paste or summarize trace excerpts.

12. Convert findings into tests.

   For every stable event sequence, add or update characterization tests before refactoring.

13. Decide listener strategy.

   For each path, decide whether CodeMirror `eventHandlers` is sufficient or raw capture listeners are required. Document any raw listener as an intentional native-parity requirement.

## Results Table Template

| Mode | Surface | Gesture | Native driver event | Opens new leaf | Highlight behavior | Source file source | Leaf strategy | Notes |
|---|---|---|---|---|---|---|---|---|
| Reading | Rendered anchor | Plain click | TBD | TBD | TBD | `ctx.sourcePath` | TBD | TBD |
| Reading | Rendered anchor | Ctrl/Cmd-click | TBD | TBD | TBD | `ctx.sourcePath` | TBD | TBD |
| Reading | Rendered anchor | Middle-click | TBD | TBD | TBD | `ctx.sourcePath` | TBD | TBD |
| Live Preview | Rendered link | Plain click | TBD | TBD | TBD | TBD | TBD | TBD |
| Live Preview | Rendered link | Ctrl/Cmd-click | TBD | TBD | TBD | TBD | TBD | TBD |
| Live Preview | Rendered link | Middle-click | TBD | TBD | TBD | TBD | TBD | TBD |
| Live Preview | Source text | Plain click | TBD | TBD | TBD | TBD | TBD | TBD |
| Live Preview | Source text | Ctrl/Cmd-click | TBD | TBD | TBD | TBD | TBD | TBD |
| Live Preview | Source text | Middle-click | TBD | TBD | TBD | TBD | TBD | TBD |
| Source mode | Source text | Plain click | TBD | TBD | TBD | TBD | TBD | TBD |
| Source mode | Source text | Ctrl/Cmd-click | TBD | TBD | TBD | TBD | TBD | TBD |
| Source mode | Source text | Middle-click | TBD | TBD | TBD | TBD | TBD | TBD |

## Decisions To Make From Results

| Decision area | Observation | Policy |
|---|---|---|
| Source path | `editorInfoField.file` tracks the clicked editor, including split panes. | Use `editorInfoField.file` for editor-mode source-path lookup. |
| Source path | `editorInfoField.file` does not track the clicked editor. | Keep investigating editor-local context; do not rely on `workspace.getActiveFile()` for public release. |
| Leaf context | `getMostRecentLeaf()`, `activeEditor`, or another supported API preserves middle-click behavior. | Replace direct `workspace.activeLeaf` usage. |
| Leaf context | No supported API preserves middle-click behavior. | Isolate deprecated `workspace.activeLeaf` access in one helper with tests and a comment explaining the Obsidian limitation. |
| Event driver | CodeMirror `eventHandlers` or `domEventHandlers()` can match native behavior and suppression. | Prefer the documented CodeMirror handler for that path. |
| Event driver | Native parity requires earlier capture, such as table/callout rendered-link suppression. | Keep raw capture for that path and document why. |
| Context menu | `editor-menu` plus last hovered/clicked link context identifies href and source file. | Implement context-menu support through workspace/editor menu integration. |
| Context menu | Menu APIs do not expose enough context. | Treat context-menu support as blocked or requiring a documented workaround. |
| Hover preview | Hover preview uses accessible link metadata or workspace events. | Implement a preview rewrite path. |
| Hover preview | Hover preview uses internal-only native state. | Document limitation or investigate a separate supported hook. |
| Middle-click | Native opens the new leaf before a reliable workspace event. | Retarget based on the measured event sequence. |
| Middle-click | Native exposes a later reliable event or direct target. | Replace timeout fallback with that event/API. |
| Middle-click | Delay remains visible. | Measure median and variance across samples before accepting for MVP. |
| Mode policy | Event table confirms Live Preview source-text Ctrl-click opens a new leaf and Source mode Ctrl-click stays in the same leaf. | Encode this difference in `modePolicy.ts`. |

## Exit Criteria

The investigation is complete when:

- Native event sequence table is filled for all P1/P2a/P2b MVP modes and gestures that affect editor behavior.
- Split-pane source-path behavior is measured.
- Timing-sensitive gestures have at least three samples with variance notes.
- Context-menu and hover-preview feasibility are classified as supported, possible with workaround, or blocked by internal APIs.
- A recommended listener strategy is written down.
- Characterization tests are identified for the overhaul.

## Non-Goals

- Do not implement the editor refactor inside this investigation.
- Do not add production behavior from tracer code.
- Do not solve legal Markdown parsing here, except to log where native source-text detection appears to find links.
