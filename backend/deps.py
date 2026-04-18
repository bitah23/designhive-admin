from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from config import JWT_SECRET, JWT_ALGORITHM

bearer = HTTPBearer()

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    # Allow mock tokens only if MOCK_MODE is enabled in .env
    if os.getenv("MOCK_MODE") == "true" and credentials.credentials.startswith("mock."):
        return {"id": "admin-1", "email": "admin@designhive.local", "role": "admin"}
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")




