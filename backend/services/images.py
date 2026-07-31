"""
Normalise uploaded artwork into something every email client can render.

Admins upload whatever their camera or design tool produced — a 4000px HEIC off
an iPhone, a WebP export, a 12 MB PNG. Mail clients are far pickier than
browsers: only JPEG, PNG, and GIF are universally supported, EXIF orientation is
ignored so phone photos arrive sideways, and a multi-megabyte hero makes the
message slow to open on mobile.

So the upload route accepts a wide set of inputs and converts each one here into
an email-safe file at a sensible size, instead of rejecting the admin's file and
making them go find a converter.
"""

import io
import logging

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# HEIC/HEIF is what an iPhone produces by default. The plugin ships as a wheel;
# if it is somehow unavailable, those uploads are simply rejected upstream
# rather than taking the whole module down.
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
    HEIF_SUPPORTED = True
except Exception:  # pragma: no cover - depends on the installed wheel
    HEIF_SUPPORTED = False
    logger.warning("pillow-heif unavailable — HEIC/HEIF uploads will be rejected")

# Formats mail clients render everywhere. Anything else gets converted.
EMAIL_SAFE_FORMATS = {"JPEG", "PNG", "GIF"}

# The email body is a 600px column; 2x covers retina without shipping a file
# that is mostly wasted pixels.
MAX_WIDTH = 1200
MAX_HEIGHT = 1600

JPEG_QUALITY = 85

# Extension -> the Pillow format it decodes to. Everything here is accepted for
# upload; the value only matters for choosing the output format.
INPUT_FORMATS = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".jfif": "JPEG",
    ".png": "PNG",
    ".gif": "GIF",
    ".webp": "WEBP",
    ".avif": "AVIF",
    ".bmp": "BMP",
    ".tif": "TIFF",
    ".tiff": "TIFF",
    ".heic": "HEIF",
    ".heif": "HEIF",
}

OUTPUT_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
}


class ImageRejected(Exception):
    """The upload is not a readable image."""


def _has_alpha(image: Image.Image) -> bool:
    return image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info


def _is_animated(image: Image.Image) -> bool:
    return getattr(image, "n_frames", 1) > 1


def normalise_email_image(data: bytes, extension: str) -> tuple[bytes, str, dict]:
    """
    Convert an uploaded image into an email-safe file.

    Returns `(bytes, extension, info)` where `extension` is one of .jpg/.png/.gif
    and `info` describes what changed, so the UI can tell the admin.
    """
    extension = extension.lower()

    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception as e:
        raise ImageRejected(
            "That file could not be read as an image. It may be corrupt, or the "
            "extension may not match the actual contents."
        ) from e

    source_format = image.format or INPUT_FORMATS.get(extension, "")
    original = {"width": image.width, "height": image.height,
                "format": source_format, "bytes": len(data)}

    # Animated GIFs are passed through untouched. Re-encoding them frame by frame
    # degrades quality and drops timing, and GIF already renders everywhere.
    if source_format == "GIF" and _is_animated(image):
        return data, ".gif", {
            "original": original,
            "converted": False,
            "resized": False,
            "note": "animated GIF kept as-is",
        }

    # Phone cameras record orientation in EXIF rather than rotating the pixels.
    # Mail clients ignore that tag, so bake it in or photos arrive sideways.
    image = ImageOps.exif_transpose(image)

    resized = False
    if image.width > MAX_WIDTH or image.height > MAX_HEIGHT:
        image.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)
        resized = True

    keeps_alpha = _has_alpha(image)

    # Formats email already supports are preserved; the rest become PNG when
    # they carry transparency and JPEG otherwise.
    if source_format in EMAIL_SAFE_FORMATS:
        target = "PNG" if source_format == "PNG" else ("GIF" if source_format == "GIF" else "JPEG")
    else:
        target = "PNG" if keeps_alpha else "JPEG"

    buffer = io.BytesIO()
    if target == "JPEG":
        if image.mode != "RGB":
            # JPEG has no alpha channel — composite onto white so transparent
            # areas do not come out black.
            if keeps_alpha:
                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image.convert("RGBA"), mask=image.convert("RGBA").split()[-1])
                image = background
            else:
                image = image.convert("RGB")
        image.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        out_ext = ".jpg"
    elif target == "PNG":
        if image.mode not in ("RGB", "RGBA", "P", "L"):
            image = image.convert("RGBA" if keeps_alpha else "RGB")
        image.save(buffer, "PNG", optimize=True)
        out_ext = ".png"
    else:
        image.save(buffer, "GIF")
        out_ext = ".gif"

    output = buffer.getvalue()

    # Converting a small, already-optimised JPEG can make it marginally bigger.
    # Keep the original in that case, as long as it needed no other work.
    if (not resized and source_format in EMAIL_SAFE_FORMATS
            and len(output) >= len(data) and INPUT_FORMATS.get(extension) == source_format):
        return data, extension if extension != ".jpeg" else ".jpg", {
            "original": original,
            "converted": False,
            "resized": False,
        }

    return output, out_ext, {
        "original": original,
        "converted": source_format not in EMAIL_SAFE_FORMATS or out_ext != extension,
        "resized": resized,
        "width": image.width,
        "height": image.height,
        "bytes": len(output),
        "format": target,
    }


def describe_normalisation(info: dict) -> str | None:
    """A short, human sentence about what happened, or None if nothing did."""
    original = info.get("original", {})
    parts = []

    if info.get("converted") and original.get("format"):
        parts.append(f"converted from {original['format']} to {info.get('format', 'JPEG')}")
    if info.get("resized"):
        parts.append(
            f"resized from {original.get('width')}×{original.get('height')} "
            f"to {info.get('width')}×{info.get('height')}"
        )
    if not parts:
        return None

    saved = original.get("bytes", 0) - info.get("bytes", 0)
    suffix = ""
    if saved > 50 * 1024:
        suffix = f", {saved / (1024 * 1024):.1f} MB smaller" if saved >= 1024 * 1024 \
            else f", {saved / 1024:.0f} KB smaller"
    return f"{' and '.join(parts)} for email{suffix}"
