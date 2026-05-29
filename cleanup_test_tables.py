#!/usr/bin/env python3
"""
Database Cleanup Script - Remove all test tables and data
Run this to make your Supabase database production-ready
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = Path(__file__).parent / "backend" / ".env"
load_dotenv(env_path, override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")
    sys.exit(1)

def cleanup_database():
    """Clean up all test tables and data"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        print("🗑️  Starting database cleanup...")
        print("-" * 50)

        # Step 1: Delete test_email_logs data
        print("1️⃣  Deleting test_email_logs data...")
        try:
            result = supabase.table("test_email_logs").delete().neq("id", "").execute()
            print(f"   ✓ Deleted test_email_logs records")
        except Exception as e:
            print(f"   ⚠️  test_email_logs table may not exist or already empty: {e}")

        # Step 2: Delete test_profiles data
        print("2️⃣  Deleting test_profiles data...")
        try:
            result = supabase.table("test_profiles").delete().neq("id", "").execute()
            print(f"   ✓ Deleted test_profiles records")
        except Exception as e:
            print(f"   ⚠️  test_profiles table may not exist or already empty: {e}")

        # Step 3: Drop tables using SQL
        print("3️⃣  Dropping test tables via SQL...")
        # Note: Supabase Python SDK uses PostgREST which doesn't support DDL directly
        # You need to run this SQL in the Supabase dashboard
        print("""
   ⚠️  IMPORTANT: The Python SDK doesn't support DDL (DROP TABLE) operations.

   Please run this SQL manually in your Supabase SQL Editor:

   -- Drop test tables
   DROP TABLE IF EXISTS test_email_logs CASCADE;
   DROP TABLE IF EXISTS test_profiles CASCADE;
        """)

        # Step 4: Verify production tables
        print("4️⃣  Verifying production tables...")

        try:
            templates = supabase.table("email_templates").select("COUNT()", count="exact").execute()
            print(f"   ✓ email_templates: {len(templates.data) if hasattr(templates, 'data') else '?'} records")
        except Exception as e:
            print(f"   ⚠️  Could not verify email_templates: {e}")

        try:
            logs = supabase.table("email_logs").select("id").limit(1).execute()
            print(f"   ✓ email_logs: exists and accessible")
        except Exception as e:
            print(f"   ⚠️  Could not verify email_logs: {e}")

        try:
            profiles = supabase.table("profiles").select("id").limit(1).execute()
            print(f"   ✓ profiles: exists and accessible")
        except Exception as e:
            print(f"   ⚠️  Could not verify profiles: {e}")

        print("-" * 50)
        print("✅ Cleanup partial success!")
        print("\n📝 NEXT STEPS:")
        print("   1. Go to your Supabase dashboard (https://app.supabase.com)")
        print("   2. Open the SQL Editor")
        print("   3. Run the SQL commands from database_cleanup.sql")
        print("   4. Verify that all test tables are removed")
        print("   5. Your database is now production-ready!")

    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    cleanup_database()
