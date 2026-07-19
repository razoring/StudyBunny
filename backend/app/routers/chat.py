import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from app.db.mongo import chat_messages_collection
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_service import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Log the user's message
    await chat_messages_collection().insert_one({
        "_id": uuid.uuid4().hex,
        "quest_id": req.quest_id,
        "document_id": req.document_id,
        "role": "user",
        "text": req.message,
        "created_at": datetime.now(timezone.utc),
    })

    result = answer_question(req.message, document_id=req.document_id)

    # Log the avatar's reply
    await chat_messages_collection().insert_one({
        "_id": uuid.uuid4().hex,
        "quest_id": req.quest_id,
        "document_id": req.document_id,
        "role": "avatar",
        "text": result["reply"],
        "created_at": datetime.now(timezone.utc),
    })

    return ChatResponse(reply=result["reply"], source_chunks=result["source_chunks"])


@router.get("/history/{document_id}")
async def get_chat_history(document_id: str):
    cursor = chat_messages_collection().find({"document_id": document_id}).sort("created_at", 1)
    messages = await cursor.to_list(length=100)
    for m in messages:
        m["id"] = m["_id"]
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return messages

from pydantic import BaseModel
from fastapi import Response
import requests

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
def get_tts(req: TTSRequest):
    from app.config import settings
    # Rachel voice ID (default)
    url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": settings.eleven_labs
    }
    data = {
        "text": req.text
    }
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return Response(content=response.content, media_type="audio/mpeg")
    else:
        print(f"ElevenLabs TTS Error: {response.status_code} - {response.text}")
        return Response(status_code=response.status_code, content=response.text)

