from datetime import datetime, timedelta
from typing import Optional, Union, Any
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Lazily-created, cached JWKS client for Kinde RS256 verification (created once, reused)
_kinde_jwks_client: Optional[jwt.PyJWKClient] = None

KINDE_ROLE_ORDER = ["admin", "donor", "ngo", "volunteer"]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "iat": datetime.utcnow()
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None


def verify_kinde_token(token: str) -> Optional[dict]:
    """Verify a Kinde-issued RS256 JWT against the tenant's JWKS.

    Returns the decoded payload dict on success, None when Kinde is disabled
    (KINDE_DOMAIN empty) or when verification fails for any reason.
    """
    global _kinde_jwks_client
    if not settings.KINDE_DOMAIN:
        return None

    try:
        if _kinde_jwks_client is None:
            _kinde_jwks_client = jwt.PyJWKClient(
                f"{settings.KINDE_DOMAIN.rstrip('/')}/.well-known/jwks"
            )
        payload = jwt.decode(
            token,
            key=_kinde_jwks_client.get_signing_key_from_jwt(token),
            algorithms=["RS256"],
            audience=settings.KINDE_AUDIENCE or None,
            issuer=settings.KINDE_DOMAIN or None,
            options={
                "verify_aud": bool(settings.KINDE_AUDIENCE),
                "verify_iss": bool(settings.KINDE_DOMAIN),
            },
        )
        return payload
    except jwt.PyJWTError:
        return None


def derive_role_from_kinde_payload(payload: dict) -> str:
    """Derive the app role from a Kinde token payload.

    First match of ["admin", "donor", "ngo", "volunteer"] in the
    `permissions` array (case-insensitive), else the `role` claim,
    else "donor".
    """
    permissions = payload.get("permissions", []) or []
    permission_set = {str(p).lower() for p in permissions if isinstance(p, str)}
    for role in KINDE_ROLE_ORDER:
        if role in permission_set:
            return role
    role_claim = payload.get("role")
    if isinstance(role_claim, str) and role_claim:
        return role_claim
    return "donor"
