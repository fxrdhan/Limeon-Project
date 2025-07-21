# PharmaSys CRUD Architecture Migration Guide

This guide explains how to migrate from the current scattered CRUD operations to the new modular architecture.

## Overview of New Architecture

The new architecture provides:
- Centralized CRUD services
- Type-safe operations
- Consistent error handling
- React Query integration
- Better separation of concerns

## Directory Structure

```
src/
├── services/api/          # CRUD services
├── hooks/queries/         # React Query hooks
├── constants/queryKeys.ts # Centralized query keys
```

## Migration Steps

### 1. Replace Direct Supabase Calls

**Before:**
```typescript
const { data, error } = await supabase
  .from('items')
  .select('*')
  .order('name');
```

**After:**
```typescript
import { itemsService } from '@/services/api';

const result = await itemsService.getAll({
  orderBy: { column: 'name', ascending: true }
});
```

### 2. Use React Query Hooks

**Before:**
```typescript
const [items, setItems] = useState([]);

useEffect(() => {
  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*');
    setItems(data || []);
  };
  fetchItems();
}, []);
```

**After:**
```typescript
import { useItems } from '@/hooks/queries';

const { data: items, isLoading, error } = useItems();
```

### 3. Handle Mutations

**Before:**
```typescript
const handleCreate = async (data) => {
  const { error } = await supabase.from('items').insert(data);
  if (!error) {
    // Refresh data manually
  }
};
```

**After:**
```typescript
import { useItemMutations } from '@/hooks/queries';

const { createItem } = useItemMutations();

const handleCreate = async (data) => {
  await createItem.mutateAsync({ itemData: data });
  // Data automatically refreshes via React Query
};
```

## Component Examples

### Master Data Management

**Before (using handlers/masterData.ts):**
```typescript
import { handleCreate } from '@/handlers/masterData';

await handleCreate('item_categories', formData);
```

**After:**
```typescript
import { useCategoryMutations } from '@/hooks/queries';

const { createCategory } = useCategoryMutations();
await createCategory.mutateAsync(formData);
```

### Item Search

**Before:**
```typescript
const searchItems = async (query) => {
  const { data } = await supabase
    .from('items')
    .select('*')
    .ilike('name', `%${query}%`);
  return data;
};
```

**After:**
```typescript
import { useSearchItems } from '@/hooks/queries';

const { data: searchResults } = useSearchItems(query);
```

### Purchase Form

**Before:**
```typescript
// Direct Supabase calls in component
const createPurchase = async () => {
  const { data: purchase } = await supabase
    .from('purchases')
    .insert(purchaseData)
    .single();
    
  const purchaseItems = items.map(item => ({
    ...item,
    purchase_id: purchase.id
  }));
  
  await supabase.from('purchase_items').insert(purchaseItems);
};
```

**After:**
```typescript
import { usePurchaseMutations } from '@/hooks/queries';

const { createPurchase } = usePurchaseMutations();

await createPurchase.mutateAsync({
  purchaseData,
  items
});
```

## Benefits of Migration

1. **Type Safety**: All operations are fully typed
2. **Error Handling**: Consistent error handling across the app
3. **Cache Management**: Automatic cache invalidation
4. **Loading States**: Built-in loading and error states
5. **Optimistic Updates**: Easy to implement with React Query
6. **Code Reusability**: Shared logic across components

## Quick Reference

### Services
- `itemsService` - Item CRUD operations
- `purchasesService` - Purchase operations
- `masterDataService` - Categories, types, units, suppliers

### Query Hooks
- `useItems()` - Get all items
- `useItem(id)` - Get single item
- `useSearchItems(query)` - Search items
- `usePurchases()` - Get all purchases
- `usePurchase(id)` - Get single purchase

### Mutation Hooks
- `useItemMutations()` - Create, update, delete items
- `usePurchaseMutations()` - Purchase operations
- `useCategoryMutations()` - Category operations

### Query Keys
```typescript
import { QueryKeys } from '@/constants/queryKeys';

// Examples:
QueryKeys.items.all
QueryKeys.purchases.detail(id)
QueryKeys.masterData.categories.list()
```

## Step-by-Step Migration Checklist

- [ ] Replace direct Supabase calls in components
- [ ] Convert useState/useEffect to React Query hooks
- [ ] Update mutation handlers to use mutation hooks
- [ ] Remove manual cache invalidation
- [ ] Update error handling to use React Query error states
- [ ] Remove redundant loading states
- [ ] Test all CRUD operations
- [ ] Update real-time subscriptions if needed

## Need Help?

1. Check the service files for available methods
2. Look at the hook files for usage examples
3. Refer to React Query documentation for advanced patterns