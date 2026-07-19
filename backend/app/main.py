from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import documents, quests, chat, focus

app = FastAPI(title="Gamified Study Room API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(quests.router)
app.include_router(chat.router)
app.include_router(focus.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
