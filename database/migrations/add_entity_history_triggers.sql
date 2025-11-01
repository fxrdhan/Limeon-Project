-- ================================================================
-- Migration: Add Entity History Triggers to All Entity Tables
-- ================================================================
-- This migration adds triggers to automatically track changes
-- to items and related master data tables in entity_history.
--
-- IMPORTANT: Run this in Supabase SQL Editor (Dashboard)
-- ================================================================

-- Drop existing triggers if any (for idempotency)
DROP TRIGGER IF EXISTS track_items_history ON items;
DROP TRIGGER IF EXISTS track_item_categories_history ON item_categories;
DROP TRIGGER IF EXISTS track_item_types_history ON item_types;
DROP TRIGGER IF EXISTS track_item_packages_history ON item_packages;
DROP TRIGGER IF EXISTS track_item_dosages_history ON item_dosages;
DROP TRIGGER IF EXISTS track_item_manufacturers_history ON item_manufacturers;
DROP TRIGGER IF EXISTS track_item_units_history ON item_units;

-- ================================================================
-- Create triggers for all entity tables
-- ================================================================

-- 1. Items table
CREATE TRIGGER track_items_history
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_items_history ON items IS
  'Automatically tracks all changes to items in entity_history table';

-- 2. Item Categories table
CREATE TRIGGER track_item_categories_history
  AFTER INSERT OR UPDATE OR DELETE ON item_categories
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_categories_history ON item_categories IS
  'Automatically tracks all changes to categories in entity_history table';

-- 3. Item Types table
CREATE TRIGGER track_item_types_history
  AFTER INSERT OR UPDATE OR DELETE ON item_types
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_types_history ON item_types IS
  'Automatically tracks all changes to types in entity_history table';

-- 4. Item Packages table
CREATE TRIGGER track_item_packages_history
  AFTER INSERT OR UPDATE OR DELETE ON item_packages
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_packages_history ON item_packages IS
  'Automatically tracks all changes to packages in entity_history table';

-- 5. Item Dosages table
CREATE TRIGGER track_item_dosages_history
  AFTER INSERT OR UPDATE OR DELETE ON item_dosages
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_dosages_history ON item_dosages IS
  'Automatically tracks all changes to dosages in entity_history table';

-- 6. Item Manufacturers table
CREATE TRIGGER track_item_manufacturers_history
  AFTER INSERT OR UPDATE OR DELETE ON item_manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_manufacturers_history ON item_manufacturers IS
  'Automatically tracks all changes to manufacturers in entity_history table';

-- 7. Item Units table
CREATE TRIGGER track_item_units_history
  AFTER INSERT OR UPDATE OR DELETE ON item_units
  FOR EACH ROW
  EXECUTE FUNCTION capture_entity_history();

COMMENT ON TRIGGER track_item_units_history ON item_units IS
  'Automatically tracks all changes to units in entity_history table';

-- ================================================================
-- Verify installation
-- ================================================================
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE 'track_%_history'
ORDER BY event_object_table;

-- ================================================================
-- Expected output: 7 rows showing triggers on all entity tables
-- ================================================================
