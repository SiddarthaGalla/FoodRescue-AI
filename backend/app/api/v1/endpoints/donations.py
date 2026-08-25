import uuid
from datetime import datetime, timedelta
from typing import Optional
from math import radians, cos, sin, sqrt, atan2

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_database
from app.models.user import user_helper
from app.models.donation import donation_helper
from app.schemas.donation import (
    DonationCreate, DonationUpdate, DonationResponse,
    DonationStatus, AssignVolunteerRequest, VolunteerCreateRequest
)
from app.schemas.user import UserRole
from app.api.deps import get_current_user, require_roles


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
    donor_lat = donation.get("latitude", 28.6139)  # Default to Delhi if not set
    donor_lng = donation.get("longitude", 77.2090)
    distance_km = haversine(volunteer_lat, volunteer_lng, donor_lat, donor_lng)
    
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


router = APIRouter()

MOCK_DONATIONS_DB = {}

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
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Generate a temporary password for the volunteer
    import secrets
    temp_password = secrets.token_urlsafe(12)
    
    new_volunteer = {
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "password": pwd_context.hash(temp_password),
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

@router.post("/{donation_id}/pickup", response_model=DonationResponse)
async def mark_picked_up(
    donation_id: str,
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
    _patch_donation(donation_id, {"status": DonationStatus.PICKED_UP.value, "updatedAt": datetime.utcnow()})
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)

@router.post("/{donation_id}/complete", response_model=DonationResponse)
async def complete_donation(
    donation_id: str,
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
    _patch_donation(donation_id, {"status": DonationStatus.DELIVERED.value, "updatedAt": datetime.utcnow()})
    updated = await _get_donation_or_404(donation_id)
    return donation_helper(updated)