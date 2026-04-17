import base64
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import gmail, supabase, GMAIL_SENDER_EMAIL, GMAIL_SENDER_NAME


def _replace_variables(text: str, user: dict) -> str:
    return (
        text
        .replace("{{name}}", user.get("name") or "")
        .replace("{{email}}", user.get("email") or "")
        .replace("{{date}}", str(date.today()))
    )


def _build_raw(to: str, subject: str, html_body: str, attachments: list = None) -> str:
    msg = MIMEMultipart("mixed")
    msg["From"] = f'"{GMAIL_SENDER_NAME}" <{GMAIL_SENDER_EMAIL}>'
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    for att in (attachments or []):
        part = MIMEBase(*(att.mime_type.split("/", 1) if "/" in att.mime_type else ("application", "octet-stream")))
        part.set_payload(base64.b64decode(att.data))
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{att.name}"')
        msg.attach(part)

    return base64.urlsafe_b64encode(msg.as_bytes()).decode()


def _send_one(template: dict, user: dict) -> dict:
    html_body = _replace_variables(template["body"], user)
    subject = _replace_variables(template["subject"], user)
    try:
        raw = _build_raw(user["email"], subject, html_body)
        gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
        supabase.table("email_logs").insert({
            "user_email": user["email"],
            "template_id": template["id"],
            "status": "sent",
        }).execute()
        return {"email": user["email"], "status": "sent"}
    except Exception as e:
        supabase.table("email_logs").insert({
            "user_email": user["email"],
            "template_id": template["id"],
            "status": "failed",
            "error_message": str(e),
        }).execute()
        return {"email": user["email"], "status": "failed", "error": str(e)}


def send_bulk_emails(template: dict, users: list) -> list:
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(_send_one, template, user): user for user in users}
        return [f.result() for f in as_completed(futures)]


def send_direct_email(to: str, subject: str, html_body: str, attachments: list = None):
    raw = _build_raw(to, subject, html_body, attachments)
    gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
