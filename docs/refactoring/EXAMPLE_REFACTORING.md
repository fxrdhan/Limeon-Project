# Contoh Refactoring Konkret

## 🎯 Target: Item Management Feature

Mari kita refactor feature `item-management` sebagai pilot project.

## 📁 Struktur BEFORE vs AFTER

### BEFORE (Current)
```
src/features/item-management/
├── application/
│   └── hooks/
│       ├── collections/
│       │   ├── useEntityCrudOperations.ts
│       │   ├── useEntityManager.ts
│       │   └── useGenericEntityManagement.ts
│       ├── core/
│       │   ├── EntityHookConfigurations.ts
│       │   ├── GenericHookFactories.ts
│       │   ├── ItemMutationUtilities.ts
│       │   ├── MutationAdapter.ts
│       │   ├── useItemCrud.ts
│       │   ├── useItemMutations.ts
│       │   └── useItemQueries.ts
│       ├── data/
│       │   └── useItemData.ts
│       ├── form/
│       │   ├── useItemCacheManager.ts
│       │   ├── useItemFormHandlers.ts
│       │   ├── useItemFormReset.ts
│       │   ├── useItemFormState.ts
│       │   ├── useItemModalOrchestrator.ts
│       │   ├── useItemPageHandlers.ts
│       │   ├── useItemUserInteractions.ts
│       │   └── useItemValidation.ts
│       ├── instances/
│       │   ├── useEntityHistory.ts
│       │   ├── useEntityModalLogic.ts
│       │   └── useItemSelection.ts
│       ├── ui/
│       │   ├── useColumnDisplayMode.ts
│       │   ├── useEntityColumnVisibilityState.ts
│       │   ├── useEventHandlers.ts
│       │   ├── useItemGridColumns.ts
│       │   ├── useItemsDisplayTransform.ts
│       │   ├── useRefs.ts
│       │   └── useUIState.ts
│       └── utils/
│           ├── useItemCodeGenerator.ts
│           ├── useItemPriceCalculator.ts
│           └── useItemPricingLogic.ts
├── domain/
│   └── use-cases/
│       ├── CalculateItemPrice.ts
│       ├── CreateItem.ts
│       └── UpdateItem.ts
├── presentation/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
│       ├── item/
│       │   └── ItemManagementModal.tsx
│       └── entity/
│           └── EntityManagementModal.tsx
└── shared/
    ├── contexts/
    │   ├── ItemFormContext.tsx
    │   ├── EntityModalContext.tsx
    │   └── useItemFormContext.ts
    ├── types/
    │   ├── ContextTypes.ts
    │   ├── EntityTypes.ts
    │   ├── FormTypes.ts
    │   ├── HookTypes.ts
    │   └── ItemTypes.ts
    └── utils/
```

### AFTER (Proposed)
```
src/features/items/
├── components/
│   ├── Modal.tsx              // was: ItemManagementModal
│   ├── ModalTemplate.tsx      // was: ItemModalTemplate
│   ├── FormSections.tsx       // was: ItemFormSections
│   ├── EntityModal.tsx        // was: EntityManagementModal
│   ├── HistoryContent.tsx     // was: ItemHistoryContent
│   └── ...atoms/molecules/organisms (flatten jadi satu folder)
├── hooks/
│   ├── useItem.ts             // was: useItemPageHandlers
│   ├── useItemForm.ts         // was: useItemFormState + useItemFormHandlers
│   ├── useItemQueries.ts      // keep as is
│   ├── useItemMutations.ts    // keep as is
│   ├── useValidation.ts       // was: useItemFormValidation
│   ├── useEntityManager.ts    // was: useGenericEntityManagement
│   ├── useSelection.ts        // was: useItemSelection
│   ├── useHistory.ts          // was: useEntityHistory
│   ├── useGridColumns.ts      // was: useItemGridColumns
│   └── usePriceCalculator.ts  // was: useItemPriceCalculator
├── contexts/
│   ├── ItemContext.tsx        // merge 9 contexts into 1-2
│   ├── useItemContext.ts      // custom hooks to access context
│   └── EntityModalContext.tsx // keep for entity modal
├── services/
│   ├── api.ts                 // API calls
│   ├── calculator.ts          // was: domain/use-cases/CalculateItemPrice
│   └── mutations.ts           // was: ItemMutationUtilities
├── types/
│   ├── index.ts               // consolidate all types
│   ├── item.ts                // was: ItemTypes
│   ├── form.ts                // was: FormTypes
│   └── context.ts             // was: ContextTypes
├── utils/
│   ├── codeGenerator.ts       // was: useItemCodeGenerator (extract logic)
│   ├── priceCalculator.ts     // was: PriceCalculator
│   └── validation.ts          // validation helpers
└── constants.ts
```

## 🔄 Step-by-Step Refactoring

### Step 1: Rename Main Components

#### 1.1 ItemManagementModal → Modal

**File**: `src/features/items/components/Modal.tsx`

```typescript
// BEFORE: ItemManagementModal.tsx
import type {
  ItemManagementModalProps,
  ItemManagementContextValue,
} from '../../../shared/types';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';

const ItemManagementModal: React.FC<ItemManagementModalProps> = ({...}) => {
  const handlers = useAddItemPageHandlers({...});
  // ...
  return (
    <ItemManagementProvider value={contextValue}>
      <ItemManagementContent itemId={itemId} />
    </ItemManagementProvider>
  );
};

// AFTER: Modal.tsx
import type { ModalProps, ItemContext } from '../types';
import { useItem } from '../hooks/useItem';
import { ItemProvider } from '../contexts/ItemContext';

const Modal: React.FC<ModalProps> = ({...}) => {
  const item = useItem({...});
  // ...
  return (
    <ItemProvider value={item}>
      <ModalContent itemId={itemId} />
    </ItemProvider>
  );
};
```

### Step 2: Consolidate Contexts

#### 2.1 Merge 9 Contexts into 1

**File**: `src/features/items/contexts/ItemContext.tsx`

```typescript
// BEFORE: 9 separate contexts
export const ItemFormStateContext = createContext<ItemFormState | undefined>(undefined);
export const ItemUIStateContext = createContext<ItemUIState | undefined>(undefined);
export const ItemModalStateContext = createContext<ItemModalState | undefined>(undefined);
export const ItemPriceStateContext = createContext<ItemPriceState | undefined>(undefined);
export const ItemActionStateContext = createContext<ItemActionState | undefined>(undefined);
// ... 4 more

// AFTER: 1 unified context
interface ItemContextValue {
  state: {
    form: FormState;
    ui: UIState;
    modal: ModalState;
    price: PriceState;
    realtime: RealtimeState;
  };
  actions: {
    form: FormActions;
    ui: UIActions;
    modal: ModalActions;
    business: BusinessActions;
  };
}

const ItemContext = createContext<ItemContextValue | undefined>(undefined);

export const ItemProvider: React.FC<PropsWithChildren<{ value: ItemContextValue }>> = ({
  children,
  value,
}) => {
  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>;
};

// Custom hooks for easy access
export const useItemState = () => {
  const context = useContext(ItemContext);
  if (!context) throw new Error('useItemState must be used within ItemProvider');
  return context.state;
};

export const useItemActions = () => {
  const context = useContext(ItemContext);
  if (!context) throw new Error('useItemActions must be used within ItemProvider');
  return context.actions;
};

// Specific hooks for granular access
export const useItemForm = () => useItemState().form;
export const useItemUI = () => useItemState().ui;
export const useItemModal = () => useItemState().modal;
export const useItemPrice = () => useItemState().price;
```

### Step 3: Simplify Hooks

#### 3.1 useAddItemPageHandlers → useItem

**File**: `src/features/items/hooks/useItem.ts`

```typescript
// BEFORE: useAddItemPageHandlers (151 lines, returns 38+ properties)
export const useAddItemPageHandlers = ({...}: AddItemPageHandlersProps) => {
  const addItemForm = useAddItemForm({...});
  const { descriptionRef, marginInputRef, minStockInputRef } = useAddItemRefs();
  const { isClosing, setIsClosing, showDescription, ... } = useAddItemUIState();
  const { categoriesData, typesData, ... } = useItemQueries();
  const { handleSelectChange, handleDropdownChange, ... } = useAddItemEventHandlers({...});
  
  // ... 100+ lines of logic
  
  return {
    formData,
    displayBasePrice,
    displaySellPrice,
    categories,
    types,
    // ... 30+ more properties
  };
};

// AFTER: useItem (cleaner, organized)
export const useItem = (props: UseItemProps) => {
  const form = useItemForm(props);
  const queries = useItemQueries();
  const mutations = useItemMutations(props);
  const validation = useValidation(form.data);
  const pricing = usePricing(form.data);
  
  return {
    form,
    queries,
    mutations,
    validation,
    pricing,
  };
};
```

#### 3.2 useItemFormValidation → useValidation

```typescript
// BEFORE: useItemFormValidation
export const useItemFormValidation = ({
  formData,
  isDirtyFn,
  isEditMode,
  operationsPending,
}: UseItemFormValidationProps) => {
  // ... validation logic
};

// AFTER: useValidation (in items context, no need "Item" prefix)
export const useValidation = ({
  data,
  isDirty,
  isEditMode,
  isPending,
}: ValidationProps) => {
  // ... validation logic
};
```

### Step 4: Simplify Types

**File**: `src/features/items/types/index.ts`

```typescript
// BEFORE: Multiple type files with verbose names
// ContextTypes.ts
export interface ItemManagementContextValue {...}
export interface ItemManagementModalProps {...}
export interface UseItemManagementProps {...}

// FormTypes.ts
export interface ItemFormData {...}
export interface ItemFormState {...}

// AFTER: Consolidated and simplified
// types/index.ts
export interface ModalProps {...}
export interface UseItemProps {...}
export interface FormData {...}
export interface FormState {...}
export interface ItemContext {...}

// Re-export from specific files
export * from './item';
export * from './form';
export * from './context';
```

### Step 5: Update Imports

#### Before
```typescript
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import type { ItemManagementModalProps } from '../../../shared/types';
```

#### After
```typescript
import { useItem } from '../hooks/useItem';
import { useValidation } from '../hooks/useValidation';
import { ItemProvider } from '../contexts/ItemContext';
import type { ModalProps } from '../types';
```

## 📊 Comparison Table

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **File Path Length** | 70+ chars | 35 chars | -50% |
| **Import Path** | `../../../application/hooks/form/` | `../hooks/` | -60% |
| **Component Name** | `ItemManagementModal` | `Modal` | -62% |
| **Hook Name** | `useAddItemPageHandlers` | `useItem` | -73% |
| **Context Count** | 9 contexts | 1-2 contexts | -80% |
| **Type Name** | `ItemManagementContextValue` | `ItemContext` | -64% |
| **Folder Depth** | 7 levels | 4 levels | -43% |

## 🚀 Migration Commands

```bash
# 1. Create new structure
mkdir -p src/features/items/{components,hooks,contexts,services,types,utils}

# 2. Copy and rename files
cp src/features/item-management/presentation/templates/item/ItemManagementModal.tsx \
   src/features/items/components/Modal.tsx

# 3. Update imports in new file
# Use VS Code Find & Replace (Ctrl+H)
# Find: ItemManagementModal
# Replace: Modal

# 4. Run TypeScript compiler to find errors
npm run type-check

# 5. Fix imports one by one
# Use VS Code's auto-import feature (Ctrl+.)

# 6. Test the changes
npm run test

# 7. Remove old structure (after everything works)
rm -rf src/features/item-management
```

## ⚠️ Breaking Changes & Migration Path

### Breaking Changes
1. Import paths changed
2. Component names changed
3. Hook names changed
4. Context structure changed

### Migration Path
```typescript
// Step 1: Keep both old and new (1 week)
// Old import still works via index.ts
export { Modal as ItemManagementModal } from './components/Modal';

// Step 2: Add deprecation warning
/** @deprecated Use Modal from 'features/items/components/Modal' */
export { ItemManagementModal } from './legacy';

// Step 3: Remove old structure (after migration complete)
// Delete legacy files
```

## ✅ Testing Checklist

- [ ] All components render correctly
- [ ] All hooks work as expected
- [ ] Context provides correct values
- [ ] Form validation works
- [ ] Modal opens/closes properly
- [ ] CRUD operations work
- [ ] Realtime updates work
- [ ] Price calculations work
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] Performance is same or better

## 📝 Documentation Updates

After refactoring, update:
1. README.md - new structure
2. CONTRIBUTING.md - new naming conventions
3. Code comments - remove outdated references
4. Storybook stories - if applicable
5. API documentation - if applicable

---

**Estimated Time**: 2-3 days for complete migration
**Risk Level**: Medium (needs thorough testing)
**Team Involvement**: All frontend developers should be aware
