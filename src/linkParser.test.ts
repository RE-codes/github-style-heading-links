import { describe, expect, it } from "vitest";

import { parseHref } from "./linkParser";

describe("parseHref", () => {
  it('parses an intra-document fragment link like "#foo"', () => {
    expect(parseHref("#foo")).toEqual({
      raw: "#foo",
      pathPart: "",
      fragment: "foo",
      isExternal: false,
      isAnchorOnly: true
    });
  });

  it('parses a file link like "file.md" with no fragment', () => {
    expect(parseHref("file.md")).toEqual({
      raw: "file.md",
      pathPart: "file.md",
      fragment: null,
      isExternal: false,
      isAnchorOnly: false
    });
  });

  it('parses a file link with a fragment like "file.md#bar"', () => {
    expect(parseHref("file.md#bar")).toEqual({
      raw: "file.md#bar",
      pathPart: "file.md",
      fragment: "bar",
      isExternal: false,
      isAnchorOnly: false
    });
  });

  it("URL-decodes the path and fragment", () => {
    expect(parseHref("Sub%20Dir/F.md#a-b")).toEqual({
      raw: "Sub%20Dir/F.md#a-b",
      pathPart: "Sub Dir/F.md",
      fragment: "a-b",
      isExternal: false,
      isAnchorOnly: false
    });
  });

  it("marks https links as external", () => {
    expect(parseHref("https://x.com")).toEqual({
      raw: "https://x.com",
      pathPart: "https://x.com",
      fragment: null,
      isExternal: true,
      isAnchorOnly: false
    });
  });

  it("marks mailto links as external", () => {
    expect(parseHref("mailto:a@b")).toEqual({
      raw: "mailto:a@b",
      pathPart: "mailto:a@b",
      fragment: null,
      isExternal: true,
      isAnchorOnly: false
    });
  });

  it("marks obsidian URI links as external", () => {
    expect(parseHref("obsidian://open?vault=Test&file=Note")).toEqual({
      raw: "obsidian://open?vault=Test&file=Note",
      pathPart: "obsidian://open?vault=Test&file=Note",
      fragment: null,
      isExternal: true,
      isAnchorOnly: false
    });
  });

  it('treats an empty trailing fragment in "file.md#" as null', () => {
    expect(parseHref("file.md#")).toEqual({
      raw: "file.md#",
      pathPart: "file.md",
      fragment: null,
      isExternal: false,
      isAnchorOnly: false
    });
  });

  it('treats "#" as an anchor-only link with a null fragment', () => {
    expect(parseHref("#")).toEqual({
      raw: "#",
      pathPart: "",
      fragment: null,
      isExternal: false,
      isAnchorOnly: true
    });
  });

  it("parses an empty string as a non-external link with no fragment", () => {
    expect(parseHref("")).toEqual({
      raw: "",
      pathPart: "",
      fragment: null,
      isExternal: false,
      isAnchorOnly: false
    });
  });

  it("falls back to the raw value for malformed URL encoding", () => {
    expect(parseHref("%ZZ")).toEqual({
      raw: "%ZZ",
      pathPart: "%ZZ",
      fragment: null,
      isExternal: false,
      isAnchorOnly: false
    });
  });
});
