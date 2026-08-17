from datetime import datetime
from typing import Dict, Any, Optional

def donation_helper(donation: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(donation.get("_id", donation.get("id"))),
        "title": donation.get("title"),
        "description": donation.get("description"),
        "quantity": donation.get("quantity"),
        "itemType": donation.get("itemType"),
        "expiryDateTime": donation.get("expiryDateTime"),
        "pickupLocation": donation.get("pickupLocation"),
        "pickupWindowStart": donation.get("pickupWindowStart"),
        "pickupWindowEnd": donation.get("pickupWindowEnd"),
        "photoUrl": donation.get("photoUrl"),
        "estimatedValue": donation.get("estimatedValue"),
        "donorId": str(donation.get("donorId")),
        "donorName": donation.get("donorName"),
        "status": donation.get("status", "available"),
        "claimedBy": str(donation.get("claimedBy")) if donation.get("claimedBy") else None,
        "claimedByName": donation.get("claimedByName"),
        "assignedVolunteerId": str(donation.get("assignedVolunteerId")) if donation.get("assignedVolunteerId") else None,
        "assignedVolunteerName": donation.get("assignedVolunteerName"),
        "createdAt": donation.get("createdAt", datetime.utcnow()),
        "updatedAt": donation.get("updatedAt", datetime.utcnow()),
    }
