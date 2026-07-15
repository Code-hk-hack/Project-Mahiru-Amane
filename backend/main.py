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

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Step 1: Analyst scores the user's message
        feedback = AnalystAgent.analyze(request.message)
        
        # Step 2: Coach generates a response incorporating the feedback
        response, emotion = await CoachAgent.respond(request.message, feedback, request.difficulty, request.session_id, request.character)
        
        return ChatResponse(coach_response=response, feedback=feedback, emotion=emotion)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
