from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from database import get_db
from agents import AnalystAgent, CoachAgent, AnalystFeedback
from mcp_client import init_mcp_client, close_mcp_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_mcp_client()
    yield
    await close_mcp_client()

app = FastAPI(title="Project Mahiru/Amane Engine", lifespan=lifespan)

# Add CORS middleware so the Next.js frontend can communicate with it
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this should be restricted
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    difficulty: str = "neutral"
    session_id: str = "default-session"
    character: str = "mahiru"

class ChatResponse(BaseModel):
    coach_response: str
    feedback: AnalystFeedback
    emotion: str = "neutral"

@app.get("/")
def read_root():
    return {"message": "Welcome to Project Mahiru/Amane Coach Engine"}

@app.get("/health")
def health_check():
    try:
        db = get_db()
        return {"status": "ok", "db_client": "initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse
import json

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Step 1: Analyst scores the user's message (this happens instantly)
    try:
        feedback = AnalystAgent.analyze(request.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Step 2: Stream the Coach response
    async def event_generator():
        # First yield the analyst feedback so the UI can update it immediately
        yield f"data: {json.dumps({'type': 'feedback', 'feedback': feedback.model_dump()})}\n\n"
        
        # Then yield the streamed coach response
        try:
            async for chunk in CoachAgent.stream_respond(request.message, feedback, request.difficulty, request.session_id, request.character):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/chat/history")
def get_chat_history(session_id: str):
    try:
        db = get_db()
        # Fetch conversation history from Supabase
        history_res = db.table('messages').select('*').eq('session_id', session_id).order('created_at').execute()
        
        formatted_messages = []
        for msg in history_res.data:
            formatted_msg = {
                "role": msg['role'],
                "content": msg['content']
            }
            if msg['role'] == 'user' and msg.get('passiveness_score') is not None:
                formatted_msg["feedback"] = {
                    "passiveness_score": msg.get('passiveness_score'),
                    "apology_count": msg.get('apology_count'),
                    "hesitation_count": msg.get('hesitation_count'),
                    "feedback_notes": msg.get('feedback_notes')
                }
            formatted_messages.append(formatted_msg)
            
        return {"messages": formatted_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
