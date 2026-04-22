import { beforeEach, describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { TFile } from "obsidian";

import { LinkResolver } from "./resolver";
import { heading, makeApp, makeFile, makeFolder } from "./resolver.test-support";

describe("LinkResolver", () => {
  let sourceFile: TFile;

  beforeEach(() => {
    sourceFile = makeFile("Note.md");
  });

  it("resolves an intra-document fragment against the source file", () => {
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("Foo", 12)]]]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "#foo",
          pathPart: "",
          fragment: "foo",
          isExternal: false,
          isAnchorOnly: true
        },
        sourceFile.path
      )
    ).toEqual({
      file: sourceFile,
      line: 12
    });
  });

  it("resolves a cross-document fragment against the target file", () => {
    const targetFile = makeFile("Other.md");
    const app = makeApp({
      files: [sourceFile],
      resolvedFiles: [targetFile],
      headingEntries: [[targetFile, [heading("Bar", 7)]]]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "Other.md#bar",
          pathPart: targetFile.path,
          fragment: "bar",
          isExternal: false,
          isAnchorOnly: false
        },
        sourceFile.path
      )
    ).toEqual({
      file: targetFile,
      line: 7
    });
  });

  it("returns null when the target file cannot be resolved", () => {
    const app = makeApp({
      files: [sourceFile]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "Missing.md#bar",
          pathPart: "Missing.md",
          fragment: "bar",
          isExternal: false,
          isAnchorOnly: false
        },
        sourceFile.path
      )
    ).toBeNull();
  });

  it("returns the file with a null line when the heading slug is missing", () => {
    const targetFile = makeFile("Other.md");
    const app = makeApp({
      files: [sourceFile],
      resolvedFiles: [targetFile],
      headingEntries: [[targetFile, [heading("Bar", 7)]]]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "Other.md#missing",
          pathPart: targetFile.path,
          fragment: "missing",
          isExternal: false,
          isAnchorOnly: false
        },
        sourceFile.path
      )
    ).toEqual({
      file: targetFile,
      line: null
    });
  });

  it("returns the file with a null line when the parsed link has no fragment", () => {
    const targetFile = makeFile("Other.md");
    const app = makeApp({
      files: [sourceFile],
      resolvedFiles: [targetFile],
      getFileCache: () => {
        throw new Error("getFileCache should not be called when fragment is null");
      }
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "Other.md",
          pathPart: targetFile.path,
          fragment: null,
          isExternal: false,
          isAnchorOnly: false
        },
        sourceFile.path
      )
    ).toEqual({
      file: targetFile,
      line: null
    });
  });

  it("resolves duplicate headings by matching the collision suffix", () => {
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [
        [sourceFile, [heading("Foo", 3), heading("Foo", 8), heading("Foo", 15)]]
      ]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "#foo-2",
          pathPart: "",
          fragment: "foo-2",
          isExternal: false,
          isAnchorOnly: true
        },
        sourceFile.path
      )
    ).toEqual({
      file: sourceFile,
      line: 15
    });
  });

  it("resolves formatted headings using the slug helpers", () => {
    const app = makeApp({
      files: [sourceFile],
      headingEntries: [[sourceFile, [heading("**Bold**", 21)]]]
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "#bold",
          pathPart: "",
          fragment: "bold",
          isExternal: false,
          isAnchorOnly: true
        },
        sourceFile.path
      )
    ).toEqual({
      file: sourceFile,
      line: 21
    });
  });

  it("returns null when the source path resolves to a folder", () => {
    const sourceFolder = makeFolder("Notes");
    const app = makeApp({
      files: [sourceFolder],
      getFileCache: () => {
        throw new Error("getFileCache should not be called for a folder");
      }
    });

    const resolver = new LinkResolver(app as unknown as App);

    expect(
      resolver.resolve(
        {
          raw: "#foo",
          pathPart: "",
          fragment: "foo",
          isExternal: false,
          isAnchorOnly: true
        },
        sourceFolder.path
      )
    ).toBeNull();
  });
});
