import { describe, expect, it } from "vitest";

import { makeFile } from "./resolver.test-support";
import { buildOpenLinkText } from "./navigation";

describe("buildOpenLinkText", () => {
  it("includes the exact heading when the target has one", () => {
    expect(
      buildOpenLinkText({
        file: makeFile("Other.md"),
        line: 7,
        heading: "Target Heading"
      })
    ).toBe("Other.md#Target Heading");
  });

  it("uses only the file path when the target has no heading", () => {
    expect(
      buildOpenLinkText({
        file: makeFile("Other.md"),
        line: null,
        heading: null
      })
    ).toBe("Other.md");
  });
});
