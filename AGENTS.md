# Project Info

- Remember is that Bun as the runtime environment in this project.
- This repo uses the native VitePlus toolchain. Prefer `vp` semantics and `bun run` project scripts over raw `vite` or `vitest` commands.
- Always use Exa MCP to search for information on the web and scrape pages.
- Always use Supabase MCP if you need understanding this project databases.

# Guidelines:

- Run `bun run check --fix [filenames path]` after editing or adding complex lines in code files. This repo's canonical validation entrypoint is `vp check` via the `check` script, so do not call raw `tsc`, `vite`, or `vitest` unless the task explicitly requires it.
- When creating Git commits, use git-commit skills.
- Development, build, lint, format, check, and test flows are routed through `vp`/VitePlus. Legacy script names such as `dev:vite` are wrappers around `vp`, not plain Vite CLI usage.
- Testing in this project runs through VitePlus test tooling with Vitest-compatible APIs. Prefer `bun test:run:agent` or `bun test:agent` when running tests. Use `bun test:run` for regular local terminal output.

# Code Exploration

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

# Minimize Overengineering

- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use backwards-compatibility shims when you can just change the code.
- Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task. Reuse existing abstractions where possible and follow the DRY principle.
