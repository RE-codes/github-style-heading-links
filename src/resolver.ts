import { TFile } from "obsidian";
import type { App } from "obsidian";

import { buildSlugTable, findHeadingIndexBySlug } from "./slug";
import type { ParsedLink } from "./linkParser";

export interface ResolvedTarget {
  file: TFile;
  line: number | null;
  heading: string | null;
  requiresLineFallback: boolean;
}

export class LinkResolver {
  constructor(private app: App) {}

  resolve(parsed: ParsedLink, sourcePath: string): ResolvedTarget | null {
    const file =
      parsed.pathPart === ""
        ? this.resolveSourceFile(sourcePath)
        : this.app.metadataCache.getFirstLinkpathDest(
            parsed.pathPart,
            sourcePath
          );

    if (!file) {
      return null;
    }

    if (parsed.fragment === null) {
      return {
        file,
        line: null,
        heading: null,
        requiresLineFallback: false
      };
    }

    const headings = this.app.metadataCache.getFileCache(file)?.headings ?? [];
    const slugs = buildSlugTable(headings.map((heading) => heading.heading));
    const headingIndex = findHeadingIndexBySlug(slugs, parsed.fragment);
    // GFM duplicate slugs resolve to later slug-table entries such as foo-1;
    // the first occurrence can still use Obsidian's native #Heading lookup.
    const requiresLineFallback = headingIndex > 0;

    return {
      file,
      line:
        headingIndex >= 0 ? headings[headingIndex].position.start.line : null,
      heading: headingIndex >= 0 ? headings[headingIndex].heading : null,
      requiresLineFallback
    };
  }

  private resolveSourceFile(sourcePath: string): TFile | null {
    const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);

    return sourceFile instanceof TFile ? sourceFile : null;
  }
}
