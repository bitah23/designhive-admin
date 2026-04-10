import json
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import settings

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


class GmailService:
    def __init__(self):
        self._service = None

    def _get_credentials(self) -> Credentials:
        creds = None

        # Load stored token from env
        if settings.GMAIL_TOKEN_JSON:
            try:
                token_data = json.loads(settings.GMAIL_TOKEN_JSON)
                creds = Credentials.from_authorized_user_info(token_data, SCOPES)
            except Exception:
                creds = None

        # Refresh if expired
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            return creds

        # Valid token ready to go
        if creds and creds.valid:
            return creds

        # No valid token — run interactive OAuth flow
        if not settings.GMAIL_CREDENTIALS_JSON:
            raise RuntimeError(
                "Gmail not configured. Set GMAIL_CREDENTIALS_JSON in .env, "
                "then run: python backend/setup_gmail_auth.py"
            )

        credentials_data = json.loads(settings.GMAIL_CREDENTIALS_JSON)
        flow = InstalledAppFlow.from_client_config(credentials_data, SCOPES)
        creds = flow.run_local_server(port=0)

        print("\n" + "=" * 60)
        print("Gmail authorized! Add this to GMAIL_TOKEN_JSON in .env:")
        print("=" * 60)
        print(creds.to_json())
        print("=" * 60 + "\n")

        return creds

    def get_service(self):
        if not self._service:
            creds = self._get_credentials()
            self._service = build("gmail", "v1", credentials=creds)
        return self._service

    def _build_mime(self, to_email: str, subject: str, html_body: str) -> dict:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.GMAIL_SENDER_NAME} <me>"
        message["To"] = to_email
        message.attach(MIMEText(html_body, "html"))
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return {"raw": raw}

    @staticmethod
    def fill_template(template: str, variables: dict) -> str:
        """Replace {{variable}} placeholders with actual values."""
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    def send_raw(self, to_email: str, subject: str, html_body: str) -> dict:
        """Send a pre-rendered HTML email."""
        try:
            service = self.get_service()
            message = self._build_mime(to_email, subject, html_body)
            sent = service.users().messages().send(userId="me", body=message).execute()
            return {"success": True, "message_id": sent["id"]}
        except HttpError as e:
            return {"success": False, "error": f"Gmail API error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_template_email(
        self, to_email: str, to_name: str, subject_template: str, body_template: str
    ) -> dict:
        """Render template with user data and send."""
        vars_ = {
            "name": to_name,
            "email": to_email,
            "date": datetime.now().strftime("%B %d, %Y"),
        }
        subject = self.fill_template(subject_template, vars_)
        body = self.fill_template(body_template, vars_)
        return self.send_raw(to_email, subject, body)

    def check_connection(self) -> dict:
        """Verify Gmail credentials are valid."""
        try:
            service = self.get_service()
            profile = service.users().getProfile(userId="me").execute()
            return {"connected": True, "gmail_address": profile.get("emailAddress")}
        except Exception as e:
            return {"connected": False, "error": str(e)}


gmail_service = GmailService()
