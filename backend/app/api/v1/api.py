from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, donations, support

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(donations.router, prefix="/donations", tags=["Donations"])
api_router.include_router(support.router, prefix="/support", tags=["Support"])
