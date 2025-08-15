# Testing Utilities

This folder contains utilities for generating test data and mock functionality for development and testing purposes.

## Files Overview

### `randomItemGenerator.ts`

Core utility functions for generating random item data using existing master data entities.

**Key functions:**

- `generateRandomItemData()` - Creates realistic random item data
- `validateEntitiesForGeneration()` - Checks if master data is sufficient for generation
- `getEntitiesLoadingStatus()` - Manages loading states for UI

### `useRandomItemCreation.ts`

Custom React hook that orchestrates the complete random item creation process.

**Features:**

- Entity data fetching and validation
- Random item generation via business logic
- Auto-generated item codes following system rules
- Cache invalidation and UI updates
- Toast notifications for user feedback

### `RandomItemFloatingButton.tsx`

Pre-built floating action button component for random item generation.

**Features:**

- Self-contained component with built-in random item creation logic
- Conditional rendering based on enabled prop
- Loading states and visual feedback
- Consistent styling and positioning

### `index.ts`

Centralized exports for all testing utilities.

## Usage Example

### Using the Pre-built Component

```typescript
import { RandomItemFloatingButton } from '@/utils/testing';

function MyPage() {
  const [activeTab, setActiveTab] = useState('items');

  return (
    <div>
      {/* Your page content */}
      <RandomItemFloatingButton enabled={activeTab === 'items'} />
    </div>
  );
}
```

### Using the Hook Directly

```typescript
import { useRandomItemCreation } from '@/utils/testing';

function MyComponent() {
  const randomItemCreation = useRandomItemCreation({ enabled: true });

  return (
    <button
      onClick={randomItemCreation.createRandomItem}
      disabled={randomItemCreation.isCreating || randomItemCreation.isLoadingEntities}
    >
      {randomItemCreation.isCreating ? 'Creating...' : 'Add Random Item'}
    </button>
  );
}
```

## Generated Item Properties

Random items are created with:

- **Name**: Random drug name + dosage (e.g., "Paracetamol 500mg")
- **Code**: Auto-generated following system format: `[CAT]-[TYPE]-[PKG]-[DOS]-[MFR]-[SEQ]`
- **Pricing**: Realistic base price with 20-70% markup for sell price
- **Entities**: Randomly selected from existing categories, types, packages, dosages, and manufacturers
- **Barcode**: Unique timestamp-based barcode
- **Status**: Active medicine with configurable expiry setting

## Notes

- Requires all master data entities (categories, types, packages, dosages, manufacturers) to be available
- Uses the same business logic as manual item creation for consistency
- Automatically handles manufacturer name assignment after item creation
- Integrates with existing toast notification system
- Follows established error handling patterns
