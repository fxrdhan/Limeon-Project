# Project Info

- Remember is that Bun as the runtime environment in this project.
- This repo uses the native VitePlus toolchain. Prefer `vp` semantics and `bun run` project scripts over raw `vite` or `vitest` commands.
- Always use Exa MCP to search for information on the web and scrape pages.
- Always use Supabase MCP if you need understanding this project databases.
- For any Supabase-related work, inspect `supabase/functions` and `supabase/migrations` first. Treat those paths as the source of truth for file-based changes so Edge Functions and migrations stay tracked in Git.

# Guidelines:

- Run `vp check --fix [filenames path]` after editing or adding complex lines in code files. This repo's canonical validation entrypoint is VitePlus `vp check`, so do not call raw `tsc`, `vite`, or `vitest` unless the task explicitly requires it.
- When creating Git commits, use git-commit skills.
- Development, build, lint, format, check, and test flows are routed through `vp`/VitePlus. Legacy script names such as `dev:vite` are wrappers around `vp`, not plain Vite CLI usage.
- Never start `dev` or `preview` servers yourself. Check whether the needed port is already active first; if it is not active, tell the user to start the server and wait for them to do so.
- Respect the React Fast Refresh lint rule `react-refresh/only-export-components`: in files that export React components, do not also export shared hooks, constants, helpers, or other non-component values. Move those exports into a sibling module instead of mixing them into the component file. Only use an inline disable when the file already follows an established repo pattern and separating the exports would be disproportionate.
- Do not make remote-only Supabase changes first. Update the relevant files under `supabase/functions` or `supabase/migrations`, confirm the intended changes are tracked by Git, then use Supabase MCP to deploy Edge Functions or apply migrations only when those local changes are ready.
- If you need to inspect live database state such as tables, columns, schema definitions, RLS policies, or other metadata not represented in `supabase/`, use Supabase MCP.

# Testing Policy

- Testing in this project runs through VitePlus test tooling with Vitest-compatible APIs. Prefer `bun run test:agent` or `bun run test:agent:watch` when running tests. Use `bun run test:run` for regular local terminal output.
- Do not use Playwright CLI or Playwright MCP for UI testing unless the user explicitly asks for it.
- Tests must protect meaningful behavior, not implementation details. Good test targets include important user flows, state transitions, data transformations, persistence/cache behavior, side effects, permissions, failure handling, integration contracts, and regressions that are likely to recur.
- Do not add tests that only verify static UI text, markup shape, element existence, Tailwind/class names, styling/layout values, animation props, focus implementation details, prop wiring to mocked children, or other internal rendering details.
- Do not write "component renders" tests unless the render itself triggers a meaningful behavior or guards a known regression. A test that only proves React mounted a component is noise.
- For UI tests, assert the outcome a user or system depends on: callbacks invoked with correct payloads, disabled/enabled states that enforce rules, submitted data, navigation, persistence, error recovery, or visible state changes tied to real behavior. Avoid asserting exact labels or DOM structure unless accessibility or contract behavior depends on them.
- When touching existing tests, remove or rewrite low-value tests in the edited area instead of preserving them by default. If a test would fail after harmless markup/styling refactors, it is probably too brittle for this project.
- When a change is simple and low risk, prefer no new test over a noisy or brittle test with little regression value.
- Keep test helpers local unless they remove real duplication across meaningful behavior tests. Do not create shared testing abstractions for one-off cases.

# Code Exploration

ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.

# Minimize Overengineering

- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use backwards-compatibility shims when you can just change the code.
- Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task. Reuse existing abstractions where possible and follow the DRY principle.
