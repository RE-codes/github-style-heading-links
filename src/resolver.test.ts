import { describe, expect, it } from "vitest";

import { LinkResolver } from "./resolver";

describe("LinkResolver", () => {
  it("resolves an intra-document fragment against the source file", () => {
    const sourceFile = { path: "Note.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: () => null,
        getFileCache: (file: { path: string }) =>
          file.path === sourceFile.path
            ? {
                headings: [
                  {
                    heading: "Foo",
                    position: { start: { line: 12 } }
                  }
                ]
              }
            : null
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const targetFile = { path: "Other.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: (linkpath: string, sourcePath: string) =>
          linkpath === targetFile.path && sourcePath === sourceFile.path
            ? targetFile
            : null,
        getFileCache: (file: { path: string }) =>
          file.path === targetFile.path
            ? {
                headings: [
                  {
                    heading: "Bar",
                    position: { start: { line: 7 } }
                  }
                ]
              }
            : null
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: () => null,
        getFileCache: () => null
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const targetFile = { path: "Other.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: (linkpath: string) =>
          linkpath === targetFile.path ? targetFile : null,
        getFileCache: (file: { path: string }) =>
          file.path === targetFile.path
            ? {
                headings: [
                  {
                    heading: "Bar",
                    position: { start: { line: 7 } }
                  }
                ]
              }
            : null
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const targetFile = { path: "Other.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: (linkpath: string) =>
          linkpath === targetFile.path ? targetFile : null,
        getFileCache: () => {
          throw new Error("getFileCache should not be called when fragment is null");
        }
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: () => null,
        getFileCache: (file: { path: string }) =>
          file.path === sourceFile.path
            ? {
                headings: [
                  {
                    heading: "Foo",
                    position: { start: { line: 3 } }
                  },
                  {
                    heading: "Foo",
                    position: { start: { line: 8 } }
                  },
                  {
                    heading: "Foo",
                    position: { start: { line: 15 } }
                  }
                ]
              }
            : null
      }
    };

    const resolver = new LinkResolver(app as never);

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
    const sourceFile = { path: "Note.md" };
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) =>
          path === sourceFile.path ? sourceFile : null
      },
      metadataCache: {
        getFirstLinkpathDest: () => null,
        getFileCache: (file: { path: string }) =>
          file.path === sourceFile.path
            ? {
                headings: [
                  {
                    heading: "**Bold**",
                    position: { start: { line: 21 } }
                  }
                ]
              }
            : null
      }
    };

    const resolver = new LinkResolver(app as never);

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
});
