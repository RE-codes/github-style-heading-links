# QA Log

## Reading Mode

- [x] RED: clicking `[same-file](#target-heading)` in `reading.md` should scroll to `## Target Heading`; before reading-mode handler wiring, observed no plugin-handled scroll.
- [x] GREEN: clicking `[same-file](#target-heading)` in `reading.md` scrolls to `## Target Heading`.
- [x] RED: clicking `[cross-file](Other.md#target-heading)` in `reading.md` should open `Other.md` and scroll to `## Target Heading`; current observed behavior opened `Other.md` without scrolling.
- [x] GREEN: clicking `[cross-file](Other.md#target-heading)` in `reading.md` opens `Other.md` and scrolls to `## Target Heading`.
- [ ] FOLLOW-UP: hovering same-file or cross-file reading-mode links shows Obsidian's native preview popover with unresolved GFM fragment text, e.g. unable to find `"target-heading"`.
