-- ================================================================
-- Verification Script: Check Entity History Triggers Status
-- ================================================================
-- Run this to verify that all entity history triggers are installed
-- ================================================================

-- 1. Check if capture_entity_history function exists
SELECT
  'Function Check' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'capture_entity_history'
    ) THEN '✅ PASS - Function exists'
    ELSE '❌ FAIL - Function missing'
  END as result;

-- 2. Check if get_next_version_number function exists
SELECT
  'Helper Function Check' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'get_next_version_number'
    ) THEN '✅ PASS - Helper function exists'
    ELSE '❌ FAIL - Helper function missing'
  END as result;

-- 3. List all entity history triggers
SELECT
  'Trigger Inventory' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_timing || ' ' || event_manipulation as trigger_event
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE 'track_%_history'
ORDER BY event_object_table;

-- 4. Count triggers (should be 7)
SELECT
  'Trigger Count' as check_type,
  COUNT(*) as installed_triggers,
  CASE
    WHEN COUNT(*) = 7 THEN '✅ PASS - All 7 triggers installed'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING - Only ' || COUNT(*) || ' of 7 triggers installed'
    ELSE '❌ FAIL - No triggers installed'
  END as result
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE 'track_%_history';

-- 5. Check entity_history table structure
SELECT
  'Table Structure' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'entity_history'
    ) THEN '✅ PASS - entity_history table exists'
    ELSE '❌ FAIL - entity_history table missing'
  END as result;

-- 6. Check RLS policies
SELECT
  'RLS Policies' as check_type,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ PASS - RLS policies configured'
    ELSE '⚠️  WARNING - Insufficient RLS policies'
  END as result
FROM pg_policies
WHERE tablename = 'entity_history';

-- 7. Check sample entity_history records
SELECT
  'History Records' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT entity_table) as tracked_tables,
  MAX(changed_at) as last_change
FROM entity_history;

-- 8. Missing triggers analysis
SELECT
  'Missing Triggers' as check_type,
  table_name,
  'Missing trigger: track_' || table_name || '_history' as issue
FROM (
  VALUES
    ('items'),
    ('item_categories'),
    ('item_types'),
    ('item_packages'),
    ('item_dosages'),
    ('item_manufacturers'),
    ('item_units')
) AS expected_tables(table_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.triggers
  WHERE event_object_table = expected_tables.table_name
    AND trigger_name = 'track_' || expected_tables.table_name || '_history'
);

-- ================================================================
-- Summary: If all checks show ✅ PASS, your setup is complete!
-- ================================================================
