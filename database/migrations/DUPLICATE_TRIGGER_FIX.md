# Duplicate Trigger Fix

## Problem

When updating an item, **TWO version entries** are created instead of one:

- Update item from v20 → Creates v21 AND v22 simultaneously
- Both entries have **identical timestamps** and **identical changed_fields**

## Root Cause

Database has **duplicate triggers** on entity tables:

| Table              | Old Trigger                       | New Trigger                        | Total    |
| ------------------ | --------------------------------- | ---------------------------------- | -------- |
| items              | `items_history_trigger`           | `track_items_history`              | **2** ❌ |
| item_categories    | `item_categories_history_trigger` | `track_item_categories_history`    | **2** ❌ |
| item_types         | `item_types_history_trigger`      | `track_item_types_history`         | **2** ❌ |
| item_packages      | `item_packages_history_trigger`   | `track_item_packages_history`      | **2** ❌ |
| item_dosages       | `item_dosages_history_trigger`    | `track_item_dosages_history`       | **2** ❌ |
| item_units         | `item_units_history_trigger`      | `track_item_units_history`         | **2** ❌ |
| item_manufacturers | -                                 | `track_item_manufacturers_history` | **1** ✅ |

**Result:** Each UPDATE fires 2 triggers → 2 identical history entries

## Evidence

Query result showing duplicates:

```sql
SELECT version_number, changed_at, changed_fields->'name'
FROM entity_history
WHERE entity_table = 'items'
ORDER BY changed_at DESC
LIMIT 10;
```

Output:

```
v26 | 2025-11-01 07:40:32.416625+00 | "1234567890123"
v25 | 2025-11-01 07:40:32.416625+00 | "1234567890123"  ← DUPLICATE!
v24 | 2025-11-01 07:39:03.624439+00 | "12345678901"
v23 | 2025-11-01 07:39:03.624439+00 | "12345678901"    ← DUPLICATE!
```

Notice:

- Same timestamp (down to microsecond)
- Same changed_fields
- Sequential version numbers

## Solution

Run migration to remove old duplicate triggers:

```bash
# File: database/migrations/remove_duplicate_history_triggers.sql
```

This will:

1. Drop old `{table}_history_trigger` triggers
2. Keep new `track_{table}_history` triggers
3. Result: Only 1 trigger per table

## How to Apply

### Via Supabase Dashboard:

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy contents of `remove_duplicate_history_triggers.sql`
5. Click **Run**
6. Verify output shows `trigger_count = 1` for all tables

### Verification

After running migration, verify:

```sql
SELECT
  c.relname as table_name,
  COUNT(t.tgname) as trigger_count,
  STRING_AGG(t.tgname, ', ') as trigger_names
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relname IN ('items', 'item_categories', 'item_types',
                    'item_packages', 'item_dosages', 'item_manufacturers', 'item_units')
  AND p.proname = 'capture_entity_history'
  AND NOT t.tgisinternal
GROUP BY c.relname
ORDER BY c.relname;
```

**Expected Output:**

```
table_name           | trigger_count | trigger_names
---------------------|---------------|---------------------------
item_categories      | 1             | track_item_categories_history
item_dosages         | 1             | track_item_dosages_history
item_manufacturers   | 1             | track_item_manufacturers_history
item_packages        | 1             | track_item_packages_history
item_types           | 1             | track_item_types_history
item_units           | 1             | track_item_units_history
items                | 1             | track_items_history
```

All `trigger_count` should be **1** ✅

## Testing After Fix

### Test 1: Single Version Creation

1. Open an item (e.g., current version v26)
2. Update the name
3. Check entity_history table:

```sql
SELECT version_number, changed_at
FROM entity_history
WHERE entity_table = 'items'
AND entity_id = '<your-item-id>'
ORDER BY changed_at DESC
LIMIT 3;
```

**Expected:** Only **ONE** new version (v27), not two

### Test 2: Realtime Update (No Duplicates)

**Laptop 1:**

- Open item
- Open "Riwayat Perubahan"
- Keep modal open

**Laptop 2:**

- Update same item
- Save

**Laptop 1 (verify):**

- ✅ Should show only **ONE** new version
- ❌ Should NOT show duplicate versions

## Why This Happened

Timeline:

1. **Old system:** Someone created `{table}_history_trigger` triggers
2. **New migration:** We ran `add_entity_history_triggers.sql` which created `track_{table}_history` triggers
3. **Migration didn't drop old triggers** → Both triggers remained active
4. **Result:** Double insert on every UPDATE

## Prevention

The `add_entity_history_triggers.sql` migration already has `DROP TRIGGER IF EXISTS` commands, but they target the NEW trigger names (`track_*`), not the OLD ones (`{table}_history_trigger`).

**Lesson learned:** Always check for existing triggers with similar functionality before creating new ones.

## Impact

**Before fix:**

- ❌ Every update creates 2 history entries
- ❌ Version numbers skip (v20 → v21, v22 → v23, v24)
- ❌ Doubled storage usage for entity_history
- ❌ Confusing UX (why 2 identical versions?)

**After fix:**

- ✅ Every update creates 1 history entry
- ✅ Version numbers increment normally (v20 → v21 → v22)
- ✅ Normal storage usage
- ✅ Clean version history

## Files

- `database/migrations/remove_duplicate_history_triggers.sql` - The fix
- `database/migrations/DUPLICATE_TRIGGER_FIX.md` - This documentation
