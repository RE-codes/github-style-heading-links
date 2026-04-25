import type { ResolvedTarget } from "./resolver";
import { MarkdownView, type App } from "obsidian";

export type NavigateOptions = {
  fallbackToLine?: boolean;
};

export function buildOpenLinkText(target: ResolvedTarget): string {
  // Duplicate GFM slug targets must skip Obsidian's native #Heading lookup,
  // which cannot distinguish repeated headings with the same text.
  if (target.heading === null || target.requiresLineFallback) {
    return target.file.path;
  }

  return `${target.file.path}#${target.heading}`;
}

export async function navigateToTarget(
  app: App,
  target: ResolvedTarget,
  newLeaf: boolean,
  options: NavigateOptions = {}
): Promise<void> {
  await app.workspace.openLinkText(buildOpenLinkText(target), "", newLeaf);
  if (shouldFallbackToLine(target, newLeaf, options)) {
    app.workspace
      .getActiveViewOfType(MarkdownView)
      ?.setEphemeralState({ line: target.line });
  }
}

function shouldFallbackToLine(
  target: ResolvedTarget,
  newLeaf: boolean,
  options: NavigateOptions
): boolean {
  if (options.fallbackToLine === false || target.line === null) {
    return false;
  }

  return !newLeaf || target.requiresLineFallback;
}
