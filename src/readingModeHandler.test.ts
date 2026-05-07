// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import {
  createReadingModeHandler,
  decideAction,
  handleReadingAnchorEvent
} from "./readingModeHandler";
import type { App } from "obsidian";
import { heading, makeApp, makeFile } from "./resolver.test-support";
import { LinkResolver } from "./resolver";

describe("decideAction", () => {
  it("ignores external links", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://x";

    expect(decideAction(anchor)).toEqual({ kind: "ignore" });
  });

  it("ignores tag links", () => {
    const anchor = document.createElement("a");
    anchor.classList.add("tag");
    anchor.setAttribute("data-href", "#tag");

    expect(decideAction(anchor)).toEqual({ kind: "ignore" });
  });

  it("prefers data-href over href", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("data-href", "#foo");
    anchor.href = "#";

    expect(decideAction(anchor)).toEqual({ kind: "resolve", href: "#foo" });
  });

  it("falls back to href", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "file.md#bar");

    expect(decideAction(anchor)).toEqual({
      kind: "resolve",
      href: "file.md#bar"
    });
  });

  it("ignores empty hrefs", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "");

    expect(decideAction(anchor)).toEqual({ kind: "ignore" });
  });

  it("ignores native heading fragments", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "#Another%20Heading");

    expect(decideAction(anchor)).toEqual({ kind: "ignore" });
  });

  it("ignores file-only links so native Obsidian handles them", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "Other.md");

    expect(decideAction(anchor)).toEqual({ kind: "ignore" });
  });
});

describe("handleReadingAnchorEvent", () => {
  it("does not intercept missing-file links", () => {
    const sourceFile = makeFile("test-source.md");
    const app = makeApp({
      files: [sourceFile]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    });
    const navigations: unknown[] = [];
    let stopped = false;
    let stoppedImmediately = false;

    anchor.setAttribute("data-href", "Missing.md#x");
    event.stopPropagation = () => {
      stopped = true;
    };
    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    const handled = handleReadingAnchorEvent(
      anchor,
      event,
      resolver,
      sourceFile.path,
      (target, newLeaf) => {
        navigations.push({ target, newLeaf });
      }
    );

    expect({
      handled,
      defaultPrevented: event.defaultPrevented,
      stopped,
      stoppedImmediately,
      navigations
    }).toEqual({
      handled: false,
      defaultPrevented: false,
      stopped: false,
      stoppedImmediately: false,
      navigations: []
    });
  });

  it("does not intercept slug-shaped fragments that match native headings exactly", () => {
    const sourceFile = makeFile("test-source.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("foo-bar", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("click");
    const navigations: unknown[] = [];
    let stoppedImmediately = false;

    anchor.setAttribute("data-href", "#foo-bar");
    event.stopImmediatePropagation = () => {
      stoppedImmediately = true;
    };

    const handled = handleReadingAnchorEvent(
      anchor,
      event,
      resolver,
      sourceFile.path,
      (target, newLeaf) => {
        navigations.push({ target, newLeaf });
      }
    );

    expect({ handled, stoppedImmediately, navigations }).toEqual({
      handled: false,
      stoppedImmediately: false,
      navigations: []
    });
  });

  it("navigates middle-clicks in a new leaf", () => {
    const sourceFile = makeFile("test-source.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const anchor = document.createElement("a");
    const event = new MouseEvent("auxclick", { button: 1 });
    const navigations: unknown[] = [];

    anchor.setAttribute("data-href", "#target-heading");

    handleReadingAnchorEvent(anchor, event, resolver, sourceFile.path, (target, newLeaf) => {
      navigations.push({ target, newLeaf });
    });

    expect(navigations).toEqual([
      {
        target: {
          file: sourceFile,
          line: 4,
          heading: "Target Heading",
          requiresLineFallback: false
        },
        newLeaf: true
      }
    ]);
  });
});

describe("createReadingModeHandler", () => {
  it("does not attach duplicate listeners to the same anchor", () => {
    const sourceFile = makeFile("test-source.md");
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Target Heading", 4)]]]
    });
    const resolver = new LinkResolver(app as unknown as App);
    const container = document.createElement("div");
    const anchor = document.createElement("a");
    const navigations: unknown[] = [];
    const handler = createReadingModeHandler(
      app as unknown as App,
      resolver,
      (target, newLeaf) => {
        navigations.push({ target, newLeaf });
      }
    );

    anchor.setAttribute("data-href", "#target-heading");
    container.append(anchor);

    handler(container, { sourcePath: sourceFile.path } as never);
    handler(container, { sourcePath: sourceFile.path } as never);
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );

    expect(navigations).toEqual([
      {
        target: {
          file: sourceFile,
          line: 4,
          heading: "Target Heading",
          requiresLineFallback: false
        },
        newLeaf: false
      }
    ]);
  });
});
