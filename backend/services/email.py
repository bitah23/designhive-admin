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


def _sanitize_body_html(body: str) -> str:
    """Force pasted template images to stay responsive and visually bounded."""
    import re

    def repl(match):
        attrs = match.group(1) or ""
        cleaned = re.sub(r"\s+width\s*=\s*['\"][^'\"]*['\"]", "", attrs, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+height\s*=\s*['\"][^'\"]*['\"]", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+style\s*=\s*['\"][^'\"]*['\"]", "", cleaned, flags=re.IGNORECASE)
        return (
            f'<img{cleaned} width="100%" '
            'style="display:block;max-width:100%;width:100%;height:auto;max-height:260px;'
            'object-fit:contain;margin:16px auto;" alt="Design Hive visual">'
        )

    return re.sub(r"<img(\s[^>]*)?>", repl, body or "", flags=re.IGNORECASE)


def _wrap_template(subject: str, body: str, recipient_name: str = "", recipient_email: str = "") -> str:
    """Wrap email body in the polished Design Hive welcome layout."""
    safe_body = _sanitize_body_html(body)
    logo_url = "https://admin.designhivestudio.ai/assets/brand/header_logo_v4.png"
    today = str(date.today())
    
    template_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #07090f; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; }
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#07090f;">
        <div style="display:none; font-size:1px; color:#F7F7F7; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
            Welcome to Design Hive. Your account is ready, and your dashboard is waiting.
        </div>
        <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#07090f;">
            <tr>
                <td align="center" style="padding:40px 12px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px; width:100%;">
                        <tr>
                            <td align="center" style="padding:0 0 24px;">
                                <img src="{{LOGO_URL}}" alt="Design Hive Logo" width="520" style="display:block; width:100%; max-width:520px; height:auto; margin:0 auto;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 0 16px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(160deg,#131b2e 0%,#0f1520 60%,#0c1119 100%); border:1px solid rgba(255,159,28,0.12); border-radius:20px; overflow:hidden;">
                                    <tr>
                                        <td style="height:3px; background:linear-gradient(90deg,transparent 0%,#ff9f1c 40%,#ffc84a 60%,transparent 100%); font-size:0; line-height:0;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding:44px 36px 38px;">
                                            <div style="display:inline-block; font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:#ff9f1c; background:rgba(255,159,28,0.1); border:1px solid rgba(255,159,28,0.25); padding:6px 18px; border-radius:30px; margin-bottom:24px; font-family:Arial, Helvetica, sans-serif;">
                                                New Member
                                            </div>
                                            <div style="margin:0 0 12px; font-family:Georgia, 'Times New Roman', serif; font-size:52px; line-height:1.05; font-weight:700; color:#ffffff;">
                                                {{SUBJECT}}
                                            </div>
                                            <div style="margin:0 0 30px; font-size:17px; line-height:1.6; color:rgba(255,255,255,0.62); font-family:Arial, Helvetica, sans-serif;">
                                                Hello, {{NAME}} - your journey officially starts now.
                                            </div>
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:460px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,159,28,0.2); border-radius:12px; margin:0 auto 30px;">
                                                <tr>
                                                    <td style="width:3px; background:linear-gradient(180deg,#ff9f1c,#ffc84a); font-size:0; line-height:0;">&nbsp;</td>
                                                    <td style="padding:22px 24px; text-align:left;">
                                                        <div style="font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:#ff9f1c; margin-bottom:14px; font-family:Arial, Helvetica, sans-serif;">Your Account</div>
                                                        <div style="font-size:15px; line-height:1.6; color:#ffffff; margin-bottom:8px; font-family:Arial, Helvetica, sans-serif;"><span style="display:inline-block; width:70px; color:rgba(255,255,255,0.45); font-size:12px;">Name</span>{{NAME}}</div>
                                                        <div style="font-size:15px; line-height:1.6; color:#ffffff; margin-bottom:8px; font-family:Arial, Helvetica, sans-serif;"><span style="display:inline-block; width:70px; color:rgba(255,255,255,0.45); font-size:12px;">Email</span>{{EMAIL}}</div>
                                                        <div style="font-size:15px; line-height:1.6; color:#ff9f1c; font-family:Arial, Helvetica, sans-serif;"><span style="display:inline-block; width:70px; color:rgba(255,255,255,0.45); font-size:12px;">Date</span>{{TODAY}}</div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                                                <tr>
                                                    <td bgcolor="#ffb84a" style="border-radius:50px; background:linear-gradient(135deg,#ff9f1c 0%,#ffb84a 100%);">
                                                        <a href="https://admin.designhivestudio.ai/dashboard.html" style="display:inline-block; padding:17px 38px; border-radius:50px; color:#07090f; text-decoration:none; font-size:15px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; font-family:Arial, Helvetica, sans-serif;">
                                                            Go to Dashboard
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="font-size:12px; line-height:1.6; color:rgba(255,255,255,0.25); margin-top:14px; letter-spacing:0.05em; font-family:Arial, Helvetica, sans-serif;">No credit card required &middot; Cancel anytime</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 0 16px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF; border:1px solid rgba(255,159,28,0.14); border-radius:20px; overflow:hidden;">
                                    <tr>
                                        <td style="padding:34px 32px 30px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:#1f2937; text-align:left; background-color:#FFFFFF;">
                                            {{BODY}}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(160deg,#131b2e 0%,#0f1520 100%); border:1px solid rgba(255,255,255,0.06); border-radius:20px; overflow:hidden;">
                                    <tr>
                                        <td style="padding:30px 32px; text-align:center;">
                                            <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.8; color:rgba(255,255,255,0.5);">
                                                You are receiving this because you signed up for Design Hive.<br>
                                                <a href="#" style="color:rgba(255,159,28,0.72); text-decoration:none;">Unsubscribe</a>
                                                &nbsp;&middot;&nbsp;
                                                <a href="#" style="color:rgba(255,159,28,0.72); text-decoration:none;">Privacy Policy</a>
                                                &nbsp;&middot;&nbsp;
                                                <a href="#" style="color:rgba(255,159,28,0.72); text-decoration:none;">View in Browser</a>
                                            </div>
                                            <div style="width:60px; height:1px; background:linear-gradient(90deg,transparent,rgba(255,159,28,0.3),transparent); margin:22px auto;"></div>
                                            <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.8; color:rgba(255,255,255,0.26);">
                                                Sent from Design Hive on {{TODAY}}.<br>
                                                Need help? Contact support@designhive.ai
                                            </div>
                                        </td>
                                    </tr>
                                </table>
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
        .replace("{{NAME}}", recipient_name)
        .replace("{{EMAIL}}", recipient_email)
        .replace("{{TODAY}}", today)
        .replace("{{BODY}}", safe_body)
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
    html_body = _wrap_template(
        subject,
        raw_body,
        user.get("name") or "",
        user.get("email") or "",
    )

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
