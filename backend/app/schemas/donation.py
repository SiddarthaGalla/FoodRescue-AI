from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

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
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimatedValue: Optional[float] = Field(None, gt=0, description="Estimated USD value per portion (for tax deductions)")

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
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimatedValue: Optional[float] = Field(None, gt=0)

class AssignVolunteerRequest(BaseModel):
    volunteerId: str


class VolunteerCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr
    photoUrl: Optional[str] = Field(None, max_length=500)
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class VolunteerLocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    locationText: Optional[str] = None


class ChatMessageCreateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class ChatMessageOut(BaseModel):
    id: str
    senderId: str
    senderName: str
    senderRole: str
    text: str
    createdAt: datetime


class NLPExtractRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=2000)


class NLPExtractResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    itemType: Optional[str] = None
    pickupLocation: Optional[str] = None
    expiryDateTime: Optional[str] = None
    pickupWindowStart: Optional[str] = None
    pickupWindowEnd: Optional[str] = None
    confidenceScore: float = 0.90
    missingFields: list = []


class VerifyPoDRequest(BaseModel):
    pin: Optional[str] = None
    qrCode: Optional[str] = None


class DonationResponse(DonationBase):
    id: str
    donorId: str
    donorName: Optional[str] = None
    status: DonationStatus
    claimedBy: Optional[str] = None
    claimedByName: Optional[str] = None
    assignedVolunteerId: Optional[str] = None
    assignedVolunteerName: Optional[str] = None
    volunteerLatitude: Optional[float] = None
    volunteerLongitude: Optional[float] = None
    volunteerLocationText: Optional[str] = None
    volunteerLastUpdated: Optional[datetime] = None
    messages: Optional[list] = []
    verificationPin: Optional[str] = None
    qrCodeToken: Optional[str] = None
    proofOfDeliveryAt: Optional[datetime] = None
    fare: Optional[float] = None
    fareBreakdown: Optional[dict] = None
    temperatureCelsius: Optional[float] = None
    containerSealVerified: Optional[bool] = None
    haccpPassed: Optional[bool] = None
    createdAt: datetime
    updatedAt: datetime


class FoodSafetyLogRequest(BaseModel):
    temperatureCelsius: float
    containerSealVerified: bool = True
    inspectorRole: Optional[str] = "volunteer"
    notes: Optional[str] = None


class RecurringScheduleCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    quantity: int = Field(..., gt=0)
    itemType: str
    pickupLocation: str
    frequency: str = "daily"
    pickupTime: str = "21:00"
    daysOfWeek: Optional[list] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    isActive: bool = True


class RecurringScheduleResponse(RecurringScheduleCreate):
    id: str
    donorId: str
    donorName: Optional[str] = None
    nextAutoPublishAt: datetime
    createdAt: datetime
