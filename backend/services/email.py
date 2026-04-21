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
    """Wraps the email body in the DesignHive branded layout (table-based for compatibility)."""
    logo_url = "https://admin.designhivestudio.ai/assets/brand/logo.png"
    
    template_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; }
            .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #fff6db, #ffffff); padding: 30px; }
            .hero { background: linear-gradient(135deg, #8d173c, #b62453); padding: 30px; border-radius: 20px; color: #ffffff; }
            .content { padding: 30px; color: #243041; line-height: 1.8; font-size: 15px; }
            .footer { background-color: #111827; padding: 30px; color: #d5d9e5; border-radius: 0 0 20px 20px; }
            .badge { padding: 6px 12px; border-radius: 20px; background: #f5e5a4; color: #7b183a; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .btn { display: inline-block; padding: 12px 24px; border-radius: 30px; background-color: #8d173c; color: #ffffff; text-decoration: none; font-weight: 700; margin-top: 20px; }
        </style>
    </head>
    <body style="background-color: #f3f4f6; padding: 20px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb;">
            <!-- Header -->
            <tr>
                <td class="header" style="padding: 28px 28px 0; background: linear-gradient(135deg, #fff6db, #ffffff);">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td><img src="{{LOGO_URL}}" alt="Design Hive" style="width: 128px; height: auto; display: block;"></td>
                            <td align="right"><span class="badge" style="padding: 8px 12px; border-radius: 999px; background: #f5e5a4; color: #7b183a; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;">Admin Dispatch</span></td>
                        </tr>
                    </table>
                    <div style="height: 24px;">&nbsp;</div>
                </td>
            </tr>
            <!-- Hero -->
            <tr>
                <td style="padding: 0 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" class="hero" style="background: linear-gradient(135deg, #8d173c, #b62453); border-radius: 24px; color: #ffffff;">
                        <tr>
                            <td style="padding: 28px;">
                                <div style="font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; opacity: .82; margin-bottom: 12px;">DesignHive AI</div>
                                <h1 style="margin: 0 0 10px; font-size: 32px; line-height: 1.1; color: #ffffff;">{{SUBJECT}}</h1>
                                <p style="margin: 0; font-size: 15px; line-height: 1.7; opacity: .9;">A more polished, dashboard-aware email with stronger hierarchy, cleaner content pacing, and a real footer your team can ship confidently.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Message -->
            <tr>
                <td class="content" style="padding: 28px;">
                    <div style="font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #8d173c; margin-bottom: 12px;">Message</div>
                    <div style="font-size: 15px; line-height: 1.8; color: #243041;">
                        {{BODY}}
                    </div>
                </td>
            </tr>
            <!-- Shortcut -->
            <tr>
                <td style="padding: 0 28px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7f2e4; border: 1px solid #eadfbc; border-radius: 18px;">
                        <tr>
                            <td style="padding: 18px 20px;">
                                <div style="font-size: 13px; font-weight: 700; color: #8d173c; margin-bottom: 8px;">Dashboard shortcut</div>
                                <a href="https://admin.designhivestudio.ai/dashboard.html" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #8d173c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;">Open Dashboard</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="padding: 0 28px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" class="footer" style="background: #111827; border-radius: 18px; color: #d5d9e5;">
                        <tr>
                            <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">DesignHive AI</div>
                                            <div style="font-size: 12px; line-height: 1.6; max-width: 280px;">Campaign workflows, template previews, user targeting, and delivery tracking.</div>
                                        </td>
                                        <td align="right" style="font-size: 12px; line-height: 1.8; vertical-align: top;">
                                            <div>support@designhive.ai</div>
                                            <div>admin.designhive.ai</div>
                                        </td>
                                    </tr>
                                </table>
                                <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.12); font-size: 12px; line-height: 1.8; color: #9ca3af;">
                                    Thanks for building with us.<br>
                                    The DesignHive AI team
                                </div>
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
