---
name: git-commit
description: Create clean, conventional commits without pushing. Use when the user asks to "commit", wants a generated commit message, wants add-all staging, or wants commits split logically based on git diff analysis.
---

# Git Commit

## Overview

Inspect the working tree, choose a staging strategy (add all vs split by diff), run required validation commands, and create conventional commits. Do not push.

## Quick Workflow

1. Confirm repository state.
   Run:

```bash
git status --porcelain
git diff --stat
git diff
```

Optional helper:

```bash
~/.codex/skills/git-commit/scripts/diff-summary.sh
```

2. Choose a staging strategy from the diff.
   Pick the narrowest staging approach that keeps each commit to a single “why”.

Decision guide:

- Use **add-all** when everything is one coherent concern (a single feature/fix/refactor) and the commit message won’t need “and”.
- Use **add by paths** when the changes are multiple concerns but cleanly separated by files/folders.
- Use **add interactively (`-p`)** when different concerns are mixed within the same file (common with formatting + logic, refactor + fix, etc.).

3. Stage changes.

Add-all strategy:

```bash
git add -A
```

Split-by-path strategy (repeat per logical commit):

```bash
git add <paths>
git diff --cached
```

Split-by-hunk strategy (repeat per logical commit):

```bash
git add -p
# or: git add -p <path>
git diff --cached
```

If you staged too much:

```bash
git restore --staged <paths>
```

4. Run required validation before each commit.
   Always follow repository-level agent instructions first (for example `AGENTS.md`) and run the required validator command.
   If the repository exposes a canonical validation script such as `check`, prefer that script first.
   If the repository routes tooling through project scripts or wrapper CLIs, prefer those entrypoints over raw upstream commands. Examples: `bun run check`, `bun test:run`, or `vp test` instead of calling `tsc`, `vitest`, or `vite` directly.
   If repo instructions and package scripts appear to conflict, treat raw tool commands in docs as potentially stale and verify the canonical script entrypoint from `package.json` before committing.
   Default when no repo-specific override exists:

```bash
npx oxlint <paths> --fix && npx tsc -b --noEmit
```

Use the staged paths where practical. If the staged set is large or mixed, use broader paths that cover the staged files.

5. Commit with a conventional commit message.
   Use:

```bash
git commit -m "type(scope): subject"
```

For multiline messages (subject + body), prefer a heredoc so the body stays readable and compact:

```bash
git commit -F - <<'EOF'
type(scope): subject

Why (intent/context)
What changed (high-level)
Notes (migrations, flags, follow-ups)
EOF
```

For longer bodies, prefer the editor:

```bash
git commit
```

## Multiline Commit Message Guidance

Default to a body when the diff is non-trivial, when intent is not obvious, or when follow-up actions are required.

Keep the body short and outcome-focused:

- Start with why, not how.
- Call out important side effects or constraints.
- Mention migrations, flags, or manual steps when relevant.
- Wrap each body line to satisfy commitlint limits (commonly `body-max-line-length: 100`).
- If a line is too long, split it into additional `What:` / `Notes:` lines instead of cramming details.

Recommended body shape (2–6 short lines):

- Why: user/business intent, bug cause, or constraint
- What: key changes at a high level
- Notes: migrations, flags, follow-ups (if any)

Example:

```bash
git commit -F - <<'EOF'
feat(auth): enforce session timeout

Why: invalidate sessions after 30m inactivity to meet compliance requirements.
What: enforce timeout server-side and surface expiration to clients.
EOF
```

If commitlint fails with a body line-length error, re-run commit with wrapped lines, for example:

```bash
git commit -F - <<'EOF'
chore(tooling): upgrade vite and react plugin beta

Why: align build tooling with Vite 8 beta and avoid no-test run failures.
What: replace rolldown-vite alias with vite@8.0.0-beta.16.
What: switch to @vitejs/plugin-react@6.0.0-beta.0 and refresh lockfile.
EOF
```

## Commit Strategy Guidance

Prefer the smallest number of commits that preserves clarity.

Signals to split:

- Multiple top-level areas changed with different intent.
- Mixed change types (e.g., `feat` + `fix` + `refactor`).
- A commit message would need "and".

Practical split patterns:

- By concern: feature, bugfix, refactor, docs, tests.
- By area: backend vs frontend, or by module/directory.

## Conventional Commit Heuristics

Choose the narrowest correct type:

- `feat`: new behavior or user-visible capability
- `fix`: bug fix or behavior correction
- `refactor`: internal change without behavior change
- `docs`: documentation only
- `test`: tests only
- `chore`: tooling, config, maintenance

Scope:

- Derive from the most relevant top-level folder or bounded module.
- Keep it short and stable (e.g., `auth`, `orders`, `ui`, `api`).

Subject:

- Imperative mood, lowercase, no trailing period.
- Describe outcome, not implementation detail.

Examples:

- `feat(auth): add session timeout enforcement`
- `fix(api): handle empty batch payload`
- `refactor(ui): simplify invoice table columns`

## Safety Rules

Do:

- Inspect diffs before staging and before committing.
- Use `git diff --cached` to verify the staged set.
- Create multiple commits when it increases clarity.
- Stop after commit. Do not push.

Do not:

- Use destructive git commands (e.g., `git reset --hard`).
- Rewrite history unless explicitly asked.
