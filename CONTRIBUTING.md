# Contributing to PharmaSys

Thank you for your interest in contributing to PharmaSys! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- **Bun**: Runtime and package manager (latest recommended)
- **Git**: For version control
- **Supabase CLI**: For database management (optional for frontend-only work)

### Setting Up Your Development Environment

1. **Fork the repository**

   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Limeon-Project.git
   cd Limeon-Project
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

   This also seeds the local `.codex/config.toml` from the tracked project template.

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

   If you use Codex, export `SUPABASE_ACCESS_TOKEN` and optionally `EXA_API_KEY` before starting a session. Codex only loads `.codex/config.toml` after you trust this repository.

4. **Start the development server**
   ```bash
   vp dev
   ```

## Development Workflow

### Branching Strategy

We use a feature branch workflow:

- `main` - Production-ready code
- `feature/*` - New features (e.g., `feature/add-inventory-export`)
- `fix/*` - Bug fixes (e.g., `fix/price-calculation-error`)
- `refactor/*` - Code refactoring (e.g., `refactor/extract-keyboard-navigation`)
- `chore/*` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Making Changes

1. **Create a new branch**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

3. **Run quality checks**

   ```bash
   # Canonical check: lint, format, types, and supported static checks
   vp check

   # Linting
   vp lint . --deny-warnings

   # Formatting
   vp fmt . --write

   # Tests
   vp test run --passWithNoTests

   # Build
   vp build
   ```

4. **Commit your changes**

   We use [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git add .
   git commit -m "feat: add inventory export feature"
   ```

   **Commit message format:**

   ```
   <type>: <description>

   [optional body]

   [optional footer]
   ```

   **Types:**
   - `feat`: New feature
   - `fix`: Bug fix
   - `refactor`: Code refactoring
   - `chore`: Maintenance tasks
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting, etc.)
   - `test`: Adding or updating tests
   - `perf`: Performance improvements

5. **Push to your fork**

   ```bash
   git push -u origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template with details about your changes

## Pull Request Guidelines

### PR Requirements

- [ ] Code follows the project's style guidelines
- [ ] Canonical project check passes (`vp check`)
- [ ] Tests pass locally (`vp test run --passWithNoTests`)
- [ ] Linting passes (`vp lint . --deny-warnings`)
- [ ] Build succeeds (`vp build`)
- [ ] Cross-feature static/dynamic imports only target explicit feature public APIs (`src/features/*/public/`)
- [ ] App integration imports feature public APIs or route/page entry points, not implementation internals
- [ ] App route/layout modules do not import service/data clients directly; bootstrap-only side effects stay in `src/app/main.tsx`
- [ ] Feature public APIs do not import service/data-access modules directly
- [ ] Feature `public/testing.ts` APIs are imported only by tests or `src/utils/testing/`
- [ ] Shared runtime modules (`src/components/`, `src/hooks/`, `src/lib/`, `src/store/`, `src/utils/`) do not import feature internals
- [ ] Shared UI/util modules (`src/components/`, `src/utils/`) do not import service/data-access modules
- [ ] Shared UI/util modules (`src/components/`, `src/utils/`) do not import app/store modules directly
- [ ] Shared hook service/data-access imports stay inside query/realtime/presence sync hooks
- [ ] Shared hook store imports stay inside explicit presence/directory bridge hooks
- [ ] Store service/data-access and auth/logout side-effect imports stay inside explicit `src/store/*Services.ts` helpers
- [ ] Feature-owned UI state stays inside the owning feature and is exposed through `public/` only when app shell integration needs it
- [ ] Service modules do not import UI, app, store, hook, or feature modules
- [ ] Feature service/data-access imports stay inside explicit data boundary modules (`data/`, `infrastructure/`, or named route/form service-call helpers; `use*Data.ts` files are hooks)
- [ ] Direct Supabase client imports stay inside service modules, feature infrastructure, or explicit auth/logout realtime helpers in `src/lib`
- [ ] All React Query keys use `src/constants/queryKeys.ts`
- [ ] No direct Supabase calls in hooks/components (use services/infrastructure)
- [ ] No hooks/components/features import `src/services/repositories/*` directly
- [ ] PR title follows conventional commit format
- [ ] PR description clearly describes the changes
- [ ] Related issues are linked (if applicable)

### PR Review Process

1. **Automated Checks**: CI will run tests, linting, and build
2. **Code Review**: A maintainer will review your code
3. **Approval**: Once approved and all checks pass, Mergify will auto-merge
4. **Merge**: Your changes will be merged into `main`

### PR Size Guidelines

- Keep PRs small and focused (ideally < 400 lines changed)
- Large PRs are harder to review and more likely to have issues
- If working on a large feature, break it into smaller PRs

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` type - use proper types or `unknown`
- Prefer interfaces over types for object shapes
- Use const assertions where appropriate

### React

- Use functional components with hooks
- Prefer named exports over default exports
- Keep components small and focused (single responsibility)
- Use custom hooks to extract reusable logic
- Follow the project's folder structure:
  ```
  src/features/
     [feature-name]/
        application/    # Hooks, services
        domain/         # Business logic, use cases
        infrastructure/ # API calls, external services
        presentation/   # UI components
  ```

### Naming Conventions

- **Components**: PascalCase (e.g., `ItemList.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useItemForm.ts`)
- **Utilities**: camelCase (e.g., `formatPrice.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_QUANTITY`)
- **Types/Interfaces**: PascalCase (e.g., `ItemFormData`)

### File Organization

- Keep related files together in feature folders
- Separate concerns (presentation, domain, infrastructure)
- Use index files for route/page entries and explicit public surfaces; prefer
  direct module imports inside feature internals so ownership stays visible.
- Avoid deep nesting (max 3-4 levels)
- Put intentionally shared feature capabilities behind `src/features/[feature-name]/public/`
- Keep feature `public/` modules as API wrappers; do not put service/data-access
  imports there directly.
- Keep `src/features/*/public/testing.ts` imports inside tests or
  `src/utils/testing/`.
- Keep reusable UI/util modules independent from app state; app/store-specific
  UI belongs under `src/app` or an explicit feature boundary.
- Do not import another feature's presentation/application/infrastructure internals directly
- From `src/app`, import feature public APIs, route `index.tsx` files, or
  named `*Page.tsx` entries only; do not reach into feature application, data,
  domain, infrastructure, presentation, shared, hook, or component internals.
- Keep feature-owned UI state inside the owning feature; expose shell-facing
  stores or launchers through `src/features/[feature-name]/public/`.
- Keep app-level data/realtime/cache bootstrap side effects in `src/app/main.tsx`;
  app routes and layouts should not import service/data clients directly.
- Treat dynamic imports as normal imports for boundary rules; lazy loading does
  not bypass `public/` APIs.
- Keep shared hook service calls in `src/hooks/queries/`,
  `src/hooks/realtime/`, or explicit presence sync hooks.
- Keep shared hook store access in explicit presence/directory bridge hooks;
  general form, grid, UI, and item hooks should stay store-agnostic.
- Keep store service calls and auth/logout side-effect imports in explicit
  `src/store/*Services.ts` helpers; store modules should orchestrate state, not
  own service imports.
- Keep `src/services/` independent from React/UI/app/store/hooks/features; route
  service output through explicit feature data boundaries.
- Keep direct `@/lib/supabase` and `@/lib/authSupabase` imports in
  `src/services/`, feature `infrastructure/`, or explicit auth/logout realtime
  helpers under `src/lib/`.
- Use `src/services/api/*` from explicit feature data boundaries only
  (`data/`, `infrastructure/`, or named route/form service-call helpers;
  `use*Data.ts` files are hooks); keep
  `src/services/repositories/*` internal to service-owned modules.

## Testing Guidelines

### Writing Tests

- Write unit tests for business logic
- Write integration tests for critical flows
- Use descriptive test names (should/when/then pattern)
- Aim for high coverage on critical paths
- Mock external dependencies (API calls, Supabase)

### Running Tests

```bash
# Run all tests
vp test run --passWithNoTests

# Run tests in watch mode
vp test watch

# Run tests with coverage
vp test run --coverage

# Run specific test file
vp test run ItemForm.test.ts --passWithNoTests
```

## Database Changes

### Migrations

If your changes require database modifications:

1. Create a new migration file:

   ```bash
   supabase migration new your_migration_name
   ```

2. Write SQL in the migration file
3. Test locally:

   ```bash
   supabase db reset
   ```

4. Include migration in your PR

### Supabase Best Practices

- Always use Row Level Security (RLS)
- Write migrations in the `supabase/migrations/` folder
- Test migrations locally before submitting
- Document any schema changes in the PR description

## Documentation

### Code Comments

- Write self-documenting code (clear names, simple logic)
- Add comments for complex logic or non-obvious decisions
- Use JSDoc for public APIs and utilities
- Avoid redundant comments

### README Updates

- Update README.md if adding new features or changing setup
- Keep documentation in sync with code
- Add examples for new features

## Getting Help

### Questions?

- Check existing [Issues](https://github.com/fxrdhan/Limeon-Project/issues)
- Review [Discussions](https://github.com/fxrdhan/Limeon-Project/discussions)
- Ask in PR comments if related to your contribution

### Found a Bug?

- Check if it's already reported in [Issues](https://github.com/fxrdhan/Limeon-Project/issues)
- If not, create a new issue with:
  - Clear description of the bug
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots (if applicable)
  - Environment details (OS, browser, Node version)

### Feature Requests

- Open a new [Issue](https://github.com/fxrdhan/Limeon-Project/issues)
- Describe the feature and its use case
- Explain why it would be valuable
- Be open to discussion and feedback

## Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality:

- **Code formatting** (Oxfmt)
- **Linting** (Oxlint)
- **Type checking** (TypeScript)
- **Tests** (VitePlus Test)
- **Build validation**

These run automatically on `git commit`. If they fail, fix the issues before committing.

## Release Process

_For maintainers only_

1. Ensure all tests pass
2. Update version in `package.json`
3. Create a release tag
4. Deploy to production

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE) file).

## Recognition

Contributors will be recognized in:

- GitHub contributors page
- Release notes for significant contributions
- Project documentation

---

Thank you for contributing to PharmaSys! Your efforts help make this project better for everyone.
