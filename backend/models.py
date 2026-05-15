from pydantic import BaseModel
from typing import Optional, List


# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class ResetPasswordRequest(BaseModel):
    otp: str
    new_password: str


# Templates
class TemplateCreate(BaseModel):
    title: str
    subject: str
    body: str

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


# Email
class SendBulkRequest(BaseModel):
    template_id: str
    user_ids: List[str]

class Attachment(BaseModel):
    name: str
    mime_type: str
    data: str  # base64 string

class SendDirectRequest(BaseModel):
    to: str
    subject: str
    body: str
    attachments: Optional[List[Attachment]] = []


# Campaign Scheduler
class ScheduleCampaignRequest(BaseModel):
    template_id: str
    segment_rule: str = "all"
    segment_params: Optional[dict] = None
    send_at: str  # ISO datetime string


# Content Generation
class ContentGenRequest(BaseModel):
    brief: str
    tone: str = "friendly"          # friendly | professional | urgent
    include_cta: bool = True
    cta_text: Optional[str] = "Learn More"


# Drip Sequences
class DripStep(BaseModel):
    template_id: str
    delay_days: int = 0

class CreateDripSequenceRequest(BaseModel):
    name: str
    steps: List[DripStep]
    is_active: bool = True

class UpdateDripSequenceRequest(BaseModel):
    name: Optional[str] = None
    steps: Optional[List[DripStep]] = None
    is_active: Optional[bool] = None

class EnrollUserRequest(BaseModel):
    sequence_id: str
    user_id: str


# Segmentation
class SegmentParams(BaseModel):
    days: Optional[int] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None

class SegmentRequest(BaseModel):
    rule: str
    params: Optional[SegmentParams] = None
    preview_only: bool = False


# Admins
class AdminCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


# Webhook (Supabase DB trigger payload)
class WebhookRecord(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

class WebhookPayload(BaseModel):
    type: str
    table: str
    record: WebhookRecord


# Agent Configs
class WelcomeConfigUpdate(BaseModel):
    enabled:     Optional[bool] = None
    sequence_id: Optional[str]  = None

class ReengagementConfigUpdate(BaseModel):
    threshold_days:   Optional[int] = None
    mode:             Optional[str] = None  # "single" | "drip"
    template_id:      Optional[str] = None
    drip_sequence_id: Optional[str] = None
    run_hour_utc:     Optional[int] = None


# Chat Interface (Agent 9)
class ChatRequest(BaseModel):
    message: str


# Failure Recovery Config (Agent 7)
class FailureRecoveryConfigUpdate(BaseModel):
    retry1_minutes: Optional[int] = None
    retry2_minutes: Optional[int] = None
    retry3_minutes: Optional[int] = None
    max_retries:    Optional[int] = None


# Campaign Reporter Config (Agent 8)
class ReporterConfigUpdate(BaseModel):
    email_admin: Optional[bool] = None
    admin_email: Optional[str]  = None
