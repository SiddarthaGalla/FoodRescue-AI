import hashlib
from datetime import datetime
from typing import Dict, Any, Optional

def donation_helper(donation: Dict[str, Any]) -> Dict[str, Any]:
    don_id = str(donation.get("_id", donation.get("id")))
    pin = donation.get("verificationPin")
    if not pin:
        pin = str(int(hashlib.md5(don_id.encode()).hexdigest(), 16) % 900000 + 100000)

    token = donation.get("qrCodeToken") or f"FOODRESCUE_POD:{don_id}:{pin}"

    return {
        "id": don_id,
        "title": donation.get("title"),
        "description": donation.get("description"),
        "quantity": donation.get("quantity"),
        "itemType": donation.get("itemType"),
        "expiryDateTime": donation.get("expiryDateTime"),
        "pickupLocation": donation.get("pickupLocation"),
        "pickupWindowStart": donation.get("pickupWindowStart"),
        "pickupWindowEnd": donation.get("pickupWindowEnd"),
        "photoUrl": donation.get("photoUrl"),
        "address": donation.get("address"),
        "latitude": donation.get("latitude"),
        "longitude": donation.get("longitude"),
        "estimatedValue": donation.get("estimatedValue"),
        "donorId": str(donation.get("donorId")),
        "donorName": donation.get("donorName"),
        "status": donation.get("status", "available"),
        "claimedBy": str(donation.get("claimedBy")) if donation.get("claimedBy") else None,
        "claimedByName": donation.get("claimedByName"),
        "assignedVolunteerId": str(donation.get("assignedVolunteerId")) if donation.get("assignedVolunteerId") else None,
        "assignedVolunteerName": donation.get("assignedVolunteerName"),
        "volunteerLatitude": donation.get("volunteerLatitude"),
        "volunteerLongitude": donation.get("volunteerLongitude"),
        "volunteerLocationText": donation.get("volunteerLocationText"),
        "volunteerLastUpdated": donation.get("volunteerLastUpdated"),
        "messages": donation.get("messages", []),
        "verificationPin": pin,
        "qrCodeToken": token,
        "proofOfDeliveryAt": donation.get("proofOfDeliveryAt"),
        "createdAt": donation.get("createdAt", datetime.utcnow()),
        "updatedAt": donation.get("updatedAt", datetime.utcnow()),
    }
