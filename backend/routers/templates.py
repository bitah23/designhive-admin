from fastapi import APIRouter, HTTPException, Depends

from database import supabase
from dependencies import get_current_admin
from models.schemas import EmailTemplateCreate, EmailTemplateUpdate

router = APIRouter()


@router.get("/")
def list_templates(admin: str = Depends(get_current_admin)):
    result = supabase.table("email_templates").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/{template_id}")
def get_template(template_id: str, admin: str = Depends(get_current_admin)):
    result = supabase.table("email_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


@router.post("/", status_code=201)
def create_template(template: EmailTemplateCreate, admin: str = Depends(get_current_admin)):
    data = template.model_dump()
    result = supabase.table("email_templates").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create template")
    return result.data[0]


@router.put("/{template_id}")
def update_template(
    template_id: str,
    template: EmailTemplateUpdate,
    admin: str = Depends(get_current_admin),
):
    updates = {k: v for k, v in template.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("email_templates").update(updates).eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


@router.delete("/{template_id}")
def delete_template(template_id: str, admin: str = Depends(get_current_admin)):
    supabase.table("email_templates").delete().eq("id", template_id).execute()
    return {"message": "Template deleted successfully"}
