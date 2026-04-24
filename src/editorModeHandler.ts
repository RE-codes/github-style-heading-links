import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { editorLivePreviewField, type App, type WorkspaceLeaf } from "obsidian";

import { parseHref } from "./linkParser";
import { decideAction } from "./readingModeHandler";
import { LinkResolver, type ResolvedTarget } from "./resolver";

type PendingMiddleClick = {
  previousLeaf: WorkspaceLeaf | null;
  target: ResolvedTarget;
};

export type NavigateOptions = {
  fallbackToLine?: boolean;
};

type NavigateCallback = (
  target: ResolvedTarget,
  newLeaf: boolean,
  options?: NavigateOptions
) => void;

export function createEditorExtension(
  app: App,
  resolver: LinkResolver,
  onNavigate: NavigateCallback
): Extension {
  return ViewPlugin.fromClass(
    class {
      private pendingMiddleClick: PendingMiddleClick | null = null;

      private handleMouseDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sourcePath = app.workspace.getActiveFile()?.path ?? "";
        const isLivePreview = this.view.state.field(editorLivePreviewField);
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          const resolvedTarget = handleSourceMouseDown(
            target,
            event,
            this.view,
            resolver,
            sourcePath,
            isLivePreview,
            onNavigate
          );
          if (event.button === 1 && resolvedTarget !== null) {
            this.pendingMiddleClick = {
              previousLeaf: app.workspace.activeLeaf,
              target: resolvedTarget
            };
            retargetNativeMiddleClickTab(this.pendingMiddleClick, app, onNavigate);
          }
          return;
        }

        const resolvedTarget = handleRenderedAnchorMouseDown(
          linkElement,
          event,
          resolver,
          sourcePath,
          onNavigate
        );
        if (event.button === 1 && resolvedTarget !== null) {
          this.pendingMiddleClick = {
            previousLeaf: app.workspace.activeLeaf,
            target: resolvedTarget
          };
          retargetNativeMiddleClickTab(this.pendingMiddleClick, app, onNavigate);
        }
      };

      private handleAuxClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sourcePath = app.workspace.getActiveFile()?.path ?? "";
        const isLivePreview = this.view.state.field(editorLivePreviewField);
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          handleSourceAuxClick(
            target,
            event,
            this.view,
            resolver,
            sourcePath,
            isLivePreview,
            onNavigate
          );
          return;
        }

        handleRenderedAnchorAuxClick(
          linkElement,
          event,
          resolver,
          sourcePath,
          onNavigate
        );
      };

      private handleMouseUp = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sourcePath = app.workspace.getActiveFile()?.path ?? "";
        const isLivePreview = this.view.state.field(editorLivePreviewField);
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          handleSourceMouseUp(
            target,
            event,
            this.view,
            resolver,
            sourcePath,
            isLivePreview,
            this.pendingMiddleClick
          );
          this.pendingMiddleClick = null;
          return;
        }

        handleRenderedAnchorMouseUp(
          linkElement,
          event,
          resolver,
          sourcePath,
          this.pendingMiddleClick
        );
        this.pendingMiddleClick = null;
      };

      constructor(private view: EditorView) {
        this.view.dom.addEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
        this.view.dom.addEventListener("auxclick", this.handleAuxClick, {
          capture: true
        });
        this.view.dom.addEventListener("mouseup", this.handleMouseUp, {
          capture: true
        });
      }

      destroy() {
        this.view.dom.removeEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
        this.view.dom.removeEventListener("auxclick", this.handleAuxClick, {
          capture: true
        });
        this.view.dom.removeEventListener("mouseup", this.handleMouseUp, {
          capture: true
        });
      }
    }
  );
}

export function handleSourceMouseDown(
  target: Element,
  event: MouseEvent,
  view: EditorView,
  resolver: LinkResolver,
  sourcePath: string,
  isLivePreview: boolean,
  onNavigate: NavigateCallback
): ResolvedTarget | null {
  const renderedLinkText = isRenderedLinkText(target);
  if (event.button === 1) {
    const href = extractSourceHref(target, view);
    if (href === null) {
      return null;
    }

    const targetFile = resolver.resolve(parseHref(href), sourcePath);
    if (targetFile === null) {
      return null;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    return targetFile;
  }

  if (!isSourceMouseDownFollowEvent(event, isLivePreview, renderedLinkText)) {
    return null;
  }

  const pos = view.posAtDOM(target);
  const line = view.state.doc.lineAt(pos);
  const href = extractMarkdownLinkHrefAtOffset(line.text, pos - line.from);

  if (href === null) {
    return null;
  }

  const targetFile = resolver.resolve(parseHref(href), sourcePath);
  if (targetFile === null) {
    return null;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  onNavigate(
    targetFile,
    event.button === 1 || (isLivePreview && (event.ctrlKey || event.metaKey))
  );

  return targetFile;
}

function isSourceMouseDownFollowEvent(
  event: MouseEvent,
  isLivePreview: boolean,
  renderedLinkText: boolean
): boolean {
  if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
    return true;
  }

  return event.button === 0 && isLivePreview && renderedLinkText;
}

function isRenderedLinkText(target: Element): boolean {
  return target.closest(".cm-underline") !== null;
}

function extractSourceHref(target: Element, view: EditorView): string | null {
  const pos = view.posAtDOM(target);
  const line = view.state.doc.lineAt(pos);

  return extractMarkdownLinkHrefAtOffset(line.text, pos - line.from);
}

export function handleRenderedAnchorMouseDown(
  anchor: Element,
  event: MouseEvent,
  resolver: LinkResolver,
  sourcePath: string,
  onNavigate: NavigateCallback
): ResolvedTarget | null {
  if (event.button !== 0) {
    return null;
  }

  const action = decideAction(anchor);
  if (action.kind === "ignore") {
    return null;
  }

  const target = resolver.resolve(parseHref(action.href), sourcePath);
  if (target === null) {
    return null;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  onNavigate(target, event.ctrlKey || event.metaKey);

  return target;
}

export function handleRenderedAnchorAuxClick(
  anchor: Element,
  event: MouseEvent,
  resolver: LinkResolver,
  sourcePath: string,
  _onNavigate: NavigateCallback
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

  return true;
}

export function handleSourceAuxClick(
  target: Element,
  event: MouseEvent,
  view: EditorView,
  resolver: LinkResolver,
  sourcePath: string,
  _isLivePreview: boolean,
  _onNavigate: NavigateCallback
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
  event.stopImmediatePropagation();

  return true;
}

export function handleRenderedAnchorMouseUp(
  anchor: Element,
  event: MouseEvent,
  resolver: LinkResolver,
  sourcePath: string,
  pendingMiddleClick: PendingMiddleClick | null
): boolean {
  if (event.button !== 1) {
    return false;
  }

  if (pendingMiddleClick === null) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  return true;
}

export function handleSourceMouseUp(
  target: Element,
  event: MouseEvent,
  view: EditorView,
  resolver: LinkResolver,
  sourcePath: string,
  _isLivePreview: boolean,
  pendingMiddleClick: PendingMiddleClick | null
): boolean {
  if (event.button !== 1) {
    return false;
  }

  if (pendingMiddleClick === null) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  return true;
}

export function retargetNativeMiddleClickTab(
  pending: PendingMiddleClick,
  app: App,
  onNavigate: NavigateCallback
): void {
  waitForNativeMiddleClickOpen(app, pending.previousLeaf).then(() => {
    onNavigate(pending.target, false, { fallbackToLine: false });
  });
}

async function waitForNativeMiddleClickOpen(
  app: App,
  previousLeaf: WorkspaceLeaf | null
): Promise<void> {
  await waitForActiveLeafChange(app, previousLeaf);
  await waitForFileOpen(app);
}

function waitForActiveLeafChange(
  app: App,
  previousLeaf: WorkspaceLeaf | null
): Promise<void> {
  if (app.workspace.activeLeaf !== previousLeaf) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      app.workspace.offref(ref);
      resolve();
    }, 250);
    const ref = app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf === previousLeaf) {
        return;
      }

      window.clearTimeout(timeout);
      app.workspace.offref(ref);
      resolve();
    });
  });
}

function waitForFileOpen(app: App): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      app.workspace.offref(ref);
      resolve();
    }, 250);
    const ref = app.workspace.on("file-open", (file) => {
      window.clearTimeout(timeout);
      app.workspace.offref(ref);
      resolve();
    });
  });
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
