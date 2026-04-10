"""
Password Hash Utility
─────────────────────
Use this to generate bcrypt hashes for admin passwords.

Usage:
    python backend/hash_password.py your-new-password

Then update the admins table in Supabase:
    UPDATE public.admins SET password_hash = '<output>' WHERE email = 'admin@designhive.com';
"""

import sys
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
    if len(sys.argv) < 2:
        print("Usage: python hash_password.py <password>")
        sys.exit(1)

    password = sys.argv[1]
    hashed = pwd_context.hash(password)
    print(f"\nPassword hash for '{password}':\n")
    print(hashed)
    print()


if __name__ == "__main__":
    main()
