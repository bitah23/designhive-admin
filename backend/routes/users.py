from fastapi import APIRouter, Depends
from config import supabase
from deps import get_current_admin

router = APIRouter()


@router.get("")
def list_users(admin=Depends(get_current_admin)):
    result = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
    return result.data
