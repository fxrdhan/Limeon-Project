# Project Info

- Remember is that Bun as the runtime environment in this project.
- This repo uses the native VitePlus toolchain. Prefer `vp` semantics and `bun run` project scripts over raw `vite` or `vitest` commands.
- Always use Exa MCP to search for information on the web and scrape pages.
- Always use Supabase MCP if you need understanding this project databases.
- For any Supabase-related work, inspect `supabase/functions` and `supabase/migrations` first. Treat those paths as the source of truth for file-based changes so Edge Functions and migrations stay tracked in Git.

# Guidelines:

- Run `bun run check --fix [filenames path]` after editing or adding complex lines in code files. This repo's canonical validation entrypoint is `vp check` via the `check` script, so do not call raw `tsc`, `vite`, or `vitest` unless the task explicitly requires it.
- When creating Git commits, use git-commit skills.
- If the user asks to `commit`, immediately spawn exactly 1 subagent to handle the commit workflow instead of doing the commit in the main agent.
- That subagent must use the `git-commit` skill and follow its workflow exactly: inspect repo state and diffs, choose the staging strategy, run required validation from this repo's instructions, create the commit(s) without pushing, and report the commit hash(es) plus any remaining uncommitted changes.
- The main agent should only coordinate and report results for `commit` requests unless the subagent is unavailable or fails.
- Development, build, lint, format, check, and test flows are routed through `vp`/VitePlus. Legacy script names such as `dev:vite` are wrappers around `vp`, not plain Vite CLI usage.
- Testing in this project runs through VitePlus test tooling with Vitest-compatible APIs. Prefer `bun run test:agent` or `bun run test:agent:watch` when running tests. Use `bun run test:run` for regular local terminal output.
- Do not make remote-only Supabase changes first. Update the relevant files under `supabase/functions` or `supabase/migrations`, confirm the intended changes are tracked by Git, then use Supabase MCP to deploy Edge Functions or apply migrations only when those local changes are ready.
- If you need to inspect live database state such as tables, columns, schema definitions, RLS policies, or other metadata not represented in `supabase/`, use Supabase MCP.

# Code Exploration

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

# Minimize Overengineering

- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use backwards-compatibility shims when you can just change the code.
- Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task. Reuse existing abstractions where possible and follow the DRY principle.
