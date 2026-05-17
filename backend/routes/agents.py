from fastapi import APIRouter, Depends, Header, HTTPException, Query

from config import WEBHOOK_SECRET
from deps import get_current_admin
from models import (
    ChatRequest,
    ContentGenRequest,
    CreateDripSequenceRequest,
    EnrollUserRequest,
    FailureRecoveryConfigUpdate,
    ReengagementConfigUpdate,
    ReporterConfigUpdate,
    ScheduleCampaignRequest,
    SegmentRequest,
    UpdateDripSequenceRequest,
    WebhookPayload,
    WelcomeConfigUpdate,
)
from agents.segmentation import segment_users
from agents.content_gen import generate_email_content
from agents.reporter import (
    get_campaign_history,
    get_config as get_reporter_config,
    update_config as update_reporter_config,
)
from agents.chat import chat as agent_chat
from agents.scheduler import (
    create_scheduled_campaign,
    list_scheduled_campaigns,
    cancel_scheduled_campaign,
)
from agents.drip import (
    create_drip_sequence,
    list_drip_sequences,
    update_drip_sequence,
    delete_drip_sequence,
    enroll_user,
    list_enrollments,
    cancel_enrollment,
)
from agents.welcome_sequence import (
    enroll_new_user,
    get_config as get_welcome_config,
    update_config as update_welcome_config,
)
from agents.reengagement import (
    run as run_reengagement,
    get_config as get_reengagement_config,
    update_config as update_reengagement_config,
)
from agents.failure_recovery import (
    run as run_failure_recovery,
    get_config as get_failure_recovery_config,
    update_config as update_failure_recovery_config,
)

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


@router.post("/generate-content")
def generate_content(body: ContentGenRequest, admin=Depends(get_current_admin)):
    try:
        result = generate_email_content(
            brief=body.brief,
            tone=body.tone,
            include_cta=body.include_cta,
            cta_text=body.cta_text or "Learn More",
            image_url=body.image_url or None,
            cta_url=body.cta_url or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
    return result


@router.post("/schedule")
def schedule_campaign(body: ScheduleCampaignRequest, admin=Depends(get_current_admin)):
    try:
        job = create_scheduled_campaign(
            template_id=body.template_id,
            segment_rule=body.segment_rule,
            segment_params=body.segment_params or {},
            send_at=body.send_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return job


@router.get("/schedule")
def get_schedule(admin=Depends(get_current_admin)):
    return list_scheduled_campaigns()


@router.delete("/schedule/{job_id}")
def cancel_campaign(job_id: str, admin=Depends(get_current_admin)):
    try:
        return cancel_scheduled_campaign(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------------------------
# Campaign Reporter
# ---------------------------------------------------------------------------

@router.get("/report")
def campaign_report(
    limit: int = Query(default=20, ge=1, le=100),
    admin=Depends(get_current_admin),
):
    return get_campaign_history(limit=limit)


@router.get("/reporter/config")
def reporter_config(admin=Depends(get_current_admin)):
    return get_reporter_config()


@router.patch("/reporter/config")
def update_reporter_config_route(body: ReporterConfigUpdate, admin=Depends(get_current_admin)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return update_reporter_config(updates)


# ---------------------------------------------------------------------------
# Chat Interface (Agent 9)
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat(body: ChatRequest, admin=Depends(get_current_admin)):
    import asyncio
    import logging
    import traceback
    _log = logging.getLogger("routes")
    try:
        result = await asyncio.to_thread(agent_chat, body.message)
        return result
    except Exception as e:
        _log.error("Chat route error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chat agent error: {str(e)}")


# ---------------------------------------------------------------------------
# Drip Sequences
# ---------------------------------------------------------------------------

@router.post("/drip/sequences")
def create_sequence(body: CreateDripSequenceRequest, admin=Depends(get_current_admin)):
    try:
        return create_drip_sequence(
            name=body.name,
            steps=[s.model_dump() for s in body.steps],
            is_active=body.is_active,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/drip/sequences")
def get_sequences(admin=Depends(get_current_admin)):
    return list_drip_sequences()


@router.patch("/drip/sequences/{seq_id}")
def patch_sequence(seq_id: str, body: UpdateDripSequenceRequest, admin=Depends(get_current_admin)):
    updates = body.model_dump(exclude_none=True)
    if "steps" in updates:
        updates["steps"] = [s if isinstance(s, dict) else s.model_dump() for s in body.steps]
    try:
        return update_drip_sequence(seq_id, updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/drip/sequences/{seq_id}")
def remove_sequence(seq_id: str, admin=Depends(get_current_admin)):
    try:
        return delete_drip_sequence(seq_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Drip Enrollments
# ---------------------------------------------------------------------------

@router.post("/drip/enroll")
def enroll(body: EnrollUserRequest, admin=Depends(get_current_admin)):
    try:
        return enroll_user(sequence_id=body.sequence_id, user_id=body.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/drip/enrollments")
def get_enrollments(
    sequence_id: str = Query(default=None),
    admin=Depends(get_current_admin),
):
    return list_enrollments(sequence_id=sequence_id)


@router.delete("/drip/enrollments/{enrollment_id}")
def cancel_drip_enrollment(enrollment_id: str, admin=Depends(get_current_admin)):
    try:
        return cancel_enrollment(enrollment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------------------------
# Welcome Sequence
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Failure Recovery
# ---------------------------------------------------------------------------

@router.post("/failure-recovery/run")
def trigger_failure_recovery(admin=Depends(get_current_admin)):
    try:
        return run_failure_recovery()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/failure-recovery/config")
def failure_recovery_config(admin=Depends(get_current_admin)):
    return get_failure_recovery_config()


@router.patch("/failure-recovery/config")
def patch_failure_recovery_config(body: FailureRecoveryConfigUpdate, admin=Depends(get_current_admin)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        return update_failure_recovery_config(updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Re-engagement
# ---------------------------------------------------------------------------

@router.post("/reengagement/run")
def trigger_reengagement(admin=Depends(get_current_admin)):
    try:
        return run_reengagement()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/reengagement/config")
def reengagement_config(admin=Depends(get_current_admin)):
    return get_reengagement_config()


@router.patch("/reengagement/config")
def patch_reengagement_config(body: ReengagementConfigUpdate, admin=Depends(get_current_admin)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        return update_reengagement_config(updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Welcome Sequence
# ---------------------------------------------------------------------------

@router.get("/welcome/config")
def welcome_config(admin=Depends(get_current_admin)):
    return get_welcome_config()


@router.patch("/welcome/config")
def patch_welcome_config(body: WelcomeConfigUpdate, admin=Depends(get_current_admin)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return update_welcome_config(updates)


@router.post("/welcome-enroll")
def welcome_enroll(
    body: WebhookPayload,
    x_webhook_secret: str = Header(None),
):
    """
    Called by the Supabase DB trigger on new profile inserts.
    Enrolls the new user in the Welcome drip sequence.
    Uses the same webhook secret as /api/webhooks/welcome so the same
    Supabase trigger config can point here instead.
    """
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = body.record.id
    if not user_id:
        return {"enrolled": False, "reason": "No user ID in payload"}

    return enroll_new_user(user_id)
