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
