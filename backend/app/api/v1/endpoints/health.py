from fastapi import APIRouter
from app.db.mongodb import get_database

router = APIRouter()

@router.get("/health")
async def health_check():
    db = get_database()
    mongo_status = "disconnected"
    if db is not None:
        try:
            await db.command("ping")
            mongo_status = "connected"
        except Exception:
            mongo_status = "error"

    return {
        "status": "online",
        "service": "FoodRescue AI Backend",
        "mongodb": mongo_status
    }
