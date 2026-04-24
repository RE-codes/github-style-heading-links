// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import {
  createEditorExtension,
  extractMarkdownLinkHrefAtOffset,
  handleRenderedAnchorMouseDown
} from "./editorModeHandler";
import type { App } from "obsidian";
import { makeApp, makeFile, heading } from "./resolver.test-support";
import { LinkResolver } from "./resolver";

describe("createEditorExtension", () => {
  it("returns a CodeMirror extension", () => {
    expect(createEditorExtension).toBeTypeOf("function");
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

    expect(navigations).toEqual([{ file: sourceFile, line: 4 }]);
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

    expect(navigations).toEqual([{ file: sourceFile, line: 4 }]);
  });
});
