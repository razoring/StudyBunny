import json
import google.generativeai as genai
from app.config import settings
from app.models.schemas import Chunk

genai.configure(api_key=settings.gemini_api_key)

GENERATION_MODEL = "gemini-3.1-flash-lite"

SEGMENTATION_PROMPT = """You are helping a student turn a document into a study plan.

Below is the full text of a document, split into numbered chunks. Group the content
into 4-10 coherent topics ("quests") a student should work through in order.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
[
  {{
    "title": "short topic title",
    "summary": "1-2 sentence summary of what this quest covers",
    "chunk_orders": [0, 1]
  }}
]

"chunk_orders" must reference the chunk numbers below that belong to this topic.
Order the list the way a student should progress through the material.

DOCUMENT CHUNKS:
{chunks_text}
"""


def _format_chunks_for_prompt(chunks: list[Chunk]) -> str:
    parts = []
    for c in chunks:
        parts.append(f"[Chunk {c.order}]\n{c.text}")
    return "\n\n".join(parts)


def segment_into_topics(chunks: list[Chunk]) -> list[dict]:
    """
    Calls Gemini to segment chunks into topics/quests.
    Returns a list of dicts: {title, summary, chunk_orders}
    """
    if not chunks:
        return []

    model = genai.GenerativeModel(GENERATION_MODEL)
    prompt = SEGMENTATION_PROMPT.format(chunks_text=_format_chunks_for_prompt(chunks))

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown fences if the model adds them despite instructions
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        topics = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini did not return valid JSON: {e}\nRaw: {raw[:500]}")

    return topics
