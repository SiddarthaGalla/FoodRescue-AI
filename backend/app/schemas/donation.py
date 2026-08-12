from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class DonationStatus(str, Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class DonationBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: int = Field(..., gt=0, description="Number of portions")
    itemType: Optional[str] = Field(None, max_length=50)
    expiryDateTime: Optional[datetime] = None
    pickupLocation: str = Field(..., min_length=2, max_length=200)
    pickupWindowStart: datetime
    pickupWindowEnd: datetime
    photoUrl: Optional[str] = Field(None, max_length=500)

class DonationCreate(DonationBase):
    pass

class DonationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: Optional[int] = Field(None, gt=0)
    itemType: Optional[str] = Field(None, max_length=50)
    expiryDateTime: Optional[datetime] = None
    pickupLocation: Optional[str] = Field(None, min_length=2, max_length=200)
    pickupWindowStart: Optional[datetime] = None
    pickupWindowEnd: Optional[datetime] = None
    photoUrl: Optional[str] = Field(None, max_length=500)

class AssignVolunteerRequest(BaseModel):
    volunteerId: str

class DonationResponse(DonationBase):
    id: str
    donorId: str
    donorName: Optional[str] = None
    status: DonationStatus
    claimedBy: Optional[str] = None
    claimedByName: Optional[str] = None
    assignedVolunteerId: Optional[str] = None
    assignedVolunteerName: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
