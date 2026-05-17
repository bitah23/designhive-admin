import os

from anthropic import Anthropic

from config import MOCK_MODE
from email_direct_template import build_text_email_html

_client = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        _client = Anthropic(api_key=api_key)
    return _client


_SYSTEM = """You are an email copywriter for Design Hive AI — a premium AI-powered creative and marketing platform.

Your ONLY job is to write the TEXT CONTENT of an email. Do not write any HTML, CSS, design elements, buttons, images, or structural markup. The design and layout are fully handled by a fixed template — you supply only words.

Output via the submit_email tool:
- subject: A compelling subject line (max 60 characters, no clickbait)
- heading: The main email headline — short, punchy, 5–10 words
- subheading: 1–2 sentences that expand on the heading and draw the reader in
- paragraphs: 2–4 body paragraphs, 2–5 sentences each. Write in plain text. You may use relevant emojis naturally within sentences. No bullet lists, no headings inside paragraphs.
- sign_off: A warm closing line, e.g. "— The Design Hive Team"

Tone guidance is given in the user prompt. Always write for the specific brief provided — be specific, not generic.
DO NOT include any HTML tags, style attributes, or design instructions in any field."""

_SUBMIT_TOOL = {
    "name": "submit_email",
    "description": "Submit the structured text content for the email.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Email subject line, max 60 characters.",
            },
            "heading": {
                "type": "string",
                "description": "Main headline, 5–10 words.",
            },
            "subheading": {
                "type": "string",
                "description": "1–2 sentences expanding on the heading.",
            },
            "paragraphs": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2–4 body paragraphs in plain text. Emojis allowed.",
            },
            "sign_off": {
                "type": "string",
                "description": "Warm closing line.",
            },
        },
        "required": ["subject", "heading", "subheading", "paragraphs"],
    },
}

_TONE_MAP = {
    "friendly": "Warm, conversational, encouraging — feel like a message from a friend.",
    "professional": "Formal and businesslike — precise language, no contractions.",
    "urgent": "Urgent and action-oriented — emphasise time-sensitivity and FOMO.",
}


def generate_email_content(
    brief: str,
    tone: str = "friendly",
    include_cta: bool = True,
    cta_text: str = "Learn More",
    image_url: str | None = None,
    cta_url: str | None = None,
) -> dict:
    """
    Returns {"subject": "...", "body": "<full html>..."}.
    Called by the /api/agents/generate-content endpoint.
    """
    if MOCK_MODE:
        return {
            "subject": "[Mock] Re-engage with DesignHive — we miss you!",
            "body": build_text_email_html(
                heading="We Miss You at Design Hive",
                subheading="It's been a while — here's what's new and waiting for you.",
                paragraphs=[
                    "Hello {{name}} 👋 This is a mock-mode preview email. In production, the AI generates compelling copy tailored to your brief.",
                    "You'll see your text placed neatly in this fixed, mobile-responsive template — with no AI-generated design components cluttering the layout.",
                ],
                sign_off="— The Design Hive Team",
                hero_image_url=image_url,
                cta_url=cta_url,
                cta_text=cta_text if include_cta else None,
            ),
        }

    tone_desc = _TONE_MAP.get(tone, _TONE_MAP["friendly"])
    cta_instruction = (
        f'Include a CTA button with text: "{cta_text}". Write your sign_off accordingly.'
        if include_cta
        else "No CTA button — close warmly in your sign_off."
    )

    user_prompt = (
        f"Brief: {brief}\n"
        f"Tone: {tone_desc}\n"
        f"{cta_instruction}\n\n"
        "Write the email text content now. Remember: plain text only — no HTML."
    )

    client = _get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
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

    required = ("subject", "heading", "subheading", "paragraphs")
    for field in required:
        if not result.get(field):
            raise ValueError(f"Content generation missing required field: {field}")
    if not isinstance(result["paragraphs"], list) or not result["paragraphs"]:
        raise ValueError("paragraphs must be a non-empty list")

    body = build_text_email_html(
        heading=result["heading"],
        subheading=result["subheading"],
        paragraphs=result["paragraphs"],
        sign_off=result.get("sign_off", "— The Design Hive Team"),
        hero_image_url=image_url,
        cta_url=cta_url,
        cta_text=cta_text if include_cta else None,
    )

    return {"subject": result["subject"], "body": body}
