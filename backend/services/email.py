import base64
import re
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import (
    gmail, supabase, ADMIN_BASE_URL,
    GMAIL_SENDER_EMAIL, GMAIL_SENDER_NAME, TABLE_EMAIL_LOGS,
)
from email_template_default import DEFAULT_EMAIL_TEMPLATE
from email_direct_template import build_direct_email_html


def _looks_like_full_email_document(html: str) -> bool:
    value = (html or "").lower()
    return "<html" in value and "</body>" in value


def _resolve_template_html(body: str) -> str:
    if _looks_like_full_email_document(body):
        return body
    return build_direct_email_html(body or "")


def get_default_template_html() -> str:
    """The starting body the template editor offers for a new template."""
    return DEFAULT_EMAIL_TEMPLATE


def _replace_variables(text: str, user: dict) -> str:
    return (
        text
        .replace("{{name}}", user.get("name") or "")
        .replace("{{email}}", user.get("email") or "")
        .replace("{{date}}", str(date.today()))
    )


# An email has no page to resolve relative URLs against, so "/assets/x.png" and
# "images/x.png" simply do not load in an inbox. Every src/href has to be
# absolute by the time the message is handed to Gmail.
_URL_ATTR_RE = re.compile(r"""\b(src|href)\s*=\s*(['"])(?!\s*(?:https?:|mailto:|tel:|cid:|data:|\#))([^'"]*)\2""",
                          re.IGNORECASE)

# No mainstream email client renders SVG — Gmail, Outlook, and Apple Mail all
# show a broken image instead. The bundled hero art ships as both .svg (used by
# the admin UI) and .png (used in mail), so point mail at the PNG.
_EMAIL_ART_SVG_RE = re.compile(r"(/assets/images/email/[^'\"?#]+)\.svg", re.IGNORECASE)

_HAS_EXPLICIT_WIDTH_RE = re.compile(
    r"""\bwidth\s*=\s*['"][^'"]+['"]|\bstyle\s*=\s*['"][^'"]*\bwidth\s*:""", re.IGNORECASE
)


def _absolutize_urls(html: str, base_url: str) -> str:
    """Rewrite every relative src/href against the public admin origin."""
    base = base_url.rstrip("/")

    def repl(match):
        attr, quote, value = match.group(1), match.group(2), match.group(3)
        target = value.strip()
        if not target:
            return match.group(0)
        joined = f"{base}/{target.lstrip('/')}"
        return f"{attr}={quote}{joined}{quote}"

    return _URL_ATTR_RE.sub(repl, html or "")


def _sanitize_body_html(body: str, base_url: str = ADMIN_BASE_URL) -> str:
    """
    Make an admin-authored body safe to send.

    Images that already declare their own width are left alone — the template's
    header, hero, and 36px social icons all size themselves deliberately, and
    forcing width:100% on them blew the icons up to the full column. Only images
    with no sizing of their own (typically pasted into the editor) get the
    responsive treatment.
    """
    def repl(match):
        attrs = match.group(1) or ""
        if _HAS_EXPLICIT_WIDTH_RE.search(attrs):
            return match.group(0)

        has_alt = re.search(r"\balt\s*=", attrs, flags=re.IGNORECASE)
        alt = "" if has_alt else ' alt="Design Hive visual"'

        if re.search(r"\s+style\s*=\s*['\"][^'\"]*['\"]", attrs, flags=re.IGNORECASE):
            sized = re.sub(
                r"\s+style\s*=\s*(['\"])(.*?)\1",
                lambda m: f' style={m.group(1)}{m.group(2)};display:block;width:100%;height:auto;{m.group(1)}',
                attrs,
                flags=re.IGNORECASE,
            )
            return f"<img{sized}{alt}>"

        return f'<img{attrs} style="display:block;width:100%;height:auto;"{alt}>'

    html = re.sub(r"<img(\s[^>]*)?>", repl, body or "", flags=re.IGNORECASE)
    html = _EMAIL_ART_SVG_RE.sub(r"\1.png", html)
    return _absolutize_urls(html, base_url)


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
    try:
        # 1. Resolve the template HTML that should actually be sent
        template_html = _resolve_template_html(template.get("body", ""))
        raw_body = _replace_variables(template_html, user)
        subject = _replace_variables(template.get("subject", ""), user)

        # 2. Keep email HTML safe for remote clients
        html_body = _sanitize_body_html(raw_body)

        raw = _build_raw(user["email"], subject, html_body)
        gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
        supabase.table(TABLE_EMAIL_LOGS).insert({
            "user_email": user["email"],
            "template_id": template["id"],
            "status": "sent",
        }).execute()
        return {"email": user["email"], "status": "sent"}
    except Exception as e:
        supabase.table(TABLE_EMAIL_LOGS).insert({
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
    # Same treatment as a campaign send — direct mail used to skip this, so any
    # relative image URL in it reached the inbox unresolved.
    branded_html = _sanitize_body_html(build_direct_email_html(html_body))
    raw = _build_raw(to, subject, branded_html, attachments)
    gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
