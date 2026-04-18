import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv(Path(__file__).with_name(".env"))

APP_ENV = os.getenv("APP_ENV", "development")
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

# Supabase Configuration
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class MockResponse:
    def __init__(self, data=None, error=None):
        self.data = data or []
        self.error = error

class MockSupabase:
    """A robust mock client that mimics the Supabase / PostgREST API for local testing."""
    def table(self, name):
        class Query:
            def select(self, *args): return self
            def insert(self, *args): return self
            def update(self, *args): return self
            def delete(self, *args): return self
            def eq(self, *args): return self
            def neq(self, *args): return self
            def gt(self, *args): return self
            def lt(self, *args): return self
            def ilike(self, *args): return self
            def in_(self, *args): return self
            def contains(self, *args): return self
            def order(self, *args, **kwargs): return self
            def limit(self, *args): return self
            def single(self, *args): return self
            def execute(self):
                # Sample mock data based on table name
                mock_data = {
                    "admins": [{"id": "admin-1", "email": "admin@designhive.local", "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LqCF7uQyxLp.S/YQvY8yG8yG8yG8yG8yG8yG", "is_active": True}],
                    "email_templates": [
                        {"id": "t1", "title": "Welcome Flow", "subject": "Welcome to DesignHive", "body": "Hello {{name}}...", "created_at": "2026-04-12T10:00:00"},
                        {"id": "t2", "title": "Promo Launch", "subject": "Your next campaign is live", "body": "Check this out...", "created_at": "2026-04-16T15:30:00"}
                    ],
                    "profiles": [
                        {"id": "u1", "email": "user1@example.com", "name": "User One"},
                        {"id": "u2", "email": "user2@example.com", "name": "User Two"}
                    ],
                    "email_logs": [
                        {"id": "l1", "user_email": "user1@example.com", "template_id": "t1", "status": "sent", "created_at": "2026-04-18T20:00:00"},
                        {"id": "l2", "user_email": "user2@example.com", "template_id": "t2", "status": "failed", "error_message": "SMTP Error", "created_at": "2026-04-18T21:00:00"}
                    ]
                }
                data = mock_data.get(name, [])
                # Handle .single() returning just the object if it's there
                if hasattr(self, '_is_single') and data:
                    return MockResponse(data=data[0])
                return MockResponse(data=data)
        
        q = Query()
        # Add a flag for single()
        def single_wrap():
            q._is_single = True
            return q
        q.single = single_wrap
        return q

if MOCK_MODE:
    print("MOCK_MODE is enabled. Using enhanced Mock Supabase client.")
    supabase = MockSupabase()
else:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        if APP_ENV == "production":
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production")
        else:
            print("WARNING: Supabase keys missing. Falling back to Mock Mode for development.")
            supabase = MockSupabase()
            MOCK_MODE = True
    else:
        try:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as e:
            print(f"ERROR: Failed to initialize Supabase client: {e}")
            if APP_ENV == "production":
                raise
            print("Falling back to Mock Mode.")
            supabase = MockSupabase()
            MOCK_MODE = True

# JWT Configuration
JWT_SECRET: str = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    if APP_ENV == "production":
        raise ValueError("JWT_SECRET must be set in production")
    JWT_SECRET = "dev-secret-keep-it-safe"
JWT_ALGORITHM: str = "HS256"

# Webhook Configuration
WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "dh_dev_webhook_secret")

# Gmail Configuration
GMAIL_SENDER_EMAIL: str = os.getenv("GMAIL_SENDER_EMAIL")
GMAIL_SENDER_NAME: str = os.getenv("GMAIL_SENDER_NAME", "DesignHive Admin")

if MOCK_MODE:
    print("MOCK_MODE is enabled. Using Mock Gmail client.")
    class MockGmail:
        def users(self):
            class Messages:
                def send(self, **kwargs):
                    class Exec:
                        def execute(self): return {"id": "mock-msg-id"}
                    return Exec()
            return Messages()
    gmail = MockGmail()
else:
    try:
        _gmail_credentials = Credentials(
            token=None,
            refresh_token=os.getenv("GMAIL_REFRESH_TOKEN"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GMAIL_CLIENT_ID"),
            client_secret=os.getenv("GMAIL_CLIENT_SECRET"),
        )
        gmail = build("gmail", "v1", credentials=_gmail_credentials)
    except Exception as e:
        print(f"WARNING: Failed to initialize Gmail client: {e}")
        if APP_ENV == "production":
            raise
        print("Falling back to Mock Gmail client.")
        gmail = MockGmail()
