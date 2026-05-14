from fastapi import APIRouter, Depends, HTTPException

from deps import get_current_admin
from models import SegmentRequest
from agents.segmentation import segment_users

router = APIRouter()


@router.post("/segment")
def segment(body: SegmentRequest, admin=Depends(get_current_admin)):
    try:
        params = body.params.model_dump(exclude_none=True) if body.params else {}
        users = segment_users(body.rule, params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "rule": body.rule,
        "count": len(users),
        "users": None if body.preview_only else users,
    }
