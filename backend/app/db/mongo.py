from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import certifi

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, tlsAllowInvalidCertificates=True)
    return _client


def get_db():
    return get_client()[settings.mongo_db_name]


# Convenience collection accessors
def documents_collection():
    return get_db()["documents"]


def quests_collection():
    return get_db()["quests"]


def chat_messages_collection():
    return get_db()["chat_messages"]


def focus_events_collection():
    return get_db()["focus_events"]
