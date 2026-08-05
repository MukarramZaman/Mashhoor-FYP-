"""Mashhoor AI service — FastAPI wrapper for the Colab campaign assistant pipeline."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline import get_assistant

app = FastAPI(title="Mashhoor Campaign Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatTurn(BaseModel):
    user: str
    bot: str


class ChatRequest(BaseModel):
    user_message: str
    chat_history: list[ChatTurn] = Field(default_factory=list)
    campaign_record: dict


class ChatResponse(BaseModel):
    reply: str
    trace: str | None = None


@app.on_event("startup")
def startup_event():
    print("INFO: Pre-loading Mashhoor Campaign Assistant models...")
    assistant = get_assistant()
    assistant.load()
    print("INFO: Mashhoor Campaign Assistant models pre-loaded and ready!")


@app.get("/api/health")
def health():
    return {"success": True, "service": "mashhoor-ai"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    assistant = get_assistant()
    history = [{"user": t.user, "bot": t.bot} for t in req.chat_history]
    result = assistant.run(req.user_message, history, req.campaign_record)
    return ChatResponse(reply=result["reply"], trace=result.get("trace"))


if __name__ == "__main__":
    import uvicorn

    port = int(__import__("os").getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
