# github-style-heading-links
Plugin for Obsidian to create support for GFM/VS Code style heading fragment links.

## Dev workflow

This repo is developed from WSL against a native Windows Obsidian vault.

- `npm run dev` watches `src/main.ts`, rebuilds `main.js`, and syncs `manifest.json`, `main.js`, and `styles.css` into the vault plugin directory after successful builds.
- `npm run sync` performs the artifact copy once.
- Set `OBSIDIAN_VAULT_PLUGIN_DIR` in a local `.env` file or in the environment before running the sync commands.
