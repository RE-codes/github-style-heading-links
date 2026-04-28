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
- Rendered Live Preview middle-click lets Obsidian create the new tab, then retargets that tab after native open events.
- Unrendered Live Preview and Source mode plain click only place the cursor.
- Unrendered Live Preview and Source mode Ctrl-click navigate from the markdown source link.
- Unrendered Live Preview and Source mode middle-click suppress duplicate source handling and retarget Obsidian's native new tab.

## Reading Mode

- [x] RED: clicking `[same-file](#target-heading)` in `reading.md` should scroll to `## Target Heading`; before reading-mode handler wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same-file](#target-heading)` in `reading.md` scrolls to `## Target Heading`.
- [x] RED: clicking `[cross-file](Other.md#target-heading)` in `reading.md` should open `Other.md` and scroll to `## Target Heading`; current observed behavior opened `Other.md` without scrolling.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in `reading.md` opens `Other.md` and scrolls to `## Target Heading`.
- [x] GREEN: clicking `[external](https://example.com)` in `reading.md` is not intercepted by the plugin; observed browser opens.
- [x] GREEN: clicking `[[Wikilink]]` in `reading.md` is not intercepted by the plugin; observed native navigation to `Wikilink`.
- [x] GREEN: clicking `#reading-test-tag` in `reading.md` is not intercepted by the plugin; observed native search with `tag:#reading-test-tag`.

## Live Preview

- [x] RED: clicking `[same-file-2](#another-heading)` in `reading.md` should scroll to `## Another Heading`; before editor extension source fallback wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same-file-2](#another-heading)` in Live Preview scrolls to `## Another Heading`.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in Live Preview opens `Other.md` and scrolls to `## Target Heading`.
- [x] GREEN: clicking `[external](https://example.com)` in Live Preview is not intercepted by the plugin; observed browser opens.
- [x] GREEN: clicking `[[Wikilink]]` in Live Preview is not intercepted by the plugin; observed native navigation to `Wikilink`.
- [x] GREEN: clicking `#reading-test-tag` in Live Preview is not intercepted by the plugin; observed native tag behavior.

## Source Mode

- [x] GREEN: Ctrl-clicking `[same-file-2](#another-heading)` in Source mode scrolls to `## Another Heading`.
- [x] GREEN: middle-clicking `[same-file-2](#another-heading)` in Source mode opens one Live Preview tab and highlights heading with children; observed slight highlight latency.

## Step 7 Edge Cases

### Formatted Headings

- [x] GREEN: clicking `[bold](#bold-heading)` in `headings-formatted.md` scrolls to `## **Bold Heading**`.
- [x] GREEN: clicking `[italic](#italic-heading)` in `headings-formatted.md` scrolls to `## *Italic Heading*`.
- [x] GREEN: clicking `[code](#code-heading)` in `headings-formatted.md` scrolls to ``## `code()` Heading``.

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

- [ ] RED: clicking `[empty fragment](empty-fragment.md#)` in `empty-fragment.md` should open `empty-fragment.md` without scrolling.
- [ ] RED: clicking external links in `external.md` should use native external behavior and should not be intercepted.
- [ ] RED: clicking wikilinks or embeds in `wikilinks.md` should use native Obsidian behavior and should not be intercepted.

## Follow-Up Items

- Hover previews for same-file and cross-file GFM fragment links still use Obsidian's native preview path and can show unresolved fragment text, e.g. unable to find `"target-heading"`.
- Live Preview unrendered Ctrl-click acts on mouse button press rather than release in the callout fixture. Native Obsidian appears to open the new tab on release.
- Live Preview unrendered and Source mode middle-click show a notable visual flash in the new tab in the callout fixture, briefly appearing rendered, unrendered, then rendered. This has only been observed in `callout.md` so far. Treat this as a likely code/event-order bug, not just cosmetic polish.
- Source mode Ctrl-click acts on mouse button press rather than release in the callout fixture. Native Obsidian appears to place the cursor and highlight on release.
- Source mode middle-click has a noticeable delay before the new tab highlights the target heading plus children. Treat this as a likely event-order or retargeting timing issue.
