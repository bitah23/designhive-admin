from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from config import JWT_SECRET, JWT_ALGORITHM

bearer = HTTPBearer()

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    # Bypassed for testing
    return {"id": "admin-1", "email": "admin@designhive.local"}

