# AGENTS.md - Project Preferences

## Working Style

- This project is a pair-programming exercise, not a speed run.
- Optimize for clarity, traceability, and small safe steps over rapid implementation.
- Treat the user as an experienced backend engineer refreshing ES6/TypeScript and learning AI-assisted development patterns.
- Explain reasoning before making edits.
- Keep explanations technical and concrete. Do not pad with encouragement or generic commentary.

## TDD Rules

- Prefer short RED -> GREEN -> REFACTOR loops for behavior changes, but do not force ceremony when the next step is obvious.
- Before editing code, state the behavior being implemented and the smallest likely change.
- Prefer one behavior per loop unless batching is clearly more efficient.
- If a bug is found during manual testing, capture it in an automated failing test when practical.

## Pairing Cadence

- Default cadence:
  1. Summarize the next micro-goal.
  2. Propose the next test or verification step.
  3. Make the smallest reasonable change.
  4. Run tests immediately.
  5. Summarize result and propose the next step.
- If the next step is obvious and low risk, proceed without unnecessary blocking, but still explain reasoning before edits.
- Keep each loop small enough that the diff is easy to review quickly.

## Teaching Preferences

- When introducing ES6/TypeScript or Obsidian-plugin-specific patterns, explain the local reason for the pattern.
- Prefer short explanations tied to the current code over generic tutorials.
- When using less obvious JavaScript or TypeScript features, call them out briefly.
- Surface tradeoffs explicitly when they matter.

## Scope Control

- Stay inside the current step of the plan unless the user explicitly expands scope.
- Do not scaffold future steps early unless it materially reduces churn in the current step.
- Do not fix adjacent issues opportunistically unless they block the current task.
- Preserve MVP boundaries from the plan.

## Editing Rules

- Read the entire file before editing it. For new files, read relevant neighboring files first when they exist.
- Prefer minimal diffs.
- Do not make cosmetic refactors during a behavior-focused loop unless they are required to complete the loop safely.
- When modifying a file, mention which file is being changed and why.
- If a planned change spans multiple files, explain why that is necessary before editing.

## Testing Rules

- After any code change, immediately run the narrowest relevant test first.
- If that passes, run the next broader relevant test set when appropriate.
- After modifying executable files, hooks, scripts, or config, propose and run an appropriate verification command immediately.
- If a test cannot be run, state exactly why.
- Do not claim completion without reporting test results.

## Review Expectations

- Treat review comments as risk analysis first: bugs, regressions, incorrect assumptions, and missing tests.
- Be explicit about uncertainty in plugin API behavior, DOM or event behavior, and Obsidian cache timing.
- When behavior depends on undocumented or fragile APIs, say so clearly.

## Obsidian Plugin Project Notes

- Preserve native Obsidian behavior unless the current step explicitly changes it.
- Be cautious around:
  - `metadataCache`
  - heading cache timing
  - CodeMirror event handling
  - differences across Reading, Live Preview, and Source modes
- Prefer pure-function tests for parsing and slug logic before adding integration-style behavior.
- For regressions found in fixtures or manual QA, add a focused automated test before fixing when practical.

## Dev Vault

- The local dev vault path is environment-specific and should not be committed into repo workflow files.
- When proposing manual Obsidian verification steps, assume the active vault target is defined locally via `OBSIDIAN_VAULT_PLUGIN_DIR` unless the user says otherwise.
- Keep plugin QA instructions explicit about whether they happen in the repo workspace or inside the dev vault.
- This repo may live on the WSL filesystem while Obsidian runs natively on Windows against a vault on the Windows filesystem.
- Do not assume a Windows Obsidian instance can load a plugin symlink that points into `/home/...` on WSL. The known-safe fallback is a real plugin directory in the vault populated by copied or synced build artifacts.
- Set `OBSIDIAN_VAULT_PLUGIN_DIR` in a local `.env` file or in the environment before running `npm run sync` or `npm run dev`.
- `npm run dev` is expected to rebuild and sync the plugin artifacts automatically after successful builds.

## Communication Style

- Be concise by default, but do not omit the reasoning needed for the current step.
- Use concrete file and function names.
- Distinguish clearly between observed facts, inferences, and proposed next steps.
- Challenge weak assumptions directly.

## Permissions And Safety

- Do not use sub-agents unless the user explicitly approves it first.
- Do not perform destructive operations without previewing affected paths and getting confirmation.
- If the environment is read-only or otherwise restricted, explain the limitation plainly and state the next action requiring approval.
