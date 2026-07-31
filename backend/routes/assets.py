import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request

from config import supabase
from deps import get_current_admin
from models import CtaLinkCreate

_BUCKET = "template-images"

_MB = 1024 * 1024

# Hero images are rendered at 600px wide in an inbox — a few hundred KB is
# plenty, and 10 MB leaves room for an un-optimised export. Video gets more
# headroom but still needs a ceiling, because the request body is held in
# memory while it is forwarded to storage.
MAX_IMAGE_BYTES = 10 * _MB
MAX_VIDEO_BYTES = 50 * _MB

# Content type is derived from the extension rather than trusted from the
# client, so an upload cannot be stored as text/html and served as a page from
# the public bucket URL.
# SVG is deliberately absent: Gmail, Outlook, and Apple Mail all refuse to
# render it, so an SVG hero reaches the inbox as a broken image. The bundled
# hero art under frontend/assets/images/email/ ships as PNG for the same reason.
_IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}
_VIDEO_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
}
_CONTENT_TYPES = {**_IMAGE_TYPES, **_VIDEO_TYPES}

_UNSAFE_NAME_CHARS = re.compile(r"[^A-Za-z0-9._-]+")

router = APIRouter()


def _human_size(num_bytes: int) -> str:
    if num_bytes >= _MB:
        return f"{num_bytes / _MB:.1f} MB"
    return f"{max(num_bytes / 1024, 0.1):.1f} KB"


def _safe_object_name(filename: str) -> str:
    """Reduce a client-supplied filename to a storage key that cannot escape the bucket."""
    base = os.path.basename(filename.replace("\\", "/"))
    stem, ext = os.path.splitext(base)
    stem = _UNSAFE_NAME_CHARS.sub("-", stem).strip("-.")
    return f"{stem[:80] or 'upload'}{ext.lower()}"


def _unique_object_name(name: str) -> str:
    """
    Return a name no existing asset is using.

    Uploads used to upsert on the filename, so re-uploading `hero.png` silently
    replaced the asset every template already referencing that name pointed at.
    A new upload is now always a new asset.
    """
    result = supabase.table("template_images").select("name").execute()
    taken = {row["name"] for row in (result.data or [])}
    if name not in taken:
        return name

    stem, ext = os.path.splitext(name)
    counter = 2
    while f"{stem}-{counter}{ext}" in taken:
        counter += 1
    return f"{stem}-{counter}{ext}"


async def _read_body_within(request: Request, limit: int, label: str) -> bytes:
    """
    Buffer the request body, aborting as soon as it exceeds `limit`.

    Reading the stream rather than `await request.body()` means an oversized
    upload is rejected part-way instead of being held in memory in full first.
    """
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"{label} is {_human_size(int(declared))}. The limit is {_human_size(limit)}.",
        )

    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > limit:
            raise HTTPException(
                status_code=413,
                detail=f"{label} exceeds the {_human_size(limit)} limit.",
            )
        chunks.append(chunk)

    return b"".join(chunks)


def _public_url_warning(url: str) -> str | None:
    """
    Confirm the stored asset is actually reachable without credentials.

    A mail client fetches these URLs anonymously, so a private bucket produces a
    broken image in every inbox with nothing to see from the admin side. Checking
    once at upload turns that into a message the admin gets immediately.

    Best-effort: a network problem here must never fail an otherwise good upload.
    """
    try:
        import httpx

        response = httpx.get(url, timeout=5.0, follow_redirects=True)
    except Exception:
        return None

    if response.status_code in (401, 403) or response.status_code == 400:
        return (
            "Uploaded, but the file is not publicly readable, so it will show as a "
            f"broken image in email (storage returned {response.status_code}). "
            f"Make the '{_BUCKET}' bucket public in Supabase."
        )
    if response.status_code == 404:
        return (
            "Uploaded, but the public URL returns 404, so email clients cannot load it. "
            f"Check that the '{_BUCKET}' bucket is public."
        )
    if not response.headers.get("content-type", "").startswith(("image/", "video/")):
        return (
            "Uploaded, but the public URL does not serve image or video content "
            f"(got '{response.headers.get('content-type', 'unknown')}'), so it will not "
            "render in email."
        )
    return None


# ── Images & Videos ─────────────────────────────────────────────────────────

@router.get("/limits")
def upload_limits(admin=Depends(get_current_admin)):
    """Single source of truth for the upload rules the frontend validates against."""
    return {
        "image": {
            "max_bytes": MAX_IMAGE_BYTES,
            "max_label": _human_size(MAX_IMAGE_BYTES),
            "extensions": sorted(_IMAGE_TYPES),
        },
        "video": {
            "max_bytes": MAX_VIDEO_BYTES,
            "max_label": _human_size(MAX_VIDEO_BYTES),
            "extensions": sorted(_VIDEO_TYPES),
        },
    }


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
    if ext not in _CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Accepted: {', '.join(sorted(_CONTENT_TYPES))}",
        )

    is_video = ext in _VIDEO_TYPES
    limit = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    body = await _read_body_within(request, limit, "Video" if is_video else "Image")
    if not body:
        raise HTTPException(status_code=400, detail="Empty file.")

    object_name = _unique_object_name(_safe_object_name(filename))

    try:
        supabase.storage.from_(_BUCKET).upload(
            path=object_name,
            file=body,
            file_options={"content-type": _CONTENT_TYPES[ext], "upsert": "false"},
        )
    except Exception as e:
        # Storage enforces its own per-bucket ceiling, which can be lower than
        # ours. Say so plainly instead of surfacing a raw driver error.
        message = str(e)
        if "exceeded the maximum allowed size" in message.lower() or "payload too large" in message.lower():
            raise HTTPException(
                status_code=413,
                detail=(
                    f"Storage rejected this {_human_size(len(body))} file as too large. "
                    "Raise the bucket's file size limit in Supabase, or upload a smaller file."
                ),
            )
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    public_url = supabase.storage.from_(_BUCKET).get_public_url(object_name)

    result = supabase.table("template_images").upsert(
        {"name": object_name, "url": public_url},
        on_conflict="name",
    ).execute()

    row = result.data[0] if result.data else {"name": object_name, "url": public_url}
    return {
        "name": row["name"],
        "url": row["url"],
        "size_bytes": len(body),
        "warning": _public_url_warning(row["url"]),
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
