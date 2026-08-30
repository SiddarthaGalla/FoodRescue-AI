import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.api.deps import get_current_user

router = APIRouter()

MOCK_SUPPORT_DB = {}


class SupportRequestIn(BaseModel):
    subject: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=10, max_length=2000)


class SupportRequestOut(BaseModel):
    id: str
    subject: str
    message: str
    status: str = "open"


@router.post("", response_model=SupportRequestOut, status_code=status.HTTP_201_CREATED)
async def create_support_request(
    req: SupportRequestIn,
    current_user: dict = Depends(get_current_user),
) -> Any:
    now = datetime.utcnow().isoformat()
    support_id = f"TIC-{str(uuid.uuid4())[:8]}"
    doc = {
        "id": support_id,
        "subject": req.subject,
        "message": req.message,
        "userId": current_user.get("id"),
        "userEmail": current_user.get("email"),
        "userName": current_user.get("name") or current_user.get("email"),
        "userRole": current_user.get("role", "user"),
        "status": "open",
        "createdAt": now,
    }
    db = get_database()
    if db is not None:
        try:
            res = await db.support_requests.insert_one(doc)
            support_id = str(res.inserted_id)
            doc["id"] = support_id
        except Exception:
            pass
    MOCK_SUPPORT_DB[support_id] = doc
    return {
        "id": support_id,
        "subject": req.subject,
        "message": req.message,
        "status": "open",
    }
