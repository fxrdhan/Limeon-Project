# Quick Reference: Naming Conventions

## 🎯 Prinsip Utama

### 1. **Konteks dari Path, Bukan Nama**
Path sudah memberikan konteks, jangan diulang di nama file/fungsi.

```typescript
❌ /features/item-management/hooks/useItemFormValidation.ts
✅ /features/items/hooks/useValidation.ts

❌ /features/item-management/components/ItemManagementModal.tsx
✅ /features/items/components/Modal.tsx
```

### 2. **Pendek & Jelas > Panjang & Deskriptif**

```typescript
❌ useAddItemPageHandlers
✅ useItem

❌ ItemManagementContextValue
✅ ItemContext

❌ useGenericEntityManagement
✅ useEntityManager
```

### 3. **Flat > Nested**

```typescript
❌ features/item-management/presentation/templates/item/
✅ features/items/components/

❌ application/hooks/form/
✅ hooks/
```

## 📋 Naming Patterns

### Components

| Bad ❌ | Good ✅ | Context |
|--------|---------|---------|
| `ItemManagementModal` | `Modal` | dalam folder `items/` |
| `ItemModalTemplate` | `ModalTemplate` | dalam folder `items/` |
| `ItemFormSections` | `FormSections` | dalam folder `items/` |
| `EntityManagementModal` | `EntityModal` | specific entity name |
| `GenericEditInPlaceFactory` | `EditInPlace` | factory tidak perlu "Factory" |

### Hooks

| Bad ❌ | Good ✅ | Notes |
|--------|---------|-------|
| `useAddItemPageHandlers` | `useItem` | main hook |
| `useItemFormValidation` | `useValidation` | dalam folder `items/` |
| `useItemModalOrchestrator` | `useModal` | hindari "Orchestrator" |
| `useGenericEntityManagement` | `useEntityManager` | hindari "Generic" |
| `useItemUserInteractions` | `useInteractions` | redundant "Item" |
| `useAddItemUIState` | `useUI` | hindari "Add" prefix |

### Types & Interfaces

| Bad ❌ | Good ✅ | Pattern |
|--------|---------|---------|
| `ItemManagementContextValue` | `ItemContext` | suffix "Context" sudah cukup |
| `ItemManagementModalProps` | `ModalProps` | konteks dari import |
| `UseItemManagementProps` | `UseItemProps` | less verbose |
| `AddItemPageHandlersProps` | `UseItemProps` | consistent naming |

### Context

| Bad ❌ | Good ✅ | Reason |
|--------|---------|--------|
| `ItemFormStateContext` | `ItemContext` | merge state & actions |
| `ItemUIStateContext` | (merge ke `ItemContext`) | too granular |
| `ItemModalStateContext` | (merge ke `ItemContext`) | too granular |
| `ItemPriceStateContext` | (merge ke `ItemContext`) | too granular |
| 9 separate contexts | 1-2 contexts | consolidate |

### Folders

| Bad ❌ | Good ✅ |
|--------|---------|
| `item-management/` | `items/` |
| `presentation/templates/item/` | `components/` |
| `application/hooks/form/` | `hooks/` |
| `domain/use-cases/` | `services/` |
| `shared/contexts/` | `contexts/` |

## 🔄 Common Transformations

### Pattern 1: Remove Redundant Prefixes

```typescript
// In folder: features/items/

❌ ItemManagementModal
❌ ItemFormValidation
❌ ItemPageHandlers
❌ ItemUserInteractions

✅ Modal
✅ FormValidation (or just Validation)
✅ PageHandlers (or just useItem)
✅ UserInteractions (or just Interactions)
```

### Pattern 2: Remove Verbose Suffixes

```typescript
❌ useItemModalOrchestrator
❌ GenericEditInPlaceFactory
❌ useAddItemPageHandlers
❌ ItemMutationUtilities

✅ useModal
✅ EditInPlace
✅ useItem
✅ mutations
```

### Pattern 3: Simplify Context Names

```typescript
❌ ItemFormStateContext
❌ ItemUIStateContext
❌ ItemFormActionsContext
❌ ItemUIActionsContext

✅ ItemContext (with state & actions inside)
```

### Pattern 4: Consolidate Hook Files

```typescript
// BEFORE: 8 separate files
useItemFormState.ts
useItemFormHandlers.ts
useItemFormReset.ts
useItemCacheManager.ts
useItemModalOrchestrator.ts
useItemPageHandlers.ts
useItemUserInteractions.ts
useItemValidation.ts

// AFTER: 2-3 consolidated files
useItemForm.ts     // state + handlers + reset + cache
useItem.ts         // main orchestrator
useValidation.ts   // validation logic
```

## 📁 File Organization

### Component Files

```
components/
├── Modal.tsx              // main modal
├── ModalTemplate.tsx      // template
├── FormSections.tsx       // form sections
├── HistoryContent.tsx     // history view
├── EntityModal.tsx        // entity modal
├── Dropdown.tsx           // dropdown component
├── Table.tsx              // table component
└── ...
```

### Hook Files

```
hooks/
├── useItem.ts             // main hook
├── useItemForm.ts         // form logic
├── useItemQueries.ts      // data fetching
├── useItemMutations.ts    // data mutations
├── useValidation.ts       // validation
├── usePricing.ts          // pricing logic
├── useEntityManager.ts    // entity CRUD
├── useSelection.ts        // selection logic
└── useHistory.ts          // history logic
```

### Context Files

```
contexts/
├── ItemContext.tsx        // main context with provider
├── useItemContext.ts      // custom hooks for context
└── EntityModalContext.tsx // entity modal context
```

### Type Files

```
types/
├── index.ts              // main exports
├── item.ts               // item-related types
├── form.ts               // form types
├── context.ts            // context types
└── entity.ts             // entity types
```

## 🚫 Anti-Patterns to Avoid

### 1. Over-Prefixing
```typescript
❌ useItemItemFormItemValidation  // ridiculous
❌ ItemManagementItemModal        // redundant
✅ useValidation
✅ Modal
```

### 2. Over-Suffixing
```typescript
❌ GenericEntityManagementHandler
❌ ItemModalOrchestratorManager
✅ EntityManager
✅ useModal
```

### 3. Over-Nesting
```typescript
❌ features/item-management/application/hooks/form/useItemFormHandlers.ts
✅ features/items/hooks/useForm.ts
```

### 4. Context Explosion
```typescript
❌ 9+ separate contexts for one feature
✅ 1-2 consolidated contexts
```

### 5. Generic Naming
```typescript
❌ useGenericEntityManagement
❌ GenericEditInPlaceFactory
✅ useEntityManager
✅ EditInPlace
```

## ✅ Best Practices

### 1. Import Organization
```typescript
// Group imports logically
import React from 'react';
import { useCallback, useState } from 'react';

import type { ModalProps } from '../types';
import { useItem } from '../hooks/useItem';
import { ItemProvider } from '../contexts/ItemContext';

import { Button } from '@/components/button';
```

### 2. File Structure
```typescript
// 1. Imports
// 2. Types (if small and local)
// 3. Constants
// 4. Main component/function
// 5. Sub-components (if any)
// 6. Exports
```

### 3. Barrel Exports
```typescript
// features/items/index.ts
export { Modal } from './components/Modal';
export { useItem } from './hooks/useItem';
export { ItemProvider } from './contexts/ItemContext';
export type { ModalProps, ItemContext } from './types';
```

### 4. Type Co-location
```typescript
// Small, specific types: co-locate with component
// Shared types: separate types folder
// Complex types: separate file in types folder
```

## 📊 Metrics

### Target Metrics
- File name: ≤ 20 characters
- Import path: ≤ 50 characters
- Folder depth: ≤ 4 levels
- Context count per feature: ≤ 3
- Hook return properties: ≤ 10

### Red Flags
- File name > 30 characters
- Import path > 80 characters
- Folder depth > 6 levels
- More than 5 contexts for one feature
- Hook returning 20+ properties

## 🎨 Examples from Codebase

### Good Examples
```typescript
// Already good:
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Badge } from '@/components/badge';
```

### Need Improvement
```typescript
// Current:
import { ItemManagementModal } from '@/features/item-management/presentation/templates/item/ItemManagementModal';
import { useAddItemPageHandlers } from '@/features/item-management/application/hooks/form/useItemPageHandlers';

// Should be:
import { Modal } from '@/features/items/components/Modal';
import { useItem } from '@/features/items/hooks/useItem';
```

## 🔗 Quick Links

- [Full Guide](./NAMING_IMPROVEMENTS.md)
- [Example Refactoring](./EXAMPLE_REFACTORING.md)
- [Migration Checklist](./NAMING_IMPROVEMENTS.md#checklist)

---

**Remember**: Code is read more than written. Make it easy to read!
