# 🚀 Production Readiness - Database Cleanup Guide

## Problem
Your Supabase database has lingering **test tables** that are causing foreign key constraint errors:
- `test_email_logs` - Has references to `email_templates` table
- `test_profiles` - Orphaned test data

## Solution
Clean up the test tables and prepare your database for production use.

---

## Quick Start

### Option 1: Run SQL Directly in Supabase (Recommended ⭐)

1. **Go to Supabase Dashboard**
   - Visit https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Run the Cleanup SQL**
   - Open the file: `database_cleanup.sql` in this repo
   - Copy all the SQL commands
   - Paste into the Supabase SQL Editor
   - Click "Run"

### Option 2: Run Python Cleanup Script (Partial)

```bash
cd backend
python ../cleanup_test_tables.py
```

This will:
- ✅ Delete data from test tables
- ✅ Verify production tables exist
- ⚠️ Still requires manual SQL execution to DROP tables

---

## Step-by-Step Cleanup

### Step 1: Delete Test Data from `test_email_logs`
```sql
DELETE FROM test_email_logs;
```
**Why:** This table has foreign key constraints to `email_templates`, so we must delete it first.

### Step 2: Delete Test Data from `test_profiles`
```sql
DELETE FROM test_profiles;
```

### Step 3: Drop Test Tables
```sql
DROP TABLE IF EXISTS test_email_logs CASCADE;
DROP TABLE IF EXISTS test_profiles CASCADE;
```

### Step 4: Verify Cleanup
```sql
-- These should return 0 if tables don't exist anymore
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('test_email_logs', 'test_profiles');

-- These should work fine (production tables)
SELECT COUNT(*) FROM email_templates;
SELECT COUNT(*) FROM email_logs;
SELECT COUNT(*) FROM profiles;
```

---

## Production-Ready Checklist

After cleanup, verify:

- [ ] No `test_email_logs` table exists
- [ ] No `test_profiles` table exists
- [ ] `email_templates` table is intact with all real data
- [ ] `email_logs` table is intact with all real data
- [ ] `profiles` table is intact with all real data
- [ ] All foreign key constraints are valid
- [ ] Backend `.env` file points to production tables:
  - `TABLE_PROFILES=profiles` ✓
  - `TABLE_EMAIL_LOGS=email_logs` ✓
- [ ] Deploy configuration uses production tables (GitHub Actions) ✓

---

## Common Foreign Key Errors and Solutions

### Error: `Key (id)=(...) is still referenced from table "test_email_logs"`
**Cause:** Test tables still have data referencing production tables
**Solution:** Delete data from test tables before dropping them (use CASCADE option)

### Error: `Cannot drop table "test_profiles" because other objects depend on it`
**Cause:** Other tables reference this table
**Solution:** Use `DROP TABLE ... CASCADE` to automatically drop dependent objects

---

## Verification After Cleanup

Run these checks to ensure everything is clean:

### In Supabase SQL Editor:

```sql
-- 1. Confirm test tables are gone
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'test_%';
-- Should return: (no results)

-- 2. List all production tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 3. Check foreign key constraints
SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE table_name IN ('email_logs', 'profiles')
ORDER BY table_name;
```

### In Your Application:

```bash
# Run the backend to ensure it connects properly
cd backend
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Configuration Summary

### Current Production Configuration ✓

**File:** `backend/.env`
```
TABLE_PROFILES=profiles          # ✓ Using production table
TABLE_EMAIL_LOGS=email_logs      # ✓ Using production table
```

**File:** `.github/workflows/deploy.yml`
```yaml
TABLE_PROFILES: 'profiles'       # ✓ Using production table
TABLE_EMAIL_LOGS: 'email_logs'   # ✓ Using production table
```

---

## Support & Troubleshooting

### If deletion fails with foreign key errors:
1. Check which tables reference your test tables
2. Delete referencing data first
3. Use `CASCADE` option to automatically handle dependencies

### If you can't access Supabase:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Check that your IP is whitelisted
3. Ensure service role key hasn't expired

### Additional Help:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL DROP TABLE Docs](https://www.postgresql.org/docs/current/sql-droptable.html)

---

## Next Steps

After cleanup:
1. ✅ Delete templates without foreign key errors
2. ✅ Your database is production-ready
3. ✅ Deploy with confidence

**Questions?** Check the generated SQL scripts or Supabase documentation.
