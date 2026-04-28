import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import {
  editorLivePreviewField,
  type App,
  type EventRef,
  type TFile,
  type WorkspaceLeaf
} from "obsidian";

import { parseHref } from "./linkParser";
import type { NavigateOptions } from "./navigation";
import { decideAction } from "./readingModeHandler";
import { LinkResolver, type ResolvedTarget } from "./resolver";

type PendingClick = {
  previousLeaf: WorkspaceLeaf | null;
  target: ResolvedTarget;
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
      // Rendered left-click: pointerdown resolves and suppresses selection;
      // pointerup navigates and clears; the following mouseup only suppresses if
      // pointer events did not consume the click. Source links resolve on
      // mousedown for Ctrl/Cmd-click, and middle-click lets Obsidian open the tab
      // before we retarget it on mouseup/file-open.
      private pendingMiddleClick: PendingClick | null = null;
      private pendingRenderedClick: PendingClick | null = null;
      private handledRenderedPointerDown = false;
      private suppressNextRenderedClick = false;

      private handlePointerDown = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sourcePath = app.workspace.getActiveFile()?.path ?? "";
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          return;
        }

        const resolvedTarget = handleRenderedAnchorPointerDown(
          linkElement,
          event,
          resolver,
          sourcePath
        );
        if (event.button === 0 && resolvedTarget !== null) {
          this.handledRenderedPointerDown = true;
          this.pendingRenderedClick = {
            previousLeaf: app.workspace.activeLeaf,
            target: resolvedTarget
          };
          return;
        }

        this.handledRenderedPointerDown = false;
      };

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

        if (event.button === 0 && this.handledRenderedPointerDown) {
          this.handledRenderedPointerDown = false;
          return;
        }

        const resolvedTarget = handleRenderedAnchorMouseDown(
          linkElement,
          event,
          resolver,
          sourcePath,
          onNavigate
        );
        if (event.button === 0 && resolvedTarget !== null) {
          this.pendingRenderedClick = {
            previousLeaf: app.workspace.activeLeaf,
            target: resolvedTarget
          };
        }
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
        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          handleSourceAuxClick(target, event, this.view, resolver, sourcePath);
        }
      };

      private handleMouseUp = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          handleSourceMouseUp(
            event,
            event.button === 0 ? this.pendingRenderedClick : this.pendingMiddleClick,
            event.button === 0 ? onNavigate : undefined
          );
          if (event.button === 0) {
            this.pendingRenderedClick = null;
          }
          this.pendingMiddleClick = null;
          return;
        }

        handleRenderedAnchorMouseUp(
          event,
          event.button === 0 ? this.pendingRenderedClick : this.pendingMiddleClick
        );
        if (event.button === 0) {
          this.pendingRenderedClick = null;
        }
        this.pendingMiddleClick = null;
      };

      private handlePointerUp = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        if (handleRenderedAnchorPointerUp(event, this.pendingRenderedClick, onNavigate)) {
          this.pendingRenderedClick = null;
          this.suppressNextRenderedClick = true;
        }
      };

      private handleClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const linkElement = target.closest("a, [data-href]");
        if (linkElement === null) {
          return;
        }

        handleRenderedAnchorClick(
          event,
          this.suppressNextRenderedClick
        );
        this.suppressNextRenderedClick = false;
      };

      constructor(private view: EditorView) {
        this.view.dom.addEventListener("pointerdown", this.handlePointerDown, {
          capture: true
        });
        this.view.dom.addEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
        this.view.dom.addEventListener("auxclick", this.handleAuxClick, {
          capture: true
        });
        this.view.dom.addEventListener("mouseup", this.handleMouseUp, {
          capture: true
        });
        this.view.dom.addEventListener("pointerup", this.handlePointerUp, {
          capture: true
        });
        this.view.dom.addEventListener("click", this.handleClick, {
          capture: true
        });
      }

      destroy() {
        this.view.dom.removeEventListener("pointerdown", this.handlePointerDown, {
          capture: true
        });
        this.view.dom.removeEventListener("mousedown", this.handleMouseDown, {
          capture: true
        });
        this.view.dom.removeEventListener("auxclick", this.handleAuxClick, {
          capture: true
        });
        this.view.dom.removeEventListener("mouseup", this.handleMouseUp, {
          capture: true
        });
        this.view.dom.removeEventListener("pointerup", this.handlePointerUp, {
          capture: true
        });
        this.view.dom.removeEventListener("click", this.handleClick, {
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
    isLivePreview && (event.ctrlKey || event.metaKey),
    getEditorNavigateOptions(targetFile)
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
  if (event.button !== 0 && event.button !== 1) {
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

  if (event.button === 0) {
    onNavigate(target, event.ctrlKey || event.metaKey, getEditorNavigateOptions(target));
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  return target;
}

export function handleRenderedAnchorPointerDown(
  anchor: Element,
  event: MouseEvent | PointerEvent,
  resolver: LinkResolver,
  sourcePath: string
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

  return target;
}

function getEditorNavigateOptions(target: ResolvedTarget): NavigateOptions {
  return target.requiresLineFallback ? {} : { fallbackToLine: false };
}

export function handleSourceAuxClick(
  target: Element,
  event: MouseEvent,
  view: EditorView,
  resolver: LinkResolver,
  sourcePath: string
): void {
  const pos = view.posAtDOM(target);
  const line = view.state.doc.lineAt(pos);
  const href = extractMarkdownLinkHrefAtOffset(line.text, pos - line.from);

  if (href === null) {
    return;
  }

  const targetFile = resolver.resolve(parseHref(href), sourcePath);
  if (targetFile === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function handleRenderedAnchorMouseUp(
  event: MouseEvent,
  pendingClick: PendingClick | null
): void {
  if (event.button !== 0 && event.button !== 1) {
    return;
  }

  if (event.button === 1) {
    return;
  }

  if (pendingClick === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function handleRenderedAnchorPointerUp(
  event: MouseEvent | PointerEvent,
  pendingRenderedClick: PendingClick | null,
  onNavigate?: NavigateCallback
): boolean {
  if (event.button !== 0) {
    return false;
  }

  if (pendingRenderedClick === null) {
    return false;
  }

  if (onNavigate !== undefined) {
    onNavigate(
      pendingRenderedClick.target,
      event.ctrlKey || event.metaKey,
      getEditorNavigateOptions(pendingRenderedClick.target)
    );
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  return true;
}

export function handleRenderedAnchorClick(
  event: MouseEvent,
  suppressClick: boolean
): boolean {
  if (!suppressClick || event.button !== 0) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  return true;
}

export function handleSourceMouseUp(
  event: MouseEvent,
  pendingClick: PendingClick | null,
  onNavigate?: NavigateCallback
): void {
  if (event.button !== 0 && event.button !== 1) {
    return;
  }

  if (pendingClick === null) {
    return;
  }

  if (event.button === 0 && onNavigate !== undefined) {
    onNavigate(
      pendingClick.target,
      event.ctrlKey || event.metaKey,
      getEditorNavigateOptions(pendingClick.target)
    );
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function retargetNativeMiddleClickTab(
  pending: PendingClick,
  app: App,
  onNavigate: NavigateCallback
): void {
  waitForNativeMiddleClickOpen(
    app,
    pending.previousLeaf,
    pending.target.file
  ).then(() => {
    onNavigate(
      pending.target,
      false,
      pending.target.requiresLineFallback
        ? {}
        : { fallbackToLine: false }
    );
  });
}

async function waitForNativeMiddleClickOpen(
  app: App,
  previousLeaf: WorkspaceLeaf | null,
  targetFile: TFile
): Promise<void> {
  await waitForActiveLeafChange(app, previousLeaf);
  await waitForFileOpen(app, targetFile);
}

function waitForActiveLeafChange(
  app: App,
  previousLeaf: WorkspaceLeaf | null
): Promise<void> {
  if (app.workspace.activeLeaf !== previousLeaf) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let ref: EventRef | null = null;
    const timeout = window.setTimeout(() => {
      if (ref !== null) {
        app.workspace.offref(ref);
      }
      resolve();
    }, 250);
    ref = app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf === previousLeaf) {
        return;
      }

      window.clearTimeout(timeout);
      if (ref !== null) {
        app.workspace.offref(ref);
      }
      resolve();
    });
  });
}

function waitForFileOpen(app: App, targetFile: TFile): Promise<void> {
  return new Promise((resolve) => {
    let ref: EventRef | null = null;
    const timeout = window.setTimeout(() => {
      if (ref !== null) {
        app.workspace.offref(ref);
      }
      resolve();
    }, 250);
    ref = app.workspace.on("file-open", (file) => {
      if (file?.path !== targetFile.path) {
        return;
      }

      window.clearTimeout(timeout);
      if (ref !== null) {
        app.workspace.offref(ref);
      }
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
