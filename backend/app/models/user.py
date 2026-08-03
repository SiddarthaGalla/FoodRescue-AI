from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId

def user_helper(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id", user.get("id"))),
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "profileImage": user.get("profileImage", f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.get('email', 'default')}"),
        "isVerified": user.get("isVerified", False),
        "createdAt": user.get("createdAt", datetime.utcnow()),
        "updatedAt": user.get("updatedAt", datetime.utcnow()),
    }
