# Item Master Realtime Hook

Real-time synchronization hook for Item Master data using Supabase realtime.

## 📋 Overview

`useItemsSync` provides **automatic UI updates** when database changes occur on all Item Master tables. Users see changes from other sessions instantly without manual refresh.

### Monitored Tables

- ✅ `items` - Main item data
- ✅ `item_categories` - Item categories
- ✅ `item_types` - Item types
- ✅ `item_units` - Measurement units / satuan ukur
- ✅ `item_packages` - Package types
- ✅ `item_dosages` - Medicine dosages
- ✅ `item_manufacturers` - Item manufacturers

## 🚀 Usage

```typescript
import { useItemsSync } from '@/hooks/realtime/useItemsSync';

function ItemMasterPage() {
  // Enable realtime for all item master tables
  useItemsSync({ enabled: true });

  return <div>Your component</div>;
}
```

## 🔧 Key Features

### Single Channel Architecture

Uses one channel with multiple listeners for efficiency:

```typescript
const channel = supabase
  .channel('item-master-realtime')
  .on(
    'postgres_changes',
    { schema: 'public', table: 'items', event: '*' },
    handler
  )
  .on(
    'postgres_changes',
    { schema: 'public', table: 'item_categories', event: '*' },
    handler
  )
  // ... other listeners
  .subscribe();
```

### Auto Cache Invalidation

When database changes are detected, all related React Query caches are invalidated:

- `['items']`, `['categories']`, `['types']`, `['units']`
- `['packages']`, `['dosages']`, `['manufacturers']`

### Detailed Logging

Records detailed database changes for debugging:

```
🔄 item_categories UPDATE:
📦 Raw payload: { schema: "public", table: "item_categories", ... }
🔵 New data: { id: "...", name: "Antiaritmia", ... }
🔴 Old data: { id: "..." }
⏰ Timestamp: 2025-08-05T05:55:55.737Z
---
```

### React Strict Mode Safe

Uses global refs to prevent multiple subscriptions:

```typescript
let globalSetupRef = false;
let globalChannelRef: ReturnType<typeof supabase.channel> | null = null;
```

## ⚙️ Interface

```typescript
interface UseItemMasterRealtimeOptions {
  enabled?: boolean; // Default: true
}
```

## 📊 How It Works

1. **Setup**: Hook creates single channel with 7 listeners
2. **Listen**: Monitors all events (`INSERT`, `UPDATE`, `DELETE`) on tracked tables
3. **Log**: Records change details to console for debugging
4. **Invalidate**: Cancels relevant React Query caches
5. **Update**: UI automatically refreshes with latest data
6. **Cleanup**: Proper disconnection on component unmount

## 🔗 Dependencies

- **Supabase Client**: For WebSocket connection
- **React Query**: For cache invalidation
- **React**: useEffect for lifecycle management
