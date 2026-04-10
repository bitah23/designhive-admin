from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, status, Depends
from jose import jwt

from config import settings
from dependencies import get_current_admin
from models.schemas import AdminLogin, Token

router = APIRouter()


def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/login", response_model=Token)
def login(data: AdminLogin):
    if data.email != settings.ADMIN_EMAIL or data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(data.email)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def get_me(admin_email: str = Depends(get_current_admin)):
    return {"email": admin_email}
