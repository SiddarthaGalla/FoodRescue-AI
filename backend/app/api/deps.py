from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.core.security import (
    decode_access_token, verify_kinde_token, verify_clerk_token,
    derive_role_from_kinde_payload, derive_role_from_clerk_payload, get_password_hash
)
from app.db.mongodb import get_database
from app.models.user import user_helper
from app.schemas.user import UserRole
from bson import ObjectId
from datetime import datetime

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Seeded in-memory mock database fallback for dev setup
now_iso = datetime.utcnow()

SEED_USERS = [
    {
        "id": "mock-donor-1",
        "name": "Green Harvest Bistro",
        "email": "donor@culinary.com",
        "phone": "+15550100001",
        "password": get_password_hash("DonorPass123!"),
        "role": "donor",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=donor",
        "isVerified": True,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    },
    {
        "id": "mock-ngo-1",
        "name": "Hope Shelter NGO",
        "email": "ngo@shelterhaven.org",
        "phone": "+15550100002",
        "password": get_password_hash("NgoPass123!"),
        "role": "ngo",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=ngo",
        "isVerified": True,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    },
    {
        "id": "mock-volunteer-1",
        "name": "Alex Rescue Driver",
        "email": "volunteer@rescue.org",
        "phone": "+15550100003",
        "password": get_password_hash("VolunteerPass123!"),
        "role": "volunteer",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=volunteer",
        "isVerified": True,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    },
    {
        "id": "mock-admin-1",
        "name": "System Administrator",
        "email": "admin@foodrescue.org",
        "phone": "+15550100004",
        "password": get_password_hash("AdminPass123!"),
        "role": "admin",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        "isVerified": True,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    },
]

MOCK_USERS_DB = {u["id"]: u for u in SEED_USERS}

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Clerk OAuth path (enabled when CLERK_DOMAIN is set)
    if getattr(settings, 'CLERK_DOMAIN', None):
        clerk_payload = verify_clerk_token(token)
        if clerk_payload:
            clerk_user = {
                "id": clerk_payload.get("sub"),
                "name": clerk_payload.get("name") or clerk_payload.get("email") or "Clerk User",
                "email": clerk_payload.get("email"),
                "phone": None,
                "role": derive_role_from_clerk_payload(clerk_payload),
                "profileImage": clerk_payload.get("picture"),
                "isVerified": True,
            }
            return user_helper(clerk_user)

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
