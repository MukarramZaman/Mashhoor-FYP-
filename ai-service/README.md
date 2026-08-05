# Mashhoor Campaign Assistant (Python)

Runs the Colab guardrail + embedding pipeline. Optional Qwen LLM when `MASHHOOR_USE_LLM=true`.

## Setup

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
# Lightweight (embeddings + guardrail NN only — no GPU LLM)
uvicorn main:app --host 0.0.0.0 --port 8000

# With Qwen (needs GPU + ~6GB VRAM)
MASHHOOR_USE_LLM=true uvicorn main:app --host 0.0.0.0 --port 8000
```

## Connect to Mashhoor backend

In `backend/.env`:

```
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=120000
```

Restart the Node backend. Influencer campaign chat will use this service; if unavailable, the built-in TypeScript assistant is used automatically.
