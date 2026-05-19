# Observed Behavior Matrix

Date: 2026-04-28

## Purpose

This document consolidates the native-parity observations that were previously spread through `plan/QA-log.md` and commit history. Use it as the singular reference for expected behavior while designing `modePolicy.ts`, gesture state, and the editor-mode overhaul.

This is not a replacement for `plan/native-event-investigation.md`. This matrix records what has been observed at the user-behavior level. It does not prove which DOM event or workspace event drives native behavior.

## Legend

- **Native target**: Intended native Obsidian behavior recorded in QA.
- **Plugin observed**: Current plugin behavior recorded in QA.
- **MVP accepted**: Behavior differs from ideal native parity but is accepted for personal MVP.
- **Unknown**: Not fully verified in the QA log.
- **Public blocker**: Must be solved or documented before community/public release.
- **P1**: Highest priority MVP coverage.
- **P2a**: MVP fixture, slug, and container coverage that can be closed before the editor refactor.
- **P2b**: MVP source-mode parser coverage that should land after `linkExtraction.ts` is extracted.
- **P3**: Public-release readiness coverage.
- **P4**: Lowest priority public-release readiness or documentation coverage.

P1, P2a, and P2b items are considered MVP scope. P3 and P4 items are considered public-release readiness scope.

This matrix extends the original MVP plan. MVP completion means the remaining `plan/gfm-fragment-links-plan.md` gaps plus the P1/P2a/P2b rows here are complete, explicitly MVP accepted, or explicitly deferred with rationale. P3/P4 rows should be reevaluated after the native event investigation and editor refactor.

## Priority Taxonomy

P1 items protect the plugin's core promise and native non-disruption:

- Same-file and cross-file GFM fragments.
- File-only links.
- Missing file and missing heading behavior.
- Empty fragments.
- Encoded spaces in paths.
- Duplicate headings.
- Basic formatted headings already covered by current slug tests and QA.
- External links, wikilinks, embeds, and tags must remain native.
- Core containers already encountered in real QA: normal paragraphs, callouts, and tables.

P2a items cover common fixture, slug, and container cases that can be verified before the editor refactor:

- ATX headings with closing hashes.
- Setext headings.
- Headings with square brackets, parentheses, escaped punctuation, links, images, HTML/entities, strikethrough, non-ASCII text, and emoji.
- Links inside lists, task lists, and blockquotes.

P2b items cover common legal Markdown/GFM source-link forms that need parser work and should land after `linkExtraction.ts` is extracted:

- Inline links with titles.
- Angle-bracket link destinations, especially paths with spaces.
- Balanced and escaped parentheses in link destinations.
- Percent-encoded `#` in filenames and percent-encoded fragments.
- Link text with escaped brackets or matched nested brackets.

P3 items are public-release readiness:

- Reference, collapsed-reference, and shortcut-reference links.
- Raw HTML anchors.
- Full legal Markdown source-link parsing beyond the P2b inline-link subset, including reference and multiline forms.
- Context-menu support.
- Hover preview support.
- Split-pane source-path correctness.
- Mobile behavior, if support is restored after the MVP is marked desktop-only.

P4 items are lower-priority public-release polish or documentation:

- GFM extended autolinks and bare URL behavior beyond "do not intercept external links."
- GitHub issue/PR autolinks.
- Footnote-like or plugin-specific syntax if encountered.
- Punctuation-only or formatting-only headings.
- Exotic malformed Markdown behavior, unless Obsidian treats it as a navigable link.

## Core Gesture Matrix

| Mode | Surface | Gesture | Native target | Plugin observed | Status | Notes |
|---|---|---|---|---|---|---|
| Reading | Rendered link | Plain click | Navigate internally and highlight heading. | Matches native. | GREEN | Verified in ~~`reading.md`~~ `test-gfm.md` / `test-native.md`, `duplicates.md`, `callout.md`, `table.md`. |
| Reading | Rendered link | Ctrl/Cmd-click | Open new tab in Live Preview and highlight heading with children. | Matches native for first heading; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`. | MVP accepted | Duplicate child highlighting is public-release follow-up. |
| Reading | Rendered link | Middle-click | Same as Ctrl/Cmd-click. | Matches native for first heading; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`. | MVP accepted | Duplicate child highlighting is public-release follow-up. |
| Live Preview | Rendered link | Plain click | Navigate internally and highlight heading with children. | Matches native. | GREEN | In callout QA, native shows hover preview on mousedown and navigates/highlights on mouseup. |
| Live Preview | Rendered link | Ctrl/Cmd-click | Open one new tab and highlight heading with children. | Matches native for first heading; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`. | MVP accepted | Rendered Ctrl-click suppresses later native click. |
| Live Preview | Rendered link | Middle-click | Same as Ctrl/Cmd-click. | Matches native for first heading; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`. | MVP accepted | Rendered middle-click stores target on mousedown, navigates on mouseup, suppresses later auxclick. |
| Live Preview | Source text | Plain click | Place cursor only. | Matches native. | GREEN | Verified in duplicate and callout QA. |
| Live Preview | Source text | Ctrl/Cmd-click | Open new tab on mouse release, navigate to target heading, highlight heading plus children. | Matches native in the consolidated empty-fragment rows and `test-gfm.md` / `test-native.md`; slight visual glitch remains in callout fixture. | GREEN with public blocker | Recheck callout event timing before public release. |
| Live Preview | Source text | Middle-click | Open new tab, navigate to target heading, highlight heading plus children. | Matches native for MVP; slight highlight delay remains. | GREEN with public blocker | Current path retargets native new tab. |
| Source mode | Source text | Plain click | Place cursor only. | Matches native. | GREEN | Verified in duplicate and callout QA. |
| Source mode | Source text | Ctrl/Cmd-click | Navigate in same tab on mouse release and highlight heading plus children. | Matches native in the consolidated empty-fragment rows and `test-gfm.md` / `test-native.md`; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`. | MVP accepted | Duplicate child highlighting remains public-release follow-up. |
| Source mode | Source text | Middle-click | Open new tab in Live Preview and highlight heading plus children. | Matches native for MVP; duplicate fallback highlights heading only for `#foo-1` and `#foo-2`; slight highlight delay remains. | MVP accepted with public blocker | Retargeting delay should be investigated before public release. |

## Link Type Matrix

| Priority | Link type | Modes verified | Expected behavior | Observed behavior | Status | Notes |
|---|---|---|---|---|---|---|
| P1 | Same-file GFM fragment, e.g. `[x](#target-heading)` | Reading, Live Preview, Source | Navigate to matching GFM slug heading without intercepting native Markdown heading fragments. | Works in recorded QA, including paired `test-gfm.md` / `test-native.md` fixtures. | GREEN | Exact native heading matches remain native-handled, even when slug-shaped. |
| P1 | Cross-file GFM fragment, e.g. `[x](Other.md#target-heading)` | Reading, Live Preview, Source | Open target file and navigate to matching heading for activation gestures; plain Source mode click places the cursor only. | Works in recorded QA; fixture row consolidated into `test-gfm.md` / `test-native.md` with `Other.md` as target. Source mode click, Ctrl/Cmd-click, and middle-click match native behavior. | GREEN | Source mode Ctrl/Cmd-click opens the target in the same tab; middle-click opens a new Live Preview tab and has the existing slight highlight delay. |
| P1 | File-only link, e.g. `[x](Other.md)` | Reading, Live Preview rendered, Live Preview unrendered, Source | Native file open with native tab/cursor behavior and no plugin-imposed scroll target. | In `test-gfm.md` and `test-native.md`, plugin-on behavior matches plugin-off native behavior for click, Ctrl/Cmd-click, and middle-click after file-only links were handed back to Obsidian's native handler. | GREEN | Manual QA on Windows desktop Obsidian; macOS Cmd-click parity is inferred and deferred to future platform testing. |
| P1 | Missing file | Reading, Live Preview rendered, Live Preview unrendered, Source | Native missing-file behavior: activating a missing note link creates and opens the note, with mode/gesture-specific tab behavior. | In `test-gfm.md` and `test-native.md`, plugin-on behavior matches plugin-off native behavior for `[missing file](Missing.md)` and `[missing fragment](Missing.md#x)` across click, Ctrl/Cmd-click, and middle-click. Unit tests confirm handlers do not preventDefault when resolution returns null. | GREEN | Manual QA on Windows desktop Obsidian. |
| P1 | Existing file, missing heading | Reading, Live Preview rendered, Live Preview unrendered, Source | Open file with native mode/gesture tab behavior; no scroll; no visible error. | In `test-gfm.md` and `test-native.md`, plugin-on GFM behavior matches native missing-heading behavior across click, Ctrl/Cmd-click, and middle-click after Live Preview release-timing and follow-up click suppression fixes. | GREEN | Manual QA on Windows desktop Obsidian for Issue #14; resolver returns the file with `line: null`. |
| P1 | Empty fragment, e.g. `[x](file.md#)` | Reading, Live Preview, Source | Match native empty-fragment behavior with no scroll or visible error. | Works in recorded QA; fixture row is now consolidated into `test-gfm.md` / `test-native.md`. Ctrl-click release timing was fixed for rendered Live Preview, unrendered Live Preview, and Source mode. | GREEN | Hover-preview parity remains out of scope. |
| P1 | External schemes: `http`, `https`, `mailto`, `tel`, `obsidian`, `file`, protocol-relative `//example.com`, `data` | Reading, Live Preview rendered, Live Preview unrendered, Source | Native external behavior; plugin must not intercept. | In `test-gfm.md` and `test-native.md`, all listed schemes appear to use native external behavior for click, Ctrl/Cmd-click, and middle-click; no plugin navigation observed. Platform/app-specific handlers vary for `mailto:`, `tel:`, `file:`, and `data:`. | GREEN | Manual QA on Windows desktop Obsidian via dev vault; macOS/Linux validation deferred to real-world testing. |
| P1 | Wikilinks and embeds, e.g. `[[Note]]`, `[[Note#Heading]]`, `![[Note]]`, `![[image.png]]` | Reading, Live Preview rendered, Live Preview unrendered, Source | Native Obsidian behavior; plugin must not intercept. | `wikilinks.md` verifies native behavior for `[[Wikilink Target]]`, `[[Wikilink Target#Heading]]`, `![[Embedded Note]]`, and `![[image.png]]` across click, Ctrl/Cmd-click, and middle-click. | GREEN | Verified for Issue #11. |
| P1 | Tag link, e.g. `#reading-test-tag` | Reading, Live Preview | Native tag behavior. | Observed native tag behavior; fixture row consolidated into `test-gfm.md` / `test-native.md`. | GREEN | Source mode tag behavior not relevant to markdown link handler. |
| P1 | Encoded path, e.g. `[x](encoded%20path%20with%20spaces.md#h)` | Current file QA | Decode path and navigate to heading. | Works. | GREEN | Recorded in `encoded path with spaces.md`. |
| P2b | Inline link with title, e.g. `[x](Other.md#h "title")` | Not verified | Extract destination only and ignore title. | Current source regex likely mishandles this. | Unknown | Legal Markdown; implement after `linkExtraction.ts` extraction. |
| P2b | Angle-bracket destination, e.g. `[x](<Other File.md#h>)` | Not verified | Extract destination inside `<...>`, support spaces. | Not verified. | Unknown | CommonMark allows spaces only in angle-bracket destinations. |
| P2b | Balanced parentheses in destination, e.g. `[x](Other(foo).md#h)` | Not verified | Extract full destination. | Current source regex likely truncates. | Unknown | Legal Markdown when parentheses are balanced. |
| P2b | Escaped parentheses in destination, e.g. `[x](Other\(foo\).md#h)` | Not verified | Extract unescaped destination. | Not verified. | Unknown | Legal Markdown. |
| P2b | Percent-encoded `#` in filename, e.g. `[x](File%23Name.md#h)` | Not verified | Decode filename `#` without treating it as fragment delimiter. | Not verified. | Unknown | Parser currently splits before decoding, which is promising but unverified. |
| P2b | Percent-encoded fragment, e.g. `[x](Other.md#caf%C3%A9)` | Not verified | Decode fragment and match slug as appropriate. | Not verified. | Unknown | Needs fixture with non-ASCII heading/fragment. |
| P2b | Link text with escaped brackets, e.g. `[a \[b\]](#h)` | Not verified | Source detector should still identify href. | Current source regex likely fails or is fragile. | Unknown | Legal Markdown. |
| P2b | Link text with matched nested brackets, e.g. `[a [b]](#h)` | Not verified | Source detector should identify href. | Current source regex likely fails. | Unknown | Legal Markdown link text may contain matched bracket pairs. |

## Heading Target Matrix

| Priority | Heading case | Expected behavior | Observed behavior | Status | Notes |
|---|---|---|---|---|---|
| P1 | Plain heading | Navigate and highlight. | Works across core QA. | GREEN | Baseline case. |
| P1 | Formatted bold heading | Slug strips formatting and navigates. | Works for `## **Bold Heading**`. | GREEN | Fixture row consolidated into `test-gfm.md` / `test-native.md`. |
| P1 | Formatted italic heading | Slug strips formatting and navigates. | Works for `## *Italic Heading*`. | GREEN | Fixture row consolidated into `test-gfm.md` / `test-native.md`. |
| P1 | Code-formatted heading | Slug strips formatting and navigates. | Works for ``## `code()` Heading``. | GREEN | Fixture row consolidated into `test-gfm.md` / `test-native.md`. |
| P1 | Duplicate heading first occurrence | `#foo` lands on first heading. | Works and highlights heading plus children where native path is available. | GREEN | Verified in `duplicates.md`. |
| P1 | Duplicate heading second occurrence | `#foo-1` lands on second heading. | Works; often highlights heading only due to line fallback. | MVP accepted | Public-release follow-up. |
| P1 | Duplicate heading third occurrence | `#foo-2` lands on third heading. | Works; often highlights heading only due to line fallback. | MVP accepted | Public-release follow-up. |
| P2a | ATX heading with closing hashes, e.g. `## Heading ##` | Slug should be based on heading text, not closing marker. | Not explicitly verified. | Unknown | Obsidian metadata may normalize this; verify. |
| P2a | Setext heading | Slug should match heading text. | Not explicitly verified. | Unknown | Verify metadata heading cache behavior. |
| P2a | Heading with square brackets, e.g. `## API [v2]` | Match GFM slug for bracketed text. | Works in paired `test-gfm.md` / `test-native.md` fixtures; `github-slugger`, `slugify`, and `buildSlugTable` produce `api-v2`. | GREEN | Navigation reaches the correct heading; middle-click flicker/latency is tracked in the QA-log follow-up items. |
| P2a | Heading with parentheses, e.g. `## Function foo(bar)` | Match GFM slug. | Not verified. | Unknown | Common in technical docs. |
| P2a | Heading with escaped punctuation, e.g. `## Foo \\[bar\\]` | Match rendered/GFM heading text. | Works in paired `test-gfm.md` / `test-native.md` fixtures; `github-slugger`, `slugify`, and `buildSlugTable` produce `foo-bar` for the issue shape. | GREEN | Navigation reaches the correct heading; middle-click flicker/latency is tracked in the QA-log follow-up items. |
| P2a | Heading with link, e.g. `## See [docs](url)` | Slug uses link text. | Slug unit coverage exists for link stripping; manual QA not explicit. | Partial | Add fixture row. |
| P2a | Heading with image, e.g. `## ![alt](img.png) Title` | Slug should ignore or handle image consistently with GitHub. | Slug unit coverage exists for image stripping; manual QA not explicit. | Partial | Add fixture row. |
| P2a | Heading with HTML/entities, e.g. `## Fish &amp; Chips`, `## <code>x</code>` | Match GFM/Obsidian rendered heading text. | HTML tag stripping unit coverage exists; entities not explicit. | Partial | Add fixture row. |
| P2a | Heading with strikethrough, e.g. `## ~~Old~~ New` | Match GFM slug. | Not verified. | Unknown | GFM extension. |
| P2a | Heading with non-ASCII/accented text, e.g. `## Café` | Match GFM slug and URL-decoded fragment. | Not verified. | Unknown | Pair with percent-encoded fragment test. |
| P2a | Heading with emoji | Match GFM slug behavior. | Slug unit coverage exists for emoji. | Partial | Manual QA not explicit. |

## Container And Layout Matrix

| Priority | Container/layout | Modes verified | Expected behavior | Observed behavior | Status | Notes |
|---|---|---|---|---|---|---|
| P1 | Normal paragraph link | Reading, Live Preview, Source | Match native behavior by mode and gesture. | Works in recorded QA. | GREEN | Baseline path. |
| P1 | Callout link | Reading, Live Preview rendered/source text, Source | Match native behavior by mode and gesture. | Works, with visual glitch on Live Preview unrendered and Source middle-click. | GREEN with public blocker | Good regression fixture for event order. |
| P1 | Table cell link | Reading, Live Preview rendered, Source | Match native behavior and avoid table-cell source selection. | Works; rendered click blocks table-cell source selection on pointerdown and navigates on pointerup. | GREEN | Strong evidence raw capture may have been needed, pending tracer. |
| P2a | List item link | Not verified | Match native behavior by mode and gesture. | Not verified. | Unknown | Common document structure. |
| P2a | Task list item link | Not verified | Match native behavior by mode and gesture without toggling checkbox accidentally. | Not verified. | Unknown | GFM extension. |
| P2a | Blockquote link | Not verified | Match native behavior by mode and gesture. | Not verified. | Unknown | Similar to callouts but should be explicit. |
| P3 | Split panes | Not verified | Clicked editor should resolve source path from clicked file, not necessarily active file. | Not verified. | Public blocker | Investigation should compare `editorInfoField.file`, `workspace.getActiveFile()`, and active editor state. |

## P3 Public-Release Readiness Items

These are not MVP scope under the current priority split, but should be handled before a community/public release or documented as limitations.

| Area | Item | Why it matters |
|---|---|---|
| Source parser | Reference links: `[x][ref]` with `[ref]: Other.md#h` | Legal Markdown and common in longer documents. |
| Source parser | Collapsed reference links: `[x][]` | Legal Markdown. |
| Source parser | Shortcut reference links: `[x]` | Legal Markdown, but harder to distinguish from ordinary bracketed text without parser support. |
| Source parser | Multiline whitespace/title forms allowed by Markdown | Legal Markdown; current line-based detector is insufficient. |
| Rendered/native integration | Raw HTML anchors: `<a href="#h">x</a>` | May appear in GitHub-authored docs; Reading/Live Preview rendered paths may already see anchors, Source mode needs investigation. |
| Native integration | Context menu "Open in new tab/right" | Known public blocker. |
| Native integration | Hover preview | Known public blocker. |
| Workspace | Split panes | Deferred to public release; likely solved by editor-local context. |
| Platform | Mobile behavior | Personal MVP should set `isDesktopOnly: true`; mobile is only relevant if support is restored later. |

## P4 Lower-Priority Readiness Items

These should not block MVP and probably should not block an initial public release unless users report them or implementation is cheap.

| Area | Item | Why lower priority |
|---|---|---|
| Autolinks | GFM extended autolinks and bare URLs | Plugin should usually ignore as external/native; not central to heading fragments. |
| GitHub-specific autolinks | Issue/PR references like `#123`, `owner/repo#123` | GitHub UI feature, not generally meaningful in Obsidian vault navigation. |
| Plugin-specific syntax | Footnote-like or third-party plugin link syntax | Out of scope until encountered. |
| Edge heading content | Punctuation-only or formatting-only headings | Rare and can be documented unless real docs need it. |
| Malformed Markdown | Exotic malformed link syntax | Match Obsidian/native behavior where practical, but do not design around invalid input first. |

## Event Timing And Suppression Matrix

This section captures observed/inferred event contracts. It is lower-confidence than the behavior matrices above.

| Surface | Gesture | Current plugin contract | Native observation from QA | Confidence | Follow-up |
|---|---|---|---|---|---|
| Live Preview rendered | Plain click | Resolve rendered anchor on pointerdown, suppress source/table selection, navigate on pointerup, suppress later click. | Callout QA says native shows hover preview on mousedown and navigates/highlights on mouseup. | Medium | Confirm with event tracer. |
| Live Preview rendered | Ctrl/Cmd-click | Same rendered path, open one new tab, suppress later native click. | Native opens one new tab and highlights. | Medium | Confirm exact driver event. |
| Live Preview rendered | Middle-click | Store target on mousedown, navigate on mouseup, suppress later auxclick. | Native same as Ctrl-click. | Medium | Confirm auxclick order. |
| Live Preview source text | Plain click | Do not navigate; allow cursor placement. | Native places cursor. | High | Preserve. |
| Live Preview source text | Ctrl/Cmd-click | Navigate from markdown source link. | Native appears to open on release; plugin currently acts on press. | Medium | Public-release blocker. |
| Live Preview source text | Middle-click | Suppress duplicate source handling and retarget native new tab. | Native opens new tab; plugin has visual flash in callout. | Medium | Public-release blocker. |
| Source mode source text | Plain click | Do not navigate; allow cursor placement. | Native places cursor. | High | Preserve. |
| Source mode source text | Ctrl/Cmd-click | Navigate from markdown source link in same tab. | Native appears to complete on release; plugin acts on press. | Medium | Public-release blocker. |
| Source mode source text | Middle-click | Retarget native new tab after it is created. | Native opens Live Preview tab; plugin has delay/flash. | Medium | Measure repeated samples before accepting for MVP; public-release blocker. |

## Context Menu And Hover Matrix

| Feature | Observed behavior | Status | Notes |
|---|---|---|---|
| Hover preview for same-file/cross-file GFM fragments | Native preview path can show unresolved fragment text, e.g. unable to find `"target-heading"`. | Public blocker | May require separate preview hook or documented limitation. |
| Context menu "Open in new tab" | On rendered Live Preview GFM fragment links, opens target file but does not navigate/highlight target heading. | Public blocker | Scope across modes and fixtures not yet verified. |
| Context menu "Open to the right" | Same known issue as open in new tab for rendered Live Preview link. | Public blocker | Needs native event investigation. |

## MVP Completion Gaps

The following rows are not complete enough to rely on:

1. ~~Empty fragment behavior across modes.~~ Closed by recorded QA; fixture rows consolidated into `test-gfm.md` / `test-native.md`.
2. ~~External scheme rows in `test-gfm.md` and `test-native.md` across modes.~~ Closed by recorded QA for Issue #10.
3. ~~Wikilink/embed fixture across modes.~~ Closed by recorded QA in `wikilinks.md`.
4. ~~Source-mode cross-file GFM fragment behavior.~~ Closed by recorded QA for Issue #15 in `test-gfm.md` / `Other.md`.
5. ~~File-only link behavior.~~ Closed by recorded QA for Issue #12 in `test-gfm.md` / `test-native.md`.
6. ~~Missing file and missing heading behavior.~~ Missing-file behavior closed by recorded QA for Issue #13; missing-heading behavior closed by recorded QA for Issue #14 in `test-gfm.md` / `test-native.md`.
7. P2a heading target styles.
8. P2a list/task-list/blockquote containers.
9. P2b legal inline-link forms in Source mode after `linkExtraction.ts` extraction.

## Public-Release Readiness Gaps

The following rows are intentionally outside MVP scope but should be revisited after the native event investigation and editor refactor:

1. Split-pane source-path correctness.
2. Context menu behavior outside the one rendered Live Preview observation.
3. Hover preview behavior across all modes/surfaces.
4. Mobile behavior.
5. P3/P4 source-link parsing and syntax edge cases.

## How To Use This Matrix

Use this document to seed:

- `modePolicy.ts` expected behavior.
- Gesture characterization tests.
- Manual QA checklists.
- Public-release blocker tracking.

Use `plan/native-event-investigation.md` to fill in:

- Exact event driver.
- Event phase.
- Workspace event order.
- Supported source-path and leaf APIs.
- Feasibility of context menu and hover preview support.
