import { MarkdownView, Plugin } from "obsidian";

import { createEditorExtension } from "./editorModeHandler";
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
      createEditorExtension(this.app, resolver, (target, newLeaf) =>
        this.navigate(target, newLeaf)
      )
    );
  }

  private async navigate(target: ResolvedTarget, newLeaf: boolean): Promise<void> {
    await this.app.workspace.openLinkText(target.file.path, "", newLeaf);
    if (target.line !== null) {
      this.app.workspace
        .getActiveViewOfType(MarkdownView)
        ?.setEphemeralState({ line: target.line });
    }
  }
}
