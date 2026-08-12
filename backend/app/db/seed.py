import asyncio
import logging
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_db")

SEED_USERS = [
    {
        "name": "Green Harvest Bistro",
        "email": "donor@culinary.com",
        "phone": "+15550100001",
        "password": get_password_hash("DonorPass123!"),
        "role": "donor",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=donor",
        "isVerified": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
    {
        "name": "Hope Shelter NGO",
        "email": "ngo@shelterhaven.org",
        "phone": "+15550100002",
        "password": get_password_hash("NgoPass123!"),
        "role": "ngo",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=ngo",
        "isVerified": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
    {
        "name": "Alex Rescue Driver",
        "email": "volunteer@rescue.org",
        "phone": "+15550100003",
        "password": get_password_hash("VolunteerPass123!"),
        "role": "volunteer",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=volunteer",
        "isVerified": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
    {
        "name": "System Administrator",
        "email": "admin@foodrescue.org",
        "phone": "+15550100004",
        "password": get_password_hash("AdminPass123!"),
        "role": "admin",
        "profileImage": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        "isVerified": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    },
]

SEED_DONATIONS = [
    {
        "title": "Fresh Artisan Bread & Pastries",
        "donorName": "Green Harvest Bistro",
        "quantity": "25 boxes",
        "category": "Bakery",
        "expiryDate": "2026-08-15",
        "location": "Downtown Bakery St 4",
        "status": "available",
        "createdAt": datetime.utcnow(),
    },
    {
        "title": "Organic Produce & Vegetables",
        "donorName": "Green Harvest Bistro",
        "quantity": "40 kg",
        "category": "Produce",
        "expiryDate": "2026-08-14",
        "location": "Downtown Bakery St 4",
        "status": "reserved",
        "createdAt": datetime.utcnow(),
    }
]

async def seed_database():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=3000)
    db = client[settings.DATABASE_NAME]

    try:
        await client.admin.command('ping')
        logger.info("MongoDB is active! Seeding database collections...")

        for user_data in SEED_USERS:
            await db.users.update_one(
                {"email": user_data["email"]},
                {"$set": user_data},
                upsert=True
            )
            logger.info(f"Seeded User: {user_data['email']} ({user_data['role']})")

        for donation in SEED_DONATIONS:
            await db.donations.update_one(
                {"title": donation["title"]},
                {"$set": donation},
                upsert=True
            )
            logger.info(f"Seeded Donation: {donation['title']}")

        logger.info("Successfully completed database seeding!")
    except Exception as e:
        logger.error(f"Failed to seed MongoDB: {e}")
        logger.info("Note: When MongoDB is not running, FoodRescue AI automatically uses pre-seeded in-memory fallback accounts!")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
