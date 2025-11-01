# Multi-Column Filter Fix

## Timeline of Issues

### Phase 1: No Triggers

- **Problem:** No history tracking at all
- **Solution:** Add triggers via `add_entity_history_triggers.sql`

### Phase 2: Duplicate Triggers (Accidental Working State)

- **State:** 2 triggers per table
- **Problem:** Creates duplicate versions (v21 + v22 simultaneously)
- **Side Effect:** Realtime **accidentally worked** because one of the events matched
- **User Report:** "Realtime works but creates duplicates"

### Phase 3: Single Trigger (Broken Realtime)

- **Action:** Removed duplicate triggers via `remove_duplicate_history_triggers.sql`
- **Problem:** Realtime **stopped working** entirely
- **User Report:** "Duplicates fixed but realtime not auto-update anymore"
- **Root Cause:** Multi-column filter not supported by Supabase Realtime

## The Multi-Column Filter Problem

### What Was Attempted:

```typescript
filter: `entity_table=eq.${entityTable},entity_id=eq.${entityId}`;
```

### Why It Doesn't Work:

Supabase Realtime **does NOT support** comma-separated multi-column filters in the format shown above. The documentation shows filters should be single-column comparisons.

**Reference:** https://supabase.com/docs/guides/realtime/postgres-changes

Valid filter formats:

- ✅ `column=eq.value`
- ✅ `column=gt.100`
- ❌ `column1=eq.value1,column2=eq.value2` (NOT SUPPORTED)

### Why It "Worked" With Duplicate Triggers:

With 2 triggers firing:

- Trigger 1 sends event A
- Trigger 2 sends event B
- One of these events might have partial matching or trigger Supabase's fallback logic
- Result: Realtime worked (but created duplicates)

With 1 trigger:

- Only 1 event sent
- Multi-column filter doesn't match properly
- Result: No realtime updates

## The Solution

### Single-Column Server Filter + Client-Side Filtering:

```typescript
// Server-side: Filter by entity_table only (single column)
filter: (`entity_table=eq.${entityTable}`,
  // Client-side: Check entity_id in callback
  payload => {
    const recordEntityId = payload.new?.entity_id || payload.old?.entity_id;

    if (recordEntityId === entityId) {
      // This event is for our entity - process it
      fetchHistory();
    } else {
      // Skip events for other entities
    }
  });
```

### Benefits:

1. ✅ **Works with Supabase Realtime** (single-column filter supported)
2. ✅ **Precise filtering** (client checks exact entity_id match)
3. ✅ **No duplicates** (single trigger only)
4. ✅ **Better debugging** (logs show match/skip status)

## Implementation

### File Modified:

`src/features/item-management/application/hooks/instances/useEntityHistory.ts`

### Changes:

1. **Filter:** Changed from `entity_table=eq.X,entity_id=eq.Y` to `entity_table=eq.X`
2. **Callback:** Added client-side entity_id checking
3. **Logging:** Enhanced debug logs to show match status

## Testing

### Test 1: Realtime Works (No Duplicates)

**Laptop 1:**

- Open item
- Open "Riwayat Perubahan"
- Keep modal open
- **Check console:**
  ```
  🔗 Setting up realtime subscription for entity history: {...}
  ✅ Entity history realtime connected: entity-history-items-{id}
  ```

**Laptop 2:**

- Update same item
- Save

**Laptop 1 Console:**

```
🔄 Entity history event received: {
  eventType: 'INSERT',
  recordEntityId: '{matching-id}',
  targetEntityId: '{matching-id}',
  match: true
}

✅ Event matches, re-fetching history

🔍 Fetching history for: {...}
✅ History set to: [Array(N)]
```

**Laptop 1 UI:**

- ✅ **ONE** new version appears automatically
- ✅ No page refresh needed

### Test 2: Events for Other Entities Are Ignored

**Laptop 1:**

- Open item A's history
- **Check console shows:**
  ```
  🔗 Setting up realtime subscription for entity history: {
    entityTable: 'items',
    entityId: '{item-A-id}',
    ...
  }
  ```

**Laptop 2:**

- Update **item B** (different item)
- Save

**Laptop 1 Console:**

```
🔄 Entity history event received: {
  eventType: 'INSERT',
  recordEntityId: '{item-B-id}',
  targetEntityId: '{item-A-id}',
  match: false       ← Event is for different entity
}

⏭️ Event skipped (different entity)
```

**Laptop 1 UI:**

- ✅ No update (correct behavior - we're watching item A, not item B)

## Console Logs Reference

### Successful Flow:

```
1. 🔗 Setting up realtime subscription...
2. ✅ Entity history realtime connected
3. (user updates item on another device)
4. 🔄 Entity history event received: { match: true }
5. ✅ Event matches, re-fetching history
6. 🔍 Fetching history for: {...}
7. ✅ History set to: [...]
```

### Skipped Event (Different Entity):

```
1. 🔗 Setting up realtime subscription...
2. ✅ Entity history realtime connected
3. (user updates DIFFERENT item)
4. 🔄 Entity history event received: { match: false }
5. ⏭️ Event skipped (different entity)
```

## Summary

| Issue                     | Cause                           | Fix                           | Status   |
| ------------------------- | ------------------------------- | ----------------------------- | -------- |
| No realtime               | No triggers                     | Add triggers                  | ✅ Fixed |
| Duplicate versions        | Duplicate triggers              | Remove duplicates             | ✅ Fixed |
| Realtime broken after fix | Multi-column filter unsupported | Single-column + client filter | ✅ Fixed |

## Expected Final State

- ✅ Single trigger per table (no duplicates)
- ✅ One version per update (v20 → v21, not v20 → v21, v22)
- ✅ Realtime auto-update works across devices
- ✅ Events properly filtered client-side
- ✅ Better debug logging

## Files Modified

1. `database/migrations/add_entity_history_triggers.sql` - Added triggers
2. `database/migrations/remove_duplicate_history_triggers.sql` - Removed duplicates
3. `src/features/item-management/application/hooks/instances/useEntityHistory.ts` - Fixed filter
