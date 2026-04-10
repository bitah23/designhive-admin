from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class AdminLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Email Templates ───────────────────────────────────────────────────────────

class EmailTemplateCreate(BaseModel):
    title: str
    subject: str
    body: str
    variables: Optional[List[str]] = ["name", "email", "date"]


class EmailTemplateUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None


# ── Email Sending ─────────────────────────────────────────────────────────────

class SendEmailRequest(BaseModel):
    template_id: str
    recipient_type: str  # "all" | "specific"
    recipient_emails: Optional[List[str]] = None  # used when recipient_type == "specific"


class SendWelcomeEmailRequest(BaseModel):
    user_email: str
    user_name: str


# ── Dashboard Stats ───────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_users: int
    total_emails_sent: int
    total_failed: int
    total_templates: int
