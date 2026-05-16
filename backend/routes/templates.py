import json
from fastapi import APIRouter, HTTPException, Depends
from config import supabase, TABLE_EMAIL_LOGS
from deps import get_current_admin
from models import TemplateCreate, TemplateUpdate
from services.email import get_default_template_html

router = APIRouter()


@router.get("")
def list_templates(admin=Depends(get_current_admin)):
    result = supabase.table("email_templates").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/default-html")
def default_template_html(admin=Depends(get_current_admin)):
    return {"body": get_default_template_html()}


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
    try:
        supabase.table(TABLE_EMAIL_LOGS).delete().eq("template_id", template_id).execute()
        supabase.table("email_templates").delete().eq("id", template_id).execute()
        return {"message": "Template deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")


@router.post("/{template_id}/approve")
def approve_template(template_id: str, admin=Depends(get_current_admin)):
    result = supabase.table("email_templates").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    template = result.data[0]

    supabase.table("email_templates").update({"status": "approved"}).eq("id", template_id).execute()

    campaign_result = None
    pending = template.get("pending_campaign")
    if pending:
        from agents.chat import chat as agent_chat
        segment_rule = pending.get("segment_rule", "all")
        segment_params = pending.get("segment_params") or {}
        params_str = f" with params {json.dumps(segment_params)}" if segment_params else ""
        msg = (
            f"Admin approved template '{template['title']}' (id: {template_id}). "
            f"Send a campaign now using this template to the '{segment_rule}' segment{params_str}."
        )
        campaign_result = agent_chat(msg)

    return {"approved": True, "template_id": template_id, "campaign": campaign_result}
