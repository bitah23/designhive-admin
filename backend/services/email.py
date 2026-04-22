import base64
import os
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import gmail, supabase, GMAIL_SENDER_EMAIL, GMAIL_SENDER_NAME


def _looks_like_full_email_document(html: str) -> bool:
    value = (html or "").lower()
    return "<html" in value and "email-wrapper" in value and "hero-card" in value


def _load_default_template_html() -> str:
    template_path = os.path.join(os.path.dirname(__file__), "..", "..", "index.html")
    with open(template_path, "r", encoding="utf-8") as fh:
        html = fh.read()

    return (
        html
        .replace("John Doe", "{{name}}")
        .replace("john@example.com", "{{email}}")
        .replace("Pro Member", "{{date}}")
    )


def _resolve_template_html(body: str) -> str:
    return body if _looks_like_full_email_document(body) else _load_default_template_html()


def _replace_variables(text: str, user: dict) -> str:
    return (
        text
        .replace("{{name}}", user.get("name") or "")
        .replace("{{email}}", user.get("email") or "")
        .replace("{{date}}", str(date.today()))
    )


def _sanitize_body_html(body: str) -> str:
    """Keep pasted template images responsive without rewriting the layout."""
    import re

    def repl(match):
        attrs = match.group(1) or ""
        cleaned = re.sub(r"\s+width\s*=\s*['\"][^'\"]*['\"]", "", attrs, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+height\s*=\s*['\"][^'\"]*['\"]", "", cleaned, flags=re.IGNORECASE)

        if re.search(r"\s+style\s*=\s*['\"][^'\"]*['\"]", cleaned, flags=re.IGNORECASE):
            cleaned = re.sub(
                r"\s+style\s*=\s*(['\"])(.*?)\1",
                lambda m: f' style={m.group(1)}{m.group(2)};max-width:100%;height:auto;{m.group(1)}',
                cleaned,
                flags=re.IGNORECASE,
            )
            return f'<img{cleaned} alt="Design Hive visual">'

        return (
            f'<img{cleaned} '
            'style="display:block;max-width:100%;height:auto;margin:0 auto;" alt="Design Hive visual">'
        )

    html = re.sub(r"<img(\s[^>]*)?>", repl, body or "", flags=re.IGNORECASE)
    return (
        html
        .replace('src="/assets/brand/header_logo_v4.png"', 'src="https://admin.designhivestudio.ai/assets/brand/header_logo_v4.png"')
        .replace('src="images/header_logo_v4.png"', 'src="https://admin.designhivestudio.ai/assets/brand/header_logo_v4.png"')
        .replace('href="/dashboard.html"', 'href="https://admin.designhivestudio.ai/dashboard.html"')
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
    # 1. Resolve the template HTML that should actually be sent
    template_html = _resolve_template_html(template["body"])
    raw_body = _replace_variables(template_html, user)
    subject = _replace_variables(template["subject"], user)
    
    # 2. Wrap the content in the branded design layout
    # (Matches buildPreviewEmail from frontend)
    html_body = _sanitize_body_html(raw_body)

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
