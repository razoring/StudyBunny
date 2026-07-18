import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException

from app.db.mongo import documents_collection, quests_collection
from app.models.schemas import DocumentUploadResponse, DocumentOut
from app.services.ingestion_service import extract_text, chunk_text
from app.services.embedding_service import embed_and_store_chunks
from app.services.topic_segmentation import segment_into_topics

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    document_id = uuid.uuid4().hex
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}_{file.filename}")

    with open(file_path, "wb") as f:
        f.write(await file.read())

    doc = {
        "_id": document_id,
        "user_id": user_id,
        "filename": file.filename,
        "storage_path": file_path,
        "status": "processing",
        "created_at": datetime.now(timezone.utc),
    }
    await documents_collection().insert_one(doc)

    # Run the heavy pipeline (extract -> chunk -> embed -> segment) in the background
    # so the upload request returns immediately.
    background_tasks.add_task(process_document, document_id, file_path, file.filename, user_id)

    return DocumentUploadResponse(document_id=document_id, status="processing")


async def process_document(document_id: str, file_path: str, filename: str, user_id: str):
    try:
        text = extract_text(file_path, filename)
        chunks = chunk_text(text, document_id)
        embed_and_store_chunks(chunks)

        topics = segment_into_topics(chunks)

        quest_docs = []
        for i, topic in enumerate(topics):
            quest_docs.append({
                "_id": uuid.uuid4().hex,
                "document_id": document_id,
                "user_id": user_id,
                "title": topic["title"],
                "summary": topic["summary"],
                "order": i,
                "status": "active" if i == 0 else "locked",
            })
        if quest_docs:
            await quests_collection().insert_many(quest_docs)

        await documents_collection().update_one(
            {"_id": document_id}, {"$set": {"status": "ready"}}
        )
    except Exception as e:
        await documents_collection().update_one(
            {"_id": document_id}, {"$set": {"status": "failed", "error": str(e)}}
        )


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str):
    doc = await documents_collection().find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut(
        id=doc["_id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        status=doc["status"],
        created_at=doc["created_at"],
    )


@router.get("", response_model=list[DocumentOut])
async def list_documents(user_id: str | None = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    cursor = documents_collection().find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [
        DocumentOut(
            id=d["_id"],
            user_id=d["user_id"],
            filename=d["filename"],
            status=d["status"],
            created_at=d["created_at"],
        )
        for d in docs
    ]

