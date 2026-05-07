# AGENTS.md - Project Working Rules

1. Work in small, reviewable steps.
   - State the next micro-goal.
   - Make the smallest reasonable change.
   - Validate immediately.

2. Explain before editing and follow strict TDD.
   - State the behavior being changed.
   - Name the file(s) being changed.
   - State the next test to write or run before making the change.
   - Explain why this is the smallest safe change.

3. Test every code or config change.
   - Follow RED -> GREEN -> REFACTOR when changing behavior.
   - After any code or config edit, run the narrowest relevant test or verification first.
   - Report results explicitly.
   - Claim completion only after validation.

4. Stay in scope.
   - Keep changes tightly aligned to the current step.

5. Prefer minimal diffs and concrete communication.
   - Use concise technical explanations.
   - Mention specific files and functions.
   - Distinguish facts, inferences, and next steps.
   - Avoid filler.

6. Prefer facts over inference.
   - Verify material facts from the code, tests, docs, or other available sources before relying on inference.
   - Distinguish clearly between observed facts, inferences, and open questions.
   - Reduce uncertainty by checking the relevant source rather than guessing.

7. Work as a pair programmer.
   - Provide short explanations tied to the current code over generic tutorials.
   - Surface tradeoffs and uncertainties as they arise.
   - Challenge weak assumptions directly.
   - Propose the next small step before making changes.
   - If permission for a change is rejected, find out why before trying again.

## Project Notes

- Preserve native Obsidian behavior unless the task explicitly changes it.
- Prefer focused pure-function tests for parsing and slug logic before integration-style behavior.
- Verify behavior carefully around Obsidian APIs, cache timing, DOM/events, and mode differences.
- Use the local dev vault path from `OBSIDIAN_VAULT_PLUGIN_DIR`.
- Use existing `package.json` scripts when running tests, syncing the vault plugin assets, or running a build.
- Use synced plugin artifacts for Windows Obsidian when working from WSL.
