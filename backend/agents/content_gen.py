import os

from anthropic import Anthropic

from config import MOCK_MODE
from email_direct_template import build_direct_email_html

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

Brand palette: accent/gold #ff9f1c · dark maroon #8b1a1a · body text #1c1c2e · muted #4a4a5a

Call the submit_email tool with your result.

HTML rules for the body parameter:
- INNER CONTENT ONLY — no DOCTYPE, no <html>, no <head>, no <body> tags whatsoever
- Plain semantic HTML: <h1>, <h2>, <p>, <a>, <table>, <img>, <ul>, <li>, etc.
- All CSS inline on each element — no <style> blocks
- Personalisation placeholders: {{name}}  {{email}}  {{date}}
- White background assumed — use dark text (#1c1c2e) for headings, muted (#4a4a5a) for body copy
- CTA buttons: bulletproof table pattern — <table><tr><td style="background:#8b1a1a;border-radius:50px;padding:14px 40px;"><a href="URL" style="color:#ffffff;font-weight:700;text-decoration:none;">Label</a></td></tr></table>
- Use real DesignHive URLs for CTAs: https://designhivestudio.ai (home), https://designhivestudio.ai/portfolio (work), https://designhivestudio.ai/contact (contact)
- Email-client safe: table-based layout for multi-column, no CSS grid or flexbox
- Subject line: max 60 characters, compelling and specific
- The content will be embedded inside a white-body email that already has a dark maroon branded header and grey footer"""

_SUBMIT_TOOL = {
    "name": "submit_email",
    "description": "Submit the generated email subject line and HTML body content.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Email subject line, max 60 characters.",
            },
            "body": {
                "type": "string",
                "description": "Inner HTML body content only — no DOCTYPE or html/head/body tags.",
            },
        },
        "required": ["subject", "body"],
    },
}

_TONE_MAP = {
    "friendly": "Warm, conversational, encouraging — feel like a message from a friend.",
    "professional": "Formal and businesslike — precise language, no contractions.",
    "urgent": "Urgent and action-oriented — emphasise time-sensitivity and FOMO.",
}

_MOCK_BODY = """<h2 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1c1c2e;
              font-family:'DM Sans',Arial,sans-serif;line-height:1.2;">
  Hello, <span style="color:#8b1a1a;">{{name}}</span>
</h2>
<p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#4a4a5a;
           font-family:'DM Sans',Arial,sans-serif;">
  This is a <strong>mock-mode preview</strong>. In production, Claude will generate a fully
  custom email based on your brief, tone, and CTA preferences. Your personalised content
  will appear here, styled consistently with the Design Hive brand.
</p>
<table border="0" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="background:#8b1a1a;border-radius:50px;padding:14px 40px;">
      <a href="https://designhivestudio.ai"
         style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;
                font-family:'DM Sans',Arial,sans-serif;letter-spacing:0.04em;">
        Visit Design Hive &rarr;
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:12px;color:#aaaaaa;font-family:'DM Sans',Arial,sans-serif;">
  Sent to {{email}} &nbsp;&middot;&nbsp; {{date}}
</p>"""


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
            "body": build_direct_email_html(_MOCK_BODY),
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
        max_tokens=8192,
        system=_SYSTEM,
        tools=[_SUBMIT_TOOL],
        tool_choice={"type": "any"},
        messages=[{"role": "user", "content": user_prompt}],
    )

    tool_block = next(
        (b for b in message.content if getattr(b, "type", None) == "tool_use"),
        None,
    )
    if tool_block is None:
        raise ValueError("Model did not call submit_email tool")

    result = tool_block.input

    if not isinstance(result.get("subject"), str) or not isinstance(result.get("body"), str):
        raise ValueError("Unexpected response structure from content generation")

    if "<html" in result["body"].lower():
        raise ValueError("Generated body must be inner content only, not a full HTML document")

    return {"subject": result["subject"], "body": build_direct_email_html(result["body"])}
