import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Quick server ping to check connectivity
        await db_instance.client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database '{settings.DATABASE_NAME}'")
    except Exception as e:
        db_instance.client = None
        db_instance.db = None
        logger.warning(f"MongoDB connection failed: {e}. App will proceed with simulated memory store fallback if DB is unreachable.")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_instance.db
