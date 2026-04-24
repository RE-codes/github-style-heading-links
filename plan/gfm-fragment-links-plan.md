# GFM Fragment Links — Obsidian Plugin (MVP)

- [GFM Fragment Links — Obsidian Plugin (MVP)](#gfm-fragment-links--obsidian-plugin-mvp)
  - [Context](#context)
  - [Community Plugin Hardening](#community-plugin-hardening)
  - [Architecture Summary](#architecture-summary)
  - [Repo Layout](#repo-layout)
  - [Module Contracts](#module-contracts)
    - [`src/slug.ts`](#srcslugts)
    - [`src/linkParser.ts`](#srclinkparserts)
    - [`src/resolver.ts`](#srcresolverts)
    - [`src/readingModeHandler.ts`](#srcreadingmodehandlerts)
    - [`src/editorModeHandler.ts`](#srceditormodehandlerts)
    - [`src/main.ts`](#srcmaints)
  - [Implementation Steps (strict TDD)](#implementation-steps-strict-tdd)
    - [Step 1 — Scaffold (XS, ~30 min)](#step-1--scaffold-xs-30-min)
    - [Step 2 — `slug.ts` via TDD (M, ~2 h)](#step-2--slugts-via-tdd-m-2-h)
    - [Step 3 — `linkParser.ts` via TDD (S, ~1 h)](#step-3--linkparserts-via-tdd-s-1-h)
    - [Step 4 — `resolver.ts` via TDD with mocked `App` (M, ~2 h)](#step-4--resolverts-via-tdd-with-mocked-app-m-2-h)
    - [Step 5 — Reading mode handler via fixture-first TDD (M, ~2 h)](#step-5--reading-mode-handler-via-fixture-first-tdd-m-2-h)
    - [Step 6 — Editor mode handler via fixture-first TDD (L, ~4 h)](#step-6--editor-mode-handler-via-fixture-first-tdd-l-4-h)
    - [Step 7 — Edge-case sweep via fixture-first TDD (M, ~2 h)](#step-7--edge-case-sweep-via-fixture-first-tdd-m-2-h)
    - [Step 8 — Non-disruption audit (S, ~1 h)](#step-8--non-disruption-audit-s-1-h)
    - [Step 9 — Final manual QA matrix (S, ~1 h)](#step-9--final-manual-qa-matrix-s-1-h)
    - [Step 10 — README (XS, ~15 min)](#step-10--readme-xs-15-min)
  - [Edge Cases \& Expected Behavior](#edge-cases--expected-behavior)
  - [QA Matrix](#qa-matrix)
  - [Non-Disruption Checks](#non-disruption-checks)
  - [Risk Callouts](#risk-callouts)
  - [Critical Files](#critical-files)
  - [Verification (end-to-end)](#verification-end-to-end)

## Context

**Problem.** You author markdown in VS Code and GitHub, where intra-file heading links use kebab-case slugs:

- `[title](#kebab-case-heading)` — jump within file
- `[title](Relative%20Path%20To%20File.md#kebab-case-heading)` — cross-file with fragment
- `[title](Relative%20Path%20To%20File.md)` — cross-file, no fragment

Obsidian resolves the file-only form, but **does not resolve kebab-case heading fragments** — it expects its own `#Exact Heading Name` format. Clicking a GFM-style fragment link in Obsidian silently fails or opens the file without scrolling.

**Intended outcome.** A personal-use Obsidian plugin that makes the three GFM link styles above resolve and navigate correctly in **Reading mode, Live Preview, and Source mode**, without breaking Obsidian's native wikilinks, backlinks, graph view, or tag handling.

**Ecosystem check.** As of 2026-04-19, no existing Obsidian community plugin solves this. `jerry-sky/obsidian-link-adapter-plugin` does format conversion only; the open feature request [forum.obsidian.md/t/30350](https://forum.obsidian.md/t/support-gfm-style-kebab-case-heading-slug-anchor-targets/30350) has been unresolved since Jan 2022. This is novel work.

**Scope boundary.** MVP only. TOC generation and Obsidian↔GFM link conversion are deferred to a later plan.

---

## Community Plugin Hardening

If this moves from personal-use MVP toward Obsidian Community plugin submission, pause after Step 6 and harden before broad release:

- Replace or strengthen the editor-mode markdown-link extractor. The current line regex is acceptable for MVP TDD, but public release should handle escaped brackets, parentheses in URLs, multiple links per line, and other common Markdown edge cases. Prefer CodeMirror/Lezer syntax-tree link detection if Obsidian exposes a reliable parser state.
- Confirm source-path correctness for editor extensions. `workspace.getActiveFile()` is pragmatic for active editor clicks, but split panes and multiple Markdown views should be tested. Prefer an exact editor-to-file association if available.
- Add focused handler tests for event prevention, modifier/middle-click `newLeaf`, missing targets, unresolved fragments, native external/wiki/tag behavior, and Source mode fallback behavior.
- Expand manual QA across Reading mode, Live Preview, Source mode, duplicate headings, formatted headings, URL-encoded paths, file-only links, missing files/headings, and Windows/macOS/Linux path sensitivity expectations.
- Investigate hover preview popovers. If Obsidian's native preview still shows unresolved GFM fragments, either support that path or document the limitation clearly before release.
- Prepare Community plugin release materials: README usage/limitations, versioning, manifest fields, release artifacts, and compatibility notes.

---

## Architecture Summary

| Concern | API |
|---|---|
| Heading slugification (authoritative) | `github-slugger` v2.0.0 — stateful per file for `-1`, `-2` collision suffixes. Strip markdown before passing. |
| Reading mode link handling | `registerMarkdownPostProcessor((el, ctx) => ...)` — walks rendered `<a>` tags per block |
| Live Preview + Source mode link handling | `registerEditorExtension(ViewPlugin)` — CM6 extension; capture-phase `mousedown` on `view.dom` |
| Cross-file navigation | `workspace.openLinkText(pathOrLinkpath, sourcePath, newLeaf?)` — pass URL-decoded path |
| File resolution | `metadataCache.getFirstLinkpathDest(linkpath, sourcePath)` — case-insensitive on Windows/macOS, case-sensitive on Linux |
| Heading list for target file | `metadataCache.getFileCache(file)?.headings` — `HeadingCache[]` with `position.start.line` |
| Scroll to heading | `MarkdownView.setEphemeralState({ line })` after `openLinkText` resolves |

**Resolution algorithm:**

```
onLinkClick(href, sourcePath, event):
  parsed = parseHref(href)                      // split on first #, URL-decode
  if parsed.isExternal: return                  // untouched
  targetFile = parsed.pathPart
    ? metadataCache.getFirstLinkpathDest(parsed.pathPart, sourcePath)
    : activeFile
  if !targetFile: return                        // let Obsidian handle the miss
  event.preventDefault(); event.stopPropagation()
  newLeaf = event.ctrlKey || event.metaKey || event.button === 1
  await workspace.openLinkText(targetFile.path, sourcePath, newLeaf)
  if parsed.fragment:
    headings = metadataCache.getFileCache(targetFile)?.headings ?? []
    slugs = buildSlugTable(headings.map(h => h.heading))   // stateful github-slugger
    idx = slugs.indexOf(parsed.fragment)
    if idx >= 0:
      workspace.getActiveViewOfType(MarkdownView)
        ?.setEphemeralState({ line: headings[idx].position.start.line })
```

---

## Repo Layout

Create under `path\to\project\gfm-fragment-links\`:

```
gfm-fragment-links/
├── manifest.json              # id=gfm-fragment-links, name="GFM Fragment Links",
│                              #  version=0.1.0, minAppVersion=1.11.0,
│                              #  description, author, isDesktopOnly=false
├── versions.json              # { "0.1.0": "1.11.0" }
├── package.json               # deps: github-slugger ^2.0.0
│                              # devDeps: obsidian, typescript 5.8.3, esbuild 0.25.5,
│                              #          vitest, @types/node, @codemirror/view,
│                              #          @codemirror/state (peer)
├── tsconfig.json              # target ES2022, module ESNext, strict
├── esbuild.config.mjs         # bundles src/main.ts → main.js (cjs, external:
│                              #   obsidian, electron, @codemirror/*, @lezer/*)
├── styles.css                 # empty placeholder
├── .gitignore                 # node_modules, main.js, *.js.map, data.json, .DS_Store
├── README.md                  # install + usage
├── vitest.config.ts
└── src/
    ├── main.ts                # plugin entry, wiring
    ├── slug.ts                # pure: heading text → GFM slug
    ├── linkParser.ts          # pure: href → ParsedLink
    ├── resolver.ts            # Obsidian-aware: ParsedLink → ResolvedTarget
    ├── readingModeHandler.ts  # post-processor factory
    ├── editorModeHandler.ts   # CM6 ViewPlugin factory
    └── __tests__/
        ├── slug.test.ts
        ├── linkParser.test.ts
        └── fixtures/          # .md vault fixtures for manual QA
```

**Seed from** [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) (TS 5.8.3, esbuild 0.25.5). Rename, strip the sample's demo command/ribbon code.

---

## Module Contracts

### `src/slug.ts`
```ts
export function stripMarkdown(raw: string): string;
// Removes in order: code spans (` ... `), images (![..](..)), links ([text](url) → text),
// HTML tags (<...>), bold/italic markers (** _ *), leading # chars, trim.
// Order matters — code spans first so backticks don't confuse later passes.

export function slugify(raw: string): string;
// Convenience: stripMarkdown then new GithubSlugger().slug(...). No collision tracking.

export function buildSlugTable(headings: string[]): string[];
// Fresh GithubSlugger instance; map headings in order; returns slug[] with -N suffixes.

export function findHeadingIndexBySlug(slugs: string[], target: string): number;
// Returns first index or -1.
```
**Unit tests:** formatted headings (`## **Bold**`, `## \`code()\``, `## [link](url)`), duplicates (`["Foo","Foo","Foo"]` → `["foo","foo-1","foo-2"]`), interspersed dups (`["Foo","Bar","Foo"]` → `["foo","bar","foo-1"]`), emoji (`## 😄 hi` → strips emoji), empty string, punctuation-only.

### `src/linkParser.ts`
```ts
export interface ParsedLink {
  raw: string;
  pathPart: string;            // URL-decoded; "" for intra-doc fragment links
  fragment: string | null;     // URL-decoded; null if no '#' or empty after '#'
  isExternal: boolean;         // http(s), mailto, obsidian, tel, data, file:
  isAnchorOnly: boolean;       // href starts with '#'
}

export function parseHref(href: string): ParsedLink;
// Split on first '#'. decodeURIComponent each half inside try/catch — malformed
// encoding falls back to raw string. External scheme test:
//   /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
```
**Unit tests:** `#slug`, `file.md`, `file.md#slug`, `Sub%20Dir/File.md#a-b`,
`https://x`, `mailto:a@b`, `obsidian://...`, `file.md#` (empty fragment),
`#` only, empty string, `%ZZ` (malformed → raw).

### `src/resolver.ts`
```ts
import type { App, TFile } from "obsidian";
import type { ParsedLink } from "./linkParser";

export interface ResolvedTarget {
  file: TFile;
  line: number | null;   // null when fragment missing or not found
}

export class LinkResolver {
  constructor(private app: App) {}
  resolve(parsed: ParsedLink, sourcePath: string): ResolvedTarget | null;
}
```
- If `parsed.pathPart === ""` → use `app.vault.getAbstractFileByPath(sourcePath)`.
- Else `app.metadataCache.getFirstLinkpathDest(parsed.pathPart, sourcePath)`.
- If `parsed.fragment` set, read `getFileCache(file)?.headings`; build slug table; find line.

### `src/readingModeHandler.ts`
```ts
import type { App, MarkdownPostProcessorContext } from "obsidian";
import { LinkResolver } from "./resolver";

export function createReadingModeHandler(
  app: App,
  resolver: LinkResolver,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
```
- Query `el.querySelectorAll("a")`.
- **Read href carefully**: prefer `a.getAttribute("data-href")` (Obsidian's original), fall back to `a.getAttribute("href")`. Obsidian sometimes rewrites `href` to `app://...` or `#`.
- Skip if `a.classList.contains("tag")` (tag links are `<a class="tag">`).
- Skip `isExternal` parsed results.
- Attach `click` listener with `{ capture: true }`; inside: `e.preventDefault(); e.stopPropagation();` resolve, call `onNavigate`.

### `src/editorModeHandler.ts`
```ts
import { Extension } from "@codemirror/state";
import { ViewPlugin, EditorView } from "@codemirror/view";
import type { App } from "obsidian";
import { LinkResolver } from "./resolver";

export function createEditorExtension(
  app: App,
  resolver: LinkResolver,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): Extension;
```
Two detection paths inside one `mousedown` handler on `view.dom`:

1. **Live Preview** (rendered `<a>`): `target.closest("a")` returns a link element. Read `data-href` then `href`. Parse and resolve. If external/tag → bail. Else handle.
2. **Source mode** (plain text): no `<a>` ancestor. Use `view.posAtDOM(target)` to map DOM → offset; read line text via `view.state.doc.lineAt(pos)`; regex-scan for markdown links `/\[[^\]]*\]\(([^)]+)\)/g` (use `matchAll` with exec-style offsets); find the match whose captured-group range covers `pos`; extract href. Parse and resolve.

In both paths, on match: `event.preventDefault(); event.stopPropagation();` and invoke `onNavigate`. Use `event.ctrlKey || event.metaKey || event.button === 1` for newLeaf.

Prefer `EditorView.domEventHandlers({ mousedown(e, v) { ...; return true; } })` over raw `addEventListener` — CM6 respects `return true` as "handled" and will not run default.

### `src/main.ts`
```ts
import { MarkdownView, Plugin } from "obsidian";
import { LinkResolver, ResolvedTarget } from "./resolver";
import { createReadingModeHandler } from "./readingModeHandler";
import { createEditorExtension } from "./editorModeHandler";

export default class GfmFragmentLinksPlugin extends Plugin {
  async onload() {
    const resolver = new LinkResolver(this.app);
    const nav = (t: ResolvedTarget, newLeaf: boolean) => this.navigate(t, newLeaf);
    this.registerMarkdownPostProcessor(createReadingModeHandler(this.app, resolver, nav));
    this.registerEditorExtension(createEditorExtension(this.app, resolver, nav));
  }

  private async navigate(t: ResolvedTarget, newLeaf: boolean) {
    await this.app.workspace.openLinkText(t.file.path, "", newLeaf);
    if (t.line != null) {
      this.app.workspace.getActiveViewOfType(MarkdownView)
        ?.setEphemeralState({ line: t.line });
    }
  }
}
```

---

## Implementation Steps (strict TDD)

**TDD discipline — non-negotiable:**

1. **RED** — Write a failing test that describes one new behavior. Run it. Confirm it fails for the *right reason* (assertion mismatch, not a syntax or import error).
2. **GREEN** — Write the *minimum* production code needed to make that one test pass. No speculative code. No "while I'm here" additions. Re-run the test. Confirm green.
3. **REFACTOR** — Clean up the code (rename, extract, dedupe). Re-run the full test suite. Still green. Commit.
4. Repeat. One test at a time. **Never** write implementation code without a failing test pointing at it.

Rules that apply throughout:
- **No implementation file exists before its first test file exists.** Create `slug.test.ts` before `slug.ts`; the first failing test is "import fails / symbol undefined," which is acceptable RED.
- **One assertion per cycle.** If a test needs three assertions, write-pass-commit each one before moving on.
- **Integration/manual steps use a fixture-first analog of TDD:** write the fixture file + expected behavior note in a checklist BEFORE wiring code; observe the failure in Obsidian manually (the RED); implement; observe the GREEN; commit.
- **Commit after every GREEN** with an imperative-mood, ≤50-char subject (e.g., `add slug for plain ascii heading`, `strip code spans before slugify`). Per global prefs: no trailing period, no co-author lines.
- **Do not batch failures.** If a new test breaks a previously-green test, revert to last green commit and take smaller steps.
- **Bail out rule:** if you spend >20 min in RED on one test, the test is too big. Split it.

### Step 1 — Scaffold (XS, ~30 min)

Non-TDD bootstrap. Produces the environment that every subsequent RED test runs in.

- Clone `obsidian-sample-plugin` into `path\to\project\gfm-fragment-links`.
- Update `manifest.json`, `package.json` name/description, `versions.json`.
- `npm install`; `npm install github-slugger@^2.0.0`; `npm install -D vitest @vitest/ui`.
- Add `vitest.config.ts` with `test: { environment: "node", include: ["src/**/*.test.ts"] }` and an alias stub for the `obsidian` module (a file exporting `{}` typed as the API surface you mock). See Step 4 for the stub shape.
- Add npm scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"dev": "node esbuild.config.mjs"`, `"build": "tsc --noEmit && node esbuild.config.mjs production"`.
- Create empty skeleton: `src/main.ts` containing the minimal no-op `export default class GfmFragmentLinksPlugin extends Plugin { async onload() {} }`. Nothing else in `src/` yet.
- Symlink vault → project (admin `cmd.exe`):
  `mklink /D "C:\path\to\vault\.obsidian\plugins\gfm-fragment-links" "C:\path\to\project\gfm-fragment-links"`
  (MSYS2 `ln -s` works only with Developer Mode enabled.)
- Actual environment note: when the repo lives on the WSL filesystem and Obsidian runs as a native Windows app against a Windows vault, a vault plugin symlink pointing from Windows into the WSL filesystem can fail with `EACCES` during Obsidian startup. Step 1 was completed by replacing the symlink with a real plugin directory under the vault and copying `manifest.json`, `main.js`, and `styles.css` into it. Future automation should sync or copy artifacts from WSL into the Windows vault instead of symlinking across that boundary.
- `npm run dev`; enable in Obsidian → Settings → Community Plugins.
- **Acceptance:** "GFM Fragment Links" appears enabled; console shows `loading plugin: gfm-fragment-links`; `npm test` runs and reports *zero tests* (not a failure).
- **Commit:** `scaffold obsidian plugin skeleton`.

### Step 2 — `slug.ts` via TDD (M, ~2 h)

Build slugifier one behavior at a time. Each substep = one RED→GREEN→commit cycle. Do not skip ahead to later substeps until the current one is green.

Create `src/__tests__/slug.test.ts` first. Work down the list:

| # | RED test (one `it(...)` block) | Minimum GREEN impl |
|---|---|---|
| 2.1 | `slugify("Hello World") === "hello-world"` | Wrap `github-slugger`'s stateless `slug`. Nothing else. |
| 2.2 | `slugify("Foo: Bar!") === "foo-bar"` | Already works — verify, commit. |
| 2.3 | `slugify("**Bold** text") === "bold-text"` | Add `stripMarkdown`; strip `**` pairs; call before slug. |
| 2.4 | `slugify("*em* text") === "em-text"` | Extend strip to `*` pairs. |
| 2.5 | `slugify("\`code()\` x") === "code-x"` | Extend strip to code spans. Put code-span strip FIRST in pipeline (backticks confuse later passes if left). |
| 2.6 | `slugify("[title](url) y") === "title-y"` | Strip markdown links to their text. |
| 2.7 | `slugify("![alt](img) z") === "z"` | Strip images entirely. |
| 2.8 | `slugify("<em>x</em> y") === "x-y"` | Strip HTML tags. |
| 2.9 | `slugify("## Foo") === "foo"` | Strip leading `#` chars + whitespace. |
| 2.10 | `slugify("😄 hi") === "-hi"` (github-slugger behavior) | No change — github-slugger already handles. Confirm. |
| 2.11 | `buildSlugTable(["Foo"]) equals ["foo"]` | Introduce `buildSlugTable`; fresh `new GithubSlugger()`; map. |
| 2.12 | `buildSlugTable(["Foo","Foo"]) equals ["foo","foo-1"]` | Already works via slugger state — confirm. |
| 2.13 | `buildSlugTable(["Foo","Bar","Foo"]) equals ["foo","bar","foo-1"]` | Confirm interspersed dups. |
| 2.14 | `buildSlugTable(["**Foo**","Foo"]) equals ["foo","foo-1"]` | Confirm strip runs before slugger sees text. |
| 2.15 | `findHeadingIndexBySlug(["foo","foo-1"],"foo-1") === 1`; `findHeadingIndexBySlug(["foo"],"bar") === -1` | Trivial indexOf; commit. |

- **Acceptance:** `npm test` green; 15+ tests; `src/slug.ts` exports `stripMarkdown`, `slugify`, `buildSlugTable`, `findHeadingIndexBySlug`.
- **Refactor pass** at the end: extract regex passes into a named array; no behavior change; tests still green.

### Step 3 — `linkParser.ts` via TDD (S, ~1 h)

Create `src/__tests__/linkParser.test.ts` first.

| # | RED test | Minimum GREEN impl |
|---|---|---|
| 3.1 | `parseHref("#foo")` → `{pathPart:"", fragment:"foo", isExternal:false, isAnchorOnly:true}` | Split on first `#`; check `raw[0]==="#"`. |
| 3.2 | `parseHref("file.md")` → `{pathPart:"file.md", fragment:null, ...}` | No `#` → `fragment:null`. |
| 3.3 | `parseHref("file.md#bar")` → `{pathPart:"file.md", fragment:"bar", ...}` | Split on first `#`. |
| 3.4 | `parseHref("Sub%20Dir/F.md#a-b")` → `{pathPart:"Sub Dir/F.md", fragment:"a-b", ...}` | `decodeURIComponent` both halves. |
| 3.5 | `parseHref("https://x.com")` → `{isExternal:true, ...}` | Regex `/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i`. |
| 3.6 | `parseHref("mailto:a@b")` → `{isExternal:true}` | Same regex catches it. |
| 3.7 | `parseHref("obsidian://open?...")` → `{isExternal:true}` | Same. |
| 3.8 | `parseHref("file.md#")` → `{fragment:null}` | Empty after `#` → null, not `""`. |
| 3.9 | `parseHref("#")` → `{fragment:null, isAnchorOnly:true}` | Same empty-fragment rule. |
| 3.10 | `parseHref("")` → `{pathPart:"", fragment:null, isExternal:false, isAnchorOnly:false}` | Handle empty input. |
| 3.11 | `parseHref("%ZZ")` → `{pathPart:"%ZZ"}` (no throw) | Wrap `decodeURIComponent` in try/catch. |

- **Acceptance:** 11 tests green; commit each.

### Step 4 — `resolver.ts` via TDD with mocked `App` (M, ~2 h)

The `obsidian` module is not importable at unit-test time (it's types-only). Mock it.

First, create `src/__tests__/helpers/obsidianMock.ts` exporting a factory:

```ts
export function makeApp({
  filesByPath = new Map<string, { path: string }>(),
  linkpathResolver = (linkpath: string, src: string) => filesByPath.get(linkpath) ?? null,
  headingsByPath = new Map<string, { heading: string; position: { start: { line: number } } }[]>(),
}) {
  return {
    vault: {
      getAbstractFileByPath: (p: string) => filesByPath.get(p) ?? null,
    },
    metadataCache: {
      getFirstLinkpathDest: linkpathResolver,
      getFileCache: (f: { path: string }) => ({
        headings: headingsByPath.get(f.path) ?? [],
      }),
    },
  } as any; // cast to App
}
```

Then `src/__tests__/resolver.test.ts`:

| # | RED test | GREEN impl |
|---|---|---|
| 4.1 | Intra-doc: `pathPart:""`, sourcePath has heading `## Foo`; resolver returns `{file, line}` where line = that heading's line | Build resolver; when pathPart="", use `getAbstractFileByPath(sourcePath)`. |
| 4.2 | Cross-doc both exist: resolver returns `{file: other, line: N}` | Call `getFirstLinkpathDest` then read cache headings. |
| 4.3 | File missing: resolver returns `null` | `getFirstLinkpathDest` null → return null. |
| 4.4 | File exists, heading missing: `{file, line: null}` | After slug match returns -1, `line:null`. |
| 4.5 | Fragment null: `{file, line: null}` | Skip heading lookup when `fragment==null`. |
| 4.6 | Duplicate heading `#foo-2` matches 3rd occurrence | Uses `buildSlugTable` from slug.ts; index 2 → headings[2].position.start.line. |
| 4.7 | Formatted heading `## **Bold**` resolves via `#bold` | Confirms markdown-strip runs via slug.ts. |

- **Acceptance:** 7 tests green. Resolver has no direct dependency on `slug.ts` internals beyond the exported functions.
- **Commit cadence:** one commit per test.

### Step 5 — Reading mode handler via fixture-first TDD (M, ~2 h)

Unit-testing `registerMarkdownPostProcessor` inside Vitest is brittle — the handler takes an `HTMLElement` produced by Obsidian's renderer. Use a hybrid: **unit test the pure click-intent function; fixture-test the DOM wiring manually.**

**5a — Pure `decideAction(anchor) → Action` (S, ~45 min):**

Extract the per-anchor decision as a pure function:

```ts
type Action =
  | { kind: "ignore" }         // external, tag, wikilink without .md, empty href
  | { kind: "resolve"; href: string };

export function decideAction(a: HTMLAnchorElement): Action;
```

TDD cycles (build JSDOM anchors in tests):

| # | RED test | GREEN impl |
|---|---|---|
| 5a.1 | `<a href="https://x">` → `{kind:"ignore"}` | Check external via parseHref. |
| 5a.2 | `<a class="tag" href="#tag">` → `{kind:"ignore"}` | classList.contains("tag"). |
| 5a.3 | `<a data-href="#foo" href="#">` → `{kind:"resolve", href:"#foo"}` | Prefer data-href over href. |
| 5a.4 | `<a href="file.md#bar">` → `{kind:"resolve", href:"file.md#bar"}` | Fall back to href. |
| 5a.5 | `<a href="">` → `{kind:"ignore"}` | Empty string bail. |

Add `happy-dom` to vitest env for these tests (`npm install -D happy-dom`, set `test.environment: "happy-dom"` in a per-file `// @vitest-environment happy-dom` header).

**5b — Fixture-first manual TDD (S, ~1 h):**

Create `src/__tests__/fixtures/reading.md`:

```markdown
## Target Heading

[same-file](#target-heading)
[cross-file](Other.md#target-heading)
[external](https://example.com)
[[Wikilink]]
```

Create `Other.md` with matching heading.

TDD loop per fixture row:
1. **RED:** write a row in a `QA-log.md` scratch file: "clicking [same-file] should scroll to ## Target Heading". Without handler wired, click → nothing. Observed.
2. **GREEN:** wire `createReadingModeHandler` in `main.ts` incrementally. Smallest step first: only handle `#`-only fragment. Click → scrolls. Commit.
3. Next row. **RED:** click cross-file link → nothing. **GREEN:** add cross-file branch. Commit.
4. Continue through external (must not intercept), wikilink (must not intercept).

- **Acceptance:** QA rows 1–6 pass in Reading mode; unit tests still green.

### Step 6 — Editor mode handler via fixture-first TDD (L, ~4 h)

Same hybrid pattern. Extract pure functions first; fixture-test wiring.

**6a — Pure `findLinkAtPos(lineText, charInLine) → {href, start, end} | null` (S, ~45 min):**

This is the source-mode detector. Unit test it:

| # | RED test | GREEN impl |
|---|---|---|
| 6a.1 | `findLinkAtPos("[x](foo.md)", 1)` → `{href:"foo.md", start:0, end:11}` | Regex `/\[[^\]]*\]\(([^)]+)\)/g`; matchAll; find covering. |
| 6a.2 | `findLinkAtPos("before [x](foo.md#bar) after", 15)` → `{href:"foo.md#bar", ...}` | Same; verify offset math. |
| 6a.3 | `findLinkAtPos("no link here", 3)` → `null` | No match → null. |
| 6a.4 | `findLinkAtPos("[a](b) [c](d)", 8)` → `{href:"d",...}` (second link) | Covering match, not first. |
| 6a.5 | `findLinkAtPos("[x](foo.md)", 0)` (on `[`) → link | Cursor on opening bracket still counts. |

**6b — Live Preview fixture-first wiring (M, ~1.5 h):**

Use fixture `reading.md` from Step 5 in Live Preview mode. Walk QA rows 1–6 with RED→GREEN cycles:
- **RED:** switch fixture file to Live Preview; click same-file anchor; nothing happens.
- **GREEN:** register ViewPlugin with `EditorView.domEventHandlers({ mousedown })`; `target.closest("a")` path only. Click works.
- Commit. Proceed to cross-file row.
- External / wikilink rows MUST remain native — verify by clicking each; no regression.

**6c — Source mode fixture-first wiring (M, ~1.5 h):**

Same fixture, source mode.
- **RED:** ctrl+click on `[same-file](#target-heading)` text; Obsidian's built-in maybe opens nothing / opens broken link.
- **GREEN:** extend ViewPlugin `mousedown` with the `posAtDOM` + `findLinkAtPos` fallback (no `<a>` closest). Only fires when the modifier matches what Obsidian uses in source (ctrl/cmd). Commit.
- Walk remaining rows.

- **Acceptance:** QA rows 1–12 pass in both Live Preview and Source; unit tests green; IME composition guard tested manually (type Japanese into a heading with an open IME; no crash).

### Step 7 — Edge-case sweep via fixture-first TDD (M, ~2 h)

One fixture per edge case. For each: add fixture → walk QA matrix → fix failures with a new unit test capturing the regression before the fix.

- `headings-formatted.md` — bold/italic/code in headings.
- `duplicates.md` — three `## Foo` rows; links to `#foo`, `#foo-1`, `#foo-2`.
- `encoded path with spaces.md` — `[x](encoded%20path%20with%20spaces.md#h)`.
- `callout.md` — link inside `> [!note]` block.
- `table.md` — link inside GFM table cell.
- `empty-fragment.md` — `[x](file.md#)`.
- `external.md` — must not be intercepted.
- `wikilinks.md` — must not be intercepted.

**TDD rule for regressions:** every bug found during fixture testing → write a failing *unit* test reproducing it in the pure layer → fix → commit.

### Step 8 — Non-disruption audit (S, ~1 h)

Fixture-first, no new unit tests unless regression found.

Verify with plugin enabled:
- Backlinks pane lists sources of a GFM link targeting the current file.
- Graph view edges unchanged.
- `[[Wikilink]]` navigation works.
- `#tag` chips open tag pane.
- External URLs open in browser.

### Step 9 — Final manual QA matrix (S, ~1 h)

Walk the full matrix (§ QA Matrix) in a clean vault. Log pass/fail in `QA-log.md`. Any fail → return to a TDD cycle (new failing unit test first).

### Step 10 — README (XS, ~15 min)

Install via symlink, supported syntaxes, known limitations (Linux case sensitivity), uninstall.

**Skip for MVP:** settings panel, TOC, link conversion, mobile testing.

---

## Edge Cases & Expected Behavior

| Case | Expected |
|---|---|
| `**bold**`, `*em*`, `` `code` `` in heading | Stripped before slugify; result matches GitHub |
| Duplicate headings | `foo`, `foo-1`, `foo-2` in document order |
| URL-encoded spaces `Sub%20Dir/F.md` | Decoded before `getFirstLinkpathDest` |
| Percent-encoded non-ASCII | `decodeURIComponent` inside try/catch; raw on error |
| Empty fragment `file.md#` | `fragment === null`; open file, no scroll |
| Missing file | Resolver returns null; handler does NOT preventDefault; Obsidian shows native miss |
| Missing heading, file exists | Open file, `line` null, no scroll |
| External: `https://`, `mailto:`, `tel:`, `obsidian://`, `data:`, `file:` | Ignored; native handler runs |
| Wikilinks `[[X]]`, `[[X#Heading]]` | Never reach handler (not `[text](url)` markdown); verify by class `internal-link` with no `.md` in data-href → bail anyway |
| Tag links `<a class="tag">` | Detect class, bail |
| Link inside callout / table / blockquote | DOM-wise identical `<a>`; works unchanged |
| Windows/macOS case insensitivity | `getFirstLinkpathDest` handles it |
| Linux case sensitivity | Documented limitation in README |
| Ctrl/Cmd+click, middle-click | `openLinkText(..., true)` → new leaf |
| Click during IME composition | Bail if `view.composing` true |

---

## QA Matrix

| # | Mode | Link | Target | Expected |
|---|---|---|---|---|
| 1 | Reading | `#some-heading` | heading in same file | Scroll |
| 2 | Reading | `Other.md` | file exists | Open file |
| 3 | Reading | `Other.md#h` | both exist | Open + scroll |
| 4 | Reading | `Other.md#missing` | file yes, heading no | Open, no scroll |
| 5 | Reading | `Missing.md#x` | neither | Native miss dialog |
| 6 | Reading | `https://ex.com` | — | External browser |
| 7 | Live Preview | rows 1–6 | — | Same |
| 8 | Source | rows 1–6 | — | Same |
| 9 | Any | `[[Wikilink]]` | — | Native behavior intact |
| 10 | Any | `[x](Sub%20Dir/F.md#a)` | encoded path | Resolves |
| 11 | Any | `#foo-2` | 3rd `## Foo` | Scroll to third |
| 12 | Any | Ctrl/Cmd+click | any internal | Opens in new pane |

---

## Non-Disruption Checks

- Wikilinks `[[X]]`, `[[X#H]]`, `![[X]]` — native navigation unchanged.
- Backlinks pane lists sources of GFM markdown links (parsed by metadata cache regardless of plugin).
- Graph view edges unchanged.
- Tag chips `#tag` open tag pane (our handler bails on `class="tag"`).
- External URL schemes open in default browser.

---

## Risk Callouts

- **CM6 event-order fragility.** CM6 has its own `mousedown` listeners. Use `EditorView.domEventHandlers({ mousedown(e, v) { ...; return true; } })` inside the ViewPlugin. If that still misfires, fall back to `view.dom.addEventListener("mousedown", h, { capture: true })` on `scrollDOM`.
- **Source-mode `posAtDOM`.** Can return stale positions during IME composition; guard with `view.composing`.
- **`getFirstLinkpathDest` decoding.** Undocumented whether it URL-decodes internally. Plugin decodes in `linkParser` and passes decoded path. If double-decode surfaces (`%2520` cases appear), add a flag.
- **Heading cache timing.** Immediately after file creation / bulk edit, `getFileCache` may be stale. If `headings` missing after `openLinkText`, retry once on `setTimeout(0)` or await `metadataCache.on("resolved")`.
- **Reading-mode `href` rewriting.** Always prefer `data-href` over `href`; Obsidian rewrites the latter.
- **Obsidian version drift.** API confirmed for 1.11+. If user's Obsidian < 1.11, bump before testing.

---

## Critical Files

- `path\to\project\gfm-fragment-links\manifest.json`
- `path\to\project\gfm-fragment-links\src\main.ts`
- `path\to\project\gfm-fragment-links\src\slug.ts`
- `path\to\project\gfm-fragment-links\src\linkParser.ts`
- `path\to\project\gfm-fragment-links\src\resolver.ts`
- `path\to\project\gfm-fragment-links\src\readingModeHandler.ts`
- `path\to\project\gfm-fragment-links\src\editorModeHandler.ts`

---

## Verification (end-to-end)

1. `npm run build` → produces `main.js` with no TS errors.
2. `npm test` (Vitest) → all unit tests in `src/__tests__/` green.
3. In a sandbox vault, install via symlink and enable.
4. Walk the QA matrix (§ QA Matrix) in all three modes — 12 rows × 3 modes where applicable = 30 manual checks. Record pass/fail.
5. Run the Non-Disruption Checks — verify wikilinks, backlinks pane, graph view, tag chips, external URLs all behave as before plugin install.
6. Smoke-test with a real VS-Code-authored document (e.g., a README with TOC of kebab-case fragments) imported into the vault — every TOC link should land on the correct heading.
7. Toggle plugin off → all GFM fragment clicks revert to pre-plugin behavior (the plugin's effect is fully reversible).
