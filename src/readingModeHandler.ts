import { parseHref } from "./linkParser";
import type { App, MarkdownPostProcessorContext } from "obsidian";
import { LinkResolver, type ResolvedTarget } from "./resolver";

export type Action =
  | { kind: "ignore" }
  | { kind: "resolve"; href: string };

export function decideAction(anchor: HTMLAnchorElement): Action {
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
  return (el, ctx) => {
    el.querySelectorAll("a").forEach((anchor) => {
      anchor.addEventListener(
        "click",
        (event) => {
          const action = decideAction(anchor);
          if (action.kind === "ignore") {
            return;
          }

          const parsed = parseHref(action.href);
          if (!parsed.isAnchorOnly) {
            return;
          }

          const target = resolver.resolve(parsed, ctx.sourcePath);
          if (target === null) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          onNavigate(target, event.ctrlKey || event.metaKey || event.button === 1);
        },
        { capture: true }
      );
    });
  };
}
