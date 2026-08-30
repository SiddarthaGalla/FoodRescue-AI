import uuid
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db.mongodb import get_database
from app.models.user import user_helper
from app.schemas.user import UserRole
from app.api.deps import get_current_user, get_current_user_optional, require_roles, MOCK_USERS_DB
from app.api.v1.endpoints.donations import MOCK_DONATIONS_DB
from app.api.v1.endpoints.support import MOCK_SUPPORT_DB
from app.core.security import ADMIN_ACCESS_DENIED_MESSAGE
from app.core.config import settings
from app.services.email_service import (
    send_admin_access_request_notification,
    send_admin_access_decision_notification,
)

router = APIRouter()

MOCK_ADMIN_REQUESTS_DB = {}


class AdminRequestIn(BaseModel):
    email: Optional[str] = Field(None, max_length=320)
    name: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=40)
    note: Optional[str] = Field(None, max_length=500)


class AdminRequestOut(BaseModel):
    id: str
    userEmail: str
    userName: str
    status: str
    phone: Optional[str] = None
    note: Optional[str] = None
    createdAt: datetime


class SupportTicketOut(BaseModel):
    id: str
    subject: str
    message: str
    status: str
    userEmail: Optional[str] = None
    createdAt: datetime


class AdminStatsOut(BaseModel):
    totalUsers: int
    donors: int
    ngos: int
    volunteers: int
    admins: int
    totalDonations: int
    availableDonations: int
    claimedDonations: int
    deliveredDonations: int
    rejectedDonations: int
    totalPortionsDonated: int
    deliveredPortions: int
    estimatedValueRescued: float
    co2TonsSaved: float
    openSupportTickets: int
    pendingAdminRequests: int
    statusBreakdown: dict
    categoryBreakdown: dict
    monthlyRescueTrends: list


async def _list_admin_requests():
    db = get_database()
    requests = []
    if db is not None:
        try:
            cursor = db.admin_requests.find().sort("createdAt", -1)
            for r in await cursor.to_list(length=200):
                requests.append(r)
        except Exception:
            pass
    for r in MOCK_ADMIN_REQUESTS_DB.values():
        if r.get("id") not in [x.get("_id") for x in requests]:
            requests.append(r)
    return requests


async def _find_admin_request(request_id: str):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            r = await db.admin_requests.find_one({"_id": ObjectId(request_id)})
            if r:
                return r
        except Exception:
            pass
    return MOCK_ADMIN_REQUESTS_DB.get(request_id)


def _patch_admin_request(request_id: str, patch: dict):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            db.admin_requests.update_one({"_id": ObjectId(request_id)}, {"$set": patch})
            return
        except Exception:
            pass
    if request_id in MOCK_ADMIN_REQUESTS_DB:
        MOCK_ADMIN_REQUESTS_DB[request_id].update(patch)


async def _insert_admin_request(doc: dict) -> str:
    db = get_database()
    request_id = str(uuid.uuid4())
    if db is not None:
        try:
            res = await db.admin_requests.insert_one(doc)
            request_id = str(res.inserted_id)
            doc["_id"] = res.inserted_id
            return request_id
        except Exception:
            pass
    doc["id"] = request_id
    MOCK_ADMIN_REQUESTS_DB[request_id] = doc
    return request_id


def _update_user_role(user_id: str, new_role: str):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role, "updatedAt": datetime.utcnow()}})
        except Exception:
            pass
    for u in MOCK_USERS_DB.values():
        if u.get("_id") == user_id or u.get("id") == user_id:
            u["role"] = new_role


async def _find_user_by_email(email: str):
    db = get_database()
    if db is not None:
        try:
            u = await db.users.find_one({"email": email})
            if u:
                return user_helper(u)
        except Exception:
            pass
    for u in MOCK_USERS_DB.values():
        if u.get("email") == email:
            return user_helper(u)
    return None


async def has_approved_admin_request(email: str) -> bool:
    db = get_database()
    if db is not None:
        try:
            r = await db.admin_requests.find_one({"userEmail": email, "status": "approved"})
            if r:
                return True
        except Exception:
            pass
    for r in MOCK_ADMIN_REQUESTS_DB.values():
        if r.get("userEmail") == email and r.get("status") == "approved":
            return True
    return False


def _format_request(r: dict) -> dict:
    return {
        "id": str(r.get("_id", r.get("id"))),
        "userEmail": r.get("userEmail"),
        "userName": r.get("userName"),
        "status": r.get("status"),
        "phone": r.get("phone"),
        "note": r.get("note"),
        "createdAt": r.get("createdAt"),
    }


# ---------- Stats ----------

@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    db = get_database()
    users, donations = [], []
    if db is not None:
        try:
            users = [user_helper(u) async for u in db.users.find({})]
        except Exception:
            pass
        try:
            cursor = db.donations.find({})
            donations = [d for d in await cursor.to_list(length=10000)]
        except Exception:
            pass
    if not users:
        users = [user_helper(u) for u in MOCK_USERS_DB.values()]
    if not donations:
        donations = list(MOCK_DONATIONS_DB.values())

    support = []
    if db is not None:
        try:
            cursor = db.support_requests.find({})
            support = [s async for s in cursor.to_list(length=500)]
        except Exception:
            pass
    if not support:
        support = list(MOCK_SUPPORT_DB.values())

    admin_requests = await _list_admin_requests()

    def count_role(role: str):
        return sum(1 for u in users if u.get("role") == role)

    delivered = [d for d in donations if d.get("status") == "delivered"]
    claimed = [d for d in donations if d.get("status") == "claimed"]
    available = [d for d in donations if d.get("status") == "available"]
    rejected = [d for d in donations if d.get("status") in ["cancelled", "rejected", "expired"]]

    total_portions = sum(d.get("quantity") or 0 for d in donations)
    delivered_portions = sum(d.get("quantity") or 0 for d in delivered)
    estimated_value_rescued = sum(
        (d.get("quantity") or 0) * (d.get("estimatedValue") or 3.5)
        for d in delivered
    )

    # Category breakdown
    cat_counts = {}
    for d in donations:
        cat = d.get("itemType") or "Cooked Meals"
        cat_counts[cat] = cat_counts.get(cat, 0) + (d.get("quantity") or 0)

    # Monthly trends sample data
    monthly_trends = [
        {"month": "Mar", "donated": 450, "delivered": 380, "rejected": 20},
        {"month": "Apr", "donated": 620, "delivered": 540, "rejected": 30},
        {"month": "May", "donated": 780, "delivered": 710, "rejected": 25},
        {"month": "Jun", "donated": 910, "delivered": 850, "rejected": 15},
        {"month": "Jul", "donated": 1100, "delivered": 1020, "rejected": 20},
        {"month": "Aug", "donated": max(total_portions, 1250), "delivered": max(delivered_portions, 980), "rejected": max(len(rejected) * 15, 45)},
    ]

    return {
        "totalUsers": len(users),
        "donors": count_role("donor"),
        "ngos": count_role("ngo"),
        "volunteers": count_role("volunteer"),
        "admins": count_role("admin"),
        "totalDonations": len(donations),
        "availableDonations": len(available),
        "claimedDonations": len(claimed),
        "deliveredDonations": len(delivered),
        "rejectedDonations": len(rejected),
        "totalPortionsDonated": total_portions,
        "deliveredPortions": delivered_portions,
        "estimatedValueRescued": round(estimated_value_rescued, 2),
        "co2TonsSaved": round((delivered_portions * 1.1) / 1000, 2),
        "openSupportTickets": sum(1 for s in support if s.get("status") != "resolved"),
        "pendingAdminRequests": sum(1 for r in admin_requests if r.get("status") == "pending"),
        "statusBreakdown": {
            "Available": len(available),
            "Claimed": len(claimed),
            "Delivered": len(delivered),
            "Rejected": len(rejected),
        },
        "categoryBreakdown": cat_counts,
        "monthlyRescueTrends": monthly_trends,
    }


# ---------- Users ----------

@router.get("/users")
async def admin_users(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    db = get_database()
    users = []
    if db is not None:
        try:
            cursor = db.users.find({})
            users = [user_helper(u) for u in await cursor.to_list(length=1000)]
        except Exception:
            pass
    if not users:
        users = [user_helper(u) for u in MOCK_USERS_DB.values()]
    users.sort(key=lambda u: str(u.get("createdAt") or ""), reverse=True)
    return users


# ---------- Support inbox ----------

@router.get("/support", response_model=List[SupportTicketOut])
async def admin_support(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    db = get_database()
    tickets = []
    if db is not None:
        try:
            cursor = db.support_requests.find({}).sort("createdAt", -1)
            for t in await cursor.to_list(length=500):
                tickets.append({
                    "id": str(t.get("_id", t.get("id"))),
                    "subject": t.get("subject"),
                    "message": t.get("message"),
                    "status": t.get("status", "open"),
                    "userEmail": t.get("userEmail"),
                    "userName": t.get("userName"),
                    "userRole": t.get("userRole"),
                    "createdAt": t.get("createdAt"),
                })
            return tickets
        except Exception:
            pass
    for t in MOCK_SUPPORT_DB.values():
        tickets.append({
            "id": str(t.get("_id", t.get("id"))),
            "subject": t.get("subject"),
            "message": t.get("message"),
            "status": t.get("status", "open"),
            "userEmail": t.get("userEmail"),
            "userName": t.get("userName"),
            "userRole": t.get("userRole"),
            "createdAt": t.get("createdAt"),
        })
    tickets.sort(key=lambda t: str(t.get("createdAt") or ""), reverse=True)
    return tickets


@router.post("/support/{ticket_id}/resolve")
async def resolve_support_ticket(
    ticket_id: str,
    current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            res = await db.support_requests.update_one(
                {"_id": ObjectId(ticket_id)}, {"$set": {"status": "resolved"}}
            )
            if res.modified_count or res.matched_count:
                return {"message": "Ticket marked as resolved"}
        except Exception:
            pass
    for t in MOCK_SUPPORT_DB.values():
        if t.get("id") == ticket_id or str(t.get("_id")) == ticket_id:
            t["status"] = "resolved"
            return {"message": "Ticket marked as resolved"}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")


# ---------- Admin access requests ----------

@router.post("/request", response_model=AdminRequestOut)
async def request_admin_access(
    req: AdminRequestIn,
    current_user: dict | None = Depends(get_current_user_optional),
):
    if current_user:
        email = current_user.get("email")
        user_name = req.name.strip() if req.name and req.name.strip() else current_user.get("name")
    else:
        email = (req.email or "").strip().lower()
        user_name = (
            req.name.strip()
            if req.name and req.name.strip()
            else (email.split("@")[0] if email else "Unknown User")
        )
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required when not signed in.",
            )

    if email in [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account already owns the admin portal.",
        )

    existing = await _list_admin_requests()
    for r in existing:
        if r.get("userEmail") == email:
            status_now = r.get("status")
            if status_now == "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Your account already has admin access.",
                )
            if status_now == "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already have a pending admin access request.",
                )
    now = datetime.utcnow()
    doc = {
        "userId": current_user.get("id") if current_user else None,
        "userEmail": email,
        "userName": user_name,
        "phone": req.phone,
        "note": req.note,
        "status": "pending",
        "createdAt": now,
    }
    request_id = await _insert_admin_request(doc)

    send_admin_access_request_notification(user_name, email, req.note)

    return _format_request({**doc, "id": request_id, "_id": request_id})


@router.get("/request/status")
async def my_admin_request_status(current_user: dict = Depends(get_current_user)):
    email = current_user.get("email")
    existing = await _list_admin_requests()
    for r in existing:
        if r.get("userEmail") == email:
            return _format_request(r)
    return {"id": None, "userEmail": email, "userName": current_user.get("name"), "status": "none", "phone": None, "createdAt": None}


@router.get("/requests", response_model=List[AdminRequestOut])
async def list_admin_requests(current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    requests = await _list_admin_requests()
    requests.sort(key=lambda r: str(r.get("createdAt") or ""), reverse=True)
    return [_format_request(r) for r in requests]


@router.post("/requests/{request_id}/approve")
async def approve_admin_request(
    request_id: str,
    current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    request = await _find_admin_request(request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if request.get("status") != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")
    user = await _find_user_by_email(request.get("userEmail") or "")
    _patch_admin_request(request_id, {"status": "approved", "resolvedAt": datetime.utcnow()})
    if user:
        _update_user_role(user["id"], "admin")
        send_admin_access_decision_notification(user.get("email"), approved=True)
        return {"message": f"Admin access granted to {user.get('email')}"}
    send_admin_access_decision_notification(request.get("userEmail"), approved=True)
    return {"message": f"Admin access approved for {request.get('userEmail')}"}


@router.post("/requests/{request_id}/reject")
async def reject_admin_request(
    request_id: str,
    current_user: dict = Depends(require_roles([UserRole.ADMIN]))):
    request = await _find_admin_request(request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if request.get("status") != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")
    _patch_admin_request(request_id, {"status": "rejected", "resolvedAt": datetime.utcnow()})
    if request.get("userEmail"):
        send_admin_access_decision_notification(request["userEmail"], approved=False)
    return {"message": "Admin access request rejected"}
