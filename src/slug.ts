import GithubSlugger from "github-slugger";

export function stripMarkdown(raw: string): string {
  return raw
    .replace(/^#+\s*/, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim();
}

export function slugify(raw: string): string {
  return new GithubSlugger().slug(stripMarkdown(raw));
}

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
