import { Plugin } from "obsidian";

import { createEditorExtension } from "./editorModeHandler";
import { navigateToTarget, type NavigateOptions } from "./navigation";
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
    await navigateToTarget(this.app, target, newLeaf, options);
  }
}
