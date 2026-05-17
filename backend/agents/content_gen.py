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


_SYSTEM = """You are the email design engine for Design Hive AI — a premium AI-powered creative and marketing platform.
Every email you generate follows the exact brand system below. Call the submit_email tool with your result.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AESTHETIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cinematic SaaS · dark mode · futuristic creative-tech · premium AI startup.
Inspired by Linear, OpenAI, Framer, Midjourney, high-end creative dashboards.
The email must feel like a luxury AI creative OS — never a generic newsletter.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLOR PALETTE  (use exclusively — no other colors)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Background:        #0B0B0F
Secondary surface: #111827
Accent red:        #991B1B
Gold accent:       #F5B841
Text primary:      #F9FAFB
Text muted:        #9CA3AF
Gold glass border: rgba(245,184,65,0.15)
Red glow:          rgba(153,27,27,0.45)
Gold glow:         rgba(245,184,65,0.2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPOGRAPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Headings:  font-family:'Space Grotesk','Inter',sans-serif; font-weight:700
Body copy: font-family:'Inter','DM Sans',sans-serif; font-weight:400; font-size:15px; line-height:1.8
No serif fonts. No corporate/Helvetica defaults.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workspace / dashboard: https://admin.designhivestudio.ai/dashboard.html
Website home:          https://designhivestudio.ai
Portfolio:             https://designhivestudio.ai/portfolio
Contact:               https://designhivestudio.ai/contact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE IMAGES  (always include the most relevant one as a hero)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Welcome / onboarding:   https://admin.designhivestudio.ai/assets/images/email/welcome-hero.svg
Feature spotlight:      https://admin.designhivestudio.ai/assets/images/email/feature-spotlight-hero.svg
Getting started:        https://admin.designhivestudio.ai/assets/images/email/getting-started-hero.svg
Help / support:         https://admin.designhivestudio.ai/assets/images/email/help-hero.svg

Render image as:
<img src="URL" alt="Design Hive AI" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto 40px;border-radius:12px;opacity:0.92;">

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CTA BUTTON  (always use this exact pattern)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="background:linear-gradient(135deg,#991B1B 0%,#b91c1c 100%);
               border-radius:8px;padding:16px 48px;
               box-shadow:0 0 32px rgba(153,27,27,0.45);">
      <a href="LINK" style="color:#F9FAFB;font-family:'Inter',sans-serif;font-weight:700;
                             font-size:15px;text-decoration:none;letter-spacing:0.05em;
                             white-space:nowrap;">Button Label →</a>
    </td>
  </tr>
</table>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLASSMORPHISM CARD PATTERN  (use for feature / benefit cards)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outer wrapper (3-col grid via nested tables with 8px gap):
<td style="background:#111827;border:1px solid rgba(245,184,65,0.15);
           border-radius:12px;padding:24px 20px;vertical-align:top;
           box-shadow:0 0 24px rgba(245,184,65,0.06);">
  <p style="font-size:22px;margin:0 0 12px;color:#F5B841;">ICON</p>
  <p style="font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;
             font-size:14px;color:#F9FAFB;margin:0 0 8px;letter-spacing:0.02em;">TITLE</p>
  <p style="font-family:'Inter',sans-serif;font-size:13px;color:#9CA3AF;
             line-height:1.65;margin:0;">DESCRIPTION</p>
</td>

Icons: use Unicode — ⚡ ✦ ◈ ⬡ ◎ ⊹ ✧ ⟡ ❋ — styled color:#F5B841

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOWING DIVIDER  (use between sections)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<div style="height:1px;background:linear-gradient(90deg,transparent,rgba(245,184,65,0.4),transparent);margin:40px 0;"></div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED LAYOUT STRUCTURE  (follow this order every time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The body MUST open with a full-width dark container so the dark background fills the content area:

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#0B0B0F;padding:48px 32px;">
  <tr>
    <td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:520px;margin:0 auto;">
        <tr><td>

          [1] EYEBROW LINE
              Small gold caps label above heading.
              style: font-family:'Inter',sans-serif;font-size:11px;letter-spacing:0.25em;
                     text-transform:uppercase;color:#F5B841;margin:0 0 16px;

          [2] HERO IMAGE  (pick from AVAILABLE IMAGES above)

          [3] HERO HEADING  — large, bold, soft white
              H1: font-size:38px;font-weight:700;color:#F9FAFB;line-height:1.1;margin:0 0 16px;
              Highlight one word with: style="color:#F5B841;"

          [4] SUBHEADLINE  — muted, readable
              font-size:16px;color:#9CA3AF;line-height:1.75;margin:0 0 32px;

          [5] PERSONALISATION LINE
              "Hello {{name}}," or woven naturally into the subheadline.

          [6] PRIMARY CTA BUTTON  (use exact pattern above)

          [7] GLOWING DIVIDER

          [8] FEATURE / CONTENT SECTION
              3 glassmorphism cards in a table row with 8px gap columns.
              Each card: icon + title + description.

          [9] GLOWING DIVIDER

          [10] CLOSING PARAGRAPH + optional secondary CTA link
               Warm sign-off, muted color, signed "— The Design Hive AI Team"

        </td></tr>
      </table>
    </td>
  </tr>
</table>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOBILE RESPONSIVENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every template body MUST be fully mobile responsive. Place a single <style> block at the very
top of your output (before any table) containing media queries only. Example structure:

<style>
  @media only screen and (max-width:600px) {
    .dh-outer   { padding: 28px 16px !important; }
    .dh-inner   { max-width: 100% !important; width: 100% !important; }
    .dh-hero-h  { font-size: 26px !important; line-height: 1.2 !important; }
    .dh-card    { display: block !important; width: 100% !important; padding: 20px 16px !important; }
    .dh-card-gap{ display: none !important; }
    .dh-img     { width: 100% !important; border-radius: 8px !important; }
    .dh-cta-td  { padding: 14px 28px !important; }
    .dh-cta-a   { font-size: 14px !important; }
  }
</style>

Apply the matching class attribute to every element the media query targets (e.g. class="dh-card").
All other CSS must remain inline. Use percentage widths (100%, max-width:520px) on containers
so they reflow naturally. Feature card columns must stack vertically on mobile using dh-card rules.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- DO NOT generate a header or footer — they are already built into the email shell
- BODY ONLY — your output is injected between an existing branded maroon header and a grey footer that contain the logo, social links, contact info, and copyright
- INNER CONTENT ONLY — absolutely no DOCTYPE, <html>, <head>, or <body> tags
- One <style> block allowed at the very top for media queries only — all other CSS must be inline
- Personalisation placeholders: {{name}}  {{email}}  {{date}}
- Table-based layout — no CSS grid, no flexbox
- Subject line: max 60 characters, compelling and specific"""

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

_MOCK_BODY = """<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#0B0B0F;padding:48px 32px;">
  <tr>
    <td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:520px;margin:0 auto;">
        <tr>
          <td>
            <p style="font-family:'Inter',sans-serif;font-size:11px;letter-spacing:0.25em;
                      text-transform:uppercase;color:#F5B841;margin:0 0 20px;">
              ✦ &nbsp; Design Hive AI &nbsp; ✦
            </p>
            <h1 style="font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;
                        font-size:38px;color:#F9FAFB;line-height:1.1;margin:0 0 16px;">
              Hello, <span style="color:#F5B841;">{{name}}.</span>
            </h1>
            <p style="font-family:'Inter',sans-serif;font-size:15px;color:#9CA3AF;
                      line-height:1.8;margin:0 0 32px;">
              This is a <strong style="color:#F9FAFB;">mock-mode preview</strong>. In production,
              the AI generates a fully custom dark-mode email following the exact Design Hive AI
              brand system — cinematic, futuristic, premium.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto 40px;">
              <tr>
                <td style="background:linear-gradient(135deg,#991B1B 0%,#b91c1c 100%);
                           border-radius:8px;padding:16px 48px;
                           box-shadow:0 0 32px rgba(153,27,27,0.45);">
                  <a href="https://admin.designhivestudio.ai/dashboard.html"
                     style="color:#F9FAFB;font-family:'Inter',sans-serif;font-weight:700;
                            font-size:15px;text-decoration:none;letter-spacing:0.05em;
                            white-space:nowrap;">Launch Your Workspace &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="font-family:'Inter',sans-serif;font-size:12px;color:#4B5563;
                      margin:0;text-align:center;">
              {{email}} &nbsp;&middot;&nbsp; {{date}}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>"""


def generate_email_content(
    brief: str,
    tone: str = "friendly",
    include_cta: bool = True,
    cta_text: str = "Learn More",
    image_url: str | None = None,
    cta_url: str | None = None,
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
    image_instruction = (
        f'Hero image: use this EXACT URL in the <img> src — do not modify it: "{image_url}"'
        if image_url
        else "Hero image: choose the most relevant image from AVAILABLE IMAGES in your brand system."
    )
    cta_url_instruction = (
        f'CTA button URL: use this EXACT href — do not modify it: "{cta_url}"'
        if cta_url
        else "CTA button URL: use the default workspace URL from your brand system."
    )

    user_prompt = (
        f"Brief: {brief}\n"
        f"Tone: {tone_desc}\n"
        f"{cta_instruction}\n"
        f"{image_instruction}\n"
        f"{cta_url_instruction}\n\n"
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
