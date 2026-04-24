import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import type { App } from "obsidian";

import { parseHref } from "./linkParser";
import { decideAction } from "./readingModeHandler";
import { LinkResolver, type ResolvedTarget } from "./resolver";

export function createEditorExtension(
  app: App,
  resolver: LinkResolver,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): Extension {
  return ViewPlugin.fromClass(
    class {
      private handleMouseDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sourcePath = app.workspace.getActiveFile()?.path ?? "";
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          handleSourceMouseDown(
            target,
            event,
            this.view,
            resolver,
            sourcePath,
            onNavigate
          );
          return;
        }

        handleRenderedAnchorMouseDown(
          linkElement,
          event,
          resolver,
          sourcePath,
          onNavigate
        );
      };

      constructor(private view: EditorView) {
        this.view.dom.addEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
      }

      destroy() {
        this.view.dom.removeEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
      }
    }
  );
}

function handleSourceMouseDown(
  target: Element,
  event: MouseEvent,
  view: EditorView,
  resolver: LinkResolver,
  sourcePath: string,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): boolean {
  const pos = view.posAtDOM(target);
  const line = view.state.doc.lineAt(pos);
  const href = extractMarkdownLinkHrefAtOffset(line.text, pos - line.from);

  if (href === null) {
    return false;
  }

  const targetFile = resolver.resolve(parseHref(href), sourcePath);
  if (targetFile === null) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  onNavigate(targetFile, event.ctrlKey || event.metaKey || event.button === 1);

  return true;
}

export function handleRenderedAnchorMouseDown(
  anchor: Element,
  event: MouseEvent,
  resolver: LinkResolver,
  sourcePath: string,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): boolean {
  const action = decideAction(anchor);
  if (action.kind === "ignore") {
    return false;
  }

  const target = resolver.resolve(parseHref(action.href), sourcePath);
  if (target === null) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  onNavigate(target, event.ctrlKey || event.metaKey || event.button === 1);

  return true;
}

export function extractMarkdownLinkHrefAtOffset(
  lineText: string,
  offsetInLine: number
): string | null {
  const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of lineText.matchAll(markdownLinkPattern)) {
    const matchStart = match.index;
    if (matchStart === undefined) {
      continue;
    }

    const linkStart = matchStart + 1;
    const linkEnd = matchStart + match[0].length - 1;

    if (offsetInLine >= linkStart && offsetInLine <= linkEnd) {
      return match[1];
    }
  }

  return null;
}
