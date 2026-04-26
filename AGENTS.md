# Project Context

## Runtime and Tooling

- Use Bun as the runtime environment for this project.
- This repo uses the native VitePlus toolchain. Prefer direct `vp` commands over package script wrappers for VitePlus workflows.
- Development, build, lint, format, check, and test flows are routed through `vp`/VitePlus.
- Legacy script names such as `dev:vite` are wrappers around `vp`, not plain Vite CLI usage.
- Use Bun for the runtime/package manager, but avoid package-script wrappers for VitePlus workflows when an equivalent `vp` command exists.

## External Research

- Always use Exa MCP to search the web and scrape pages.

## Supabase

- Always use Supabase MCP when you need to understand this project's databases.
- For any Supabase-related work, inspect `supabase/functions` and `supabase/migrations` first.
- Treat `supabase/functions` and `supabase/migrations` as the source of truth for file-based changes so Edge Functions and migrations stay tracked in Git.
- Do not make remote-only Supabase changes first. Update the relevant local files, confirm the intended changes are tracked by Git, then use Supabase MCP to deploy Edge Functions or apply migrations only when those local changes are ready.
- If you need to inspect live database state such as tables, columns, schema definitions, RLS policies, or other metadata not represented in `supabase/`, use Supabase MCP.

# Code Exploration

- Always read and understand relevant files before proposing code edits.
- Do not speculate about code you have not inspected.
- If the user references a specific file or path, open and inspect it before explaining or proposing fixes.
- Be rigorous and persistent when searching the codebase for key facts.
- Review the existing style, conventions, and abstractions before implementing new features or abstractions.

# Development Workflow

## Validation

- Run `vp check --fix [filenames path]` after editing or adding complex lines in code files.
- This repo's canonical validation entrypoint is VitePlus `vp check`; do not call raw `tsc`, `vite`, or `vitest` unless the task explicitly requires it.

## Local Servers

- Never start `dev` or `preview` servers yourself.
- Before working with a local server, check whether the needed port is already active.
- If the needed port is not active, tell the user to start the server and wait for them to do so.

## React Modules

- Respect the React Fast Refresh lint rule `react-refresh/only-export-components`.
- In files that export React components, do not also export shared hooks, constants, helpers, or other non-component values.
- Move shared exports into a sibling module instead of mixing them into the component file.
- Only use an inline disable when the file already follows an established repo pattern and separating the exports would be disproportionate.

## Git

- When creating Git commits, use the `git-commit` skill.

# Testing Policy

## Test Commands

- Testing in this project runs through VitePlus test tooling with Vitest-compatible APIs.
- Prefer `AI_AGENT=codex vp test run --passWithNoTests` when running agent tests.
- Use `AI_AGENT=codex vp test watch` for agent test watch mode.
- Use `vp test run --passWithNoTests` for regular local terminal output.
- Do not use Playwright CLI or Playwright MCP for UI testing unless the user explicitly asks for it.

## Test Quality

- Tests must protect meaningful behavior, not implementation details.
- Good test targets include important user flows, state transitions, data transformations, persistence/cache behavior, side effects, permissions, failure handling, integration contracts, and regressions that are likely to recur.
- Do not add tests that only verify static UI text, markup shape, element existence, Tailwind/class names, styling/layout values, animation props, focus implementation details, prop wiring to mocked children, or other internal rendering details.
- Do not write "component renders" tests unless the render itself triggers meaningful behavior or guards a known regression.
- A test that only proves React mounted a component is noise.
- For UI tests, assert the outcome a user or system depends on: callbacks invoked with correct payloads, disabled/enabled states that enforce rules, submitted data, navigation, persistence, error recovery, or visible state changes tied to real behavior.
- Avoid asserting exact labels or DOM structure unless accessibility or contract behavior depends on them.
- When a change is simple and low risk, prefer no new test over a noisy or brittle test with little regression value.

## Test Maintenance

- If a pre-commit hook fails in a test file, check whether it is a static type or lint error in the test itself rather than a failing runtime test.
- When a DOM matcher depends on a specific element type, narrow the element first instead of asserting against a generic `HTMLElement`.
- When touching existing tests, remove or rewrite low-value tests in the edited area instead of preserving them by default.
- If a test would fail after harmless markup or styling refactors, it is probably too brittle for this project.
- Keep test helpers local unless they remove real duplication across meaningful behavior tests.
- Do not create shared testing abstractions for one-off cases.

# Implementation Scope

- Avoid over-engineering.
- Only make changes that are directly requested or clearly necessary.
- Keep solutions simple and focused.
- Do not add features, refactor code, or make improvements beyond what was asked.
- A bug fix does not need surrounding code cleaned up.
- A simple feature does not need extra configurability.
- Do not add error handling, fallbacks, or validation for scenarios that cannot happen.
- Trust internal code and framework guarantees.
- Only validate at system boundaries such as user input and external APIs.
- Do not use backward-compatibility shims when you can change the code directly.
- Do not create helpers, utilities, or abstractions for one-time operations.
- Do not design for hypothetical future requirements.
- The right amount of complexity is the minimum needed for the current task.
- Reuse existing abstractions where possible and follow the DRY principle.
