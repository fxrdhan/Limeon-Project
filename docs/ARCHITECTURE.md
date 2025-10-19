# PharmaSys Architecture Documentation

## Overview

PharmaSys follows **Clean Architecture** principles combined with **Domain-Driven Design (DDD)** to ensure maintainability, testability, and scalability.

## Architecture Layers

### 1. Domain Layer

**Location**: `src/features/[feature]/domain/`

The core business logic layer containing:

- **Entities**: Core business objects
- **Use Cases**: Business rules and operations
- **Value Objects**: Immutable domain objects

**Characteristics**:

- Independent of frameworks and external dependencies
- Contains pure business logic
- No UI or infrastructure code
- Highly testable

**Example**:

```typescript
// domain/use-cases/CreateItem.ts
export const validateCreateItemInput = (input: CreateItemInput) => {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('Nama item harus diisi');
  }

  return { isValid: errors.length === 0, errors };
};
```

### 2. Application Layer

**Location**: `src/features/[feature]/application/`

Orchestration layer containing:

- **Hooks**: React hooks for business logic
- **Services**: Application-specific services
- **DTOs**: Data Transfer Objects
- **Use Case Implementations**: Connecting domain to infrastructure

**Organization**:

```
application/
├── hooks/
│   ├── core/         # CRUD operations
│   ├── form/         # Form handling
│   ├── ui/           # UI state
│   ├── utils/        # Utilities
│   └── instances/    # Specific instances
```

**Example**:

```typescript
// application/hooks/core/useItemCrud.ts
export const useAddItemForm = () => {
  const mutation = useMutation({
    mutationFn: (data: CreateItemInput) => {
      // Validate using domain logic
      const validation = validateCreateItemInput(data);
      if (!validation.isValid) throw new Error(...);

      // Call infrastructure
      return itemsService.create(data);
    }
  });

  return mutation;
};
```

### 3. Presentation Layer

**Location**: `src/features/[feature]/presentation/`

UI layer following **Atomic Design**:

```
presentation/
├── atoms/         # Basic building blocks
├── molecules/     # Simple components
├── organisms/     # Complex components
└── templates/     # Page templates
```

**Characteristics**:

- Presentation logic only
- Consumes application hooks
- Reusable components
- Properly typed props

**Example**:

```typescript
// presentation/molecules/ItemFormField.tsx
export const ItemFormField: React.FC<Props> = ({ label, error }) => {
  return (
    <div className="form-field">
      <label>{label}</label>
      {error && <span className="error">{error}</span>}
    </div>
  );
};
```

### 4. Shared Layer

**Location**: `src/features/[feature]/shared/`

Cross-cutting concerns:

- **Types**: TypeScript definitions
- **Contexts**: React contexts
- **Utils**: Helper functions
- **Constants**: Configuration values

### 5. Infrastructure Layer

**Location**: `src/services/`, `src/lib/`

External integrations:

- **API Services**: HTTP clients
- **Repositories**: Data access
- **Transformers**: Data mapping
- **Third-party libs**: External dependencies

## Design Patterns

### 1. Repository Pattern

Abstracts data access:

```typescript
// services/repositories/ItemRepository.ts
export const itemRepository = {
  getItems: async (options: QueryOptions) => {
    return supabase.from('items').select('*').order(options.orderBy);
  },

  isCodeUnique: async (code: string) => {
    const { data } = await supabase
      .from('items')
      .select('id')
      .eq('code', code)
      .single();
    return !data;
  },
};
```

### 2. Service Layer Pattern

Business logic abstraction:

```typescript
// services/api/items.service.ts
export class ItemsService extends BaseService<DBItem> {
  async createItemWithConversions(
    itemData: ItemData,
    conversions?: PackageConversion[]
  ) {
    // Validate
    const validation = ItemTransformer.validateItemData(itemData);
    if (!validation.isValid) throw new Error(...);

    // Transform
    const dataToInsert = ItemTransformer.transformItemToDBItem(itemData);

    // Persist
    return this.create(dataToInsert);
  }
}
```

### 3. Transformer Pattern

Data mapping between layers:

```typescript
// services/transformers/ItemTransformer.ts
export class ItemTransformer {
  static transformDBItemToItem(dbItem: DBItem): Item {
    return {
      id: dbItem.id,
      name: dbItem.name,
      displayPrice: this.formatPrice(dbItem.sell_price),
      // ... transform logic
    };
  }
}
```

### 4. Context Composition Pattern

Eliminates deep provider nesting:

```typescript
export const ItemManagementProvider = ({ children, value }) => {
  const providers = [
    { Context: ItemFormStateContext, value: value.form },
    { Context: ItemUIStateContext, value: value.ui },
    // ...
  ];

  return providers.reduceRight(
    (child, { Context, value }) => (
      <Context.Provider value={value}>{child}</Context.Provider>
    ),
    children
  );
};
```

## State Management

### Global State (Zustand)

For application-wide state:

```typescript
// store/authStore.ts
export const useAuthStore = create<AuthState>(set => ({
  user: null,
  login: async credentials => {
    const user = await authService.login(credentials);
    set({ user });
  },
}));
```

### Server State (TanStack Query)

For server data:

```typescript
export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => itemsService.getAll(),
    staleTime: 5000,
  });
};
```

### Local State (React Context)

For feature-specific state:

```typescript
export const ItemFormContext = createContext<ItemFormState>();

export const useItemForm = () => {
  const context = useContext(ItemFormContext);
  if (!context) throw new Error('Must be used within provider');
  return context;
};
```

## Data Flow

```
┌─────────────────────────────────────────┐
│           Presentation Layer             │
│  (Components, Templates, Pages)          │
└───────────────┬─────────────────────────┘
                │ Uses hooks
                ▼
┌─────────────────────────────────────────┐
│          Application Layer               │
│  (Hooks, Application Services)           │
└───────────────┬─────────────────────────┘
                │ Calls domain logic
                ▼
┌─────────────────────────────────────────┐
│            Domain Layer                  │
│  (Business Rules, Use Cases)             │
└───────────────┬─────────────────────────┘
                │ Pure logic
                ▼
┌─────────────────────────────────────────┐
│        Infrastructure Layer              │
│  (API, Database, External Services)      │
└─────────────────────────────────────────┘
```

## Dependency Rule

Dependencies only flow inward:

- **Presentation** → Application → Domain
- **Application** → Domain
- **Infrastructure** → Domain (through interfaces)
- **Domain** → Nothing (independent)

## Testing Strategy

### Unit Tests

Test domain logic in isolation:

```typescript
describe('validateCreateItemInput', () => {
  it('should reject empty name', () => {
    const result = validateCreateItemInput({ name: '' });
    expect(result.isValid).toBe(false);
  });
});
```

### Integration Tests

Test application layer:

```typescript
describe('useAddItemForm', () => {
  it('should create item successfully', async () => {
    const { result } = renderHook(() => useAddItemForm());
    await act(() => result.current.mutate(validItemData));
    expect(result.current.isSuccess).toBe(true);
  });
});
```

### Component Tests

Test presentation layer:

```typescript
describe('ItemFormField', () => {
  it('should display error message', () => {
    render(<ItemFormField error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
```

## Best Practices

### ✅ DO

- Keep domain logic pure and testable
- Use proper TypeScript typing
- Follow naming conventions
- Write comprehensive tests
- Document complex logic
- Use composition over inheritance
- Implement proper error handling

### ❌ DON'T

- Mix business logic with UI code
- Use `any` types
- Create god classes/hooks
- Tightly couple layers
- Ignore error cases
- Skip testing
- Use console.log (use logger)

## File Organization Example

```
src/features/item-management/
├── domain/
│   ├── entities/
│   │   └── Item.ts
│   └── use-cases/
│       ├── CreateItem.ts
│       ├── UpdateItem.ts
│       └── CalculateItemPrice.ts
├── application/
│   └── hooks/
│       ├── core/
│       │   └── useItemCrud.ts
│       ├── form/
│       │   └── useItemValidation.ts
│       └── ui/
│           └── useItemGridColumns.ts
├── presentation/
│   ├── atoms/
│   │   └── ItemBadge.tsx
│   ├── molecules/
│   │   └── ItemFormField.tsx
│   ├── organisms/
│   │   └── ItemDataGrid.tsx
│   └── templates/
│       └── ItemManagementModal.tsx
└── shared/
    ├── types/
    │   └── index.ts
    ├── contexts/
    │   └── ItemFormContext.tsx
    └── utils/
        └── PriceCalculator.ts
```

## Conclusion

This architecture ensures:

- **Maintainability**: Clear separation of concerns
- **Testability**: Independent, mockable layers
- **Scalability**: Easy to add new features
- **Flexibility**: Can swap implementations
- **Type Safety**: Full TypeScript coverage

For questions or clarifications, please refer to the codebase or open an issue.
