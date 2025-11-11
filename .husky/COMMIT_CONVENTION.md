# Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Examples

### Good ✅

```bash
feat: add user authentication
fix: resolve memory leak in subscription handler
docs: update API documentation
chore(deps): update dependencies
refactor(auth): simplify login logic
perf: improve query performance by 50%
```

### Bad ❌

```bash
Added new feature          # Missing type
Fix bug                    # Type must be lowercase
feat:added login           # Missing space after colon
FEAT: new feature          # Type must be lowercase
feat: Add login.           # No period at end
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style (formatting, semicolons, etc)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (deps, configs, etc)
- **ci**: CI/CD changes
- **build**: Build system changes
- **revert**: Revert previous commit

## Scope (Optional)

Add scope in parentheses for context:

```bash
feat(auth): add OAuth support
fix(api): resolve CORS issue
chore(deps): update React to v19
```

## Breaking Changes

For breaking changes, add `!` or `BREAKING CHANGE:` in footer:

```bash
feat!: remove deprecated API endpoints

BREAKING CHANGE: The /api/v1/users endpoint has been removed.
Use /api/v2/users instead.
```

## Commit Message Validation

Commitlint will automatically validate your commit messages.

**Invalid commits will be rejected!**

If your commit is rejected, fix the message:

```bash
# Amend the last commit message
git commit --amend -m "feat: correct commit message"
```
