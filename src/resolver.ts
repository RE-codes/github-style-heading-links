import type { App, TFile } from "obsidian";

import { buildSlugTable, findHeadingIndexBySlug } from "./slug";
import type { ParsedLink } from "./linkParser";

export interface ResolvedTarget {
  file: TFile;
  line: number | null;
}

export class LinkResolver {
  constructor(private app: App) {}

  resolve(parsed: ParsedLink, sourcePath: string): ResolvedTarget | null {
    const file =
      parsed.pathPart === ""
        ? (this.app.vault.getAbstractFileByPath(sourcePath) as TFile | null)
        : this.app.metadataCache.getFirstLinkpathDest(
            parsed.pathPart,
            sourcePath
          );

    if (!file) {
      return null;
    }

    if (parsed.fragment == null) {
      return {
        file,
        line: null
      };
    }

    const headings = this.app.metadataCache.getFileCache(file)?.headings ?? [];
    const slugs = buildSlugTable(headings.map((heading) => heading.heading));
    const headingIndex = findHeadingIndexBySlug(slugs, parsed.fragment);

    return {
      file,
      line:
        headingIndex >= 0 ? headings[headingIndex].position.start.line : null
    };
  }
}
