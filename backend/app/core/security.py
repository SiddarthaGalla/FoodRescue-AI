from datetime import datetime, timedelta
from typing import Optional, Union, Any
import jwt
import bcrypt
from app.core.config import settings

# Lazily-created JWKS clients
_kinde_jwks_client: Optional[jwt.PyJWKClient] = None
_clerk_jwks_client: Optional[jwt.PyJWKClient] = None
_supabase_jwks_client: Optional[jwt.PyJWKClient] = None
_supabase_jwks_client: Optional[jwt.PyJWKClient] = None

KINDE_ROLE_ORDER = ["admin", "donor", "ngo", "volunteer"]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    if hashed_password.startswith("$sha256$"):
        import hashlib
        return f"$sha256${hashlib.sha256(plain_password.encode()).hexdigest()}" == hashed_password
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
        import hashlib
        return f"$sha256${hashlib.sha256(plain_password.encode()).hexdigest()}" == hashed_password
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    try:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8')[:72], salt).decode('utf-8')
    except Exception:
        import hashlib
        return f"$sha256${hashlib.sha256(password.encode()).hexdigest()}"

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


def verify_clerk_token(token: str) -> Optional[dict]:
    if not getattr(settings, 'CLERK_DOMAIN', None):
        return None
    global _clerk_jwks_client
    try:
        if _clerk_jwks_client is None:
            jwks_url = getattr(settings, 'CLERK_JWKS_URL', None) or f"{settings.CLERK_DOMAIN.rstrip('/')}/.well-known/jwks.json"
            _clerk_jwks_client = jwt.PyJWKClient(jwks_url)
        payload = jwt.decode(
            token,
            key=_clerk_jwks_client.get_signing_key_from_jwt(token),
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        return payload
    except jwt.PyJWTError:
        return None


def derive_role_from_clerk_payload(payload: dict) -> str:
    # Clerk role can come from public_metadata or custom claim
    public_metadata = payload.get("public_metadata") or {}
    role_claim = public_metadata.get("role") or payload.get("role")
    if isinstance(role_claim, str) and role_claim:
        return role_claim
    # Check org_role / permissions claims if configured
    permissions = payload.get("permissions", []) or []
    permission_set = {str(p).lower() for p in permissions if isinstance(p, str)}
    for role in KINDE_ROLE_ORDER:
        if role in permission_set:
            return role
    return "donor"


def verify_supabase_token(token: str) -> Optional[dict]:
    if not settings.SUPABASE_URL:
        return None
    global _supabase_jwks_client
    try:
        if _supabase_jwks_client is None:
            _supabase_jwks_client = jwt.PyJWKClient(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
            )
        payload = jwt.decode(
            token,
            key=_supabase_jwks_client.get_signing_key_from_jwt(token).key,
            algorithms=["RS256", "ES256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.PyJWTError:
        if not settings.SUPABASE_JWT_SECRET:
            return None
        try:
            return jwt.decode(
                token,
                key=settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
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
