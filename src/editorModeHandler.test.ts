// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import type { EditorView } from "@codemirror/view";
import type { WorkspaceLeaf } from "obsidian";

import {
  createEditorExtension,
  extractMarkdownLinkHrefAtOffset,
  handleRenderedAnchorAuxClick,
  handleRenderedAnchorMouseUp,
  handleSourceAuxClick,
  handleSourceMouseDown,
  handleSourceMouseUp,
  handleRenderedAnchorMouseDown,
  retargetNativeMiddleClickTab
} from "./editorModeHandler";
import type { App } from "obsidian";
import { makeApp, makeFile, heading } from "./resolver.test-support";
import { LinkResolver } from "./resolver";

describe("createEditorExtension", () => {
  it("returns a CodeMirror extension", () => {
    expect(createEditorExtension).toBeTypeOf("function");
  });
});

describe("retargetNativeMiddleClickTab", () => {
  it("retargets the native tab without line fallback", async () => {
    const sourceFile = makeFile("reading.md");
    const previousLeaf = {} as WorkspaceLeaf;
    const app = {
      workspace: {
        activeLeaf: {} as WorkspaceLeaf,
        on: (name: string, callback: (...args: unknown[]) => void) => {
          if (name === "file-open") {
            setTimeout(() => callback(sourceFile), 0);
          }

          return {};
        },
        offref: () => {
          return;
        }
      }
    } as unknown as App;
    const navigations: unknown[] = [];
    let resolveNavigated: () => void = () => {
      return;
    };
    const navigated = new Promise<void>((resolve) => {
      resolveNavigated = resolve;
    });

    retargetNativeMiddleClickTab(
      {
        previousLeaf,
        target: { file: sourceFile, line: 4, heading: "Target Heading" }
      },
      app,
      (target, newLeaf, options) => {
        navigations.push({ target, newLeaf, options });
        resolveNavigated();
      }
    );

    await navigated;

    expect(navigations).toEqual([
      {
        target: { file: sourceFile, line: 4, heading: "Target Heading" },
        newLeaf: false,
        options: { fallbackToLine: false }
      }
    ]);
  });

  it("waits for the target file to open before retargeting", async () => {
    const sourceFile = makeFile("reading.md");
    const otherFile = makeFile("other.md");
    const previousLeaf = {} as WorkspaceLeaf;
    const events: string[] = [];
    const app = {
      workspace: {
        activeLeaf: {} as WorkspaceLeaf,
        on: (name: string, callback: (...args: unknown[]) => void) => {
          if (name === "file-open") {
            setTimeout(() => {
              events.push("wrong-file-open");
              callback(otherFile);
            }, 0);
            setTimeout(() => {
              events.push("target-file-open");
              callback(sourceFile);
            }, 5);
          }

          return {};
        },
        offref: () => {
          return;
        }
      }
    } as unknown as App;

    retargetNativeMiddleClickTab(
      {
        previousLeaf,
        target: { file: sourceFile, line: 4, heading: "Target Heading" }
      },
      app,
      () => {
        events.push("navigate");
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(events).toEqual([
      "wrong-file-open",
      "target-file-open",
      "navigate"
    ]);
  });
});

describe("extractMarkdownLinkHrefAtOffset", () => {
  it("extracts the href when the offset is inside link text", () => {
    expect(
      extractMarkdownLinkHrefAtOffset("[same-file](#target-heading)", 3)
    ).toBe("#target-heading");
  });

  it("extracts the href when the offset is inside the href", () => {
    expect(
      extractMarkdownLinkHrefAtOffset("[same-file](#target-heading)", 14)
    ).toBe("#target-heading");
  });
});

describe("handleRenderedAnchorMouseDown", () => {
  it("navigates rendered anchor links", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("mousedown");
    const navigations: unknown[] = [];

    anchor.setAttribute("data-href", "#target-heading");

    handleRenderedAnchorMouseDown(anchor, event, resolver, sourceFile.path, (target) => {
      navigations.push(target);
    });

    expect(navigations).toEqual([
      { file: sourceFile, line: 4, heading: "Target Heading" }
    ]);
  });

  it("navigates rendered data-href elements", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const linkElement = document.createElement("span");
    const event = new MouseEvent("mousedown");
    const navigations: unknown[] = [];

    linkElement.setAttribute("data-href", "#target-heading");

    handleRenderedAnchorMouseDown(
      linkElement,
      event,
      resolver,
      sourceFile.path,
      (target) => {
        navigations.push(target);
      }
    );

    expect(navigations).toEqual([
      { file: sourceFile, line: 4, heading: "Target Heading" }
    ]);
  });

  it("stops immediate propagation for handled rendered links", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("mousedown");
    let stoppedImmediately = false;

    anchor.setAttribute("data-href", "#target-heading");
    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleRenderedAnchorMouseDown(
      anchor,
      event,
      resolver,
      sourceFile.path,
      () => {
        return;
      }
    );

    expect(stoppedImmediately).toBe(true);
  });

  it("suppresses rendered auxclick without navigating again", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("auxclick", { button: 1 });
    const navigations: unknown[] = [];
    let stoppedImmediately = false;

    anchor.setAttribute("data-href", "#target-heading");
    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleRenderedAnchorAuxClick(
      anchor,
      event,
      resolver,
      sourceFile.path
    );

    expect({ stoppedImmediately, navigations }).toEqual({
      stoppedImmediately: true,
      navigations: []
    });
  });

  it("suppresses rendered middle-button mouseup without choosing a release target", () => {
    const sourceFile = makeFile("reading.md");
    const event = new MouseEvent("mouseup", { button: 1 });
    const navigations: unknown[] = [];
    const previousLeaf = {} as WorkspaceLeaf;
    let stoppedImmediately = false;

    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleRenderedAnchorMouseUp(
      event,
      {
        previousLeaf,
        target: { file: sourceFile, line: 4, heading: "Target Heading" }
      }
    );

    expect({ stoppedImmediately, navigations }).toEqual({
      stoppedImmediately: true,
      navigations: []
    });
  });
});

describe("handleSourceMouseDown", () => {
  it("does not navigate source links on plain left-click", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 0 });
    const navigations: unknown[] = [];
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      false,
      (resolvedTarget, newLeaf) => {
        navigations.push({ target: resolvedTarget, newLeaf });
      }
    );

    expect(navigations).toEqual([]);
  });

  it("navigates source links on ctrl-click", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 0, ctrlKey: true });
    const navigations: unknown[] = [];
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      false,
      (resolvedTarget, newLeaf) => {
        navigations.push({ target: resolvedTarget, newLeaf });
      }
    );

    expect(navigations).toEqual([
      { target: { file: sourceFile, line: 4, heading: "Target Heading" }, newLeaf: false }
    ]);
  });

  it("suppresses source links on middle-button mousedown", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 1 });
    const navigations: unknown[] = [];
    let stoppedImmediately = false;
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;

    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      false,
      (resolvedTarget, newLeaf) => {
        navigations.push({ target: resolvedTarget, newLeaf });
      }
    );

    expect({ stoppedImmediately, navigations }).toEqual({
      stoppedImmediately: true,
      navigations: []
    });
  });

  it("navigates live preview rendered source-fallback clicks in the same leaf", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 0 });
    const navigations: unknown[] = [];
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;

    target.classList.add("cm-underline");

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      true,
      (resolvedTarget, newLeaf) => {
        navigations.push({ target: resolvedTarget, newLeaf });
      }
    );

    expect(navigations).toEqual([
      {
        target: { file: sourceFile, line: 4, heading: "Target Heading" },
        newLeaf: false
      }
    ]);
  });

  it("navigates live preview unrendered ctrl-clicks in a new leaf", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 0, ctrlKey: true });
    const navigations: unknown[] = [];
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      true,
      (resolvedTarget, newLeaf) => {
        navigations.push({ target: resolvedTarget, newLeaf });
      }
    );

    expect(navigations).toEqual([
      {
        target: { file: sourceFile, line: 4, heading: "Target Heading" },
        newLeaf: true
      }
    ]);
  });

  it("stops immediate propagation for handled source links", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("mousedown", { button: 0, ctrlKey: true });
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;
    let stoppedImmediately = false;

    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleSourceMouseDown(
      target,
      event,
      view,
      resolver,
      sourceFile.path,
      false,
      () => {
        return;
      }
    );

    expect(stoppedImmediately).toBe(true);
  });

  it("suppresses source auxclick without navigating again", () => {
    const sourceFile = makeFile("reading.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const target = document.createElement("span");
    const event = new MouseEvent("auxclick", { button: 1 });
    const view = {
      posAtDOM: () => 1,
      state: {
        doc: {
          lineAt: () => ({
            from: 0,
            text: "[same-file](#target-heading)"
          })
        }
      }
    } as unknown as EditorView;
    const navigations: unknown[] = [];
    let stoppedImmediately = false;

    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleSourceAuxClick(
      target,
      event,
      view,
      resolver,
      sourceFile.path
    );

    expect({ stoppedImmediately, navigations }).toEqual({
      stoppedImmediately: true,
      navigations: []
    });
  });

  it("suppresses source links on middle-button mouseup without choosing a release target", () => {
    const sourceFile = makeFile("reading.md");
    const event = new MouseEvent("mouseup", { button: 1 });
    const navigations: unknown[] = [];
    const previousLeaf = {} as WorkspaceLeaf;
    let stoppedImmediately = false;

    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    handleSourceMouseUp(
      event,
      {
        previousLeaf,
        target: { file: sourceFile, line: 4, heading: "Target Heading" }
      }
    );

    expect({ stoppedImmediately, navigations }).toEqual({
      stoppedImmediately: true,
      navigations: []
    });
  });
});
