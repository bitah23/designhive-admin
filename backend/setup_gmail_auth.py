"""
Gmail OAuth2 Setup Script (FIXED)
─────────────────────────────────
Run this script ONCE to authorize Gmail API access.
"""

import json
import sys
from pathlib import Path
from dotenv import load_dotenv
import os

from google_auth_oauthlib.flow import InstalledAppFlow

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def main():
    credentials_json = os.getenv("GMAIL_CREDENTIALS_JSON", "").strip()

    if not credentials_json:
        print("ERROR: GMAIL_CREDENTIALS_JSON is not set in your .env file.")
        sys.exit(1)

    try:
        credentials_data = json.loads(credentials_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON: {e}")
        sys.exit(1)

    print("Opening browser for Gmail authorization...\n")

    # ✅ FIX: set fixed redirect URI + fixed port
    flow = InstalledAppFlow.from_client_config(
        credentials_data,
        SCOPES,
        redirect_uri="http://localhost:5000"
    )

    creds = flow.run_local_server(
        port=5000,
        prompt="consent",
        access_type="offline"
    )

    token_json = creds.to_json()

    print("\n" + "=" * 70)
    print("SUCCESS! Copy this into your .env as GMAIL_TOKEN_JSON")
    print("=" * 70)
    print(token_json)
    print("=" * 70)

    print("\nPaste like this:")
    print('GMAIL_TOKEN_JSON=<paste here>')
    print("\nRestart your backend after updating .env.")


if __name__ == "__main__":
    main()