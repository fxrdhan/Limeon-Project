# Testing Guide

## Overview

PharmaSys uses **Vitest** as the testing framework with **React Testing Library** for component testing. This guide covers testing strategies, best practices, and examples.

## Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

## Setup

### Prerequisites

All testing dependencies are included in `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "@vitest/ui": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8",
    "jsdom": "^25.0.1"
  }
}
```

### Configuration

Vitest is configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## Running Tests

```bash
# Run tests in watch mode (recommended for development)
yarn test

# Run tests once
yarn test:run

# Run tests with coverage report
yarn test:coverage

# Run tests with UI
yarn test:ui
```

### Watch Mode Commands

When in watch mode, you can:

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `t` to filter by test name
- Press `q` to quit

## Writing Tests

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
import { describe, it, expect } from 'vitest';

describe('FeatureName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data and conditions
      const input = { value: 10 };

      // Act: Execute the functionality
      const result = functionUnderTest(input);

      // Assert: Verify the outcome
      expect(result).toBe(expected);
    });
  });
});
```

### Domain Layer Tests

Test business logic in isolation:

```typescript
// CreateItem.test.ts
import { describe, it, expect } from 'vitest';
import { validateCreateItemInput } from './CreateItem';

describe('CreateItem', () => {
  describe('validateCreateItemInput', () => {
    const validInput = {
      name: 'Test Item',
      code: 'ITM001',
      // ... other fields
    };

    it('should pass validation for valid input', () => {
      const result = validateCreateItemInput(validInput);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const input = { ...validInput, name: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nama item harus diisi');
    });
  });
});
```

### Service Layer Tests

Test API interactions with mocking:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { itemsService } from './items.service';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: mockItem,
              error: null,
            })
          ),
        })),
      })),
    })),
  },
}));

describe('ItemsService', () => {
  it('should fetch item by id', async () => {
    const result = await itemsService.getItemWithDetails('item-1');

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });
});
```

### Component Tests

Test React components:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import Button from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Submit</Button>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('should call onClick handler', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Hook Tests

Test custom hooks:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useItems } from './useItems';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useItems', () => {
  it('should fetch items successfully', async () => {
    const { result } = renderHook(() => useItems(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });
});
```

## Testing Patterns

### Mocking

#### Mock Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: [] });

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
```

#### Mock Modules

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));
```

#### Mock Timers

```typescript
import { vi } from 'vitest';

vi.useFakeTimers();

// Test code that uses setTimeout/setInterval
vi.advanceTimersByTime(1000);

vi.useRealTimers();
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const promise = asyncFunction();

  await expect(promise).resolves.toBe(expected);
  // or
  await expect(promise).rejects.toThrow('error');
});
```

### Testing User Interactions

```typescript
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<Form onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'John Doe'
  });
});
```

### Testing Error States

```typescript
it('should display error message on failure', async () => {
  // Mock API error
  vi.mocked(apiCall).mockRejectedValue(new Error('API Error'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });
});
```

## Coverage

### Viewing Coverage

```bash
yarn test:coverage
```

Coverage reports are generated in:

- Terminal: Summary view
- `coverage/index.html`: Detailed HTML report

### Coverage Thresholds

Minimum requirements (configured in `vitest.config.ts`):

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

### Improving Coverage

1. **Identify uncovered code**:

   ```bash
   yarn test:coverage
   open coverage/index.html
   ```

2. **Focus on critical paths**:
   - Business logic (domain layer)
   - Data transformations
   - Error handling
   - Edge cases

3. **Don't chase 100%**:
   - Some code is hard to test (UI interactions)
   - Focus on value over numbers
   - 80-90% is typically sufficient

## Best Practices

### ✅ DO

- **Write descriptive test names**

  ```typescript
  it('should validate email format and reject invalid addresses', () => {
    // ...
  });
  ```

- **Test behavior, not implementation**

  ```typescript
  // Good
  it('should display error when form is invalid', () => {});

  // Bad
  it('should call validateForm function', () => {});
  ```

- **Use test data builders**

  ```typescript
  const createTestItem = (overrides = {}) => ({
    id: '1',
    name: 'Test Item',
    price: 1000,
    ...overrides,
  });
  ```

- **Clean up after tests**

  ```typescript
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });
  ```

- **Test edge cases**
  ```typescript
  it('should handle empty array', () => {});
  it('should handle null input', () => {});
  it('should handle very large numbers', () => {});
  ```

### ❌ DON'T

- **Don't test implementation details**

  ```typescript
  // Bad
  expect(component.state.isLoading).toBe(true);

  // Good
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  ```

- **Don't test third-party libraries**
  - Trust that React Router works
  - Trust that TanStack Query works
  - Test YOUR code

- **Don't write flaky tests**
  - Avoid arbitrary timeouts
  - Use `waitFor` for async operations
  - Properly mock external dependencies

- **Don't duplicate production code in tests**
  - Tests should be simple
  - If test is complex, refactor production code

### Test Organization

```typescript
describe('FeatureName', () => {
  // Shared setup
  const mockData = createMockData();

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('when user is authenticated', () => {
    it('should show dashboard', () => {});
    it('should allow editing', () => {});
  });

  describe('when user is not authenticated', () => {
    it('should redirect to login', () => {});
  });
});
```

### Debugging Tests

```typescript
// Print DOM structure
import { screen } from '@testing-library/react';
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));

// Use testing-library queries
screen.logTestingPlaygroundURL();
```

## Common Patterns

### Testing Forms

```typescript
it('should validate and submit form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<ItemForm onSubmit={handleSubmit} />);

  // Fill form
  await user.type(screen.getByLabelText('Name'), 'Test Item');
  await user.type(screen.getByLabelText('Price'), '1000');

  // Submit
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  // Verify
  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Test Item',
      price: 1000
    });
  });
});
```

### Testing API Calls

```typescript
it('should fetch and display items', async () => {
  const mockItems = [{ id: '1', name: 'Item 1' }];

  vi.mocked(itemsService.getAll).mockResolvedValue({
    data: mockItems,
    error: null
  });

  render(<ItemList />);

  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
```

### Testing Error Boundaries

```typescript
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/react)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Need Help?

- Check existing tests in the codebase for examples
- Review testing-library documentation
- Open an issue for specific questions

Happy Testing! 🧪
