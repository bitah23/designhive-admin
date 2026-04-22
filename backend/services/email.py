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


def _wrap_template(subject: str, body: str) -> str:
    """Wraps email body in a monochrome, email-client-safe layout."""
    logo_url = "https://admin.designhivestudio.ai/assets/brand/logo.png"
    
    template_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
            body { margin: 0; padding: 0; background-color: #F7F7F7; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; }
            .body-copy p { margin: 0 0 16px; }
            @media (prefers-color-scheme: dark) {
                body { background-color: #1A1A1A !important; }
                .page-bg { background-color: #1A1A1A !important; }
                .card-bg { background-color: #111111 !important; border-color: #2A2A2A !important; }
                .text-main { color: #FFFFFF !important; }
                .text-muted { color: #C9C9C9 !important; }
                .divider { border-color: #2A2A2A !important; }
                .btn-dark { background-color: #000000 !important; border-color: #000000 !important; }
                .btn-dark a { color: #FFFFFF !important; }
            }
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#F7F7F7;">
        <div style="display:none; font-size:1px; color:#F7F7F7; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
            Welcome to Design Hive. Your account is ready, and your dashboard is waiting.
        </div>
        <table role="presentation" class="page-bg" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F7F7F7;">
            <tr>
                <td align="center" style="padding:24px 12px;">
                    <table role="presentation" class="card-bg" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; width:100%; background-color:#FFFFFF; border:1px solid #E3E3E3;">
                        <tr>
                            <td style="padding:28px 28px 18px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td valign="middle">
                                            <img src="{{LOGO_URL}}" width="112" height="32" alt="Design Hive" style="width:112px; height:32px; color:#111111; font-size:14px; font-weight:700;">
                                        </td>
                                        <td class="text-muted" align="right" valign="middle" style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#555555; font-weight:700;">
                                            Admin Dispatch
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 28px 20px;">
                                <h1 class="text-main" style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:36px; line-height:1.1; font-weight:900; color:#1A1A1A;">
                                    {{SUBJECT}}
                                </h1>
                            </td>
                        </tr>
                        <tr>
                            <td class="body-copy text-main" style="padding:0 28px 12px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.5; color:#1A1A1A; text-align:left;">
                                {{BODY}}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:6px 28px 28px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td class="btn-dark" bgcolor="#000000" style="background-color:#000000; border:1px solid #000000;">
                                            <a href="https://admin.designhivestudio.ai/dashboard.html" style="display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:44px; min-height:44px; font-weight:700; color:#FFFFFF; text-decoration:none; padding:0 30px;">
                                                Access your Design Hive Dashboard
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="divider" style="padding:0 28px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="border-top:1px solid #E8E8E8; font-size:0; line-height:0;">&nbsp;</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:18px 28px 26px;">
                                <p class="text-muted" style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#666666;">
                                    You are receiving this email because you signed up for Design Hive.<br>
                                    Need help? Contact support@designhive.ai
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return (
        template_html
        .replace("{{LOGO_URL}}", logo_url)
        .replace("{{SUBJECT}}", subject)
        .replace("{{BODY}}", body)
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
    # 1. Replace variables in original content
    raw_body = _replace_variables(template["body"], user)
    subject = _replace_variables(template["subject"], user)
    
    # 2. Wrap the content in the branded design layout
    # (Matches buildPreviewEmail from frontend)
    html_body = _wrap_template(subject, raw_body)

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
