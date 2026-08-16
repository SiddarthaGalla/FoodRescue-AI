from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRole(str, Enum):
    ADMIN = "admin"
    DONOR = "donor"
    NGO = "ngo"
    VOLUNTEER = "volunteer"

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.DONOR
    profileImage: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    rememberMe: Optional[bool] = False

class UserResponse(UserBase):
    id: str
    isVerified: bool = False
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)

class VerifyEmailRequest(BaseModel):
    token: str

class SendOTPRequest(BaseModel):
    target: str = Field(..., description="Email address or phone number")

class VerifyOTPRequest(BaseModel):
    target: str = Field(..., description="Email address or phone number")
    otp: str = Field(..., min_length=6, max_length=6)
    role: Optional[UserRole] = UserRole.DONOR
    name: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    idToken: Optional[str] = None
    email: EmailStr
    name: str
    profileImage: Optional[str] = None
    role: Optional[UserRole] = UserRole.DONOR

class DummyLoginRequest(BaseModel):
    role: UserRole = UserRole.DONOR
    name: Optional[str] = None

class SupabaseAuthRequest(BaseModel):
    token: str = Field(..., description="Supabase access token from the client session")
    role: Optional[UserRole] = UserRole.DONOR

