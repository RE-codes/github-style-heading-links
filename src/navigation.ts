import type { ResolvedTarget } from "./resolver";

export function buildOpenLinkText(target: ResolvedTarget): string {
  if (target.heading === null) {
    return target.file.path;
  }

  return `${target.file.path}#${target.heading}`;
}
