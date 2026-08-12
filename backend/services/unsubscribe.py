from jose import JWTError, jwt

from config import JWT_ALGORITHM, JWT_SECRET

_SCOPE = "unsubscribe"


def make_unsubscribe_token(email: str) -> str:
    """Signed, non-expiring token identifying a recipient for the public unsubscribe/resubscribe links."""
    return jwt.encode({"email": email, "scope": _SCOPE}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_unsubscribe_token(token: str) -> str | None:
    """Return the email a token was issued for, or None if it is missing, malformed, or not an unsubscribe token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("scope") != _SCOPE:
        return None
    return payload.get("email")
