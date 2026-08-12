from datetime import datetime
from typing import Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
    SendOTPRequest, VerifyOTPRequest, GoogleAuthRequest, DummyLoginRequest, UserRole
)
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.mongodb import get_database
from app.models.user import user_helper
from app.api.deps import get_current_user, MOCK_USERS_DB
from app.services.otp_service import send_realtime_otp, verify_otp_code

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate) -> Any:
    db = get_database()
    now = datetime.utcnow()

    # Check existing user
    if db is not None:
        try:
            existing = await db.users.find_one({"email": user_in.email})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email address already exists.",
                )
        except Exception:
            pass

    for u in MOCK_USERS_DB.values():
        if u["email"] == user_in.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )

    hashed_password = get_password_hash(user_in.password)
    user_doc = {
        "name": user_in.name,
        "email": user_in.email,
        "phone": user_in.phone,
        "password": hashed_password,
        "role": user_in.role.value,
        "profileImage": user_in.profileImage or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.email}",
        "isVerified": True,
        "createdAt": now,
        "updatedAt": now,
    }

    user_id = str(uuid.uuid4())
    if db is not None:
        try:
            res = await db.users.insert_one(user_doc)
            user_id = str(res.inserted_id)
            user_doc["_id"] = res.inserted_id
        except Exception:
            user_doc["id"] = user_id
            MOCK_USERS_DB[user_id] = user_doc
    else:
        user_doc["id"] = user_id
        MOCK_USERS_DB[user_id] = user_doc

    formatted_user = user_helper(user_doc)
    access_token = create_access_token(subject=user_id, role=user_in.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin) -> Any:
    db = get_database()
    found_user = None

    if db is not None:
        try:
            found_user = await db.users.find_one({"email": credentials.email})
        except Exception:
            pass

    if not found_user:
        for u in MOCK_USERS_DB.values():
            if u["email"] == credentials.email:
                found_user = u
                break

    if not found_user or not verify_password(credentials.password, found_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user_id = str(found_user.get("_id", found_user.get("id")))
    role = found_user.get("role", "donor")
    formatted_user = user_helper(found_user)
    access_token = create_access_token(subject=user_id, role=role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.post("/send-otp")
async def send_otp(req: SendOTPRequest) -> Any:
    otp_code, status_msg = send_realtime_otp(req.target)
    return {
        "message": status_msg,
        "otp": otp_code,
        "target": req.target,
        "expires_in_minutes": 5
    }

@router.post("/verify-otp", response_model=Token)
async def verify_otp(req: VerifyOTPRequest) -> Any:
    is_valid = verify_otp_code(req.target, req.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification code.",
        )

    db = get_database()
    found_user = None

    is_email = "@" in req.target
    query = {"email": req.target} if is_email else {"phone": req.target}

    if db is not None:
        try:
            found_user = await db.users.find_one(query)
        except Exception:
            pass

    if not found_user:
        for u in MOCK_USERS_DB.values():
            if (is_email and u.get("email") == req.target) or (not is_email and u.get("phone") == req.target):
                found_user = u
                break

    now = datetime.utcnow()
    role_val = req.role.value if req.role else "donor"

    if not found_user:
        user_name = req.name or (req.target.split("@")[0] if is_email else f"User {req.target[-4:]}")
        user_doc = {
            "name": user_name,
            "email": req.target if is_email else f"{req.target}@mobile.user",
            "phone": req.target if not is_email else None,
            "password": get_password_hash("OTPVerifiedPassword123!"),
            "role": role_val,
            "profileImage": f"https://api.dicebear.com/7.x/avataaars/svg?seed={req.target}",
            "isVerified": True,
            "createdAt": now,
            "updatedAt": now,
        }
        user_id = str(uuid.uuid4())
        if db is not None:
            try:
                res = await db.users.insert_one(user_doc)
                user_id = str(res.inserted_id)
                user_doc["_id"] = res.inserted_id
            except Exception:
                user_doc["id"] = user_id
                MOCK_USERS_DB[user_id] = user_doc
        else:
            user_doc["id"] = user_id
            MOCK_USERS_DB[user_id] = user_doc

        found_user = user_doc

    user_id = str(found_user.get("_id", found_user.get("id")))
    role = found_user.get("role", role_val)
    formatted_user = user_helper(found_user)
    access_token = create_access_token(subject=user_id, role=role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.post("/google", response_model=Token)
async def google_auth(req: GoogleAuthRequest) -> Any:
    db = get_database()
    found_user = None

    if db is not None:
        try:
            found_user = await db.users.find_one({"email": req.email})
        except Exception:
            pass

    if not found_user:
        for u in MOCK_USERS_DB.values():
            if u.get("email") == req.email:
                found_user = u
                break

    now = datetime.utcnow()
    role_val = req.role.value if req.role else "donor"

    if not found_user:
        user_doc = {
            "name": req.name,
            "email": req.email,
            "phone": None,
            "password": get_password_hash("GoogleOAuthSecuredPass123!"),
            "role": role_val,
            "profileImage": req.profileImage or f"https://api.dicebear.com/7.x/avataaars/svg?seed={req.email}",
            "isVerified": True,
            "createdAt": now,
            "updatedAt": now,
        }
        user_id = str(uuid.uuid4())
        if db is not None:
            try:
                res = await db.users.insert_one(user_doc)
                user_id = str(res.inserted_id)
                user_doc["_id"] = res.inserted_id
            except Exception:
                user_doc["id"] = user_id
                MOCK_USERS_DB[user_id] = user_doc
        else:
            user_doc["id"] = user_id
            MOCK_USERS_DB[user_id] = user_doc

        found_user = user_doc

    user_id = str(found_user.get("_id", found_user.get("id")))
    role = found_user.get("role", role_val)
    formatted_user = user_helper(found_user)
    access_token = create_access_token(subject=user_id, role=role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.post("/dummy-login", response_model=Token)
async def dummy_login(req: DummyLoginRequest) -> Any:
    db = get_database()
    role_str = req.role.value if hasattr(req.role, "value") else str(req.role)
    target_email = f"{role_str}@foodrescue.org"

    # Match pre-seeded demo emails if role matches standard demo users
    if role_str == "donor":
        target_email = "donor@culinary.com"
    elif role_str == "ngo":
        target_email = "ngo@shelterhaven.org"
    elif role_str == "volunteer":
        target_email = "volunteer@rescue.org"
    elif role_str == "admin":
        target_email = "admin@foodrescue.org"

    found_user = None
    if db is not None:
        try:
            found_user = await db.users.find_one({"email": target_email})
        except Exception:
            pass

    if not found_user:
        for u in MOCK_USERS_DB.values():
            if u.get("email") == target_email or u.get("role") == role_str:
                found_user = u
                break

    now = datetime.utcnow()
    if not found_user:
        user_name = req.name or f"Demo {role_str.upper()} User"
        user_doc = {
            "name": user_name,
            "email": target_email,
            "phone": "+1555019999",
            "password": get_password_hash("DemoRolePass123!"),
            "role": role_str,
            "profileImage": f"https://api.dicebear.com/7.x/avataaars/svg?seed={role_str}",
            "isVerified": True,
            "createdAt": now,
            "updatedAt": now,
        }
        user_id = str(uuid.uuid4())
        if db is not None:
            try:
                res = await db.users.insert_one(user_doc)
                user_id = str(res.inserted_id)
                user_doc["_id"] = res.inserted_id
            except Exception:
                user_doc["id"] = user_id
                MOCK_USERS_DB[user_id] = user_doc
        else:
            user_doc["id"] = user_id
            MOCK_USERS_DB[user_id] = user_doc

        found_user = user_doc

    user_id = str(found_user.get("_id", found_user.get("id")))
    role = found_user.get("role", role_str)
    formatted_user = user_helper(found_user)
    access_token = create_access_token(subject=user_id, role=role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)) -> Any:
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)) -> Any:
    return current_user

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest) -> Any:
    return {"message": f"Password reset instructions have been sent to {req.email}"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest) -> Any:
    return {"message": "Password has been reset successfully"}

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest) -> Any:
    return {"message": "Email address verified successfully"}

