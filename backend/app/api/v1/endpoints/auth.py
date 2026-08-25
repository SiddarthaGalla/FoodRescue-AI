from datetime import datetime, timedelta
from typing import Any
import uuid
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
    SendOTPRequest, VerifyOTPRequest, GoogleAuthRequest, DummyLoginRequest, UserRole
)
from app.core.config import settings
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    verify_supabase_token, resolve_requested_role, ADMIN_ACCESS_DENIED_MESSAGE,
)
from app.db.mongodb import get_database
from app.models.user import user_helper
from app.api.deps import get_current_user, MOCK_USERS_DB
from app.services.otp_service import send_realtime_otp, verify_otp_code
from app.schemas.user import SupabaseAuthRequest
from app.api.v1.endpoints.admin import has_approved_admin_request

router = APIRouter()


async def _guard_role(email: str, requested_role: str, stored_role: str | None = None) -> str:
    resolved = resolve_requested_role(email, requested_role, stored_role)
    if resolved is not None:
        return resolved
    if requested_role == "admin" and await has_approved_admin_request(email):
        return "admin"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=ADMIN_ACCESS_DENIED_MESSAGE,
    )

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
    role_val = await _guard_role(user_in.email, user_in.role.value)
    user_doc = {
        "name": user_in.name,
        "email": user_in.email,
        "phone": user_in.phone,
        "password": hashed_password,
        "role": role_val,
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
    access_token = create_access_token(subject=user_id, role=role_val)

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

    role = found_user.get("role", "donor")
    requested = credentials.role.value if credentials.role else None
    if requested and requested != role:
        role = await _guard_role(credentials.email, requested, role)
        if role != found_user.get("role"):
            found_user["role"] = role
            db = get_database()
            if db is not None:
                try:
                    from bson import ObjectId
                    db.users.update_one(
                        {"_id": ObjectId(found_user.get("_id"))},
                        {"$set": {"role": role, "updatedAt": datetime.utcnow()}},
                    )
                except Exception:
                    pass
            mock_key = str(found_user.get("id") or found_user.get("_id"))
            if mock_key in MOCK_USERS_DB:
                MOCK_USERS_DB[mock_key]["role"] = role

    user_id = str(found_user.get("_id", found_user.get("id")))
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
    # The code itself is intentionally NOT returned — it only goes to the
    # recipient's device (Twilio SMS / SMTP / server console fallback).
    return {
        "message": status_msg,
        "target": req.target,
        "expires_in_minutes": 5
    }

@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest) -> Any:
    is_valid = verify_otp_code(req.target, req.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification code.",
        )

    # Password-reset flow: verify the OTP, return a short-lived reset token,
    # and never create or sign the user in.
    if req.purpose == "reset":
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
        if not found_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found for this phone number.",
            )
        user_id = str(found_user.get("_id", found_user.get("id")))
        reset_token = create_access_token(subject=user_id, role="reset", expires_delta=timedelta(minutes=10))
        return {"reset_token": reset_token, "message": "OTP verified successfully"}

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
    role_val = await _guard_role(
        req.target if is_email else f"{req.target}@mobile.user",
        role_val,
        found_user.get("role") if found_user else None,
    )

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
    role_val = await _guard_role(req.email, role_val, found_user.get("role") if found_user else None)

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

@router.post("/supabase", response_model=Token)
async def supabase_auth(req: SupabaseAuthRequest) -> Any:
    payload = verify_supabase_token(req.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase token",
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase token is missing an email claim",
        )

    metadata = payload.get("user_metadata") or {}
    name = metadata.get("name") or payload.get("name") or email.split("@")[0]
    profile_image = metadata.get("avatar_url") or metadata.get("picture")

    db = get_database()
    found_user = None

    if db is not None:
        try:
            found_user = await db.users.find_one({"email": email})
        except Exception:
            pass

    if not found_user:
        for u in MOCK_USERS_DB.values():
            if u.get("email") == email:
                found_user = u
                break

    now = datetime.utcnow()
    role_val = req.role.value if req.role else (found_user.get("role") if found_user else "donor")
    role_val = await _guard_role(email, role_val, found_user.get("role") if found_user else None)

    if not found_user:
        user_doc = {
            "name": name,
            "email": email,
            "phone": None,
            "password": get_password_hash("SupabaseVerifiedPass123!"),
            "role": role_val,
            "profileImage": profile_image or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}",
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

    if found_user and (profile_image or (found_user.get("role") != role_val)):
        now = datetime.utcnow()
        update_fields = {"updatedAt": now}
        if profile_image:
            update_fields["profileImage"] = profile_image
        if not found_user.get("name"):
            update_fields["name"] = name
        if found_user.get("role") != role_val:
            update_fields["role"] = role_val

        db = get_database()
        if db is not None:
            try:
                from bson import ObjectId
                db.users.update_one(
                    {"_id": ObjectId(found_user.get("_id"))},
                    {"$set": update_fields},
                )
            except Exception:
                pass

        mock_key = str(found_user.get("id") or found_user.get("_id"))
        if mock_key in MOCK_USERS_DB:
            MOCK_USERS_DB[mock_key].update(update_fields)
        found_user.update(update_fields)

    user_id = str(found_user.get("_id", found_user.get("id")))
    formatted_user = user_helper(found_user)
    access_token = create_access_token(subject=user_id, role=role_val)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user,
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
    role_str = await _guard_role(target_email, role_str, found_user.get("role") if found_user else None)
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
    # req.token is a short-lived JWT minted by /auth/verify-otp (purpose=reset).
    try:
        payload = jwt.decode(
            req.token,
            key=settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or role != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    db = get_database()
    found_user = None
    if db is not None:
        try:
            from bson import ObjectId
            found_user = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
    if not found_user:
        found_user = MOCK_USERS_DB.get(user_id)
    if not found_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )

    new_hashed = get_password_hash(req.new_password)
    if db is not None:
        try:
            from bson import ObjectId
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"password": new_hashed, "updatedAt": datetime.utcnow()}})
        except Exception:
            pass
    if user_id in MOCK_USERS_DB:
        MOCK_USERS_DB[user_id]["password"] = new_hashed
    return {"message": "Password has been reset successfully"}

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest) -> Any:
    return {"message": "Email address verified successfully"}

