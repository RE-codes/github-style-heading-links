import { MarkdownView, Plugin } from "obsidian";

import { createEditorExtension, type NavigateOptions } from "./editorModeHandler";
import { buildOpenLinkText } from "./navigation";
import { createReadingModeHandler } from "./readingModeHandler";
import { LinkResolver, type ResolvedTarget } from "./resolver";

export default class GitHubStyleHeadingLinksPlugin extends Plugin {
  async onload(): Promise<void> {
    const resolver = new LinkResolver(this.app);
    this.registerMarkdownPostProcessor(
      createReadingModeHandler(this.app, resolver, (target, newLeaf) =>
        this.navigate(target, newLeaf)
      )
    );
    this.registerEditorExtension(
      createEditorExtension(this.app, resolver, (target, newLeaf, options) =>
        this.navigate(target, newLeaf, options)
      )
    );
  }

  private async navigate(
    target: ResolvedTarget,
    newLeaf: boolean,
    options: NavigateOptions = {}
  ): Promise<void> {
    await this.app.workspace.openLinkText(buildOpenLinkText(target), "", newLeaf);
    if (options.fallbackToLine !== false && !newLeaf && target.line !== null) {
      this.app.workspace
        .getActiveViewOfType(MarkdownView)
        ?.setEphemeralState({ line: target.line });
    }
  }
}
