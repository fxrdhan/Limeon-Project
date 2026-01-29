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

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   bun run dev
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
   # Type checking
   bunx --bun tsc -b --noEmit

   # Linting
   bun run lint

   # Formatting
   bun run format

   # Tests
   bun run test

   # Build
   bun run build
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
- [ ] Tests pass locally (`bun run test`)
- [ ] Type checking passes (`bunx --bun tsc -b --noEmit`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] No cross-feature imports (use `src/components/`, `src/utils/`, `src/hooks/`)
- [ ] All React Query keys use `src/constants/queryKeys.ts`
- [ ] No direct Supabase calls in hooks/components (use services/infrastructure)
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
- Use index files for clean imports
- Avoid deep nesting (max 3-4 levels)

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
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run specific test file
bun run test -- ItemForm.test.ts
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

- **Code formatting** (Prettier)
- **Linting** (ESLint)
- **Type checking** (TypeScript)
- **Tests** (Vitest)
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
