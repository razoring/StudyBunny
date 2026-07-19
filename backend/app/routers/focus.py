from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from app.db.mongo import focus_events_collection

router = APIRouter(prefix="/focus", tags=["focus"])

class FocusEventRequest(BaseModel):
    user_id: str
    document_id: str
    focus: float  # 0 to 100
    distraction: float  # 0 to 100
    struggling: float  # 0 to 100
    mood: str
    mood_confidence: float  # 0 to 100
    tiredness: float  # 0 to 100
    talking: bool = False

@router.post("/event")
async def record_focus_event(event: FocusEventRequest):
    event_dict = event.dict()
    event_dict["timestamp"] = datetime.now(timezone.utc)
    await focus_events_collection().insert_one(event_dict)
    return {"status": "ok"}

@router.get("/history/{document_id}")
async def get_focus_history(document_id: str):
    cursor = focus_events_collection().find({"document_id": document_id}).sort("timestamp", 1)
    events = await cursor.to_list(length=1000)
    for e in events:
        e["_id"] = str(e["_id"])
        if isinstance(e.get("timestamp"), datetime):
            e["timestamp"] = e["timestamp"].isoformat()
    return events
