import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv(Path(__file__).with_name(".env"))

# Supabase
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# JWT
JWT_SECRET: str = os.getenv("JWT_SECRET")
JWT_ALGORITHM: str = "HS256"

# Webhook
WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET")

# Gmail
GMAIL_SENDER_EMAIL: str = os.getenv("GMAIL_SENDER_EMAIL")
GMAIL_SENDER_NAME: str = os.getenv("GMAIL_SENDER_NAME")

_gmail_credentials = Credentials(
    token=None,
    refresh_token=os.getenv("GMAIL_REFRESH_TOKEN"),
    token_uri="https://oauth2.googleapis.com/token",
    client_id=os.getenv("GMAIL_CLIENT_ID"),
    client_secret=os.getenv("GMAIL_CLIENT_SECRET"),
)
gmail = build("gmail", "v1", credentials=_gmail_credentials)
