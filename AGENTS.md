# AGENTS.md - github-style-heading-links

## Project Working Rules

1. **TDD** - Follow strict TDD for behavior changes.
  - State the behavior being changed.
  - Name the test to write or run before making the change.
  - Follow RED -> GREEN -> REFACTOR; do not claim done at GREEN.
  - After GREEN, either make a no-behavior-change refactor or state why none is warranted.
  - After each step, run the narrowest relevant test or verification.
  - Report results explicitly.
  - Claim completion only after validation.
  - If permission for a change is rejected, find out why before trying again.

2. **Testing** - Prefer focused pure-function tests for parsing and slug logic before integration-style behavior.

3. **Obsidian Parity** - Preserve native Obsidian behavior unless the task explicitly changes it.
  - Verify behavior carefully around Obsidian APIs, cache timing, DOM/events, and mode differences.

4. **Ground Decisions on Real Information** - Avoid guessing or making assumptions.
  - use Context7 to reference needed API information, including Obsidian API and CodeMirror.

5. **Use the `package.json`** - Prefer `package.json` scripts for build, test, check, lint, and vault-sync tasks.
  - Inspect `package.json` first.
  - Run the relevant `npm run ...` script instead of invoking underlying tools directly, unless there is a specific reason to bypass the script.

## Project Notes

- Use the local dev vault path from `OBSIDIAN_VAULT_PLUGIN_DIR`.
  - When making changes to the test fixtures, remember to copy them over to the dev vault.
- Use synced plugin artifacts for Windows Obsidian when working from WSL.
- Planning docs live in `/plan`. Use these for reference.
