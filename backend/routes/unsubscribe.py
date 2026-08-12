import html
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from config import TABLE_PROFILES, supabase
from services.unsubscribe import verify_unsubscribe_token

router = APIRouter()


def _page(title: str, message: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  body {{ margin:0; padding:0; background:#07090f; font-family:'DM Sans',system-ui,-apple-system,sans-serif;
         display:flex; align-items:center; justify-content:center; min-height:100vh; }}
  .card {{ max-width:420px; margin:24px; padding:40px 36px; text-align:center; border-radius:16px;
           background:linear-gradient(160deg,#131b2e 0%,#0f1520 100%); border:1px solid rgba(255,255,255,0.06); }}
  h1 {{ color:#fff; font-size:22px; margin:0 0 12px; }}
  p {{ color:rgba(255,255,255,0.55); font-size:15px; line-height:1.6; margin:0; }}
</style></head>
<body><div class="card"><h1>{title}</h1><p>{message}</p></div></body></html>"""


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = ""):
    email = verify_unsubscribe_token(token)
    if not email:
        return _page("Link not valid", "This unsubscribe link is invalid or has expired.")

    supabase.table(TABLE_PROFILES).update({
        "unsubscribed": True,
        "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("email", email).execute()

    return _page(
        "You're unsubscribed",
        f"{html.escape(email)} will no longer receive marketing emails from Design Hive. "
        f'Changed your mind? <a href="/api/resubscribe?token={html.escape(token)}" style="color:#ff9f1c">Resubscribe</a>.',
    )


@router.get("/resubscribe", response_class=HTMLResponse)
def resubscribe(token: str = ""):
    email = verify_unsubscribe_token(token)
    if not email:
        return _page("Link not valid", "This link is invalid or has expired.")

    supabase.table(TABLE_PROFILES).update({
        "unsubscribed": False,
        "unsubscribed_at": None,
    }).eq("email", email).execute()

    return _page("You're resubscribed", f"{html.escape(email)} will receive marketing emails from Design Hive again.")
