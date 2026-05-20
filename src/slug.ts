import GithubSlugger from "github-slugger";

export function stripMarkdown(raw: string): string {
  return raw
    .replace(/^#+\s*/, "")
    .replace(/\r?\n[ \t]*[=-]+\s*$/, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*/g, "")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim();
}

export function slugify(raw: string): string {
  return new GithubSlugger().slug(stripMarkdown(raw));
}

/**
 * Builds GitHub-style slugs from raw heading strings in document order.
 * Each input may still include markdown heading markers and inline formatting.
 */
export function buildSlugTable(headings: string[]): string[] {
  const slugger = new GithubSlugger();

  return headings.map((heading) => slugger.slug(stripMarkdown(heading)));
}

export function findHeadingIndexBySlug(
  slugs: string[],
  target: string
): number {
  return slugs.indexOf(target);
}
