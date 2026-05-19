# QA Log

## Native Parity Target

Internal document links should match native Obsidian behavior:

| Mode | Link state | Gesture | Expected behavior |
|---|---|---|---|
| Reading | rendered | click | Navigate internally and highlight heading. |
| Reading | rendered | Ctrl-click / middle-click | Open new tab in Live Preview and highlight heading with children. |
| Live Preview | rendered | click | Navigate internally and highlight heading with children. |
| Live Preview | rendered | Ctrl-click / middle-click | Open new tab and highlight heading with children. |
| Live Preview | unrendered | click | Place cursor only. |
| Live Preview | unrendered | Ctrl-click / middle-click | Open new tab and highlight heading with children. |
| Source mode | unrendered | click | Place cursor only. |
| Source mode | unrendered | Ctrl-click | Navigate internally and highlight heading with children. |
| Source mode | unrendered | middle-click | Open new tab in Live Preview and highlight heading with children. |

Current status after native-parity reset:

- Reading mode click, Ctrl-click, and middle-click match native behavior.
- Live Preview rendered click, Ctrl-click, and middle-click match native behavior.
- Live Preview unrendered click, Ctrl-click, and middle-click match native behavior.
- Source mode click, Ctrl-click, and middle-click match native behavior.
- Middle-click highlighting has a slight but noticeable delay because the plugin retargets Obsidian's native middle-click tab after it is created; Ctrl-click uses direct plugin navigation and does not show the same latency.

## Editor Event Contract

- Rendered Live Preview left-click resolves a rendered anchor, prevents source/table selection, navigates once, and suppresses any later native `click` for the same gesture.
- Rendered Live Preview Ctrl-click follows the same path, opens one new tab, and suppresses any later native `click` for the same gesture.
- Rendered Live Preview middle-click stores the target on mousedown, navigates directly to one new tab on mouseup, and suppresses the later native `auxclick`.
- Unrendered Live Preview and Source mode plain click only place the cursor.
- Unrendered Live Preview and Source mode Ctrl-click navigate from the markdown source link.
- Unrendered Live Preview and Source mode middle-click suppress duplicate source handling and retarget Obsidian's native new tab.

## Reading Mode

- [x] RED: clicking `[same-file](#target-heading)` in ~~`reading.md`~~ `test-gfm.md` should scroll to `## Target Heading`; before reading-mode handler wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same top](#target-heading)` in `test-gfm.md` scrolls to `## Target Heading`.
- [x] RED: clicking `[cross-file](Other.md#target-heading)` in ~~`reading.md`~~ `test-gfm.md` should open `Other.md` and scroll to `## Target Heading`; current observed behavior opened `Other.md` without scrolling.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in `test-gfm.md` opens `Other.md` and scrolls to `## Target Heading`.
- [x] GREEN: external scheme rows in `test-gfm.md` / `test-native.md` are not intercepted by the plugin; observed native external behavior.
- [x] GREEN: clicking `[[Wikilink Target]]` in `test-gfm.md` / `test-native.md` is not intercepted by the plugin; observed native navigation to `Wikilink Target`.
- [x] GREEN: clicking `#reading-test-tag` in `test-gfm.md` / `test-native.md` is not intercepted by the plugin; observed native search with `tag:#reading-test-tag`.

## Live Preview

- [x] RED: clicking `[same-file-2](#another-heading)` in ~~`reading.md`~~ `test-gfm.md` should scroll to `## Another Heading`; before editor extension source fallback wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same later](#another-heading)` in Live Preview scrolls to `## Another Heading`.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in Live Preview opens `Other.md` and scrolls to `## Target Heading`.
- [x] GREEN: external scheme rows in Live Preview are not intercepted by the plugin; observed native external behavior.
- [x] GREEN: clicking `[[Wikilink Target]]` in Live Preview is not intercepted by the plugin; observed native navigation to `Wikilink Target`.
- [x] GREEN: clicking `#reading-test-tag` in Live Preview is not intercepted by the plugin; observed native tag behavior.

## Source Mode

- [x] GREEN: Ctrl-clicking `[same later](#another-heading)` in Source mode scrolls to `## Another Heading`.
- [x] GREEN: middle-clicking `[same later](#another-heading)` in Source mode opens one Live Preview tab and highlights heading with children; observed slight highlight latency.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in Source mode places the cursor only; no navigation.
- [x] GREEN: Ctrl-clicking `[cross-file](Other.md#target-heading)` in Source mode opens `Other.md` in the same tab and highlights `## Target Heading` with children.
- [x] GREEN: middle-clicking `[cross-file](Other.md#target-heading)` in Source mode opens `Other.md` in a new Live Preview tab and highlights `## Target Heading` with children.

NOTE: Source-mode middle-click highlighting is slightly delayed, matching the existing middle-click latency follow-up item.

## Step 7 Edge Cases

### Formatted Headings

- [x] GREEN: clicking `[bold](#bold-heading)` in ~~`headings-formatted.md`~~ `test-gfm.md` scrolls to `## **Bold Heading**`.
- [x] GREEN: clicking `[italic](#italic-heading)` in ~~`headings-formatted.md`~~ `test-gfm.md` scrolls to `## *Italic Heading*`.
- [x] GREEN: clicking `[code](#code-heading)` in ~~`headings-formatted.md`~~ `test-gfm.md` scrolls to ``## `code()` Heading``.
- [x] GREEN: `test-native.md` carries the paired native Obsidian heading fragments for the same bold, italic, and code headings.

### Duplicate Headings

Manual QA in `duplicates.md`:

| Mode | Gesture | Current behavior | Expected behavior | Status |
|---|---|---|---|---|
| Reading | Click `[first](#foo)` | Goes to first `## Foo`, highlights heading. | Same. | GREEN |
| Reading | Click `[second](#foo-1)` | Goes to second `## Foo`, highlights heading. | Same. | GREEN |
| Reading | Click `[third](#foo-2)` | Goes to third `## Foo`, highlights heading. | Same. | GREEN |
| Reading | Ctrl-click `[first](#foo)` | Opens new tab at first `## Foo`, highlights heading and children. | Same. | GREEN |
| Reading | Ctrl-click `[second](#foo-1)` | Opens new tab at second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Reading | Ctrl-click `[third](#foo-2)` | Opens new tab at third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Reading | Middle-click `[first](#foo)` | Opens new tab at first `## Foo`, highlights heading and children. | Same. | GREEN |
| Reading | Middle-click `[second](#foo-1)` | Opens new tab at second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Reading | Middle-click `[third](#foo-2)` | Opens new tab at third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview rendered | Click `[first](#foo)` | Goes to first `## Foo`, highlights heading and children. | Same. | GREEN |
| Live Preview rendered | Click `[second](#foo-1)` | Goes to second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview rendered | Click `[third](#foo-2)` | Goes to third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview rendered | Ctrl-click or middle-click `[first](#foo)` | Opens new tab at first `## Foo`, highlights heading and children. | Same. | GREEN |
| Live Preview rendered | Ctrl-click or middle-click `[second](#foo-1)` | Opens new tab at second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview rendered | Ctrl-click or middle-click `[third](#foo-2)` | Opens new tab at third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview unrendered | Click all links | Moves cursor to clicked location. | Same. | GREEN |
| Live Preview unrendered | Ctrl-click or middle-click `[first](#foo)` | Opens new tab at first `## Foo`, highlights heading and children. | Same. | GREEN |
| Live Preview unrendered | Ctrl-click or middle-click `[second](#foo-1)` | Opens new tab at second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Live Preview unrendered | Ctrl-click or middle-click `[third](#foo-2)` | Opens new tab at third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Source mode | Click all links | Moves cursor to clicked location. | Same. | GREEN |
| Source mode | Ctrl-click `[first](#foo)` | Goes to first `## Foo`, highlights heading and children. | Same. | GREEN |
| Source mode | Ctrl-click `[second](#foo-1)` | Goes to second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Source mode | Ctrl-click `[third](#foo-2)` | Goes to third `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Source mode | Middle-click `[first](#foo)` | Opens new tab at first `## Foo`, highlights heading and children. | Same. | GREEN |
| Source mode | Middle-click `[second](#foo-1)` | Opens new tab at second `## Foo`, highlights heading only. | Same for MVP. | GREEN |
| Source mode | Middle-click `[third](#foo-2)` | Opens new tab at third `## Foo`, highlights heading only. | Same for MVP. | GREEN |

Observed pattern:

- Same-leaf and new-tab duplicate navigation now land on the correct heading for `#foo-1` and `#foo-2`.
- Known MVP limitation: `#foo-1` and `#foo-2` cases that rely on plugin line fallback highlight only the heading, not children.
- This is accepted for MVP because Obsidian does not expose a stable native target for duplicate GFM slug suffixes; correct navigation is the required behavior.

### Encoded Paths

- [x] GREEN: clicking `[encoded](encoded%20path%20with%20spaces.md#h)` in `encoded path with spaces.md` resolves the current file and scrolls to `## H`.

### Callouts And Tables

- [x] GREEN: clicking `[callout link](#callout-target)` inside the callout in `callout.md` navigates to `## Callout Target`.

Manual QA in `callout.md`:

| Mode | Link state | Gesture | Native behavior | Plugin behavior | Status |
|---|---|---|---|---|---|
| Reading | rendered | click | Scrolls to target heading; highlights heading. | Matches native. | GREEN |
| Reading | rendered | Ctrl-click | Opens new tab; places cursor at target heading; highlights heading plus children. | Matches native. | GREEN |
| Reading | rendered | middle-click | Same as Ctrl-click. | Matches native. | GREEN |
| Live Preview | rendered | click | On mousedown, shows hover preview; on mouseup, places cursor at target heading and highlights heading plus children. | Places cursor at target heading; highlights heading plus children. | GREEN |
| Live Preview | rendered | Ctrl-click | Opens one new tab; places cursor at target heading; highlights heading plus children. | Opens one new tab; places cursor at target heading; highlights heading plus children. | GREEN |
| Live Preview | rendered | middle-click | Same as Ctrl-click. | Matches native. | GREEN |
| Live Preview | unrendered | click | Places cursor at click location. | Matches native. | GREEN |
| Live Preview | unrendered | Ctrl-click | Ctrl-click on either `[text]` or `(href)` opens new tab; places cursor at target heading; highlights heading plus children. | Matches native, with a slight visual glitch. | GREEN |
| Live Preview | unrendered | middle-click | Same as Ctrl-click. | Same as Ctrl-click. | GREEN |
| Source mode | unrendered | click | Places cursor at click location. | Matches native. | GREEN |
| Source mode | unrendered | Ctrl-click | Ctrl-click on either `[text]` or `(href)` places cursor at target heading; highlights heading plus children. | Matches native. | GREEN |
| Source mode | unrendered | middle-click | Middle-click on either `[text]` or `(href)` opens new tab; places cursor at target heading; highlights heading plus children. | Matches native, with the same slight visual glitch as Live Preview unrendered. | GREEN |

- [x] GREEN: clicking `[table link](#table-target)` inside the table cell in `table.md` navigates to `## Table Target`.
  - Reading mode: matches native for click, Ctrl-click, and middle-click.
  - Live Preview rendered: click, Ctrl-click, and middle-click navigate correctly; rendered click now blocks table-cell source selection on pointerdown and navigates on pointerup.
  - Source mode: matches native except for the already-noted middle-click delay.

### Empty Fragments And Native Links

- [x] GREEN: `[file only](Other.md)` in the paired `test-gfm.md` / `test-native.md` fixtures matches native file-open behavior with no plugin-imposed scroll or heading highlight.

Manual QA on Windows desktop Obsidian, comparing plugin off and plugin on:

- Reading mode: click, Ctrl-click, and middle-click match native.
- Live Preview rendered: click, Ctrl-click, and middle-click match native after file-only links were handed back to Obsidian's native handler.
- Live Preview unrendered: click, Ctrl-click, and middle-click match native after file-only links were handed back to Obsidian's native handler.
- Source mode: click, Ctrl-click, and middle-click match native.

- [x] GREEN: `[missing file](Missing.md)` and `[missing fragment](Missing.md#x)` in the paired `test-gfm.md` / `test-native.md` fixtures match native missing-file behavior.

Manual QA on Windows desktop Obsidian, comparing plugin off and plugin on:

`Missing.md` was removed before each row so each gesture exercised the missing-file path.

| Mode | Link state | Gesture | Observed behavior | Status |
|---|---|---|---|---|
| Reading | rendered | click / Ctrl-click / middle-click | Plugin-on behavior matches native behavior for both missing-file rows. | GREEN |
| Live Preview | rendered | click / Ctrl-click / middle-click | Plugin-on behavior matches native behavior for both missing-file rows. | GREEN |
| Live Preview | unrendered | click / Ctrl-click / middle-click | Plugin-on behavior matches native behavior for both missing-file rows. | GREEN |
| Source mode | unrendered | click / Ctrl-click / middle-click | Plugin-on behavior matches native behavior for both missing-file rows. | GREEN |

Unit coverage:

- `readingModeHandler.test.ts` verifies missing-file links do not call `preventDefault`, stop propagation, or navigate when resolution returns null.
- `editorModeHandler.test.ts` verifies rendered and source missing-file paths do not call `preventDefault`, stop propagation, or navigate when resolution returns null.

- [x] GREEN: `[missing heading](Other.md#nonexistent-heading)` in `test-gfm.md` matches the paired native missing-heading row in `test-native.md`: existing `Other.md` opens with no scroll and no error.

Manual QA on Windows desktop Obsidian, comparing `[missing heading](Other.md#nonexistent-heading)` against `[missing heading](Other.md#Nonexistent%20Heading)`:

| Mode | Link state | Gesture | Observed behavior | Status |
|---|---|---|---|---|
| Reading | rendered | click / Ctrl-click / middle-click | Opens `Other.md`; no scroll; no error; plugin-on GFM behavior matches native. | GREEN |
| Live Preview | rendered | click / Ctrl-click / middle-click | Opens `Other.md`; no scroll; no error; plugin-on GFM behavior matches native after release-timing and follow-up click suppression fixes. | GREEN |
| Live Preview | unrendered | click / Ctrl-click / middle-click | Plain click places cursor; Ctrl-click and middle-click open `Other.md`; no scroll; no error; plugin-on GFM behavior matches native. | GREEN |
| Source mode | unrendered | click / Ctrl-click / middle-click | Plain click places cursor; Ctrl-click and middle-click open `Other.md`; no scroll; no error; plugin-on GFM behavior matches native. | GREEN |

Unit coverage:

- Existing `resolver.test.ts` coverage verifies an existing file with a missing heading slug resolves to `{ file, line: null, heading: null }`.
- `editorModeHandler.test.ts` verifies Live Preview rendered-source fallback does not navigate on mousedown and source Ctrl-click follow-up clicks are suppressed.

- [x] GREEN: `[empty fragment](test-gfm.md#)` / `[empty fragment](test-native.md#)` in the paired `test-gfm.md` / `test-native.md` fixtures matches native empty-fragment behavior with no scroll.

Manual QA originally recorded in `empty-fragment.md`; the fixture row is now consolidated into `test-gfm.md` and `test-native.md` for side-by-side parity checks:

| Mode | Link state | Gesture | Native behavior | Plugin behavior | Status |
|---|---|---|---|---|---|
| Reading | rendered | click | No visible response; hover preview may report unable to find empty heading. | Matches native. | GREEN |
| Reading | rendered | Ctrl-click | Opens new tab; cursor is at top of page with no scroll. | Matches native. | GREEN |
| Reading | rendered | middle-click | Same as Ctrl-click. | Matches native. | GREEN |
| Live Preview | rendered | click | No visible response. | Matches native. | GREEN |
| Live Preview | rendered | Ctrl-click | Opens new tab on mouse release; cursor is at top of page with no scroll. | Matches native after release-timing fix. | GREEN |
| Live Preview | rendered | middle-click | Same as Ctrl-click. | Matches native. | GREEN |
| Live Preview | unrendered | click | Places cursor at click location. | Matches native. | GREEN |
| Live Preview | unrendered | Ctrl-click | Opens new tab on mouse release; cursor is at top of page with no scroll. | Matches native after release-timing fix. | GREEN |
| Live Preview | unrendered | middle-click | Opens new tab; cursor is at top of page with no scroll. | Matches native. | GREEN |
| Source mode | unrendered | click | Places cursor at click location. | Matches native. | GREEN |
| Source mode | unrendered | Ctrl-click | Navigates to file in same tab on mouse release. | Matches native after release-timing fix. | GREEN |
| Source mode | unrendered | middle-click | Opens new tab; cursor is at top of page with no scroll. | Matches native. | GREEN |

Plugin-off reversibility: native Obsidian accepts the empty fragment without user-visible error. The plugin-on differences found during QA were event-timing differences; Ctrl-click release timing now matches native in rendered Live Preview, unrendered Live Preview, and Source mode.

### GFM And Native Heading Link Pair

Manual parity fixtures:

- `test-gfm.md` uses GFM slug fragments such as `[same later](#another-heading)`.
- `test-native.md` uses native Obsidian fragments such as `[same later](#Another%20Heading)`.
- Both fixtures include cross-file links to `Other.md`, file-only links to `Other.md`, missing-file links to `Missing.md`, missing-heading links to `Other.md`, wikilink and tag non-interception rows, formatted heading links, the P2a square-bracket heading link, empty-fragment links, and external scheme links for side-by-side QA.
- The external scheme rows cover `https://`, `http://`, `mailto:`, `tel:`, `obsidian://`, `file:`, protocol-relative `//example.com`, and `data:`.
- Native Markdown heading fragments must remain native-handled; the plugin should only handle GFM slug fragments that native Obsidian does not already resolve.
- Both fixtures intentionally cover a top heading and a later non-duplicate heading. Duplicate heading parity is intentionally left to `duplicates.md` and future work because native Obsidian duplicate-heading behavior relies on `^` block identifiers rather than GFM slug suffixes.

Manual QA in `test-gfm.md` and `test-native.md`:

| Mode | Link set | Gesture | Observed behavior | Status |
|---|---|---|---|---|
| Reading | GFM and native heading links | click / Ctrl-click / middle-click | GFM links match native fixture behavior; native links remain native-handled. | GREEN |
| Live Preview | rendered GFM and native heading links | click / Ctrl-click / middle-click | GFM links match native fixture behavior; native links remain native-handled. | GREEN |
| Live Preview | unrendered GFM and native heading links | click / Ctrl-click / middle-click | GFM links match native fixture behavior; native links remain native-handled. Middle-click has a slight highlight delay. | GREEN |
| Source mode | unrendered GFM and native heading links | click / Ctrl-click / middle-click | GFM links match native fixture behavior; native links remain native-handled. Middle-click has a slight highlight delay. | GREEN |

### P2a Square-Bracket Heading

- [x] GREEN: `github-slugger` returns `api-v2` for `API [v2]`; `slugify("## API [v2]")` and `buildSlugTable(["## API [v2]"])` have unit coverage.
- [x] GREEN: `[bracketed](#api-v2)` in `test-gfm.md` and `[bracketed](#API%20%5Bv2%5D)` in `test-native.md` both navigate to `## API [v2]`.

Manual QA on Windows desktop Obsidian, comparing the paired bracketed-heading rows in `test-gfm.md` and `test-native.md`:

| Mode | Link state | Gesture | Observed behavior | Status |
|---|---|---|---|---|
| Reading | rendered | click / Ctrl-click / middle-click | GFM and native links land on `## API [v2]`; behavior matches native. | GREEN |
| Live Preview | rendered | click / Ctrl-click | GFM and native links land on `## API [v2]`; behavior matches native. | GREEN |
| Live Preview | rendered | middle-click | GFM link lands on `## API [v2]`; the known plugin flicker/latency appears compared to native. | GREEN with public blocker |
| Live Preview | unrendered | click | Places the cursor only; behavior matches native. | GREEN |
| Live Preview | unrendered | Ctrl-click | GFM and native links land on `## API [v2]`; behavior matches native. | GREEN |
| Live Preview | unrendered | middle-click | GFM link lands on `## API [v2]`; the known plugin flicker/latency appears compared to native. | GREEN with public blocker |
| Source mode | unrendered | click | Places the cursor only; behavior matches native. | GREEN |
| Source mode | unrendered | Ctrl-click | GFM and native links land on `## API [v2]`; behavior matches native. | GREEN |
| Source mode | unrendered | middle-click | GFM link lands on `## API [v2]`; the known plugin flicker/latency appears compared to native. | GREEN with public blocker |

Manual QA for external scheme rows in `test-gfm.md` and `test-native.md`:

| Scheme | Modes | Gestures | Observed behavior | Status |
|---|---|---|---|---|
| `https://` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. | GREEN |
| `http://` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. | GREEN |
| `mailto:` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. Host handler behavior is platform/app dependent. | GREEN |
| `tel:` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. Host handler behavior is platform/app dependent. | GREEN |
| `obsidian://` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. | GREEN |
| `file:` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. Host file handling is platform/security dependent. | GREEN |
| `//example.com/path` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. | GREEN |
| `data:` | Reading, Live Preview rendered, Live Preview unrendered, Source mode | click / Ctrl-click / middle-click | Appears to use native external behavior; no plugin navigation observed. Host handler behavior is platform/app dependent. | GREEN |

- [x] GREEN: wikilinks and embeds in `wikilinks.md` use native Obsidian behavior and are not intercepted by the plugin.

Manual QA in `wikilinks.md`:

| Form | Reading | Live Preview rendered | Live Preview unrendered | Source mode | Status |
|---|---|---|---|---|---|
| `[[Wikilink Target]]` | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | GREEN |
| `[[Wikilink Target#Heading]]` | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | Native behavior for click, Ctrl-click, and middle-click. | GREEN |
| `![[Embedded Note]]` | Native embed behavior for click, Ctrl-click, and middle-click. | Native embed behavior for click, Ctrl-click, and middle-click. | Native embed behavior for click, Ctrl-click, and middle-click. | Native embed behavior for click, Ctrl-click, and middle-click. | GREEN |
| `![[image.png]]` | Native image embed/viewer behavior for click, Ctrl-click, and middle-click. | Native image embed/viewer behavior for click, Ctrl-click, and middle-click. | Native image embed/viewer behavior for click, Ctrl-click, and middle-click. | Native image embed/viewer behavior for click, Ctrl-click, and middle-click. | GREEN |

## Follow-Up Items

- Hover previews for same-file and cross-file GFM fragment links still use Obsidian's native preview path and can show unresolved fragment text, e.g. unable to find `"target-heading"`.
- File-only link Ctrl/Cmd-click parity is verified on Windows with Ctrl-click; run the same row on macOS to confirm Cmd-click behavior before public release.
- Live Preview unrendered Ctrl-click now acts on mouse release for the consolidated empty-fragment rows; recheck the callout fixture before removing this as a broader follow-up.
- Live Preview unrendered and Source mode middle-click show a notable visual flash in the new tab in the callout fixture, briefly appearing rendered, unrendered, then rendered. The P2a square-bracket fixture also reproduces middle-click flicker/latency in `test-gfm.md`. Treat this as a likely code/event-order bug, not just cosmetic polish.
- Source mode Ctrl-click now acts on mouse release for the consolidated empty-fragment rows; recheck the callout fixture before removing this as a broader follow-up.
- Live Preview unrendered and Source mode middle-click have a slight delay before the new tab highlights the target heading plus children. Accepted for MVP, but treat this as a likely event-order or retargeting timing issue.
- Context-menu "Open in new tab" and "Open to the right" on GFM fragment links open the target file but do not navigate to or highlight the target heading. Observed on a rendered Live Preview link; scope across modes and fixtures not yet verified.
