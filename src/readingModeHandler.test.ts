// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { decideAction, handleReadingAnchorEvent } from "./readingModeHandler";
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
});

describe("handleReadingAnchorEvent", () => {
  it("navigates middle-clicks in a new leaf", () => {
    const sourceFile = makeFile("reading.md");
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
      { target: { file: sourceFile, line: 4, heading: "Target Heading" }, newLeaf: true }
    ]);
  });
});
