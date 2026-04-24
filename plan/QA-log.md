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
- Middle-click highlighting has a slight but noticeable delay because the plugin waits for Obsidian's native new tab/leaf before retargeting it to the exact heading.

## Reading Mode

- [x] RED: clicking `[same-file](#target-heading)` in `reading.md` should scroll to `## Target Heading`; before reading-mode handler wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same-file](#target-heading)` in `reading.md` scrolls to `## Target Heading`.
- [x] RED: clicking `[cross-file](Other.md#target-heading)` in `reading.md` should open `Other.md` and scroll to `## Target Heading`; current observed behavior opened `Other.md` without scrolling.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in `reading.md` opens `Other.md` and scrolls to `## Target Heading`.
- [x] GREEN: clicking `[external](https://example.com)` in `reading.md` is not intercepted by the plugin; observed browser opens.
- [x] GREEN: clicking `[[Wikilink]]` in `reading.md` is not intercepted by the plugin; observed native navigation to `Wikilink`.
- [x] GREEN: clicking `#reading-test-tag` in `reading.md` is not intercepted by the plugin; observed native search with `tag:#reading-test-tag`.
- [ ] FOLLOW-UP: hovering same-file or cross-file reading-mode links shows Obsidian's native preview popover with unresolved GFM fragment text, e.g. unable to find `"target-heading"`.

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
