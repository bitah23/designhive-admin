import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from config import supabase, ADMIN_BASE_URL
from deps import get_current_admin
from models import CtaLinkCreate

router = APIRouter()

_EMAIL_IMAGES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "assets", "images", "email")
)
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}


# ── Images ────────────────────────────────────────────────────────────────────

@router.get("/images")
def list_images(admin=Depends(get_current_admin)):
    images = []
    for fname in sorted(os.listdir(_EMAIL_IMAGES_DIR)):
        if os.path.splitext(fname)[1].lower() in _ALLOWED_EXTENSIONS:
            images.append({
                "name": fname,
                "url": f"{ADMIN_BASE_URL}/assets/images/email/{fname}",
            })
    return images


@router.post("/images")
async def upload_image(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Accepted: {', '.join(_ALLOWED_EXTENSIONS)}",
        )
    dest = os.path.join(_EMAIL_IMAGES_DIR, file.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {
        "name": file.filename,
        "url": f"{ADMIN_BASE_URL}/assets/images/email/{file.filename}",
    }


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
