import os
import mimetypes

from fastapi import APIRouter, Depends, HTTPException, Request

from config import supabase
from deps import get_current_admin
from models import CtaLinkCreate

_BUCKET = "template-images"
_ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
_ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
_ALLOWED_EXTENSIONS = _ALLOWED_IMAGE_EXTENSIONS | _ALLOWED_VIDEO_EXTENSIONS

router = APIRouter()


# ── Images & Videos ─────────────────────────────────────────────────────────

@router.get("/images")
def list_images(admin=Depends(get_current_admin)):
    result = supabase.table("template_images").select("name,url").order("created_at").execute()
    return result.data


@router.post("/images")
async def upload_image(request: Request, admin=Depends(get_current_admin)):
    filename = request.headers.get("x-filename", "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="X-Filename header is required.")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Accepted: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty file.")

    content_type = request.headers.get("content-type", "") or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    try:
        supabase.storage.from_(_BUCKET).upload(
            path=filename,
            file=body,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    public_url = supabase.storage.from_(_BUCKET).get_public_url(filename)

    result = supabase.table("template_images").upsert(
        {"name": filename, "url": public_url},
        on_conflict="name",
    ).execute()

    row = result.data[0] if result.data else {"name": filename, "url": public_url}
    return {"name": row["name"], "url": row["url"]}


# ── CTA Links ─────────────────────────────────────────────────────────────────

@router.get("/cta-links")
def list_cta_links(admin=Depends(get_current_admin)):
    result = supabase.table("cta_links").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("/cta-links")
def create_cta_link(body: CtaLinkCreate, admin=Depends(get_current_admin)):
    label = body.label.strip()
    url = body.url.strip()
    if not label or not url:
        raise HTTPException(status_code=400, detail="label and url are required")
    result = supabase.table("cta_links").insert({"label": label, "url": url}).execute()
    return result.data[0]


@router.delete("/cta-links/{link_id}")
def delete_cta_link(link_id: str, admin=Depends(get_current_admin)):
    supabase.table("cta_links").delete().eq("id", link_id).execute()
    return {"message": "Deleted"}
