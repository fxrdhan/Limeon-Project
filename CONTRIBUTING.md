# Contributing to PharmaSys

Thank you for your interest in contributing to PharmaSys! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 3.2.3
- Git

### Setup

1. Clone the repository

```bash
git clone <repository-url>
cd PharmaSys
```

2. Install dependencies

```bash
yarn install
```

3. Create `.env` file

```bash
cp .env.example .env
```

4. Fill in your environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start development server

```bash
yarn dev
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

Example: `feature/add-patient-management`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling changes

Examples:

```
feat(items): add barcode scanning functionality
fix(auth): resolve login redirect issue
docs: update README with testing instructions
```

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Avoid `any` types - use proper typing
- Prefer interfaces for object shapes
- Use type guards for runtime checks

### React

- Use functional components with hooks
- Follow Single Responsibility Principle
- Implement proper error boundaries
- Use proper memoization (`useMemo`, `useCallback`)

### File Structure

Follow the established patterns:

```
src/
├── features/          # Feature modules (Clean Architecture)
│   └── [feature]/
│       ├── domain/    # Business logic & use cases
│       ├── application/ # Hooks & application services
│       ├── presentation/ # UI components (Atomic Design)
│       └── shared/    # Shared utilities
├── components/        # Shared UI components
├── hooks/            # Shared custom hooks
├── services/         # API services
├── lib/              # Third-party library configs
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase (e.g., `ItemManagementModal.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useItemForm.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase (e.g., `ItemFormData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ITEMS_PER_PAGE`)

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
yarn format:check

# Fix formatting
yarn format

# Run linter
yarn lint
```

## Testing

### Writing Tests

- Write tests for all business logic
- Test edge cases and error scenarios
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('Feature', () => {
  it('should do something specific', () => {
    // Arrange
    const input = { ... };

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Running Tests

```bash
# Run tests in watch mode
yarn test

# Run tests once
yarn test:run

# Run with coverage
yarn test:coverage

# Run tests with UI
yarn test:ui
```

### Test Coverage

Maintain minimum 80% coverage:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**

   ```bash
   yarn test
   yarn lint
   yarn build
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Provide clear description
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console.logs (use logger utility)
- [ ] Type-safe (no `any` types)
- [ ] Commits follow conventional commits
- [ ] PR has descriptive title and description

## Code Review Guidelines

### For Authors

- Respond to feedback promptly
- Be open to suggestions
- Update PR based on feedback
- Keep PR scope focused

### For Reviewers

- Be respectful and constructive
- Focus on code quality and maintainability
- Check for edge cases and security issues
- Verify tests are adequate

## Questions?

If you have questions or need help:

- Open an issue for discussion
- Review existing documentation
- Check previous PRs for examples

Thank you for contributing to PharmaSys! 🎉
