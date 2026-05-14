from fastapi import APIRouter, Depends
from config import supabase, TABLE_PROFILES
from deps import get_current_admin

router = APIRouter()


@router.get("")
def list_users(admin=Depends(get_current_admin)):
    result = supabase.table(TABLE_PROFILES).select("*").order("created_at", desc=True).execute()
    return result.data
