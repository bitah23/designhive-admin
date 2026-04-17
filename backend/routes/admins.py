from fastapi import APIRouter, HTTPException, Depends
from passlib.context import CryptContext
from config import supabase
from deps import get_current_admin
from models import AdminCreate

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("")
def list_admins(admin=Depends(get_current_admin)):
    result = supabase.table("admins").select("id, email, name, is_active, created_at").order("created_at").execute()
    return result.data


@router.post("")
def create_admin(body: AdminCreate, admin=Depends(get_current_admin)):
    existing = supabase.table("admins").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="An admin with this email already exists")

    new_admin = supabase.table("admins").insert({
        "email": body.email,
        "name": body.name,
        "password_hash": pwd.hash(body.password),
        "is_active": True,
    }).execute()
    return new_admin.data[0]


@router.patch("/{admin_id}/toggle")
def toggle_admin(admin_id: str, admin=Depends(get_current_admin)):
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    current = supabase.table("admins").select("is_active").eq("id", admin_id).single().execute().data
    if not current:
        raise HTTPException(status_code=404, detail="Admin not found")

    updated = supabase.table("admins").update({"is_active": not current["is_active"]}).eq("id", admin_id).execute()
    return updated.data[0]


@router.delete("/{admin_id}")
def delete_admin(admin_id: str, admin=Depends(get_current_admin)):
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    supabase.table("admins").delete().eq("id", admin_id).execute()
    return {"message": "Admin deleted"}
