import { parseHref } from "./linkParser";
import type { App, MarkdownPostProcessorContext } from "obsidian";
import { LinkResolver, type ResolvedTarget } from "./resolver";

export type Action =
  | { kind: "ignore" }
  | { kind: "resolve"; href: string };

export function decideAction(anchor: Element): Action {
  if (anchor.classList.contains("tag")) {
    return { kind: "ignore" };
  }

  const href = anchor.getAttribute("data-href") ?? anchor.getAttribute("href") ?? "";
  if (href === "") {
    return { kind: "ignore" };
  }

  const parsed = parseHref(href);

  if (parsed.isExternal) {
    return { kind: "ignore" };
  }

  return { kind: "resolve", href };
}

export function createReadingModeHandler(
  _app: App,
  resolver: LinkResolver,
  onNavigate: (target: ResolvedTarget, newLeaf: boolean) => void
): (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void {
  const handledAnchors = new WeakSet<Element>();

  return (el, ctx) => {
    el.querySelectorAll("a").forEach((anchor) => {
      if (handledAnchors.has(anchor)) {
        return;
      }

      handledAnchors.add(anchor);
      anchor.addEventListener(
        "click",
        (event) =>
          handleReadingAnchorEvent(
            anchor,
            event,
            resolver,
            ctx.sourcePath,
            onNavigate
          ),
        { capture: true }
      );
      anchor.addEventListener(
        "auxclick",
        (event) =>
          handleReadingAnchorEvent(
            anchor,
            event,
            resolver,
            ctx.sourcePath,
            onNavigate
          ),
        { capture: true }
      );
    });
  };
}

export function handleReadingAnchorEvent(
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
  event.stopImmediatePropagation();
  onNavigate(target, event.ctrlKey || event.metaKey || event.button === 1);

  return true;
}
