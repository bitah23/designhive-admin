import json
import os

from anthropic import Anthropic

from config import MOCK_MODE

_client = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        _client = Anthropic(api_key=api_key)
    return _client


_SYSTEM = """You are an expert email copywriter for DesignHive AI — a premium design tools platform.
Generate polished, on-brand marketing emails.

Brand palette: background #07090f · card #131b2e · accent/gold #ff9f1c · body text #ffffff

OUTPUT: Return ONLY a raw JSON object — no markdown, no code fences, no extra text.
{"subject": "...", "body": "..."}

HTML rules for the body value:
- Full document: DOCTYPE + <html> + <head> + <body>
- All CSS inline on each element — no <style> blocks, no classes that reference an external sheet
- Personalisation placeholders: {{name}}  {{email}}  {{date}}
- Dark background (#07090f outer, #131b2e card), amber CTAs (#ff9f1c text on black)
- Max-width 600px container, margin:0 auto, centred
- Email-client safe: table-based layout, no CSS grid or flexbox
- Subject line: max 60 characters, compelling and specific"""

_TONE_MAP = {
    "friendly": "Warm, conversational, encouraging — feel like a message from a friend.",
    "professional": "Formal and businesslike — precise language, no contractions.",
    "urgent": "Urgent and action-oriented — emphasise time-sensitivity and FOMO.",
}

_MOCK_BODY = """<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DesignHive — Mock Email</title>
</head>
<body style="margin:0;padding:0;background-color:#07090f;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#07090f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#131b2e;border-radius:16px;border:1px solid rgba(255,159,28,0.15);
                        padding:48px 48px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;
                         color:#ff9f1c;font-family:monospace;">DesignHive AI</p>
              <h1 style="margin:0 0 16px;font-size:40px;font-weight:700;color:#ffffff;line-height:1.1;">
                Hello, <span style="color:#ff9f1c;">{{name}}</span>
              </h1>
              <p style="margin:0 0 32px;font-size:16px;color:rgba(255,255,255,0.6);line-height:1.7;">
                This is a mock-mode preview. In production, Claude will generate a fully custom email
                based on your brief, tone, and CTA preferences.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#ff9f1c;border-radius:50px;padding:16px 48px;">
                    <a href="#" style="color:#07090f;font-weight:700;font-size:15px;
                                        text-decoration:none;letter-spacing:0.04em;">
                      Get Started &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
                Sent to {{email}} &nbsp;&middot;&nbsp; {{date}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def generate_email_content(
    brief: str,
    tone: str = "friendly",
    include_cta: bool = True,
    cta_text: str = "Learn More",
) -> dict:
    """
    Returns {"subject": "...", "body": "<html>...</html>"}.
    Called by the /api/agents/generate-content endpoint.
    """
    if MOCK_MODE:
        return {
            "subject": "[Mock] Re-engage with DesignHive — we miss you!",
            "body": _MOCK_BODY,
        }

    tone_desc = _TONE_MAP.get(tone, _TONE_MAP["friendly"])
    cta_instruction = (
        f'Include a prominent CTA button with text: "{cta_text}".'
        if include_cta
        else "Do not include a CTA button."
    )

    user_prompt = (
        f"Brief: {brief}\n"
        f"Tone: {tone_desc}\n"
        f"{cta_instruction}\n\n"
        "Generate the email now."
    )

    client = _get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip accidental markdown code fences
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()

    result = json.loads(raw)

    if not isinstance(result.get("subject"), str) or not isinstance(result.get("body"), str):
        raise ValueError("Unexpected response structure from content generation")

    if "<html" not in result["body"].lower():
        raise ValueError("Generated body is not a valid HTML document")

    return {"subject": result["subject"], "body": result["body"]}
