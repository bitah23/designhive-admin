from fastapi import APIRouter, Depends
from config import supabase
from deps import get_current_admin

router = APIRouter()


@router.get("")
def list_logs(admin=Depends(get_current_admin)):
    result = (
        supabase.table("email_logs")
        .select("*, email_templates(title)")
        .order("timestamp", desc=True)
        .execute()
    )
    return result.data
