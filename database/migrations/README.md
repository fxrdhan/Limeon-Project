# Database Migrations

## Entity History Setup

### Migration 1: Add Entity History Triggers

**Problem:** Realtime updates for entity history were not working because triggers were missing on entity tables.

**Solution:** Run `add_entity_history_triggers.sql` to install triggers on all entity tables.

### Migration 2: Remove Duplicate Triggers ⚠️ **IMPORTANT**

**Problem:** Updates create TWO identical history entries (v21 + v22 simultaneously) due to duplicate triggers.

**Solution:** Run `remove_duplicate_history_triggers.sql` to remove old duplicate triggers.

**You MUST run both migrations in order:**

1. First: `add_entity_history_triggers.sql` (if not already run)
2. Second: `remove_duplicate_history_triggers.sql` (fixes duplicates)

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `add_entity_history_triggers.sql`
5. Click **Run**
6. Verify the output shows 7 triggers installed

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI configured
supabase db push --include-all
```

### Option 3: Direct psql

```bash
psql "$DATABASE_URL" < database/migrations/add_entity_history_triggers.sql
```

## Verification

After running the migration, verify triggers are installed:

```sql
SELECT
  trigger_name,
  event_object_table as table_name
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE 'track_%_history'
ORDER BY event_object_table;
```

Expected output: 7 rows

| trigger_name                     | table_name         |
| -------------------------------- | ------------------ |
| track_item_categories_history    | item_categories    |
| track_item_dosages_history       | item_dosages       |
| track_item_manufacturers_history | item_manufacturers |
| track_item_packages_history      | item_packages      |
| track_item_types_history         | item_types         |
| track_item_units_history         | item_units         |
| track_items_history              | items              |

## What These Triggers Do

Each trigger automatically:

- Captures INSERT operations (new records)
- Captures UPDATE operations (changes to existing records)
- Captures DELETE operations (record deletions)
- Stores version history in `entity_history` table
- Enables realtime synchronization across all connected clients

## Testing Realtime Updates

After installing triggers:

1. Open Item Master on **Device A**
2. Edit an item and click the timestamp to open "Riwayat Perubahan"
3. On **Device B**, update the same item and save
4. **Device A** should automatically show the new version without refresh

## Troubleshooting

If realtime updates still don't work:

1. Check if triggers are installed (run verification query above)
2. Check browser console for realtime connection logs
3. Verify RLS policies allow SELECT on entity_history
4. Check if `HISTORY_DEBUG` is enabled in `src/features/item-management/config/debug.ts`
