import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends
from jose import jwt
from passlib.context import CryptContext

from config import supabase, JWT_SECRET, JWT_ALGORITHM, GMAIL_SENDER_EMAIL, MOCK_MODE
from deps import get_current_admin
from models import LoginRequest, ResetPasswordRequest
from services.email import send_direct_email

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory OTP store: { admin_id: (otp, expires_at) }
_otp_store: dict = {}


@router.post("/login")
def login(body: LoginRequest):
    if MOCK_MODE:
        # Simple mock login for local testing
        return {
            "token": jwt.encode(
                {"id": "admin-1", "email": body.email, "exp": datetime.utcnow() + timedelta(days=7)},
                JWT_SECRET,
                algorithm=JWT_ALGORITHM,
            )
        }

    result = supabase.table("admins").select("*").eq("email", body.email).limit(1).execute()
    admin = result.data[0] if result.data else None
    if not admin or not pwd.verify(body.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if admin.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = jwt.encode(
        {"id": admin["id"], "email": admin["email"], "exp": datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    return {"token": token}


@router.post("/reset-request")
def reset_request(admin: dict = Depends(get_current_admin)):
    otp = "".join(random.choices(string.digits, k=6))
    _otp_store[admin["id"]] = (otp, datetime.utcnow() + timedelta(minutes=10))

    send_direct_email(
        to=admin["email"],
        subject="Your Password Reset Code",
        html_body=f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#333">
          <h2 style="color:#FACC15">DesignHive Admin</h2>
          <p>Your password reset code is:</p>
          <h1 style="letter-spacing:8px;color:#111">{otp}</h1>
          <p style="color:#888">This code expires in 10 minutes.</p>
        </div>
        """,
    )
    return {"message": "Reset code sent to your email"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, admin: dict = Depends(get_current_admin)):
    entry = _otp_store.get(admin["id"])
    if not entry:
        raise HTTPException(status_code=400, detail="No reset code requested")
    otp, expires_at = entry
    if datetime.utcnow() > expires_at:
        del _otp_store[admin["id"]]
        raise HTTPException(status_code=400, detail="Reset code has expired")
    if body.otp != otp:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    new_hash = pwd.hash(body.new_password)
    supabase.table("admins").update({"password_hash": new_hash}).eq("id", admin["id"]).execute()
    del _otp_store[admin["id"]]
    return {"message": "Password updated successfully"}
