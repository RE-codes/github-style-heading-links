// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { decideAction } from "./readingModeHandler";

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
