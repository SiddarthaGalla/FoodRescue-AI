import uuid
import os
import json
import re
import urllib.request
from datetime import datetime, timedelta
from typing import Optional, List
from math import radians, cos, sin, sqrt, atan2

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.models.user import user_helper
from app.models.donation import donation_helper
from app.schemas.donation import (
    DonationCreate,
    DonationResponse,
    DonationStatus,
    DonationUpdate,
    AssignVolunteerRequest,
    VolunteerCreateRequest,
    VolunteerLocationUpdateRequest,
    ChatMessageCreateRequest,
    NLPExtractRequest,
    NLPExtractResponse,
    VerifyPoDRequest,
    RecurringScheduleCreate,
    RecurringScheduleResponse,
    FoodSafetyLogRequest,
)
from app.schemas.user import UserRole
from app.api.deps import get_current_user, require_roles
from app.core.config import settings

router = APIRouter()


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c


def calculate_fare(donation: dict, volunteer_lat: float, volunteer_lng: float) -> tuple[float, dict]:
    """
    Calculate fare for volunteer pickup.
    Returns (total_fare, breakdown_dict)
    """
    # Fare constants
    BASE_FARE = 50.0
    PER_KM_RATE = 15.0
    PER_PORTION_RATE = 2.0
    PLATFORM_FEE = 0.10
    
    # Distance fare
    v_lat = volunteer_lat if volunteer_lat is not None else 28.6210
    v_lng = volunteer_lng if volunteer_lng is not None else 77.2100
    donor_lat = donation.get("latitude") if donation.get("latitude") is not None else 28.6139
    donor_lng = donation.get("longitude") if donation.get("longitude") is not None else 77.2090
    distance_km = haversine(v_lat, v_lng, donor_lat, donor_lng)
    
    distance_fare = distance_km * PER_KM_RATE
    quantity_fare = donation.get("quantity", 0) * PER_PORTION_RATE
    base_fare = BASE_FARE
    
    subtotal = base_fare + distance_fare + quantity_fare
    
    # Time multiplier (peak hours)
    now = datetime.utcnow()
    hour = (now.hour + 5) % 24  # UTC to IST roughly
    time_multiplier = 1.2 if (11 <= hour <= 14 or 18 <= hour <= 21) else 1.0
    
    # Urgency multiplier (expiry < 2 hours)
    urgency_multiplier = 1.0
    if donation.get("expiryDateTime"):
        expiry = donation["expiryDateTime"]
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        time_to_expiry = (expiry - datetime.utcnow()).total_seconds() / 3600
        if time_to_expiry < 2:
            urgency_multiplier = 1.3
    
    PLATFORM_FEE_RATE = 0.10
    total_before_fee = (BASE_FARE + distance_fare + quantity_fare) * time_multiplier * urgency_multiplier
    platform_fee = total_before_fee * 0.10
    total_fare = total_before_fee - platform_fee
    
    breakdown = {
        "base_fare": round(BASE_FARE, 2),
        "distance_km": round(distance_km, 2),
        "distance_fare": round(distance_fare, 2),
        "quantity": donation.get("quantity", 0),
        "per_portion_rate": PER_PORTION_RATE,
        "quantity_fare": round(quantity_fare, 2),
        "time_multiplier": time_multiplier,
        "urgency_multiplier": urgency_multiplier,
        "subtotal_before_fee": round(total_before_fee, 2),
        "platform_fee_percent": int(PLATFORM_FEE_RATE * 100),
        "platform_fee": round(platform_fee, 2),
        "total_fare": round(total_fare, 2)
    }
    
    return round(total_fare, 2), breakdown


now_base = datetime.utcnow()
MOCK_DONATIONS_DB = {
    "mock-don-1": {
        "id": "mock-don-1",
        "_id": "mock-don-1",
        "title": "Hot Dal Rice & Roti Meal Trays",
        "description": "Freshly prepared wholesome meals from lunch buffet. Kept hot and ready for immediate pickup.",
        "quantity": 80,
        "itemType": "Cooked Meals",
        "expiryDateTime": now_base + timedelta(hours=1, minutes=30),
        "pickupLocation": "Connaught Place Sector 3, Central New Delhi",
        "address": "Connaught Place Sector 3, Central New Delhi",
        "latitude": 28.6180,
        "longitude": 77.2050,
        "pickupWindowStart": now_base - timedelta(minutes=30),
        "pickupWindowEnd": now_base + timedelta(hours=2),
        "photoUrl": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop",
        "estimatedValue": 3.5,
        "donorId": "mock-donor-id",
        "donorName": "Green Harvest Bistro",
        "status": DonationStatus.AVAILABLE.value,
        "claimedBy": None,
        "claimedByName": None,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "createdAt": now_base - timedelta(minutes=45),
        "updatedAt": now_base - timedelta(minutes=45),
    },
    "mock-don-2": {
        "id": "mock-don-2",
        "_id": "mock-don-2",
        "title": "Fresh Artisan Bakery Bread & Pastries",
        "description": "Whole wheat bread loaves, croissants, and dinner rolls baked this morning.",
        "quantity": 40,
        "itemType": "Bakery",
        "expiryDateTime": now_base + timedelta(hours=4),
        "pickupLocation": "Barakhamba Road, New Delhi",
        "address": "Barakhamba Road, New Delhi",
        "latitude": 28.6250,
        "longitude": 77.2150,
        "pickupWindowStart": now_base,
        "pickupWindowEnd": now_base + timedelta(hours=5),
        "photoUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop",
        "estimatedValue": 2.0,
        "donorId": "mock-donor-id",
        "donorName": "Sunlit Bakery Cafe",
        "status": DonationStatus.AVAILABLE.value,
        "claimedBy": None,
        "claimedByName": None,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "createdAt": now_base - timedelta(hours=1),
        "updatedAt": now_base - timedelta(hours=1),
    },
    "mock-don-3": {
        "id": "mock-don-3",
        "_id": "mock-don-3",
        "title": "Surplus Corporate Buffet Feast",
        "description": "Paneer curry, mixed vegetable pulao, salad, and dessert cups for large shelter feeding.",
        "quantity": 150,
        "itemType": "Cooked Meals",
        "expiryDateTime": now_base + timedelta(hours=2),
        "pickupLocation": "IT Park Tower B, New Delhi",
        "address": "IT Park Tower B, New Delhi",
        "latitude": 28.6300,
        "longitude": 77.2200,
        "pickupWindowStart": now_base,
        "pickupWindowEnd": now_base + timedelta(hours=3),
        "photoUrl": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop",
        "estimatedValue": 4.0,
        "donorId": "mock-donor-id",
        "donorName": "Grand Horizon Caterers",
        "status": DonationStatus.AVAILABLE.value,
        "claimedBy": None,
        "claimedByName": None,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "createdAt": now_base - timedelta(minutes=20),
        "updatedAt": now_base - timedelta(minutes=20),
    },
    "mock-don-4": {
        "id": "mock-don-4",
        "_id": "mock-don-4",
        "title": "Fresh Farm Apples & Seasonal Oranges",
        "description": "Crates of crisp apples and sweet oranges, perfect fruit for children and shelter residents.",
        "quantity": 60,
        "itemType": "Produce",
        "expiryDateTime": now_base + timedelta(hours=14),
        "pickupLocation": "Lodhi Road Market, New Delhi",
        "address": "Lodhi Road Market, New Delhi",
        "latitude": 28.6000,
        "longitude": 77.1900,
        "pickupWindowStart": now_base,
        "pickupWindowEnd": now_base + timedelta(hours=12),
        "photoUrl": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&auto=format&fit=crop",
        "estimatedValue": 1.5,
        "donorId": "mock-donor-id",
        "donorName": "Organic Farm Market",
        "status": DonationStatus.AVAILABLE.value,
        "claimedBy": None,
        "claimedByName": None,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "createdAt": now_base - timedelta(hours=2),
        "updatedAt": now_base - timedelta(hours=2),
    },
}

async def _find_donation(donation_id: str):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            donation = await db.donations.find_one({"_id": ObjectId(donation_id)})
            if donation:
                return donation
        except Exception:
            pass
    return MOCK_DONATIONS_DB.get(donation_id)

async def _get_donation_or_404(donation_id: str):
    donation = await _find_donation(donation_id)
    if not donation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation not found")
    return donation

def _patch_donation(donation_id: str, patch: dict):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            db.donations.update_one(
                {"_id": ObjectId(donation_id)},
                {"$set": patch, "$setOnInsert": {}}
            )
            return True
        except Exception:
            pass
    if donation_id in MOCK_DONATIONS_DB:
        MOCK_DONATIONS_DB[donation_id].update(patch)
        return True
    return False

async def _insert_donation(donation: dict) -> str:
    db = get_database()
    donation_id = str(uuid.uuid4())
    if db is not None:
        try:
            res = await db.donations.insert_one(donation)
            donation_id = str(res.inserted_id)
            donation["_id"] = res.inserted_id
            return donation_id
        except Exception:
            pass
    donation["id"] = donation_id
    MOCK_DONATIONS_DB[donation_id] = donation
    return donation_id

async def _find_user(user_id: str):
    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return user_helper(user)
        except Exception:
            pass
    try:
        from app.api.deps import MOCK_USERS_DB
        if user_id in MOCK_USERS_DB:
            return user_helper(MOCK_USERS_DB[user_id])
        for u in MOCK_USERS_DB.values():
            if u.get("id") == user_id or u.get("_id") == user_id:
                return user_helper(u)
    except Exception:
        pass
    return None

def _validate_window(create: DonationCreate):
    if create.pickupWindowEnd <= create.pickupWindowStart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pickupWindowEnd must be after pickupWindowStart",
        )

@router.post("", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
async def create_donation(
    donation_in: DonationCreate,
    current_user: dict = Depends(require_roles([UserRole.DONOR, UserRole.ADMIN])),
):
    _validate_window(donation_in)
    now = datetime.utcnow()
    donation_doc = {
        "title": donation_in.title,
        "description": donation_in.description,
        "quantity": donation_in.quantity,
        "itemType": donation_in.itemType,
        "expiryDateTime": donation_in.expiryDateTime,
        "pickupLocation": donation_in.pickupLocation,
        "pickupWindowStart": donation_in.pickupWindowStart,
        "pickupWindowEnd": donation_in.pickupWindowEnd,
        "photoUrl": donation_in.photoUrl,
        "address": donation_in.address,
        "latitude": donation_in.latitude,
        "longitude": donation_in.longitude,
        "estimatedValue": donation_in.estimatedValue,
        "donorId": current_user["id"],
        "donorName": current_user.get("name"),
        "status": DonationStatus.AVAILABLE.value,
        "claimedBy": None,
        "claimedByName": None,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "createdAt": now,
        "updatedAt": now,
    }
    donation_id = await _insert_donation(donation_doc)
    donation_doc["_id"] = donation_id
    return donation_helper(donation_doc)

@router.get("", response_model=list[DonationResponse])
async def list_donations(current_user: dict = Depends(get_current_user)):
    db = get_database()
    role = current_user.get("role")
    docs = []

    if db is not None:
        try:
            query = {}
            if role == UserRole.DONOR.value:
                query = {"donorId": current_user["id"]}
            elif role == UserRole.NGO.value:
                query = {
                    "$or": [
                        {"status": DonationStatus.AVAILABLE.value},
                        {"claimedBy": current_user["id"]},
                    ]
                }
            elif role == UserRole.VOLUNTEER.value:
                query = {"assignedVolunteerId": current_user["id"]}
            cursor = db.donations.find(query).sort("createdAt", -1)
            for d in await cursor.to_list(length=100):
                docs.append(donation_helper(d))
            return docs
        except Exception:
            pass

    for d in MOCK_DONATIONS_DB.values():
        if role == UserRole.DONOR.value and d.get("donorId") != current_user["id"]:
            continue
        if role == UserRole.NGO.value and not (
            d.get("status") == DonationStatus.AVAILABLE.value
            or d.get("claimedBy") == current_user["id"]
        ):
            continue
        if role == UserRole.VOLUNTEER.value and d.get("assignedVolunteerId") != current_user["id"]:
            continue
        docs.append(donation_helper(d))
    docs.sort(key=lambda x: x.get("createdAt") or datetime.min, reverse=True)
    return docs

@router.get("/{donation_id}", response_model=DonationResponse)
async def get_donation(donation_id: str, current_user: dict = Depends(get_current_user)):
    donation = await _get_donation_or_404(donation_id)
    return donation_helper(donation)

@router.patch("/{donation_id}", response_model=DonationResponse)
async def update_donation(
    donation_id: str,
    donation_in: DonationUpdate,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_owner = str(donation.get("donorId")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to edit this donation")

    patch = {k: v for k, v in donation_in.model_dump().items() if v is not None}
    if not patch:
        return donation_helper(donation)
    if "pickupWindowStart" in patch and "pickupWindowEnd" in patch:
        _validate_window(donation_in)
    patch["updatedAt"] = datetime.utcnow()

    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)

@router.post("/{donation_id}/cancel", response_model=DonationResponse)
async def cancel_donation(donation_id: str, current_user: dict = Depends(get_current_user)):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_owner = str(donation.get("donorId")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to cancel this donation")

    if donation.get("status") in (DonationStatus.DELIVERED.value, DonationStatus.CANCELLED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a donation with status '{donation.get('status')}'",
        )
    _patch_donation(donation_id, {"status": DonationStatus.CANCELLED.value, "updatedAt": datetime.utcnow()})
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)

@router.delete("/{donation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_donation(donation_id: str, current_user: dict = Depends(get_current_user)):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_owner = str(donation.get("donorId")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this donation")

    db = get_database()
    if db is not None:
        try:
            from bson import ObjectId
            db.donations.delete_one({"_id": ObjectId(donation_id)})
            return None
        except Exception:
            pass
    MOCK_DONATIONS_DB.pop(donation_id, None)
    return None

@router.post("/{donation_id}/claim", response_model=DonationResponse)
async def claim_donation(
    donation_id: str,
    current_user: dict = Depends(require_roles([UserRole.NGO, UserRole.ADMIN])),
):
    donation = await _get_donation_or_404(donation_id)
    if donation.get("status") != DonationStatus.AVAILABLE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only available donations can be claimed (current: {donation.get('status')})",
        )
    patch = {
        "status": DonationStatus.CLAIMED.value,
        "claimedBy": current_user["id"],
        "claimedByName": current_user.get("name"),
        "updatedAt": datetime.utcnow(),
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/assign-volunteer", response_model=DonationResponse)
async def create_and_assign_volunteer(
    donation_id: str,
    req: VolunteerCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new volunteer with photo/location and assign them to a donation in one step."""
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_claimant = str(donation.get("claimedBy")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_claimant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the claiming NGO or an admin can assign volunteers",
        )
    if donation.get("status") != DonationStatus.CLAIMED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only claimed donations can get a volunteer assigned (current: {donation.get('status')})",
        )

    # Create new volunteer user
    from app.core.security import get_password_hash
    
    # Generate a temporary password for the volunteer
    import secrets
    temp_password = secrets.token_urlsafe(12)
    
    new_volunteer = {
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "password": get_password_hash(temp_password),
        "role": UserRole.VOLUNTEER.value,
        "profileImage": req.photoUrl,
        "address": req.address,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "isVerified": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    
    db = get_database()
    volunteer_id = None
    if db is not None:
        try:
            res = await db.users.insert_one(new_volunteer)
            volunteer_id = str(res.inserted_id)
        except Exception:
            pass
    if not volunteer_id:
        new_volunteer["id"] = str(uuid.uuid4())
        volunteer_id = new_volunteer["id"]
        from app.api.deps import MOCK_USERS_DB
        MOCK_USERS_DB[volunteer_id] = new_volunteer
    
    # Calculate fare
    fare, fare_breakdown = calculate_fare(donation, req.latitude, req.longitude)
    
    # Assign volunteer to donation
    patch = {
        "assignedVolunteerId": volunteer_id,
        "assignedVolunteerName": req.name,
        "fare": fare,
        "fareBreakdown": fare_breakdown,
        "updatedAt": datetime.utcnow(),
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/assign", response_model=DonationResponse)
async def assign_volunteer(
    donation_id: str,
    req: AssignVolunteerRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_claimant = str(donation.get("claimedBy")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_claimant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the claiming NGO or an admin can assign volunteers",
        )
    if donation.get("status") != DonationStatus.CLAIMED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only claimed donations can get a volunteer assigned (current: {donation.get('status')})",
        )
    volunteer = await _find_user(req.volunteerId)
    if not volunteer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found")
    if volunteer.get("role") != UserRole.VOLUNTEER.value and role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user is not a volunteer")

    # Calculate fare using volunteer's location
    volunteer_lat = volunteer.get("latitude", 28.6139)
    volunteer_lng = volunteer.get("longitude", 77.2090)
    fare, fare_breakdown = calculate_fare(donation, volunteer_lat, volunteer_lng)

    patch = {
        "assignedVolunteerId": req.volunteerId,
        "assignedVolunteerName": volunteer.get("name"),
        "fare": fare,
        "fareBreakdown": fare_breakdown,
        "updatedAt": datetime.utcnow(),
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)

@router.post("/{donation_id}/location", response_model=DonationResponse)
async def update_volunteer_location(
    donation_id: str,
    req: VolunteerLocationUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    patch = {
        "volunteerLatitude": req.latitude,
        "volunteerLongitude": req.longitude,
        "volunteerLocationText": req.locationText or f"{req.latitude:.4f}° N, {req.longitude:.4f}° E",
        "volunteerLastUpdated": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/pickup", response_model=DonationResponse)
async def mark_picked_up(
    donation_id: str,
    location_req: Optional[VolunteerLocationUpdateRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_driver = str(donation.get("assignedVolunteerId")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned volunteer or an admin can mark pickup",
        )
    if donation.get("status") != DonationStatus.CLAIMED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only claimed donations can be marked as picked up (current: {donation.get('status')})",
        )
    patch = {
        "status": DonationStatus.PICKED_UP.value,
        "updatedAt": datetime.utcnow(),
    }
    if location_req:
        patch["volunteerLatitude"] = location_req.latitude
        patch["volunteerLongitude"] = location_req.longitude
        patch["volunteerLocationText"] = location_req.locationText
        patch["volunteerLastUpdated"] = datetime.utcnow()

    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/complete", response_model=DonationResponse)
async def complete_donation(
    donation_id: str,
    location_req: Optional[VolunteerLocationUpdateRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    role = current_user.get("role")
    is_driver = str(donation.get("assignedVolunteerId")) == current_user["id"]
    if role != UserRole.ADMIN.value and not is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned volunteer or an admin can complete a donation",
        )
    if donation.get("status") != DonationStatus.PICKED_UP.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only picked-up donations can be completed (current: {donation.get('status')})",
        )
    patch = {
        "status": DonationStatus.DELIVERED.value,
        "updatedAt": datetime.utcnow(),
    }
    if location_req:
        patch["volunteerLatitude"] = location_req.latitude
        patch["volunteerLongitude"] = location_req.longitude
        patch["volunteerLocationText"] = location_req.locationText
        patch["volunteerLastUpdated"] = datetime.utcnow()

    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/messages", response_model=DonationResponse)
async def send_order_message(
    donation_id: str,
    req: ChatMessageCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    msg = {
        "id": str(uuid.uuid4()),
        "senderId": current_user["id"],
        "senderName": current_user.get("name") or current_user.get("email", "User"),
        "senderRole": current_user.get("role", "user"),
        "text": req.text.strip(),
        "createdAt": datetime.utcnow(),
    }

    existing_msgs = list(donation.get("messages") or [])
    existing_msgs.append(msg)
    _patch_donation(donation_id, {"messages": existing_msgs, "updatedAt": datetime.utcnow()})
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.get("/{donation_id}/messages")
async def get_order_messages(
    donation_id: str,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    return donation.get("messages") or []


@router.post("/extract-nlp", response_model=NLPExtractResponse)
async def extract_donation_details_nlp(
    req: NLPExtractRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    NLP Natural Language Extraction Endpoint.
    Extracts title, quantity, itemType, pickupLocation, expiryDateTime, pickupWindowEnd,
    and identifies missing fields with guidance.
    """
    raw_text = req.text.strip()
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")

    extracted = None
    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            prompt = (
                "You are an NLP food rescue details extractor. Parse the following text into a JSON object with keys: "
                "title (short 3-6 word summary), quantity (integer portion count or null), itemType (one of 'Cooked Meals', 'Bakery', 'Produce', 'Dairy & Prepared', 'Beverages'), "
                "pickupLocation (street/city/landmark or null), hoursUntilExpiry (integer hours from now or null).\n"
                "Return ONLY valid raw JSON without backticks.\n"
                f"Text: \"{raw_text}\""
            )
            req_payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300}
            }
            data_bytes = json.dumps(req_payload).encode("utf-8")
            hreq = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(hreq, timeout=8) as resp:
                if resp.status == 200:
                    res_body = json.loads(resp.read().decode("utf-8"))
                    cand = res_body.get("candidates", [])
                    if cand:
                        text_resp = cand[0].get("content", {}).get("parts", [])[0].get("text", "").strip()
                        if text_resp.startswith("```"):
                            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
                        extracted = json.loads(text_resp)
        except Exception as e:
            print(f"Gemini NLP parse warning: {e}")

    # Fallback Regex Parser
    if not extracted:
        extracted = {}
        qty_match = re.search(r'(\d+)\s*(?:plates|portions|meals|boxes|kg|packs|loaves|items|units)?', raw_text, re.IGNORECASE)
        if qty_match:
            try:
                extracted["quantity"] = int(qty_match.group(1))
            except Exception:
                pass

        txt_lower = raw_text.lower()
        if any(k in txt_lower for k in ["bread", "cake", "loaf", "bakery", "pastry"]):
            extracted["itemType"] = "Bakery"
        elif any(k in txt_lower for k in ["apple", "fruit", "veg", "salad", "tomato", "produce"]):
            extracted["itemType"] = "Produce"
        elif any(k in txt_lower for k in ["milk", "cheese", "yogurt", "butter", "dairy"]):
            extracted["itemType"] = "Dairy & Prepared"
        elif any(k in txt_lower for k in ["juice", "water", "drink", "beverage"]):
            extracted["itemType"] = "Beverages"
        else:
            extracted["itemType"] = "Cooked Meals"

        exp_match = re.search(r'(\d+)\s*(?:hours|hrs|hr)', raw_text, re.IGNORECASE)
        if exp_match:
            try:
                extracted["hoursUntilExpiry"] = int(exp_match.group(1))
            except Exception:
                pass

        words = raw_text.split()
        extracted["title"] = " ".join(words[:6]).title()

    now = datetime.utcnow()
    hrs = extracted.get("hoursUntilExpiry") or 4
    expiry_dt = now + timedelta(hours=hrs)
    window_start = now
    window_end = expiry_dt - timedelta(minutes=30)

    missing = []
    if not extracted.get("quantity"):
        missing.append("quantity")
    if not extracted.get("pickupLocation"):
        missing.append("pickupLocation")
    if not extracted.get("hoursUntilExpiry") and "expire" not in raw_text.lower() and "expiry" not in raw_text.lower():
        missing.append("expiryDateTime")

    return {
        "title": extracted.get("title") or raw_text[:40].title(),
        "description": f"Extracted from NLP description: {raw_text}",
        "quantity": extracted.get("quantity"),
        "itemType": extracted.get("itemType") or "Cooked Meals",
        "pickupLocation": extracted.get("pickupLocation"),
        "expiryDateTime": expiry_dt.isoformat(),
        "pickupWindowStart": window_start.isoformat(),
        "pickupWindowEnd": window_end.isoformat(),
        "confidenceScore": 0.95 if not missing else 0.70,
        "missingFields": missing,
    }


@router.post("/{donation_id}/verify-pickup", response_model=DonationResponse)
async def verify_pickup_pod(
    donation_id: str,
    req: VerifyPoDRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    correct_pin = donation_helper(donation).get("verificationPin")
    correct_token = donation_helper(donation).get("qrCodeToken")

    provided_pin = (req.pin or "").strip()
    provided_qr = (req.qrCode or "").strip()

    if provided_pin != correct_pin and provided_qr != correct_token and correct_pin not in provided_qr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR Code or 6-digit Verification PIN for pickup",
        )

    patch = {
        "status": DonationStatus.PICKED_UP.value,
        "updatedAt": datetime.utcnow(),
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


@router.post("/{donation_id}/verify-delivery", response_model=DonationResponse)
async def verify_delivery_pod(
    donation_id: str,
    req: VerifyPoDRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    correct_pin = donation_helper(donation).get("verificationPin")
    correct_token = donation_helper(donation).get("qrCodeToken")

    provided_pin = (req.pin or "").strip()
    provided_qr = (req.qrCode or "").strip()

    if provided_pin != correct_pin and provided_qr != correct_token and correct_pin not in provided_qr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid QR Code or 6-digit Proof of Delivery (PoD) PIN",
        )

    now = datetime.utcnow()
    patch = {
        "status": DonationStatus.DELIVERED.value,
        "proofOfDeliveryAt": now,
        "updatedAt": now,
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)


MOCK_SCHEDULES_DB = {
    "sched-1": {
        "id": "sched-1",
        "donorId": "mock-donor-id",
        "donorName": "Green Harvest Bistro",
        "title": "Daily Bakery & Dinner Buffet Leftovers",
        "quantity": 45,
        "itemType": "Cooked Meals",
        "pickupLocation": "Connaught Place Sector 3, Delhi",
        "frequency": "daily",
        "pickupTime": "21:30",
        "daysOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "isActive": True,
        "nextAutoPublishAt": datetime.utcnow() + timedelta(hours=3),
        "createdAt": datetime.utcnow() - timedelta(days=2),
    }
}


@router.get("/schedules", response_model=List[RecurringScheduleResponse])
async def list_recurring_schedules(
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id", current_user.get("id")))
    role = current_user.get("role")
    
    results = []
    for s in MOCK_SCHEDULES_DB.values():
        if role in ["admin", "ngo", "volunteer"] or s.get("donorId") == user_id:
            results.append(s)
    return results


@router.post("/schedules", response_model=RecurringScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_schedule(
    req: RecurringScheduleCreate,
    current_user: dict = Depends(require_roles([UserRole.DONOR, UserRole.ADMIN])),
):
    user_id = str(current_user.get("_id", current_user.get("id")))
    donor_name = current_user.get("name", "Donor Partner")
    
    sched_id = f"sched-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()
    sched = {
        "id": sched_id,
        "donorId": user_id,
        "donorName": donor_name,
        "title": req.title,
        "quantity": req.quantity,
        "itemType": req.itemType,
        "pickupLocation": req.pickupLocation,
        "frequency": req.frequency,
        "pickupTime": req.pickupTime,
        "daysOfWeek": req.daysOfWeek or ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "isActive": req.isActive,
        "nextAutoPublishAt": now + timedelta(hours=14),
        "createdAt": now,
    }
    MOCK_SCHEDULES_DB[sched_id] = sched
    return sched


@router.patch("/schedules/{sched_id}/toggle", response_model=RecurringScheduleResponse)
async def toggle_recurring_schedule(
    sched_id: str,
    current_user: dict = Depends(require_roles([UserRole.DONOR, UserRole.ADMIN])),
):
    if sched_id not in MOCK_SCHEDULES_DB:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched = MOCK_SCHEDULES_DB[sched_id]
    sched["isActive"] = not sched["isActive"]
    return sched


@router.post("/{donation_id}/safety-log", response_model=DonationResponse)
async def log_food_safety_inspection(
    donation_id: str,
    req: FoodSafetyLogRequest,
    current_user: dict = Depends(get_current_user),
):
    donation = await _get_donation_or_404(donation_id)
    
    is_safe_temp = req.temperatureCelsius <= 8.0 or req.temperatureCelsius >= 55.0
    haccp_pass = is_safe_temp and req.containerSealVerified

    now = datetime.utcnow()
    patch = {
        "temperatureCelsius": req.temperatureCelsius,
        "containerSealVerified": req.containerSealVerified,
        "haccpPassed": haccp_pass,
        "updatedAt": now,
    }
    _patch_donation(donation_id, patch)
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)