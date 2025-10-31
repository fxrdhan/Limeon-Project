# Testing Guide - PharmaSys

> **Comprehensive testing documentation for QA engineers and developers**

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

PharmaSys uses **Vitest** as the primary testing framework with comprehensive utilities for unit, integration, and component testing.

### Current Test Coverage

- **Test Files:** 6
- **Test Cases:** 172
- **Coverage Target:** 80% (lines, functions, branches, statements)
- **Test Execution Time:** ~2-3 seconds

### Test Distribution

```
src/
├── utils/                           # Utility function tests
│   ├── logger.test.ts              # 9 tests
│   └── formValidation.test.ts      # 54 tests
├── features/
│   ├── item-management/
│   │   ├── domain/use-cases/
│   │   │   ├── CreateItem.test.ts          # 10 tests
│   │   │   └── CalculateItemPrice.test.ts  # 7 tests
│   │   └── shared/utils/
│   │       └── PriceCalculator.test.ts     # 52 tests
│   └── purchase-management/
│       └── hooks/
│           └── calc.test.ts                # 40 tests
└── test/                           # Test utilities
    ├── setup.ts                    # Global test setup
    ├── factories/                  # Test data factories
    ├── mocks/                      # Mock implementations
    └── utils/                      # Testing utilities
```

---

## 🚀 Quick Start

### Running All Tests

```bash
# Run all tests in watch mode
yarn test

# Run all tests once
yarn test:run

# Run tests with coverage
yarn test:coverage

# Run tests with UI
yarn test:ui
```

### Running Specific Tests

```bash
# Run specific test file
yarn test calc.test.ts

# Run tests matching pattern
yarn test --grep "validation"

# Run tests in specific directory
yarn test src/utils/
```

---

## 🛠️ Testing Stack

### Core Framework

- **Vitest** (v2.1.8) - Fast unit test framework
- **happy-dom** (v20.0.7) - Lightweight DOM implementation
- **@vitest/coverage-v8** (v2.1.8) - Code coverage

### Testing Libraries

- **@testing-library/react** (v16.1.0) - Component testing utilities
- **@testing-library/jest-dom** (v6.6.3) - Custom DOM matchers
- **@testing-library/user-event** (v14.5.2) - User interaction simulation

### Configuration

**Location:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true, // Enable global test APIs
    environment: 'jsdom', // Browser-like environment
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
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

---

## 📁 Test Structure

### Naming Conventions

- **Test Files:** `*.test.ts` or `*.test.tsx`
- **Test Suites:** Use `describe()` blocks
- **Test Cases:** Use `it()` or `test()`
- **Factory Files:** `*Factory.ts`
- **Mock Files:** Match the file being mocked

### File Placement

**Co-located tests (Recommended):**

```
src/
└── features/
    └── purchase-management/
        └── hooks/
            ├── calc.ts           # Implementation
            └── calc.test.ts      # Tests
```

**Shared test utilities:**

```
src/test/
├── setup.ts              # Global setup
├── factories/            # Test data generators
│   ├── index.ts
│   └── itemFactory.ts
├── mocks/                # Mock implementations
│   └── supabase.ts
└── utils/                # Test helpers
    ├── test-utils.tsx    # Custom render
    └── testHelpers.ts    # Helper functions
```

---

## ✍️ Writing Tests

### 1. Unit Tests (Functions & Logic)

**Example: Testing pure functions**

```typescript
import { describe, it, expect } from 'vitest';
import { computeItemFinancials } from './calc';

describe('computeItemFinancials', () => {
  describe('Basic calculations without VAT', () => {
    it('should calculate financials for simple item', () => {
      const item = {
        quantity: 10,
        price: 1000,
        discount: 0,
        vat_percentage: 0,
      };

      const result = computeItemFinancials(item, false);

      expect(result).toEqual({
        base: 10000,
        discountAmount: 0,
        afterDiscount: 10000,
        vatAmount: 0,
        subtotal: 10000,
      });
    });

    it('should handle edge cases', () => {
      const item = {
        quantity: 0,
        price: 1000,
        discount: 10,
        vat_percentage: 11,
      };

      const result = computeItemFinancials(item, false);

      expect(result.base).toBe(0);
      expect(result.subtotal).toBe(0);
    });
  });
});
```

### 2. Validation Tests

**Example: Form validation**

```typescript
import { describe, it, expect } from 'vitest';
import { validatePurchaseItem } from './validation';

describe('validatePurchaseItem', () => {
  const validItem = {
    item_id: 'item-1',
    item_name: 'Test Item',
    quantity: 10,
    price: 1000,
    discount: 10,
    vat_percentage: 11,
    unit: 'Box',
    unit_conversion_rate: 1,
  };

  it('should pass validation for valid item', () => {
    const errors = validatePurchaseItem(validItem);
    expect(errors).toHaveLength(0);
  });

  it('should fail when quantity is invalid', () => {
    const errors = validatePurchaseItem({
      ...validItem,
      quantity: 0,
    });

    expect(errors).toContain('Kuantitas harus lebih besar dari 0.');
  });

  it('should accumulate multiple errors', () => {
    const item = {
      ...validItem,
      quantity: 0,
      price: -100,
      discount: 150,
    };

    const errors = validatePurchaseItem(item);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
```

### 3. Component Tests

**Example: Testing React components**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <Button onClick={handleClick}>Click me</Button>
    );

    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when prop is set', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 4. Using Test Factories

**Example: Generate test data**

```typescript
import { describe, it, expect } from 'vitest';
import {
  createMockItem,
  createLowStockItem,
  resetItemCounter,
} from '@/test/factories';

describe('Item Management', () => {
  beforeEach(() => {
    resetItemCounter(); // Ensure consistent IDs
  });

  it('should create item with defaults', () => {
    const item = createMockItem();

    expect(item.id).toBe('item-1');
    expect(item.is_active).toBe(true);
  });

  it('should create item with overrides', () => {
    const item = createMockItem({
      name: 'Custom Item',
      stock: 50,
    });

    expect(item.name).toBe('Custom Item');
    expect(item.stock).toBe(50);
  });

  it('should create low stock item', () => {
    const item = createLowStockItem();

    expect(item.stock).toBeLessThan(item.min_stock);
  });
});
```

### 5. Using Mocks

**Example: Mocking Supabase**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

describe('Data Fetching', () => {
  it('should fetch items from database', async () => {
    const mockClient = createMockSupabaseClient();
    const mockData = [{ id: '1', name: 'Item 1' }];

    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    // Your test logic here
  });
});
```

---

## 🏃 Running Tests

### Development Workflow

```bash
# Watch mode - runs tests on file changes
yarn test

# Run once - for CI/CD
yarn test:run

# Coverage report
yarn test:coverage

# Interactive UI
yarn test:ui
```

### CI/CD Pipeline

Tests run automatically on:

- ✅ Pre-commit hook (via Husky)
- ✅ Pull requests to main/develop
- ✅ Push to main/develop branches

**GitHub Actions:** `.github/workflows/ci.yml`

```yaml
- name: Run tests
  run: yarn test:run

- name: Generate coverage
  run: yarn test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
```

---

## 📊 Coverage

### Coverage Thresholds

All coverage metrics must meet **80%** threshold:

- ✅ Lines: 80%
- ✅ Functions: 80%
- ✅ Branches: 80%
- ✅ Statements: 80%

### Viewing Coverage Reports

```bash
# Generate HTML coverage report
yarn test:coverage

# Open report in browser
open coverage/index.html
```

### Coverage Exclusions

The following are excluded from coverage:

- `node_modules/`
- `src/test/` - Test utilities
- `**/*.d.ts` - Type definitions
- `**/*.config.*` - Configuration files
- `**/mockData/` - Mock data
- `dist/` - Build output

---

## 🎯 Best Practices

### 1. Test Organization

✅ **DO:**

```typescript
describe('FeatureName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Test
    });
  });
});
```

❌ **DON'T:**

```typescript
test('test 1', () => {
  /* ... */
});
test('test 2', () => {
  /* ... */
});
```

### 2. Test Naming

✅ **DO:** Be descriptive and specific

```typescript
it('should return error when quantity is negative');
it('should calculate VAT correctly for inclusive pricing');
it('should accumulate multiple validation errors');
```

❌ **DON'T:** Use vague names

```typescript
it('works');
it('test validation');
it('should work correctly');
```

### 3. Arrange-Act-Assert (AAA) Pattern

```typescript
it('should calculate discount correctly', () => {
  // Arrange: Set up test data
  const item = { quantity: 10, price: 1000, discount: 10 };

  // Act: Execute the function
  const result = computeItemFinancials(item, false);

  // Assert: Verify results
  expect(result.discountAmount).toBe(1000);
});
```

### 4. Test Independence

✅ **DO:** Each test should be independent

```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Reset state before each test
    resetDatabase();
  });

  it('should create user', () => {
    /* ... */
  });
  it('should delete user', () => {
    /* ... */
  });
});
```

❌ **DON'T:** Depend on test execution order

```typescript
// DON'T: Test 2 depends on Test 1
it('should create user', () => {
  createUser();
});
it('should find created user', () => {
  findUser();
});
```

### 5. Edge Cases & Error Handling

Always test:

- ✅ Happy path (normal flow)
- ✅ Edge cases (zero, negative, max values)
- ✅ Error conditions
- ✅ Boundary values
- ✅ Invalid inputs

```typescript
describe('calculatePrice', () => {
  it('should handle normal values', () => {
    /* ... */
  });
  it('should handle zero quantity', () => {
    /* ... */
  });
  it('should handle negative price', () => {
    /* ... */
  });
  it('should handle 100% discount', () => {
    /* ... */
  });
  it('should handle missing data', () => {
    /* ... */
  });
});
```

### 6. Avoid Test Duplication

✅ **DO:** Use test helpers and factories

```typescript
const createTestItem = (overrides = {}) => ({
  quantity: 10,
  price: 1000,
  ...overrides,
});

it('test 1', () => {
  const item = createTestItem();
  // ...
});
```

❌ **DON'T:** Repeat test data

```typescript
it('test 1', () => {
  const item = { quantity: 10, price: 1000 };
  // ...
});

it('test 2', () => {
  const item = { quantity: 10, price: 1000 };
  // ...
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Tests Failing Locally but Passing in CI

**Problem:** Environment differences

**Solution:**

```bash
# Clear cache and reinstall
yarn clean
yarn install

# Reset test database/mocks
yarn test:run --no-cache
```

#### 2. Slow Test Execution

**Problem:** Too many integration tests or heavy setups

**Solution:**

- Use unit tests for logic
- Mock external dependencies
- Use `beforeEach` sparingly
- Consider test parallelization

#### 3. Flaky Tests

**Problem:** Tests pass/fail inconsistently

**Common Causes:**

- Async race conditions
- Shared state between tests
- Time-dependent logic

**Solution:**

```typescript
// Use proper async handling
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Reset state between tests
beforeEach(() => {
  vi.clearAllMocks();
  resetTestState();
});
```

#### 4. Coverage Not Generated

**Problem:** No coverage report after running tests

**Solution:**

```bash
# Ensure coverage provider is installed
yarn add -D @vitest/coverage-v8

# Run with coverage flag
yarn test:run --coverage
```

---

## 📚 Additional Resources

### Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)

### Internal Resources

- `src/test/README.md` - Test utilities documentation
- `src/test/factories/` - Test data factory examples
- `src/test/mocks/` - Mock implementation examples

### Getting Help

- Check existing tests for examples
- Review test failures in CI/CD logs
- Ask in team Slack channel: `#qa-engineering`

---

## ✅ Checklist for New Tests

Before submitting a PR with tests:

- [ ] Tests follow naming conventions
- [ ] Tests are properly organized in describe blocks
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Tests are independent (no shared state)
- [ ] Mock data uses factories when possible
- [ ] Tests pass locally (`yarn test:run`)
- [ ] Coverage meets 80% threshold
- [ ] Tests are documented with clear descriptions
- [ ] No console errors or warnings

---

**Last Updated:** 2025-10-31
**Maintained By:** QA Engineering Team
