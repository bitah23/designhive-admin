from typing import Optional

from fastapi import APIRouter, Depends, Query

from database import supabase
from dependencies import get_current_admin

router = APIRouter()


@router.get("/")
def get_logs(
    admin: str = Depends(get_current_admin),
    status: Optional[str] = Query(None, description="Filter by status: sent | failed"),
    search: Optional[str] = Query(None, description="Search by user email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = (
        supabase.table("email_logs")
        .select("*, email_templates(title)")
        .order("timestamp", desc=True)
    )

    if status in ("sent", "failed"):
        query = query.eq("status", status)
    if search:
        query = query.ilike("user_email", f"%{search}%")

    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {"data": result.data or [], "count": len(result.data or [])}


@router.get("/recent")
def get_recent_logs(
    admin: str = Depends(get_current_admin),
    limit: int = Query(10, ge=1, le=50),
):
    result = (
        supabase.table("email_logs")
        .select("*, email_templates(title)")
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []
