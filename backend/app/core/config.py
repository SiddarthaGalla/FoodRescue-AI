from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FoodRescue AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretjwtkeyforfoodrescueaiproductionapp"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "foodrescue_db"

    # Kinde OAuth (empty = disabled, falls back to legacy dev auth)
    KINDE_DOMAIN: str = ""  # e.g. "https://foodrescue.kinde.com"
    KINDE_AUDIENCE: str = ""  # optional, validated against the token if set

    # Supabase Auth (empty = disabled, falls back to legacy dev auth)
    SUPABASE_URL: str = ""  # e.g. "https://abcdefgh.supabase.co"
    SUPABASE_JWT_SECRET: str = ""  # Project Settings -> API -> JWT Secret

    # Comma-separated list of email addresses that may use the admin role
    ADMIN_EMAILS: str = "siddarthagalla@gmail.com"

    # SMTP email notifications (empty SMTP_* = notifications logged, not sent)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "FoodRescue AI <no-reply@foodrescue.app>"
    # Where admin access request notifications go; defaults to ADMIN_EMAILS
    ADMIN_NOTIFY_EMAIL: str = ""

    # Twilio SMS (empty TWILIO_* = OTP codes logged to console, not texted)
    TWILIO_ACCOUNT_SID: str = ""  # Account SID from console.twilio.com
    TWILIO_AUTH_TOKEN: str = ""   # Auth Token from console.twilio.com
    TWILIO_FROM_NUMBER: str = ""  # E.164 sender, e.g. "+12345678901"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
