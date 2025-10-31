# Test Utilities & Examples

> Quick reference for writing tests in PharmaSys

## 📁 Directory Structure

```
src/test/
├── README.md                           # This file
├── setup.ts                           # Global test setup
├── examples/                          # Test examples
│   ├── Button.test.example.tsx       # Component testing
│   ├── Form.test.example.tsx         # Form testing
│   └── CustomHook.test.example.tsx   # Hook testing
├── factories/                         # Test data generators
│   ├── index.ts                      # Export all factories
│   └── itemFactory.ts                # Item data factory
├── mocks/                             # Mock implementations
│   └── supabase.ts                   # Supabase mock
└── utils/                             # Test utilities
    ├── test-utils.tsx                # Custom render
    └── testHelpers.ts                # Helper functions
```

## 🚀 Quick Start

### 1. Basic Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('FeatureName', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### 2. Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### 3. Hook Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return correct value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(expected);
  });
});
```

## 🔧 Utilities

### Custom Render

**Location:** `src/test/utils/test-utils.tsx`

Pre-configured with React Query and Router:

```typescript
import { render } from '@/test/utils/test-utils';

// Automatically wraps with:
// - QueryClientProvider
// - BrowserRouter
render(<MyComponent />);
```

### Test Factories

**Location:** `src/test/factories/`

Generate realistic test data:

```typescript
import { createMockItem, createLowStockItem } from '@/test/factories';

// Create item with defaults
const item = createMockItem();

// Create with overrides
const customItem = createMockItem({
  name: 'Custom Name',
  stock: 100,
});

// Create specialized items
const lowStockItem = createLowStockItem();
const outOfStockItem = createOutOfStockItem();
```

### Supabase Mocks

**Location:** `src/test/mocks/supabase.ts`

Mock Supabase operations:

```typescript
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockSuccess,
  mockError,
} from '@/test/mocks/supabase';

const client = createMockSupabaseClient();

// Mock query response
const queryBuilder = createMockQueryBuilder([{ id: '1', name: 'Item' }]);

// Mock success
const response = mockSuccess({ id: '1', name: 'Item' });

// Mock error
const errorResponse = mockError('Not found', 'PGRST116');
```

## 📚 Examples

See full examples in `src/test/examples/`:

1. **Button.test.example.tsx** - Component testing patterns
   - Rendering
   - User interactions
   - States and loading
   - Accessibility
   - Edge cases

2. **Form.test.example.tsx** - Form testing patterns
   - Form submission
   - Validation
   - Error handling
   - User experience
   - Accessibility

3. **CustomHook.test.example.tsx** - Hook testing patterns
   - State management hooks
   - Data fetching hooks
   - React Query hooks
   - Side effects

## 🎯 Common Patterns

### Async Testing

```typescript
import { waitFor } from '@testing-library/react';

it('should load data', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  render(<MyButton />);

  await user.click(screen.getByRole('button'));
});
```

### Mocking Functions

```typescript
import { vi } from 'vitest';

it('should call callback', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} />);

  fireEvent.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Forms

```typescript
it('should submit form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<MyForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'John',
    });
  });
});
```

## ✅ Testing Checklist

Before submitting tests:

- [ ] Tests are in `*.test.ts` or `*.test.tsx` files
- [ ] Tests use descriptive names
- [ ] Tests are organized in `describe` blocks
- [ ] Happy path is tested
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Async operations use `waitFor`
- [ ] User events use `userEvent.setup()`
- [ ] Components test accessibility
- [ ] Tests are independent
- [ ] All tests pass locally
- [ ] Coverage meets 80% threshold

## 📖 Further Reading

- **Main Testing Guide:** `/TESTING.md`
- **Vitest Docs:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/react
- **jest-dom Matchers:** https://github.com/testing-library/jest-dom

## 🆘 Getting Help

1. Check the examples in `src/test/examples/`
2. Review existing tests in the codebase
3. Read the main testing guide: `/TESTING.md`
4. Ask in Slack: `#qa-engineering`

---

**Last Updated:** 2025-10-31
