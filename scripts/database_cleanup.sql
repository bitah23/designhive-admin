-- ============================================================================
-- DATABASE CLEANUP SCRIPT - Remove all test tables and data
-- Run this in Supabase SQL Editor to make your database production-ready
-- ============================================================================

-- Step 1: Delete all test data from test_email_logs (has foreign key to email_templates)
DELETE FROM test_email_logs;

-- Step 2: Delete all test data from test_profiles
DELETE FROM test_profiles;

-- Step 3: Drop the test tables (in dependency order)
DROP TABLE IF EXISTS test_email_logs CASCADE;
DROP TABLE IF EXISTS test_profiles CASCADE;

-- Step 4: Verify that orphaned test tables are removed
-- (These should now return 0 rows if they still exist)
SELECT COUNT(*) as test_email_logs_count FROM information_schema.tables WHERE table_name = 'test_email_logs';
SELECT COUNT(*) as test_profiles_count FROM information_schema.tables WHERE table_name = 'test_profiles';

-- Step 5: Optional - Clean up any test data from production tables if you have marked it
-- Uncomment these if you have a way to identify test records in your production tables
-- Example (adjust WHERE clause based on your data):
-- DELETE FROM email_logs WHERE user_email LIKE '%test%' OR user_email LIKE '%@example.com';
-- DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%@example.com';

-- ============================================================================
-- Verification: Run these to confirm your production tables are intact
-- ============================================================================

-- Check email_templates table
SELECT COUNT(*) as email_templates_count FROM email_templates;

-- Check email_logs table (should have non-test data only)
SELECT COUNT(*) as email_logs_count FROM email_logs;

-- Check profiles table (should have non-test data only)
SELECT COUNT(*) as profiles_count FROM profiles;

-- List any remaining foreign key constraints
SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE table_name IN ('email_logs', 'profiles')
ORDER BY table_name;
