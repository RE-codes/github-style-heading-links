# GitHub Style Heading Links

An Obsidian plugin that makes GitHub-style heading fragment links actually work.

## What it does

Obsidian and GitHub disagree about how to link to a heading.

Obsidian resolves a fragment link using the heading's literal text — `[jump](#My Heading!)`. GitHub (and GitHub-flavored Markdown tooling, and VS Code's Markdown preview) instead uses a *slug*: lowercased, spaces turned into hyphens, punctuation stripped. So `## My Heading!` becomes the anchor `#my-heading`.

That means a link like `[jump](#my-heading)` or `[jump](notes/Other.md#my-heading)` works on GitHub but does nothing in Obsidian — it just sits there as a dead link.

This plugin teaches Obsidian to follow those slug-style fragment links. It resolves them against the GitHub slug of each heading in the target file and navigates there, in Reading mode, Live Preview, and Source mode. Everything Obsidian already handles — wikilinks, embeds, native heading links, tags, external URLs — is left untouched.

## Why it exists

If you write Markdown that's shared with a GitHub repo, or you paste docs that were authored for GitHub or VS Code, the in-page heading links break the moment they land in your vault. The alternatives are bad: rewrite every link to Obsidian's format (which then breaks it on GitHub), or just live with dead links.

This plugin lets the same file work in both places without edits.

## Installation

It isn't in the community plugin store yet, so install it manually:

1. In your vault, create the folder `.obsidian/plugins/github-style-heading-links/`.
2. Copy `main.js`, `manifest.json`, and `styles.css` into it.
3. In Obsidian, open **Settings → Community plugins**, reload the plugin list, and enable **GitHub Style Heading Links**.

## Usage

There's nothing to configure. Once the plugin is enabled, slug-style fragment links resolve on their own:

```markdown
[jump to a heading in this file](#my-heading)
[jump to a heading in another file](Other%20Note.md#my-heading)
```

A click navigates to the heading and highlights it. Ctrl/Cmd-click and middle-click open it in a new tab, matching how Obsidian handles its own links.

The slug follows GitHub's rules, so `## Setup & Config` is reachable at `#setup--config`, and repeated headings get numeric suffixes (`#overview`, `#overview-1`, `#overview-2`).

## Current limitations

This is an early, personal-use build. It works well for everyday navigation, but some edges are rough or unverified:

- **Desktop-tested only.** Development and QA happened on Windows desktop Obsidian. Mobile behavior is unverified.
- **Source-mode link parsing is basic.** Plain inline links — `[text](destination)` — are recognized in unrendered Markdown. Link titles, angle-bracket destinations (`<file name.md#h>`), parentheses inside paths, and reference-style links (`[text][ref]`) are not yet handled in Source mode.
- **Duplicate-heading highlighting is partial.** Links to repeated headings (`#heading-1`, `#heading-2`) navigate correctly, but the highlight may cover only the heading line rather than the heading and its content.
- **Context menu doesn't scroll.** "Open in new tab" / "Open to the right" from a right-click opens the target file but does not jump to the heading.
- **Hover preview is unresolved.** Hovering a GFM fragment link may show an "unable to find heading" message instead of a heading preview.
- **Middle-click has a slight delay.** Middle-click navigation retargets Obsidian's native new tab after it opens, which can produce a brief flash or delay.
- **Split panes are unverified.** Source-path resolution when clicking a link in a non-active pane hasn't been confirmed.

## License

MIT.
