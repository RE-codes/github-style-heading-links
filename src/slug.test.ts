import { describe, expect, it } from "vitest";

import {
  buildSlugTable,
  findHeadingIndexBySlug,
  slugify,
  stripMarkdown
} from "./slug";

describe("stripMarkdown", () => {
  it("removes leading heading markers and trims whitespace", () => {
    expect(stripMarkdown("## Hello World  ")).toBe("Hello World");
  });

  it("removes bold markers", () => {
    expect(stripMarkdown("## **Bold**")).toBe("Bold");
  });

  it("removes inline code markers", () => {
    expect(stripMarkdown("## `code()`")).toBe("code()");
  });

  it("replaces markdown links with their text", () => {
    expect(stripMarkdown("## [label](https://example.com)")).toBe("label");
  });

  it("removes markdown images entirely", () => {
    expect(stripMarkdown("## ![alt](image.png)")).toBe("");
  });

  it("removes html tags", () => {
    expect(stripMarkdown("## <em>Hello</em>")).toBe("Hello");
  });

  it("removes italic markers", () => {
    expect(stripMarkdown("## *Italic*")).toBe("Italic");
  });

  it("removes underscore emphasis markers", () => {
    expect(stripMarkdown("## _Italic_")).toBe("Italic");
  });
});

describe("slugify", () => {
  it("slugifies stripped heading text", () => {
    expect(slugify("## Hello World")).toBe("hello-world");
  });

  it("slugifies formatted heading text", () => {
    expect(slugify("## **Hello** World")).toBe("hello-world");
  });

  it("drops emoji from slugs", () => {
    expect(slugify("## 😄 hi")).toBe("hi");
  });

  it("returns an empty slug for punctuation-only headings", () => {
    expect(slugify("## !!!")).toBe("");
  });

  it("returns an empty slug for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("preserves meaningful underscores", () => {
    expect(slugify("## snake_case")).toBe("snake_case");
  });

  it("slugifies square-bracket heading text like GitHub", () => {
    expect(slugify("## API [v2]")).toBe("api-v2");
  });

  it("slugifies escaped square-bracket punctuation like GitHub", () => {
    // TS "\\[" encodes the Markdown source "\[".
    expect(slugify("## Foo \\[bar\\]")).toBe("foo-bar");
  });

  it("slugifies setext H1 headings (=== underline) like ATX", () => {
    expect(slugify("Heading\n=======")).toBe("heading");
    expect(slugify("Heading\n=======\n")).toBe("heading");
  });

  it("slugifies setext H2 headings (--- underline) like ATX", () => {
    expect(slugify("Heading\n-------")).toBe("heading");
    expect(slugify("Heading\n-------\n")).toBe("heading");
  });
});

describe("buildSlugTable", () => {
  it("adds collision suffixes for duplicate headings", () => {
    expect(buildSlugTable(["Foo", "Foo", "Foo"])).toEqual([
      "foo",
      "foo-1",
      "foo-2"
    ]);
  });

  it("tracks duplicates across interspersed headings", () => {
    expect(buildSlugTable(["Foo", "Bar", "Foo"])).toEqual([
      "foo",
      "bar",
      "foo-1"
    ]);
  });

  it("slugifies raw markdown headings", () => {
    expect(buildSlugTable(["## Foo **Bar**"])).toEqual(["foo-bar"]);
  });

  it("uses GitHub slugs for square-bracket heading text", () => {
    expect(buildSlugTable(["## API [v2]"])).toEqual(["api-v2"]);
  });

  it("uses GitHub slugs for escaped square-bracket punctuation", () => {
    expect(buildSlugTable(["## Foo \\[bar\\]"])).toEqual(["foo-bar"]);
  });
});

describe("findHeadingIndexBySlug", () => {
  it("returns the index of a matching slug", () => {
    expect(findHeadingIndexBySlug(["foo", "bar", "baz"], "bar")).toBe(1);
  });

  it("returns -1 when the slug is missing", () => {
    expect(findHeadingIndexBySlug(["foo", "bar", "baz"], "qux")).toBe(-1);
  });
});
