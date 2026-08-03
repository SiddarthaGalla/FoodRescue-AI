import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "FoodRescue AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretjwtkeyforfoodrescueaiproductionapp"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "foodrescue_db"

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
