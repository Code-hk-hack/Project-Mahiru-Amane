from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from database import get_db
from agents import AnalystAgent, CoachAgent, AnalystFeedback

app = FastAPI(title="Project Mahiru/Amane Engine")

# Add CORS middleware so the Next.js frontend can communicate with it
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    difficulty: str = "neutral"

class ChatResponse(BaseModel):
    coach_response: str
    feedback: AnalystFeedback

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
def chat_endpoint(request: ChatRequest):
    try:
        # Step 1: Analyst scores the user's message
        feedback = AnalystAgent.analyze(request.message)
        
        # Step 2: Coach generates a response incorporating the feedback
        response = CoachAgent.respond(request.message, feedback, request.difficulty)
        
        return ChatResponse(coach_response=response, feedback=feedback)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
