# Panduan Refactoring: Penyederhanaan Naming Convention

## 🎯 Tujuan
Menyederhanakan naming convention yang terlalu verbose dan redundan untuk meningkatkan readability dan maintainability.

## 📋 Masalah yang Ditemukan

### 1. Redundansi Konteks
**Masalah**: Nama file/fungsi mengulang konteks yang sudah jelas dari path/folder
```
❌ /features/item-management/presentation/templates/item/ItemManagementModal.tsx
❌ /features/item-management/application/hooks/form/useItemFormHandlers.ts
```

**Solusi**: Hilangkan pengulangan konteks
```
✅ /features/items/components/Modal.tsx
✅ /features/items/hooks/useFormHandlers.ts
```

### 2. Over-Engineering Struktur Folder
**Masalah**: Terlalu banyak nested folder dengan naming pattern DDD/Clean Architecture yang berlebihan
```
❌ features/item-management/presentation/templates/item/
❌ features/item-management/application/hooks/form/
```

**Solusi**: Flat structure yang lebih sederhana
```
✅ features/items/components/
✅ features/items/hooks/
```

### 3. Context Splitting Berlebihan
**Masalah**: 9+ context terpisah untuk satu form
```typescript
❌ ItemFormStateContext
❌ ItemUIStateContext
❌ ItemModalStateContext
❌ ItemPriceStateContext
❌ ItemActionStateContext
// ... dan 4 lagi
```

**Solusi**: Gabungkan menjadi 2-3 context maksimal
```typescript
✅ ItemContext (state + actions)
✅ ItemUIContext (UI-specific state)
```

### 4. Naming Hook yang Terlalu Spesifik
**Masalah**: Hook dengan nama terlalu panjang dan redundan
```typescript
❌ useAddItemPageHandlers
❌ useItemFormHandlers
❌ useItemModalOrchestrator
❌ useGenericEntityManagement
```

**Solusi**: Nama yang lebih ringkas dan jelas
```typescript
✅ useItem
✅ useItemForm
✅ useModal
✅ useEntityManager
```

## 🔄 Rencana Refactoring

### Phase 1: Struktur Folder
```
BEFORE:
src/
├── features/
│   ├── item-management/
│   │   ├── application/
│   │   │   ├── hooks/
│   │   │   │   ├── collections/
│   │   │   │   ├── core/
│   │   │   │   ├── data/
│   │   │   │   ├── form/
│   │   │   │   ├── instances/
│   │   │   │   ├── ui/
│   │   │   │   └── utils/
│   │   ├── domain/
│   │   │   └── use-cases/
│   │   ├── presentation/
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   └── templates/
│   │   └── shared/
│   │       ├── contexts/
│   │       ├── types/
│   │       └── utils/

AFTER:
src/
├── features/
│   ├── items/
│   │   ├── components/    // gabungkan atoms/molecules/organisms/templates
│   │   ├── hooks/         // gabungkan semua hooks
│   │   ├── contexts/      // contexts
│   │   ├── types/         // types
│   │   ├── utils/         // utils
│   │   └── services/      // API calls & business logic
```

### Phase 2: Nama File
```typescript
// Components
❌ ItemManagementModal.tsx
✅ Modal.tsx or ItemModal.tsx

❌ ItemModalTemplate.tsx
✅ ModalTemplate.tsx

❌ ItemFormSections.tsx
✅ FormSections.tsx

❌ EntityManagementModal.tsx
✅ EntityModal.tsx

// Hooks
❌ useAddItemPageHandlers.ts
✅ useItemHandlers.ts or useItem.ts

❌ useItemFormValidation.ts
✅ useValidation.ts (dalam folder items)

❌ useGenericEntityManagement.ts
✅ useEntityManager.ts

❌ useItemModalOrchestrator.ts
✅ useModalState.ts

// Types
❌ ItemManagementContextValue
✅ ItemContextValue

❌ ItemManagementModalProps
✅ ItemModalProps

❌ UseItemManagementProps
✅ UseItemProps
```

### Phase 3: Context Consolidation
```typescript
// BEFORE: 9 contexts
ItemFormStateContext
ItemUIStateContext
ItemModalStateContext
ItemPriceStateContext
ItemActionStateContext
ItemRealtimeStateContext
ItemFormActionsContext
ItemUIActionsContext
ItemModalActionsContext

// AFTER: 2-3 contexts
ItemContext              // form state, price, realtime
  ├── state
  │   ├── form
  │   ├── price
  │   └── realtime
  └── actions
      ├── form
      ├── price
      └── realtime

ItemUIContext            // UI-only state
  ├── modal state
  ├── loading states
  └── UI actions
```

## 📝 Contoh Refactoring Konkret

### Example 1: Modal Component

**BEFORE** (`ItemManagementModal.tsx`):
```typescript
import type {
  ItemManagementModalProps,
  ItemManagementContextValue,
} from '../../../shared/types';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';

const ItemManagementModal: React.FC<ItemManagementModalProps> = ({...}) => {
  const handlers = useAddItemPageHandlers({...});
  // ...
}
```

**AFTER** (`Modal.tsx`):
```typescript
import type { ModalProps, ItemContext } from '../types';
import { useItem } from '../hooks/useItem';

const Modal: React.FC<ModalProps> = ({...}) => {
  const handlers = useItem({...});
  // ...
}
```

### Example 2: Hook Organization

**BEFORE**:
```typescript
// useItemPageHandlers.ts (151 lines)
export const useAddItemPageHandlers = ({...}) => {
  const addItemForm = useAddItemForm({...});
  const { descriptionRef, marginInputRef } = useAddItemRefs();
  const { isClosing, setIsClosing } = useAddItemUIState();
  const { categoriesData, typesData } = useItemQueries();
  // ... 100+ lines more
  return { /* 38+ properties */ };
}
```

**AFTER**:
```typescript
// useItem.ts (cleaner, focused)
export const useItem = (props: UseItemProps) => {
  const form = useItemForm(props);
  const refs = useRefs();
  const ui = useUI();
  const queries = useQueries();
  
  return {
    form,
    refs,
    ui,
    queries,
  };
}
```

### Example 3: Type Names

**BEFORE**:
```typescript
export interface ItemManagementContextValue {
  form: ItemFormState;
  ui: ItemUIState;
  modal: ItemModalState;
  price: ItemPriceState;
  action: ItemActionState;
  realtime: ItemRealtimeState;
  formActions: ItemFormActions;
  uiActions: ItemUIActions;
  modalActions: ItemModalActions;
  businessActions: ItemBusinessActions;
}
```

**AFTER**:
```typescript
export interface ItemContext {
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
```

## 🎨 Naming Guidelines

### 1. **Jangan Ulang Konteks**
```typescript
❌ ItemFormState (dalam folder items)
✅ FormState

❌ useItemFormValidation (dalam features/items/)
✅ useValidation
```

### 2. **Gunakan Nama Pendek yang Jelas**
```typescript
❌ useAddItemPageHandlers
✅ useItem atau useItemHandlers

❌ ItemManagementModal
✅ Modal atau ItemModal

❌ useGenericEntityManagement
✅ useEntityManager
```

### 3. **Flat > Nested**
```typescript
❌ presentation/templates/item/ItemManagementModal.tsx
✅ components/ItemModal.tsx

❌ application/hooks/form/useItemFormHandlers.ts
✅ hooks/useForm.ts
```

### 4. **Context: State + Actions**
```typescript
❌ 9 separate contexts dengan suffix "Context"
✅ 2-3 contexts, grouped logically
```

### 5. **Hindari "Generic", "Management", "Handler" Suffix**
```typescript
❌ useGenericEntityManagement
❌ useItemPageHandlers  
❌ ItemManagementModal
✅ useEntityManager
✅ useItem
✅ ItemModal
```

## 📊 Impact Analysis

### Metrics Before:
- Average file name length: **28 characters**
- Average path depth: **7 levels**
- Average hook name length: **22 characters**
- Number of contexts: **9+**

### Target After:
- Average file name length: **15 characters** (-46%)
- Average path depth: **4 levels** (-43%)
- Average hook name length: **12 characters** (-45%)
- Number of contexts: **2-3** (-70%)

## ⚠️ Migration Strategy

### Step 1: Create New Structure (1-2 days)
- Create new folder structure
- Copy files with new names
- Update imports in new files

### Step 2: Parallel Running (3-5 days)
- Both old and new structure exist
- Gradually migrate components
- Test thoroughly

### Step 3: Full Migration (2-3 days)
- Remove old structure
- Update all imports
- Final testing

### Step 4: Documentation (1 day)
- Update README
- Update onboarding docs
- Add migration guide

## 🚀 Quick Wins (Low Effort, High Impact)

1. **Rename Files** (2 hours)
   - `ItemManagementModal.tsx` → `Modal.tsx`
   - `ItemModalTemplate.tsx` → `ModalTemplate.tsx`

2. **Simplify Hook Names** (3 hours)
   - `useAddItemPageHandlers` → `useItem`
   - `useItemFormValidation` → `useValidation`

3. **Consolidate Contexts** (4 hours)
   - Merge 9 contexts into 2-3
   - Simplify context provider

4. **Flatten Folder Structure** (1 day)
   - Remove unnecessary nesting
   - Reorganize by feature

## 🔍 Tools yang Bisa Membantu

1. **VS Code Refactoring**
   - F2 untuk rename symbol
   - Find and Replace (Ctrl+Shift+H)

2. **TypeScript Compiler**
   - `tsc --noEmit` untuk check errors

3. **ESLint**
   - Auto-fix imports

4. **Custom Script**
   ```bash
   # Batch rename files
   find src/features/item-management -name "*ItemManagement*" -exec rename 's/ItemManagement/Item/' {} \;
   ```

## ✅ Checklist

- [ ] Review dengan tim
- [ ] Buat branch baru `refactor/naming-simplification`
- [ ] Implement Phase 1 (struktur folder)
- [ ] Implement Phase 2 (nama file)
- [ ] Implement Phase 3 (context consolidation)
- [ ] Update tests
- [ ] Update documentation
- [ ] Code review
- [ ] Merge to main

## 📚 References

- [React File Structure Best Practices](https://react.dev/learn/thinking-in-react#step-1-break-the-ui-into-a-component-hierarchy)
- [Naming Conventions for Clean Code](https://github.com/ryanmcdermott/clean-code-javascript#naming)
- [Feature-Sliced Design](https://feature-sliced.design/)

---

**Next Steps**: Diskusikan dengan tim, tentukan prioritas, dan mulai dengan Quick Wins!
