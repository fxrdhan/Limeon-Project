# Realtime Fix for Entity History

## Problem Identified

After installing triggers, realtime updates still weren't working. Two root causes found:

### 1. ❌ Multiple Column Filter Not Supported

**Original code:**

```typescript
filter: `entity_table=eq.${entityTable},entity_id=eq.${entityId}`;
```

**Issue:** Supabase Realtime doesn't support multiple column filters in a single filter string.

**Solution:** Filter by single column (`entity_table`), then filter `entity_id` on client side.

### 2. ❌ Unstable Subscription from Dependencies

**Original code:**

```typescript
}, [entityTable, entityId, fetchHistory]);
```

**Issue:** `fetchHistory` in dependency array causes constant re-subscription because it changes on every render.

**Solution:**

- Remove `fetchHistory` from dependencies
- Inline fetch logic in event handler

## Fixed Implementation

### Before:

```typescript
.on('postgres_changes', {
  filter: `entity_table=eq.${entityTable},entity_id=eq.${entityId}`, // ❌
}, payload => {
  fetchHistory(); // ❌ unstable reference
})
.subscribe();
}, [entityTable, entityId, fetchHistory]); // ❌
```

### After:

```typescript
.on('postgres_changes', {
  filter: `entity_table=eq.${entityTable}`, // ✅ single column
}, payload => {
  const recordEntityId = payload.new?.entity_id || payload.old?.entity_id;

  if (recordEntityId === entityId) { // ✅ client-side filter
    // ✅ inline fetch (stable)
    (async () => {
      const { data } = await supabase
        .from('entity_history')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false });

      setHistory(data || []);
    })();
  }
})
.subscribe();
}, [entityTable, entityId]); // ✅ stable dependencies
```

## Testing

### Console Logs to Watch

When you open "Riwayat Perubahan" modal:

```
🔗 Setting up realtime subscription for entity history: {
  entityTable: 'items',
  entityId: '123-456-789',
  channelName: 'entity-history-items-123-456-789'
}

✅ Entity history realtime connected: entity-history-items-123-456-789
```

When another device updates the same item:

```
🔄 Entity history event received: {
  eventType: 'INSERT',
  recordEntityId: '123-456-789',
  targetEntityId: '123-456-789',
  match: true
}

✅ Event matches, re-fetching history

📊 History updated from realtime: 7
```

### Test Steps

1. **Device A:**
   - Open Item Master
   - Edit an item (e.g., "Paracetamol")
   - Click timestamp to open "Riwayat Perubahan"
   - Keep modal open
   - Check console for connection logs

2. **Device B:**
   - Open same item
   - Change name to "Paracetamol 500mg"
   - Click **Simpan**

3. **Device A (verify):**
   - Modal should **automatically** show new version
   - Console should show:
     ```
     🔄 Entity history event received: { ... }
     ✅ Event matches, re-fetching history
     📊 History updated from realtime: 8
     ```

## Troubleshooting

### If realtime still doesn't work:

1. **Check console logs:**
   - Look for "❌ Entity history realtime error"
   - Look for "🔌 Entity history realtime closed"

2. **Verify triggers are firing:**

   ```sql
   SELECT * FROM entity_history
   ORDER BY changed_at DESC
   LIMIT 10;
   ```

   After updating an item, you should see new records.

3. **Check realtime publication:**

   ```sql
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'entity_history';
   ```

   Should return 1 row.

4. **Check RLS policies:**

   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'entity_history';
   ```

   Should have SELECT policy for authenticated users.

5. **Network issues:**
   - Check browser DevTools Network tab
   - Look for WebSocket connection to Supabase
   - Should see "101 Switching Protocols"

## Benefits

✅ Stable subscription (no re-subscription loops)
✅ Efficient filtering (only subscribe to relevant table)
✅ Client-side precision (exact entity_id matching)
✅ Better debugging (detailed console logs)
✅ Auto-updates across all devices in real-time

## Files Modified

- `src/features/item-management/application/hooks/instances/useEntityHistory.ts`
  - Changed filter from multi-column to single-column
  - Added client-side entity_id filtering
  - Inlined fetch logic to avoid dependency issues
  - Removed fetchHistory from useEffect dependencies
  - Added detailed debug logging
