import { describe, expect, it } from "vitest";
import type { App } from "obsidian";

import { makeFile } from "./resolver.test-support";
import { buildOpenLinkText, navigateToTarget } from "./navigation";

describe("buildOpenLinkText", () => {
  it("includes the exact heading when the target has one", () => {
    expect(
      buildOpenLinkText({
        file: makeFile("Other.md"),
        line: 7,
        heading: "Target Heading",
        requiresLineFallback: false
      })
    ).toBe("Other.md#Target Heading");
  });

  it("uses only the file path when the target has no heading", () => {
    expect(
      buildOpenLinkText({
        file: makeFile("Other.md"),
        line: null,
        heading: null,
        requiresLineFallback: false
      })
    ).toBe("Other.md");
  });

  it("uses only the file path when line fallback is required", () => {
    expect(
      buildOpenLinkText({
        file: makeFile("duplicates.md"),
        line: 8,
        heading: "Foo",
        requiresLineFallback: true
      })
    ).toBe("duplicates.md");
  });
});

describe("navigateToTarget", () => {
  it("uses line fallback for duplicate heading targets opened in a new leaf", async () => {
    const events: unknown[] = [];
    const app = {
      workspace: {
        openLinkText: async (
          linktext: string,
          sourcePath: string,
          newLeaf: boolean
        ) => {
          events.push({ linktext, sourcePath, newLeaf });
        },
        getActiveViewOfType: () => ({
          setEphemeralState: (state: unknown) => {
            events.push({ state });
          }
        })
      }
    };

    await navigateToTarget(
      app as unknown as App,
      {
        file: makeFile("duplicates.md"),
        line: 8,
        heading: "Foo",
        requiresLineFallback: true
      },
      true
    );

    expect(events).toEqual([
      { linktext: "duplicates.md", sourcePath: "", newLeaf: true },
      { state: { line: 8 } }
    ]);
  });
});
