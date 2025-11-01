-- ================================================================
-- Migration: Remove Duplicate History Triggers
-- ================================================================
-- Problem: Old triggers ({table}_history_trigger) exist alongside
-- new triggers (track_{table}_history), causing double inserts
-- into entity_history table.
--
-- Solution: Drop old triggers, keep new ones.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- ================================================================

-- Drop OLD duplicate triggers (keep the track_* ones)
DROP TRIGGER IF EXISTS items_history_trigger ON items;
DROP TRIGGER IF EXISTS item_categories_history_trigger ON item_categories;
DROP TRIGGER IF EXISTS item_types_history_trigger ON item_types;
DROP TRIGGER IF EXISTS item_packages_history_trigger ON item_packages;
DROP TRIGGER IF EXISTS item_dosages_history_trigger ON item_dosages;
DROP TRIGGER IF EXISTS item_units_history_trigger ON item_units;

-- Note: item_manufacturers doesn't have duplicate, so no need to drop

-- ================================================================
-- Verify: Should show ONLY ONE trigger per table now
-- ================================================================
SELECT
  c.relname as table_name,
  COUNT(t.tgname) as trigger_count,
  STRING_AGG(t.tgname, ', ' ORDER BY t.tgname) as trigger_names
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relname IN ('items', 'item_categories', 'item_types', 'item_packages', 'item_dosages', 'item_manufacturers', 'item_units')
  AND p.proname = 'capture_entity_history'
  AND NOT t.tgisinternal
GROUP BY c.relname
ORDER BY c.relname;

-- ================================================================
-- Expected output: All tables should have trigger_count = 1
-- ================================================================
