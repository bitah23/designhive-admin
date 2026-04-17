from fastapi import APIRouter, HTTPException, Depends
from config import supabase
from deps import get_current_admin
from models import TemplateCreate, TemplateUpdate

router = APIRouter()


@router.get("")
def list_templates(admin=Depends(get_current_admin)):
    result = supabase.table("email_templates").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("")
def create_template(body: TemplateCreate, admin=Depends(get_current_admin)):
    result = supabase.table("email_templates").insert(body.model_dump()).execute()
    return result.data[0]


@router.put("/{template_id}")
def update_template(template_id: str, body: TemplateUpdate, admin=Depends(get_current_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("email_templates").update(updates).eq("id", template_id).execute()
    return result.data[0]


@router.delete("/{template_id}")
def delete_template(template_id: str, admin=Depends(get_current_admin)):
    supabase.table("email_templates").delete().eq("id", template_id).execute()
    return {"message": "Template deleted"}
