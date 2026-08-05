from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.core.security import decode_access_token, verify_kinde_token, derive_role_from_kinde_payload
from app.db.mongodb import get_database
from app.models.user import user_helper
from app.schemas.user import UserRole
from bson import ObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# In-memory mock database fallback for initial dev setup when MongoDB service isn't active
MOCK_USERS_DB = {}

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Kinde OAuth path (enabled when KINDE_DOMAIN is set). Falls through to the
    # legacy HS256 path only when Kinde verification returns None.
    if settings.KINDE_DOMAIN:
        kinde_payload = verify_kinde_token(token)
        if kinde_payload:
            kinde_user = {
                "id": kinde_payload["sub"],
                "name": kinde_payload.get("name")
                or f"{kinde_payload.get('given_name', '')} {kinde_payload.get('family_name', '')}".strip()
                or kinde_payload.get("email")
                or "Kinde User",
                "email": kinde_payload.get("email"),
                "phone": kinde_payload.get("phone_number"),
                "role": derive_role_from_kinde_payload(kinde_payload),
                "profileImage": kinde_payload.get("picture"),
                "isVerified": True,
            }
            return user_helper(kinde_user)

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    db = get_database()
    
    if db is not None:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return user_helper(user)
        except Exception:
            user = await db.users.find_one({"email": user_id})
            if user:
                return user_helper(user)
    
    # Check in-memory mock store
    if user_id in MOCK_USERS_DB:
        return user_helper(MOCK_USERS_DB[user_id])
    
    # Check by email in mock store
    for u in MOCK_USERS_DB.values():
        if u.get("email") == user_id or u.get("id") == user_id:
            return user_helper(u)
            
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found",
    )

def require_roles(allowed_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role: {current_user.get('role')}",
            )
        return current_user
    return role_checker
